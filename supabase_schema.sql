-- 1. requests 테이블 생성
create table if not exists public.requests (
  id uuid primary key default gen_random_uuid(),
  student_name text not null,
  prompt text not null,
  status text not null default '대기', -- '대기', '승인', '완료', '반려'
  ai_response_code text default '',
  teacher_comment text default '',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. 인덱스 생성 (시간순 조회 및 학생별 조회 성능 향상)
create index if not exists idx_requests_created_at on public.requests(created_at desc);
create index if not exists idx_requests_student_name on public.requests(student_name);
create index if not exists idx_requests_status on public.requests(status);

-- 3. Row Level Security(RLS) 설정
-- 교육용 목적의 빠른 실습 환경을 위해 anon 읽기/쓰기/수정 허용
alter table public.requests enable row level security;

create policy "모든 사용자가 요청을 조회할 수 있음"
  on public.requests for select
  using (true);

create policy "모든 사용자가 요청을 생성할 수 있음"
  on public.requests for insert
  with check (true);

create policy "모든 사용자가 요청을 수정할 수 있음"
  on public.requests for update
  using (true);

-- 4. Supabase Realtime 전송 활성화
alter publication supabase_realtime add table public.requests;
