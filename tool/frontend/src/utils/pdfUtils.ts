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

interface Segment {
  text: string;
  bold: boolean;
  italic: boolean;
  underline: boolean;
}

function parseInlineSegments(raw: string): Segment[] {
  const segments: Segment[] = [];
  let normalised = raw
    .replace(/<strong>([\s\S]*?)<\/strong>/gi, '**$1**')
    .replace(/<b>([\s\S]*?)<\/b>/gi, '**$1**')
    .replace(/<em>([\s\S]*?)<\/em>/gi, '*$1*')
    .replace(/<i>([\s\S]*?)<\/i>/gi, '*$1*');

  const pattern = /\*\*\*([\s\S]*?)\*\*\*|\*\*([\s\S]*?)\*\*|\*([\s\S]*?)\*|<u>([\s\S]*?)<\/u>/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(normalised)) !== null) {
    if (match.index > lastIndex)
      segments.push({ text: normalised.slice(lastIndex, match.index), bold: false, italic: false, underline: false });
    if      (match[1] !== undefined) segments.push({ text: match[1], bold: true,  italic: true,  underline: false });
    else if (match[2] !== undefined) segments.push({ text: match[2], bold: true,  italic: false, underline: false });
    else if (match[3] !== undefined) segments.push({ text: match[3], bold: false, italic: false, underline: false });
    else if (match[4] !== undefined) segments.push({ text: match[4], bold: false, italic: false, underline: true  });
    lastIndex = pattern.lastIndex;
  }
  if (lastIndex < normalised.length)
    segments.push({ text: normalised.slice(lastIndex), bold: false, italic: false, underline: false });

  return segments.filter(s => s.text.length > 0);
}


function setFont(doc: jsPDF, bold: boolean, italic: boolean, size: number) {
  doc.setFontSize(size);
  if (bold && italic)  doc.setFont('times', 'bolditalic');
  else if (bold)       doc.setFont('times', 'bold');
  else if (italic)     doc.setFont('times', 'italic');
  else                 doc.setFont('times', 'normal');
}

interface Tok { word: string; bold: boolean; italic: boolean; underline: boolean; }

function segmentsToTokens(segments: Segment[]): Tok[] {
  const tokens: Tok[] = [];
  for (const seg of segments) {
    for (const part of seg.text.split(/(\s+)/)) {
      if (part === '') continue;
      tokens.push({ word: part, bold: seg.bold, italic: seg.italic, underline: seg.underline });
    }
  }
  return tokens;
}

function wrapTokens(doc: jsPDF, tokens: Tok[], maxWidth: number, fontSize: number): Tok[][] {
  const rows: Tok[][] = [];
  let row: Tok[] = [];
  let rowW = 0;
  for (const tok of tokens) {
    setFont(doc, tok.bold, tok.italic, fontSize);
    const w = doc.getTextWidth(tok.word);
    const isSpace = /^\s+$/.test(tok.word);
    if (!isSpace && rowW + w > maxWidth && row.length > 0) {
      rows.push(row); row = [tok]; rowW = w;
    } else {
      row.push(tok); rowW += w;
    }
  }
  if (row.length > 0) rows.push(row);
  return rows;
}

function renderRow(doc: jsPDF, row: Tok[], startX: number, y: number, fontSize: number) {
  let x = startX;
  let ulStart: number | null = null;
  let inUl = false;

  const flushUl = (endX: number) => {
    if (inUl && ulStart !== null) {
      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(0.25);
      doc.line(ulStart, y + 0.8, endX, y + 0.8);
    }
    inUl = false; ulStart = null;
  };

  for (const tok of row) {
    const isSpace = /^\s+$/.test(tok.word);
    setFont(doc, tok.bold, tok.italic, fontSize);
    const w = doc.getTextWidth(tok.word);
    if (!isSpace) doc.text(tok.word, x, y);
    if (tok.underline) { if (!inUl) { ulStart = x; inUl = true; } }
    else flushUl(x);
    x += w;
  }
  flushUl(x);
}

function calcRowWidth(doc: jsPDF, row: Tok[], fontSize: number): number {
  let w = 0;
  row.forEach(t => { setFont(doc, t.bold, t.italic, fontSize); w += doc.getTextWidth(t.word); });
  return w;
}

function getAlignX(align: 'left' | 'center' | 'right', rowW: number, margin: number, contentW: number): number {
  if (align === 'center') return margin + (contentW - rowW) / 2;
  if (align === 'right')  return margin + contentW - rowW;
  return margin;
}

function renderParagraph(
  doc: jsPDF,
  text: string,
  align: 'left' | 'center' | 'right',
  margin: number,
  contentW: number,
  fontSize: number,
  lineH: number,
  cursorY: number,
  bottomLimit: number,
  indentLeft = 0 
): number {
  const usableW = contentW - indentLeft;
  const segments = parseInlineSegments(text);
  const tokens   = segmentsToTokens(segments);
  const rows     = wrapTokens(doc, tokens, usableW, fontSize);

  for (const row of rows) {
    if (cursorY + lineH > bottomLimit) {
      doc.addPage();
      cursorY = 35;
    }
    // Strip leading spaces
    let started = false;
    const trimmedRow = row.filter(t => {
      if (!started && /^\s+$/.test(t.word)) return false;
      started = true; return true;
    });

    const rw = calcRowWidth(doc, trimmedRow, fontSize);
    const x  = align === 'left'
      ? margin + indentLeft
      : getAlignX(align, rw, margin + indentLeft, usableW);

    renderRow(doc, trimmedRow, x, cursorY, fontSize);
    cursorY += lineH;
  }
  return cursorY;
}

export const generateRTIPDF = async (
  data: PDFData
): Promise<{ blob: Blob; fileName: string; finalMarkdown: string }> => {
  const { title, requestDate, sender, receiver, content: rawContent } = data;
  const finalMarkdown = replaceVariables(rawContent, requestDate, sender, receiver);

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  const margin      = 19;
  const pageWidth   = 210;
  const pageHeight  = 297;
  const contentW    = pageWidth - margin * 2;
  const bottomLimit = pageHeight - 30;
  const LINE_H      = 7;
  const BASE_SIZE   = 12;
  const BULLET_INDENT  = 5.0;
  const BULLET_TEXT_X  = 10;

  let cursorY = 42;

  const ensureSpace = (needed: number) => {
    if (cursorY + needed > bottomLimit) { doc.addPage(); cursorY = 42; }
  };


  const rawLines = finalMarkdown.split('\n');
  let activeAlign: 'left' | 'center' | 'right' = 'left';

  for (const line of rawLines) {
    let trimmed = line.trim();

    const inlineDivMatch = trimmed.match(
      /^<div[^>]*text-align:\s*(left|center|right)[^>]*>([\s\S]*?)<\/div>$/i
    );
    if (inlineDivMatch) {
      const divAlign  = inlineDivMatch[1].toLowerCase() as 'left' | 'center' | 'right';
      const divContent = inlineDivMatch[2].trim();
      if (divContent === '') { cursorY += 4; continue; }  // empty alignment div → gap
      cursorY = renderParagraph(doc, divContent, divAlign, margin, contentW, BASE_SIZE, LINE_H, cursorY, bottomLimit);
      cursorY += 1;
      continue;
    }

    // Case 2: opening div only  <div style="text-align: X">  (multiline block)
    const openDivMatch = trimmed.match(/^<div[^>]*text-align:\s*(left|center|right)[^>]*>$/i);
    if (openDivMatch) {
      activeAlign = openDivMatch[1].toLowerCase() as 'left' | 'center' | 'right';
      continue;
    }

    // Case 3: closing div — reset alignment
    if (trimmed === '</div>') { activeAlign = 'left'; continue; }

    //  Strip any remaining stray div tags 
    trimmed = trimmed.replace(/<div[^>]*>/g, '').replace(/<\/div>/g, '').trim();

    // Empty line
    if (trimmed === '') { cursorY += 4; continue; }

    // Heading 
    const hMatch = trimmed.match(/^(#{1,6})\s+(.*)/);
    if (hMatch) {
      const level      = hMatch[1].length;
      const raw        = hMatch[2];
      const hSize      = level === 1 ? 16 : level === 2 ? 14 : level === 3 ? 13 : 12;
      const spaceAbove = level === 1 ? 8  : level === 2 ? 5  : 3;
      const spaceBelow = level === 1 ? 4  : 2;
      const hLineH     = hSize * 0.45;

      const segs   = parseInlineSegments(raw).map(s => ({ ...s, bold: true }));
      const tokens = segmentsToTokens(segs);
      const rows   = wrapTokens(doc, tokens, contentW, hSize);

      ensureSpace(spaceAbove + rows.length * hLineH + spaceBelow);
      cursorY += spaceAbove;

      for (const row of rows) {
        const rw = calcRowWidth(doc, row, hSize);
        const x  = getAlignX(activeAlign, rw, margin, contentW);
        renderRow(doc, row, x, cursorY, hSize);
        cursorY += hLineH;
      }
      cursorY += spaceBelow;
      continue;
    }

    // ── Unordered list ───────────────────────────────────────────────────────
    const ulMatch = trimmed.match(/^[-*•]\s+(.*)/);
    if (ulMatch) {
      const itemText = ulMatch[1];
      ensureSpace(LINE_H + 1);
      setFont(doc, false, false, BASE_SIZE);
      doc.text('\u2022', margin + BULLET_INDENT, cursorY);
      cursorY = renderParagraph(doc, itemText, 'left', margin, contentW, BASE_SIZE, LINE_H, cursorY, bottomLimit, BULLET_TEXT_X);
      cursorY += 1;
      continue;
    }

    // ── Ordered list ─────────────────────────────────────────────────────────
    const olMatch = trimmed.match(/^(\d+)[.)]\s+(.*)/);
    if (olMatch) {
      const num      = olMatch[1] + '.';
      const itemText = olMatch[2];
      ensureSpace(LINE_H + 1);
      setFont(doc, false, false, BASE_SIZE);
      doc.text(num, margin + BULLET_INDENT, cursorY);
      cursorY = renderParagraph(doc, itemText, 'left', margin, contentW, BASE_SIZE, LINE_H, cursorY, bottomLimit, BULLET_TEXT_X);
      cursorY += 1;
      continue;
    }

    // ── Regular paragraph ───────────────────────────────────────────────────
    cursorY = renderParagraph(doc, trimmed, activeAlign, margin, contentW, BASE_SIZE, LINE_H, cursorY, bottomLimit);
    cursorY += 1;
  } // This closing brace successfully finishes your loop before headers/footers print

  // ── Multi-Page Running Layout Pass (Headers & Footers) ──────────────────────
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    
    // 1. Stamp Running Header Components
    try { 
       doc.addImage('/logo_header.png', 'PNG', margin, 10, 45, 12); 
    } catch { 
       console.warn('Logo asset link missing.'); 
    }

    // Top Separator line (Corrected to Y=25)
    doc.setDrawColor(220, 220, 220);
    doc.setLineWidth(0.1);
    doc.line(margin, 25, pageWidth - margin, 25);

    // 2. Stamp Running Footer Components
    const footerYLine = pageHeight - 16; 
    const footerYText = pageHeight - 10; 
    
    // Draw Footer Separator line
    doc.setDrawColor(220, 220, 220);
    doc.setLineWidth(0.1);
    doc.line(margin, footerYLine, pageWidth - margin, footerYLine);

    // Render Company Metadata Address Details 
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(0, 0, 0); 
    
    const footerText = "GA 00000000  | Hill Street, Dehiwela, Sri Lanka  |  +94 70 xxxxxxx  |  contact@datafoundation.lk";
    
    // Auto-center the footer text completely
    const textWidth = doc.getTextWidth(footerText);
    const footerX = (pageWidth - textWidth) / 2;
    
    doc.text(footerText, footerX, footerYText);
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