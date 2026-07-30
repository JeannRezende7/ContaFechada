import { CloudDownload, CloudUpload, Merge, ShieldCheck } from 'lucide-react';

const OPTIONS = [
  { key: 'upload', title: 'Enviar dados deste aparelho', description: 'Mantém os dados locais e envia uma cópia para a nuvem.', icon: CloudUpload },
  { key: 'download', title: 'Baixar dados da conta', description: 'Copia para este aparelho os dados que já estão na nuvem.', icon: CloudDownload },
  { key: 'merge', title: 'Mesclar os dois conjuntos', description: 'Compara os dois lados e preserva os registros mais recentes.', icon: Merge },
];

export default function FirstSyncPanel({ preview, busy = false, onChoose }) {
  const duplicates = preview?.lancamentos?.possiveisDuplicatas?.length ?? 0;
  return (
    <section className="rounded-card bg-white p-5 shadow-card dark:bg-ink-700" aria-labelledby="first-sync-title">
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-ledger-50 text-ledger-600 dark:bg-ledger-700/20 dark:text-ledger-400">
          <ShieldCheck size={18} />
        </span>
        <div>
          <h2 id="first-sync-title" className="font-display text-base font-semibold text-ink-900 dark:text-ink-50">Ativar backup neste aparelho</h2>
          <p className="mt-1 text-xs text-ink-300">Revise as quantidades antes de escolher. Nenhuma opção apaga dados automaticamente.</p>
        </div>
      </div>

      {preview && (
        <div className="mt-4 grid grid-cols-2 gap-2">
          {Object.entries(preview).map(([domain, counts]) => (
            <div key={domain} className="rounded-xl bg-ink-50 p-3 text-xs dark:bg-ink-900">
              <p className="font-medium capitalize text-ink-900 dark:text-ink-50">{domain}</p>
              <p className="mt-1 text-ink-300">Aparelho: {counts.local} · Nuvem: {counts.remoto}</p>
            </div>
          ))}
        </div>
      )}

      {duplicates > 0 && (
        <p className="mt-3 rounded-xl bg-pending-400/15 px-3 py-2 text-xs text-pending-500">
          Encontramos {duplicates} possível{duplicates === 1 ? '' : 'is'} lançamento{duplicates === 1 ? '' : 's'} equivalente{duplicates === 1 ? '' : 's'} para revisão.
        </p>
      )}

      <div className="mt-4 flex flex-col gap-2">
        {OPTIONS.map(({ key, title, description, icon: Icon }) => (
          <button key={key} type="button" disabled={busy} aria-describedby={`first-sync-${key}-description`} onClick={() => onChoose?.(key)} className="flex items-center gap-3 rounded-xl border border-ink-100 p-3 text-left transition-colors hover:border-ledger-500 disabled:opacity-50 dark:border-ink-900">
            <Icon size={18} className="shrink-0 text-ledger-600" />
            <span><span className="block text-sm font-medium">{title}</span><span id={`first-sync-${key}-description`} className="block text-xs text-ink-300">{description}</span></span>
          </button>
        ))}
      </div>
    </section>
  );
}
