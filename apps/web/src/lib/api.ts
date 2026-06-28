import axios from 'axios';
import { PanelType } from './panel';
import { getApiBaseUrl } from './api-url';
import { isPublicAuthPath } from './reset-client-state';

function redirectToLogin() {
  if (typeof window !== 'undefined' && isPublicAuthPath(window.location.pathname)) {
    return;
  }
  const panel = localStorage.getItem('panel');
  localStorage.clear();
  window.location.href = panel ? `/${panel}` : '/isletme';
}

export const api = axios.create({
  baseURL: getApiBaseUrl(),
  headers: { 'Content-Type': 'application/json' },
});

// Token interceptor
api.interceptors.request.use((config) => {
  config.baseURL = getApiBaseUrl();
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('accessToken');
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Refresh token on 401
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    if (error.response?.status === 401 && typeof window !== 'undefined') {
      // Login ve refresh isteklerinde 401 alınırsa yönlendirme yapma, sadece hatayı fırlat
      if (error.config?.url?.includes('/auth/login') || error.config?.url?.includes('/auth/refresh')) {
        return Promise.reject(error);
      }

      const refreshToken = localStorage.getItem('refreshToken');
      if (refreshToken) {
        try {
          const res = await axios.post(`${getApiBaseUrl()}/auth/refresh`, { refreshToken });
          localStorage.setItem('accessToken', res.data.accessToken);
          localStorage.setItem('refreshToken', res.data.refreshToken);
          error.config.headers.Authorization = `Bearer ${res.data.accessToken}`;
          return api(error.config);
        } catch {
          redirectToLogin();
        }
      } else {
        redirectToLogin();
      }
    }
    return Promise.reject(error);
  },
);

// Generic fetch helper (fetch API style)
export async function apiFetch<T = unknown>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  if (!headers.has('Content-Type') && options.body) {
    headers.set('Content-Type', 'application/json');
  }

  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('accessToken');
    if (token) headers.set('Authorization', `Bearer ${token}`);
  }

  const res = await fetch(`${getApiBaseUrl()}${path}`, { ...options, headers });

  if (res.status === 401 && typeof window !== 'undefined') {
    const refreshToken = localStorage.getItem('refreshToken');
    if (refreshToken) {
      try {
        const refreshRes = await axios.post(`${getApiBaseUrl()}/auth/refresh`, { refreshToken });
        localStorage.setItem('accessToken', refreshRes.data.accessToken);
        localStorage.setItem('refreshToken', refreshRes.data.refreshToken);
        headers.set('Authorization', `Bearer ${refreshRes.data.accessToken}`);
        const retry = await fetch(`${getApiBaseUrl()}${path}`, { ...options, headers });
        if (!retry.ok) throw new Error(retry.statusText);
        return retry.json();
      } catch {
        redirectToLogin();
        throw new Error('Unauthorized');
      }
    }
    redirectToLogin();
    throw new Error('Unauthorized');
  }

  if (!res.ok) throw new Error(res.statusText);
  return res.json();
}

// Auth helpers
export const authApi = {
  login: (email: string, password: string, panel?: PanelType) =>
    api.post('/auth/login', { email, password, panel }).then((r) => r.data),
  loginPhone: (phone: string, password: string, panel?: PanelType) =>
    api.post('/auth/login-phone', { phone, password, panel: panel || 'isletme' }).then((r) => r.data),
  registerBusiness: (body: unknown) =>
    api.post('/auth/register-business', body).then((r) => r.data),
  logout: () => api.post('/auth/logout').then((r) => r.data),
  me: () => api.post('/auth/me').then((r) => r.data),
  updatePreferences: (preferences: unknown) => 
    api.patch('/users/me/preferences', preferences).then((r) => r.data),
};

// Reports
export const reportsApi = {
  getBossScreen: () => api.get('/reports/boss-screen').then((r) => r.data),
};

// Platform
export const platformApi = {
  getHealth: () => api.get('/platform/health').then((r) => r.data),
  getBoss: (period?: string) =>
    api.get('/platform/boss', { params: { period } }).then((r) => r.data),
  getModules: () => api.get('/platform/modules').then((r) => r.data),
  upsertModule: (body: unknown) => api.post('/platform/modules', body).then((r) => r.data),
  createKontorPackage: (body: unknown) =>
    api.post('/platform/kontor-packages', body).then((r) => r.data),
  updateKontorPackage: (id: string, body: unknown) =>
    api.patch(`/platform/kontor-packages/${id}`, body).then((r) => r.data),
  getPlanModules: (plan: string) => api.get(`/platform/plans/${plan}/modules`).then((r) => r.data),
  setPlanModules: (plan: string, moduleCodes: string[]) =>
    api.post(`/platform/plans/${plan}/modules`, { moduleCodes }).then((r) => r.data),
  getKontorBalances: () => api.get('/platform/kontor/balances').then((r) => r.data),
  getKontorSummary: () => api.get('/platform/kontor/summary').then((r) => r.data),
  getKontorPackages: () => api.get('/platform/kontor/packages').then((r) => r.data),
  getSubscriptionAddons: () => api.get('/platform/addons').then((r) => r.data),
  getPublicPricing: () => api.get('/platform/pricing/public').then((r) => r.data),
  getSubmodulePricing: () => api.get('/platform/submodule-pricing').then((r) => r.data),
  upsertSubmodulePricing: (
    items: Array<{
      moduleId: string;
      yearlyPrice: number;
      sellableExtra?: boolean;
      isActive?: boolean;
    }>,
  ) => api.post('/platform/submodule-pricing', { items }).then((r) => r.data),
  getPlatformReports: (period?: string) =>
    api.get('/platform/reports', { params: { period } }).then((r) => r.data),
  purchaseKontor: (packageId: string) =>
    api.post('/platform/kontor/purchase', { packageId }).then((r) => r.data),
  getCommissionInvoices: () => api.get('/platform/commission-invoices').then((r) => r.data),
  createCommissionInvoice: (body: unknown) =>
    api.post('/platform/commission-invoices', body).then((r) => r.data),
  sendCommissionInvoice: (id: string) =>
    api.post(`/platform/commission-invoices/${id}/send`).then((r) => r.data),
  updateCommissionInvoiceStatus: (id: string, body: unknown) =>
    api.patch(`/platform/commission-invoices/${id}/status`, body).then((r) => r.data),
  getNotifications: () => api.get('/platform/notifications').then((r) => r.data),
  markNotificationRead: (id: string) =>
    api.patch(`/platform/notifications/${id}/read`).then((r) => r.data),
  getTenantReport: (id: string) => api.get(`/platform/tenants/${id}/report`).then((r) => r.data),
  quoteSubscription: (
    plan: string,
    addonCodes: string[],
    extraBranchCount: number = 0,
    opts?: {
      tenantId?: string;
      extensionMonths?: number;
      billingMode?: 'new' | 'upgrade' | 'renewal';
      includeAnnualRenewal?: boolean;
      extraModuleIds?: string[];
    },
  ) =>
    api
      .post('/platform/subscription/quote', {
        plan,
        addonCodes,
        extraBranchCount,
        extraModuleIds: opts?.extraModuleIds ?? [],
        ...opts,
      })
      .then((r) => r.data),
  quoteSubscriptionPublic: (
    plan: string,
    addonCodes: string[],
    extraBranchCount: number = 0,
    opts?: {
      extensionMonths?: number;
      billingMode?: 'new' | 'upgrade' | 'renewal';
      extraModuleIds?: string[];
      includeAnnualRenewal?: boolean;
      tenantId?: string;
    },
  ) =>
    api
      .post('/platform/subscription/quote-public', {
        plan,
        addonCodes,
        extraBranchCount,
        extraModuleIds: opts?.extraModuleIds ?? [],
        ...opts,
      })
      .then((r) => r.data),
  purchaseSubscription: (data: {
    tenantId: string;
    plan: string;
    addonCodes?: string[];
    extraModuleIds?: string[];
    extraBranchCount?: number;
    extensionMonths?: number;
    includeAnnualRenewal?: boolean;
    billingMode?: 'new' | 'upgrade' | 'renewal';
    buyer?: any;
    acceptedDocuments?: string[];
  }) => api.post('/platform/subscription/purchase', data).then((r) => r.data),
  confirmPendingSubscription: (tenantId?: string) =>
    api
      .post('/platform/subscription/confirm', tenantId ? { tenantId } : {})
      .then((r) => r.data),
  getLegalDocuments: (context?: string) =>
    api.get('/platform/legal/documents', { params: context ? { context } : {} }).then((r) => r.data),
  getLegalDocument: (id: string) => api.get(`/platform/legal/documents/${id}`).then((r) => r.data),
  getChatbotSettings: () => api.get('/platform/chatbot-settings').then((r) => r.data),
  updateChatbotSettings: (body: unknown) =>
    api.patch('/platform/chatbot-settings', body).then((r) => r.data),
  testChatbotSettings: () => api.post('/platform/chatbot-settings/test').then((r) => r.data),
  listOllamaModels: (baseUrl?: string) =>
    api
      .get('/platform/chatbot-settings/ollama-models', { params: baseUrl ? { baseUrl } : {} })
      .then((r) => r.data),
};

export const tenantsApi = {
  getTenant: (id: string) => api.get(`/tenants/${id}`).then((r) => r.data),
  updateTenant: (id: string, data: any) => api.patch(`/tenants/${id}`, data).then((r) => r.data),
  createTenantUser: (id: string, data: any) => api.post(`/tenants/${id}/users`, data).then((r) => r.data),
  getTenantInventory: (id: string) => api.get(`/tenants/${id}/inventory-dashboard`).then((r) => r.data),
  getSubscriptionStatus: (tenantId?: string) =>
    api
      .get('/tenants/subscriptions/status', { params: tenantId ? { tenantId } : {} })
      .then((r) => r.data),
  updateTenantStatus: (id: string, data: { isActive?: boolean; isArchived?: boolean }) =>
    api.patch(`/tenants/${id}`, data).then((r) => r.data),
};

// Users
export const usersApi = {
  getUsers: () => api.get('/users').then((r) => r.data),
};

// Inventory
export const inventoryApi = {
  getDashboard: () => api.get('/inventory/dashboard').then((r) => r.data),
  createTransfer: (data: any) => api.post('/inventory/transfers', data).then((r) => r.data),
};

// HR
export const hrApi = {
  getLeaves: () => api.get('/hr/leaves').then((r) => r.data),
  createLeave: (body: unknown) => api.post('/hr/leaves', body).then((r) => r.data),
  getPayrolls: () => api.get('/hr/payroll').then((r) => r.data),
  createPayroll: (body: unknown) => api.post('/hr/payroll', body).then((r) => r.data),
};

// CRM
export const crmApi = {
  getLeads: () => api.get('/crm/leads').then((r) => r.data),
  createLead: (body: unknown) => api.post('/crm/leads', body).then((r) => r.data),
  getDeals: () => api.get('/crm/deals').then((r) => r.data),
  createDeal: (body: unknown) => api.post('/crm/deals', body).then((r) => r.data),
  updateDealStage: (id: string, stage: string) => api.patch(`/crm/deals/${id}/stage`, { stage }).then((r) => r.data),
};

// AI
export const aiApi = {
  chat: (query: string) => api.post('/ai/chat', { query }).then((r) => r.data),
};

// B2C
export const b2cApi = {
  getIntegrations: () => api.get('/b2c/integrations').then((r) => r.data),
  setupIntegration: (provider: string, config: unknown) => api.post(`/b2c/integrations/${provider}`, config).then((r) => r.data),
};

export async function uploadProductImage(file: File) {
  const fd = new FormData();
  fd.append('file', file);
  const res = await api.post('/uploads/product-image', fd, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data as { url: string };
}
