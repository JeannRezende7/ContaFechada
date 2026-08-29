import { useEffect, useState } from 'react';
import { ArrowRight, Plus, Sparkles, Trash2 } from 'lucide-react';
import { useConfirm } from '../../../contexts/ConfirmContext.jsx';
import { repositories } from '../../../repositories/index.js';
import { usePremium } from '../../../contexts/PremiumContext.jsx';
import { FEATURES } from '../../../config/premium.js';
import FeedbackMessage from '../../../components/ui/FeedbackMessage.jsx';
import CategoriaPicker from './CategoriaPicker.jsx';

export default function RegrasCategorizacao({ uid, categorias }) {
  const confirm = useConfirm();
  const { canUse, openPaywall, loading } = usePremium();
  const allowed = canUse(FEATURES.REGRAS_CATEGORIZACAO);
  const [rules, setRules] = useState([]);
  const [form, setForm] = useState({ termo: '', tipo: 'despesa', categoriaId: '', prioridade: 0 });
  const [feedback, setFeedback] = useState('');
  const [busy, setBusy] = useState('');

  async function reload() { setRules(await repositories.regrasCategorizacao.list(uid)); }

  useEffect(() => {
    if (uid && allowed) reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid, allowed]);

  if (loading) return null;
  if (!allowed) return (
    <section className="mt-10 rounded-card bg-white p-5 text-center shadow-card dark:bg-ink-700">
      <p className="text-sm font-medium">Regras automáticas fazem parte do Premium.</p>
      <button onClick={() => openPaywall({ feature: FEATURES.REGRAS_CATEGORIZACAO })} className="mt-2 text-sm font-medium text-ledger-600 hover:underline">Conhecer o Pro</button>
    </section>
  );

  const available = categorias.filter((item) => item.tipo === form.tipo);

  async function create(event) {
    event.preventDefault();
    if (!form.termo.trim() || !form.categoriaId) return;
    setBusy('create'); setFeedback('');
    try {
      await repositories.regrasCategorizacao.create(uid, { ...form, termo: form.termo.trim(), prioridade: Number(form.prioridade) || 0 });
      setForm((current) => ({ ...current, termo: '', categoriaId: '' }));
      await reload(); setFeedback('Regra criada.');
    } catch { setFeedback('Não foi possível criar a regra. Tente novamente.'); }
    finally { setBusy(''); }
  }

  async function applyOld() {
    if (!await confirm('Aplicar as regras também aos lançamentos antigos sem categoria? Categorias já definidas serão preservadas.')) return;
    setBusy('apply'); setFeedback('');
    try {
      const count = await repositories.regrasCategorizacao.aplicarAosAntigos(uid, rules, await repositories.lancamentos.listAll(uid));
      setFeedback(`${count} lançamento(s) antigo(s) categorizado(s).`);
    } catch { setFeedback('Não foi possível aplicar as regras. Tente novamente.'); }
    finally { setBusy(''); }
  }

  async function updateRule(id, changes) {
    setBusy(id); setFeedback('');
    try { await repositories.regrasCategorizacao.update(uid, id, changes); await reload(); setFeedback('Regra atualizada.'); }
    catch { setFeedback('Não foi possível atualizar a regra. Tente novamente.'); }
    finally { setBusy(''); }
  }

  async function removeRule(id) {
    setBusy(id); setFeedback('');
    try { await repositories.regrasCategorizacao.remove(uid, id); await reload(); setFeedback('Regra excluída.'); }
    catch { setFeedback('Não foi possível excluir a regra. Tente novamente.'); }
    finally { setBusy(''); }
  }

  return (
    <section className="mt-8 border-t border-ink-100 pt-6 dark:border-ink-700">
      <div className="mb-4">
        <h2 className="flex items-center gap-2 text-base font-semibold text-ink-900 dark:text-ink-50"><Sparkles size={18} /> Categorização automática</h2>
        <p className="mt-1 text-sm text-ink-300">O app escolhe uma categoria quando encontra uma palavra na descrição do lançamento.</p>
        <div className="mt-3 flex items-center gap-2 rounded-xl bg-ledger-50 px-3 py-2.5 text-sm text-ink-500 dark:bg-ink-700 dark:text-ink-100">
          <span className="font-medium">Exemplo:</span> “Uber” <ArrowRight size={15} className="shrink-0 text-ledger-500" /> Transporte
        </div>
      </div>

      <form onSubmit={create} className="overflow-hidden rounded-card bg-white shadow-card dark:bg-ink-700">
        <div className="border-b border-ink-100 p-4 dark:border-ink-900">
          <h3 className="text-sm font-semibold text-ink-900 dark:text-ink-50">Nova regra</h3>
          <p className="mt-1 text-xs text-ink-300">Escolha uma palavra e para qual categoria ela deve apontar.</p>
        </div>
        <div className="space-y-4 p-4">
          <label className="block text-sm font-medium text-ink-900 dark:text-ink-50"><span className="mb-1.5 flex items-center gap-2"><b className="flex h-5 w-5 items-center justify-center rounded-full bg-ledger-500 text-[11px] text-white">1</b> Palavra ou nome</span>
            <input required placeholder="Ex.: Uber, mercado ou aluguel" value={form.termo} onChange={(e) => setForm({ ...form, termo: e.target.value })} className="w-full rounded-xl border border-ink-100 bg-ink-50/60 px-3 py-2.5 text-sm dark:border-ink-700 dark:bg-ink-900" />
          </label>
          <div>
            <p className="mb-1.5 flex items-center gap-2 text-sm font-medium"><b className="flex h-5 w-5 items-center justify-center rounded-full bg-ledger-500 text-[11px] text-white">2</b> É uma</p>
            <div className="grid grid-cols-2 gap-2 rounded-xl bg-ink-50 p-1 dark:bg-ink-900">
              <button type="button" onClick={() => setForm({ ...form, tipo: 'despesa', categoriaId: '' })} className={`rounded-lg px-3 py-2 text-sm font-medium ${form.tipo === 'despesa' ? 'bg-expense-500 text-white shadow-card' : 'text-ink-500 dark:text-ink-100'}`}>Despesa</button>
              <button type="button" onClick={() => setForm({ ...form, tipo: 'receita', categoriaId: '' })} className={`rounded-lg px-3 py-2 text-sm font-medium ${form.tipo === 'receita' ? 'bg-ledger-500 text-white shadow-card' : 'text-ink-500 dark:text-ink-100'}`}>Receita</button>
            </div>
          </div>
          <div>
            <p className="mb-1.5 flex items-center gap-2 text-sm font-medium"><b className="flex h-5 w-5 items-center justify-center rounded-full bg-ledger-500 text-[11px] text-white">3</b> Usar categoria</p>
            <CategoriaPicker categorias={available} value={form.categoriaId} onChange={(categoriaId) => setForm({ ...form, categoriaId })} emptyLabel="Escolha uma categoria" />
          </div>
          <details className="rounded-xl border border-ink-100 px-3 py-2 text-xs text-ink-300 dark:border-ink-700">
            <summary className="cursor-pointer font-medium text-ink-500 dark:text-ink-100">Prioridade da regra (opcional)</summary>
            <label className="mt-2 block">Se duas regras combinarem, o maior número vence.<input type="number" inputMode="numeric" value={form.prioridade} onChange={(e) => setForm({ ...form, prioridade: e.target.value })} className="mt-1.5 w-full rounded-xl border border-ink-100 bg-ink-50 px-3 py-2 text-sm dark:border-ink-700 dark:bg-ink-900" /></label>
          </details>
          <button disabled={Boolean(busy) || !form.termo.trim() || !form.categoriaId} className="flex min-h-12 w-full items-center justify-center gap-1.5 rounded-xl bg-ledger-500 px-3 text-sm font-semibold text-white shadow-card disabled:cursor-not-allowed disabled:opacity-45"><Plus size={17} /> {busy === 'create' ? 'Criando…' : 'Criar regra'}</button>
        </div>
      </form>

      {rules.length > 0 && <h3 className="mb-2 mt-5 text-sm font-semibold text-ink-900 dark:text-ink-50">Regras criadas</h3>}
      <div className="space-y-2">
        {rules.map((rule) => (
          <div key={rule.id} className="grid grid-cols-[auto_1fr_auto] items-center gap-3 rounded-xl bg-white p-3 text-sm shadow-card dark:bg-ink-700">
            <button disabled={Boolean(busy)} onClick={() => updateRule(rule.id, { ativa: rule.ativa === false })} aria-label={rule.ativa === false ? 'Ativar regra' : 'Desativar regra'} className={`h-5 w-9 rounded-pill p-0.5 disabled:opacity-50 ${rule.ativa === false ? 'bg-ink-100' : 'bg-ledger-500'}`}><span className={`block h-4 w-4 rounded-full bg-white transition-transform ${rule.ativa === false ? '' : 'translate-x-4'}`} /></button>
            <div className="min-w-0"><p className="mb-1 text-xs text-ink-300">Descrição contém</p><input defaultValue={rule.termo} onBlur={(e) => e.target.value.trim() && e.target.value.trim() !== rule.termo && updateRule(rule.id, { termo: e.target.value.trim() })} className="w-full rounded-lg border border-transparent bg-transparent px-1 py-1 text-sm hover:border-ink-100 dark:hover:border-ink-700" /></div>
            <button disabled={Boolean(busy)} onClick={() => removeRule(rule.id)} aria-label="Excluir regra" className="text-ink-300 hover:text-signal-500 disabled:opacity-50"><Trash2 size={17} /></button>
            <div className="col-span-2 col-start-2 grid grid-cols-[1fr_70px] gap-2">
              <select value={rule.categoriaId} aria-label="Categoria da regra" onChange={(e) => updateRule(rule.id, { categoriaId: e.target.value })} className="min-w-0 rounded-lg border border-ink-100 bg-transparent px-2 py-2 text-xs dark:border-ink-700">{categorias.filter((item) => item.tipo === rule.tipo).map((item) => <option key={item.id} value={item.id}>{item.nome}</option>)}</select>
              <input type="number" title="Prioridade" defaultValue={rule.prioridade || 0} onBlur={(e) => Number(e.target.value) !== Number(rule.prioridade || 0) && updateRule(rule.id, { prioridade: Number(e.target.value) || 0 })} className="w-full rounded-lg border border-ink-100 bg-transparent px-2 py-2 text-xs dark:border-ink-700" aria-label="Prioridade" />
            </div>
          </div>
        ))}
      </div>
      {rules.length > 0 && <button disabled={Boolean(busy)} onClick={applyOld} className="mt-3 w-full rounded-xl border border-ink-100 px-3 py-2.5 text-sm font-medium text-ledger-600 hover:bg-ledger-50 disabled:opacity-50 dark:border-ink-700 dark:hover:bg-ink-700">{busy === 'apply' ? 'Aplicando…' : 'Aplicar regras aos lançamentos antigos'}</button>}
      <FeedbackMessage message={feedback} error={feedback.startsWith('Não foi')} className="mt-2" />
    </section>
  );
}
