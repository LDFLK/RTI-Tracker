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

export const generateRTIPDF = async (data: PDFData): Promise<{ blob: Blob; fileName: string; finalMarkdown: string }> => {
  const { title, requestDate, sender, receiver, content: rawContent } = data;

  const finalMarkdown = replaceVariables(rawContent, requestDate, sender, receiver);

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const margin = 25;
  const contentWidth = 160;
  let cursorY = 25;


  // Helper to render text with markdown support (bold, italic)
  const renderRichText = (text: string, x: number, y: number, maxWidth: number): number => {
    const tokens: { text: string; style: string }[] = [];

    // Split by all possible markdown markers, preserving them
    const segments = text.split(/(\*\*\*|___|\*\*|__|\*|_)/);

    let isBold = false;
    let isItalic = false;

    segments.forEach(seg => {
      if (seg === '***' || seg === '___') {
        isBold = !isBold;
        isItalic = !isItalic;
      } else if (seg === '**' || seg === '__') {
        isBold = !isBold;
      } else if (seg === '*' || seg === '_') {
        isItalic = !isItalic;
      } else if (seg) {
        let style = 'normal';
        if (isBold && isItalic) style = 'bolditalic';
        else if (isBold) style = 'bold';
        else if (isItalic) style = 'italic';

        tokens.push({ text: seg, style });
      }
    });

    let currentX = x;
    let currentY = y;
    const lineHeight = 5;

    tokens.forEach(token => {
      doc.setFont('helvetica', token.style);

      const words = token.text.split(/(\s+)/);
      words.forEach(word => {
        if (word === '') return;
        const safeWord = word.replace(/[\u00A0\u1680\u180e\u2000-\u200b\u202f\u205f\u3000\ufeff]/g, ' ');
        const wordWidth = doc.getTextWidth(safeWord);

        if (currentX + wordWidth > x + maxWidth && safeWord.trim().length > 0) {
          currentX = x;
          currentY += lineHeight;
          if (currentY > 270) {
            doc.addPage();
            currentY = 25;
            doc.setFont('helvetica', token.style);
          }
        }

        doc.text(safeWord, currentX, currentY);
        currentX += wordWidth;
      });
    });

    return currentY;
  };

  const lines = finalMarkdown.split('\n');
  lines.forEach(line => {
    const trimmedLine = line.trim();
    if (trimmedLine === '') {
      cursorY += 6;
      return;
    }

    if (cursorY > 270) {
      doc.addPage();
      cursorY = 25;
    }

    if (line.startsWith('#')) {
      doc.setFont('helvetica', 'bold');
      const level = (line.match(/^#+/) || ['#'])[0].length;
      doc.setFontSize(level === 1 ? 14 : 12);
      const cleanHeader = line.replace(/^#+\s*/, '');
      doc.text(cleanHeader, margin, cursorY);
      cursorY += 10;
      doc.setFontSize(11);
    } else {
      doc.setFontSize(11);
      cursorY = renderRichText(line.trim(), margin, cursorY, contentWidth);
      cursorY += 6; // Paragraph spacing
    }
  });

  const blob = doc.output('blob');
  const fileName = `${(title || 'rti_request').replace(/\s+/g, '_')}.pdf`;

  return { blob, fileName, finalMarkdown };
};
