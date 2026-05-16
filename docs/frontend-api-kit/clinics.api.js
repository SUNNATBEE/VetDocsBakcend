import { apiRequest } from './apiClient.js';

export const clinicsApi = {
  // input shape:
  //   { lat, lng, radiusKm?, district? }   — koordinata rejimi
  //   { address, radiusKm?, district? }    — manzil rejimi (server geocode)
  //   { district, radiusKm? }              — tuman markazi rejimi
  getNearby(input) {
    const radiusKm = input.radiusKm ?? 10;
    const district =
      typeof input.district === 'string' && input.district.trim().length > 0
        ? input.district.trim()
        : undefined;
    const addr =
      typeof input.address === 'string' && input.address.trim().length > 0
        ? input.address.trim()
        : '';

    let query;
    if (addr) {
      query = { address: addr, radiusKm };
    } else if (input.lat != null && input.lng != null) {
      query = { lat: input.lat, lng: input.lng, radiusKm };
    } else {
      query = { radiusKm };
    }
    if (district) query.district = district;

    return apiRequest('/clinics/nearby', {
      method: 'GET',
      query,
    });
  },

  listDistricts() {
    return apiRequest('/clinics/districts', { method: 'GET' });
  },

  getById(id) {
    return apiRequest(`/clinics/${id}`, {
      method: 'GET',
    });
  },
};

export const configApi = {
  getPublic() {
    return apiRequest('/config/public', { method: 'GET' });
  },
};
