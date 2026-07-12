import type { Metadata } from "next";
import "./globals.css";
import ClientLayout from "./ClientLayout";

export const metadata: Metadata = {
  title: "ValoLink.gg \u2014 \u7279\u6230\u82F1\u8C6A\u667A\u6167\u63EA\u5718\u8207\u4FE1\u7528\u8A55\u50F9\u7CFB\u7D71",
  description: "\u7279\u6230\u82F1\u8C6A\u8DE8\u4F3A\u670D\u5668\u667A\u6167\u7D44\u968A\u751F\u614B\u7CFB\u3002\u63D0\u4F9B\u79D2\u7D1A\u914D\u5C0D\u3001\u771F\u5BE6\u6578\u64DA\u9A57\u8B49\u8207\u8DE8\u793E\u7FA4\u7684\u73A9\u5BB6\u4FE1\u7528\u7DB2\u7D61\uFF0C\u4E00\u9375\u5C0B\u627E\u5B8C\u7F8E\u795E\u968A\u53CB\u3002",
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
