import { apiRequest } from './apiClient.js';

export const clinicsApi = {
  getNearby(input) {
    const radiusKm = input.radiusKm ?? 10;
    const addr =
      typeof input.address === 'string' && input.address.trim().length > 0
        ? input.address.trim()
        : '';
    const query = addr ? { address: addr, radiusKm } : { lat: input.lat, lng: input.lng, radiusKm };
    return apiRequest('/clinics/nearby', {
      method: 'GET',
      query,
    });
  },

  getById(id) {
    return apiRequest(`/clinics/${id}`, {
      method: 'GET',
    });
  },
};
