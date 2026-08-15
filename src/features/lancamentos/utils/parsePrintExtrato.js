import { parseDate, parseMoney } from './parseExtrato.js';

const MONEY_PATTERN = /(?:R\$\s*)?[-+]?\s*\d{1,3}(?:\.\d{3})*,\d{2}|(?:R\$\s*)?[-+]?\s*\d+\.\d{2}/g;
const DATE_PATTERN = /\b(\d{1,2}[/.]\d{1,2}(?:[/.]\d{2,4})?)\b/;
const SUMMARY_PATTERN = /\b(saldo|total|limite|dispon[ií]vel|fatura|fechamento|vencimento)\b/i;

function normalizeDate(value, referenceDate) {
  if (!value) return null;
  const parts = value.replace(/\./g, '/').split('/');
  if (parts.length === 2) parts.push(referenceDate.slice(0, 4));
  if (parts[2]?.length === 2) parts[2] = `20${parts[2]}`;
  return parseDate(parts.join('/'));
}

function descriptionFromLine(line) {
  return line
    .replace(MONEY_PATTERN, ' ')
    .replace(DATE_PATTERN, ' ')
    .replace(/\s+/g, ' ')
    .replace(/^[-|:•\s]+|[-|:•\s]+$/g, '')
    .trim();
}

export function parsePrintExtrato(text, tipo, referenceDate = new Date().toISOString().slice(0, 10)) {
  const lines = String(text).split(/\r?\n/).map((line) => line.replace(/\s+/g, ' ').trim()).filter(Boolean);
  const items = [];

  lines.forEach((line, index) => {
    if (SUMMARY_PATTERN.test(line)) return;
    const amounts = [...line.matchAll(MONEY_PATTERN)];
    if (!amounts.length) return;

    const amountText = amounts.at(-1)[0].replace(/\s/g, '');
    const valor = Math.abs(parseMoney(amountText));
    if (!Number.isFinite(valor) || valor === 0) return;

    let dateMatch = line.match(DATE_PATTERN);
    let dateLineIndex = index;
    for (let offset = 1; !dateMatch && offset <= 3 && index - offset >= 0; offset += 1) {
      dateMatch = lines[index - offset].match(DATE_PATTERN);
      if (dateMatch) dateLineIndex = index - offset;
    }

    let descricao = descriptionFromLine(line);
    if (!descricao || descricao.length < 2) {
      for (let cursor = index - 1; cursor >= Math.max(0, dateLineIndex - 2); cursor -= 1) {
        const candidate = descriptionFromLine(lines[cursor]);
        if (candidate && !SUMMARY_PATTERN.test(candidate)) {
          descricao = candidate;
          break;
        }
      }
    }

    items.push({
      tipo,
      descricao: descricao || 'Lançamento importado',
      valor,
      dataVencimento: normalizeDate(dateMatch?.[1], referenceDate) || referenceDate,
    });
  });

  return items;
}
