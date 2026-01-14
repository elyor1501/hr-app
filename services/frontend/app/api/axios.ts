import axios, { AxiosError } from 'axios';

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL,
  timeout: 10000,
});

api.interceptors.request.use((config) => {
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
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);
