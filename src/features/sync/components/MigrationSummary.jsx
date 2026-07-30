import { CheckCircle2, Download } from 'lucide-react';

export default function MigrationSummary({ summary, completedAt, onDownloadBackup }) {
  if (!summary) return null;
  return (
    <section className="rounded-card bg-white p-5 shadow-card dark:bg-ink-700" role="status" aria-live="polite">
      <div className="flex items-center gap-2 text-ledger-600 dark:text-ledger-400">
        <CheckCircle2 size={18} />
        <h2 className="font-display text-base font-semibold">Migração concluída</h2>
      </div>
      <div className="mt-4 divide-y divide-ink-100 dark:divide-ink-900">
        {Object.entries(summary).map(([domain, values]) => (
          <div key={domain} className="flex items-center justify-between py-2.5 text-sm">
            <span className="capitalize text-ink-500">{domain}</span>
            <span className="font-medium text-ink-900 dark:text-ink-50">
              {values.count} registro{values.count === 1 ? '' : 's'}
              {values.sum != null ? ` · R$ ${Number(values.sum).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : ''}
            </span>
          </div>
        ))}
      </div>
      {completedAt && <p className="mt-3 text-xs text-ink-300">Concluída em {new Date(completedAt).toLocaleString('pt-BR')}.</p>}
      {onDownloadBackup && (
        <button type="button" onClick={onDownloadBackup} className="mt-4 flex items-center gap-2 text-sm font-medium text-ledger-600">
          <Download size={15} /> Baixar backup JSON
        </button>
      )}
    </section>
  );
}
