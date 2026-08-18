import { useCallback, useEffect, useState } from 'react';
import { Crown, History, RefreshCw, Search, ShieldAlert, UserMinus, UserPlus } from 'lucide-react';
import Topbar from '../../../components/layout/Topbar.jsx';
import { useConfirm } from '../../../contexts/ConfirmContext.jsx';
import {
  grantAdminPremium,
  getAdminSubscriptionHistory,
  listAdminSubscriptions,
  revokeAdminPremium,
} from '../services/adminSubscriptionsService.js';

export default function AdminSubscriptionsPage() {
  const confirm = useConfirm();
  const [subscriptions, setSubscriptions] = useState([]);
  const [identifier, setIdentifier] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [accessDenied, setAccessDenied] = useState(false);
  const [search, setSearch] = useState('');
  const [nextOffset, setNextOffset] = useState(null);
  const [history, setHistory] = useState(null);

  const load = useCallback(async ({ offset = 0, append = false, term = '' } = {}) => {
    setLoading(true);
    setError(null);
    setAccessDenied(false);
    try {
      const result = await listAdminSubscriptions({ search: term, offset });
      setSubscriptions((current) => append ? [...current, ...result.subscriptions] : result.subscriptions);
      setNextOffset(result.nextOffset);
    } catch (nextError) {
      setError(nextError.message);
      setAccessDenied(nextError.code === 'forbidden');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function grant(event) {
    event.preventDefault();
    setLoading(true);
    try {
      await grantAdminPremium({ identifier: identifier.trim() });
      setIdentifier('');
      await load();
    } catch (nextError) {
      setError(nextError.message);
      setLoading(false);
    }
  }

  async function revoke(item) {
    if (!(await confirm(`Remover o Premium de ${item.email || item.uid}? A ação será registrada no histórico.`))) return;
    setLoading(true);
    try {
      await revokeAdminPremium(item.uid);
      await load();
    } catch (nextError) {
      setError(nextError.message);
      setLoading(false);
    }
  }

  async function showHistory(item) {
    setLoading(true);
    try {
      setHistory({ item, entries: await getAdminSubscriptionHistory(item.uid) });
    } catch (nextError) {
      setError(nextError.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Topbar title="Controle do Pro" icon={Crown} />
      <main className="mx-auto flex max-w-5xl flex-col gap-5 p-4 md:p-8">
        {!accessDenied && <section className="rounded-card bg-white p-5 shadow-card dark:bg-ink-700" aria-labelledby="manual-grant-title">
          <h2 id="manual-grant-title" className="flex items-center gap-2 font-display text-base font-semibold"><UserPlus size={18} /> Conceder Pro vitalício</h2>
          <form onSubmit={grant} className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
            <label className="text-xs text-ink-300">UID ou e-mail
              <input required value={identifier} onChange={(event) => setIdentifier(event.target.value)} className="mt-1 block w-full rounded-xl border border-ink-100 bg-white px-3 py-2.5 text-sm dark:border-ink-900 dark:bg-ink-900" />
            </label>
            <button disabled={loading} className="rounded-xl bg-ledger-500 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50">Conceder</button>
          </form>
        </section>}

        {error && <p role="alert" className="flex items-center gap-2 rounded-xl bg-signal-50 p-3 text-sm text-signal-600 dark:bg-signal-500/10 dark:text-signal-400"><ShieldAlert size={16} /> {error}</p>}

        {!accessDenied && <section className="rounded-card bg-white shadow-card dark:bg-ink-700" aria-labelledby="active-subscriptions-title">
          <div className="flex items-center justify-between border-b border-ink-100 p-4 dark:border-ink-900">
            <div><h2 id="active-subscriptions-title" className="font-display text-base font-semibold">Contas Pro</h2><p className="text-xs text-ink-300">{subscriptions.length} conta(s)</p></div>
            <button type="button" onClick={load} disabled={loading} aria-label="Atualizar assinaturas" className="rounded-full p-2 text-ledger-600 disabled:opacity-50"><RefreshCw size={17} className={loading ? 'animate-spin' : ''} /></button>
          </div>
          <form onSubmit={(event) => { event.preventDefault(); load({ term: search }); }} className="flex gap-2 border-b border-ink-100 p-3 dark:border-ink-900">
            <label className="relative flex-1"><span className="sr-only">Buscar assinatura</span><Search size={15} className="absolute left-3 top-3 text-ink-300" /><input value={search} onChange={(event) => setSearch(event.target.value)} maxLength="320" placeholder="Buscar por nome, e-mail, UID ou origem" className="w-full rounded-xl border border-ink-100 py-2.5 pl-9 pr-3 text-sm dark:border-ink-900 dark:bg-ink-900" /></label>
            <button className="rounded-xl bg-ink-50 px-4 text-sm font-medium dark:bg-ink-900">Buscar</button>
          </form>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px] text-left text-sm">
              <thead className="text-xs text-ink-300"><tr><th className="px-4 py-3">Conta</th><th>Origem</th><th>Acesso</th><th><span className="sr-only">Ações</span></th></tr></thead>
              <tbody className="divide-y divide-ink-100 dark:divide-ink-900">
                {subscriptions.map((item) => (
                  <tr key={item.uid}>
                    <td className="px-4 py-3"><p className="font-medium">{item.displayName || item.email || item.uid}</p>{item.email && <p className="text-xs text-ink-300">{item.email}</p>}<p className="text-[10px] text-ink-300">{item.uid}</p></td>
                    <td>{item.provider}</td><td>Vitalício</td>
                    <td className="pr-4 text-right"><div className="flex justify-end gap-3"><button type="button" onClick={() => showHistory(item)} className="inline-flex items-center gap-1 text-xs font-medium text-ink-300"><History size={14} /> Histórico</button><button type="button" onClick={() => revoke(item)} aria-label={`Remover Premium de ${item.email || item.uid}`} className="inline-flex items-center gap-1.5 text-xs font-medium text-signal-500"><UserMinus size={14} /> Remover</button></div></td>
                  </tr>
                ))}
                {!loading && subscriptions.length === 0 && <tr><td colSpan="4" className="p-8 text-center text-ink-300">Nenhuma conta Pro.</td></tr>}
              </tbody>
            </table>
          </div>
          {nextOffset != null && <div className="border-t border-ink-100 p-3 text-center dark:border-ink-900"><button type="button" disabled={loading} onClick={() => load({ offset: nextOffset, append: true, term: search })} className="rounded-pill bg-ink-50 px-4 py-2 text-sm font-medium disabled:opacity-50 dark:bg-ink-900">Carregar mais</button></div>}
        </section>}
        {history && <section className="rounded-card bg-white p-4 shadow-card dark:bg-ink-700"><div className="flex items-center justify-between"><h2 className="font-display font-semibold">Histórico — {history.item.email || history.item.uid}</h2><button type="button" onClick={() => setHistory(null)} className="text-xs text-ink-300">Fechar</button></div><ul className="mt-3 divide-y divide-ink-100 text-sm dark:divide-ink-900">{history.entries.map((entry) => <li key={entry.id} className="py-2"><span className="font-medium">{entry.action || 'alteração'}</span> · {entry.actor || entry.provider || 'sistema'} · {entry.at ? new Date(entry.at).toLocaleString('pt-BR') : 'data pendente'}</li>)}{history.entries.length === 0 && <li className="py-3 text-ink-300">Nenhuma alteração registrada.</li>}</ul></section>}
      </main>
    </>
  );
}
