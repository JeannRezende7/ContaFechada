export function applyBannerLayout(height, documentRef = document) {
  if (Number(height) > 0) {
    documentRef.body.style.setProperty('--admob-banner-height', `${Number(height)}px`);
    documentRef.body.classList.add('admob-banner-visible');
    return;
  }
  documentRef.body.classList.remove('admob-banner-visible');
  documentRef.body.style.removeProperty('--admob-banner-height');
}
