export const COMPANY_LANDING = (id: string) => `/company/${id}`;
export const COMPANY_TABLE = (id: string) => `/company/${id}/table`;
export const COMPANY_MENU = (id: string, table: string) => `/company/${id}/${table}`;
export const COMPANY_KIOSK = (id: string) => `/company/${id}/kiosk`;
// Fallback kiosk-mode using a dine-in tablet — operator switches a normal
// QR tablet into kiosk takeout flow when the main kiosk is busy. Same
// design as the dine-in menu but with a customer-name prompt up front and
// `order_type=kiosk` on submit (server assigns a kiosk-pool table).
export const COMPANY_KIOSK_TABLE = (id: string) => `/company/${id}/kiosk-table`;
export const COMPANY_ORDER = (id: string) => `/company/${id}/order`;
export const COMPANY_CHECKOUT = (id: string) => `/company/${id}/order/checkout`;
export const COMPANY_ORDER_TRACK = (id: string, key: string) => `/company/${id}/order/track/${key}`;
export const COMPANY_MENU_ONLY = (id: string) => `/company/${id}/menu`;
