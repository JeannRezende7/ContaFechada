import { useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import {
  AdMob,
  BannerAdPosition,
  BannerAdSize,
} from '@capacitor-community/admob';
import { useLocation } from 'react-router-dom';
import { usePremium } from '../../../contexts/PremiumContext.jsx';

const BANNER_ID = 'ca-app-pub-2348078870364679/7287883480';
const AD_ROUTES = new Set(['/', '/resumo']);
let initialized = false;

async function showBanner() {
  if (!initialized) {
    await AdMob.initialize();
    initialized = true;
  }
  let consent = await AdMob.requestConsentInfo();
  if (!consent.canRequestAds && consent.isConsentFormAvailable) {
    consent = await AdMob.showConsentForm();
  }
  if (!consent.canRequestAds) return;
  await AdMob.showBanner({
    adId: BANNER_ID,
    adSize: BannerAdSize.ADAPTIVE_BANNER,
    position: BannerAdPosition.BOTTOM_CENTER,
    margin: 0,
    isTesting: false,
  });
}

export default function AdMobBannerController() {
  const { pathname } = useLocation();
  const { hasProAccess, loading } = usePremium();

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return undefined;
    const shouldShow = !loading && !hasProAccess && AD_ROUTES.has(pathname);

    if (shouldShow) {
      document.body.classList.add('admob-banner-visible');
      showBanner().catch((error) => console.error('Falha ao mostrar anúncio de teste.', error));
    } else {
      document.body.classList.remove('admob-banner-visible');
      AdMob.removeBanner().catch(() => {});
    }

    return () => {
      document.body.classList.remove('admob-banner-visible');
      AdMob.removeBanner().catch(() => {});
    };
  }, [hasProAccess, loading, pathname]);

  return null;
}
