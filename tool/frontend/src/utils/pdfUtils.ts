import jsPDF from 'jspdf';
import { Sender, Receiver } from '../types/db';
import { replaceVariables } from './variableUtils';

interface PDFData {
  title: string;
  requestDate: string;
  sender: Sender | undefined;
  receiver: Receiver | undefined;
  content: string;
}

// ── Constants ─────────────────────────────────────────────────────────────────
const BASE_FONT_SIZE  = 12;        // pt
const LINE_SPACING    = 1.15;      // multiplier
const LINE_H          = BASE_FONT_SIZE * LINE_SPACING * 0.352778; // pt→mm
const MARGIN          = 19;        // mm
const PAGE_W          = 210;       // A4 mm
const PAGE_H          = 297;
const CONTENT_W       = PAGE_W - MARGIN * 2;
const BOTTOM_LIMIT    = PAGE_H - 30;
const HEADER_Y        = 25;
const CONTENT_START_Y = 35;
const BULLET_INDENT   = 5.0;
const BULLET_TEXT_X   = 10;
const PARA_SPACING    = LINE_H * 0.5;

// ── Unicode sanitizer ─────────────────────────────────────────────────────────
function sanitizeForPDF(text: string): string {
  return text
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013]/g,       '-')
    .replace(/[\u2014]/g,       '--')
    .replace(/[\u2026]/g,       '...')
    .replace(/[\u00A0]/g,       ' ')
    .replace(/[^\x00-\xFF]/g,   '');
}

// ── Inline style normalization ────────────────────────────────────────────────
function normalizeInlineStyles(md: string): string {
  return md
    .replace(/<div[^>]*style="[^"]*text-align:\s*(left|center|right|justify);?[^"]*"[^>]*>([\s\S]*?)<\/div>/gi,
      (_, align, inner) => {
        const cleanInner = inner.trim();
        if (!cleanInner) return '';
        return `<div style="text-align:${align.toLowerCase()}">${cleanInner}</div>`;
      })
    .replace(/\s*id="docs-internal-guid[^"]*"/gi, '');
}

// ── Segment types ─────────────────────────────────────────────────────────────
interface Segment {
  text: string;
  bold: boolean;
  italic: boolean;
  underline: boolean;
}

interface Token {
  word: string;
  bold: boolean;
  italic: boolean;
  underline: boolean;
}

// ── Parse inline markdown/HTML segments from a single line ───────────────────
function parseInlineSegments(raw: string): Segment[] {
  const segments: Segment[] = [];

  // Step 1: sanitize unicode
  let normalised = sanitizeForPDF(raw);

  // Step 2: convert HTML bold/italic/underline tags to markdown markers
  // Handle nested combinations first (bold+italic)
  normalised = normalised
    .replace(/<strong><em>([\s\S]*?)<\/em><\/strong>/gi, '***$1***')
    .replace(/<em><strong>([\s\S]*?)<\/strong><\/em>/gi, '***$1***')
    .replace(/<strong>([\s\S]*?)<\/strong>/gi, '**$1**')
    .replace(/<b>([\s\S]*?)<\/b>/gi,           '**$1**')
    .replace(/<em>([\s\S]*?)<\/em>/gi,         '*$1*')
    .replace(/<i>([\s\S]*?)<\/i>/gi,           '*$1*');

  // Step 3: remove all HTML tags EXCEPT <u> and </u> (including those with attributes)
  // This regex removes any tag that isn't an opening <u> or closing </u>
  normalised = normalised.replace(/<(?!\/?u(?:[\s>]|$))[^>]*>/gi, '');

  // Step 4: parse inline markers
  const pattern = /\*\*\*([\s\S]*?)\*\*\*|\*\*([\s\S]*?)\*\*|\*([\s\S]*?)\*|<u>([\s\S]*?)<\/u>/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(normalised)) !== null) {
    if (match.index > lastIndex)
      segments.push({ text: normalised.slice(lastIndex, match.index), bold: false, italic: false, underline: false });
    if      (match[1] !== undefined) segments.push({ text: match[1], bold: true,  italic: true,  underline: false });
    else if (match[2] !== undefined) segments.push({ text: match[2], bold: true,  italic: false, underline: false });
    else if (match[3] !== undefined) segments.push({ text: match[3], bold: false, italic: true,  underline: false });
    else if (match[4] !== undefined) segments.push({ text: match[4], bold: false, italic: false, underline: true  });
    lastIndex = pattern.lastIndex;
  }
  if (lastIndex < normalised.length)
    segments.push({ text: normalised.slice(lastIndex), bold: false, italic: false, underline: false });

  return segments.filter(s => s.text.length > 0);
}

// ── Font setter ───────────────────────────────────────────────────────────────
function setFont(doc: jsPDF, bold: boolean, italic: boolean, size: number) {
  doc.setFontSize(size);
  if (bold && italic)  doc.setFont('times', 'bolditalic');
  else if (bold)       doc.setFont('times', 'bold');
  else if (italic)     doc.setFont('times', 'italic');
  else                 doc.setFont('times', 'normal');
}

// ── Segments → tokens ─────────────────────────────────────────────────────────
function segmentsToTokens(segments: Segment[]): Token[] {
  const tokens: Token[] = [];
  for (const seg of segments) {
    const parts = seg.text.split(/(\s+)/);
    for (const part of parts) {
      if (part === '') continue;
      tokens.push({ word: part, bold: seg.bold, italic: seg.italic, underline: seg.underline });
    }
  }
  return tokens;
}

// ── Word-wrap tokens to rows ──────────────────────────────────────────────────
function wrapTokens(doc: jsPDF, tokens: Token[], maxWidth: number, fontSize: number): Token[][] {
  const rows: Token[][] = [];
  let row: Token[] = [];
  let rowW = 0;

  for (const tok of tokens) {
    setFont(doc, tok.bold, tok.italic, fontSize);
    const w = doc.getTextWidth(tok.word);
    const isSpace = /^\s+$/.test(tok.word);

    if (!isSpace && rowW + w > maxWidth + 0.001 && row.length > 0) {
      while (row.length > 0 && /^\s+$/.test(row[row.length - 1].word)) row.pop();
      rows.push(row);
      row = [];
      rowW = 0;
      if (!isSpace) { row.push(tok); rowW = w; }
    } else {
      if (isSpace && row.length === 0) continue;
      row.push(tok);
      rowW += w;
    }
  }
  while (row.length > 0 && /^\s+$/.test(row[row.length - 1].word)) row.pop();
  if (row.length > 0) rows.push(row);

  return rows;
}

// ── Calculate row width ───────────────────────────────────────────────────────
function calcRowWidth(doc: jsPDF, row: Token[], fontSize: number): number {
  return row.reduce((w, t) => {
    setFont(doc, t.bold, t.italic, fontSize);
    return w + doc.getTextWidth(sanitizeForPDF(t.word));
  }, 0);
}

// ── Alignment X offset ───────────────────────────────────────────────────────
function getAlignX(
  align: 'left' | 'center' | 'right' | 'justify',
  rowW: number,
  margin: number,
  contentW: number,
  indentLeft = 0
): number {
  const avail = contentW - indentLeft;
  const base  = margin + indentLeft;
  if (align === 'center') return base + (avail - rowW) / 2;
  if (align === 'right')  return base + avail - rowW;
  return base;
}

// ── Render one row of tokens ──────────────────────────────────────────────────
function renderRow(doc: jsPDF, row: Token[], startX: number, y: number, fontSize: number) {
  let x = startX;
  let ulStart: number | null = null;
  let inUl = false;

  const flushUl = (endX: number) => {
    if (inUl && ulStart !== null) {
      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(0.25);
      doc.line(ulStart, y + 0.8, endX, y + 0.8);
    }
    inUl = false;
    ulStart = null;
  };

  for (const tok of row) {
    const isSpace = /^\s+$/.test(tok.word);
    setFont(doc, tok.bold, tok.italic, fontSize);
    const safe = sanitizeForPDF(tok.word);
    const w = doc.getTextWidth(safe);
    if (!isSpace) doc.text(safe, x, y);
    if (tok.underline) {
      if (!inUl) { ulStart = x; inUl = true; }
    } else {
      flushUl(x);
    }
    x += w;
  }
  flushUl(x);
}

// ── Render a full paragraph ───────────────────────────────────────────────────
function renderParagraph(
  doc: jsPDF,
  text: string,
  align: 'left' | 'center' | 'right' | 'justify',
  margin: number,
  contentW: number,
  fontSize: number,
  lineH: number,
  cursorY: number,
  bottomLimit: number,
  indentLeft = 0
): number {
  const usableW  = contentW - indentLeft;
  const segments = parseInlineSegments(text);
  const tokens   = segmentsToTokens(segments);
  const rows     = wrapTokens(doc, tokens, usableW, fontSize);

  for (let ri = 0; ri < rows.length; ri++) {
    if (cursorY + lineH > bottomLimit) {
      doc.addPage();
      cursorY = CONTENT_START_Y;
    }

    const row = rows[ri];
    const isLastRow = ri === rows.length - 1;
    const rw = calcRowWidth(doc, row, fontSize);

    if (align === 'justify' && !isLastRow && rows.length > 1) {
      renderRowJustified(doc, row, margin + indentLeft, cursorY, fontSize, usableW);
    } else {
      const x = getAlignX(align, rw, margin, contentW, indentLeft);
      renderRow(doc, row, x, cursorY, fontSize);
    }

    cursorY += lineH;
  }
  return cursorY;
}

// ── Justified row rendering ───────────────────────────────────────────────────
function renderRowJustified(
  doc: jsPDF,
  row: Token[],
  startX: number,
  y: number,
  fontSize: number,
  maxWidth: number
) {
  const wordTokens = row.filter(t => !/^\s+$/.test(t.word));
  const totalWordW = wordTokens.reduce((w, t) => {
    setFont(doc, t.bold, t.italic, fontSize);
    return w + doc.getTextWidth(sanitizeForPDF(t.word));
  }, 0);

  const gaps = wordTokens.length - 1;
  const spaceW = gaps > 0 ? (maxWidth - totalWordW) / gaps : 0;

  let x = startX;
  let ulStart: number | null = null;
  let inUl = false;

  const flushUl = (endX: number) => {
    if (inUl && ulStart !== null) {
      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(0.25);
      doc.line(ulStart, y + 0.8, endX, y + 0.8);
    }
    inUl = false;
    ulStart = null;
  };

  for (let i = 0; i < wordTokens.length; i++) {
    const tok = wordTokens[i];
    setFont(doc, tok.bold, tok.italic, fontSize);
    const safe = sanitizeForPDF(tok.word);
    const w = doc.getTextWidth(safe);
    doc.text(safe, x, y);
    if (tok.underline) {
      if (!inUl) { ulStart = x; inUl = true; }
    } else {
      flushUl(x);
    }
    x += w;
    if (i < wordTokens.length - 1) x += spaceW;
  }
  flushUl(x);
}

// ── Main PDF generator ────────────────────────────────────────────────────────
export const generateRTIPDF = async (
  data: PDFData
): Promise<{ blob: Blob; fileName: string; finalMarkdown: string }> => {
  const { title, requestDate, sender, receiver, content: rawContent } = data;

  const resolved = replaceVariables(rawContent, requestDate, sender, receiver);
  const finalMarkdown = normalizeInlineStyles(sanitizeForPDF(resolved));

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  doc.setFont('times', 'normal');
  doc.setFontSize(BASE_FONT_SIZE);
  doc.setTextColor(0, 0, 0);
  doc.setCharSpace(0);

  let cursorY = CONTENT_START_Y;
  let activeAlign: 'left' | 'center' | 'right' | 'justify' = 'justify';

  const ensureSpace = (needed: number) => {
    if (cursorY + needed > BOTTOM_LIMIT) {
      doc.addPage();
      cursorY = CONTENT_START_Y;
    }
  };

  const rawLines = finalMarkdown.split('\n');

  for (const line of rawLines) {
    let trimmed = line.trim();

    // ── Inline single-line <div style="text-align:X">content</div> ────────────
    const inlineDivMatch = trimmed.match(
      /^<div[^>]*text-align:\s*(left|center|right|justify)[^>]*>\s*([\s\S]*?)\s*<\/div>$/i
    );
    if (inlineDivMatch) {
      const divAlign   = inlineDivMatch[1].toLowerCase() as 'left' | 'center' | 'right' | 'justify';
      const divContent = inlineDivMatch[2].trim();
      if (!divContent) { cursorY += PARA_SPACING; continue; }

      // Check if content inside the div is actually a heading
      const innerHMatch = divContent.match(/^\s*(#{1,6})\s*(.*)/);
      if (innerHMatch) {
        const level  = innerHMatch[1].length;
        const raw    = innerHMatch[2];
        const hSize  = level === 1 ? 18 : level === 2 ? 16 : 14;
        const hLineH = hSize * LINE_SPACING * 0.352778;
        const above  = level === 1 ? LINE_H * 1.5 : LINE_H * 0.8;
        const below  = level === 1 ? LINE_H * 0.6 : LINE_H * 0.4;
        const segs   = parseInlineSegments(raw).map(s => ({ ...s, bold: true }));
        const tokens = segmentsToTokens(segs);
        const rows   = wrapTokens(doc, tokens, CONTENT_W, hSize);
        ensureSpace(above + rows.length * hLineH + below);
        cursorY += above;
        for (const row of rows) {
          const rw = calcRowWidth(doc, row, hSize);
          const x  = getAlignX(divAlign, rw, MARGIN, CONTENT_W);
          renderRow(doc, row, x, cursorY, hSize);
          cursorY += hLineH;
        }
        cursorY += below;
      } else {
        cursorY = renderParagraph(doc, divContent, divAlign, MARGIN, CONTENT_W, BASE_FONT_SIZE, LINE_H, cursorY, BOTTOM_LIMIT);
        cursorY += PARA_SPACING;
      }
      continue;
    }

    // ── Opening <div style="text-align:X"> ────────────────────────────────────
    const openDivMatch = trimmed.match(/^<div[^>]*text-align:\s*(left|center|right|justify);?[^>]*>$/i);
    if (openDivMatch) {
      activeAlign = openDivMatch[1].toLowerCase() as 'left' | 'center' | 'right' | 'justify';
      continue;
    }

    // ── Closing </div> ────────────────────────────────────────────────────────
    if (trimmed === '</div>') { activeAlign = 'justify'; continue; }

    // Strip stray div tags (but NOT <u> tags)
    trimmed = trimmed.replace(/<div[^>]*>/g, '').replace(/<\/div>/g, '').trim();

    // ── Empty line → paragraph gap ─────────────────────────────────────────────
    if (!trimmed) { cursorY += PARA_SPACING; continue; }

    // ── Headings ──────────────────────────────────────────────────────────────
    const hMatch = trimmed.match(/^\s*(#{1,6})\s*(.*)/);
    if (hMatch) {
      const level  = hMatch[1].length;
      const raw    = hMatch[2];
      const hSize  = level === 1 ? 18 : level === 2 ? 16 : 14;
      const hLineH = hSize * LINE_SPACING * 0.352778;
      const above  = level === 1 ? LINE_H * 1.5 : LINE_H * 0.8;
      const below  = level === 1 ? LINE_H * 0.6 : LINE_H * 0.4;

      // Parse inline segments then force bold on all, preserving underline
      const segs   = parseInlineSegments(raw).map(s => ({ ...s, bold: true }));
      const tokens = segmentsToTokens(segs);
      const rows   = wrapTokens(doc, tokens, CONTENT_W, hSize);

      ensureSpace(above + rows.length * hLineH + below);
      cursorY += above;

      for (const row of rows) {
        const rw = calcRowWidth(doc, row, hSize);
        const x  = getAlignX(activeAlign, rw, MARGIN, CONTENT_W);
        renderRow(doc, row, x, cursorY, hSize);
        cursorY += hLineH;
      }
      cursorY += below;
      continue;
    }

    // ── Unordered list item ────────────────────────────────────────────────────
    const ulMatch = trimmed.match(/^[-*•]\s+(.*)/);
    if (ulMatch) {
      const itemText = ulMatch[1];
      ensureSpace(LINE_H + 1);
      setFont(doc, false, false, BASE_FONT_SIZE);
      doc.text('\u2022', MARGIN + BULLET_INDENT, cursorY);
      cursorY = renderParagraph(doc, itemText, 'left', MARGIN, CONTENT_W, BASE_FONT_SIZE, LINE_H, cursorY, BOTTOM_LIMIT, BULLET_TEXT_X);
      cursorY += PARA_SPACING * 0.5;
      continue;
    }

    // ── Ordered list item ──────────────────────────────────────────────────────
    const olMatch = trimmed.match(/^(\d+)[.)]\s+(.*)/);
    if (olMatch) {
      const num      = olMatch[1] + '.';
      const itemText = olMatch[2];
      ensureSpace(LINE_H + 1);
      setFont(doc, false, false, BASE_FONT_SIZE);
      doc.text(num, MARGIN + BULLET_INDENT, cursorY);
      cursorY = renderParagraph(doc, itemText, 'left', MARGIN, CONTENT_W, BASE_FONT_SIZE, LINE_H, cursorY, BOTTOM_LIMIT, BULLET_TEXT_X);
      cursorY += PARA_SPACING * 0.5;
      continue;
    }

    // ── Regular paragraph ──────────────────────────────────────────────────────────
    const nextLine = rawLines[rawLines.indexOf(line) + 1]?.trim() ?? '';
    const isShortLine = trimmed.length < 45;
    const nextIsShortLine = nextLine.length > 0 && nextLine.length < 45 && !nextLine.startsWith('#') && !nextLine.startsWith('<div');
    cursorY = renderParagraph(doc, trimmed, activeAlign, MARGIN, CONTENT_W, BASE_FONT_SIZE, LINE_H, cursorY, BOTTOM_LIMIT);
    // Suppress inter-paragraph gap for consecutive short lines (address blocks)
    if (!(isShortLine && nextIsShortLine)) {
      cursorY += PARA_SPACING;
    }
  }

  // ── Headers & Footers ─────────────────────────────────────────────────────
  const pageCount = doc.getNumberOfPages();

  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);

    try {
      doc.addImage('/logo_header.png', 'PNG', MARGIN, 10, 45, 12);
    } catch {
      console.warn('Logo asset missing.');
    }

    doc.setDrawColor(220, 220, 220);
    doc.setLineWidth(0.1);
    doc.line(MARGIN, HEADER_Y, PAGE_W - MARGIN, HEADER_Y);

    const footerYLine = PAGE_H - 16;
    const footerYText = PAGE_H - 10;
    doc.setDrawColor(220, 220, 220);
    doc.setLineWidth(0.1);
    doc.line(MARGIN, footerYLine, PAGE_W - MARGIN, footerYLine);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(0, 0, 0);
    const footerText = 'GA 00000000  | Hill Street, Dehiwela, Sri Lanka  |  +94 70 xxxxxxx  |  contact@datafoundation.lk';
    const textWidth  = doc.getTextWidth(footerText);
    doc.text(footerText, (PAGE_W - textWidth) / 2, footerYText);

    doc.setFont('times', 'normal');
    doc.setFontSize(BASE_FONT_SIZE);
    doc.setTextColor(0, 0, 0);
    doc.setCharSpace(0);
  }

  const blob     = doc.output('blob');
  const fileName = `${(title || 'rti_request').replace(/\s+/g, '_')}.pdf`;
  return { blob, fileName, finalMarkdown };
};

export const downloadBlob = (blob: Blob, fileName: string): void => {
  const url  = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href     = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};