import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "课程在线考试",
  description: "姓名 + 手机号登录，50 题，100 分，70 分通过",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body className="text-slate-800 antialiased">{children}</body>
    </html>
  );
}
