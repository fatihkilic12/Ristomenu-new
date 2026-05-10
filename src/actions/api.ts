import axios from 'axios';
import { SERVER_ADDRESS } from '@/config/constants';
import i18n from '@/locales';

const api = axios.create({
  baseURL: SERVER_ADDRESS,
  headers: { 'Content-Type': 'application/json' },
});

// Automatically attach current language to every request
api.interceptors.request.use((config) => {
  config.headers['Accept-Language'] = i18n.language || 'en';
  return config;
});

export default api;
