import { useState } from 'react';
import { Upload, Loader2, ArrowUpRight, ArrowDownRight, Layers } from 'lucide-react';
import { extractPdfLines } from '../utils/extractPdfLines.js';
import { extractFaturaContext, parseNubankTransacoes } from '../utils/parseFaturaNubank.js';
import { importLancamentos } from '../services/lancamentosService.js';
import { formatCurrency } from '../../../utils/formatCurrency.js';
import { formatDateBR } from '../../../utils/formatDate.js';

/**
 * Imports a Nubank credit-card fatura PDF: extracts text client-side (pdf.js),
 * parses it into candidate transactions, lets the user review/uncheck before
 * writing. Only Nubank's layout is supported today — see parseFaturaNubank.js.
 */
export default function ImportarFaturaModal({ open, uid, onClose, onImported }) {
  const [status, setStatus] = useState('idle'); // idle | parsing | preview | importing | done | error
  const [itens, setItens] = useState([]);
  const [selecionados, setSelecionados] = useState(new Set());
  const [resultado, setResultado] = useState(null);
  const [erro, setErro] = useState('');

  if (!open) return null;

  async function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setStatus('parsing');
    setErro('');
    try {
      const lines = await extractPdfLines(file);
      const contexto = extractFaturaContext(lines);
      if (!contexto) throw new Error('Não reconheci esse PDF como uma fatura do Nubank.');
      const transacoes = parseNubankTransacoes(lines, contexto);
      if (transacoes.length === 0) throw new Error('Nenhuma transação encontrada nesse PDF.');
      setItens(transacoes);
      setSelecionados(new Set(transacoes.map((_, i) => i)));
      setStatus('preview');
    } catch (err) {
      setErro(err.message || 'Não consegui ler esse PDF.');
      setStatus('error');
    }
  }

  function toggle(i) {
    setSelecionados((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  }

  async function handleImportar() {
    setStatus('importing');
    const escolhidos = itens.filter((_, i) => selecionados.has(i));
    const res = await importLancamentos(uid, escolhidos);
    setResultado(res);
    setStatus('done');
    onImported?.();
  }

  function handleClose() {
    setStatus('idle');
    setItens([]);
    setSelecionados(new Set());
    setResultado(null);
    setErro('');
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-ink-900/50 backdrop-blur-[2px] flex items-end sm:items-center justify-center z-30 px-0 sm:px-4">
      <div className="bg-white w-full sm:max-w-lg rounded-t-card sm:rounded-card p-5 sm:p-6 shadow-pop max-h-[85vh] flex flex-col">
        <div className="w-10 h-1.5 rounded-pill bg-ink-100 mx-auto mb-4 sm:hidden" />
        <h2 className="font-display text-base font-semibold text-ink-900 mb-1">Importar fatura (PDF)</h2>
        <p className="text-xs text-ink-300 mb-4">Hoje só reconheço faturas do Nubank.</p>

        {status === 'idle' && (
          <label className="flex flex-col items-center gap-2 border-2 border-dashed border-ink-100 rounded-xl py-10 cursor-pointer hover:border-ledger-500 transition-colors">
            <Upload size={24} strokeWidth={1.75} className="text-ink-300" />
            <span className="text-sm text-ink-500">Escolher arquivo PDF</span>
            <input type="file" accept="application/pdf" onChange={handleFile} className="hidden" />
          </label>
        )}

        {status === 'parsing' && (
          <div className="flex flex-col items-center gap-2 py-10 text-ink-300">
            <Loader2 size={24} className="animate-spin" />
            <span className="text-sm">Lendo o PDF…</span>
          </div>
        )}

        {status === 'error' && (
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <p className="text-sm text-signal-500">{erro}</p>
            <button
              onClick={() => setStatus('idle')}
              className="text-sm font-medium text-ledger-600 hover:underline"
            >
              Tentar outro arquivo
            </button>
          </div>
        )}

        {status === 'preview' && (
          <>
            <p className="text-sm text-ink-500 mb-2">
              {selecionados.size} de {itens.length} transações selecionadas
            </p>
            <div className="flex-1 overflow-y-auto flex flex-col gap-1.5 mb-4 -mx-1 px-1">
              {itens.map((item, i) => {
                const Icon = item.tipo === 'receita' ? ArrowUpRight : ArrowDownRight;
                const checked = selecionados.has(i);
                return (
                  <label
                    key={i}
                    className={`flex items-center gap-2.5 rounded-xl px-2.5 py-2 cursor-pointer transition-colors ${
                      checked ? 'bg-white' : 'bg-ink-50 opacity-50'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggle(i)}
                      className="rounded border-ink-100 text-ledger-500 focus:ring-ledger-500 shrink-0"
                    />
                    <span
                      className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
                        item.tipo === 'receita' ? 'bg-ledger-50 text-ledger-600' : 'bg-ink-50 text-ink-500'
                      }`}
                    >
                      <Icon size={14} strokeWidth={2} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="text-sm text-ink-900 flex items-center gap-1.5 min-w-0">
                        <span className="truncate">{item.descricao}</span>
                        {item.parcelaAtual && (
                          <span title="Parcela" className="text-clay-500 shrink-0">
                            <Layers size={11} strokeWidth={2.5} />
                          </span>
                        )}
                      </span>
                      <span className="text-xs text-ink-300 block">{formatDateBR(item.dataVencimento)}</span>
                    </span>
                    <span className="money text-sm font-medium text-ink-900 shrink-0">
                      {formatCurrency(item.valor)}
                    </span>
                  </label>
                );
              })}
            </div>
          </>
        )}

        {status === 'importing' && (
          <div className="flex flex-col items-center gap-2 py-10 text-ink-300">
            <Loader2 size={24} className="animate-spin" />
            <span className="text-sm">Importando…</span>
          </div>
        )}

        {status === 'done' && (
          <div className="flex flex-col items-center gap-2 py-8 text-center">
            <p className="text-sm text-ink-900">
              {resultado.importados} lançamento(s) importado(s).
              {resultado.duplicados > 0 && ` ${resultado.duplicados} já existiam e foram ignorados.`}
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
          {status === 'preview' && (
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
