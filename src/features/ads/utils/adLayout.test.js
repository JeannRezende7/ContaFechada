import { describe, expect, it, vi } from 'vitest';
import { applyBannerLayout } from './adLayout.js';

function fakeDocument() {
  return { body: { classList: { add: vi.fn(), remove: vi.fn() }, style: { setProperty: vi.fn(), removeProperty: vi.fn() } } };
}

describe('AdMob banner layout', () => {
  it('reserves exactly the adaptive banner height', () => {
    const doc = fakeDocument();
    applyBannerLayout(72, doc);
    expect(doc.body.style.setProperty).toHaveBeenCalledWith('--admob-banner-height', '72px');
    expect(doc.body.classList.add).toHaveBeenCalledWith('admob-banner-visible');
  });

  it('removes reserved space when the banner disappears', () => {
    const doc = fakeDocument();
    applyBannerLayout(0, doc);
    expect(doc.body.classList.remove).toHaveBeenCalledWith('admob-banner-visible');
    expect(doc.body.style.removeProperty).toHaveBeenCalledWith('--admob-banner-height');
  });
});
