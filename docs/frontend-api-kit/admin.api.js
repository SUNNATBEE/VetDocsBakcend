import { apiRequest } from './apiClient.js';

// Bu faylni faqat siz (admin panel) ishlatishingiz tavsiya etiladi.
export const adminApi = {
  getDashboard() {
    return apiRequest('/admin/dashboard', { method: 'GET', auth: true });
  },

  getClinics({ page = 1, pageSize = 20, q } = {}) {
    return apiRequest('/admin/clinics', {
      method: 'GET',
      auth: true,
      query: { page, pageSize, q },
    });
  },

  createClinic(payload) {
    return apiRequest('/admin/clinics', {
      method: 'POST',
      auth: true,
      body: payload,
    });
  },

  getClinicById(id) {
    return apiRequest(`/admin/clinics/${id}`, { method: 'GET', auth: true });
  },

  updateClinic(id, payload) {
    return apiRequest(`/admin/clinics/${id}`, {
      method: 'PATCH',
      auth: true,
      body: payload,
    });
  },

  deleteClinic(id) {
    return apiRequest(`/admin/clinics/${id}`, {
      method: 'DELETE',
      auth: true,
    });
  },

  getReviews({ page = 1, pageSize = 20, q } = {}) {
    return apiRequest('/admin/reviews', {
      method: 'GET',
      auth: true,
      query: { page, pageSize, q },
    });
  },

  deleteReview(id) {
    return apiRequest(`/admin/reviews/${id}`, {
      method: 'DELETE',
      auth: true,
    });
  },

  getUsers({ page = 1, pageSize = 20, q } = {}) {
    return apiRequest('/admin/users', {
      method: 'GET',
      auth: true,
      query: { page, pageSize, q },
    });
  },

  updateUserRole(id, role) {
    return apiRequest(`/admin/users/${id}/role`, {
      method: 'PATCH',
      auth: true,
      body: { role },
    });
  },

  deleteUser(id) {
    return apiRequest(`/admin/users/${id}`, {
      method: 'DELETE',
      auth: true,
    });
  },
};
