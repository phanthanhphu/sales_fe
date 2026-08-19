import { apiRawClient } from '../routes/globalApi';

const authHeaders = () => {
  const token = localStorage.getItem('accessToken') || localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const withAuth = (config = {}) => {
  const safeConfig = config || {};
  return {
    ...safeConfig,
    headers: { ...authHeaders(), ...(safeConfig.headers || {}) }
  };
};

const unwrap = async (request) => (await request).data;

export const getApiError = (error, fallback = 'Unable to complete the request.') => {
  const data = error?.response?.data;
  if (data?.fieldErrors && typeof data.fieldErrors === 'object') {
    const message = Object.values(data.fieldErrors).filter(Boolean).join(' • ');
    if (message) return message;
  }
  return data?.message || error?.message || fallback;
};

export const listOrders = (params = {}) => unwrap(apiRawClient.get('/api/orders', withAuth({ params: params || {} })));
export const getOrder = (id, buyerKey = '') => unwrap(apiRawClient.get(`/api/orders/${encodeURIComponent(id)}`, withAuth({ params: buyerKey ? { buyerKey } : {} })));
export const createOrder = (payload) => unwrap(apiRawClient.post('/api/orders', payload, withAuth()));
export const updateOrder = (id, payload) => unwrap(apiRawClient.put(`/api/orders/${encodeURIComponent(id)}`, payload, withAuth()));
export const deleteOrder = (id) => unwrap(apiRawClient.delete(`/api/orders/${encodeURIComponent(id)}`, withAuth()));

export const listBoms = (orderId) => unwrap(apiRawClient.get(`/api/orders/${encodeURIComponent(orderId)}/boms`, withAuth()));
export const getBom = (id, buyerKey = '') => unwrap(apiRawClient.get(`/api/boms/${encodeURIComponent(id)}`, withAuth({ params: buyerKey ? { buyerKey } : {} })));
export const createBom = (orderId, payload) => unwrap(apiRawClient.post(`/api/orders/${encodeURIComponent(orderId)}/boms`, payload, withAuth()));
export const updateBom = (id, payload) => unwrap(apiRawClient.put(`/api/boms/${encodeURIComponent(id)}`, payload, withAuth()));
export const deleteBom = (id) => unwrap(apiRawClient.delete(`/api/boms/${encodeURIComponent(id)}`, withAuth()));
export const submitBom = (id) => unwrap(apiRawClient.post(`/api/boms/${encodeURIComponent(id)}/submit`, {}, withAuth()));

const excelUploadConfig = (file, onUploadProgress) => withAuth({
  onUploadProgress,
  headers: {
    'X-File-Name': encodeURIComponent(file?.name || 'excel-file'),
    'X-File-Size': String(file?.size || 0)
  }
});

export const replaceBomExcel = (bomId, file, options = {}) => {
  const formData = new FormData();
  formData.append('file', file);
  return unwrap(apiRawClient.post(
    `/api/boms/${encodeURIComponent(bomId)}/replace-excel`,
    formData,
    excelUploadConfig(file, options?.onUploadProgress)
  ));
};

export const addBomProductColor = (bomId, payload) => unwrap(
  apiRawClient.post(`/api/boms/${encodeURIComponent(bomId)}/product-colors`, payload, withAuth())
);
export const updateBomProductColor = (bomId, productColorId, payload) => unwrap(
  apiRawClient.put(`/api/boms/${encodeURIComponent(bomId)}/product-colors/${encodeURIComponent(productColorId)}`, payload, withAuth())
);
export const deleteBomProductColor = (bomId, productColorId) => unwrap(
  apiRawClient.delete(`/api/boms/${encodeURIComponent(bomId)}/product-colors/${encodeURIComponent(productColorId)}`, withAuth())
);

export const addPacking = (bomId, payload) => unwrap(apiRawClient.post(`/api/boms/${encodeURIComponent(bomId)}/packings`, payload, withAuth()));
export const updatePacking = (bomId, packingId, payload) => unwrap(apiRawClient.put(`/api/boms/${encodeURIComponent(bomId)}/packings/${encodeURIComponent(packingId)}`, payload, withAuth()));
export const deletePacking = (bomId, packingId) => unwrap(apiRawClient.delete(`/api/boms/${encodeURIComponent(bomId)}/packings/${encodeURIComponent(packingId)}`, withAuth()));

export const addBomLine = (bomId, payload, packingId = '') => unwrap(apiRawClient.post(`/api/boms/${encodeURIComponent(bomId)}/lines`, payload, withAuth({ params: packingId ? { packingId } : {} })));
export const updateBomLine = (bomId, lineId, payload) => unwrap(apiRawClient.put(`/api/boms/${encodeURIComponent(bomId)}/lines/${encodeURIComponent(lineId)}`, payload, withAuth()));
export const deleteBomLine = (bomId, lineId) => unwrap(apiRawClient.delete(`/api/boms/${encodeURIComponent(bomId)}/lines/${encodeURIComponent(lineId)}`, withAuth()));

export const listBomLines = (bomId, options = {}) => {
  const { packingId = '', page = 0, size = 100 } = options || {};
  return unwrap(apiRawClient.get(
    `/api/boms/${encodeURIComponent(bomId)}/lines`,
    withAuth({ params: { ...(packingId ? { packingId } : {}), page, size } })
  ));
};

export const uploadBomLineImage = (bomId, lineId, file) => {
  const formData = new FormData();
  formData.append('file', file);
  return unwrap(apiRawClient.put(
    `/api/boms/${encodeURIComponent(bomId)}/lines/${encodeURIComponent(lineId)}/image`,
    formData,
    withAuth()
  ));
};

export const deleteBomLineImage = (bomId, lineId) => unwrap(apiRawClient.delete(
  `/api/boms/${encodeURIComponent(bomId)}/lines/${encodeURIComponent(lineId)}/image`,
  withAuth()
));

export const getBomLineImageBlob = async (bomId, lineId, variant = 'thumbnail', version = '') => {
  const response = await apiRawClient.get(
    `/api/boms/${encodeURIComponent(bomId)}/lines/${encodeURIComponent(lineId)}/image/${encodeURIComponent(variant)}`,
    withAuth({ responseType: 'blob', params: version ? { v: version } : {} })
  );
  const contentType = response.headers?.['content-type'] || response.data?.type || 'application/octet-stream';
  return response.data instanceof Blob && response.data.type
    ? response.data
    : new Blob([response.data], { type: contentType });
};

export const getBomLineImageObjectUrl = async (bomId, lineId, variant = 'thumbnail', version = '') => (
  URL.createObjectURL(await getBomLineImageBlob(bomId, lineId, variant, version))
);

export const uploadBomAttachment = (bomId, file, options = {}) => {
  const { scope = 'BOM', productColorId = '', colorKey = '', packingId = '', lineId = '' } = options || {};
  const formData = new FormData();
  formData.append('file', file);
  formData.append('scope', scope);
  if (productColorId) formData.append('productColorId', productColorId);
  if (colorKey) formData.append('colorKey', colorKey);
  if (packingId) formData.append('packingId', packingId);
  if (lineId) formData.append('lineId', lineId);
  return unwrap(apiRawClient.post(`/api/boms/${encodeURIComponent(bomId)}/attachments`, formData, withAuth()));
};
export const deleteBomAttachment = (bomId, attachmentId) => unwrap(apiRawClient.delete(`/api/boms/${encodeURIComponent(bomId)}/attachments/${encodeURIComponent(attachmentId)}`, withAuth()));

export const getBomExportUrl = (bomId) => `/api/boms/${encodeURIComponent(bomId)}/export`;
export const getBomTemplateUrl = (bomId) => `/api/boms/${encodeURIComponent(bomId)}/template`;
export const getAttachmentUrl = (bomId, attachmentId) => `/api/boms/${encodeURIComponent(bomId)}/attachments/${encodeURIComponent(attachmentId)}/download`;

/**
 * Attachment endpoints require a Bearer token. Do not use getAttachmentUrl() directly
 * as an <img src>, href or window.open URL because those browser requests do not carry
 * the Authorization header and will return 401.
 */
export const getBomAttachmentBlob = async (bomId, attachmentId) => {
  const response = await apiRawClient.get(
    getAttachmentUrl(bomId, attachmentId),
    withAuth({ responseType: 'blob' })
  );

  return response.data;
};

export const getBomAttachmentObjectUrl = async (bomId, attachmentId) => {
  const blob = await getBomAttachmentBlob(bomId, attachmentId);
  return URL.createObjectURL(blob);
};

const saveBlob = (blob, fileName) => {
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement('a');

  anchor.href = objectUrl;
  anchor.download = fileName || 'attachment';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();

  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 0);
};

export const downloadBomAttachment = async (bomId, attachmentId, fileName = 'attachment') => {
  const blob = await getBomAttachmentBlob(bomId, attachmentId);
  saveBlob(blob, fileName);
};

export const openBomAttachment = async (bomId, attachmentId) => {
  // Open a blank tab synchronously so browser popup protection does not block the preview.
  const previewWindow = window.open('', '_blank');

  if (previewWindow) {
    previewWindow.opener = null;
  }

  try {
    const objectUrl = await getBomAttachmentObjectUrl(bomId, attachmentId);

    if (previewWindow) {
      previewWindow.location.href = objectUrl;
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60000);
      return;
    }

    // Fallback for browsers that block a new tab.
    const anchor = document.createElement('a');
    anchor.href = objectUrl;
    anchor.target = '_blank';
    anchor.rel = 'noopener noreferrer';
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60000);
  } catch (error) {
    previewWindow?.close();
    throw error;
  }
};

export const getMpr = (orderId) => unwrap(apiRawClient.get(`/api/orders/${encodeURIComponent(orderId)}/mpr`, withAuth()));
export const validateMpr = (orderId, payload) => unwrap(apiRawClient.post(`/api/orders/${encodeURIComponent(orderId)}/mpr/validate`, payload, withAuth()));
export const previewMpr = (orderId, payload) => unwrap(apiRawClient.post(`/api/orders/${encodeURIComponent(orderId)}/mpr/preview`, payload, withAuth()));
export const generateMpr = (orderId, payload) => unwrap(apiRawClient.post(`/api/orders/${encodeURIComponent(orderId)}/mpr/generate`, payload, withAuth()));
export const deleteMpr = (orderId) => unwrap(apiRawClient.delete(`/api/orders/${encodeURIComponent(orderId)}/mpr`, withAuth()));
export const updateMprLine = (orderId, lineId, payload) => unwrap(
  apiRawClient.put(
    `/api/orders/${encodeURIComponent(orderId)}/mpr/lines/${encodeURIComponent(lineId)}`,
    payload,
    withAuth()
  )
);
export const deleteMprLine = (orderId, lineId) => unwrap(
  apiRawClient.delete(
    `/api/orders/${encodeURIComponent(orderId)}/mpr/lines/${encodeURIComponent(lineId)}`,
    withAuth()
  )
);

/** Deletes every MPR item created in one Create / Add To MPR action. */
export const updateMprBatch = (orderId, batchId, payload) => unwrap(
  apiRawClient.put(
    `/api/orders/${encodeURIComponent(orderId)}/mpr/batches/${encodeURIComponent(batchId)}`,
    payload,
    withAuth()
  )
);

export const deleteMprBatch = (orderId, batchId) => unwrap(
  apiRawClient.delete(
    `/api/orders/${encodeURIComponent(orderId)}/mpr/batches/${encodeURIComponent(batchId)}`,
    withAuth()
  )
);

export const uploadMprExcel = (orderId, file, options = {}) => {
  const formData = new FormData();
  formData.append('file', file);
  return unwrap(apiRawClient.post(
    `/api/orders/${encodeURIComponent(orderId)}/mpr/import`,
    formData,
    excelUploadConfig(file, options?.onUploadProgress)
  ));
};

export const getMprExportUrl = (orderId) => `/api/orders/${encodeURIComponent(orderId)}/mpr/export`;

export const downloadWithAuth = async (url, fileName, options = {}) => {
  const safeOptions = options || {};
  const response = await apiRawClient.get(
    url,
    withAuth({
      responseType: 'blob',
      onDownloadProgress: (event) => {
        if (typeof safeOptions.onDownloadProgress !== 'function') return;

        const loaded = Number(event?.loaded || 0);
        const total = Number(event?.total || 0);
        safeOptions.onDownloadProgress({
          loaded,
          total,
          progress: total > 0 ? Math.min(1, loaded / total) : null
        });
      }
    })
  );

  const contentType = response.headers?.['content-type'] || response.data?.type || 'application/octet-stream';
  const blob = response.data instanceof Blob && response.data.type
    ? response.data
    : new Blob([response.data], { type: contentType });
  const disposition = response.headers?.['content-disposition'] || '';
  const utf8Match = /filename\*=UTF-8''([^;]+)/i.exec(disposition);
  const regularMatch = /filename=\"?([^\";]+)\"?/i.exec(disposition);
  let responseFileName = '';
  try {
    responseFileName = utf8Match?.[1] ? decodeURIComponent(utf8Match[1]) : '';
  } catch {
    responseFileName = utf8Match?.[1] || '';
  }
  const resolvedFileName = responseFileName || regularMatch?.[1] || fileName || 'download';

  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement('a');

  anchor.href = objectUrl;
  anchor.download = resolvedFileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 0);

  return {
    fileName: resolvedFileName,
    sizeBytes: blob.size,
    contentType
  };
};
