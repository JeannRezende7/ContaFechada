import { useState } from 'react';

export default function AcoesEmMassaModal({ open, count, tipo, categorias, onClose, onApply }) {
  const [action, setAction] = useState('status');
  const [value, setValue] = useState(tipo === 'receita' ? 'recebido' : 'pago');
  if (!open) return null;

  function changeAction(next) {
    setAction(next);
    if (next === 'status') setValue(tipo === 'receita' ? 'recebido' : 'pago');
    else setValue('');
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-ink-900/50 px-4">
      <div className="w-full max-w-md rounded-card bg-white p-5 shadow-pop dark:bg-ink-700">
        <h2 className="font-display font-semibold text-ink-900 dark:text-ink-50">Editar {count} lançamento(s)</h2>
        <label className="mt-4 block text-xs text-ink-300">Ação</label>
        <select value={action} onChange={(e) => changeAction(e.target.value)} className="mt-1 w-full rounded-xl border border-ink-100 px-3 py-2.5 text-sm dark:border-ink-700 dark:bg-ink-900">
          <option value="status">Alterar status</option>
          <option value="categoriaId">Alterar categoria</option>
          <option value="dataVencimento">Alterar vencimento</option>
          <option value="observacoes">Adicionar observação</option>
        </select>

        <label className="mt-3 block text-xs text-ink-300">Novo valor</label>
        {action === 'status' && (
          <select value={value} onChange={(e) => setValue(e.target.value)} className="mt-1 w-full rounded-xl border border-ink-100 px-3 py-2.5 text-sm dark:border-ink-700 dark:bg-ink-900">
            {tipo === 'receita'
              ? <><option value="recebido">Recebido</option><option value="pendente">Pendente</option><option value="agendado">Agendado</option></>
              : <><option value="pago">Pago</option><option value="pendente">Pendente</option><option value="atrasado">Atrasado</option><option value="agendado">Agendado</option></>}
          </select>
        )}
        {action === 'categoriaId' && (
          <select value={value} onChange={(e) => setValue(e.target.value)} className="mt-1 w-full rounded-xl border border-ink-100 px-3 py-2.5 text-sm dark:border-ink-700 dark:bg-ink-900">
            <option value="">Sem categoria</option>
            {categorias.filter((item) => item.tipo === tipo).map((item) => <option key={item.id} value={item.id}>{item.nome}</option>)}
          </select>
        )}
        {action === 'dataVencimento' && <input required type="date" value={value} onChange={(e) => setValue(e.target.value)} className="mt-1 w-full rounded-xl border border-ink-100 px-3 py-2.5 text-sm dark:border-ink-700 dark:bg-ink-900" />}
        {action === 'observacoes' && <textarea rows="3" value={value} onChange={(e) => setValue(e.target.value)} className="mt-1 w-full resize-none rounded-xl border border-ink-100 px-3 py-2.5 text-sm dark:border-ink-700 dark:bg-ink-900" />}

        <div className="mt-5 flex gap-2">
          <button onClick={onClose} className="flex-1 rounded-xl py-2.5 text-sm text-ink-500">Cancelar</button>
          <button disabled={action !== 'categoriaId' && !value} onClick={() => onApply(action, value)} className="flex-1 rounded-xl bg-ledger-500 py-2.5 text-sm font-medium text-white disabled:opacity-50">Aplicar</button>
        </div>
      </div>
    </div>
  );
}
