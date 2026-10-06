'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';
import { CodeRequest } from '@/lib/types';
import {
  Lock,
  Sparkles,
  Play,
  Edit3,
  MessageSquare,
  CheckCircle,
  XCircle,
  Clock,
  User,
  ShieldCheck,
  Search,
  Filter,
  Send,
  Home,
  RefreshCw,
  Code,
  Eye,
} from 'lucide-react';

export default function TeacherPage() {
  // 교사 인증 상태 (기본 PIN: 1234)
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [pinInput, setPinInput] = useState<string>('');
  const [authError, setAuthError] = useState<string>('');

  // 요청 데이터 상태
  const [requests, setRequests] = useState<CodeRequest[]>([]);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchKeyword, setSearchKeyword] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // 모달 상태: 프롬프트 다듬기
  const [refineModalReq, setRefineModalReq] = useState<CodeRequest | null>(null);
  const [refineNote, setRefineNote] = useState<string>('');

  // 모달 상태: 교사 코멘트 보내기
  const [commentModalReq, setCommentModalReq] = useState<CodeRequest | null>(null);
  const [teacherCommentText, setTeacherCommentText] = useState<string>('');

  // 모달 상태: 생성 코드 미리보기
  const [previewCodeModal, setPreviewCodeModal] = useState<string | null>(null);

  // 실행 중 로딩 상태 (요청 ID별)
  const [generatingId, setGeneratingId] = useState<string | null>(null);

  // PIN 확인 핸들러
  const handleAuthSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // 기본 PIN 1234
    if (pinInput === '1234') {
      setIsAuthenticated(true);
      setAuthError('');
    } else {
      setAuthError('비밀번호가 올바르지 않습니다. (기본값: 1234)');
    }
  };

  // 요청 목록 가져오기 함수
  const fetchRequests = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('requests')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Fetch requests error:', error);
      } else if (data) {
        setRequests(data as CodeRequest[]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  // 실시간 구독 설정
  useEffect(() => {
    if (!isAuthenticated) return;

    fetchRequests();

    const channel = supabase
      .channel('teacher-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'requests',
        },
        (payload: any) => {
          if (payload.eventType === 'INSERT') {
            setRequests((prev) => [payload.new as CodeRequest, ...prev]);
          } else if (payload.eventType === 'UPDATE') {
            setRequests((prev) =>
              prev.map((item) =>
                item.id === payload.new.id ? (payload.new as CodeRequest) : item
              )
            );
          } else if (payload.eventType === 'DELETE') {
            setRequests((prev) => prev.filter((item) => item.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isAuthenticated]);

  // 1. [Gemini 실행 및 전송]
  const handleExecuteGemini = async (req: CodeRequest, extraNote?: string) => {
    setGeneratingId(req.id);
    try {
      // API 라우트 호출
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: req.prompt,
          studentPrompt: req.prompt,
          teacherNote: extraNote || '',
          currentCode: req.ai_response_code || '',
        }),
      });

      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || 'AI 코드 생성에 실패했습니다.');
      }

      // Supabase 업데이트 (완료 상태 & 코드 반영)
      const { error: updateError } = await supabase
        .from('requests')
        .update({
          status: '완료',
          ai_response_code: result.htmlCode,
          teacher_comment: extraNote ? `선생님 가이드 반영: ${extraNote}` : req.teacher_comment,
        })
        .eq('id', req.id);

      if (updateError) {
        throw updateError;
      }

      // 로컬 상태 동기화
      setRequests((prev) =>
        prev.map((item) =>
          item.id === req.id
            ? {
                ...item,
                status: '완료',
                ai_response_code: result.htmlCode,
              }
            : item
        )
      );

      // 모달 닫기
      setRefineModalReq(null);
      setRefineNote('');
    } catch (err: any) {
      alert('오류 발생: ' + err.message);
    } finally {
      setGeneratingId(null);
    }
  };

  // 2. [교사 코멘트 보내기]
  const handleSendTeacherComment = async () => {
    if (!commentModalReq || !teacherCommentText.trim()) return;

    try {
      const { error } = await supabase
        .from('requests')
        .update({
          teacher_comment: teacherCommentText.trim(),
        })
        .eq('id', commentModalReq.id);

      if (error) throw error;

      setRequests((prev) =>
        prev.map((item) =>
          item.id === commentModalReq.id
            ? { ...item, teacher_comment: teacherCommentText.trim() }
            : item
        )
      );

      setCommentModalReq(null);
      setTeacherCommentText('');
    } catch (err: any) {
      alert('코멘트 전송 실패: ' + err.message);
    }
  };

  // 3. 상태 반려 처리
  const handleRejectRequest = async (reqId: string) => {
    try {
      await supabase
        .from('requests')
        .update({ status: '반려' })
        .eq('id', reqId);
    } catch (err) {
      console.error(err);
    }
  };

  // 필터링된 요청 목록
  const filteredRequests = requests.filter((r) => {
    const matchStatus = filterStatus === 'all' || r.status === filterStatus;
    const matchKeyword =
      !searchKeyword ||
      r.student_name.toLowerCase().includes(searchKeyword.toLowerCase()) ||
      r.prompt.toLowerCase().includes(searchKeyword.toLowerCase());
    return matchStatus && matchKeyword;
  });

  // 교사 인증 전 게이트 화면
  if (!isAuthenticated) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-purple-50 via-slate-50 to-indigo-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl p-8 max-w-sm w-full border-2 border-purple-200 shadow-2xl text-center">
          <div className="w-16 h-16 bg-purple-100 text-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Lock className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-black text-slate-800 mb-1">교사 인증</h1>
          <p className="text-xs text-slate-500 mb-6">
            학생 실습을 지도하기 위해 비밀번호(PIN)를 입력해 주세요.
          </p>

          <form onSubmit={handleAuthSubmit} className="space-y-4">
            <input
              type="password"
              placeholder="PIN 번호 입력 (기본: 1234)"
              value={pinInput}
              onChange={(e) => setPinInput(e.target.value)}
              className="w-full text-center px-4 py-3.5 rounded-2xl border-2 border-purple-200 focus:outline-none focus:border-purple-500 text-lg font-bold tracking-widest text-slate-800"
              autoFocus
            />
            {authError && <p className="text-xs text-rose-500 font-semibold">{authError}</p>}
            <button
              type="submit"
              className="w-full py-3.5 rounded-2xl bg-purple-600 hover:bg-purple-700 text-white font-bold shadow-lg transition"
            >
              대시보드 로그인 👩‍🏫
            </button>
          </form>

          <div className="mt-4">
            <Link href="/" className="text-xs text-slate-400 hover:text-slate-600">
              ← 메인으로 돌아가기
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* 교사 헤더 */}
      <header className="bg-white border-b border-purple-100 px-6 py-4 flex flex-wrap items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-3">
          <Link href="/" className="p-2 rounded-xl hover:bg-purple-50 text-slate-600 transition">
            <Home className="w-5 h-5 text-purple-600" />
          </Link>
          <div className="h-6 w-px bg-slate-200" />
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-purple-600 text-white flex items-center justify-center font-bold">
              T
            </div>
            <h1 className="font-extrabold text-lg text-slate-800">
              실시간 바이브 코딩 지도 대시보드
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchRequests}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-100 text-xs font-semibold text-slate-600 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            새로고침
          </button>
          <div className="flex items-center gap-1 text-xs font-bold bg-purple-50 text-purple-700 border border-purple-200 px-3 py-1.5 rounded-xl">
            <ShieldCheck className="w-4 h-4" />
            선생님 모드 활성화됨
          </div>
        </div>
      </header>

      {/* 필터 및 검색 바 */}
      <div className="max-w-7xl w-full mx-auto px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* 상태 필터 버튼들 */}
        <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto">
          {['all', '대기', '완료', '반려'].map((statusKey) => (
            <button
              key={statusKey}
              onClick={() => setFilterStatus(statusKey)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                filterStatus === statusKey
                  ? 'bg-purple-600 text-white shadow-md'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              {statusKey === 'all' ? '전체 요청' : statusKey}
              <span className="ml-1.5 opacity-80">
                (
                {statusKey === 'all'
                  ? requests.length
                  : requests.filter((r) => r.status === statusKey).length}
                )
              </span>
            </button>
          ))}
        </div>

        {/* 학생 이름/내용 검색 */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="학생 이름 또는 프롬프트 검색..."
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white rounded-xl border border-slate-200 text-xs font-medium text-slate-700 focus:outline-none focus:border-purple-400"
          />
        </div>
      </div>

      {/* 요청 목록 카드 그리드 */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 pb-12">
        {filteredRequests.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 border-2 border-dashed border-slate-200 text-center">
            <div className="text-5xl mb-3">💬</div>
            <h3 className="font-bold text-slate-700 mb-1">표시할 실습 요청이 없습니다.</h3>
            <p className="text-xs text-slate-400">
              학생들이 프롬프트를 전송하면 여기에 실시간으로 나타납니다.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredRequests.map((req) => (
              <div
                key={req.id}
                className={`bg-white rounded-3xl border-2 p-6 shadow-sm flex flex-col justify-between transition-all hover:shadow-md ${
                  req.status === '대기'
                    ? 'border-sky-300 ring-2 ring-sky-100'
                    : req.status === '완료'
                    ? 'border-emerald-200'
                    : 'border-slate-200'
                }`}
              >
                <div>
                  {/* 상단: 학생 정보 & 상태 배지 */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center font-bold text-xs text-slate-700">
                        {req.student_name.slice(0, 2)}
                      </div>
                      <div>
                        <h4 className="font-black text-sm text-slate-800">{req.student_name}</h4>
                        <span className="text-[10px] text-slate-400 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(req.created_at).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                    </div>

                    <span
                      className={`px-2.5 py-1 rounded-full text-xs font-extrabold ${
                        req.status === '대기'
                          ? 'bg-sky-100 text-sky-700 animate-pulse'
                          : req.status === '완료'
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-rose-100 text-rose-700'
                      }`}
                    >
                      {req.status}
                    </span>
                  </div>

                  {/* 학생 작성 프롬프트 */}
                  <div className="bg-slate-50 rounded-2xl p-3.5 mb-3 border border-slate-100">
                    <span className="text-[11px] font-bold text-slate-400 block mb-1">
                      💡 학생 프롬프트
                    </span>
                    <p className="text-xs font-semibold text-slate-800 whitespace-pre-wrap leading-relaxed">
                      {req.prompt}
                    </p>
                  </div>

                  {/* 전달된 교사 코멘트가 있을 경우 */}
                  {req.teacher_comment && (
                    <div className="bg-amber-50 rounded-2xl p-3 mb-3 border border-amber-200 text-xs text-amber-900">
                      <span className="font-bold text-[11px] text-amber-700 block mb-0.5">
                        💬 보낸 코멘트:
                      </span>
                      {req.teacher_comment}
                    </div>
                  )}

                  {/* 생성된 코드 정보 및 프리뷰 버튼 */}
                  {req.ai_response_code && (
                    <div className="flex items-center justify-between mb-4 px-2 py-1 bg-slate-100 rounded-xl">
                      <span className="text-[11px] text-slate-600 font-bold flex items-center gap-1">
                        <Code className="w-3.5 h-3.5 text-indigo-500" /> 코드 생성 완료됨
                      </span>
                      <button
                        onClick={() => setPreviewCodeModal(req.ai_response_code)}
                        className="text-[11px] text-indigo-600 hover:underline flex items-center gap-0.5 font-semibold"
                      >
                        <Eye className="w-3 h-3" /> 결과 미리보기
                      </button>
                    </div>
                  )}
                </div>

                {/* 하단: 교사의 3가지 피드백 액션 버튼 */}
                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <div className="grid grid-cols-2 gap-2">
                    {/* 1. Gemini 실행 및 전송 */}
                    <button
                      onClick={() => handleExecuteGemini(req)}
                      disabled={generatingId === req.id}
                      className="py-2.5 px-3 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-600 hover:to-indigo-700 text-white font-bold text-xs shadow-sm flex items-center justify-center gap-1.5 disabled:opacity-50 transition"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      {generatingId === req.id ? '생성 중...' : 'Gemini 실행'}
                    </button>

                    {/* 2. 프롬프트 다듬기 후 실행 */}
                    <button
                      onClick={() => {
                        setRefineModalReq(req);
                        setRefineNote('');
                      }}
                      className="py-2.5 px-3 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 font-bold text-xs flex items-center justify-center gap-1.5 transition"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      다듬어 실행
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    {/* 3. 코멘트 보내기 */}
                    <button
                      onClick={() => {
                        setCommentModalReq(req);
                        setTeacherCommentText('');
                      }}
                      className="py-2 px-3 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 font-bold text-xs flex items-center justify-center gap-1.5 transition"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      코멘트 전송
                    </button>

                    {/* 4. 반려 */}
                    <button
                      onClick={() => handleRejectRequest(req.id)}
                      className="py-2 px-3 rounded-xl hover:bg-rose-50 text-rose-500 font-semibold text-xs transition"
                    >
                      요청 반려
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* 모달 1: 프롬프트 다듬기 후 실행 모달 */}
      {refineModalReq && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl border border-purple-100">
            <h3 className="text-lg font-black text-slate-800 mb-2 flex items-center gap-2">
              <Edit3 className="w-5 h-5 text-purple-600" />
              프롬프트 다듬기 및 지도 팁 추가
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              학생의 원본 프롬프트에 교사의 가이드나 제약조건을 덧붙여 AI를 실행합니다.
            </p>

            <div className="bg-slate-50 p-3 rounded-xl text-xs font-semibold text-slate-700 mb-4 border border-slate-200">
              <span className="text-slate-400 block mb-0.5">학생 원본:</span>
              {refineModalReq.prompt}
            </div>

            <textarea
              rows={3}
              value={refineNote}
              onChange={(e) => setRefineNote(e.target.value)}
              placeholder="예: 버튼 클릭 시 사운드 효과를 넣지 말고, 캔버스를 이용해 부드러운 파스텔톤으로 구현해 줘."
              className="w-full p-3 rounded-xl border border-slate-300 text-xs font-medium focus:outline-none focus:border-purple-500 mb-4"
            />

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setRefineModalReq(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100"
              >
                취소
              </button>
              <button
                onClick={() => handleExecuteGemini(refineModalReq, refineNote)}
                disabled={generatingId === refineModalReq.id}
                className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs flex items-center gap-2 shadow-md transition"
              >
                <Sparkles className="w-4 h-4" />
                {generatingId === refineModalReq.id ? '생성 중...' : '다듬어서 AI 실행'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 모달 2: 학생 코멘트 전송 모달 */}
      {commentModalReq && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-amber-100">
            <h3 className="text-lg font-black text-slate-800 mb-2 flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-amber-500" />
              학생에게 피드백 코멘트 보내기
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              코드를 바로 돌리지 않고 학생에게 구체적인 생각이나 발문을 제시할 수 있습니다.
            </p>

            <textarea
              rows={3}
              value={teacherCommentText}
              onChange={(e) => setTeacherCommentText(e.target.value)}
              placeholder="예: 버튼 색깔을 어떤 색으로 하고 싶은지 구체적으로 적어볼까요?"
              className="w-full p-3 rounded-xl border border-slate-300 text-xs font-medium focus:outline-none focus:border-amber-500 mb-4"
            />

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setCommentModalReq(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100"
              >
                취소
              </button>
              <button
                onClick={handleSendTeacherComment}
                disabled={!teacherCommentText.trim()}
                className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs flex items-center gap-2 shadow-md transition"
              >
                <Send className="w-4 h-4" />
                피드백 보내기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 모달 3: 생성 결과 코드 미리보기 팝업 */}
      {previewCodeModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-4xl w-full h-[80vh] flex flex-col shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Eye className="w-5 h-5 text-indigo-500" />
                학생에게 전달된 화면 미리보기
              </h3>
              <button
                onClick={() => setPreviewCodeModal(null)}
                className="p-1 rounded-lg text-slate-400 hover:bg-slate-100"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>

            <div className="flex-1 border rounded-2xl overflow-hidden bg-white relative">
              {!previewCodeModal ? (
                <div className="flex flex-col items-center justify-center h-full text-slate-400">
                  <p>생성된 코드가 없습니다.</p>
                </div>
              ) : (
                <iframe
                  title="Preview Result"
                  sandbox="allow-scripts allow-modals"
                  srcDoc={previewCodeModal}
                  className="w-full h-full border-none"
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
