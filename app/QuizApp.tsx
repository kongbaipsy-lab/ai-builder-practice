"use client";

import { useEffect, useMemo, useState } from "react";
import questionsRaw from "./questions.json";
import { shortAnswers } from "./shortAnswers";
import { exportWrongPdf } from "./exportWrongPdf";

type Kind = "single" | "multiple" | "boolean" | "short";
type Mode = "practice" | "wrong" | "starred" | "exam";
type Question = { number: number; type: Kind; prompt: string; options: { label: string; text: string }[]; answer: string; explanation: string; image: string };
type Attempt = { number: number; correct: boolean | null; at: string };
type Saved = { done: number[]; correct: number[]; starred: number[]; answers: Record<number, string>; attempts: Attempt[]; lastNumber?: number };

const questions = questionsRaw as Question[];
const emptySaved: Saved = { done: [], correct: [], starred: [], answers: {}, attempts: [] };
const kinds: { key: Kind | "all"; label: string; count: number }[] = [
  { key: "all", label: "全部", count: questions.length }, { key: "single", label: "单选", count: 48 },
  { key: "multiple", label: "多选", count: 26 }, { key: "boolean", label: "判断", count: 42 }, { key: "short", label: "简答", count: 11 },
];
const labels: Record<Kind, string> = { single: "单选题", multiple: "多选题", boolean: "判断题", short: "简答题" };
const assetPath = (path: string) => typeof window !== "undefined" && window.location.hostname.endsWith("github.io") ? `/ai-builder-practice${path}` : path;
const clean = (text: string) => text.replace(/隐藏答案|未作答|查看答案|收起答案/g, "").trim();
const todayKey = () => new Date().toLocaleDateString("sv-SE");
const shuffled = <T,>(items: T[]) => [...items].sort(() => Math.random() - .5);

export default function QuizApp() {
  const [kind, setKind] = useState<Kind | "all">("all");
  const [mode, setMode] = useState<Mode>("practice");
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<string[]>([]);
  const [draft, setDraft] = useState("");
  const [revealed, setRevealed] = useState(false);
  const [saved, setSaved] = useState<Saved>(emptySaved);
  const [ready, setReady] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [zoomed, setZoomed] = useState(false);
  const [showNavigator, setShowNavigator] = useState(false);
  const [examQuestions, setExamQuestions] = useState<Question[]>([]);
  const [examAnswers, setExamAnswers] = useState<Record<number, string>>({});
  const [examSubmitted, setExamSubmitted] = useState(false);

  useEffect(() => {
    try {
      const old = JSON.parse(localStorage.getItem("ai-builder-progress") || "null");
      const next = old ? { ...emptySaved, ...old, answers: old.answers || {}, attempts: old.attempts || [] } : emptySaved;
      setSaved(next);
      const resume = questions.findIndex(q => q.number === next.lastNumber);
      if (resume >= 0) setIndex(resume);
    } catch {}
    setReady(true);
  }, []);
  useEffect(() => { if (ready) localStorage.setItem("ai-builder-progress", JSON.stringify(saved)); }, [saved, ready]);
  useEffect(() => { document.body.style.overflow = zoomed ? "hidden" : ""; return () => { document.body.style.overflow = ""; }; }, [zoomed]);
  useEffect(() => {
    if (!zoomed) return;
    const close = (event: KeyboardEvent) => { if (event.key === "Escape") setZoomed(false); };
    window.addEventListener("keydown", close); return () => window.removeEventListener("keydown", close);
  }, [zoomed]);

  const wrongQuestions = useMemo(() => questions.filter(q => q.type !== "short" && saved.done.includes(q.number) && !saved.correct.includes(q.number)), [saved]);
  const pool = useMemo(() => {
    if (mode === "exam") return examQuestions;
    if (mode === "wrong") return wrongQuestions;
    if (mode === "starred") return questions.filter(q => saved.starred.includes(q.number));
    return kind === "all" ? questions : questions.filter(q => q.type === kind);
  }, [mode, examQuestions, wrongQuestions, saved.starred, kind]);
  const q = pool[index] || pool[0] || questions[0];
  const isShort = q.type === "short";
  const activeAnswer = mode === "exam" ? (examAnswers[q.number] || "") : (isShort ? draft : selected.join(""));
  const isCorrect = !isShort && [...activeAnswer].sort().join("") === [...q.answer].sort().join("");
  const pct = Math.round((saved.done.length / questions.length) * 100);
  const todayAttempts = saved.attempts.filter(a => a.at.startsWith(todayKey()));
  const todayCorrect = todayAttempts.filter(a => a.correct === true).length;
  const objectiveToday = todayAttempts.filter(a => a.correct !== null).length;
  const examScore = examQuestions.filter(item => item.type !== "short" && [...(examAnswers[item.number] || "")].sort().join("") === [...item.answer].sort().join("")).length;
  const examObjective = examQuestions.filter(item => item.type !== "short").length;

  function resetQuestion(next: number) { setIndex(next); setSelected([]); setDraft(""); setRevealed(false); setZoomed(false); window.scrollTo({ top: 0, behavior: "smooth" }); }
  function switchMode(next: Mode) {
    if (next === "wrong" && !wrongQuestions.length) { alert("当前还没有错题，先去完成几道练习吧。"); return; }
    if (next === "starred" && !saved.starred.length) { alert("当前还没有收藏题目。"); return; }
    setMode(next); setExamSubmitted(false); resetQuestion(0);
  }
  function choose(label: string) {
    if ((revealed && mode !== "exam") || isShort || examSubmitted) return;
    if (mode === "exam") {
      const old = examAnswers[q.number] || "";
      const next = q.type === "multiple" ? (old.includes(label) ? old.replace(label, "") : old + label) : label;
      setExamAnswers(v => ({ ...v, [q.number]: [...next].sort().join("") }));
    } else if (q.type === "multiple") setSelected(v => v.includes(label) ? v.filter(x => x !== label) : [...v, label]);
    else setSelected([label]);
  }
  function submit() {
    if ((!isShort && !selected.length) || (isShort && !draft.trim())) return;
    setRevealed(true);
    const attempt: Attempt = { number: q.number, correct: isShort ? null : isCorrect, at: `${todayKey()}T${new Date().toTimeString().slice(0, 8)}` };
    setSaved(s => ({ ...s, done: [...new Set([...s.done, q.number])], correct: isCorrect ? [...new Set([...s.correct, q.number])] : isShort ? s.correct : s.correct.filter(n => n !== q.number), answers: { ...s.answers, [q.number]: isShort ? draft : [...selected].sort().join("") }, attempts: [...s.attempts, attempt], lastNumber: q.number }));
  }
  function startExam(count: number) {
    setExamQuestions(shuffled(questions).slice(0, Math.min(count, questions.length)));
    setExamAnswers({}); setExamSubmitted(false); setMode("exam"); resetQuestion(0);
  }
  function submitExam() {
    if (!confirm("确定交卷吗？交卷后将显示成绩和每题答案。")) return;
    setExamSubmitted(true);
    const at = `${todayKey()}T${new Date().toTimeString().slice(0, 8)}`;
    setSaved(s => {
      const attempts: Attempt[] = examQuestions.map(item => ({ number: item.number, correct: item.type === "short" ? null : [...(examAnswers[item.number] || "")].sort().join("") === [...item.answer].sort().join(""), at }));
      const done = [...new Set([...s.done, ...examQuestions.filter(item => examAnswers[item.number]).map(item => item.number)])];
      const correct = new Set(s.correct);
      attempts.forEach(a => { if (a.correct) correct.add(a.number); else if (a.correct === false) correct.delete(a.number); });
      return { ...s, done, correct: [...correct], answers: { ...s.answers, ...examAnswers }, attempts: [...s.attempts, ...attempts], lastNumber: q.number };
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  function toggleStar() { setSaved(s => ({ ...s, starred: s.starred.includes(q.number) ? s.starred.filter(n => n !== q.number) : [...s.starred, q.number] })); }
  async function downloadWrongPdf() {
    if (!wrongQuestions.length) { alert("当前还没有错题，继续保持！"); return; }
    setExporting(true);
    try { await exportWrongPdf(wrongQuestions.map(question => ({ question: { ...question, image: assetPath(question.image) }, userAnswer: saved.answers[question.number] || "" }))); }
    catch { alert("PDF 生成失败，请稍后再试。"); } finally { setExporting(false); }
  }

  return <main>
    <header className="topbar"><a className="brand" href="#top"><span className="brand-mark">AI</span><span>构建师题库</span></a><div className="header-actions"><button className="soft-btn pdf-shortcut" onClick={downloadWrongPdf} disabled={exporting}>↓ 错题 PDF</button><button className="soft-btn random-shortcut" onClick={() => resetQuestion(Math.floor(Math.random() * pool.length))}>↻ 随机一题</button><div className="avatar">练</div></div></header>
    <div className="shell" id="top">
      <section className="hero"><div><p className="eyebrow">AI BUILDER PRACTICE</p><h1>抓紧考前，<em>把薄弱点补齐。</em></h1><p>文字大屏阅读、错题重练、模拟考试，进度自动保存在当前设备。</p></div><div className="progress-card"><div className="ring" style={{ "--p": `${pct * 3.6}deg` } as React.CSSProperties}><span>{pct}%</span></div><div><b>本轮进度</b><small>{saved.done.length} / {questions.length} 题已完成</small></div></div></section>

      <section className="quick-actions" aria-label="练习模式">
        <button className={mode === "practice" ? "active" : ""} onClick={() => switchMode("practice")}><b>顺序练习</b><small>按题型逐题刷</small></button>
        <button className={mode === "wrong" ? "active" : ""} onClick={() => switchMode("wrong")}><b>错题重练</b><small>{wrongQuestions.length} 道待攻克</small></button>
        <button className={mode === "starred" ? "active" : ""} onClick={() => switchMode("starred")}><b>收藏题目</b><small>{saved.starred.length} 道重点题</small></button>
        <div className="exam-start"><b>模拟考试</b><span>{[20, 50, 127].map(n => <button key={n} onClick={() => startExam(n)}>{n}题</button>)}</span></div>
      </section>

      {mode === "practice" && <nav className="tabs" aria-label="题目类型">{kinds.map(item => <button key={item.key} aria-current={kind === item.key ? "page" : undefined} className={kind === item.key ? "active" : ""} onClick={() => { setKind(item.key); resetQuestion(0); }}><span>{item.label}</span><small>{item.count}</small></button>)}</nav>}

      <section className="study-layout">
        <aside className="side-card"><div><span>今日作答</span><b>{todayAttempts.length}</b></div><div><span>今日正确率</span><b>{objectiveToday ? Math.round(todayCorrect / objectiveToday * 100) : 0}%</b></div><div><span>当前错题</span><b>{wrongQuestions.length}</b></div><div><span>收藏题目</span><b>{saved.starred.length}</b></div><button className="export-pdf" onClick={downloadWrongPdf} disabled={exporting}>{exporting ? "正在生成…" : "↓ 导出错题 PDF"}</button><button onClick={() => { if (confirm("确定清空本设备的练习记录吗？")) setSaved(emptySaved); }}>清空进度</button></aside>

        <article className="question-card">
          {mode === "exam" && <div className="exam-banner"><b>模拟考试 · {examQuestions.length}题</b><span>{Object.keys(examAnswers).length} 题已作答</span>{examSubmitted && <strong>客观题得分：{examScore}/{examObjective}</strong>}</div>}
          <div className="question-head"><div><span className={`type-pill ${q.type}`}>{labels[q.type]}</span><span className="question-no">原题 #{q.number} · {index + 1}/{pool.length}</span></div><button className={`star ${saved.starred.includes(q.number) ? "on" : ""}`} onClick={toggleStar} aria-label="收藏题目">{saved.starred.includes(q.number) ? "★" : "☆"}</button></div>
          <section className="question-text"><h2>{clean(q.prompt)}</h2>{q.type === "multiple" && <p>多选题，请选择所有正确答案</p>}</section>
          {isShort ? <textarea value={mode === "exam" ? (examAnswers[q.number] || "") : draft} onChange={e => mode === "exam" ? setExamAnswers(v => ({ ...v, [q.number]: e.target.value })) : setDraft(e.target.value)} disabled={revealed || examSubmitted} placeholder="在这里写下你的答题要点……" aria-label="简答题答案" /> : <div className="answer-list">{q.options.map(option => {
            const chosen = activeAnswer.includes(option.label); const show = mode === "exam" ? examSubmitted : revealed; const right = show && q.answer.includes(option.label); const wrong = show && chosen && !q.answer.includes(option.label);
            return <button key={option.label} className={`${chosen ? "chosen" : ""} ${right ? "right" : ""} ${wrong ? "wrong" : ""}`} onClick={() => choose(option.label)}><span>{option.label}</span><b>{q.type === "boolean" ? (option.label === "A" ? "正确" : "错误") : clean(option.text)}</b></button>;
          })}</div>}
          <details className="original"><summary>查看课程原题图片</summary><button className="source-shot" onClick={() => setZoomed(true)} aria-label="全屏放大题目"><img src={assetPath(q.image)} alt={`原题 ${q.number} 的题干与选项`} /></button></details>

          {mode === "exam" ? (examSubmitted ? <div className={`result ${isShort ? "neutral" : isCorrect ? "success" : "error"}`} aria-live="polite"><div className="result-title"><span>{isShort || isCorrect ? "✓" : "!"}</span><b>{isShort ? "简答题请对照参考答案自评" : isCorrect ? "回答正确" : `正确答案：${q.answer}`}</b></div>{isShort && <h3>参考答案</h3>}<p>{isShort ? shortAnswers[q.number] : (q.explanation || "请结合正确答案复盘本题知识点。")}</p></div> : index === pool.length - 1 && <button className="primary" onClick={submitExam}>提交整份试卷</button>) : !revealed ? <button className="primary" onClick={submit} disabled={isShort ? !draft.trim() : !selected.length}>{isShort ? "完成作答并查看参考答案" : "提交答案"}</button> : <div className={`result ${isShort ? "neutral" : isCorrect ? "success" : "error"}`} aria-live="polite"><div className="result-title"><span>{isShort || isCorrect ? "✓" : "!"}</span><b>{isShort ? "已记录本题" : isCorrect ? "回答正确" : `正确答案：${q.answer}`}</b></div>{isShort && <h3>参考答案</h3>}<p>{isShort ? shortAnswers[q.number] : (q.explanation || "请结合正确答案复盘本题知识点。")}</p></div>}

          <footer className="question-footer"><button onClick={() => resetQuestion(Math.max(0, index - 1))} disabled={index === 0}>← 上一题</button><button className="navigator-toggle" onClick={() => setShowNavigator(v => !v)}>题号 {index + 1}/{pool.length}</button><button onClick={() => resetQuestion(Math.min(pool.length - 1, index + 1))} disabled={index === pool.length - 1}>下一题 →</button></footer>
          {showNavigator && <div className="navigator" aria-label="题号导航">{pool.map((item, i) => { const answered = mode === "exam" ? Boolean(examAnswers[item.number]) : saved.done.includes(item.number); const wrong = saved.done.includes(item.number) && !saved.correct.includes(item.number) && item.type !== "short"; return <button key={item.number} className={`${i === index ? "current" : ""} ${answered ? "answered" : ""} ${wrong ? "missed" : ""}`} onClick={() => resetQuestion(i)} aria-label={`第 ${i + 1} 题`}>{i + 1}</button>; })}</div>}
        </article>
      </section>
    </div>
    {zoomed && <div className="zoom-modal" role="dialog" aria-modal="true" aria-label="题目大图" onClick={() => setZoomed(false)}><button className="zoom-close" onClick={() => setZoomed(false)} aria-label="关闭大图">×</button><div className="zoom-scroll" onClick={e => e.stopPropagation()}><img src={assetPath(q.image)} alt={`原题 ${q.number} 大图`} /></div></div>}
    <p className="page-note">题目来源：AI 构建师课程练习题库 · 学习进度仅保存在你的浏览器中</p>
  </main>;
}
