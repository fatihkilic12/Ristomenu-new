import api from './api';

export const getCompanyInfo = (id: string) =>
  api.get(`/api/v2/store/${id}/`).then(r => r.data).catch(() => null);

export const getCompanyMenu = (id: string, table: string) =>
  api.get(`/api/v2/store/${id}/${table}/menu/`).then(r => r.data).catch(() => null);

export const getDeliveryMenu = (id: string, type = 'delivery') =>
  api.get(`/api/v2/store/${id}/menu/?type=${type}`).then(r => r.data).catch(() => null);

export const getKioskMenu = (id: string) =>
  api.get(`/api/v2/store/${id}/kiosk/menu/`).then(r => r.data).catch(() => null);

export const getStoreConfig = (id: string) =>
  api.get(`/api/v2/store/${id}/config/`).then(r => r.data).catch(() => null);
