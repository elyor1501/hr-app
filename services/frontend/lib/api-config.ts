export const getApiUrl = (): string => {
  if (typeof window === "undefined") {
    return process.env.INTERNAL_API_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
  }
  

  const url = process.env.NEXT_PUBLIC_API_URL;
  if (!url || url === 'undefined' || url.trim() === '') {
    return '';
  }

  if (url.startsWith("http://") && window.location.protocol === "https:") {
    console.error("Insecure API URL blocked:", url);
    return url.replace("http://", "https://");
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
