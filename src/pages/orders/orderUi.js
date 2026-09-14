import { formatVietnamDateTime, vietnamTodayIso } from 'utils/vietnamTime';
export const formatDateTime = (value) => formatVietnamDateTime(value);

export const statusSx = (status) => {
  const value = String(status || '').toUpperCase();
  const map = {
    DRAFT: { color: '#92400e', bg: '#fef3c7' },
    BOM_IN_PROGRESS: { color: '#1d4ed8', bg: '#dbeafe' },
    BOM_SUBMITTED: { color: '#166534', bg: '#dcfce7' },
    SUBMITTED: { color: '#166534', bg: '#dcfce7' },
    MPR_DRAFT: { color: '#7e22ce', bg: '#f3e8ff' },
    MPR_IN_PROGRESS: { color: '#7e22ce', bg: '#f3e8ff' },
    MPR_COMPLETED: { color: '#166534', bg: '#dcfce7' },
    COMPLETED: { color: '#166534', bg: '#dcfce7' }
  };
  const item = map[value] || { color: '#374151', bg: '#f3f4f6' };
  return {
    height: 24,
    borderRadius: 999,
    fontWeight: 700,
    fontSize: '0.72rem',
    color: item.color,
    backgroundColor: item.bg,
    border: '1px solid rgba(17,24,39,.08)'
  };
};

export const todayLocalDate = () => vietnamTodayIso();


export const isCompletedOrderStatus = (status) => {
  const value = String(status || '').trim().toUpperCase();
  return value === 'COMPLETED' || value === 'MPR_COMPLETED';
};

const parseDateOnlyUtc = (value) => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value || '').trim());
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const timestamp = Date.UTC(year, month - 1, day);
  const parsed = new Date(timestamp);
  if (parsed.getUTCFullYear() !== year || parsed.getUTCMonth() !== month - 1 || parsed.getUTCDate() !== day) return null;
  return timestamp;
};

export const getOrderOverdueDays = (endDate, status) => {
  if (!endDate || isCompletedOrderStatus(status)) return 0;

  const end = parseDateOnlyUtc(endDate);
  const today = parseDateOnlyUtc(todayLocalDate());
  if (end === null || today === null || end >= today) return 0;

  return Math.floor((today - end) / 86_400_000);
};

export const isOrderOverdue = (endDate, status) => getOrderOverdueDays(endDate, status) > 0;

export const formatDate = (value) => {
  if (!value) return '—';
  const raw = String(value);
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw);
  if (match) return `${match[3]}/${match[2]}/${match[1]}`;
  return raw;
};

export const emptyOrder = {
  orderName: '', startDate: '', endDate: ''
};
