import apiClient from '../routes/globalApi';

const ROOT = '/api/buyers';

export const listAccessibleBuyers = () => apiClient.get(`${ROOT}/accessible`);
export const listBuyers = (params = {}) => apiClient.get(ROOT, { params });
export const getBuyer = (id) => apiClient.get(`${ROOT}/${encodeURIComponent(id)}`);
export const createBuyer = (payload) => apiClient.post(ROOT, payload);
export const updateBuyer = (id, payload) => apiClient.put(`${ROOT}/${encodeURIComponent(id)}`, payload);
export const deleteBuyer = (id) => apiClient.delete(`${ROOT}/${encodeURIComponent(id)}`);

export const getBuyerError = (error, fallback = 'Unable to complete Buyer operation.') => (
  error?.response?.data?.message || error?.response?.data || error?.message || fallback
);
