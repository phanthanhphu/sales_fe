export const formatDateTime = (value) => {
  if (!value) return '—';
  try {
    const date = Array.isArray(value)
      ? new Date(value[0], (value[1] || 1) - 1, value[2] || 1, value[3] || 0, value[4] || 0, value[5] || 0)
      : new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    return date.toLocaleString('en-GB', { hour12: false });
  } catch {
    return String(value);
  }
};

export const statusSx = (status) => {
  const value = String(status || '').toUpperCase();
  const map = {
    DRAFT: { color: '#92400e', bg: '#fef3c7' },
    BOM_IN_PROGRESS: { color: '#1d4ed8', bg: '#dbeafe' },
    BOM_SUBMITTED: { color: '#166534', bg: '#dcfce7' },
    SUBMITTED: { color: '#166534', bg: '#dcfce7' },
    MPR_DRAFT: { color: '#7e22ce', bg: '#f3e8ff' },
    MPR_COMPLETED: { color: '#166534', bg: '#dcfce7' },
    COMPLETED: { color: '#166534', bg: '#dcfce7' }
  };
  const item = map[value] || { color: '#374151', bg: '#f3f4f6' };
  return {
    height: 24,
    borderRadius: 999,
    fontWeight: 800,
    fontSize: '0.72rem',
    color: item.color,
    backgroundColor: item.bg,
    border: '1px solid rgba(17,24,39,.08)'
  };
};

export const emptyOrder = {
  orderNo: '', style: '', customer: '', season: '', comment: ''
};
