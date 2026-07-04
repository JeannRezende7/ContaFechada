import { listLancamentosByMonth } from '../../lancamentos/services/lancamentosService.js';
import { listCategorias } from '../../categorias/services/categoriasService.js';
import { shiftMonthKey, formatMonthShort } from '../../../utils/monthKey.js';

/** Totals for the given month, grouped by categoria, sorted highest first. */
export async function getGastosPorCategoria(uid, monthKey, tipo = 'despesa') {
  const [lancamentos, categorias] = await Promise.all([
    listLancamentosByMonth(uid, monthKey),
    listCategorias(uid),
  ]);
  const categoriasById = Object.fromEntries(categorias.map((c) => [c.id, c]));

  const totals = new Map();
  for (const l of lancamentos) {
    if (l.tipo !== tipo) continue;
    const categoria = categoriasById[l.categoriaId];
    const key = categoria?.id ?? '__sem_categoria__';
    const atual = totals.get(key) ?? {
      id: key,
      nome: categoria?.nome ?? 'Sem categoria',
      corKey: categoria?.corKey ?? 'cinza',
      total: 0,
    };
    atual.total += Number(l.valor) || 0;
    totals.set(key, atual);
  }

  const items = [...totals.values()].sort((a, b) => b.total - a.total);
  const totalGeral = items.reduce((sum, i) => sum + i.total, 0);
  return { items, totalGeral };
}

/** Entradas vs saídas for the `count` months ending at `monthKey`, oldest first. */
export async function getEvolucaoMensal(uid, monthKey, count = 6) {
  const keys = Array.from({ length: count }, (_, i) => shiftMonthKey(monthKey, i - (count - 1)));
  const porMes = await Promise.all(keys.map((key) => listLancamentosByMonth(uid, key)));

  return keys.map((key, i) => {
    let receitas = 0;
    let despesas = 0;
    for (const l of porMes[i]) {
      const valor = Number(l.valor) || 0;
      if (l.tipo === 'receita') receitas += valor;
      else despesas += valor;
    }
    return { monthKey: key, label: formatMonthShort(key), receitas, despesas };
  });
}
