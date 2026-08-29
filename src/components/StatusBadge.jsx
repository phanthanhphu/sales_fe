import PropTypes from 'prop-types';
import Chip from '@mui/material/Chip';

const STATUS_STYLES = {
  DRAFT: { color: '#92400e', bg: '#fffbeb', border: '#fcd34d', dot: '#f59e0b' },
  NOT_STARTED: { color: '#475569', bg: '#f8fafc', border: '#cbd5e1', dot: '#94a3b8' },
  IN_PROGRESS: { color: '#7e22ce', bg: '#faf5ff', border: '#e9d5ff', dot: '#a855f7' },
  BOM_IN_PROGRESS: { color: '#1d4ed8', bg: '#eff6ff', border: '#bfdbfe', dot: '#3b82f6' },
  BOM_SUBMITTED: { color: '#166534', bg: '#f0fdf4', border: '#bbf7d0', dot: '#22c55e' },
  SUBMITTED: { color: '#166534', bg: '#f0fdf4', border: '#bbf7d0', dot: '#22c55e' },
  MPR_DRAFT: { color: '#7e22ce', bg: '#faf5ff', border: '#e9d5ff', dot: '#a855f7' },
  MPR_IN_PROGRESS: { color: '#7e22ce', bg: '#faf5ff', border: '#e9d5ff', dot: '#a855f7' },
  MPR_COMPLETED: { color: '#166534', bg: '#f0fdf4', border: '#bbf7d0', dot: '#22c55e' },
  COMPLETED: { color: '#166534', bg: '#f0fdf4', border: '#bbf7d0', dot: '#22c55e' },
  ACTIVE: { color: '#166534', bg: '#f0fdf4', border: '#bbf7d0', dot: '#22c55e' },
  INACTIVE: { color: '#475569', bg: '#f8fafc', border: '#cbd5e1', dot: '#94a3b8' },
  ENABLED: { color: '#166534', bg: '#f0fdf4', border: '#bbf7d0', dot: '#22c55e' },
  DISABLED: { color: '#991b1b', bg: '#fef2f2', border: '#fecaca', dot: '#ef4444' },
  SUCCESS: { color: '#166534', bg: '#f0fdf4', border: '#bbf7d0', dot: '#22c55e' },
  FAILED: { color: '#991b1b', bg: '#fef2f2', border: '#fecaca', dot: '#ef4444' },
  PENDING_BOM_REVIEW: { color: '#92400e', bg: '#fffbeb', border: '#fde68a', dot: '#f59e0b' },
  RECHECK_SALES: { color: '#991b1b', bg: '#fef2f2', border: '#fecaca', dot: '#ef4444' },
  APPLIED_TO_BOM: { color: '#166534', bg: '#f0fdf4', border: '#bbf7d0', dot: '#22c55e' }
};

const labelFor = (status, label) => label || String(status || 'UNKNOWN').replaceAll('_', ' ');

export default function StatusBadge({ status, label, size = 'small', sx = {} }) {
  const key = String(status || '').trim().toUpperCase();
  const item = STATUS_STYLES[key] || { color: '#475569', bg: '#f8fafc', border: '#e2e8f0', dot: '#94a3b8' };

  return (
    <Chip
      size={size}
      label={labelFor(status, label)}
      icon={<span />}
      sx={{
        height: size === 'small' ? 23 : 27,
        borderRadius: 999,
        fontWeight: 700,
        fontSize: size === 'small' ? '0.68rem' : '0.73rem',
        letterSpacing: 0.15,
        color: item.color,
        backgroundColor: item.bg,
        border: `1px solid ${item.border}`,
        '& .MuiChip-icon': {
          width: 7,
          height: 7,
          borderRadius: '50%',
          backgroundColor: item.dot,
          ml: 0.85,
          mr: -0.15
        },
        '& .MuiChip-label': { px: 0.8 },
        ...sx
      }}
    />
  );
}

StatusBadge.propTypes = {
  status: PropTypes.any,
  label: PropTypes.node,
  size: PropTypes.oneOf(['small', 'medium']),
  sx: PropTypes.object
};
