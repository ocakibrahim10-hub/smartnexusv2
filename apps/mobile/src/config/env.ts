import { Platform } from 'react-native';

const PROD_WEB = process.env.EXPO_PUBLIC_WEB_URL || 'https://smartnexusv2.vercel.app';
const PROD_API = process.env.EXPO_PUBLIC_API_URL || 'https://smartnexus-api.onrender.com/api';

const DEV_API =
  Platform.OS === 'android' ? 'http://10.0.2.2:3001/api' : 'http://localhost:3001/api';
const DEV_WEB = Platform.OS === 'android' ? 'http://10.0.2.2:3000' : 'http://localhost:3000';

/** Canlı mod: release build her zaman production URL kullanır */
export const IS_LIVE = !__DEV__;

export const WEB_URL = __DEV__ ? DEV_WEB : PROD_WEB;
export const API_URL = __DEV__ ? DEV_API : PROD_API;

export const APP_NAME = 'SmartNexus Player v2';
export const PRIMARY = '#606BDF';
export const PAGE_BG = '#FBF8FF';
