import * as pdfjsLib from 'pdfjs-dist';

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString();

/**
 * Reconstructs visual text lines from a PDF file by clustering pdf.js's
 * positioned text items by their y-coordinate (same row) and ordering each
 * row left-to-right by x — pdf.js only hands back an unordered bag of glyph
 * runs, not lines.
 */
export async function extractPdfLines(file) {
  const buffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
  const lines = [];

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const content = await page.getTextContent();

    const rows = new Map();
    for (const item of content.items) {
      if (!item.str.trim()) continue;
      const y = item.transform[5];
      const bucketKey = [...rows.keys()].find((k) => Math.abs(k - y) <= 2) ?? y;
      if (!rows.has(bucketKey)) rows.set(bucketKey, []);
      rows.get(bucketKey).push({ x: item.transform[4], str: item.str });
    }

    const sortedRows = [...rows.keys()].sort((a, b) => b - a);
    for (const y of sortedRows) {
      const rowItems = rows.get(y).sort((a, b) => a.x - b.x);
      const line = rowItems
        .map((r) => r.str)
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim();
      if (line) lines.push(line);
    }
  }

  return lines;
}
