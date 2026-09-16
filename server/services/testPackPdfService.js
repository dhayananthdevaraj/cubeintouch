// server/services/testPackPdfService.js
//
// Renders a Test Packing preview into a PDF. Takes the EXACT same (optionally
// enriched) DTO the client preview screen renders from, so the PDF can never
// drift from what the user reviewed on screen — see
// client/src/services/qbMatchingService.js for the base DTO shape, and
// TestPacking.jsx's enrichQuestionsForPdf() for how COD questions get a
// `detail` object attached (inputFormat/outputFormat/codeConstraints/
// sampleIO/testcases/solutions/languages) before this renders them. No
// Examly calls happen here — this module only formats data it's handed.
import PDFDocument from "pdfkit";

function stripHtml(str) {
  return (str || "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

const COL_GAP = 22;
const INTER_QUESTION_GAP = 8;

// ── Page chrome (running header + page number on every page) ──────────────
function makeChrome(doc, meta) {
  const marginL = doc.page.margins.left;
  const marginR = doc.page.margins.right;
  const headerHeight = 34;
  let pageNum = 1;

  function draw() {
    const textWidth = doc.page.width - marginL - marginR - 60;
    doc.font("Helvetica-Bold").fontSize(9).fillColor("#111827")
      .text(meta.testName, marginL, doc.page.margins.top, { width: textWidth, lineBreak: false, ellipsis: true });
    doc.font("Helvetica").fontSize(7.5).fillColor("#6b7280")
      .text(`${meta.techStack} • ${meta.topic} • ${meta.duration} min • ${meta.questionCount} questions`,
        marginL, doc.page.margins.top + 13, { width: textWidth, lineBreak: false, ellipsis: true });
    doc.font("Helvetica").fontSize(8).fillColor("#9ca3af")
      .text(`Page ${pageNum}`, doc.page.width - marginR - 50, doc.page.margins.top, { width: 50, align: "right" });
    doc.moveTo(marginL, doc.page.margins.top + headerHeight - 6)
      .lineTo(doc.page.width - marginR, doc.page.margins.top + headerHeight - 6)
      .strokeColor("#e5e7eb").lineWidth(0.75).stroke();
    doc.fillColor("#000000");
  }

  return {
    contentTop: doc.page.margins.top + headerHeight,
    drawFirst() { draw(); },
    onNewPage() { pageNum += 1; draw(); },
  };
}

/**
 * @param {object} preview  Test preview DTO (see qbMatchingService.buildPreview) —
 *   questions may each carry an optional `.detail` object for the full COD breakdown.
 * @param {import('stream').Writable} outStream
 */
export function renderTestPackPdf(preview, outStream) {
  const {
    testName = "Untitled Test",
    techStack = "-",
    topic = "-",
    compiler = "-",
    duration = "-",
    requestedCount = 0,
    selectedCount = 0,
    stVerifiedCount = 0,
    otherCount = 0,
    qbSources = [],
    questions = [],
  } = preview || {};

  const doc = new PDFDocument({ size: "A4", margin: 48 });
  doc.pipe(outStream);

  const marginL = doc.page.margins.left;
  const marginR = doc.page.margins.right;

  const chrome = makeChrome(doc, { testName, techStack, topic, duration, questionCount: selectedCount || questions.length });
  chrome.drawFirst();

  // ── Cover block — page 1 only, right below the running header ───────────
  doc.x = marginL;
  doc.y = chrome.contentTop + 10;

  doc.fontSize(15).font("Helvetica-Bold").fillColor("#111827").text("Test Overview");
  doc.fillColor("#000000");
  doc.moveDown(0.5);

  const metaRow = (label, value) => {
    doc.font("Helvetica-Bold").fontSize(9.5).text(`${label}: `, { continued: true });
    doc.font("Helvetica").text(String(value));
  };
  metaRow("Technology Stack", techStack);
  metaRow("Topic", topic);
  metaRow("Compiler", compiler);
  metaRow("Duration", `${duration} minutes`);
  metaRow("Requested Questions", requestedCount);
  metaRow("Selected Questions", selectedCount);
  metaRow("ST Verified", stVerifiedCount);
  metaRow("Other Questions", otherCount);

  doc.moveDown(0.5);
  if (qbSources.length) {
    doc.font("Helvetica-Bold").fontSize(10.5).text("QB Sources");
    doc.font("Helvetica").fontSize(9.5);
    qbSources.forEach((s) => doc.text(`• ${s.qbName} — ${s.count} question${s.count === 1 ? "" : "s"}`));
  }

  doc.moveDown(0.6);
  doc.moveTo(marginL, doc.y).lineTo(doc.page.width - marginR, doc.y).strokeColor("#cccccc").stroke();
  doc.moveDown(0.5);

  doc.font("Helvetica-Bold").fontSize(12).fillColor("#111827").text("Questions");
  doc.fillColor("#000000");
  doc.moveDown(0.3);

  renderQuestionsTwoColumn(doc, questions, chrome);

  doc.end();
}

// ── Chunk builders — each question is broken into independent flowable
//    sections (header, problem statement, input/output format, constraints,
//    sample I/O, testcases, solution, languages) rather than one atomic
//    block. This is what lets a large COD question flow gracefully across
//    columns/pages instead of forcing the whole thing to stay together or
//    shrinking the font to make it fit. ───────────────────────────────────

function headerChunk(doc, colWidth, q, idx) {
  const label = `Q${idx + 1}`;
  const metaBits = [
    q.questionType && `Type: ${q.questionType}`,
    q.qbName && `QB: ${q.qbName}`,
    `ST Verified: ${q.stVerified ? "Yes" : "No"}`,
    q.topic && `Topic: ${q.topic}`,
  ].filter(Boolean).join("  •  ");

  doc.font("Helvetica-Bold").fontSize(10.5);
  const labelH = doc.heightOfString(label, { width: colWidth });
  doc.font("Helvetica").fontSize(7.5);
  const metaH = metaBits ? doc.heightOfString(metaBits, { width: colWidth }) : 0;
  const height = labelH + (metaBits ? 2 + metaH : 0) + 4;

  return {
    height,
    draw(x, y) {
      doc.font("Helvetica-Bold").fontSize(10.5).fillColor("#111827").text(label, x, y, { width: colWidth });
      if (metaBits) doc.font("Helvetica").fontSize(7.5).fillColor("#6b7280").text(metaBits, x, y + labelH + 2, { width: colWidth });
      doc.fillColor("#000000");
    },
  };
}

function fieldChunk(doc, colWidth, label, htmlOrText) {
  const text = stripHtml(htmlOrText);
  if (!text) return null;

  doc.font("Helvetica-Bold").fontSize(8);
  const labelH = doc.heightOfString(label, { width: colWidth });
  doc.font("Helvetica").fontSize(8.5);
  const bodyH = doc.heightOfString(text, { width: colWidth });
  const height = labelH + 2 + bodyH + 8;

  return {
    height,
    draw(x, y) {
      doc.font("Helvetica-Bold").fontSize(8).fillColor("#374151").text(label, x, y, { width: colWidth });
      doc.font("Helvetica").fontSize(8.5).fillColor("#111827").text(text, x, y + labelH + 2, { width: colWidth });
      doc.fillColor("#000000");
    },
  };
}

function ioChunk(doc, colWidth, label, input, output) {
  if (input == null && output == null) return null;
  const inputText = `In:  ${input ?? ""}`;
  const outputText = `Out: ${output ?? ""}`;

  doc.font("Helvetica-Bold").fontSize(7.5);
  const labelH = label ? doc.heightOfString(label, { width: colWidth }) : 0;
  doc.font("Courier").fontSize(7.5);
  const inH = doc.heightOfString(inputText, { width: colWidth });
  const outH = doc.heightOfString(outputText, { width: colWidth });
  const height = (label ? labelH + 2 : 0) + inH + 1 + outH + 6;

  return {
    height,
    draw(x, y) {
      let cy = y;
      if (label) {
        doc.font("Helvetica-Bold").fontSize(7.5).fillColor("#374151").text(label, x, cy, { width: colWidth });
        cy += labelH + 2;
      }
      doc.font("Courier").fontSize(7.5).fillColor("#111827").text(inputText, x, cy, { width: colWidth });
      cy += inH + 1;
      doc.text(outputText, x, cy, { width: colWidth });
      doc.fillColor("#000000");
    },
  };
}

function testcaseChunk(doc, colWidth, tc, idx) {
  const bits = [`Testcase ${idx + 1}`, tc.difficulty, tc.score != null ? `${tc.score} pts` : null].filter(Boolean).join(" • ");
  return ioChunk(doc, colWidth, bits, tc.input, tc.output);
}

function solutionChunk(doc, colWidth, sol) {
  if (!sol?.code) return null;
  const label = `Reference Solution${sol.language ? ` (${sol.language})` : ""}`;

  doc.font("Helvetica-Bold").fontSize(8);
  const labelH = doc.heightOfString(label, { width: colWidth });
  doc.font("Courier").fontSize(7.5);
  const codeH = doc.heightOfString(sol.code, { width: colWidth });
  const height = labelH + 3 + codeH + 8;

  return {
    height,
    draw(x, y) {
      doc.font("Helvetica-Bold").fontSize(8).fillColor("#374151").text(label, x, y, { width: colWidth });
      doc.font("Courier").fontSize(7.5).fillColor("#111827").text(sol.code, x, y + labelH + 3, { width: colWidth });
      doc.fillColor("#000000");
    },
  };
}

function languagesChunk(doc, colWidth, languages) {
  if (!languages?.length) return null;
  const text = `Supported Languages: ${languages.join(", ")}`;
  doc.font("Helvetica-Oblique").fontSize(7.5);
  const h = doc.heightOfString(text, { width: colWidth });
  return {
    height: h + 6,
    draw(x, y) {
      doc.font("Helvetica-Oblique").fontSize(7.5).fillColor("#6b7280").text(text, x, y, { width: colWidth });
      doc.fillColor("#000000");
    },
  };
}

/**
 * Builds the ordered chunk list for one question. Problem Statement always
 * renders (from the full HTML already fetched in bulk, even without COD
 * `detail`); the rest only render when `q.detail` has that field — never
 * fabricated. `detail` fields are named to match examlyQbClient.js's
 * fetchProgrammingQuestionDetail() output exactly.
 */
function buildQuestionChunks(doc, colWidth, q, idx) {
  const chunks = [headerChunk(doc, colWidth, q, idx)];

  const psChunk = fieldChunk(doc, colWidth, "Problem Statement", q.questionHtml || q.questionText);
  if (psChunk) chunks.push(psChunk);

  const d = q.detail;
  if (d) {
    [["Input Format", d.inputFormat], ["Output Format", d.outputFormat], ["Constraints", d.codeConstraints]]
      .forEach(([label, content]) => { const c = fieldChunk(doc, colWidth, label, content); if (c) chunks.push(c); });

    (d.sampleIO || []).forEach((s, i) => {
      const c = ioChunk(doc, colWidth, i === 0 ? "Sample I/O" : "", s.input, s.output);
      if (c) chunks.push(c);
    });
    (d.testcases || []).forEach((tc, i) => {
      const c = testcaseChunk(doc, colWidth, tc, i);
      if (c) chunks.push(c);
    });
    (d.solutions || []).forEach((sol) => {
      const c = solutionChunk(doc, colWidth, sol);
      if (c) chunks.push(c);
    });
    const langC = languagesChunk(doc, colWidth, d.languages);
    if (langC) chunks.push(langC);
  }

  return chunks.filter(Boolean);
}

/**
 * Lays out every question's chunks in two columns, filling column 1
 * top-to-bottom before column 2, then a new page (running header redrawn via
 * `chrome`). Chunks (not whole questions) are the atomic flow unit, so a
 * large COD question's sections flow gracefully across a column/page
 * boundary instead of the whole question needing to stay together — headings
 * stay with their own immediate content (each chunk includes its label),
 * just not necessarily with every other section of the same question.
 */
function renderQuestionsTwoColumn(doc, questions, chrome) {
  const marginL = doc.page.margins.left;
  const marginR = doc.page.margins.right;
  const marginB = doc.page.margins.bottom;
  const usableWidth = doc.page.width - marginL - marginR;
  const colWidth = (usableWidth - COL_GAP) / 2;
  const col1X = marginL;
  const col2X = marginL + colWidth + COL_GAP;
  const bottomLimit = doc.page.height - marginB;

  let col = 0;
  let x = col1X;
  let pageTopY = doc.y;
  let y = pageTopY;

  const startNewPage = () => {
    doc.addPage();
    chrome.onNewPage();
    pageTopY = chrome.contentTop;
    col = 0;
    x = col1X;
    y = pageTopY;
  };

  const ensureRoom = (h) => {
    if (y + h <= bottomLimit) return;
    if (col === 0) {
      col = 1;
      x = col2X;
      y = pageTopY;
      if (y + h > bottomLimit) startNewPage(); // taller than a full column — give it a fresh column
    } else {
      startNewPage();
    }
  };

  questions.forEach((q, qIdx) => {
    const chunks = buildQuestionChunks(doc, colWidth, q, qIdx);

    chunks.forEach((chunk, ci) => {
      ensureRoom(chunk.height);

      if (ci === 0 && y > pageTopY) {
        doc.moveTo(x, y).lineTo(x + colWidth, y).strokeColor("#e5e7eb").lineWidth(0.5).stroke();
        doc.strokeColor("#000000");
        y += INTER_QUESTION_GAP;
      }

      chunk.draw(x, y);
      y += chunk.height;
    });
  });
}
