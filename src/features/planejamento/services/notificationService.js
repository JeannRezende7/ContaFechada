import { Capacitor } from '@capacitor/core';

const STORAGE_KEY = 'contafechada:notificacoes';
const CHANNEL_ID = 'vencimentos';

export function getNotificationSettings() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || { enabled: false, hour: 9 };
  } catch {
    return { enabled: false, hour: 9 };
  }
}

export function saveNotificationSettings(settings) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}

function notificationId(value) {
  let hash = 0;
  for (let i = 0; i < value.length; i++) hash = ((hash << 5) - hash + value.charCodeAt(i)) | 0;
  return Math.abs(hash) || 1;
}

function atHour(isoDate, hour) {
  const date = new Date(`${isoDate}T${String(hour).padStart(2, '0')}:00:00`);
  return date;
}

export function buildDueNotifications(lancamentos, { hour = 9, now = new Date(), includeOverdue = false } = {}) {
  const notifications = [];
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const limit = new Date(today);
  limit.setDate(limit.getDate() + 45);

  for (const item of lancamentos) {
    if (['pago', 'recebido'].includes(item.status) || !item.dataVencimento) continue;
    const due = new Date(`${item.dataVencimento}T00:00:00`);
    if (Number.isNaN(due.getTime()) || due > limit) continue;
    if (due < today) {
      if (includeOverdue) {
        notifications.push({
          id: notificationId(`overdue-${item.id}-${today.toISOString().slice(0, 10)}`),
          title: item.tipo === 'receita' ? 'Receita ainda pendente' : 'Conta vencida',
          body: item.descricao,
          schedule: { at: new Date(now.getTime() + 5000) },
          channelId: CHANNEL_ID,
          extra: { route: '/', itemId: item.id },
        });
      }
      continue;
    }
    const reminderDate = new Date(due);
    reminderDate.setDate(reminderDate.getDate() - 1);
    const scheduleAt = atHour(reminderDate.toISOString().slice(0, 10), hour);
    if (scheduleAt <= now) continue;
    const isIncome = item.tipo === 'receita';
    notifications.push({
      id: notificationId(`due-${item.id}-${item.dataVencimento}`),
      title: isIncome ? 'Receita prevista amanhã' : 'Conta vence amanhã',
      body: item.descricao,
      // Inexact scheduling avoids Android's restricted exact-alarm
      // permission, which is unnecessary for a financial reminder.
      schedule: { at: scheduleAt },
      channelId: CHANNEL_ID,
      extra: { route: '/', itemId: item.id },
    });
  }

  const closingAt = new Date(today.getFullYear(), today.getMonth() + 1, 0, hour);
  if (closingAt > now) {
    notifications.push({
      id: notificationId(`closing-${closingAt.toISOString().slice(0, 7)}`),
      title: 'Hora de fechar o mês',
      body: 'Revise as pendências e confira o saldo real.',
      schedule: { at: closingAt },
      channelId: CHANNEL_ID,
      extra: { route: '/planejamento' },
    });
  }
  return notifications;
}

export async function enableAndScheduleNotifications(lancamentos, settings, budgets = []) {
  if (Capacitor.isNativePlatform()) {
    const { LocalNotifications } = await import('@capacitor/local-notifications');
    let permission = await LocalNotifications.checkPermissions();
    if (permission.display !== 'granted') permission = await LocalNotifications.requestPermissions();
    if (permission.display !== 'granted') throw new Error('Permissão de notificações negada.');
    await LocalNotifications.createChannel({
      id: CHANNEL_ID,
      name: 'Vencimentos',
      description: 'Lembretes de contas, receitas e fechamento mensal',
      importance: 4,
    });
    const pending = await LocalNotifications.getPending();
    const ours = pending.notifications.filter((item) => item.channelId === CHANNEL_ID);
    if (ours.length > 0) await LocalNotifications.cancel({ notifications: ours.map(({ id }) => ({ id })) });
    const todayKey = new Date().toISOString().slice(0, 10);
    const dailyKey = `${STORAGE_KEY}:native:${todayKey}`;
    const includeOverdue = !localStorage.getItem(dailyKey);
    const notifications = buildDueNotifications(lancamentos, { ...settings, includeOverdue });
    if (includeOverdue) {
      budgets.filter((item) => item.limite > 0 && item.percentual >= 80).forEach((item, index) => {
        notifications.push({
          id: notificationId(`budget-${item.categoria.id}-${todayKey}`),
          title: item.percentual >= 100 ? 'Orçamento ultrapassado' : 'Orçamento perto do limite',
          body: `${item.categoria.nome}: ${Math.round(item.percentual)}% utilizado`,
          schedule: { at: new Date(Date.now() + 7000 + index * 1000) },
          channelId: CHANNEL_ID,
          extra: { route: '/planejamento' },
        });
      });
      localStorage.setItem(dailyKey, '1');
    }
    if (notifications.length > 0) await LocalNotifications.schedule({ notifications });
    saveNotificationSettings({ ...settings, enabled: true });
    return { scheduled: notifications.length, native: true };
  }

  if (!('Notification' in window)) throw new Error('Este navegador não oferece notificações.');
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') throw new Error('Permissão de notificações negada.');
  const todayKey = new Date().toISOString().slice(0, 10);
  const shownKey = `${STORAGE_KEY}:shown:${todayKey}`;
  if (!localStorage.getItem(shownKey)) {
    const today = new Date(`${todayKey}T00:00:00`);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowKey = tomorrow.toISOString().slice(0, 10);
    const candidates = lancamentos.filter((item) =>
      !['pago', 'recebido'].includes(item.status)
      && item.dataVencimento
      && item.dataVencimento <= tomorrowKey
    ).slice(0, 4);
    for (const item of candidates) {
      const overdue = item.dataVencimento < todayKey;
      new Notification(overdue ? 'Lançamento vencido' : 'Vencimento amanhã', { body: item.descricao });
    }
    budgets.filter((item) => item.limite > 0 && item.percentual >= 80).slice(0, 3).forEach((item) => {
      new Notification(item.percentual >= 100 ? 'Orçamento ultrapassado' : 'Orçamento perto do limite', {
        body: `${item.categoria.nome}: ${Math.round(item.percentual)}% utilizado`,
      });
    });
    localStorage.setItem(shownKey, '1');
  }
  saveNotificationSettings({ ...settings, enabled: true });
  return { scheduled: 0, native: false };
}

export async function disableNotifications() {
  if (Capacitor.isNativePlatform()) {
    const { LocalNotifications } = await import('@capacitor/local-notifications');
    const pending = await LocalNotifications.getPending();
    const ours = pending.notifications.filter((item) => item.channelId === CHANNEL_ID);
    if (ours.length > 0) await LocalNotifications.cancel({ notifications: ours.map(({ id }) => ({ id })) });
  }
  saveNotificationSettings({ ...getNotificationSettings(), enabled: false });
}
