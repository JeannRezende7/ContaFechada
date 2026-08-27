import { useEffect, useMemo, useState } from 'react';
import CategoriaPicker from '../../categorias/components/CategoriaPicker.jsx';
import { useModalHistory } from '../../../hooks/useModalHistory.js';
import ModalHeader from '../../../components/ui/ModalHeader.jsx';

const EMPTY_FORM = { valor: '', dataVencimento: '', descricao: '', categoriaId: '', status: '', observacoes: '' };

export default function AcoesEmMassaModal({ open, count, tipo, categorias, onClose, onApply, applying = false }) {
  useModalHistory(open, onClose);
  const [form, setForm] = useState(EMPTY_FORM);
  const [changed, setChanged] = useState(() => new Set());
  const categoriasDoTipo = useMemo(() => categorias.filter((item) => item.tipo === tipo), [categorias, tipo]);
  useEffect(() => { if (open) { setForm(EMPTY_FORM); setChanged(new Set()); } }, [open, tipo]);
  if (!open) return null;

  function update(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
    setChanged((current) => new Set(current).add(key));
  }
  const invalidValue = changed.has('valor') && (!Number.isFinite(Number(form.valor)) || Number(form.valor) <= 0);
  const missingRequired = [...changed].some((key) => !['categoriaId', 'descricao', 'observacoes'].includes(key) && !form[key]);
  const canApply = changed.size > 0 && !invalidValue && !missingRequired;
  const inputClass = 'w-full rounded-xl border border-ink-100 bg-white px-3.5 py-2.5 text-sm text-ink-900 transition-colors focus:border-ledger-500 dark:border-ink-700 dark:bg-ink-900 dark:text-ink-50';
  function submit() {
    onApply(Object.fromEntries([...changed].map((key) => [key, key === 'valor' ? Number(form[key]) : form[key]])));
  }
  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-ink-900/50 sm:items-center sm:px-4">
      <div className="app-modal-sheet w-full overflow-y-auto rounded-t-card bg-white p-5 shadow-pop dark:bg-ink-700 sm:max-w-lg sm:rounded-card sm:p-6">
        <ModalHeader onBack={onClose} title={`Editar ${count} lançamento(s)`} actionLabel={applying ? 'Salvando…' : `Salvar ${count}`} onAction={submit} actionDisabled={applying || !canApply} className="mb-1" />
        <p className="mb-4 text-xs text-ink-300">Preencha apenas o que deseja alterar. Campos não modificados serão mantidos.</p>
        <div className="mb-3 grid grid-cols-2 gap-3">
          <div><label className="mb-1 block text-xs font-medium text-ink-300">Valor</label><input type="number" min="0.01" step="0.01" value={form.valor} onChange={(e) => update('valor', e.target.value)} className={`${inputClass} money`} placeholder="Manter atual" /></div>
          <div><label className="mb-1 block text-xs font-medium text-ink-300">Data</label><input type="date" min="1900-01-01" max="2100-12-31" value={form.dataVencimento} onChange={(e) => update('dataVencimento', e.target.value)} className={`${inputClass} [color-scheme:light] dark:[color-scheme:dark]`} /></div>
        </div>
        <label className="mb-1 block text-xs font-medium text-ink-300">Descrição</label>
        <input value={form.descricao} onChange={(e) => update('descricao', e.target.value)} className={`${inputClass} mb-3`} placeholder="Manter descrição atual" />
        <label className="mb-1 block text-xs font-medium text-ink-300">Categoria</label>
        <div className="mb-3"><CategoriaPicker categorias={categoriasDoTipo} value={form.categoriaId} onChange={(value) => update('categoriaId', value)} emptyLabel="Escolher categoria" /></div>
        <label className="mb-1 block text-xs font-medium text-ink-300">Status</label>
        <select value={form.status} onChange={(e) => update('status', e.target.value)} className={`${inputClass} mb-3`}>
          <option value="">Manter status atual</option><option value="pendente">Pendente</option><option value="agendado">Agendado</option>
          {tipo === 'despesa' && <option value="atrasado">Atrasado</option>}
          <option value={tipo === 'receita' ? 'recebido' : 'pago'}>{tipo === 'receita' ? 'Recebido' : 'Pago'}</option>
        </select>
        <label className="mb-1 block text-xs font-medium text-ink-300">Observações</label>
        <textarea rows="2" value={form.observacoes} onChange={(e) => update('observacoes', e.target.value)} className={`${inputClass} mb-4 resize-none`} placeholder="Manter observações atuais" />
      </div>
    </div>
  );
}
