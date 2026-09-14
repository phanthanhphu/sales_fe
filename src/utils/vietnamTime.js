export const VIETNAM_TIME_ZONE = 'Asia/Ho_Chi_Minh';

const pad = (value) => String(value ?? '').padStart(2, '0');
const LOCAL_DATE_TIME_PATTERN = /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2})(?:\.\d+)?)?)?$/;

const localParts = (value) => {
  if (Array.isArray(value)) {
    return {
      year: Number(value[0]),
      month: Number(value[1] || 1),
      day: Number(value[2] || 1),
      hour: Number(value[3] || 0),
      minute: Number(value[4] || 0),
      second: Number(value[5] || 0)
    };
  }

  if (typeof value !== 'string') return null;
  const match = LOCAL_DATE_TIME_PATTERN.exec(value.trim());
  if (!match) return null;
  return {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
    hour: Number(match[4] || 0),
    minute: Number(match[5] || 0),
    second: Number(match[6] || 0)
  };
};

const vietnamPartsFromInstant = (date) => {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return null;
  const result = {};
  new Intl.DateTimeFormat('en-GB', {
    timeZone: VIETNAM_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23'
  }).formatToParts(date).forEach((part) => {
    if (part.type !== 'literal') result[part.type] = Number(part.value);
  });
  return result;
};

/**
 * Formats backend business timestamps as Vietnam wall-clock time.
 * Spring/Jackson LocalDateTime values do not contain an offset; those values are
 * already Vietnam local time and must not be reinterpreted as UTC by the browser.
 * Values that DO contain Z/+/- offsets are converted to Asia/Ho_Chi_Minh.
 */
export const formatVietnamDateTime = (value, options = {}) => {
  const { fallback = '—', includeSeconds = false } = options;
  if (value === null || value === undefined || value === '') return fallback;

  let parts = localParts(value);
  if (!parts) {
    const parsed = new Date(value);
    parts = vietnamPartsFromInstant(parsed);
  }
  if (!parts || !Number.isFinite(parts.year)) return String(value);

  const datePart = `${pad(parts.day)}/${pad(parts.month)}/${parts.year}`;
  const timePart = `${pad(parts.hour)}:${pad(parts.minute)}${includeSeconds ? `:${pad(parts.second)}` : ''}`;
  return `${datePart} ${timePart}`;
};

export const vietnamTodayIso = () => {
  const parts = vietnamPartsFromInstant(new Date());
  return `${parts.year}-${pad(parts.month)}-${pad(parts.day)}`;
};

export const vietnamCompactDate = () => vietnamTodayIso().replaceAll('-', '');

export const vietnamDateInput = (value) => {
  if (value === null || value === undefined || value === '') return '';
  const parts = localParts(value) || vietnamPartsFromInstant(new Date(value));
  if (!parts || !Number.isFinite(parts.year)) return '';
  return `${parts.year}-${pad(parts.month)}-${pad(parts.day)}`;
};

export const vietnamDownloadTimestamp = () => {
  const parts = vietnamPartsFromInstant(new Date());
  return `${pad(parts.day)}${pad(parts.month)}${parts.year}_${pad(parts.hour)}${pad(parts.minute)}${pad(parts.second)}`;
};

export const vietnamCurrentYear = () => Number(vietnamTodayIso().slice(0, 4));

/** Converts a Vietnam-local backend LocalDateTime into a stable epoch for sorting. */
export const vietnamTimestamp = (value) => {
  if (value === null || value === undefined || value === '') return 0;
  const parts = localParts(value);
  if (parts) {
    return Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour - 7, parts.minute, parts.second);
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? 0 : parsed.getTime();
};
