/**
 * Parses the "TRANSAÇÕES" section of a Nubank credit-card fatura PDF, once its
 * pages have already been reduced to plain text lines (see extractPdfLines in
 * importPdf.js, which reconstructs lines from pdf.js's positioned text items).
 *
 * Nubank line shapes seen in the wild:
 *   "03 JUN •••• 9733 Magalu *Magalu - Parcela 2/10 R$ 399,89"   (single line)
 *   "03 JUN Plano NuCel R$ 10,00"                                 (no card mask)
 *   "17 JUN Estorno de \"Amazonmktplc*Flystorel\""                (multi-line —
 *   "Estorno referente a compra em ..., de valor R$ 234,99,"       the amount
 *   "parcelada em 6 vezes de R$ 39,16, realizada em 08 de Junho"   lands on its
 *   "−R$ 39,19"                                                    own line)
 *   "05 JUN Pagamento em 05 JUN −R$ 3.650,67"                     (bill payment,
 *                                                                   excluded)
 */

const MESES_ABREV_MAP = {
  JAN: 1, FEV: 2, MAR: 3, ABR: 4, MAI: 5, JUN: 6,
  JUL: 7, AGO: 8, SET: 9, OUT: 10, NOV: 11, DEZ: 12,
};

const DATE_LINE_RE = /^(\d{2})\s+([A-ZÇÃÕ]{3})\b\s*(.*)$/;
const CARD_MASK_RE = /^[•●]{2,}\s*\d{3,4}\s*/;
const TRAILING_AMOUNT_RE = /^(.*?)\s+([−-]?R\$\s?[\d.]+,\d{2})$/;
const STANDALONE_AMOUNT_RE = /^([−-]?R\$\s?[\d.]+,\d{2})$/;
const PARCELA_RE = /-?\s*Parcela\s+(\d+)\s*\/\s*(\d+)\s*$/i;
const ESTORNO_RE = /^Estorno de\s+"([^"]+)"/i;

function pad2(n) {
  return String(n).padStart(2, '0');
}

function parseValorBR(raw) {
  const negativo = raw.trim().startsWith('−') || raw.trim().startsWith('-');
  const numero = raw.replace(/[−\-R$\s]/g, '').replace(/\./g, '').replace(',', '.');
  const valor = Math.abs(parseFloat(numero)) || 0;
  return { valor, negativo };
}

/** Reads 'Data de vencimento: 10 JUL 2026' to anchor which year each 'DD MMM' belongs to. */
export function extractFaturaContext(lines) {
  for (const line of lines) {
    const m = line.match(/Data de vencimento:\s*(\d{2})\s+([A-ZÇÃÕ]{3})\s+(\d{4})/i);
    if (m) {
      return { diaVenc: Number(m[1]), mesVenc: MESES_ABREV_MAP[m[2].toUpperCase()], anoVenc: Number(m[3]) };
    }
  }
  return null;
}

/** Resolves a 'DD MMM' transaction date against the fatura's vencimento year, handling Dec→Jan rollover. */
function resolveDate(dia, mesAbrev, contexto) {
  const mes = MESES_ABREV_MAP[mesAbrev];
  if (!mes || !contexto) return null;
  const ano = mes > contexto.mesVenc ? contexto.anoVenc - 1 : contexto.anoVenc;
  return `${ano}-${pad2(mes)}-${pad2(dia)}`;
}

/**
 * @returns {Array<{dataVencimento: string, descricao: string, valor: number, tipo: 'despesa'|'receita', parcelaAtual: number|null, totalParcelas: number|null}>}
 */
export function parseNubankTransacoes(lines, contexto) {
  const resultados = [];

  for (let i = 0; i < lines.length; i++) {
    const dateMatch = lines[i].match(DATE_LINE_RE);
    if (!dateMatch) continue;

    const [, diaStr, mesAbrev, restoLinha1] = dateMatch;
    if (!(mesAbrev in MESES_ABREV_MAP)) continue;

    let semMascara = restoLinha1.replace(CARD_MASK_RE, '').trim();
    let amountRaw = null;
    let consumed = i;

    const inline = semMascara.match(TRAILING_AMOUNT_RE);
    if (inline) {
      semMascara = inline[1].trim();
      amountRaw = inline[2];
    } else {
      // Amount lands on one of the next few lines, alone.
      for (let j = i + 1; j < Math.min(i + 6, lines.length); j++) {
        const standalone = lines[j].trim().match(STANDALONE_AMOUNT_RE);
        if (standalone) {
          amountRaw = standalone[1];
          consumed = j;
          break;
        }
        // A new dated entry starting before we found an amount means this
        // one has no parseable value — bail without consuming those lines.
        if (DATE_LINE_RE.test(lines[j])) break;
      }
    }

    if (!amountRaw) continue;
    i = consumed;

    const estorno = semMascara.match(ESTORNO_RE);
    let descricao = estorno ? `Estorno: ${estorno[1]}` : semMascara;
    let parcelaAtual = null;
    let totalParcelas = null;

    const parcelaMatch = descricao.match(PARCELA_RE);
    if (parcelaMatch) {
      parcelaAtual = Number(parcelaMatch[1]);
      totalParcelas = Number(parcelaMatch[2]);
      descricao = descricao.slice(0, parcelaMatch.index).trim();
    }

    descricao = descricao.replace(/\s+/g, ' ').replace(/[,\s]+$/, '').trim();
    if (!descricao) continue;
    if (/^Pagamento em\b/i.test(descricao)) continue; // card-bill payment, not a purchase

    const { valor, negativo } = parseValorBR(amountRaw);
    if (valor === 0) continue;

    const dataVencimento = resolveDate(Number(diaStr), mesAbrev, contexto);
    if (!dataVencimento) continue;

    resultados.push({
      dataVencimento,
      descricao,
      valor,
      tipo: estorno || negativo ? 'receita' : 'despesa',
      parcelaAtual,
      totalParcelas,
    });
  }

  return resultados;
}
