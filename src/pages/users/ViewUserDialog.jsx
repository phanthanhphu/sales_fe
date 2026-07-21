import React, { useMemo } from 'react';
import {
  Avatar,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  Typography,
  useMediaQuery
} from '@mui/material';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import { useTheme } from '@mui/material/styles';
import { API_BASE_URL } from '../../config';
import { getAccessLabel } from 'utils/accessControl';
import { getBuyerDefinition, isAdminUser, normalizeBuyerKey } from 'utils/buyerContext';
import {
  STABLE_FORM_COLORS,
  stableCloseButtonSx,
  stableDialogActionsSx,
  stableDialogContentSx,
  stableDialogPaperSx,
  stableDialogTitleSx,
  stableOutlineButtonSx,
  stablePrimaryButtonSx,
  stableTextButtonSx
} from '../shared/stableDialogUi';

const imageUrl = (raw) => {
  if (!raw) return '';
  const clean = String(raw).replace(/\\/g, '/').split('?')[0];
  if (clean.startsWith('http://') || clean.startsWith('https://')) return `${clean}?t=${Date.now()}`;
  return `${API_BASE_URL}${clean.startsWith('/') ? clean : `/${clean}`}?t=${Date.now()}`;
};


const buyerAccessLabel = (user = {}) => {
  if (isAdminUser(user)) return 'All active Buyers';
  const keys = Array.isArray(user?.buyerKeys) && user.buyerKeys.length ? user.buyerKeys : ['LLBEAN'];
  return keys.map((key) => getBuyerDefinition(normalizeBuyerKey(key)).buyerName).join(', ');
};

const detailFieldSx = {
  minHeight: 72,
  p: 1.25,
  borderRadius: 1.25,
  border: '1px solid #C3CFDB',
  backgroundColor: '#FFFFFF'
};

function DetailField({ label, value }) {
  return (
    <Box sx={detailFieldSx}>
      <Typography sx={{ color: '#5B6D7F', fontSize: '0.74rem', fontWeight: 700 }}>{label}</Typography>
      <Typography sx={{ mt: 0.5, color: '#273B4D', fontSize: '0.88rem', fontWeight: 600, wordBreak: 'break-word' }}>
        {value || '—'}
      </Typography>
    </Box>
  );
}

export default function ViewUserDialog({ open, onClose, user, onEdit, onResetPassword }) {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));
  const enabled = Boolean(user?.enabled ?? user?.isEnabled);
  const department = useMemo(
    () => [
      user?.department?.division || user?.division,
      user?.department?.departmentName || user?.department?.name || user?.departmentName
    ].filter(Boolean).join(' — '),
    [user]
  );

  return (
    <Dialog open={open} onClose={onClose} fullScreen={fullScreen} maxWidth="sm" fullWidth PaperProps={{ sx: stableDialogPaperSx(fullScreen) }}>
      <DialogTitle sx={stableDialogTitleSx}>
        <Typography component="div" sx={{ fontSize: '1.15rem', fontWeight: 900, lineHeight: 1.25 }}>User Profile</Typography>
        <IconButton aria-label="Close" onClick={onClose} sx={stableCloseButtonSx}><CloseRoundedIcon /></IconButton>
      </DialogTitle>
      <DialogContent dividers sx={stableDialogContentSx}>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(12, minmax(0, 1fr))' }, gap: 2 }}>
          <Box sx={{ gridColumn: { xs: 'span 1', sm: 'span 12' }, display: 'flex', alignItems: 'center', gap: 1.5, p: 1.25, borderRadius: 1.25, border: '1px solid #C3CFDB' }}>
            <Avatar src={imageUrl(user?.profileImageUrl || user?.avatar) || undefined} sx={{ width: 52, height: 52, bgcolor: '#EAF1F8', color: STABLE_FORM_COLORS.navy, fontWeight: 800 }}>
              {(user?.username?.[0] || 'U').toUpperCase()}
            </Avatar>
            <Box sx={{ minWidth: 0, flex: 1 }}>
              <Typography sx={{ color: '#17324D', fontSize: '0.96rem', fontWeight: 800 }}>{user?.username || '—'}</Typography>
              <Typography noWrap sx={{ mt: 0.25, color: '#64748B', fontSize: '0.82rem' }}>{user?.email || '—'}</Typography>
            </Box>
            <Stack direction="row" spacing={0.75}>
              <Chip label={user?.role || 'User'} size="small" sx={{ height: 25, borderRadius: 1.1, bgcolor: '#EFF5FF', color: '#285F9E', border: '1px solid #D4E4FA', fontWeight: 700, fontSize: '0.72rem' }} />
              <Chip label={enabled ? 'Enabled' : 'Disabled'} size="small" sx={{ height: 25, borderRadius: 1.1, bgcolor: enabled ? '#ECF8F0' : '#FFF0F0', color: enabled ? '#1D7A50' : '#B23A3A', border: `1px solid ${enabled ? '#CBEBD8' : '#F1D1D1'}`, fontWeight: 700, fontSize: '0.72rem' }} />
            </Stack>
          </Box>
          <Box sx={{ gridColumn: { xs: 'span 1', sm: 'span 6' } }}><DetailField label="Department" value={department} /></Box>
          <Box sx={{ gridColumn: { xs: 'span 1', sm: 'span 6' } }}><DetailField label="Phone" value={user?.phone} /></Box>
          <Box sx={{ gridColumn: { xs: 'span 1', sm: 'span 12' } }}><DetailField label="Address" value={user?.address} /></Box>
          <Box sx={{ gridColumn: { xs: 'span 1', sm: 'span 12' } }}><DetailField label="System Access" value={getAccessLabel(user?.accessPermissions, user?.role)} /></Box>
          <Box sx={{ gridColumn: { xs: 'span 1', sm: 'span 12' } }}><DetailField label="Buyer Access" value={buyerAccessLabel(user)} /></Box>
        </Box>
      </DialogContent>
      <DialogActions sx={stableDialogActionsSx}>
        <Button onClick={onClose} sx={stableTextButtonSx}>Close</Button>
        {onResetPassword && <Button onClick={onResetPassword} variant="outlined" sx={stableOutlineButtonSx}>Reset Password</Button>}
        {onEdit && <Button onClick={onEdit} variant="contained" sx={stablePrimaryButtonSx}>Edit User</Button>}
      </DialogActions>
    </Dialog>
  );
}
