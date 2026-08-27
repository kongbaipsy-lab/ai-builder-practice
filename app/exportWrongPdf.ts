type PdfQuestion = { number: number; image: string; answer: string; explanation: string };

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image(); image.onload = () => resolve(image); image.onerror = reject; image.src = src;
  });
}

function makeSummary(question: PdfQuestion, userAnswer: string) {
  const canvas = document.createElement("canvas"); canvas.width = 1240;
  const ctx = canvas.getContext("2d")!;
  const rows: { text: string; bold?: boolean; color?: string }[] = [
    { text: `原题 #${question.number}  错题复盘`, bold: true, color: "#18332f" },
    { text: `你的答案：${userAnswer || "未记录（功能更新前作答）"}`, color: "#b75f53" },
    { text: `正确答案：${question.answer}`, bold: true, color: "#1f7a61" },
    { text: `答案解析：${question.explanation || "原题未提供解析。"}`, color: "#435b55" },
  ];
  const wrapped: typeof rows = [];
  for (const row of rows) {
    ctx.font = `${row.bold ? "700" : "400"} 32px "PingFang SC", "Microsoft YaHei", sans-serif`;
    let line = "";
    for (const char of row.text) {
      if (ctx.measureText(line + char).width > 1120) { wrapped.push({ ...row, text: line }); line = char; } else line += char;
    }
    if (line) wrapped.push({ ...row, text: line });
  }
  canvas.height = 76 + wrapped.length * 52;
  ctx.fillStyle = "#f7faf7"; ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = "#dbe8df"; ctx.lineWidth = 3; ctx.strokeRect(2, 2, canvas.width - 4, canvas.height - 4);
  wrapped.forEach((row, i) => { ctx.font = `${row.bold ? "700" : "400"} 32px "PingFang SC", "Microsoft YaHei", sans-serif`; ctx.fillStyle = row.color || "#18332f"; ctx.fillText(row.text, 56, 62 + i * 52); });
  return canvas.toDataURL("image/png");
}

export async function exportWrongPdf(items: { question: PdfQuestion; userAnswer: string }[]) {
  const { jsPDF } = await import("jspdf");
  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4", compress: true });
  for (let i = 0; i < items.length; i++) {
    if (i) pdf.addPage();
    const { question, userAnswer } = items[i];
    const image = await loadImage(question.image);
    const scale = Math.min(184 / image.width, 194 / image.height);
    const imageW = image.width * scale, imageH = image.height * scale;
    pdf.addImage(image, "JPEG", (210 - imageW) / 2, 12, imageW, imageH, undefined, "FAST");
    const summary = makeSummary(question, userAnswer);
    const summaryImage = await loadImage(summary);
    const summaryH = Math.min(75, 184 * summaryImage.height / summaryImage.width);
    pdf.addImage(summary, "PNG", 13, Math.min(210, 18 + imageH), 184, summaryH, undefined, "FAST");
    pdf.setFontSize(9); pdf.setTextColor(130); pdf.text(`${i + 1} / ${items.length}`, 192, 290, { align: "right" });
  }
  pdf.save(`AI构建师错题集-${new Date().toISOString().slice(0, 10)}.pdf`);
}
