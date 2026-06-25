import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// For Android emulator, localhost is 10.0.2.2. For iOS it's localhost.
const BASE_URL = Platform.OS === 'android' ? 'http://10.0.2.2:3001' : 'http://localhost:3001';

export const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor: Attach token if available
api.interceptors.request.use(
  async (config) => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (e) {
      console.error('Error reading token:', e);
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export const posApi = {
  getProducts: (q = '', categoryId = '') =>
    api.get('/pos/products/grid', { params: { q, categoryId } }).then((res) => res.data),
  checkout: (data: any) => api.post('/pos/checkout', data).then((res) => res.data),
};

export default api;
