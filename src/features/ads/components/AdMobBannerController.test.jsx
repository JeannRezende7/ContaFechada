import { describe, expect, it } from 'vitest';
import { hasBlockingOverlay } from './AdMobBannerController.jsx';

function documentWith(elements) {
  return {
    querySelectorAll: () => elements,
  };
}

function overlay({ hidden = false, pointerEventsNone = false } = {}) {
  return {
    getAttribute: (name) => (name === 'aria-hidden' && hidden ? 'true' : null),
    classList: {
      contains: (name) => name === 'pointer-events-none' && pointerEventsNone,
    },
  };
}

describe('hasBlockingOverlay', () => {
  it('detecta um modal aberto', () => {
    expect(hasBlockingOverlay(documentWith([overlay()]))).toBe(true);
  });

  it('ignora camadas decorativas e menus fechados', () => {
    expect(hasBlockingOverlay(documentWith([
      overlay({ hidden: true }),
      overlay({ pointerEventsNone: true }),
    ]))).toBe(false);
  });
});
