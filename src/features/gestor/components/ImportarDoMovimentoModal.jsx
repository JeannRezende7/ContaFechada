import { useEffect, useMemo, useState } from 'react';
import { ArrowUpRight, ArrowDownRight, Search, Layers } from 'lucide-react';
import { listAllLancamentos } from '../../lancamentos/services/lancamentosService.js';
import { buildLancamentoMatcher } from '../../lancamentos/utils/searchLancamentos.js';
import { importarDoMovimento } from '../services/gestorService.js';
import { formatCurrency } from '../../../utils/formatCurrency.js';
import { formatDateBR } from '../../../utils/formatDate.js';

/** Lets the user pick which existing Movimento lançamentos to copy into the Gestor Financeiro's own, separate ledger. */
export default function ImportarDoMovimentoModal({ open, uid, categoriasById = {}, onClose, onImported }) {
  const [status, setStatus] = useState('loading'); // loading | list | importing | done
  const [itens, setItens] = useState([]);
  const [selecionados, setSelecionados] = useState(new Set());
  const [busca, setBusca] = useState('');
  const [resultado, setResultado] = useState(null);

  useEffect(() => {
    if (!open || !uid) return;
    setStatus('loading');
    listAllLancamentos(uid).then((lista) => {
      const ordenada = [...lista].sort((a, b) => (b.dataVencimento || '').localeCompare(a.dataVencimento || ''));
      setItens(ordenada);
      setSelecionados(new Set());
      setStatus('list');
    });
  }, [open, uid]);

  const filtrados = useMemo(() => {
    const matcher = buildLancamentoMatcher(busca, categoriasById);
    return itens.filter(matcher);
  }, [itens, busca, categoriasById]);

  if (!open) return null;

  function toggle(id) {
    setSelecionados((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleImportar() {
    setStatus('importing');
    const escolhidos = itens.filter((l) => selecionados.has(l.id));
    const res = await importarDoMovimento(uid, escolhidos);
    setResultado(res);
    setStatus('done');
    onImported?.();
  }

  function handleClose() {
    setStatus('loading');
    setBusca('');
    setResultado(null);
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-ink-900/50 backdrop-blur-[2px] flex items-end sm:items-center justify-center z-30 px-0 sm:px-4">
      <div className="bg-white dark:bg-ink-700 w-full sm:max-w-lg rounded-t-card sm:rounded-card p-5 sm:p-6 shadow-pop max-h-[85vh] flex flex-col">
        <div className="w-10 h-1.5 rounded-pill bg-ink-100 dark:bg-ink-900 mx-auto mb-4 sm:hidden" />
        <h2 className="font-display text-base font-semibold text-ink-900 dark:text-ink-50 mb-1">Importar do Movimento</h2>
        <p className="text-xs text-ink-300 mb-4">Selecione quais lançamentos do Movimento entram no Gestor Financeiro.</p>

        {status === 'loading' && (
          <div className="flex items-center justify-center py-10 text-ink-300 text-sm">Carregando lançamentos…</div>
        )}

        {status === 'list' && (
          <>
            <div className="relative mb-3">
              <Search size={15} strokeWidth={2} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-300" />
              <input
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Pesquisar..."
                className="w-full rounded-pill border border-ink-100 bg-white dark:bg-ink-900 dark:border-ink-700 text-ink-900 dark:text-ink-50 pl-9 pr-3 py-2 text-sm focus:border-ledger-500 transition-colors"
              />
            </div>

            <p className="text-sm text-ink-500 mb-2">
              {selecionados.size} de {filtrados.length} selecionados
            </p>

            <div className="flex-1 overflow-y-auto flex flex-col gap-1.5 mb-4 -mx-1 px-1">
              {filtrados.map((item) => {
                const Icon = item.tipo === 'receita' ? ArrowUpRight : ArrowDownRight;
                const checked = selecionados.has(item.id);
                return (
                  <div
                    key={item.id}
                    onClick={() => toggle(item.id)}
                    className={`flex items-center gap-2.5 rounded-xl px-2.5 py-2 cursor-pointer transition-colors ${
                      checked ? 'bg-white dark:bg-ink-700' : 'bg-ink-50 dark:bg-ink-900 opacity-50'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      readOnly
                      className="rounded border-ink-100 text-ledger-500 focus:ring-ledger-500 shrink-0 pointer-events-none"
                    />
                    <span
                      className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
                        item.tipo === 'receita' ? 'bg-ledger-50 text-ledger-600' : 'bg-ink-50 dark:bg-ink-900 text-ink-500'
                      }`}
                    >
                      <Icon size={14} strokeWidth={2} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="text-sm text-ink-900 dark:text-ink-50 flex items-center gap-1.5 min-w-0">
                        <span className="truncate">{item.descricao}</span>
                        {item.parcelaAtual && (
                          <span className="flex items-center gap-0.5 text-clay-600 text-[11px] font-medium shrink-0">
                            <Layers size={11} strokeWidth={2.5} />
                            {item.parcelaAtual}/{item.totalParcelas}
                          </span>
                        )}
                      </span>
                      <span className="text-xs text-ink-300 block">{formatDateBR(item.dataVencimento)}</span>
                    </span>
                    <span className="money text-sm font-medium text-ink-900 dark:text-ink-50 shrink-0">
                      {formatCurrency(item.valor)}
                    </span>
                  </div>
                );
              })}
              {filtrados.length === 0 && (
                <p className="text-sm text-ink-300 text-center py-8">Nenhum lançamento encontrado.</p>
              )}
            </div>
          </>
        )}

        {status === 'importing' && (
          <div className="flex items-center justify-center py-10 text-ink-300 text-sm">Importando…</div>
        )}

        {status === 'done' && (
          <div className="flex flex-col items-center gap-2 py-8 text-center">
            <p className="text-sm text-ink-900 dark:text-ink-50">
              {resultado.importados} lançamento(s) importado(s) para o Gestor Financeiro.
              {resultado.duplicados > 0 && ` ${resultado.duplicados} já estavam lá.`}
            </p>
          </div>
        )}

        <div className="flex gap-2 mt-auto pt-2">
          <button
            type="button"
            onClick={handleClose}
            className="flex-1 rounded-xl py-2.5 text-sm font-medium text-ink-500 hover:bg-ink-50"
          >
            {status === 'done' ? 'Fechar' : 'Cancelar'}
          </button>
          {status === 'list' && (
            <button
              type="button"
              onClick={handleImportar}
              disabled={selecionados.size === 0}
              className="flex-1 rounded-xl bg-ledger-500 text-white py-2.5 text-sm font-medium hover:bg-ledger-600 hover:shadow-card-hover transition-all disabled:opacity-50"
            >
              Importar {selecionados.size}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
