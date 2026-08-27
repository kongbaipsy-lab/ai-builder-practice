import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI 构建师 · 随身题库",
  description: "127 道 AI 构建师课程原题，随时随地高效刷题。",
  openGraph: {
    title: "AI 构建师 · 随身题库",
    description: "127 道课程原题，随时高效刷题",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "AI 构建师随身题库" }],
  },
  twitter: { card: "summary_large_image", images: ["/og.png"] },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
