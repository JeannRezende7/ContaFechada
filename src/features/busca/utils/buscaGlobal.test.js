import { describe, expect, it } from 'vitest';
import { filtrarBuscaGlobal } from './buscaGlobal.js';

describe('busca global', () => {
  it('combina texto sem acento, recurso e valor', () => {
    const items = [
      { id: '1', recurso: 'lancamentos', titulo: 'Alimentação', valor: 50, tipo: 'despesa' },
      { id: '2', recurso: 'metas', titulo: 'Viagem', valor: 1000 },
    ];
    const result = filtrarBuscaGlobal(items, {
      query: 'alimentacao', recurso: 'lancamentos', tipo: 'todos', status: 'todos',
      categoriaId: '', de: '', ate: '', valorMin: '40', valorMax: '60',
    });
    expect(result.map((item) => item.id)).toEqual(['1']);
  });
});
