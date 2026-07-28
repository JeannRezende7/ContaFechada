import { describe, expect, it } from 'vitest';
import { aplicarRegras, encontrarRegra } from './regrasCategorizacao.js';

const regras = [
  { id: '1', termo: 'uber', tipo: 'despesa', categoriaId: 'transporte', prioridade: 1, ativa: true },
  { id: '2', termo: 'uber trip', tipo: 'despesa', categoriaId: 'viagem', prioridade: 5, ativa: true },
];

describe('regras de categorização', () => {
  it('ignora acentos e respeita prioridade', () => {
    expect(encontrarRegra({ descricao: 'UBER TRIP SÃO PAULO', tipo: 'despesa' }, regras)?.id).toBe('2');
  });

  it('preserva categoria informada', () => {
    expect(aplicarRegras([{ descricao: 'Uber', tipo: 'despesa', categoriaId: 'manual' }], regras)[0].categoriaId).toBe('manual');
  });
});
