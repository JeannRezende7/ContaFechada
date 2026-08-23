import { useState } from 'react';
import { ArrowDownRight, ArrowUpRight, FileUp, ImageUp, Loader2, TriangleAlert } from 'lucide-react';
import CategoriaPicker from '../../categorias/components/CategoriaPicker.jsx';
import { repositories } from '../../../repositories/index.js';
import { parseExtrato } from '../utils/parseExtrato.js';
import { parsePrintExtrato } from '../utils/parsePrintExtrato.js';
import { extractPdfLines } from '../utils/extractPdfLines.js';

function isValidItem(item) {
  return /^\d{4}-\d{2}-\d{2}$/.test(item.dataVencimento) && Number(item.valor) > 0;
}

export default function ImportarExtratoModal({ open, uid, categorias, onClose, onImported }) {
  const [status, setStatus] = useState('idle');
  const [items, setItems] = useState([]);
  const [selected, setSelected] = useState(new Set());
  const [ignored, setIgnored] = useState(0);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [tipoPrint, setTipoPrint] = useState('despesa');
  const [progress, setProgress] = useState(0);

  if (!open) return null;

  async function handleFile(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    setStatus('parsing');
    setError('');
    try {
      const extension = file.name.split('.').pop()?.toLowerCase();
      if (!['csv', 'ofx', 'pdf'].includes(extension)) throw new Error('Escolha um arquivo CSV, OFX ou PDF.');
      const parsed = extension === 'pdf'
        ? { items: parsePrintExtrato((await extractPdfLines(file)).join('\n'), tipoPrint), errors: [] }
        : parseExtrato(await file.text(), extension);
      if (parsed.items.length === 0) throw new Error(parsed.errors[0] || 'Nenhum lançamento válido encontrado.');
      setItems(parsed.items.map((item) => ({ ...item, descricao: item.descricao || '', categoriaId: null })));
      setSelected(new Set(parsed.items.map((_, index) => index)));
      setIgnored(parsed.errors.length);
      setStatus('preview');
    } catch (err) {
      setError(err.message || 'Não consegui ler esse arquivo.');
      setStatus('error');
    }
  }

  async function handleImages(event) {
    const files = [...(event.target.files || [])];
    if (!files.length) return;
    setStatus('parsing');
    setProgress(0);
    setError('');
    let worker;
    try {
      const { createWorker } = await import('tesseract.js');
      worker = await createWorker('por', 1, {
        logger: ({ status: workerStatus, progress: workerProgress }) => {
          if (workerStatus === 'recognizing text') setProgress(Math.round(workerProgress * 100));
        },
      });
      const parsed = [];
      for (const file of files) {
        const result = await worker.recognize(file);
        parsed.push(...parsePrintExtrato(result.data.text, tipoPrint));
      }
      if (!parsed.length) throw new Error('Não encontrei lançamentos nesse print. Tente uma imagem mais nítida.');
      setItems(parsed.map((item) => ({ ...item, categoriaId: null })));
      setSelected(new Set(parsed.map((_, index) => index)));
      setIgnored(0);
      setStatus('preview');
    } catch (err) {
      setError(err.message || 'Não consegui ler esse print.');
      setStatus('error');
    } finally {
      await worker?.terminate();
      event.target.value = '';
    }
  }

  function close() {
    setStatus('idle');
    setItems([]);
    setSelected(new Set());
    setResult(null);
    setIgnored(0);
    setError('');
    setProgress(0);
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

  function updateItem(index, field, value) {
    setItems((current) => current.map((item, i) => i === index ? { ...item, [field]: value } : item));
  }

  async function importItems() {
    const chosen = items.filter((_, index) => selected.has(index));
    if (chosen.some((item) => !isValidItem(item))) {
      setError('Corrija os campos vazios ou inválidos antes de importar.');
      return;
    }
    setStatus('importing');
    try {
      const response = await repositories.lancamentos.importLancamentos(uid, chosen);
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
        <h2 className="font-display text-base font-semibold text-ink-900 dark:text-ink-50">Importar lançamentos</h2>
        <p className="mb-4 text-xs text-ink-300">Revise e corrija os dados reconhecidos antes de confirmar.</p>

        {status === 'idle' && (
          <div className="space-y-3">
            <div className="flex items-start gap-2 rounded-xl bg-gold-50 p-3 text-xs leading-relaxed text-gold-900 dark:bg-ink-900 dark:text-gold-100">
              <TriangleAlert size={16} className="mt-0.5 shrink-0 text-gold-700" />
              <p><strong>A importação pode não reconhecer tudo corretamente.</strong> O resultado varia conforme o banco, o formato e a qualidade do arquivo ou imagem. Revise datas, valores e descrições antes de importar.</p>
            </div>
            <label className="flex cursor-pointer items-center gap-3 rounded-xl border-2 border-dashed border-ink-100 px-4 py-5 hover:border-ledger-500 dark:border-ink-700">
              <FileUp className="text-ink-300" />
              <span className="text-sm text-ink-500">Escolher extrato CSV, OFX ou PDF</span>
              <input className="hidden" type="file" accept=".csv,.ofx,.pdf,text/csv,application/x-ofx,application/pdf" onChange={handleFile} />
            </label>
            <div className="rounded-xl border border-ink-100 p-3 dark:border-ink-700">
              <p className="mb-2 text-xs font-medium text-ink-500 dark:text-ink-100">Os lançamentos do print ou PDF são</p>
              <div className="mb-3 grid grid-cols-2 gap-2">
                <button type="button" onClick={() => setTipoPrint('despesa')} className={`rounded-lg py-2 text-sm ${tipoPrint === 'despesa' ? 'bg-signal-500 text-white' : 'bg-ink-50 text-ink-500 dark:bg-ink-900'}`}>Saídas</button>
                <button type="button" onClick={() => setTipoPrint('receita')} className={`rounded-lg py-2 text-sm ${tipoPrint === 'receita' ? 'bg-ledger-500 text-white' : 'bg-ink-50 text-ink-500 dark:bg-ink-900'}`}>Entradas</button>
              </div>
              <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg bg-ink-900 py-2.5 text-sm font-medium text-white dark:bg-ledger-500">
                <ImageUp size={18} /> Escolher print(s)
                <input className="hidden" type="file" multiple accept="image/png,image/jpeg,image/webp" onChange={handleImages} />
              </label>
            </div>
          </div>
        )}
        {(status === 'parsing' || status === 'importing') && (
          <div className="flex flex-col items-center gap-2 py-10 text-sm text-ink-300">
            <Loader2 className="animate-spin" /> {status === 'parsing' ? `Lendo dados${progress ? ` · ${progress}%` : '…'}` : 'Importando…'}
          </div>
        )}
        {status === 'error' && <p className="py-8 text-center text-sm text-signal-500">{error}</p>}
        {status === 'preview' && (
          <>
            {error && <p className="mb-2 text-xs text-signal-500">{error}</p>}
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
                    <div className="grid min-w-0 flex-1 grid-cols-1 gap-1 sm:grid-cols-[1fr_9rem_7rem]">
                      <input aria-label="Descrição" value={item.descricao} onChange={(event) => updateItem(index, 'descricao', event.target.value)} className="min-w-0 rounded-lg border border-ink-100 bg-white px-2 py-1.5 text-sm dark:border-ink-700 dark:bg-ink-700" />
                      <input aria-label="Data" type="date" value={item.dataVencimento} onChange={(event) => updateItem(index, 'dataVencimento', event.target.value)} className="min-w-0 rounded-lg border border-ink-100 bg-white px-2 py-1.5 text-xs dark:border-ink-700 dark:bg-ink-700" />
                      <input aria-label="Valor" type="number" min="0.01" step="0.01" value={item.valor} onChange={(event) => updateItem(index, 'valor', event.target.value)} className="money min-w-0 rounded-lg border border-ink-100 bg-white px-2 py-1.5 text-sm dark:border-ink-700 dark:bg-ink-700" />
                    </div>
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
