const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

export const apiClient = async (endpoint, options = {}) => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('dispatchly_access_token') : null;

  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const url = `${API_BASE}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

  const response = await fetch(url, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    // If token expired, try refreshing
    if (response.status === 401 && typeof window !== 'undefined') {
      const refreshToken = localStorage.getItem('dispatchly_refresh_token');
      if (refreshToken && !options._retry) {
        try {
          const refreshRes = await fetch(`${API_BASE}/auth/refresh`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refreshToken }),
          });
          const refreshData = await refreshRes.json();
          if (refreshRes.ok && refreshData.data?.tokens) {
            localStorage.setItem('dispatchly_access_token', refreshData.data.tokens.accessToken);
            localStorage.setItem('dispatchly_refresh_token', refreshData.data.tokens.refreshToken);
            // Retry initial request with new token
            return apiClient(endpoint, {
              ...options,
              _retry: true,
              headers: {
                ...options.headers,
                Authorization: `Bearer ${refreshData.data.tokens.accessToken}`,
              },
            });
          }
        } catch {
          // Token refresh failed, continue to throw
        }
      }
    }

    const error = new Error(data.error?.message || response.statusText || 'API Request Failed');
    error.status = response.status;
    error.code = data.error?.code;
    error.details = data.error?.details;
    throw error;
  }

  return data;
};
