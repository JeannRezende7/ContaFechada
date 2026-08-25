import { useEffect, useRef, useState } from 'react';
import { Plus, Save } from 'lucide-react';
import { COLOR_MAP } from '../colorMap.js';
import { ICON_MAP } from '../iconMap.js';
import { useModalHistory } from '../../../hooks/useModalHistory.js';
import ModalHeader from '../../../components/ui/ModalHeader.jsx';

const EMPTY = { nome: '', corKey: 'cinza', icone: 'tag' };

/** Full-screen-ish form for a new categoria — icons render large since picking one is the whole point of this modal. */
export default function CategoriaModal({ open, tipo, initialData = null, onClose, onSave }) {
  const [form, setForm] = useState(EMPTY);
  const firstFieldRef = useRef(null);
  useModalHistory(open, onClose);

  useEffect(() => {
    if (open) {
      setForm(initialData
        ? { nome: initialData.nome, corKey: initialData.corKey, icone: initialData.icone }
        : EMPTY);
      setTimeout(() => firstFieldRef.current?.focus(), 0);
    }
  }, [open, initialData]);

  useEffect(() => {
    function handleKey(e) {
      if (e.key === 'Escape') onClose();
    }
    if (open) document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

  if (!open) return null;

  function update(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!form.nome.trim()) return;
    onSave({ nome: form.nome.trim(), tipo, corKey: form.corKey, icone: form.icone });
  }

  return (
    <div className="fixed inset-0 bg-ink-900/50 backdrop-blur-[2px] flex items-end sm:items-center justify-center z-30 px-0 sm:px-4">
      <form
        onSubmit={handleSubmit}
        className="app-modal-sheet bg-white dark:bg-ink-700 w-full sm:max-w-md rounded-t-card sm:rounded-card p-5 sm:p-6 shadow-pop overflow-y-auto"
      >
        <ModalHeader onBack={onClose} title={`${initialData ? 'Editar' : 'Nova'} categoria de ${tipo === 'despesa' ? 'despesa' : 'receita'}`} />

        <label className="block text-xs font-medium text-ink-300 mb-1">Nome</label>
        <input
          ref={firstFieldRef}
          required
          value={form.nome}
          onChange={(e) => update('nome', e.target.value)}
          placeholder="Ex: Papelaria"
          className="w-full rounded-xl border border-ink-100 bg-white dark:bg-ink-900 text-ink-900 dark:text-ink-50 px-3.5 py-2.5 text-sm mb-4 focus:border-ledger-500 transition-colors"
        />

        <p className="text-xs font-medium text-ink-300 mb-1">Cor</p>
        <div className="grid grid-cols-8 sm:grid-cols-10 gap-3 p-1 mb-4">
          {Object.keys(COLOR_MAP).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => update('corKey', key)}
              aria-label={`Cor ${key}`}
              className={`w-7 h-7 rounded-full mx-auto ${COLOR_MAP[key].dot} transition-all ${
                form.corKey === key ? 'ring-2 ring-offset-2 dark:ring-offset-ink-700 ring-ink-900 dark:ring-ink-50' : ''
              }`}
            />
          ))}
        </div>

        <p className="text-xs font-medium text-ink-300 mb-1">Ícone</p>
        <div className="grid grid-cols-4 sm:grid-cols-5 gap-3 p-1 mb-5">
          {Object.entries(ICON_MAP).map(([key, Icon]) => (
            <button
              key={key}
              type="button"
              onClick={() => update('icone', key)}
              aria-label={`Ícone ${key}`}
              className={`w-14 h-14 rounded-full mx-auto flex items-center justify-center transition-all ${COLOR_MAP[form.corKey].dot} ${
                form.icone === key ? 'ring-2 ring-offset-2 dark:ring-offset-ink-700 ring-ink-900 dark:ring-ink-50' : 'opacity-60 hover:opacity-100'
              }`}
            >
              <Icon size={26} strokeWidth={2} className="text-white" />
            </button>
          ))}
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-xl py-2.5 text-sm font-medium text-ink-500 hover:bg-ink-50 dark:hover:bg-ink-900"
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-ledger-500 text-white py-2.5 text-sm font-medium hover:bg-ledger-600 hover:shadow-card-hover transition-all"
          >
            {initialData ? <Save size={16} strokeWidth={2.25} /> : <Plus size={16} strokeWidth={2.25} />}
            {initialData ? 'Salvar' : 'Adicionar'}
          </button>
        </div>
      </form>
    </div>
  );
}
