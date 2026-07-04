import { useState } from 'react';
import { Trash2, Tag } from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext.jsx';
import { deleteAllLancamentos } from '../../lancamentos/services/lancamentosService.js';
import { deleteAllCategorias } from '../../categorias/services/categoriasService.js';
import Topbar from '../../../components/layout/Topbar.jsx';

export default function OpcoesPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(null);

  async function handleZerarLancamentos() {
    if (!confirm('Excluir TODOS os lançamentos? Essa ação não pode ser desfeita.')) return;
    setLoading('lancamentos');
    await deleteAllLancamentos(user.uid);
    window.location.reload();
  }

  async function handleZerarCategorias() {
    if (!confirm('Excluir TODAS as categorias? As categorias padrão voltam na próxima visita. Essa ação não pode ser desfeita.')) return;
    setLoading('categorias');
    await deleteAllCategorias(user.uid);
    window.location.reload();
  }

  return (
    <>
      <Topbar title="Opções" />
      <div className="p-4 md:p-8 max-w-2xl flex flex-col gap-4">
        <p className="text-sm text-ink-300">
          Ações abaixo afetam todos os seus dados e não podem ser desfeitas.
        </p>

        <div className="bg-white rounded-card shadow-card p-4 flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-ink-900">Zerar lançamentos</p>
            <p className="text-xs text-ink-300 mt-0.5">
              Apaga todos os lançamentos. Recorrências continuam ativas e voltam a gerar entradas.
            </p>
          </div>
          <button
            onClick={handleZerarLancamentos}
            disabled={loading === 'lancamentos'}
            className="shrink-0 flex items-center gap-1.5 rounded-pill bg-signal-50 text-signal-500 px-3.5 py-2 text-sm font-medium hover:bg-signal-100 transition-colors disabled:opacity-50"
          >
            <Trash2 size={15} strokeWidth={2} />
            Zerar
          </button>
        </div>

        <div className="bg-white rounded-card shadow-card p-4 flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-ink-900">Zerar categorias</p>
            <p className="text-xs text-ink-300 mt-0.5">
              Apaga todas as categorias. As categorias padrão voltam na próxima visita.
            </p>
          </div>
          <button
            onClick={handleZerarCategorias}
            disabled={loading === 'categorias'}
            className="shrink-0 flex items-center gap-1.5 rounded-pill bg-signal-50 text-signal-500 px-3.5 py-2 text-sm font-medium hover:bg-signal-100 transition-colors disabled:opacity-50"
          >
            <Tag size={15} strokeWidth={2} />
            Zerar
          </button>
        </div>
      </div>
    </>
  );
}
