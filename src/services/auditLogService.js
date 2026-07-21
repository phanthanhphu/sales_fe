import apiClient from '../routes/globalApi';

const cleanParams = (params = {}) => Object.entries(params || {}).reduce((result, [key, value]) => {
  if (value !== undefined && value !== null && value !== '') result[key] = value;
  return result;
}, {});

export const listAuditLogs = (params = {}) => apiClient.get('/api/audit-logs', {
  params: cleanParams(params)
});
