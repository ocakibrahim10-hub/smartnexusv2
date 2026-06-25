import type { ExpoConfig, ConfigContext } from 'expo/config';

const WEB_URL = process.env.EXPO_PUBLIC_WEB_URL ?? 'https://smartnexusv2.vercel.app';
const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'https://smartnexus-api.onrender.com/api';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'SmartNexus Player',
  slug: 'smartnexus-player',
  version: '2.0.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'light',
  scheme: 'smartnexus',
  splash: {
    image: './assets/icon.png',
    resizeMode: 'contain',
    backgroundColor: '#FBF8FF',
  },
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'com.minebilisim.smartnexus.player',
  },
  android: {
    package: 'com.minebilisim.smartnexus.player',
    versionCode: 2,
    adaptiveIcon: {
      backgroundColor: '#E0E0FF',
      foregroundImage: './assets/android-icon-foreground.png',
      backgroundImage: './assets/android-icon-background.png',
      monochromeImage: './assets/android-icon-monochrome.png',
    },
    predictiveBackGestureEnabled: false,
  },
  web: {
    favicon: './assets/favicon.png',
  },
  plugins: ['expo-camera'],
  extra: {
    webUrl: WEB_URL,
    apiUrl: API_URL,
    eas: {
      projectId: process.env.EAS_PROJECT_ID ?? 'smartnexus-player-v2',
    },
  },
});
