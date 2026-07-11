import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ValoLink.gg - 特戰英豪智慧揪團與信用評價系統",
  description: "特戰英豪跨伺服器智慧組隊生態系。提供秒級配對、真實數據驗證與跨社群的玩家信用網絡，一鍵尋找完美神隊友。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-TW">
      <body>
        {children}
      </body>
    </html>
  );
}
