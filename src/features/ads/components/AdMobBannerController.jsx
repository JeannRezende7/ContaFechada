import { useEffect, useRef, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { AdMob, BannerAdPluginEvents, BannerAdPosition, BannerAdSize } from '@capacitor-community/admob';
import { usePremium } from '../../../contexts/PremiumContext.jsx';
import { getAdMobRuntimeConfig } from '../../../config/ads.js';
import { applyBannerLayout } from '../utils/adLayout.js';
import { reportError } from '../../../utils/crashReporting.js';

let initialized = false;
let consentPromise;

function clearBannerSpace() {
  applyBannerLayout(0);
}

export function hasBlockingOverlay(documentRef = document) {
  return [...documentRef.querySelectorAll('.fixed.inset-0')].some((element) => (
    element.getAttribute('aria-hidden') !== 'true'
    && !element.classList.contains('pointer-events-none')
  ));
}

async function ensureInitialized() {
  if (initialized) return;
  await AdMob.initialize();
  initialized = true;
}

async function showBanner() {
  await ensureInitialized();
  const config = getAdMobRuntimeConfig();
  if (!config.isTesting) {
    consentPromise ??= (async () => {
      let current = await AdMob.requestConsentInfo();
      if (!current.canRequestAds && current.isConsentFormAvailable) current = await AdMob.showConsentForm();
      return current;
    })();
    const consent = await consentPromise;
    if (!consent.canRequestAds) return false;
  }
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
  const { hasProAccess, loading } = usePremium();
  const [overlayOpen, setOverlayOpen] = useState(() => hasBlockingOverlay());
  const bannerMayOccupySpace = useRef(false);
  bannerMayOccupySpace.current = !loading && !hasProAccess && !overlayOpen;

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return undefined;
    let disposed = false;
    const handles = [];
    Promise.all([
      AdMob.addListener(BannerAdPluginEvents.SizeChanged, ({ height }) => {
        if (!disposed && bannerMayOccupySpace.current) applyBannerLayout(height);
      }),
      AdMob.addListener(BannerAdPluginEvents.FailedToLoad, (error) => {
        clearBannerSpace();
        reportError(error, 'admob_banner_load');
      }),
    ]).then((listeners) => {
      if (disposed) listeners.forEach((handle) => handle.remove());
      else handles.push(...listeners);
    }).catch((error) => reportError(error, 'admob_banner_listeners'));
    return () => {
      disposed = true;
      handles.forEach((handle) => handle.remove());
    };
  }, []);

  useEffect(() => {
    const refresh = () => setOverlayOpen(hasBlockingOverlay());
    refresh();
    const observer = new MutationObserver(refresh);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return undefined;
    let active = true;
    const shouldShow = !loading && !hasProAccess && !overlayOpen;

    if (shouldShow) {
      showBanner().then((shown) => {
        if (!active && shown) AdMob.removeBanner().catch(() => {});
      }).catch((error) => {
        clearBannerSpace();
        reportError(error, 'admob_banner');
      });
    } else {
      clearBannerSpace();
      AdMob.removeBanner().catch(() => {});
    }

    return () => {
      active = false;
      clearBannerSpace();
      AdMob.removeBanner().catch(() => {});
    };
  }, [hasProAccess, loading, overlayOpen]);

  return null;
}

export async function disposeAdMobForTests() {
  initialized = false;
  consentPromise = undefined;
  clearBannerSpace();
}
