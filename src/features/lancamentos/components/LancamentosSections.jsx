import { CheckSquare, Download, FileUp, Plus, Repeat, Search, Sprout, Trash2, X } from 'lucide-react';
import { formatCurrency } from '../../../utils/formatCurrency.js';
import LancamentoRow from './LancamentoRow.jsx';

export function LancamentoTabs({ tab, onChange }) {
  return (
    <div className="flex gap-2 mb-4">
      <TabButton active={tab === 'despesa'} onClick={() => onChange('despesa')}>
        Despesas
      </TabButton>
      <TabButton active={tab === 'receita'} onClick={() => onChange('receita')} positive>
        Receitas
      </TabButton>
    </div>
  );
}

function TabButton({ active, positive = false, onClick, children }) {
  const activeClass = positive
    ? 'bg-ledger-500 text-white shadow-card'
    : 'bg-ink-900 text-white shadow-card dark:bg-ink-50 dark:text-ink-900';
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 rounded-xl py-2.5 md:py-3 text-sm md:text-base font-medium transition-colors ${
        active ? activeClass : 'bg-ink-50 text-ink-500 dark:bg-ink-700 dark:text-ink-100'
      }`}
    >
      {children}
    </button>
  );
}

export function LancamentosSearch({ busca, onChange }) {
  return (
    <div className="relative mb-4">
      <Search size={16} strokeWidth={2} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-300" />
      <input
        value={busca}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Pesquisar: pix, mercado, junho, acima de 500..."
        className="w-full rounded-pill border border-ink-100 bg-white dark:bg-ink-900 dark:border-ink-700 text-ink-900 dark:text-ink-50 pl-10 pr-4 py-2.5 text-sm focus:border-ledger-500 transition-colors"
      />
    </div>
  );
}

export function LancamentosActions({
  filteredCount,
  totalCount,
  onDeleteAll,
  onExport,
  onImport,
  onToggleSelecting,
  selecting,
  onNew,
}) {
  return (
    <div className="flex justify-between items-center mb-4 gap-2">
      <div className="flex items-center gap-2 min-w-0">
        <p className="text-sm text-ink-300 shrink-0">{filteredCount} lançamento(s)</p>
        {totalCount > 0 && (
          <button
            type="button"
            onClick={onDeleteAll}
            aria-label="Excluir lançamentos deste período"
            className="text-ink-300 hover:text-signal-500 transition-colors shrink-0"
          >
            <Trash2 size={14} strokeWidth={2} />
          </button>
        )}
        {filteredCount > 0 && (
          <button
            type="button"
            onClick={onExport}
            aria-label="Exportar para CSV"
            className="text-ink-300 hover:text-ledger-600 transition-colors shrink-0"
          >
            <Download size={14} strokeWidth={2} />
          </button>
        )}
        <button
          type="button"
          onClick={onImport}
          aria-label="Importar extrato CSV ou OFX"
          className="text-ink-300 hover:text-ledger-600 transition-colors shrink-0"
        >
          <FileUp size={14} strokeWidth={2} />
        </button>
        {totalCount > 0 && (
          <button type="button" onClick={onToggleSelecting} aria-label="Selecionar lançamentos" className={selecting ? 'text-ledger-600' : 'text-ink-300 hover:text-ledger-600'}>
            <CheckSquare size={14} />
          </button>
        )}
      </div>
      <button
        type="button"
        onClick={onNew}
        className="flex items-center gap-1.5 rounded-pill bg-ledger-500 text-white pl-3.5 pr-4 py-2.5 text-sm font-medium hover:bg-ledger-600 hover:shadow-card-hover transition-all"
      >
        <Plus size={16} strokeWidth={2.25} />
        Novo <span className="hidden sm:inline text-ledger-200">(N)</span>
      </button>
    </div>
  );
}

export function LancamentosList({
  items,
  totalCount,
  busca,
  categoriasById,
  onStatusChange,
  onSelect,
  onNew,
  selecting = false,
  selectedIds = new Set(),
  onToggle,
}) {
  return (
    <div className="flex flex-col gap-2">
      {items.map((item) => (
        <LancamentoRow
          key={item.id}
          lancamento={item}
          categoria={categoriasById[item.categoriaId]}
          onStatusChange={onStatusChange}
          onClick={onSelect}
          selecting={selecting}
          selected={selectedIds.has(item.id)}
          onToggle={onToggle}
        />
      ))}
      {totalCount === 0 && (
        <div className="flex flex-col items-center gap-3 text-center py-14 px-4">
          <span className="w-12 h-12 rounded-full bg-ledger-50 text-ledger-500 flex items-center justify-center">
            <Sprout size={22} strokeWidth={1.75} />
          </span>
          <p className="text-sm text-ink-300 max-w-[220px]">
            Nenhum lançamento neste período ainda. Que tal começar cadastrando um?
          </p>
          <button type="button" onClick={onNew} className="text-sm font-medium text-ledger-600 hover:underline">
            + Novo lançamento
          </button>
        </div>
      )}
      {totalCount > 0 && items.length === 0 && (
        <p className="text-sm text-ink-300 text-center py-8">
          Nenhum lançamento encontrado para &ldquo;{busca}&rdquo;.
        </p>
      )}
    </div>
  );
}

export function ActiveRecurrences({ items, onSelect, onEnd }) {
  if (items.length === 0) return null;

  return (
    <details className="mt-8 group">
      <summary className="flex items-center gap-1.5 text-sm text-ink-300 cursor-pointer select-none list-none">
        <Repeat size={14} strokeWidth={2} />
        Recorrências ativas ({items.length})
      </summary>
      <div className="flex flex-col gap-2 mt-3">
        {items.map((item) => (
          <div
            key={item.id}
            onClick={() => onSelect(item)}
            className="flex items-center justify-between gap-3 px-4 py-2.5 bg-white dark:bg-ink-700 rounded-card shadow-card cursor-pointer hover:shadow-card-hover hover:-translate-y-px transition-all"
          >
            <div className="min-w-0">
              <p className="text-sm font-medium text-ink-900 dark:text-ink-50 truncate">{item.descricao}</p>
              <p className="text-xs text-ink-300">Todo dia {item.diaVencimento}</p>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <span className={`money text-sm font-semibold ${
                item.tipo === 'receita' ? 'text-ledger-600' : 'text-ink-900 dark:text-ink-50'
              }`}>
                {formatCurrency(item.valor)}
              </span>
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  onEnd(item);
                }}
                aria-label="Encerrar recorrência"
                className="flex items-center gap-1 text-xs text-signal-500 hover:bg-signal-50 rounded-pill px-2 py-1 transition-colors"
              >
                <X size={13} strokeWidth={2.25} />
                Encerrar
              </button>
            </div>
          </div>
        ))}
      </div>
    </details>
  );
}
