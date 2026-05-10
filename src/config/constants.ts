export const SERVER_ADDRESS = import.meta.env.VITE_PUBLIC_SERVER_ADDRESS || 'http://localhost:8000';
export const IMAGE_SERVER_ADDRESS = import.meta.env.VITE_PUBLIC_IMAGE_ADDRESS || SERVER_ADDRESS;
export const API_SERVER_ADDRESS = `${SERVER_ADDRESS}/api`;
export const IMAGE_ADDRESS = (id: string | number) => `${SERVER_ADDRESS}/api/v2/image/${id}/`;

export const EURO = '€';
export const ADD = 'ADD' as const;
export const EDIT = 'EDIT' as const;

export const DELIVERY = 'delivery';
export const PICKUP = 'pickup';
export const DINE_IN = 'dine_in';
export const KIOSK = 'kiosk';
export const ONLINE = 'online';
export const OFFLINE = 'offline';

export const ORDERSTATUS = {
  PENDING: 'PENDING',
  PREPARING: 'PREPARING',
  READY_FOR_PICKUP: 'READY_FOR_PICKUP',
  OUT_FOR_DELIVERY: 'OUT_FOR_DELIVERY',
  DELIVERED: 'DELIVERED',
  PICKED_UP: 'PICKED_UP',
  CANCELLED: 'CANCELLED',
  AWAITING_PAYMENT: 'AWAITING_PAYMENT',
  FAILED: 'FAILED',
  HANDLED: 'HANDLED',
  SEND: 'SEND',
  SCHEDULED: 'SCHEDULED',
} as const;
