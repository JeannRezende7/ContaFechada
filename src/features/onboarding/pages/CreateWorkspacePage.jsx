import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createWorkspace } from '../services/workspaceService.js';
import { useAuth } from '../../../contexts/AuthContext.jsx';
import { slugify } from '../../../utils/slug.js';

export default function CreateWorkspacePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const slug = await createWorkspace({ name: name.trim(), ownerId: user.uid, ownerEmail: user.email });
      navigate(`/${slug}`);
    } catch (err) {
      setError('Não foi possível criar o workspace. Tente novamente.');
      console.error(err);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <h2 className="font-display text-lg font-semibold mb-1">Crie seu espaço de trabalho</h2>
      <p className="text-ink-300 text-sm mb-6">
        É onde vivem as contas, categorias e relatórios da sua empresa ou equipe.
      </p>

      <label className="block text-sm font-medium text-ink-900 mb-1" htmlFor="workspace-name">
        Nome do workspace
      </label>
      <input
        id="workspace-name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Ex: Padaria do Jan"
        className="w-full rounded-md border border-ink-100 px-3 py-2 text-sm mb-1 focus:border-ledger-500"
        autoFocus
      />
      {name.trim() && (
        <p className="text-xs text-ink-300 mb-4">
          Endereço: <span className="money">seusaas.com/{slugify(name)}</span>
        </p>
      )}

      {error && <p className="text-signal-500 text-sm mb-3">{error}</p>}

      <button
        type="submit"
        disabled={saving || !name.trim()}
        className="w-full rounded-md bg-ledger-500 text-white py-2.5 text-sm font-medium
                   hover:bg-ledger-600 transition-colors disabled:opacity-60"
      >
        {saving ? 'Criando…' : 'Criar workspace'}
      </button>
    </form>
  );
}
