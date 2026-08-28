import { DEFAULT_CATEGORIAS } from '../../features/categorias/data/defaultCategorias.js';
import { buildImportPayload, buildParcelamentoItems } from '../../features/lancamentos/services/lancamentosService.js';
import { calcularAporteAutomatico, preverConclusaoMeta } from '../../features/metas/services/metasService.js';
import { clampDayToMonth, getCurrentMonthKey } from '../../utils/monthKey.js';
import { slugify } from '../../utils/slugify.js';
import { createLocalDocumentStore } from './localDocumentStore.js';

function matchesRule(item, rule) {
  if (!rule.ativa || !rule.termo) return false;
  if (rule.tipo && rule.tipo !== 'todos' && rule.tipo !== item.tipo) return false;
  return String(item.descricao || '').toLocaleLowerCase('pt-BR')
    .includes(String(rule.termo).toLocaleLowerCase('pt-BR'));
}

export function createSqliteRepositories(driver) {
  const store = createLocalDocumentStore(driver);
  const domain = (name) => ({
    list: () => store.list(name),
    create: (_uid, data) => store.put(name, data),
    update: (_uid, id, data) => store.patch(name, id, data),
    remove: (_uid, id) => store.remove(name, id),
    removeAll: () => store.removeAll(name),
  });

  const categoriasBase = domain('categorias');
  const categorias = {
    ...categoriasBase,
    async ensureDefaults(uid) {
      const existing = await categoriasBase.list(uid);
      if (existing.length) return existing;
      for (const item of DEFAULT_CATEGORIAS) {
        await store.put('categorias', { ...item, padrao: true }, { id: slugify(`${item.tipo}-${item.nome}`) });
      }
      return categoriasBase.list(uid);
    },
  };

  const lancamentosBase = domain('lancamentos');
  const lancamentos = {
    ...lancamentosBase,
    async listAll() { return lancamentosBase.list(); },
    async listByRange(_uid, gte, lte) {
      return (await lancamentosBase.list())
        .filter((item) => item.dataVencimento >= gte && item.dataVencimento <= lte)
        .sort((a, b) => b.dataVencimento.localeCompare(a.dataVencimento));
    },
    async listByMonth(uid, monthKey) {
      return lancamentos.listByRange(uid, `${monthKey}-01`, `${monthKey}-31`);
    },
    async hasAny() { return (await lancamentosBase.list()).length > 0; },
    setStatus(uid, id, status) { return lancamentosBase.update(uid, id, { status }); },
    async removeByIds(uid, ids) { for (const id of ids) await lancamentosBase.remove(uid, id); },
    async setCategoriaForRecorrencia(uid, recorrenciaId, categoriaId) {
      const items = await lancamentosBase.list();
      for (const item of items.filter((entry) => entry.origemRecorrenciaId === recorrenciaId)) {
        await lancamentosBase.update(uid, item.id, { categoriaId });
      }
    },
    async updateGeneratedFromRecorrencia(uid, recorrenciaId, data, fromMonthKey) {
      const items = await lancamentosBase.list();
      const selected = items.filter((item) => item.origemRecorrenciaId === recorrenciaId && item.mesReferencia >= fromMonthKey);
      for (const item of selected) {
        const day = data.diaVencimento
          ? clampDayToMonth(item.mesReferencia, data.diaVencimento)
          : Number(item.dataVencimento.slice(-2));
        await lancamentosBase.update(uid, item.id, {
          ...(data.tipo && { tipo: data.tipo }),
          ...(data.descricao && { descricao: data.descricao }),
          ...(data.valor != null && { valor: data.valor }),
          ...(data.observacoes !== undefined && { observacoes: data.observacoes }),
          ...(data.categoriaId !== undefined && { categoriaId: data.categoriaId }),
          dataVencimento: `${item.mesReferencia}-${String(day).padStart(2, '0')}`,
        });
      }
      return selected.length;
    },
    async removeGeneratedFromRecorrencia(uid, recorrenciaId, { fromMonthKey } = {}) {
      const items = await lancamentosBase.list();
      const selected = items.filter((item) =>
        item.origemRecorrenciaId === recorrenciaId && (!fromMonthKey || item.mesReferencia >= fromMonthKey));
      await lancamentos.removeByIds(uid, selected.map((item) => item.id));
    },
    buildParcelamentoItems,
    async createParcelamento(_uid, data) {
      const { parcelamentoId, itemsById } = buildParcelamentoItems(data);
      for (const [id, item] of Object.entries(itemsById)) await store.put('lancamentos', item, { id });
      return parcelamentoId;
    },
    buildImportPayload,
    async importLancamentos(_uid, items) {
      const existing = await lancamentosBase.list();
      const rules = await store.list('regrasCategorizacao');
      const categorized = items.map((item) => {
        const rule = [...rules].sort((a, b) => (b.prioridade || 0) - (a.prioridade || 0))
          .find((candidate) => matchesRule(item, candidate));
        return rule ? { ...item, categoriaId: rule.categoriaId } : item;
      });
      const { novos, totalConsiderados } = buildImportPayload(categorized, new Set(existing.map((item) => item.id)));
      for (const [id, item] of Object.entries(novos)) await store.put('lancamentos', item, { id });
      return { importados: Object.keys(novos).length, duplicados: totalConsiderados - Object.keys(novos).length };
    },
    async updateEmMassa(uid, updatesById) {
      for (const [id, changes] of Object.entries(updatesById)) await lancamentosBase.update(uid, id, changes);
    },
  };

  const regrasBase = domain('regrasCategorizacao');
  const regrasCategorizacao = {
    ...regrasBase,
    async aplicarAosAntigos(uid, rules, items, sobrescrever = false) {
      let count = 0;
      for (const item of items) {
        if (!sobrescrever && item.categoriaId) continue;
        const rule = [...rules].sort((a, b) => (b.prioridade || 0) - (a.prioridade || 0))
          .find((candidate) => matchesRule(item, candidate));
        if (rule) {
          await lancamentos.update(uid, item.id, { categoriaId: rule.categoriaId });
          count++;
        }
      }
      return count;
    },
  };

  const recorrenciasBase = domain('recorrencias');
  const recorrencias = {
    ...recorrenciasBase,
    async create(uid, data) { return recorrenciasBase.create(uid, { ...data, ativo: true }); },
    async ensureGeneratedForMonths(uid, monthKeys, prefetched) {
      const templates = prefetched ?? await recorrenciasBase.list();
      const existing = new Set((await lancamentos.listAll()).map((item) => item.id));
      let created = false;
      for (const monthKey of [...new Set(monthKeys)]) {
        for (const item of templates.filter((entry) => entry.ativo)) {
          const start = item.mesInicio ?? item.createdAt?.slice(0, 7) ?? null;
          const id = `${item.id}_${monthKey}`;
          if ((start && monthKey < start) || existing.has(id)) continue;
          const day = clampDayToMonth(monthKey, item.diaVencimento);
          await store.put('lancamentos', {
            tipo: item.tipo, descricao: item.descricao, valor: item.valor,
            dataVencimento: `${monthKey}-${String(day).padStart(2, '0')}`,
            dataPagamento: null, status: 'pendente', observacoes: item.observacoes ?? null,
            categoriaId: item.categoriaId ?? null, origemRecorrenciaId: item.id, mesReferencia: monthKey,
          }, { id });
          created = true;
        }
      }
      return created;
    },
    ensureGeneratedForMonth(uid, monthKey, prefetched) {
      return recorrencias.ensureGeneratedForMonths(uid, [monthKey], prefetched);
    },
  };

  const metasBase = domain('metas');
  const metas = {
    ...metasBase,
    create(uid, data) { return metasBase.create(uid, { valorAtual: 0, ...data }); },
    aportar(uid, meta, value) {
      return metasBase.update(uid, meta.id, { valorAtual: Math.max(0, Number(meta.valorAtual || 0) + value) });
    },
    calcularAporteAutomatico,
    preverConclusao: preverConclusaoMeta,
    async processarAportesAutomaticos(uid, items, entries, closing, monthKey) {
      let count = 0;
      for (const item of items) {
        if (item.ultimoAporteAutomaticoMes === monthKey) continue;
        const value = Math.round(calcularAporteAutomatico(item, entries, closing) * 100) / 100;
        if (value <= 0) continue;
        const target = Number(item.valorAlvo || 0);
        const current = Number(item.valorAtual || 0);
        await metasBase.update(uid, item.id, {
          valorAtual: target > 0 ? Math.min(target, current + value) : current + value,
          ultimoAporteAutomaticoMes: monthKey,
          ultimoAporteAutomaticoValor: value,
        });
        count++;
      }
      return count;
    },
  };

  const valorLivre = {
    async getDistribuicao(_uid, monthKey) {
      const mensal = await store.get('valorLivre', monthKey);
      if (mensal?.personalizada) return { distribuicoes: mensal.distribuicoes ?? [], personalizada: true };
      const padrao = await store.get('valorLivre', '_padrao');
      if (padrao?.distribuicoes?.length) return { distribuicoes: padrao.distribuicoes, personalizada: false };
      const legado = (await store.list('valorLivre'))
        .filter((item) => /^\d{4}-\d{2}$/.test(item.id) && item.distribuicoes?.length)
        .sort((a, b) => b.id.localeCompare(a.id))[0];
      return { distribuicoes: legado?.distribuicoes ?? [], personalizada: false };
    },
    async getDistribuicaoMensal(uid, monthKey) {
      return (await this.getDistribuicao(uid, monthKey)).distribuicoes;
    },
    setDistribuicao(_uid, monthKey, distribuicoes, personalizada = false) {
      const id = personalizada ? monthKey : '_padrao';
      return store.put('valorLivre', { distribuicoes, personalizada }, { id, operation: 'update' });
    },
    setDistribuicaoMensal(_uid, _monthKey, distribuicoes) {
      return store.put('valorLivre', { distribuicoes, personalizada: false }, { id: '_padrao', operation: 'update' });
    },
    async getValorBaseMensal(_uid, monthKey) {
      const item = await store.get('valorLivre', monthKey);
      return item?.valorBaseMensal !== null && item?.valorBaseMensal !== undefined
        && Number.isFinite(Number(item.valorBaseMensal)) ? Number(item.valorBaseMensal) : null;
    },
    async setValorBaseMensal(_uid, monthKey, valor) {
      const current = await store.get('valorLivre', monthKey) ?? {};
      const valorBaseMensal = Math.round((Number(valor) || 0) * 100) / 100;
      await store.put('valorLivre', { ...current, valorBaseMensal, valorBaseDefinidoEm: new Date().toISOString() }, { id: monthKey, operation: 'update' });
      return valorBaseMensal;
    },
    async ensureValorBaseMensal(uid, monthKey, valorCalculado) {
      const existente = await this.getValorBaseMensal(uid, monthKey);
      if (existente !== null) return existente;
      if (monthKey > getCurrentMonthKey()) return Math.round((Number(valorCalculado) || 0) * 100) / 100;
      return this.setValorBaseMensal(uid, monthKey, valorCalculado);
    },
    async getFotografiaMensal(uid, monthKey) {
      const item = await store.get('valorLivre', monthKey);
      const gastosIniciaisDefinidos = Boolean(item?.gastosIniciais && typeof item.gastosIniciais === 'object');
      return {
        valorBaseMensal: await this.getValorBaseMensal(uid, monthKey),
        gastosIniciais: gastosIniciaisDefinidos ? item.gastosIniciais : {},
        gastosIniciaisDefinidos,
        movimentoAtualizadoEm: item?.movimentoAtualizadoEm ?? null,
      };
    },
    async setValorBaseDoMovimento(_uid, monthKey, valor, gastosIniciais = {}) {
      const current = await store.get('valorLivre', monthKey) ?? {};
      const valorBaseMensal = Math.round((Number(valor) || 0) * 100) / 100;
      const movimentoAtualizadoEm = new Date().toISOString();
      await store.put('valorLivre', {
        ...current, valorBaseMensal, gastosIniciais, movimentoAtualizadoEm,
        valorBaseDefinidoEm: movimentoAtualizadoEm,
      }, { id: monthKey, operation: 'update' });
      return { valorBaseMensal, gastosIniciais, movimentoAtualizadoEm };
    },
    async ensureFotografiaMensal(uid, monthKey, valorCalculado, gastosIniciais = {}) {
      const existente = await this.getFotografiaMensal(uid, monthKey);
      if (existente.valorBaseMensal !== null && existente.gastosIniciaisDefinidos) return existente;
      if (existente.valorBaseMensal !== null) {
        const current = await store.get('valorLivre', monthKey) ?? {};
        await store.put('valorLivre', { ...current, gastosIniciais }, { id: monthKey, operation: 'update' });
        return { ...existente, gastosIniciais, gastosIniciaisDefinidos: true };
      }
      const valorBaseMensal = Math.round((Number(valorCalculado) || 0) * 100) / 100;
      if (monthKey > getCurrentMonthKey()) return { valorBaseMensal, gastosIniciais, gastosIniciaisDefinidos: true };
      await store.put('valorLivre', { valorBaseMensal, gastosIniciais, valorBaseDefinidoEm: new Date().toISOString() }, { id: monthKey, operation: 'update' });
      return { valorBaseMensal, gastosIniciais, gastosIniciaisDefinidos: true };
    },
  };

  const planejamento = {
    async getMensal(_uid, monthKey) {
      const item = await store.get('planejamento', monthKey);
      return { saldoInicial: item?.saldoInicial ?? 0, orcamentos: item?.orcamentos ?? {} };
    },
    async setSaldoInicial(_uid, monthKey, saldoInicial) {
      const current = await planejamento.getMensal(null, monthKey);
      await store.put('planejamento', { ...current, saldoInicial }, { id: monthKey, operation: 'update' });
    },
    async setOrcamentoCategoria(_uid, monthKey, categoriaId, valor, currentBudgets = {}) {
      const orcamentos = { ...currentBudgets, [categoriaId]: valor };
      const current = await planejamento.getMensal(null, monthKey);
      await store.put('planejamento', { ...current, orcamentos }, { id: monthKey, operation: 'update' });
      return orcamentos;
    },
  };

  const fechamentos = {
    get: (_uid, monthKey) => store.get('fechamentos', monthKey),
    async fechar(_uid, monthKey, resumo, saldoReal, observacoes, levarPendencias) {
      const data = {
        ...resumo, status: 'fechado', saldoReal,
        diferenca: saldoReal - Number(resumo.saldoCalculado || 0),
        observacoes: observacoes || null, pendenciasTransferidas: Boolean(levarPendencias),
        fechadoEm: new Date().toISOString(),
      };
      await store.put('fechamentos', data, { id: monthKey, operation: 'update' });
      return { id: monthKey, ...data };
    },
  };

  const gestorBase = domain('gestorLancamentos');
  const gestor = {
    ...gestorBase,
    async removeByIds(uid, ids) { for (const id of ids) await gestorBase.remove(uid, id); },
    async createParcelamento(_uid, data) {
      const { parcelamentoId, itemsById } = buildParcelamentoItems(data);
      for (const [id, item] of Object.entries(itemsById)) await store.put('gestorLancamentos', item, { id });
      return parcelamentoId;
    },
    async importarDoMovimento(_uid, items) {
      const existing = new Set((await gestorBase.list()).map((item) => item.id));
      let imported = 0;
      for (const item of items) {
        const id = `mov-${item.id}`;
        if (existing.has(id)) continue;
        const { id: _id, createdAt: _createdAt, ...data } = item;
        await store.put('gestorLancamentos', data, { id });
        imported++;
      }
      return { importados: imported, duplicados: items.length - imported };
    },
    async importarFatura(_uid, items) {
      const existing = new Set((await gestorBase.list()).map((item) => item.id));
      const { novos, totalConsiderados } = buildImportPayload(items, existing);
      for (const [id, item] of Object.entries(novos)) await store.put('gestorLancamentos', item, { id });
      return { importados: Object.keys(novos).length, duplicados: totalConsiderados - Object.keys(novos).length };
    },
    async importarRecorrencias(_uid, items) {
      const existing = new Set((await gestorBase.list()).map((item) => item.id));
      let imported = 0;
      for (const item of items) {
        const id = `rec-${item.id}`;
        if (existing.has(id)) continue;
        await store.put('gestorLancamentos', {
          tipo: item.tipo, descricao: item.descricao, valor: item.valor,
          categoriaId: item.categoriaId ?? null, observacoes: item.observacoes ?? null,
          origemRecorrenciaId: item.id, recorrenciaImportada: true,
        }, { id });
        imported++;
      }
      return { importados: imported, duplicados: items.length - imported };
    },
    async getUsaMovimento() { return (await store.get('configuracoes', 'geral'))?.gestorUsaMovimento ?? true; },
    async setUsaMovimento(_uid, value) {
      const current = await store.get('configuracoes', 'geral') ?? {};
      await store.put('configuracoes', { ...current, gestorUsaMovimento: Boolean(value) }, { id: 'geral', operation: 'update' });
    },
  };

  async function getConfig() { return await store.get('configuracoes', 'geral') ?? {}; }
  async function setConfig(changes) {
    await store.put('configuracoes', { ...await getConfig(), ...changes }, { id: 'geral', operation: 'update' });
  }
  const configuracoes = {
    async getMetaEconomiaMensal() { return (await getConfig()).metaEconomiaMensal ?? null; },
    setMetaEconomiaMensal: (_uid, valor) => setConfig({ metaEconomiaMensal: valor }),
    async getValorLivreAutomatico() {
      const config = await getConfig();
      return {
        enabled: Boolean(config.valorLivreAutomatico),
        day: Math.min(28, Math.max(1, Number(config.valorLivreDiaAtualizacao) || 1)),
      };
    },
    setValorLivreAutomatico: (_uid, config) => setConfig({
      valorLivreAutomatico: Boolean(config.enabled),
      valorLivreDiaAtualizacao: Math.min(28, Math.max(1, Number(config.day) || 1)),
    }),
    async getOnboardingState() {
      const config = await getConfig();
      return { completed: Boolean(config.onboardingCompleted), skipped: Boolean(config.onboardingSkipped) };
    },
    skipOnboarding: () => setConfig({ onboardingSkipped: true }),
    async completeOnboarding(uid, data) {
      const [categories, templates] = await Promise.all([
        categorias.ensureDefaults(uid), recorrencias.list(uid),
      ]);
      const monthKey = getCurrentMonthKey();
      if (Number(data.incomeValue) > 0 && !templates.some((item) => item.tipo === 'receita')) {
        await recorrencias.create(uid, {
          tipo: 'receita', descricao: data.incomeDescription || 'Renda principal',
          valor: Number(data.incomeValue), diaVencimento: Number(data.incomeDay) || 5,
          mesInicio: monthKey, categoriaId: categories.find((item) => item.tipo === 'receita')?.id ?? null,
          observacoes: 'Criado no onboarding.',
        });
      }
      if (Number(data.expenseValue) > 0 && !templates.some((item) => item.tipo === 'despesa')) {
        await recorrencias.create(uid, {
          tipo: 'despesa', descricao: data.expenseDescription || 'Conta recorrente',
          valor: Number(data.expenseValue), diaVencimento: Number(data.expenseDay) || 10,
          mesInicio: monthKey, categoriaId: categories.find((item) => item.tipo === 'despesa')?.id ?? null,
          observacoes: 'Criado no onboarding.',
        });
      }
      await setConfig({ onboardingCompleted: true, onboardingSkipped: false, onboardingCompletedAt: new Date().toISOString() });
    },
  };

  return {
    lancamentos, categorias, regrasCategorizacao, recorrencias, metas,
    valorLivre, planejamento, fechamentos, gestor, configuracoes,
  };
}
