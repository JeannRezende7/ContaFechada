import { CheckSquare, Download, FileUp, LayoutGrid, Plus, Repeat, Search, SlidersHorizontal, Sprout, X } from 'lucide-react';
import { formatCurrency } from '../../../utils/formatCurrency.js';
import CategoriaPicker from '../../categorias/components/CategoriaPicker.jsx';
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
    : 'bg-ink-900 text-white shadow-card dark:bg-ledger-500 dark:text-white';
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

export function LancamentosSearch({ busca, onChange, filtersOpen, filtersActive, onToggleFilters }) {
  return (
    <div className="mb-4 flex items-center gap-2">
      <div className="relative min-w-0 flex-1">
        <Search size={16} strokeWidth={2} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-300" />
        <input
          value={busca}
          onChange={(event) => onChange(event.target.value)}
          placeholder="Pesquisar: pix, mercado, junho, acima de 500..."
          className="w-full rounded-pill border border-ink-100 bg-white dark:bg-ink-900 dark:border-ink-700 text-ink-900 dark:text-ink-50 pl-10 pr-4 py-2.5 text-sm focus:border-ledger-500 transition-colors"
        />
      </div>
      <button
        type="button"
        onClick={onToggleFilters}
        aria-label="Abrir filtros"
        aria-expanded={filtersOpen}
        className={`relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full border transition-colors ${
          filtersOpen || filtersActive
            ? 'border-ledger-500 bg-ledger-500 text-white'
            : 'border-ink-100 bg-white text-ink-300 hover:text-ledger-600 dark:border-ink-700 dark:bg-ink-900'
        }`}
      >
        <SlidersHorizontal size={17} strokeWidth={2} />
        {filtersActive && !filtersOpen && <span className="absolute right-0 top-0 h-2.5 w-2.5 rounded-full border-2 border-white bg-ledger-500 dark:border-ink-900" />}
      </button>
    </div>
  );
}

const QUICK_FILTERS = [
  { key: 'todos', label: 'Todos' },
  { key: 'pendente', label: 'Pendentes' },
  { key: 'atrasado', label: 'Atrasados' },
  { key: 'concluido', label: 'Pagos/recebidos' },
  { key: 'sem_categoria', label: 'Sem categoria' },
];

export function LancamentosFilters({ open, quickFilter, categoryFilter, categorias, onQuickChange, onCategoryChange, onClear }) {
  if (!open) return null;
  return (
    <div className="mb-4 rounded-card bg-white p-3 shadow-card dark:bg-ink-700 sm:p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-ink-900 dark:text-ink-50">Filtrar lançamentos</p>
        <button type="button" onClick={onClear} className="text-xs text-ledger-600 hover:underline">Limpar</button>
      </div>
      <div className="space-y-3">
        <div>
          <p className="mb-1.5 text-xs text-ink-300">Status</p>
          <div className="flex flex-wrap gap-2" aria-label="Filtros rápidos">
            {QUICK_FILTERS.map((filter) => (
              <button
                key={filter.key}
                type="button"
                aria-pressed={quickFilter === filter.key}
                onClick={() => onQuickChange(filter.key)}
                className={`rounded-pill px-3 py-1.5 text-xs font-medium transition-colors ${
                  quickFilter === filter.key
                    ? 'bg-ledger-500 text-white'
                    : 'bg-ink-50 text-ink-500 hover:text-ledger-600 dark:bg-ink-900 dark:text-ink-100'
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>
        <div className="border-t border-ink-100 pt-3 dark:border-ink-700">
          <p className="mb-1.5 text-xs text-ink-300">Categoria</p>
          <div className="max-w-md">
            <CategoriaPicker
              categorias={categorias}
              value={categoryFilter}
              onChange={onCategoryChange}
              emptyLabel="Todas as categorias"
              EmptyIcon={LayoutGrid}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export function LancamentosActions({
  filteredCount,
  totalCount,
  onExport,
  onImport,
  onToggleSelecting,
  selecting,
  onNew,
}) {
  return (
    <div className="mb-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-ink-300">{filteredCount} lançamento(s)</p>
        <button
          type="button"
          onClick={onNew}
          className="flex shrink-0 items-center gap-1.5 rounded-pill bg-ledger-500 text-white pl-3.5 pr-4 py-2.5 text-sm font-medium hover:bg-ledger-600 hover:shadow-card-hover transition-all"
        >
          <Plus size={16} strokeWidth={2.25} />
          Novo <span className="hidden sm:inline text-ledger-200">(N)</span>
        </button>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 min-w-0">
        {totalCount > 0 && (
          <button type="button" onClick={onToggleSelecting} className="flex items-center gap-1 text-xs font-medium text-ledger-500 md:hover:text-ledger-600 transition-colors">
            <CheckSquare size={14} />
            {selecting ? 'Sair' : 'Gerenciar vários'}
          </button>
        )}
        {filteredCount > 0 && (
          <button
            type="button"
            onClick={onExport}
            className="flex items-center gap-1 text-xs text-ink-300 md:hover:text-ledger-600 transition-colors shrink-0"
          >
            <Download size={14} strokeWidth={2} />
            Exportar
          </button>
        )}
        <button
          type="button"
          onClick={onImport}
          className="flex items-center gap-1 text-xs text-ink-300 md:hover:text-ledger-600 transition-colors shrink-0"
        >
          <FileUp size={14} strokeWidth={2} />
          Importar
        </button>
      </div>
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
  filtersActive = false,
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
          {filtersActive
            ? 'Nenhum lançamento corresponde aos filtros selecionados.'
            : <>Nenhum lançamento encontrado para &ldquo;{busca}&rdquo;.</>}
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
