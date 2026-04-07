import axios, { AxiosError } from 'axios';
import { redirectToLogin } from './utils/auth';

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || '/api',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  
  if (process.env.NODE_ENV === 'development') {
    console.log('[API REQUEST]', config.method?.toUpperCase(), config.url);
  }
  return config;
});

api.interceptors.response.use(
  (response) => {
    if (process.env.NODE_ENV === 'development') {
      console.log('[API RESPONSE]', response.status, response.config.url);
    }
    return response;
  },
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      redirectToLogin();
    }
    return Promise.reject(error);
  }
);