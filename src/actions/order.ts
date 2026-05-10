import api from './api';

export const placeOrder = (storeId: string, data: Record<string, unknown>) =>
  api.post(`/api/v2/store/${storeId}/create-order/`, data).then(r => r.data);

export const fetchGuestOrder = (secretKey: string) =>
  api.get(`/api/v2/order/guest/${secretKey}/`).then(r => r.data).catch(() => null);
