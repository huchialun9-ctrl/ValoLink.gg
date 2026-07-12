import type { Metadata } from "next";
import "./globals.css";
import ClientLayout from "./ClientLayout";

export const metadata: Metadata = {
  title: "ValoLink.gg — 特戰英豪智慧揪團與信用評價系統",
  description: "特戰英豪跨伺服器智慧組隊生態系。提供秒級配對、真實數據驗證與跨社群的玩家信用網絡，一鍵尋找完美神隊友。",
  icons: {
    icon: "/favicon.ico",
  }
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-TW">
      <body>
        <svg style={{ position: 'absolute', width: 0, height: 0 }} aria-hidden="true">
          <filter id="handDrawnNoise">
            <feTurbulence type="fractalNoise" baseFrequency="1.2" numOctaves="3" result="noise" />
            <feColorMatrix type="matrix" values="0 0 0 0 0.1  0 0 0 0 0.3  0 0 0 0 0.5  0 0 0 0.06 0" />
          </filter>
        </svg>
        <div className="island-backdrop" />
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  );
}
