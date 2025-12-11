// Universal API Client for auxchat
const API_BASE = import.meta.env.PROD ? 'https://onproduct.pro' : 'http://localhost:8000';

interface FetchOptions extends RequestInit {
  headers?: Record<string, string>;
}

export const apiClient = {
  async fetch(endpoint: string, options: FetchOptions = {}) {
    const userId = localStorage.getItem('auxchat_user_id');
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(userId && { 'X-User-Id': userId }),
      ...options.headers,
    };

    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok && response.status !== 404) {
      throw new Error(`API Error: ${response.statusText}`);
    }

    return response.json();
  },

  get(endpoint: string, options?: FetchOptions) {
    return this.fetch(endpoint, { ...options, method: 'GET' });
  },

  post(endpoint: string, body?: any, options?: FetchOptions) {
    return this.fetch(endpoint, {
      ...options,
      method: 'POST',
      body: JSON.stringify(body),
    });
  },

  put(endpoint: string, body?: any, options?: FetchOptions) {
    return this.fetch(endpoint, {
      ...options,
      method: 'PUT',
      body: JSON.stringify(body),
    });
  },

  delete(endpoint: string, options?: FetchOptions) {
    return this.fetch(endpoint, { ...options, method: 'DELETE' });
  },
};
