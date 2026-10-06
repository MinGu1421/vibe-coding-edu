import Link from 'next/link';
import { Sparkles, GraduationCap, Users, ArrowRight, ShieldCheck, Wand2, Lightbulb } from 'lucide-react';

export default function HomePage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-sky-100 via-purple-50 to-pink-50 p-6 md:p-12 flex flex-col items-center justify-center">
      {/* 상단 헤더 */}
      <div className="max-w-4xl text-center mb-12">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/80 border border-sky-200 shadow-sm text-sky-700 text-sm font-semibold mb-6">
          <Sparkles className="w-4 h-4 text-amber-500 animate-spin" />
          초등학교 소프트웨어 교육용 인터랙티브 플랫폼
        </div>
        <h1 className="text-4xl md:text-5xl font-extrabold text-slate-800 tracking-tight leading-snug">
          상상하는 모든 것을 말로 코딩하는 <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-500 via-indigo-500 to-pink-500">
            초등 바이브 코딩 (Vibe Coding) 교실
          </span>
        </h1>
        <p className="mt-4 text-lg text-slate-600 max-w-2xl mx-auto">
          로그인 없이 번호나 모둠 이름만 적고, 만들고 싶은 게임이나 웹 화면을 자연어로 이야기해 보세요.
          선생님이 대시보드에서 함께 살펴보고 멋진 인공지능 마법을 걸어줍니다!
        </p>
      </div>

      {/* 진입 카드 2개 */}
      <div className="grid md:grid-cols-2 gap-8 w-full max-w-4xl">
        {/* 학생 입장 카드 */}
        <Link
          href="/student"
          className="group relative bg-white/90 backdrop-blur-sm rounded-3xl p-8 border-2 border-sky-200 shadow-xl shadow-sky-100 hover:shadow-2xl hover:border-sky-400 transition-all duration-300 transform hover:-translate-y-1 flex flex-col justify-between"
        >
          <div>
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-sky-400 to-cyan-300 text-white flex items-center justify-center mb-6 shadow-md group-hover:scale-110 transition-transform">
              <Users className="w-8 h-8" />
            </div>
            <div className="flex items-center gap-2 text-xs font-bold text-sky-600 uppercase tracking-wider mb-1">
              <Wand2 className="w-3.5 h-3.5" /> 별도 로그인 없음
            </div>
            <h2 className="text-2xl font-bold text-slate-800 mb-2">
              학생 실습 공간 입장하기 🚀
            </h2>
            <p className="text-slate-600 text-sm leading-relaxed mb-6">
              아이디어가 떠올랐나요? 말하듯이 편하게 적으면 실시간 화면으로 곧바로 코드가 완성돼요.
            </p>
          </div>
          <div className="flex items-center text-sky-600 font-bold gap-2 group-hover:translate-x-1 transition-transform">
            <span>실습 시작하기</span>
            <ArrowRight className="w-5 h-5" />
          </div>
        </Link>

        {/* 교사 대시보드 카드 */}
        <Link
          href="/teacher"
          className="group relative bg-white/90 backdrop-blur-sm rounded-3xl p-8 border-2 border-purple-200 shadow-xl shadow-purple-100 hover:shadow-2xl hover:border-purple-400 transition-all duration-300 transform hover:-translate-y-1 flex flex-col justify-between"
        >
          <div>
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-purple-500 to-indigo-400 text-white flex items-center justify-center mb-6 shadow-md group-hover:scale-110 transition-transform">
              <GraduationCap className="w-8 h-8" />
            </div>
            <div className="flex items-center gap-2 text-xs font-bold text-purple-600 uppercase tracking-wider mb-1">
              <ShieldCheck className="w-3.5 h-3.5" /> 교사용 PIN 인증
            </div>
            <h2 className="text-2xl font-bold text-slate-800 mb-2">
              교사 관리 대시보드 👩‍🏫
            </h2>
            <p className="text-slate-600 text-sm leading-relaxed mb-6">
              학생들의 프롬프트 요청을 실시간으로 확인하고, 프롬프트를 다듬어 주거나 AI를 승인 실행해 줍니다.
            </p>
          </div>
          <div className="flex items-center text-purple-600 font-bold gap-2 group-hover:translate-x-1 transition-transform">
            <span>대시보드 열기</span>
            <ArrowRight className="w-5 h-5" />
          </div>
        </Link>
      </div>

      {/* 하단 특징 배너 */}
      <div className="mt-14 max-w-4xl w-full bg-white/60 rounded-2xl p-6 border border-slate-200/60 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4 text-xs md:text-sm text-slate-600">
        <div className="flex items-center gap-2">
          <Lightbulb className="w-5 h-5 text-amber-500" />
          <span><strong>안전한 샌드박스:</strong> allow-scripts 격리 실행으로 교실 PC를 안전하게 보호합니다.</span>
        </div>
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-indigo-500" />
          <span><strong>실시간 동기화:</strong> Supabase Realtime으로 학생과 교사가 실시간으로 교감합니다.</span>
        </div>
      </div>
    </main>
  );
}
