import { formatVietnamDateTime, vietnamDateInput } from 'utils/vietnamTime';
export const createEmptyFilters = (fields = []) =>
  (Array.isArray(fields) ? fields : []).reduce((result, field) => {
    result[field.name] = field.defaultValue ?? '';
    return result;
  }, {});

export const cleanFilters = (values = {}) =>
  Object.entries(values || {}).reduce((result, [key, value]) => {
    if (value === null || value === undefined) return result;

    const cleaned = typeof value === 'string' ? value.trim() : value;

    if (cleaned !== '') {
      result[key] = cleaned;
    }

    return result;
  }, {});

export const normalizePageResponse = (response, fallbackPage = 0, fallbackSize = 25) => {
  if (Array.isArray(response)) {
    return {
      content: response,
      totalElements: response.length,
      number: fallbackPage,
      size: fallbackSize,
      totalPages: response.length ? Math.ceil(response.length / fallbackSize) : 0
    };
  }

  const source = response?.data && !Array.isArray(response?.content) ? response.data : response || {};
  const content = Array.isArray(source?.content)
    ? source.content
    : Array.isArray(source?.items)
      ? source.items
      : Array.isArray(source?.data)
        ? source.data
        : [];

  const totalElements = Number(source?.totalElements ?? source?.total ?? content.length) || 0;
  const size = Number(source?.size ?? fallbackSize) || fallbackSize;
  const number = Number(source?.number ?? source?.page ?? fallbackPage) || 0;
  const totalPages = Number(source?.totalPages ?? Math.ceil(totalElements / Math.max(size, 1))) || 0;

  return { content, totalElements, number, size, totalPages };
};

export const formatDateTime = (value) => formatVietnamDateTime(value, { fallback: '-' });

export const toDateInput = (value) => vietnamDateInput(value);

export const formatNumber = (value, maximumFractionDigits = 2) => {
  if (value === null || value === undefined || value === '') return '-';
  const number = Number(value);
  if (!Number.isFinite(number)) return String(value);

  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits,
    minimumFractionDigits: 0
  }).format(number);
};

export const formatCurrency = (value, currency = '') => {
  if (value === null || value === undefined || value === '') return '-';
  const number = Number(value);
  if (!Number.isFinite(number)) return String(value);

  const code = normalizeText(currency);
  const formatted = new Intl.NumberFormat(code === 'VND' ? 'vi-VN' : 'en-US', {
    maximumFractionDigits: code === 'VND' ? 0 : 4,
    minimumFractionDigits: 0
  }).format(number);
  return `${formatted}${code ? ` ${code}` : ''}`;
};

export const formatVnd = (value) => {
  if (value === null || value === undefined || value === '') return '-';
  const number = Number(value);
  if (!Number.isFinite(number)) return String(value);
  return new Intl.NumberFormat('vi-VN', {
    maximumFractionDigits: 0,
    minimumFractionDigits: 0
  }).format(number);
};

export const formatPercent = (value, maximumFractionDigits = 2) => {
  if (value === null || value === undefined || value === '') return '-';
  const number = Number(value);
  if (!Number.isFinite(number)) return String(value);
  return `${formatNumber(number * 100, maximumFractionDigits)}%`;
};

export const trimText = (value) => String(value ?? '').trim();

export const normalizeText = (value) => trimText(value).toUpperCase();
