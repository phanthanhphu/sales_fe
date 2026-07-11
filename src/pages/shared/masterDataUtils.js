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

export const formatDateTime = (value) => {
  if (!value) return '-';

  try {
    let date;

    if (Array.isArray(value)) {
      const [year, month = 1, day = 1, hour = 0, minute = 0, second = 0] = value;
      date = new Date(year, Number(month) - 1, day, hour, minute, second);
    } else {
      date = new Date(value);
    }

    if (Number.isNaN(date.getTime())) return String(value);

    const pad = (number) => String(number).padStart(2, '0');
    return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
  } catch {
    return String(value);
  }
};

export const toDateInput = (value) => {
  if (!value) return '';
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value;

  try {
    if (Array.isArray(value)) {
      const [year, month = 1, day = 1] = value;
      return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';

    const pad = (number) => String(number).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  } catch {
    return '';
  }
};

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
  const formatted = formatNumber(value, 4);
  return formatted === '-' ? '-' : `${formatted}${currency ? ` ${currency}` : ''}`;
};

export const formatPercent = (value, maximumFractionDigits = 2) => {
  if (value === null || value === undefined || value === '') return '-';
  const number = Number(value);
  if (!Number.isFinite(number)) return String(value);
  return `${formatNumber(number * 100, maximumFractionDigits)}%`;
};

export const trimText = (value) => String(value ?? '').trim();

export const normalizeText = (value) => trimText(value).toUpperCase();
