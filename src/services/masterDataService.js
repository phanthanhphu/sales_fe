import apiClient, { apiRawClient } from '../routes/globalApi';

const MASTER_DATA_ROOT = '/api/master-data';

export const MASTER_DATA_ENDPOINTS = {
  currency: `${MASTER_DATA_ROOT}/currencies`,
  vendor: `${MASTER_DATA_ROOT}/vendor-codes`,
  matInfo: `${MASTER_DATA_ROOT}/mat-infos`,
  loss: `${MASTER_DATA_ROOT}/loss`,
  shipTo: `${MASTER_DATA_ROOT}/ship-tos`,
  productColor: `${MASTER_DATA_ROOT}/product-colors`
};

const getEndpoint = (type) => {
  const endpoint = MASTER_DATA_ENDPOINTS[type];

  if (!endpoint) {
    throw new Error(`Unsupported master data type: ${type}`);
  }

  return endpoint;
};

const cleanParams = (params = {}) => {
  return Object.entries(params || {}).reduce((result, [key, value]) => {
    if (value === undefined || value === null || value === '') {
      return result;
    }

    result[key] = value;
    return result;
  }, {});
};

export const listMasterData = (type, params = {}) => {
  return apiClient.get(getEndpoint(type), { params: cleanParams(params || {}) });
};

export const getMasterDataById = (type, id) => {
  return apiClient.get(`${getEndpoint(type)}/${encodeURIComponent(id)}`);
};

export const createMasterData = (type, payload, params = {}) => {
  return apiClient.post(getEndpoint(type), payload, { params: cleanParams(params) });
};

export const updateMasterData = (type, id, payload, params = {}) => {
  return apiClient.put(`${getEndpoint(type)}/${encodeURIComponent(id)}`, payload, { params: cleanParams(params) });
};

export const deleteMasterData = (type, id, params = {}) => {
  return apiClient.delete(`${getEndpoint(type)}/${encodeURIComponent(id)}`, { params: cleanParams(params) });
};


/** Product Color images are owned by Product Color Master, never by an individual BOM. */
const productColorImageEndpoint = (id) => `${MASTER_DATA_ENDPOINTS.productColor}/${encodeURIComponent(id)}/image`;

export const uploadProductColorImage = (id, file) => {
  const formData = new FormData();
  formData.append('file', file);
  return apiClient.post(productColorImageEndpoint(id), formData);
};

export const deleteProductColorImage = (id) => apiClient.delete(productColorImageEndpoint(id));

export const getProductColorImageBlob = (id, signal) => (
  apiClient.get(productColorImageEndpoint(id), { responseType: 'blob', signal })
);

export const getProductColorImageObjectUrl = async (id, signal) => {
  const blob = await getProductColorImageBlob(id, signal);
  return URL.createObjectURL(blob);
};

const masterExcelUploadConfig = (file, params = {}, options = {}) => ({
  params: cleanParams(params),
  onUploadProgress: options?.onUploadProgress,
  headers: {
    'X-File-Name': encodeURIComponent(file?.name || 'excel-file'),
    'X-File-Size': String(file?.size || 0)
  }
});

export const uploadMasterData = (type, file, mode = 'CREATE_ONLY', params = {}, options = {}) => {
  const formData = new FormData();
  formData.append('file', file);

  return apiClient.post(
    `${getEndpoint(type)}/upload`,
    formData,
    masterExcelUploadConfig(file, { mode, ...params }, options)
  );
};

export const uploadEditedMasterData = (type, file, params = {}, options = {}) => {
  const formData = new FormData();
  formData.append('file', file);

  return apiClient.post(
    `${getEndpoint(type)}/upload-edited`,
    formData,
    masterExcelUploadConfig(file, params, options)
  );
};

export const downloadMasterDataEditWorkbook = (type, params = {}) => (
  apiRawClient.get(`${getEndpoint(type)}/export-edit`, { responseType: 'blob', params: cleanParams(params) })
);

export const listActiveShipTos = () => apiClient.get(`${MASTER_DATA_ENDPOINTS.shipTo}/active`);


export const resolveVendorCode = (shortNameSupplier) => {
  return apiClient.get(`${MASTER_DATA_ENDPOINTS.vendor}/resolve`, {
    params: { shortNameSupplier }
  });
};


export const searchVendorCodeOptions = (keyword = '', limit = 50) => {
  return apiClient.get(`${MASTER_DATA_ENDPOINTS.vendor}/options`, {
    params: cleanParams({ keyword, limit })
  });
};

/**
 * Returns one latest Currency row for each Currency Code.
 * MAT_INFO uses this list to display the newest Rate To VND.
 */
export const listCurrentCurrencies = () => {
  return apiClient.get(`${MASTER_DATA_ENDPOINTS.currency}/current`);
};

/** Returns the latest Currency rate record for one Currency Code. */
export const resolveCurrency = (currencyCode) => {
  return apiClient.get(`${MASTER_DATA_ENDPOINTS.currency}/resolve`, {
    params: { currencyCode }
  });
};

export const resolveMatInfo = (checking) => {
  return apiClient.get(`${MASTER_DATA_ENDPOINTS.matInfo}/resolve`, {
    params: { checking }
  });
};

export const resolveLoss = (materialType, totalQuantity) => {
  return apiClient.get(`${MASTER_DATA_ENDPOINTS.loss}/resolve`, {
    params: { materialType, totalQuantity }
  });
};

export const getMasterDataErrorMessage = (error, fallback = 'Unable to complete the request.') => {
  const data = error?.response?.data;

  if (data?.fieldErrors && typeof data.fieldErrors === 'object') {
    const messages = Object.values(data.fieldErrors).filter(Boolean);
    if (messages.length) return messages.join(' • ');
  }

  if (Array.isArray(data?.errors) && data.errors.length) {
    return data.errors
      .slice(0, 3)
      .map((item) => `Row ${item?.rowNumber ?? '?'}: ${item?.message || 'Invalid data'}`)
      .join(' • ');
  }

  if (typeof data?.message === 'string' && data.message.trim()) {
    return data.message;
  }

  if (typeof data === 'string' && data.trim()) {
    return data;
  }

  if (typeof error?.message === 'string' && error.message.trim()) {
    return error.message;
  }

  return fallback;
};
