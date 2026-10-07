import { createClient } from '@supabase/supabase-js';

let supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim();
if (supabaseUrl.endsWith('/')) {
  supabaseUrl = supabaseUrl.slice(0, -1);
}
if (supabaseUrl.endsWith('/rest/v1')) {
  supabaseUrl = supabaseUrl.replace(/\/rest\/v1$/, '');
}
const supabaseAnonKey = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '').trim();

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    'Supabase 환경 변수(NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY)가 설정되지 않았습니다. .env.local을 확인해 주세요.'
  );
}

const defaultDummyUrl = 'https://dummy-build.supabase.co';
const defaultDummyKey = 'dummy-anon-key-for-build';

export const supabase = createClient(
  supabaseUrl || defaultDummyUrl,
  supabaseAnonKey || defaultDummyKey,
  {
    realtime: {
      params: {
        eventsPerSecond: 10,
      },
    },
  }
);

