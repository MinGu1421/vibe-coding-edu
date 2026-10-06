'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';
import { CodeRequest, PromptHistoryItem } from '@/lib/types';
import {
  Sparkles,
  Send,
  RotateCcw,
  Maximize2,
  Clock,
  MessageCircle,
  HelpCircle,
  CheckCircle2,
  AlertCircle,
  User,
  History,
  Layers,
  Home,
} from 'lucide-react';

// 초등학생용 추천 프롬프트 키워드 단어 카드들
const SUGGESTED_PROMPTS = [
  '버튼을 알록달록 무지개색으로 크게 만들기',
  '배경색을 파스텔톤 밤하늘과 별빛으로 바꾸기',
  '클릭할 때마다 점수가 올라가는 점수판 넣기',
  '귀여운 고양이 이모티콘이 점프하는 게임 만들기',
  '버튼을 누르면 반짝반짝 폭죽 효과 나타나기',
  '시간 제한 타이머(10초 카운트다운) 추가하기',
];

// 기본 초기 안내 화면 HTML 코드
const DEFAULT_INITIAL_HTML = `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    @keyframes bounce {
      0%, 100% { transform: translateY(-5%); }
      50% { transform: translateY(5%); }
    }
    .animate-float {
      animation: bounce 2s infinite ease-in-out;
    }
  </style>
</head>
<body class="bg-gradient-to-br from-amber-50 via-sky-50 to-pink-50 min-h-screen flex flex-col items-center justify-center p-6 text-slate-800 font-sans">
  <div class="bg-white/80 backdrop-blur border-2 border-dashed border-sky-300 rounded-3xl p-8 max-w-md text-center shadow-lg">
    <div class="text-6xl mb-4 animate-float">🎨✨</div>
    <h1 class="text-2xl font-black text-sky-600 mb-2">나만의 바이브 코딩 화면</h1>
    <p class="text-sm text-slate-600 mb-4 leading-relaxed">
      왼쪽 입력창에 만들고 싶은 게임이나 웹 화면을 자연어로 적어보세요!<br>
      선생님이 확인 후 멋진 코드를 이 화면에 띄워줄 거예요.
    </p>
    <div class="inline-block bg-sky-100 text-sky-700 px-4 py-2 rounded-full text-xs font-bold">
      💡 추천 단어 카드를 클릭해도 좋아요!
    </div>
  </div>
</body>
</html>`;

export default function StudentPage() {
  const [studentName, setStudentName] = useState<string>('');
  const [isNameSet, setIsNameSet] = useState<boolean>(false);
  const [promptInput, setPromptInput] = useState<string>('');
  const [activeRequestId, setActiveRequestId] = useState<string | null>(null);
  const [requestStatus, setRequestStatus] = useState<string>('idle'); // 'idle' | '대기' | '승인' | '완료' | '반려'
  const [teacherFeedback, setTeacherFeedback] = useState<string | null>(null);
  
  // HTML 코드 및 타임라인 버전 히스토리
  const [currentHtml, setCurrentHtml] = useState<string>(DEFAULT_INITIAL_HTML);
  const [history, setHistory] = useState<PromptHistoryItem[]>([]);
  const [activeVersion, setActiveVersion] = useState<number>(0);

  const iframeRef = useRef<HTMLIFrameElement>(null);

  // 로컬 스토리지에서 이름 및 세션 복원
  useEffect(() => {
    const savedName = localStorage.getItem('vibe_student_name');
    if (savedName) {
      setStudentName(savedName);
      setIsNameSet(true);
    }
  }, []);

  // 학생 접속 시 기존 완료된 코드 히스토리 불러오기
  useEffect(() => {
    if (!studentName) return;

    const loadExistingHistory = async () => {
      try {
        const { data, error } = await supabase
          .from('requests')
          .select('*')
          .eq('student_name', studentName)
          .eq('status', '완료')
          .order('created_at', { ascending: true });

        if (!error && data && data.length > 0) {
          const itemsWithCode = data.filter((r) => r.ai_response_code && r.ai_response_code.trim().length > 0);
          if (itemsWithCode.length > 0) {
            const formattedHistory: PromptHistoryItem[] = itemsWithCode.map((req, idx) => ({
              version: idx + 1,
              prompt: req.prompt,
              code: req.ai_response_code,
              timestamp: new Date(req.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            }));

            setHistory(formattedHistory);
            const latest = formattedHistory[formattedHistory.length - 1];
            setCurrentHtml(latest.code);
            setActiveVersion(latest.version);
          }
        }
      } catch (err) {
        console.error('Failed to load existing student history:', err);
      }
    };

    loadExistingHistory();
  }, [studentName]);

  // iframe 내용이 바뀔 때 자동 동기화 (srcDoc 직접 주입 보장)
  useEffect(() => {
    if (iframeRef.current && currentHtml) {
      iframeRef.current.srcdoc = currentHtml;
    }
  }, [currentHtml]);

  // Supabase Realtime 구독 및 폴링 백업 (자신의 요청 상태 변화 감지)
  useEffect(() => {
    if (!studentName) return;

    // 상태 처리 공통 함수
    const handleRequestUpdate = (req: CodeRequest) => {
      if (req.student_name !== studentName) return;

      setRequestStatus(req.status);

      // 교사 코멘트 반영
      if (req.teacher_comment) {
        setTeacherFeedback(req.teacher_comment);
      }

      // 생성이 완료되어 AI 코드가 전달되었을 때
      if (req.status === '완료' && req.ai_response_code && req.ai_response_code.trim().length > 0) {
        setHistory((prev) => {
          // 중복 추가 방지
          const alreadyExists = prev.some((item) => item.code === req.ai_response_code);
          if (alreadyExists) return prev;

          const newVersion = prev.length + 1;
          const newHistoryItem: PromptHistoryItem = {
            version: newVersion,
            prompt: req.prompt,
            code: req.ai_response_code,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          };
          setCurrentHtml(req.ai_response_code);
          setActiveVersion(newVersion);
          return [...prev, newHistoryItem];
        });

        setRequestStatus('idle');
        setActiveRequestId(null);
      }
    };

    // 1. Supabase Realtime 채널 구독
    const channel = supabase
      .channel(`student-room-${Date.now()}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'requests',
        },
        (payload: any) => {
          const newReq = payload.new as CodeRequest;
          if (newReq && newReq.student_name === studentName) {
            handleRequestUpdate(newReq);
          }
        }
      )
      .subscribe((status) => {
        console.log('Student Realtime status:', status);
      });

    // 2. 대기 상태일 때 3초 간격 폴링 (네트워크 환경 또는 Realtime 지연 대비 백업)
    const pollInterval = setInterval(async () => {
      try {
        const { data, error } = await supabase
          .from('requests')
          .select('*')
          .eq('student_name', studentName)
          .order('created_at', { ascending: false })
          .limit(1);

        if (!error && data && data.length > 0) {
          const latest = data[0] as CodeRequest;
          if (activeRequestId && latest.id === activeRequestId) {
            handleRequestUpdate(latest);
          } else if (latest.status === '대기' || (latest.status === '완료' && requestStatus === '대기')) {
            handleRequestUpdate(latest);
          }
        }
      } catch (e) {
        console.error('Polling error:', e);
      }
    }, 3000);

    return () => {
      clearInterval(pollInterval);
      supabase.removeChannel(channel);
    };
  }, [studentName, activeRequestId, requestStatus]);

  // 이름 저장 핸들러
  const handleSaveName = (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentName.trim()) return;
    localStorage.setItem('vibe_student_name', studentName.trim());
    setIsNameSet(true);
  };

  // 프롬프트 추천 카드 클릭
  const handleAddPromptSuggestion = (suggestion: string) => {
    setPromptInput((prev) => (prev ? `${prev}, ${suggestion}` : suggestion));
  };

  // 요청 전송하기
  const handleSendPrompt = async () => {
    if (!promptInput.trim()) return;
    if (!studentName) {
      alert('먼저 번호나 이름을 입력해 주세요!');
      return;
    }

    try {
      setRequestStatus('대기');
      setTeacherFeedback(null);

      const { data, error } = await supabase
        .from('requests')
        .insert([
          {
            student_name: studentName,
            prompt: promptInput.trim(),
            status: '대기',
            ai_response_code: '',
            teacher_comment: '',
          },
        ])
        .select()
        .single();

      if (error) {
        console.error('Supabase insert error:', error);
        // Supabase 연동 전 테스트를 위한 로컬 모의 동작 지원
        alert('서버 전송 중 안내: Supabase 키가 설정되지 않은 경우 .env.local을 확인해 주세요. (대기 상태로 시뮬레이션)');
        setActiveRequestId('mock-' + Date.now());
      } else if (data) {
        setActiveRequestId(data.id);
      }
      setPromptInput('');
    } catch (err: any) {
      console.error(err);
      alert('요청 중 오류가 발생했습니다: ' + err.message);
      setRequestStatus('idle');
    }
  };

  // 타임라인 이전 버전으로 되돌리기
  const handleRollbackVersion = (item: PromptHistoryItem) => {
    setCurrentHtml(item.code);
    setActiveVersion(item.version);
  };

  // iframe 리프레시 (코드 재렌더링)
  const handleReloadIframe = () => {
    if (iframeRef.current) {
      iframeRef.current.srcdoc = currentHtml;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* 1. 상단 네비게이션 헤더 */}
      <header className="bg-white border-b border-sky-100 px-6 py-3.5 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <Link href="/" className="p-2 rounded-xl hover:bg-sky-50 text-slate-600 transition">
            <Home className="w-5 h-5 text-sky-600" />
          </Link>
          <div className="h-6 w-px bg-slate-200" />
          <div className="flex items-center gap-2">
            <span className="text-2xl">✨</span>
            <span className="font-extrabold text-lg text-slate-800 tracking-tight">
              초등 바이브 코딩 실습실
            </span>
          </div>
        </div>

        {/* 학생 이름 및 상태 */}
        <div className="flex items-center gap-3">
          {isNameSet ? (
            <div className="flex items-center gap-2 bg-sky-50 border border-sky-200 px-3.5 py-1.5 rounded-full text-sm">
              <User className="w-4 h-4 text-sky-600" />
              <span className="font-bold text-sky-800">{studentName}</span>
              <button
                onClick={() => setIsNameSet(false)}
                className="text-xs text-sky-500 hover:text-sky-700 underline ml-1"
              >
                변경
              </button>
            </div>
          ) : (
            <span className="text-xs text-amber-600 font-semibold bg-amber-50 px-3 py-1.5 rounded-full border border-amber-200">
              이름을 입력해주세요 👇
            </span>
          )}
        </div>
      </header>

      {/* 2. 이름 입력 모달 (처음 진입 시) */}
      {!isNameSet && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl border-4 border-sky-100 text-center animate-in fade-in zoom-in duration-200">
            <div className="w-16 h-16 bg-sky-100 text-sky-600 rounded-2xl flex items-center justify-center mx-auto mb-4 text-3xl">
              🎒
            </div>
            <h2 className="text-2xl font-black text-slate-800 mb-2">실습을 시작해볼까요?</h2>
            <p className="text-slate-600 text-sm mb-6">
              선생님이 확인할 수 있도록 본인의 번호와 이름 또는 모둠명을 입력해 주세요!
            </p>
            <form onSubmit={handleSaveName} className="space-y-4">
              <input
                type="text"
                placeholder="예: 3반 15번 김하늘 또는 2모둠"
                value={studentName}
                onChange={(e) => setStudentName(e.target.value)}
                autoFocus
                className="w-full px-5 py-3.5 rounded-2xl border-2 border-sky-200 focus:outline-none focus:border-sky-500 text-base font-semibold text-slate-800 placeholder:text-slate-400"
              />
              <button
                type="submit"
                disabled={!studentName.trim()}
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-sky-500 to-indigo-500 text-white font-bold text-lg shadow-lg hover:from-sky-600 hover:to-indigo-600 disabled:opacity-50 transition transform active:scale-95"
              >
                입장하기 🚀
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 3. 본문 2단 분할 영역 (좌: 프롬프트 입력 및 제어 / 우: iframe 실시간 프리뷰) */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6 p-4 md:p-6 max-w-[1600px] w-full mx-auto">
        {/* 좌측 영역: 입력 및 히스토리 */}
        <div className="flex flex-col gap-5">
          {/* 교사 피드백 알림 배너 */}
          {teacherFeedback && (
            <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-4 shadow-sm flex items-start gap-3 animate-bounce">
              <MessageCircle className="w-6 h-6 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bold text-amber-900 text-sm">선생님의 꿀팁 코멘트 💌</h4>
                <p className="text-amber-800 text-sm mt-1 whitespace-pre-wrap">{teacherFeedback}</p>
              </div>
            </div>
          )}

          {/* 대기 및 버퍼링 상태 표시 배너 */}
          {requestStatus === '대기' && (
            <div className="bg-gradient-to-r from-sky-50 via-indigo-50 to-pink-50 border-2 border-sky-300 rounded-2xl p-4 shadow-sm flex items-center gap-4 animate-pulse">
              <div className="relative flex items-center justify-center">
                <div className="w-8 h-8 border-4 border-sky-400 border-t-transparent rounded-full animate-spin flex-shrink-0" />
                <Sparkles className="w-4 h-4 text-amber-400 absolute animate-ping" />
              </div>
              <div className="flex-1">
                <h4 className="font-extrabold text-sky-900 text-sm flex items-center gap-1.5">
                  선생님과 AI가 코드를 만들고 있어요! 🎨✨
                </h4>
                <p className="text-sky-700 text-xs mt-0.5">
                  선생님이 승인하면 우측 실행 화면에 마법처럼 바로 나타나요. 조금만 기다려주세요!
                </p>
                {/* 귀여운 프로그레스 바 애니메이션 */}
                <div className="w-full bg-sky-200/60 h-2 rounded-full mt-2.5 overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-sky-500 via-indigo-500 to-pink-500 rounded-full animate-[shimmer_2s_infinite] w-2/3" />
                </div>
              </div>
            </div>
          )}

          {/* 프롬프트 입력 카드 */}
          <div className="bg-white rounded-3xl p-6 border-2 border-sky-100 shadow-md flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <label className="text-base font-extrabold text-slate-800 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-sky-500" />
                어떤 화면이나 게임을 만들고 싶나요?
              </label>
              <span className="text-xs text-slate-400 font-medium">자연어로 자유롭게 적기</span>
            </div>

            <textarea
              rows={4}
              value={promptInput}
              onChange={(e) => setPromptInput(e.target.value)}
              placeholder="예: 클릭하면 고양이가 하트를 던지는 귀여운 미니게임을 만들어줘. 점수도 나오게 해줘!"
              disabled={requestStatus === '대기'}
              className="w-full p-4 rounded-2xl border-2 border-slate-200 focus:outline-none focus:border-sky-400 text-slate-800 placeholder:text-slate-400 text-base resize-none transition"
            />

            {/* 추천 프롬프트 단어 카드 모음 */}
            <div>
              <span className="text-xs font-bold text-slate-500 mb-2 flex items-center gap-1">
                <HelpCircle className="w-3.5 h-3.5 text-indigo-500" />
                추천 표현을 콕 찍어보세요:
              </span>
              <div className="flex flex-wrap gap-2 mt-1">
                {SUGGESTED_PROMPTS.map((item, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleAddPromptSuggestion(item)}
                    disabled={requestStatus === '대기'}
                    className="text-xs bg-sky-50 hover:bg-sky-100 active:scale-95 text-sky-700 font-semibold px-3 py-2 rounded-xl border border-sky-200 transition"
                  >
                    + {item}
                  </button>
                ))}
              </div>
            </div>

            {/* 전송 버튼 */}
            <button
              onClick={handleSendPrompt}
              disabled={!promptInput.trim() || requestStatus === '대기'}
              className="mt-2 w-full py-4 rounded-2xl bg-gradient-to-r from-sky-500 via-indigo-500 to-pink-500 text-white font-extrabold text-base shadow-lg shadow-sky-200 hover:opacity-95 disabled:opacity-40 transition flex items-center justify-center gap-2 transform active:scale-98"
            >
              <Send className="w-5 h-5" />
              {requestStatus === '대기' ? '선생님께 전달됨 (제작 중...)' : '선생님께 전송하기 🚀'}
            </button>
          </div>

          {/* 코드 히스토리 타임라인 (되돌리기 기능) */}
          <div className="bg-white rounded-3xl p-6 border-2 border-slate-100 shadow-md">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 text-sm font-bold text-slate-800">
                <History className="w-4 h-4 text-purple-500" />
                버전 히스토리 (타임라인)
              </div>
              <span className="text-xs text-slate-400 font-semibold">총 {history.length}개 버전</span>
            </div>

            {history.length === 0 ? (
              <div className="text-center py-6 text-xs text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                아직 생성된 코드가 없습니다. 첫 요청을 보내보세요!
              </div>
            ) : (
              <div className="flex flex-col gap-2.5 max-h-56 overflow-y-auto pr-1">
                {history.map((item) => (
                  <div
                    key={item.version}
                    onClick={() => handleRollbackVersion(item)}
                    className={`p-3 rounded-2xl border cursor-pointer transition flex items-center justify-between ${
                      activeVersion === item.version
                        ? 'border-purple-400 bg-purple-50 shadow-sm'
                        : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 overflow-hidden">
                      <span
                        className={`text-xs font-black px-2.5 py-1 rounded-lg ${
                          activeVersion === item.version
                            ? 'bg-purple-600 text-white'
                            : 'bg-slate-200 text-slate-700'
                        }`}
                      >
                        V{item.version}
                      </span>
                      <span className="text-xs font-semibold text-slate-700 truncate max-w-[200px]">
                        {item.prompt}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-400 whitespace-nowrap">
                      {item.timestamp}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 우측 영역: iframe 실시간 프리뷰 뷰어 */}
        <div className="flex flex-col bg-white rounded-3xl border-2 border-sky-100 shadow-xl overflow-hidden min-h-[550px] md:min-h-[700px] h-full">
          {/* iframe 상단 툴바 */}
          <div className="bg-slate-100/90 px-5 py-3 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-rose-400" />
                <div className="w-3 h-3 rounded-full bg-amber-400" />
                <div className="w-3 h-3 rounded-full bg-emerald-400" />
              </div>
              <span className="text-xs font-bold text-slate-600 ml-2">실시간 인터랙티브 실행 화면</span>
              {activeVersion > 0 && (
                <span className="text-[11px] font-black px-2.5 py-0.5 bg-sky-100 text-sky-700 rounded-lg">
                  V{activeVersion} 렌더링 중
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleReloadIframe}
                title="화면 새로고침"
                className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-200 transition"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* iframe 샌드박스 보안 뷰어 + 로딩 버퍼링 오버레이 */}
          <div className="relative flex-1 bg-white">
            {requestStatus === '대기' && (
              <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-20 flex flex-col items-center justify-center p-6 text-center">
                <div className="w-16 h-16 rounded-full border-4 border-sky-300 border-t-indigo-600 animate-spin mb-4" />
                <div className="text-4xl mb-2 animate-bounce">🤖✨</div>
                <h3 className="text-base font-extrabold text-slate-800 mb-1">
                  AI가 멋진 코드를 열심히 코딩하고 있어요!
                </h3>
                <p className="text-xs text-slate-500 max-w-xs">
                  완성되면 이 화면에 바로 실행 화면이 띄워집니다. 잠시만 기다려 주세요!
                </p>
              </div>
            )}

            <iframe
              ref={iframeRef}
              title="Student Sandbox Preview"
              sandbox="allow-scripts allow-modals"
              srcDoc={currentHtml}
              className="w-full h-full border-none"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
