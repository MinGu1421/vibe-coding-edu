# 초등 바이브 코딩 (Vibe Coding) 실습 & 피드백 플랫폼

초등학교 소프트웨어 및 AI 융합 수업을 위해 구축된 인터랙티브 교육 플랫폼입니다.
학생들은 로그인 없이 자유롭게 자연어로 화면과 인터랙션을 요청하고, 교사는 대시보드에서 이를 확인·승인·보완하여 AI(Gemini API)로 생성된 결과물을 학생 화면에 실시간으로 전달합니다.

---

## 🌟 주요 기능

### 1. 학생 화면 (`/student`)
- **로그인 불필요**: 학생의 번호, 이름 또는 모둠명만 입력하고 바로 시작.
- **자연어 바이브 코딩 입력창**: 만들고 싶은 웹/게임 아이디어를 편하게 작성.
- **추천 프롬프트 단어 카드**: "버튼 크게 만들기", "배경색 파스텔톤으로 바꾸기", "점수판 넣기" 등 클릭 시 자동 추가.
- **안전한 iframe 샌드박스**: `sandbox="allow-scripts"` 격리 환경으로 교실 PC 보안 유지.
- **버전 타임라인 (V1, V2...)**: 이전 버전으로 언제든지 손쉽게 롤백 가능.
- **교사 피드백 실시간 알림**: 대기 중 배너 및 교사 피드백 코멘트 자동 표시.

### 2. 교사 대시보드 (`/teacher`)
- **PIN 보안 인증**: 비밀번호(기본: `1234`) 입력 후 접근.
- **실시간 요청 모니터링**: Supabase Realtime으로 학생들의 프롬프트가 즉시 수신됨.
- **3대 핵심 지도 액션**:
  1. `[Gemini 실행]`: AI 호출 후 코드를 학생 화면으로 즉시 전송.
  2. `[다듬어 실행]`: 학생 프롬프트에 교사가 지도 팁이나 제약조건을 덧붙여 AI 호출.
  3. `[코멘트 전송]`: 코드를 돌리지 않고 학생에게 발문이나 힌트 피드백 전송.
- **결과 미리보기 모달**: 생성된 코드가 학생 화면에 어떻게 나오는지 교사가 사전에 확인 가능.

### 3. AI 연동 (`/api/generate`)
- Google Gemini API (`gemini-1.5-flash` / `gemini-1.5-pro`) 서버 사이드 연동.
- 초등학생 맞춤 프론트엔드 튜터 System Prompt 적용 (단일 완성형 HTML/CSS/JS, CDN 기반).
- 클라이언트에 API 키가 전혀 노출되지 않는 보안 구조.

---

## 🛠 설치 및 실행 방법

### 1. 패키지 설치
```bash
cd vibe-coding-edu
npm install
```

### 2. Supabase 데이터베이스 설정
Supabase 프로젝트의 SQL Editor에서 `supabase_schema.sql` 내용을 복사하여 실행합니다.
- `requests` 테이블 생성
- RLS 정책 설정
- Realtime 활성화

### 3. 환경 변수 설정
`.env.local.example`을 복사하여 `.env.local` 파일을 생성하고 키를 입력합니다:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
GEMINI_API_KEY=your-gemini-api-key
TEACHER_PIN=1234
```

### 4. 로컬 개발 서버 실행
```bash
npm run dev
```
브라우저에서 `http://localhost:3000`으로 접속합니다.
