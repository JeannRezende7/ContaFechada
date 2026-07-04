const STATUS_CONFIG = {
  pendente: { label: 'Pendente', className: 'bg-ink-100 text-ink-500' },
  agendado: { label: 'Agendado', className: 'bg-pending-400/15 text-pending-500' },
  atrasado: { label: 'Atrasado', className: 'bg-signal-50 text-signal-500' },
  pago: { label: 'Pago', className: 'bg-ledger-50 text-ledger-600' },
  recebido: { label: 'Recebido', className: 'bg-ledger-50 text-ledger-600' },
};

const OPTIONS = Object.keys(STATUS_CONFIG);

/** Tap to cycle/select status directly in the row — no need to open the edit modal. */
export default function StatusBadge({ status, onChange }) {
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.pendente;

  return (
    <select
      value={status}
      onChange={(e) => onChange(e.target.value)}
      className={`text-xs font-medium rounded-full px-2.5 py-1 border-0 cursor-pointer ${config.className}`}
    >
      {OPTIONS.map((key) => (
        <option key={key} value={key}>
          {STATUS_CONFIG[key].label}
        </option>
      ))}
    </select>
  );
}
