import { useEffect, useState, useCallback } from 'react';
import { useTenant } from '../../../contexts/TenantContext.jsx';
import {
  listLancamentos,
  createLancamento,
  updateLancamento,
  setLancamentoStatus,
} from '../services/lancamentosService.js';
import LancamentoRow from '../components/LancamentoRow.jsx';
import LancamentoModal from '../components/LancamentoModal.jsx';
import Topbar from '../../../components/layout/Topbar.jsx';

export default function LancamentosPage() {
  const { slug } = useTenant();
  const [lancamentos, setLancamentos] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const reload = useCallback(() => {
    if (!slug) return;
    listLancamentos(slug).then(setLancamentos);
  }, [slug]);

  useEffect(() => {
    reload();
  }, [reload]);

  // Keyboard shortcut for quick entry (REQ "Lançamentos Rápidos"): press "n".
  useEffect(() => {
    function handleKey(e) {
      if (e.key === 'n' && !modalOpen && document.activeElement.tagName !== 'INPUT') {
        setEditing(null);
        setModalOpen(true);
      }
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [modalOpen]);

  async function handleSave(data) {
    if (editing) {
      await updateLancamento(slug, editing.id, data);
    } else {
      await createLancamento(slug, data);
    }
    setModalOpen(false);
    reload();
  }

  async function handleStatusChange(id, status) {
    await setLancamentoStatus(slug, id, status);
    reload();
  }

  return (
    <>
      <Topbar title="Lançamentos" />
      <div className="p-4 md:p-8">
        <div className="flex justify-between items-center mb-4">
          <p className="text-sm text-ink-300">{lancamentos.length} lançamento(s)</p>
          <button
            onClick={() => {
              setEditing(null);
              setModalOpen(true);
            }}
            className="rounded-md bg-ledger-500 text-white px-4 py-2 text-sm font-medium hover:bg-ledger-600"
          >
            + Novo <span className="hidden sm:inline text-ledger-200">(N)</span>
          </button>
        </div>

        <div className="flex flex-col gap-2">
          {lancamentos.map((l) => (
            <LancamentoRow
              key={l.id}
              lancamento={l}
              onStatusChange={handleStatusChange}
              onClick={(item) => {
                setEditing(item);
                setModalOpen(true);
              }}
            />
          ))}
          {lancamentos.length === 0 && (
            <p className="text-sm text-ink-300 text-center py-10">
              Nenhum lançamento ainda. Toque em "Novo" para cadastrar o primeiro.
            </p>
          )}
        </div>
      </div>

      <LancamentoModal
        open={modalOpen}
        initialData={editing}
        onClose={() => setModalOpen(false)}
        onSave={handleSave}
      />
    </>
  );
}
