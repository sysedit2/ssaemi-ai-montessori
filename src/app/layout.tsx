import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SSAEMI AI · 몬테소리 발달 분석",
  description: "몬테소리 관찰일지를 정량적 발달 데이터로 변환하는 AI 플랫폼",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body className="antialiased">{children}</body>
    </html>
  );
}
