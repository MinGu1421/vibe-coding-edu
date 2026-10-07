import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

// 마크다운 코드블록 제거 유틸리티 함수
function cleanMarkdownCodeBlock(raw: string): string {
  let cleaned = raw.trim();
  // ```html ... ``` 또는 ```xml ... ``` 또는 ``` ... ``` 패턴 제거
  if (cleaned.startsWith('```')) {
    const firstNewline = cleaned.indexOf('\n');
    if (firstNewline !== -1) {
      cleaned = cleaned.substring(firstNewline + 1);
    }
  }
  if (cleaned.endsWith('```')) {
    cleaned = cleaned.substring(0, cleaned.lastIndexOf('```')).trim();
  }
  return cleaned;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { prompt, studentPrompt, teacherNote, currentCode } = body;

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: '서버에 GEMINI_API_KEY 환경변수가 설정되지 않았습니다.' },
        { status: 500 }
      );
    }

    // 초등학생 친화적 프론트엔드 튜터 System Prompt 정의
    const systemInstruction = `너는 초등학교 소프트웨어 수업을 위한 프론트엔드 웹 코딩 튜터야.
학생이 만들고 싶어 하거나 변경하고 싶어 하는 내용을 반영하여, 브라우저에서 바로 동작하는 **단일 완성형 HTML 코드**만을 생성해 줘.

[반드시 지켜야 할 규칙]:
1. 오직 하나의 유효한 완전한 HTML5 문서(<!DOCTYPE html><html>...</html>) 형태로 반환할 것.
2. 마크다운 기호(\`\`\`html 또는 \`\`\`), 인사말, 부가 설명 등은 일체 포함하지 말고 오직 순수 HTML 코드만 출력할 것.
3. CSS는 <style> 태그 안에, 동작 스크립트는 <script> 태그 안에 전부 포함할 것.
4. 초등학생 눈높이에 맞게 알록달록한 파스텔톤, 부드러운 둥근 버튼, 귀엽고 직관적인 UI/UX를 적극 적용할 것.
5. Tailwind CSS CDN(<script src="https://cdn.tailwindcss.com"></script>) 또는 Canvas 2D 그래픽 등을 자유롭게 활용할 것.
6. 만약 이전 코드(currentCode)가 주어지고 변경 요청이 들어오면, 기존 기능과 스타일을 유지하면서 학생이 요구한 새로운 기능이나 디자인을 자연스럽게 융합/개선할 것.
7. alert() 창 대신 화면 내 모달이나 귀여운 안내 텍스트로 알림을 표시할 것.`;

    let userContent = `[학생의 아이디어 요청]: ${studentPrompt || prompt}`;
    if (teacherNote) {
      userContent += `\n[교사의 지도 조언 및 추가 조건]: ${teacherNote}`;
    }
    if (currentCode && currentCode.trim().length > 0) {
      userContent += `\n\n[현재 학생 화면의 기존 HTML 코드]:\n${currentCode}\n\n위 기존 코드를 바탕으로 학생의 새 요청을 완벽히 반영하여 수정된 전체 HTML 코드를 완성해 줘.`;
    }

    // 모델 과부하(High demand / 503) 대응: 사용 가능한 최적 모델 순차 Fallback 목록
    const candidateModels = [
      'gemini-2.5-flash',
      'gemini-flash-latest',
      'gemini-2.5-flash-lite',
      'gemini-2.5-pro',
    ];

    let lastErrorMessage = '';
    let generatedRawText = '';

    for (const modelName of candidateModels) {
      try {
        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

        const response = await fetch(geminiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            systemInstruction: {
              parts: [{ text: systemInstruction }],
            },
            contents: [
              {
                role: 'user',
                parts: [{ text: userContent }],
              },
            ],
            generationConfig: {
              temperature: 0.7,
              maxOutputTokens: 8192,
            },
          }),
        });

        if (response.ok) {
          const data = await response.json();
          const candidate = data.candidates?.[0];
          generatedRawText = candidate?.content?.parts?.[0]?.text || '';
          if (generatedRawText) {
            break; // 성공 시 루프 탈출
          }
        } else {
          const errorText = await response.text();
          console.warn(`Model ${modelName} failed (${response.status}):`, errorText);
          try {
            const errorJson = JSON.parse(errorText);
            lastErrorMessage = errorJson.error?.message || response.statusText;
          } catch {
            lastErrorMessage = response.statusText;
          }
          // 과부하(high demand) 또는 503/429인 경우 다음 fallback 모델로 즉시 전환
        }
      } catch (err: any) {
        console.warn(`Model ${modelName} request error:`, err?.message);
        lastErrorMessage = err?.message || '네트워크 요청 에러';
      }
    }

    if (!generatedRawText) {
      return NextResponse.json(
        { error: `Gemini API 호출에 실패했습니다: ${lastErrorMessage || '모든 AI 모델이 응답하지 않았습니다.'}` },
        { status: 503 }
      );
    }

    const cleanHtml = cleanMarkdownCodeBlock(generatedRawText);

    return NextResponse.json({
      success: true,
      htmlCode: cleanHtml,
    });
  } catch (error: any) {
    console.error('API /api/generate Error:', error);
    return NextResponse.json(
      { error: error?.message || 'AI 코드 생성 중 알 수 없는 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
