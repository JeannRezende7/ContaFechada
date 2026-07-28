import { useState } from 'react';
import { CheckCircle2, ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';
import { completeOnboarding, skipOnboarding } from '../services/onboardingService.js';

const INITIAL = {
  incomeDescription: 'Renda principal', incomeValue: '', incomeDay: '5',
  expenseDescription: '', expenseValue: '', expenseDay: '10', goalName: '', goalValue: '',
};

export default function OnboardingWizard({ uid, open, onClose }) {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState(INITIAL);
  const [saving, setSaving] = useState(false);
  if (!open) return null;
  const update = (field, value) => setForm((current) => ({ ...current, [field]: value }));

  async function skip() {
    await skipOnboarding(uid);
    onClose();
  }
  async function finish() {
    setSaving(true);
    try {
      await completeOnboarding(uid, form);
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink-900/60 sm:items-center sm:px-4">
      <div className="max-h-[92vh] w-full overflow-y-auto rounded-t-card bg-white p-5 shadow-pop dark:bg-ink-700 sm:max-w-lg sm:rounded-card sm:p-6">
        <div className="mb-5 flex gap-1">{[0, 1, 2, 3, 4].map((item) => <span key={item} className={`h-1.5 flex-1 rounded-pill ${item <= step ? 'bg-ledger-500' : 'bg-ink-100 dark:bg-ink-900'}`} />)}</div>
        {step === 0 && <Intro />}
        {step === 1 && <RecurringForm title="Sua renda principal" description="Ela será criada como receita recorrente mensal." prefix="income" form={form} update={update} />}
        {step === 2 && <RecurringForm title="Primeira conta recorrente" description="Você pode pular e cadastrar outras depois." prefix="expense" form={form} update={update} />}
        {step === 3 && <GoalForm form={form} update={update} />}
        {step === 4 && <Summary form={form} />}
        <div className="mt-7 flex items-center gap-2">
          {step === 0
            ? <button onClick={skip} className="text-sm text-ink-300 hover:text-ink-500">Pular por agora</button>
            : <button onClick={() => setStep((value) => value - 1)} className="flex items-center gap-1 text-sm text-ink-500"><ChevronLeft size={15} /> Voltar</button>}
          <button disabled={saving} onClick={step === 4 ? finish : () => setStep((value) => value + 1)} className="ml-auto flex items-center gap-1 rounded-pill bg-ledger-500 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50">
            {step === 4 ? (saving ? 'Salvando…' : 'Concluir') : <>Continuar <ChevronRight size={15} /></>}
          </button>
        </div>
      </div>
    </div>
  );
}

function Intro() {
  return <div className="py-3 text-center"><span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-ledger-50 text-ledger-600"><Sparkles /></span><h2 className="mt-4 font-display text-xl font-semibold">Bem-vindo ao Conta Fechada</h2><p className="mx-auto mt-2 max-w-sm text-sm text-ink-300">Cadastre sua renda, uma conta recorrente e uma meta para gerar um primeiro resumo útil.</p></div>;
}
function RecurringForm({ title, description, prefix, form, update }) {
  return <div><h2 className="font-display text-xl font-semibold">{title}</h2><p className="mt-1 text-sm text-ink-300">{description}</p><input value={form[`${prefix}Description`]} onChange={(e) => update(`${prefix}Description`, e.target.value)} placeholder="Descrição" className="mt-5 w-full rounded-xl border border-ink-100 px-3 py-2.5 text-sm dark:border-ink-700 dark:bg-ink-900" /><div className="mt-3 grid grid-cols-2 gap-3"><input type="number" min="0" step="0.01" value={form[`${prefix}Value`]} onChange={(e) => update(`${prefix}Value`, e.target.value)} placeholder="Valor mensal" className="money rounded-xl border border-ink-100 px-3 py-2.5 text-sm dark:border-ink-700 dark:bg-ink-900" /><input type="number" min="1" max="31" value={form[`${prefix}Day`]} onChange={(e) => update(`${prefix}Day`, e.target.value)} placeholder="Dia" className="rounded-xl border border-ink-100 px-3 py-2.5 text-sm dark:border-ink-700 dark:bg-ink-900" /></div></div>;
}
function GoalForm({ form, update }) {
  return <div><h2 className="font-display text-xl font-semibold">Sua primeira meta</h2><p className="mt-1 text-sm text-ink-300">Esta etapa também é opcional.</p><input value={form.goalName} onChange={(e) => update('goalName', e.target.value)} placeholder="Ex: Reserva de emergência" className="mt-5 w-full rounded-xl border border-ink-100 px-3 py-2.5 text-sm dark:border-ink-700 dark:bg-ink-900" /><input type="number" min="0" step="0.01" value={form.goalValue} onChange={(e) => update('goalValue', e.target.value)} placeholder="Valor alvo" className="money mt-3 w-full rounded-xl border border-ink-100 px-3 py-2.5 text-sm dark:border-ink-700 dark:bg-ink-900" /></div>;
}
function Summary({ form }) {
  return <div><CheckCircle2 size={34} className="text-ledger-600" /><h2 className="mt-3 font-display text-xl font-semibold">Tudo pronto</h2><p className="mt-2 text-sm text-ink-300">As categorias padrão serão preparadas e o início mostrará seu primeiro resumo.</p><div className="mt-4 rounded-card bg-ink-50 p-4 text-sm dark:bg-ink-900"><p>Renda: <span className="money">{Number(form.incomeValue) > 0 ? `R$ ${form.incomeValue}` : 'não informada'}</span></p><p>Conta: <span className="money">{Number(form.expenseValue) > 0 ? `R$ ${form.expenseValue}` : 'não informada'}</span></p><p>Meta: {form.goalName || 'não informada'}</p></div></div>;
}
