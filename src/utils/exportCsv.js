/** Escapes a value for a CSV cell (wraps in quotes if it contains a comma, quote or newline). */
function escapeCell(value) {
  const text = value == null ? '' : String(value);
  if (/[",\n;]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

/** Builds a CSV string (with header row) from an array of objects. */
export function buildCsv(rows, columns) {
  const header = columns.map((c) => escapeCell(c.label)).join(';');
  const body = rows
    .map((row) => columns.map((c) => escapeCell(c.value(row))).join(';'))
    .join('\n');
  return `${header}\n${body}`;
}

/** Triggers a browser download of a CSV string — no server round-trip needed. */
export function downloadCsv(filename, csvContent) {
  const blob = new Blob(['﻿' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
