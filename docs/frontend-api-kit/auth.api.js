import { apiRequest } from './apiClient.js';

export const authApi = {
  register(payload) {
    return apiRequest('/auth/register', {
      method: 'POST',
      body: payload,
    });
  },

  login(payload) {
    return apiRequest('/auth/login', {
      method: 'POST',
      body: payload,
    });
  },

  refresh(payload) {
    return apiRequest('/auth/refresh', {
      method: 'POST',
      body: payload,
    });
  },

  logout(payload = {}) {
    return apiRequest('/auth/logout', {
      method: 'POST',
      body: payload,
    });
  },
};
