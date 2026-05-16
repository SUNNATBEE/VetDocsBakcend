import { apiRequest } from './apiClient.js';

export const reviewsApi = {
  createReview(clinicId, payload) {
    return apiRequest(`/clinics/${clinicId}/reviews`, {
      method: 'POST',
      body: payload,
      auth: true,
    });
  },
};
