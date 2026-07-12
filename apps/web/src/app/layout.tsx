import type { Metadata } from "next";
import "./globals.css";
import ClientLayout from "./ClientLayout";

export const metadata: Metadata = {
  title: "ValoLink.gg",
  description: "特戰英豪智慧組隊平台 — 組隊大廳、語音聊天、信用評分",
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
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  );
}
