import { useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { AdMob, BannerAdPosition, BannerAdSize, BannerAdPluginEvents } from '@capacitor-community/admob';
import { useLocation } from 'react-router-dom';
import { usePremium } from '../../../contexts/PremiumContext.jsx';
import { getAdMobRuntimeConfig } from '../../../config/ads.js';
import { applyBannerLayout } from '../utils/adLayout.js';

const AD_ROUTES = new Set(['/', '/resumo']);
let initialized = false;
let sizeListener;
let consentPromise;

function clearBannerSpace() {
  applyBannerLayout(0);
}

async function ensureInitialized() {
  if (initialized) return;
  await AdMob.initialize();
  sizeListener = await AdMob.addListener(BannerAdPluginEvents.SizeChanged, ({ height }) => {
    applyBannerLayout(height);
  });
  initialized = true;
}

async function showBanner() {
  await ensureInitialized();
  consentPromise ??= (async () => {
    let current = await AdMob.requestConsentInfo();
    if (!current.canRequestAds && current.isConsentFormAvailable) current = await AdMob.showConsentForm();
    return current;
  })();
  const consent = await consentPromise;
  if (!consent.canRequestAds) return false;
  const config = getAdMobRuntimeConfig();
  await AdMob.showBanner({
    adId: config.bannerId,
    adSize: BannerAdSize.ADAPTIVE_BANNER,
    position: BannerAdPosition.BOTTOM_CENTER,
    margin: 0,
    isTesting: config.isTesting,
  });
  return true;
}

export default function AdMobBannerController() {
  const { pathname } = useLocation();
  const { hasProAccess, loading } = usePremium();

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return undefined;
    let active = true;
    const shouldShow = !loading && !hasProAccess && AD_ROUTES.has(pathname);

    if (shouldShow) {
      showBanner().then((shown) => {
        if (!active && shown) AdMob.removeBanner().catch(() => {});
      }).catch((error) => console.error('Falha ao mostrar anuncio.', error));
    } else {
      clearBannerSpace();
      AdMob.removeBanner().catch(() => {});
    }

    return () => {
      active = false;
      clearBannerSpace();
      AdMob.removeBanner().catch(() => {});
    };
  }, [hasProAccess, loading, pathname]);

  return null;
}

export async function disposeAdMobForTests() {
  await sizeListener?.remove();
  sizeListener = undefined;
  initialized = false;
  consentPromise = undefined;
  clearBannerSpace();
}
