import { MESES } from '../../../utils/monthKey.js';

function normalize(text) {
  return (text ?? '')
    .toString()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();
}

const MESES_NORMALIZADOS = MESES.map(normalize);
const OPERATOR_PATTERN = /^(acima de|maior que|abaixo de|menor que)\s+(?:r\$\s*)?([\d.,]+)$/i;

/**
 * Parses a free-text search query into a matcher function over lançamentos.
 * Supports plain substring matching (descrição, observações, categoria) plus
 * two numeric operators: "acima de 500" / "maior que 500" (valor >= N) and
 * "abaixo de 500" / "menor que 500" (valor <= N).
 */
export function buildLancamentoMatcher(query, categoriasById) {
  const trimmed = query.trim();
  if (!trimmed) return () => true;

  const operatorMatch = trimmed.match(OPERATOR_PATTERN);
  if (operatorMatch) {
    const [, operador, numeroStr] = operatorMatch;
    const numero = Number(numeroStr.replace(/\./g, '').replace(',', '.'));
    if (!Number.isNaN(numero)) {
      const isMaior = operador.toLowerCase() === 'acima de' || operador.toLowerCase() === 'maior que';
      return (item) => {
        const valor = Number(item.valor) || 0;
        return isMaior ? valor >= numero : valor <= numero;
      };
    }
  }

  const termo = normalize(trimmed);

  // A lone month name (e.g. "junho") filters by that calendar month instead
  // of requiring the word to literally appear in the description.
  const mesIndex = MESES_NORMALIZADOS.findIndex((m) => m === termo || m.startsWith(termo));
  if (mesIndex !== -1 && termo.length >= 4) {
    return (item) => Number(item.dataVencimento?.slice(5, 7)) === mesIndex + 1;
  }

  return (item) => {
    const categoria = categoriasById?.[item.categoriaId];
    const haystack = normalize(
      [item.descricao, item.observacoes, categoria?.nome].filter(Boolean).join(' ')
    );
    return haystack.includes(termo);
  };
}
