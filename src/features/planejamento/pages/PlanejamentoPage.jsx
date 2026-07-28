import { useEffect, useMemo, useState } from 'react';
import { CalendarRange } from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { useAuth } from '../../../contexts/AuthContext.jsx';
import Topbar from '../../../components/layout/Topbar.jsx';
import LoadingScreen from '../../../components/ui/LoadingScreen.jsx';
import MonthNav from '../../../components/ui/MonthNav.jsx';
import { clampDayToMonth, getCurrentMonthKey } from '../../../utils/monthKey.js';
import { ensureDefaultCategorias } from '../../categorias/services/categoriasService.js';
import { createLancamento, createParcelamento, listAllLancamentos } from '../../lancamentos/services/lancamentosService.js';
import {
  ensureGeneratedForMonth,
  listRecorrencias,
} from '../../recorrencias/services/recorrenciasService.js';
import {
  getPlanejamentoMensal,
  setOrcamentoCategoria,
  setSaldoInicial,
} from '../services/planejamentoService.js';
import {
  calcularOrcamentos,
  calcularPendencias,
  calcularPrevisao,
} from '../utils/planejamento.js';
import {
  BudgetsSection,
  ForecastSection,
  PendingSection,
  ClosingSection,
  NotificationsSection,
  InstallmentSimulatorSection,
} from '../components/PlanejamentoSections.jsx';
import { calcularFechamento } from '../utils/fechamento.js';
import { fecharMes, getFechamento } from '../services/fechamentoService.js';
import {
  disableNotifications,
  enableAndScheduleNotifications,
  getNotificationSettings,
} from '../services/notificationService.js';
import { compararParcelamentos } from '../utils/simuladorParcelamento.js';

const TABS = [
  { id: 'previsao', label: 'Previsão' },
  { id: 'orcamentos', label: 'Orçamentos' },
  { id: 'pendencias', label: 'Pendências' },
  { id: 'fechamento', label: 'Fechamento' },
  { id: 'alertas', label: 'Alertas' },
  { id: 'simulador', label: 'Simulador' },
];

export default function PlanejamentoPage() {
  const { user } = useAuth();
  const uid = user?.uid;
  const [monthKey, setMonthKey] = useState(getCurrentMonthKey());
  const [tab, setTab] = useState('previsao');
  const [lancamentos, setLancamentos] = useState([]);
  const [recorrencias, setRecorrencias] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [planejamento, setPlanejamento] = useState({ saldoInicial: 0, orcamentos: {} });
  const [saldoInput, setSaldoInput] = useState('0');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(null);
  const [fechamento, setFechamento] = useState(null);
  const [saldoReal, setSaldoReal] = useState('');
  const [closingNotes, setClosingNotes] = useState('');
  const [carryPending, setCarryPending] = useState(false);
  const [notificationSettings, setNotificationSettings] = useState(getNotificationSettings);
  const [notificationFeedback, setNotificationFeedback] = useState('');
  const [simulator, setSimulator] = useState({
    descricao: '', valor: '', entrada: '0', parcelas: '6', diaVencimento: '10', categoriaId: '',
  });

  useEffect(() => {
    if (!uid) return;
    let cancelled = false;
    setLoading(true);

    Promise.all([
      listAllLancamentos(uid),
      listRecorrencias(uid),
      ensureDefaultCategorias(uid),
      getPlanejamentoMensal(uid, monthKey),
      getFechamento(uid, monthKey),
    ]).then(async ([allItems, recurrenceItems, categoryItems, monthlyPlan, monthlyClosing]) => {
      const generated = await ensureGeneratedForMonth(uid, monthKey, recurrenceItems);
      const finalItems = generated ? await listAllLancamentos(uid) : allItems;
      if (cancelled) return;
      setLancamentos(finalItems);
      setRecorrencias(recurrenceItems);
      setCategorias(categoryItems);
      setPlanejamento(monthlyPlan);
      setSaldoInput(String(monthlyPlan.saldoInicial));
      setFechamento(monthlyClosing);
      setSaldoReal(monthlyClosing ? String(monthlyClosing.saldoReal) : '');
      setClosingNotes(monthlyClosing?.observacoes || '');
      setLoading(false);
    }).catch(() => {
      if (!cancelled) setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [uid, monthKey]);

  const forecast = useMemo(
    () => calcularPrevisao(lancamentos, monthKey, planejamento.saldoInicial),
    [lancamentos, monthKey, planejamento.saldoInicial]
  );
  const budgets = useMemo(
    () => calcularOrcamentos(lancamentos, categorias, planejamento.orcamentos, monthKey),
    [lancamentos, categorias, planejamento.orcamentos, monthKey]
  );
  const pending = useMemo(
    () => calcularPendencias(lancamentos, recorrencias),
    [lancamentos, recorrencias]
  );
  const closingSummary = useMemo(
    () => calcularFechamento(lancamentos, monthKey, planejamento.saldoInicial),
    [lancamentos, monthKey, planejamento.saldoInicial]
  );
  const scenarios = useMemo(() => compararParcelamentos({
    ...simulator,
    monthKey,
    saldoInicial: planejamento.saldoInicial,
    lancamentos,
  }), [simulator, monthKey, planejamento.saldoInicial, lancamentos]);

  useEffect(() => {
    if (loading || !notificationSettings.enabled || lancamentos.length === 0) return;
    enableAndScheduleNotifications(lancamentos, notificationSettings, budgets).catch(() => {});
  }, [loading, lancamentos, notificationSettings, budgets]);

  async function handleSaveSaldo() {
    setSaving('saldo');
    try {
      const value = Number(saldoInput) || 0;
      await setSaldoInicial(uid, monthKey, value);
      setPlanejamento((current) => ({ ...current, saldoInicial: value }));
    } finally {
      setSaving(null);
    }
  }

  async function handleSaveBudget(categoryId, value) {
    setSaving(categoryId);
    try {
      const orcamentos = await setOrcamentoCategoria(
        uid,
        monthKey,
        categoryId,
        value,
        planejamento.orcamentos
      );
      setPlanejamento((current) => ({ ...current, orcamentos }));
    } finally {
      setSaving(null);
    }
  }

  async function handleCloseMonth() {
    setSaving('fechamento');
    try {
      const saved = await fecharMes(uid, monthKey, closingSummary, Number(saldoReal), closingNotes, carryPending);
      setFechamento(saved);
      if (carryPending) setLancamentos(await listAllLancamentos(uid));
    } finally {
      setSaving(null);
    }
  }

  async function handleToggleNotifications() {
    setSaving('alertas');
    setNotificationFeedback('');
    try {
      if (notificationSettings.enabled) {
        await disableNotifications();
        setNotificationSettings((current) => ({ ...current, enabled: false }));
        setNotificationFeedback('Notificações desativadas.');
      } else {
        const settings = { enabled: true, hour: Math.min(23, Math.max(0, Number(notificationSettings.hour) || 9)) };
        const result = await enableAndScheduleNotifications(lancamentos, settings, budgets);
        setNotificationSettings(settings);
        setNotificationFeedback(result.native
          ? `${result.scheduled} lembrete(s) agendado(s) no Android.`
          : 'Permissão concedida. Os lembretes da PWA aparecem com o app aberto.');
      }
    } catch (error) {
      setNotificationFeedback(error.message);
    } finally {
      setSaving(null);
    }
  }

  async function handleCreateSimulation() {
    setSaving('simulador');
    try {
      const total = Number(simulator.valor);
      const entry = Math.min(total, Math.max(0, Number(simulator.entrada) || 0));
      const categoryId = simulator.categoriaId || null;
      if (entry > 0) {
        await createLancamento(uid, {
          tipo: 'despesa',
          descricao: `${simulator.descricao} (entrada)`,
          valor: entry,
          dataVencimento: `${monthKey}-01`,
          dataPagamento: `${monthKey}-01`,
          status: 'pago',
          observacoes: 'Criado pelo simulador de parcelamento.',
          categoriaId: categoryId,
        });
      }
      if (total - entry > 0) {
        const day = clampDayToMonth(monthKey, Number(simulator.diaVencimento) || 1);
        await createParcelamento(uid, {
          tipo: 'despesa',
          descricao: simulator.descricao,
          valorTotal: total - entry,
          numParcelas: Math.max(1, Number(simulator.parcelas) || 1),
          dataVencimento: `${monthKey}-${String(day).padStart(2, '0')}`,
          categoriaId: categoryId,
          observacoes: 'Criado pelo simulador de parcelamento.',
        });
      }
      setLancamentos(await listAllLancamentos(uid));
      setSimulator((current) => ({ ...current, descricao: '', valor: '', entrada: '0' }));
    } finally {
      setSaving(null);
    }
  }

  if (loading) {
    return (
      <>
        <Topbar title="Planejamento" icon={CalendarRange} />
        <LoadingScreen />
      </>
    );
  }

  return (
    <>
      <Topbar title="Planejamento" icon={CalendarRange} />
      <div className="p-4 md:p-8 max-w-4xl mx-auto">
        <MonthNav monthKey={monthKey} onChange={setMonthKey} />
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mb-5">
          {TABS.map((item) => (
            <button
              type="button"
              key={item.id}
              onClick={() => setTab(item.id)}
              className={`rounded-xl px-2 py-2.5 text-sm font-medium transition-colors ${
                tab === item.id
                  ? 'bg-ledger-500 text-white'
                  : 'bg-white dark:bg-ink-700 text-ink-500 shadow-card'
              }`}
            >
              {item.label}
              {item.id === 'pendencias' && pending.atrasadas.length > 0 && (
                <span className="ml-1.5 rounded-pill bg-signal-500 px-1.5 py-0.5 text-[10px] text-white">
                  {pending.atrasadas.length}
                </span>
              )}
            </button>
          ))}
        </div>

        {tab === 'previsao' && (
          <ForecastSection
            forecast={forecast}
            saldoInput={saldoInput}
            onSaldoInputChange={setSaldoInput}
            onSaveSaldo={handleSaveSaldo}
            saving={saving === 'saldo'}
          />
        )}
        {tab === 'orcamentos' && (
          <BudgetsSection items={budgets} onSave={handleSaveBudget} savingCategory={saving} />
        )}
        {tab === 'pendencias' && <PendingSection pending={pending} />}
        {tab === 'fechamento' && (
          <ClosingSection
            summary={closingSummary}
            saved={fechamento}
            saldoReal={saldoReal}
            onSaldoRealChange={setSaldoReal}
            notes={closingNotes}
            onNotesChange={setClosingNotes}
            carryPending={carryPending}
            onCarryPendingChange={setCarryPending}
            onCloseMonth={handleCloseMonth}
            saving={saving === 'fechamento'}
          />
        )}
        {tab === 'alertas' && (
          <NotificationsSection
            enabled={notificationSettings.enabled}
            hour={notificationSettings.hour}
            onHourChange={(hour) => setNotificationSettings((current) => ({ ...current, hour }))}
            onToggle={handleToggleNotifications}
            saving={saving === 'alertas'}
            feedback={notificationFeedback}
            native={Capacitor.isNativePlatform()}
          />
        )}
        {tab === 'simulador' && (
          <InstallmentSimulatorSection
            form={simulator}
            onChange={(field, value) => setSimulator((current) => ({ ...current, [field]: value }))}
            scenarios={scenarios}
            categorias={categorias}
            onCreate={handleCreateSimulation}
            saving={saving === 'simulador'}
          />
        )}
      </div>
    </>
  );
}
