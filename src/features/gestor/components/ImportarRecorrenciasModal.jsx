import { useEffect, useState } from 'react';
import { Repeat } from 'lucide-react';
import { listRecorrencias } from '../../recorrencias/services/recorrenciasService.js';
import { importarRecorrencias } from '../services/gestorService.js';
import { formatCurrency } from '../../../utils/formatCurrency.js';

/** Lets the user pick which active recorrências (standing monthly commitments) enter the Gestor Financeiro. */
export default function ImportarRecorrenciasModal({ open, uid, onClose, onImported }) {
  const [status, setStatus] = useState('loading'); // loading | list | importing | done
  const [itens, setItens] = useState([]);
  const [selecionados, setSelecionados] = useState(new Set());
  const [resultado, setResultado] = useState(null);

  useEffect(() => {
    if (!open || !uid) return;
    setStatus('loading');
    listRecorrencias(uid).then((lista) => {
      const ativas = lista.filter((r) => r.ativo);
      setItens(ativas);
      setSelecionados(new Set());
      setStatus('list');
    });
  }, [open, uid]);

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
    const escolhidas = itens.filter((r) => selecionados.has(r.id));
    const res = await importarRecorrencias(uid, escolhidas);
    setResultado(res);
    setStatus('done');
    onImported?.();
  }

  function handleClose() {
    setStatus('loading');
    setResultado(null);
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-ink-900/50 backdrop-blur-[2px] flex items-end sm:items-center justify-center z-30 px-0 sm:px-4">
      <div className="bg-white dark:bg-ink-700 w-full sm:max-w-md rounded-t-card sm:rounded-card p-5 sm:p-6 shadow-pop max-h-[85vh] flex flex-col">
        <div className="w-10 h-1.5 rounded-pill bg-ink-100 dark:bg-ink-900 mx-auto mb-4 sm:hidden" />
        <h2 className="font-display text-base font-semibold text-ink-900 dark:text-ink-50 mb-1">Importar recorrências</h2>
        <p className="text-xs text-ink-300 mb-4">
          Selecione quais contas recorrentes ativas entram no Gestor Financeiro — valem para todo mês, não só o atual.
        </p>

        {status === 'loading' && (
          <div className="flex items-center justify-center py-10 text-ink-300 text-sm">Carregando recorrências…</div>
        )}

        {status === 'list' && (
          <>
            <p className="text-sm text-ink-500 mb-2">
              {selecionados.size} de {itens.length} selecionadas
            </p>
            <div className="flex-1 overflow-y-auto flex flex-col gap-1.5 mb-4 -mx-1 px-1">
              {itens.map((r) => {
                const checked = selecionados.has(r.id);
                return (
                  <div
                    key={r.id}
                    onClick={() => toggle(r.id)}
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
                    <span className="w-7 h-7 rounded-full bg-ink-50 dark:bg-ink-900 text-ink-500 flex items-center justify-center shrink-0">
                      <Repeat size={14} strokeWidth={2} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="text-sm text-ink-900 dark:text-ink-50 truncate block">{r.descricao}</span>
                      <span className="text-xs text-ink-300 block">Todo dia {r.diaVencimento}</span>
                    </span>
                    <span className="money text-sm font-medium text-ink-900 dark:text-ink-50 shrink-0">
                      {formatCurrency(r.valor)}
                    </span>
                  </div>
                );
              })}
              {itens.length === 0 && (
                <p className="text-sm text-ink-300 text-center py-8">Nenhuma recorrência ativa.</p>
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
              {resultado.importados} recorrência(s) importada(s) para o Gestor Financeiro.
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
