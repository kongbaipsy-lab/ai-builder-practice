"use client";

import { useEffect, useMemo, useState } from "react";
import questionsRaw from "./questions.json";
import { shortAnswers } from "./shortAnswers";
import { exportWrongPdf } from "./exportWrongPdf";

type Kind = "single" | "multiple" | "boolean" | "short";
type Question = { number: number; type: Kind; prompt: string; options: { label: string; text: string }[]; answer: string; explanation: string; image: string };
type Saved = { done: number[]; correct: number[]; starred: number[]; answers: Record<number, string> };

const questions = questionsRaw as Question[];
const kinds: { key: Kind | "all"; label: string; count: number }[] = [
  { key: "all", label: "全部", count: questions.length },
  { key: "single", label: "单选", count: 48 },
  { key: "multiple", label: "多选", count: 26 },
  { key: "boolean", label: "判断", count: 42 },
  { key: "short", label: "简答", count: 11 },
];
const letters = ["A", "B", "C", "D"];
const labels: Record<Kind, string> = { single: "单选题", multiple: "多选题", boolean: "判断题", short: "简答题" };
const assetPath = (path: string) => typeof window !== "undefined" && window.location.hostname.endsWith("github.io") ? `/ai-builder-practice${path}` : path;

export default function QuizApp() {
  const [kind, setKind] = useState<Kind | "all">("all");
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<string[]>([]);
  const [draft, setDraft] = useState("");
  const [revealed, setRevealed] = useState(false);
  const [saved, setSaved] = useState<Saved>({ done: [], correct: [], starred: [], answers: {} });
  const [ready, setReady] = useState(false);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    try { const old = JSON.parse(localStorage.getItem("ai-builder-progress") || "null"); setSaved(old ? { ...old, answers: old.answers || {} } : { done: [], correct: [], starred: [], answers: {} }); } catch {}
    setReady(true);
  }, []);
  useEffect(() => { if (ready) localStorage.setItem("ai-builder-progress", JSON.stringify(saved)); }, [saved, ready]);

  const pool = useMemo(() => kind === "all" ? questions : questions.filter(q => q.type === kind), [kind]);
  const q = pool[index] || pool[0];
  const isShort = q?.type === "short";
  const isCorrect = !isShort && [...selected].sort().join("") === [...q.answer].sort().join("");
  const pct = Math.round((saved.done.length / questions.length) * 100);
  const wrongQuestions = questions.filter(item => item.type !== "short" && saved.done.includes(item.number) && !saved.correct.includes(item.number));

  function resetQuestion(next: number) { setIndex(next); setSelected([]); setDraft(""); setRevealed(false); window.scrollTo({ top: 0, behavior: "smooth" }); }
  function choose(label: string) {
    if (revealed || isShort) return;
    if (q.type === "multiple") setSelected(v => v.includes(label) ? v.filter(x => x !== label) : [...v, label]);
    else setSelected([label]);
  }
  function submit() {
    if ((!isShort && !selected.length) || (isShort && !draft.trim())) return;
    setRevealed(true);
    setSaved(s => ({ ...s, done: [...new Set([...s.done, q.number])], correct: isCorrect ? [...new Set([...s.correct, q.number])] : s.correct.filter(n => n !== q.number), answers: { ...s.answers, [q.number]: isShort ? draft : selected.sort().join("") } }));
  }
  function changeKind(next: Kind | "all") { setKind(next); resetQuestion(0); }
  function random() { resetQuestion(Math.floor(Math.random() * pool.length)); }
  function toggleStar() { setSaved(s => ({ ...s, starred: s.starred.includes(q.number) ? s.starred.filter(n => n !== q.number) : [...s.starred, q.number] })); }
  async function downloadWrongPdf() {
    if (!wrongQuestions.length) { alert("当前还没有错题，继续保持！"); return; }
    setExporting(true);
    try { await exportWrongPdf(wrongQuestions.map(question => ({ question: { ...question, image: assetPath(question.image) }, userAnswer: saved.answers[question.number] || "" }))); }
    catch { alert("PDF 生成失败，请稍后再试。"); }
    finally { setExporting(false); }
  }

  if (!q) return null;
  return (
    <main>
      <header className="topbar">
        <a className="brand" href="#top"><span className="brand-mark">AI</span><span>构建师题库</span></a>
        <div className="header-actions"><button className="soft-btn pdf-shortcut" onClick={downloadWrongPdf} disabled={exporting}>↓ 错题 PDF</button><button className="soft-btn random-shortcut" onClick={random}>↻ 随机一题</button><div className="avatar">练</div></div>
      </header>

      <div className="shell" id="top">
        <section className="hero">
          <div><p className="eyebrow">AI BUILDER PRACTICE</p><h1>每天刷一点，<em>上场更稳一点。</em></h1><p>127 道课程原题，分类练习、即时反馈，进度保存在当前设备。</p></div>
          <div className="progress-card"><div className="ring" style={{ "--p": `${pct * 3.6}deg` } as React.CSSProperties}><span>{pct}%</span></div><div><b>本轮进度</b><small>{saved.done.length} / {questions.length} 题已完成</small></div></div>
        </section>

        <nav className="tabs" aria-label="题目类型">
          {kinds.map(item => <button key={item.key} className={kind === item.key ? "active" : ""} onClick={() => changeKind(item.key)}><span>{item.label}</span><small>{item.count}</small></button>)}
        </nav>

        <section className="study-layout">
          <aside className="side-card">
            <div><span>今日已练</span><b>{saved.done.length}</b></div><div><span>答对题目</span><b>{saved.correct.length}</b></div><div><span>当前错题</span><b>{wrongQuestions.length}</b></div><div><span>收藏题目</span><b>{saved.starred.length}</b></div>
            <button className="export-pdf" onClick={downloadWrongPdf} disabled={exporting}>{exporting ? "正在生成…" : "↓ 导出错题 PDF"}</button>
            <button onClick={() => { if (confirm("确定清空本设备的练习记录吗？")) setSaved({ done: [], correct: [], starred: [], answers: {} }); }}>清空进度</button>
          </aside>

          <article className="question-card">
            <div className="question-head"><div><span className={`type-pill ${q.type}`}>{labels[q.type]}</span><span className="question-no">原题 #{q.number} · 本组 {index + 1}/{pool.length}</span></div><button className={`star ${saved.starred.includes(q.number) ? "on" : ""}`} onClick={toggleStar} aria-label="收藏题目">{saved.starred.includes(q.number) ? "★" : "☆"}</button></div>
            <div className="source-shot"><img src={assetPath(q.image)} alt={`原题 ${q.number} 的题干与选项`} /></div>

            {isShort ? <textarea value={draft} onChange={e => setDraft(e.target.value)} disabled={revealed} placeholder="在这里写下你的答题要点……" aria-label="简答题答案" /> : <div className="answer-grid">
              {letters.slice(0, q.type === "boolean" ? 2 : 4).map(letter => {
                const chosen = selected.includes(letter); const right = revealed && q.answer.includes(letter); const wrong = revealed && chosen && !q.answer.includes(letter);
                return <button key={letter} className={`${chosen ? "chosen" : ""} ${right ? "right" : ""} ${wrong ? "wrong" : ""}`} onClick={() => choose(letter)}><span>{letter}</span>{q.type === "boolean" ? (letter === "A" ? "正确" : "错误") : `选择 ${letter}`}</button>;
              })}
            </div>}

            {!revealed ? <button className="primary" onClick={submit} disabled={isShort ? !draft.trim() : !selected.length}>{isShort ? "完成作答并查看参考答案" : "提交答案"}</button> : <div className={`result ${isShort ? "neutral" : isCorrect ? "success" : "error"}`}>
              <div className="result-title"><span>{isShort ? "✓" : isCorrect ? "✓" : "!"}</span><b>{isShort ? "已记录本题" : isCorrect ? "回答正确" : `正确答案：${q.answer}`}</b></div>
              {isShort && <h3>参考答案</h3>}
              <p>{isShort ? shortAnswers[q.number] : (q.explanation || "原题未识别到解析，可根据正确答案复盘。")}</p>
            </div>}

            <footer className="question-footer"><button onClick={() => resetQuestion(Math.max(0, index - 1))} disabled={index === 0}>← 上一题</button><div>{pool.map((_, i) => <i key={i} className={i === index ? "now" : ""} />).slice(Math.max(0, index - 2), index + 3)}</div><button onClick={() => resetQuestion(Math.min(pool.length - 1, index + 1))} disabled={index === pool.length - 1}>下一题 →</button></footer>
          </article>
        </section>
      </div>
      <p className="page-note">题目来源：AI 构建师课程练习题库 · 学习进度仅保存在你的浏览器中</p>
    </main>
  );
}
