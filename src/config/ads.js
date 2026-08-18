export const ADMOB_IDS = {
  app: 'ca-app-pub-2348078870364679~6300592106',
  mainBanner: 'ca-app-pub-2348078870364679/7287883480',
};

export function getAdMobRuntimeConfig({ testing = __ADMOB_TESTING__ } = {}) {
  return { bannerId: ADMOB_IDS.mainBanner, isTesting: Boolean(testing) };
}
