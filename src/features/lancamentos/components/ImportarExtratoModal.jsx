import { useState } from 'react';
import { ArrowDownRight, ArrowUpRight, FileUp, Loader2 } from 'lucide-react';
import CategoriaPicker from '../../categorias/components/CategoriaPicker.jsx';
import { formatCurrency } from '../../../utils/formatCurrency.js';
import { formatDateBR } from '../../../utils/formatDate.js';
import { importLancamentos } from '../services/lancamentosService.js';
import { parseExtrato } from '../utils/parseExtrato.js';

export default function ImportarExtratoModal({ open, uid, categorias, onClose, onImported }) {
  const [status, setStatus] = useState('idle');
  const [items, setItems] = useState([]);
  const [selected, setSelected] = useState(new Set());
  const [ignored, setIgnored] = useState(0);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  if (!open) return null;

  async function handleFile(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    setStatus('parsing');
    setError('');
    try {
      const extension = file.name.split('.').pop()?.toLowerCase();
      if (!['csv', 'ofx'].includes(extension)) throw new Error('Escolha um arquivo CSV ou OFX.');
      const parsed = parseExtrato(await file.text(), extension);
      if (parsed.items.length === 0) throw new Error(parsed.errors[0] || 'Nenhum lançamento válido encontrado.');
      setItems(parsed.items.map((item) => ({ ...item, categoriaId: null })));
      setSelected(new Set(parsed.items.map((_, index) => index)));
      setIgnored(parsed.errors.length);
      setStatus('preview');
    } catch (err) {
      setError(err.message || 'Não consegui ler esse arquivo.');
      setStatus('error');
    }
  }

  function close() {
    setStatus('idle');
    setItems([]);
    setSelected(new Set());
    setResult(null);
    setIgnored(0);
    setError('');
    onClose();
  }

  function toggle(index) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  }

  function setCategory(index, categoryId) {
    setItems((current) => current.map((item, i) => i === index ? { ...item, categoriaId: categoryId || null } : item));
  }

  async function importItems() {
    setStatus('importing');
    try {
      const response = await importLancamentos(uid, items.filter((_, index) => selected.has(index)));
      setResult({ ...response, ignorados: ignored + items.length - selected.size });
      setStatus('done');
      onImported?.();
    } catch {
      setError('Não foi possível salvar os lançamentos.');
      setStatus('error');
    }
  }

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-ink-900/50 sm:items-center sm:px-4">
      <div className="flex max-h-[88vh] w-full flex-col rounded-t-card bg-white p-5 shadow-pop dark:bg-ink-700 sm:max-w-2xl sm:rounded-card">
        <h2 className="font-display text-base font-semibold text-ink-900 dark:text-ink-50">Importar extrato CSV ou OFX</h2>
        <p className="mb-4 text-xs text-ink-300">Revise os itens e ajuste as categorias antes de confirmar.</p>

        {status === 'idle' && (
          <label className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed border-ink-100 py-10 hover:border-ledger-500">
            <FileUp className="text-ink-300" />
            <span className="text-sm text-ink-500">Escolher extrato</span>
            <input className="hidden" type="file" accept=".csv,.ofx,text/csv,application/x-ofx" onChange={handleFile} />
          </label>
        )}
        {(status === 'parsing' || status === 'importing') && (
          <div className="flex flex-col items-center gap-2 py-10 text-sm text-ink-300">
            <Loader2 className="animate-spin" /> {status === 'parsing' ? 'Lendo extrato…' : 'Importando…'}
          </div>
        )}
        {status === 'error' && <p className="py-8 text-center text-sm text-signal-500">{error}</p>}
        {status === 'preview' && (
          <>
            <p className="mb-2 text-xs text-ink-300">
              {selected.size} selecionados · {ignored} linhas inválidas serão ignoradas
            </p>
            <div className="mb-3 flex-1 space-y-1.5 overflow-y-auto">
              {items.map((item, index) => {
                const Icon = item.tipo === 'receita' ? ArrowUpRight : ArrowDownRight;
                return (
                  <div key={`${item.dataVencimento}-${index}`} className={`flex items-center gap-2 rounded-xl p-2 ${selected.has(index) ? 'bg-ink-50 dark:bg-ink-900' : 'opacity-40'}`}>
                    <input type="checkbox" checked={selected.has(index)} onChange={() => toggle(index)} />
                    <Icon size={15} className={item.tipo === 'receita' ? 'text-ledger-600' : 'text-signal-500'} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm text-ink-900 dark:text-ink-50">{item.descricao}</p>
                      <p className="text-xs text-ink-300">{formatDateBR(item.dataVencimento)}</p>
                    </div>
                    <span className="money text-sm">{formatCurrency(item.valor)}</span>
                    <CategoriaPicker
                      compact
                      categorias={categorias.filter((category) => category.tipo === item.tipo)}
                      value={item.categoriaId}
                      onChange={(value) => setCategory(index, value)}
                    />
                  </div>
                );
              })}
            </div>
          </>
        )}
        {status === 'done' && (
          <p className="py-8 text-center text-sm text-ink-700 dark:text-ink-100">
            {result.importados} importados, {result.duplicados} duplicados e {result.ignorados} ignorados.
          </p>
        )}

        <div className="mt-3 flex gap-2">
          <button type="button" onClick={close} className="flex-1 rounded-xl py-2.5 text-sm text-ink-500">
            {status === 'done' ? 'Fechar' : 'Cancelar'}
          </button>
          {status === 'error' && <button type="button" onClick={() => setStatus('idle')} className="flex-1 rounded-xl bg-ledger-500 py-2.5 text-sm text-white">Tentar novamente</button>}
          {status === 'preview' && <button type="button" disabled={!selected.size} onClick={importItems} className="flex-1 rounded-xl bg-ledger-500 py-2.5 text-sm font-medium text-white disabled:opacity-50">Importar {selected.size}</button>}
        </div>
      </div>
    </div>
  );
}
