import { ArrowDownRight, ArrowUpRight, Repeat, Layers } from 'lucide-react';
import { formatCurrency } from '../../../utils/formatCurrency.js';
import { formatDateBR } from '../../../utils/formatDate.js';
import { getColor } from '../../categorias/colorMap.js';
import { getIcon } from '../../categorias/iconMap.js';
import StatusBadge from './StatusBadge.jsx';

export default function LancamentoRow({ lancamento, categoria, onStatusChange, onClick }) {
  const isReceita = lancamento.tipo === 'receita';
  const Icon = isReceita ? ArrowUpRight : ArrowDownRight;
  const CategoriaIcon = categoria ? getIcon(categoria.icone) : null;

  return (
    <div
      onClick={() => onClick(lancamento)}
      className="flex items-center justify-between gap-3 px-4 py-3 md:px-5 md:py-4 bg-white dark:bg-ink-700 rounded-card shadow-card
                 cursor-pointer hover:shadow-card-hover hover:-translate-y-px transition-all"
    >
      <div className="flex items-center gap-3 md:gap-4 min-w-0 flex-1">
        <span
          className={`w-9 h-9 md:w-11 md:h-11 rounded-full flex items-center justify-center shrink-0 ${
            categoria ? getColor(categoria.corKey).dot : isReceita ? 'bg-ledger-50 text-ledger-600' : 'bg-ink-50 dark:bg-ink-900 text-ink-500'
          }`}
        >
          {categoria ? (
            <CategoriaIcon size={16} strokeWidth={2.25} className="text-white md:w-5 md:h-5" />
          ) : (
            <Icon size={17} strokeWidth={2} className="md:w-5 md:h-5" />
          )}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm md:text-base font-medium text-ink-900 dark:text-ink-50 flex items-center gap-1.5 min-w-0">
            <span className="truncate">{lancamento.descricao}</span>
            {lancamento.origemRecorrenciaId && (
              <span title="Recorrente" className="text-clay-500 shrink-0">
                <Repeat size={12} strokeWidth={2.5} />
              </span>
            )}
          </p>
          <p className="text-xs md:text-sm text-ink-300">
            {formatDateBR(lancamento.dataVencimento)}
            {categoria && ` · ${categoria.nome}`}
          </p>
          {lancamento.parcelamentoId && (
            <p className="flex items-center gap-1 text-xs md:text-sm text-clay-600 mt-0.5">
              <Layers size={11} strokeWidth={2.5} />
              Parcela {lancamento.parcelaAtual}/{lancamento.totalParcelas}
            </p>
          )}
        </div>
      </div>

      <div className="flex flex-col items-end gap-1 shrink-0">
        <span className={`money text-sm md:text-base font-semibold whitespace-nowrap ${isReceita ? 'text-ledger-600' : 'text-ink-900 dark:text-ink-50'}`}>
          {isReceita ? '+' : '-'} {formatCurrency(lancamento.valor)}
        </span>
        <div onClick={(e) => e.stopPropagation()}>
          <StatusBadge
            status={lancamento.status}
            tipo={lancamento.tipo}
            onChange={(status) => onStatusChange(lancamento.id, status)}
          />
        </div>
      </div>
    </div>
  );
}
