import type { Metadata } from "next";
import QuizApp from "./QuizApp";

export const metadata: Metadata = {
  title: "AI 构建师 · 随身题库",
  description: "127 道 AI 构建师练习题，支持分类练习、即时判分、收藏与进度记录。",
};

export default function Home() {
  return <QuizApp />;
}
