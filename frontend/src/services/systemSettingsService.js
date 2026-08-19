import apiClient, { apiRawClient } from '../routes/globalApi';

const ROOT = '/api/system-settings';

export const getSystemSettings = () => apiClient.get(ROOT);
export const updateSystemSettings = (payload) => apiClient.put(ROOT, payload);
export const updateSystemLayoutColor = (layoutColor) => apiClient.put(`${ROOT}/layout-color`, { layoutColor });

export const uploadSystemLogo = (file) => {
  const form = new FormData();
  form.append('file', file);
  return apiClient.post(`${ROOT}/logo`, form);
};

export const deleteSystemLogo = () => apiClient.delete(`${ROOT}/logo`);

export const getSystemLogoObjectUrl = async () => {
  const response = await apiRawClient.get(`${ROOT}/logo`, { responseType: 'blob' });
  return URL.createObjectURL(response.data);
};

export const getSystemSettingsError = (error, fallback = 'Unable to complete System Settings operation.') => (
  error?.response?.data?.message || error?.response?.data || error?.message || fallback
);
