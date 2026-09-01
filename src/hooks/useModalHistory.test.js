import { describe, expect, it } from 'vitest';
import { shouldCloseModalOnPopState } from './useModalHistory.js';

describe('shouldCloseModalOnPopState', () => {
  it('mantém o modal pai aberto quando o histórico volta do filho para ele', () => {
    expect(shouldCloseModalOnPopState(
      { __contafechadaModal: 'modal-pai' },
      'modal-pai'
    )).toBe(false);
  });

  it('fecha somente o modal que deixou de ser a entrada atual', () => {
    expect(shouldCloseModalOnPopState(
      { __contafechadaModal: 'modal-pai' },
      'modal-filho'
    )).toBe(true);
  });

  it('fecha o modal ao voltar para uma página sem entrada modal', () => {
    expect(shouldCloseModalOnPopState(null, 'modal-pai')).toBe(true);
  });
});
