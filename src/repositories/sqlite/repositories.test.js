import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createNodeSqliteDriver } from '../../db/drivers/nodeSqliteDriver.js';
import { migrations } from '../../db/migrations/index.js';
import { runMigrations } from '../../db/migrationRunner.js';
import { createSqliteRepositories } from './repositories.js';

describe('repositórios SQLite completos', () => {
  let driver;
  let repositories;

  beforeEach(async () => {
    vi.stubGlobal('localStorage', {
      getItem: vi.fn(() => 'device-test'),
      setItem: vi.fn(),
    });
    driver = createNodeSqliteDriver();
    await runMigrations(driver, migrations);
    repositories = createSqliteRepositories(driver);
  });

  afterEach(() => {
    driver?.close();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('persiste, atualiza e cria tombstone com fila de sincronização', async () => {
    const id = await repositories.metas.create('local', {
      nome: 'Reserva', valorAlvo: 1000, corKey: 'verde',
    });
    await repositories.metas.aportar('local', { id, valorAtual: 0 }, 150);

    expect(await repositories.metas.list('local')).toEqual([
      expect.objectContaining({ id, nome: 'Reserva', valorAtual: 150 }),
    ]);

    await driver.run("UPDATE local_documents SET sync_status='synced' WHERE dominio='metas' AND id=?", [id]);
    await driver.run("DELETE FROM sync_queue WHERE entidade='metas' AND registro_id=?", [id]);
    await repositories.metas.remove('local', id);
    expect(await repositories.metas.list('local')).toEqual([]);
    expect((await driver.get(
      'SELECT deleted_at FROM local_documents WHERE dominio=? AND id=?',
      ['metas', id]
    )).deleted_at).toBeTruthy();

    const queued = await driver.all(
      'SELECT operacao FROM sync_queue WHERE entidade=? AND registro_id=? ORDER BY created_at',
      ['metas', id]
    );
    expect(queued.map((item) => item.operacao)).toEqual(['delete']);
  });

  it('gera recorrências deterministicamente sem duplicar', async () => {
    const id = await repositories.recorrencias.create('local', {
      tipo: 'despesa', descricao: 'Aluguel', valor: 900,
      diaVencimento: 31, mesInicio: '2026-02',
    });

    expect(await repositories.recorrencias.ensureGeneratedForMonth('local', '2026-02')).toBe(true);
    expect(await repositories.recorrencias.ensureGeneratedForMonth('local', '2026-02')).toBe(false);
    expect(await repositories.lancamentos.listByMonth('local', '2026-02')).toEqual([
      expect.objectContaining({
        id: `${id}_2026-02`,
        descricao: 'Aluguel',
        dataVencimento: '2026-02-28',
      }),
    ]);
  });

  it('conclui onboarding inteiramente no banco local', async () => {
    await repositories.configuracoes.completeOnboarding('local', {
      incomeDescription: 'Salário', incomeValue: '5000', incomeDay: '5',
      expenseDescription: 'Internet', expenseValue: '120', expenseDay: '10',
      goalName: 'Reserva', goalValue: '10000',
    });

    expect(await repositories.configuracoes.getOnboardingState('local')).toEqual({
      completed: true,
      skipped: false,
    });
    expect(await repositories.categorias.list('local')).not.toHaveLength(0);
    expect(await repositories.recorrencias.list('local')).toHaveLength(2);
    expect(await repositories.metas.list('local')).toHaveLength(1);
  });

  it('mantém configurações mensais e dados do gestor localmente', async () => {
    await repositories.planejamento.setSaldoInicial('local', '2026-07', 250);
    await repositories.planejamento.setOrcamentoCategoria('local', '2026-07', 'moradia', 800);
    await repositories.gestor.setUsaMovimento('local', false);

    expect(await repositories.planejamento.getMensal('local', '2026-07')).toEqual({
      saldoInicial: 250,
      orcamentos: { moradia: 800 },
    });
    expect(await repositories.gestor.getUsaMovimento('local')).toBe(false);
  });

  it('cobre regras, valor livre e fechamento mensal sem Firebase', async () => {
    await repositories.regrasCategorizacao.create('local', {
      termo: 'farmácia', tipo: 'despesa', categoriaId: 'saude', prioridade: 1, ativa: true,
    });
    await repositories.valorLivre.setDistribuicaoMensal('local', '2026-07', [
      { categoriaId: 'lazer', valor: 80 },
    ]);
    await repositories.fechamentos.fechar(
      'local',
      '2026-07',
      { saldoInicial: 100, receitas: 1000, despesas: 700, saldoCalculado: 400 },
      390,
      'Conferido',
      false
    );

    expect(await repositories.regrasCategorizacao.list('local')).toHaveLength(1);
    expect(await repositories.valorLivre.getDistribuicaoMensal('local', '2026-07')).toEqual([
      { categoriaId: 'lazer', valor: 80 },
    ]);
    expect(await repositories.fechamentos.get('local', '2026-07')).toEqual(
      expect.objectContaining({ status: 'fechado', saldoReal: 390, diferenca: -10 })
    );
  });
});
