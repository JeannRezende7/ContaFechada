import { getTodayISODate } from '../../../utils/formatDate.js';

/**
 * "Atrasado" é um estado calculado, não uma escolha manual: um lançamento
 * pendente vence assim que sua data fica anterior à data local de hoje.
 */
export function getStatusEfetivo(item, today = getTodayISODate()) {
  if (item?.status === 'pendente' && item.dataVencimento && item.dataVencimento < today) {
    return 'atrasado';
  }
  return item?.status ?? 'pendente';
}

