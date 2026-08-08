import { useEffect, useState } from 'react';
import { Plus, Sparkles, Trash2 } from 'lucide-react';
import { useConfirm } from '../../../contexts/ConfirmContext.jsx';
import { repositories } from '../../../repositories/index.js';
import { usePremium } from '../../../contexts/PremiumContext.jsx';
import { FEATURES } from '../../../config/premium.js';

export default function RegrasCategorizacao({ uid, categorias }) {
  const confirm = useConfirm();
  const { canUse, openPaywall, loading } = usePremium();
  const allowed = canUse(FEATURES.REGRAS_CATEGORIZACAO);
  const [rules, setRules] = useState([]);
  const [form, setForm] = useState({ termo: '', tipo: 'despesa', categoriaId: '', prioridade: 0 });
  const [feedback, setFeedback] = useState('');
  const [busy, setBusy] = useState('');

  async function reload() {
    setRules(await repositories.regrasCategorizacao.list(uid));
  }

  useEffect(() => {
    if (uid && allowed) reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid, allowed]);

  if (loading) return null;
  if (!allowed) {
    return (
      <section className="mt-10 rounded-card bg-white p-5 text-center shadow-card dark:bg-ink-700">
        <p className="text-sm font-medium">Regras automáticas fazem parte do Premium.</p>
        <button onClick={() => openPaywall({ feature: FEATURES.REGRAS_CATEGORIZACAO })} className="mt-2 text-sm font-medium text-ledger-600 hover:underline">Conhecer o Premium</button>
      </section>
    );
  }

  const available = categorias.filter((item) => item.tipo === form.tipo);

  async function create(event) {
    event.preventDefault();
    if (!form.termo.trim() || !form.categoriaId) return;
    setBusy('create');
    setFeedback('');
    try {
      await repositories.regrasCategorizacao.create(uid, { ...form, termo: form.termo.trim(), prioridade: Number(form.prioridade) || 0 });
      setForm((current) => ({ ...current, termo: '', categoriaId: '' }));
      await reload();
      setFeedback('Regra criada.');
    } catch {
      setFeedback('Não foi possível criar a regra. Tente novamente.');
    } finally {
      setBusy('');
    }
  }

  async function applyOld() {
    const overwrite = await confirm('Aplicar as regras também aos lançamentos antigos sem categoria? Categorias já definidas serão preservadas.');
    if (!overwrite) return;
    setBusy('apply');
    setFeedback('');
    try {
      const count = await repositories.regrasCategorizacao.aplicarAosAntigos(uid, rules, await repositories.lancamentos.listAll(uid));
      setFeedback(`${count} lançamento(s) antigo(s) categorizado(s).`);
    } catch {
      setFeedback('Não foi possível aplicar as regras. Tente novamente.');
    } finally {
      setBusy('');
    }
  }

  async function updateRule(id, changes, message = 'Regra atualizada.') {
    setBusy(id);
    setFeedback('');
    try {
      await repositories.regrasCategorizacao.update(uid, id, changes);
      await reload();
      setFeedback(message);
    } catch {
      setFeedback('Não foi possível atualizar a regra. Tente novamente.');
    } finally {
      setBusy('');
    }
  }

  async function removeRule(id) {
    setBusy(id);
    setFeedback('');
    try {
      await repositories.regrasCategorizacao.remove(uid, id);
      await reload();
      setFeedback('Regra excluída.');
    } catch {
      setFeedback('Não foi possível excluir a regra. Tente novamente.');
    } finally {
      setBusy('');
    }
  }

  return (
    <section className="mt-10 border-t border-ink-100 pt-6 dark:border-ink-700">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-sm font-semibold text-ink-900 dark:text-ink-50"><Sparkles size={16} /> Regras automáticas</h2>
          <p className="mt-1 text-xs text-ink-300">A maior prioridade vence quando mais de uma regra combina.</p>
        </div>
        {rules.length > 0 && <button disabled={Boolean(busy)} onClick={applyOld} className="text-xs font-medium text-ledger-600 hover:underline disabled:opacity-50">{busy === 'apply' ? 'Aplicando…' : 'Aplicar aos antigos'}</button>}
      </div>

      <form onSubmit={create} className="grid grid-cols-2 gap-2 rounded-card bg-white p-3 shadow-card dark:bg-ink-700 sm:grid-cols-[1fr_120px_1fr_80px_auto]">
        <input required placeholder="Descrição contém…" value={form.termo} onChange={(e) => setForm({ ...form, termo: e.target.value })} className="rounded-xl border border-ink-100 px-3 py-2 text-sm dark:border-ink-700 dark:bg-ink-900" />
        <select value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value, categoriaId: '' })} className="rounded-xl border border-ink-100 px-2 py-2 text-sm dark:border-ink-700 dark:bg-ink-900">
          <option value="despesa">Despesa</option><option value="receita">Receita</option>
        </select>
        <select required value={form.categoriaId} onChange={(e) => setForm({ ...form, categoriaId: e.target.value })} className="rounded-xl border border-ink-100 px-2 py-2 text-sm dark:border-ink-700 dark:bg-ink-900">
          <option value="">Categoria</option>{available.map((item) => <option key={item.id} value={item.id}>{item.nome}</option>)}
        </select>
        <input type="number" title="Prioridade" value={form.prioridade} onChange={(e) => setForm({ ...form, prioridade: e.target.value })} className="rounded-xl border border-ink-100 px-2 py-2 text-sm dark:border-ink-700 dark:bg-ink-900" />
        <button disabled={Boolean(busy)} className="col-span-2 flex items-center justify-center gap-1 rounded-xl bg-ledger-500 px-3 py-2 text-sm text-white disabled:cursor-wait disabled:opacity-50 sm:col-span-1"><Plus size={14} /> {busy === 'create' ? 'Criando…' : 'Criar'}</button>
      </form>

      <div className="mt-3 space-y-2">
        {rules.map((rule) => (
          <div key={rule.id} className="flex items-center gap-3 rounded-xl bg-white px-3 py-2 text-sm shadow-card dark:bg-ink-700">
            <button disabled={Boolean(busy)} onClick={() => updateRule(rule.id, { ativa: rule.ativa === false })} className={`h-5 w-9 rounded-pill p-0.5 disabled:opacity-50 ${rule.ativa === false ? 'bg-ink-100' : 'bg-ledger-500'}`}>
              <span className={`block h-4 w-4 rounded-full bg-white transition-transform ${rule.ativa === false ? '' : 'translate-x-4'}`} />
            </button>
            <input
              defaultValue={rule.termo}
              onBlur={(e) => e.target.value.trim() && e.target.value.trim() !== rule.termo && updateRule(rule.id, { termo: e.target.value.trim() })}
              className="min-w-0 flex-1 rounded-lg border border-transparent bg-transparent px-1 py-1 text-sm hover:border-ink-100 dark:hover:border-ink-700"
            />
            <select
              value={rule.categoriaId}
              onChange={(e) => updateRule(rule.id, { categoriaId: e.target.value })}
              className="max-w-36 rounded-lg border border-ink-100 bg-transparent px-1 py-1 text-xs dark:border-ink-700"
            >
              {categorias.filter((item) => item.tipo === rule.tipo).map((item) => <option key={item.id} value={item.id}>{item.nome}</option>)}
            </select>
            <input
              type="number"
              defaultValue={rule.prioridade || 0}
              onBlur={(e) => Number(e.target.value) !== Number(rule.prioridade || 0) && updateRule(rule.id, { prioridade: Number(e.target.value) || 0 })}
              className="w-12 rounded-lg border border-ink-100 bg-transparent px-1 py-1 text-xs dark:border-ink-700"
              aria-label="Prioridade"
            />
            <button disabled={Boolean(busy)} onClick={() => removeRule(rule.id)} className="text-ink-300 hover:text-signal-500 disabled:opacity-50"><Trash2 size={14} /></button>
          </div>
        ))}
      </div>
      {feedback && <p role="status" aria-live="polite" className={`mt-2 text-xs ${feedback.startsWith('Não foi') ? 'text-signal-500' : 'text-ledger-600'}`}>{feedback}</p>}
    </section>
  );
}
