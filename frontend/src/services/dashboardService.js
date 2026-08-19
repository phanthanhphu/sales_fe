import { apiRawClient } from '../routes/globalApi';

const authHeaders = () => {
  const token = localStorage.getItem('accessToken') || localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export const getDashboardSummary = async (params = {}) => {
  const response = await apiRawClient.get('/api/dashboard/summary', {
    params,
    headers: authHeaders()
  });
  return response.data;
};

export const getDashboardError = (error, fallback = 'Unable to load dashboard.') => (
  error?.response?.data?.message || error?.response?.data || error?.message || fallback
);
