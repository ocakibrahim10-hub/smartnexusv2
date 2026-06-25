import axios from 'axios';
import { API_URL } from '../config/env';
import { getAccessToken } from './session';

export const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 90000,
});

api.interceptors.request.use(
  async (config) => {
    const token = await getAccessToken();
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

export const posApi = {
  getProducts: (q = '', categoryId = '') =>
    api.get('/pos/products/grid', { params: { q, categoryId } }).then((res) => res.data),
  checkout: (data: Record<string, unknown>) =>
    api.post('/pos/checkout', data).then((res) => res.data),
};

export default api;
