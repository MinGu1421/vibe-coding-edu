import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '초등 바이브 코딩 교실 (Vibe Coding Classroom)',
  description: '자연어로 만들고 선생님과 함께 발전시키는 초등 바이브 코딩 플랫폼',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body className="antialiased selection:bg-pink-200 selection:text-pink-900">
        {children}
      </body>
    </html>
  );
}
