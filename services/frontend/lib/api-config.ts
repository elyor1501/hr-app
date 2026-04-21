export const getApiUrl = (): string => {
  if (typeof window === 'undefined') {
    return 'http://backend:8000';
  }
  
  const url = process.env.NEXT_PUBLIC_API_URL;
  if (!url || url === 'undefined' || url.trim() === '') {
    return '';
  }
  
  return url;
};

export const getAuthToken = (): string | null => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('access_token');
  }
  return null;
};

export const getAuthHeaders = (): HeadersInit => {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  const token = getAuthToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
};