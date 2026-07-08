import React, { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Snackbar,
  TextField,
  Typography,
  useMediaQuery
} from '@mui/material';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import { useTheme } from '@mui/material/styles';
import { API_BASE_URL } from '../../config';
import {
  stableCloseButtonSx,
  stableDialogActionsSx,
  stableDialogContentSx,
  stableDialogPaperSx,
  stableDialogTitleSx,
  stableFieldSx,
  stableFormGridSx,
  stablePrimaryButtonSx,
  stableTextButtonSx
} from '../shared/stableDialogUi';

export default function ResetPasswordDialog({ open, onClose, onUpdate, user }) {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));
  const [formData, setFormData] = useState({ email: '', newPassword: '', confirmNewPassword: '' });
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const [notice, setNotice] = useState({ open: false, message: '', severity: 'success' });

  useEffect(() => {
    if (!open) return;
    setFormData({ email: user?.email || '', newPassword: '', confirmNewPassword: '' });
    setSaving(false);
    setErrors({});
    setNotice({ open: false, message: '', severity: 'success' });
  }, [open, user]);

  const update = (field, value) => {
    setFormData((previous) => ({ ...previous, [field]: value }));
    setErrors((previous) => ({ ...previous, [field]: '' }));
  };

  const validate = () => {
    const next = {};
    if (!formData.email.trim()) next.email = 'User email is missing.';
    if (!formData.newPassword) next.newPassword = 'New password is required.';
    else if (formData.newPassword.length < 6) next.newPassword = 'Password must contain at least 6 characters.';
    if (!formData.confirmNewPassword) next.confirmNewPassword = 'Confirm the new password.';
    else if (formData.newPassword !== formData.confirmNewPassword) next.confirmNewPassword = 'Passwords do not match.';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const save = async () => {
    if (!validate()) {
      setNotice({ open: true, message: 'Please correct the highlighted fields.', severity: 'error' });
      return;
    }

    const token = localStorage.getItem('token');
    if (!token) {
      setNotice({ open: true, message: 'Your login session has expired. Please sign in again.', severity: 'error' });
      return;
    }

    setSaving(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/users/reset-password`, {
        method: 'POST',
        headers: { accept: '*/*', 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(formData)
      });
      if (!response.ok) {
        const raw = await response.text();
        let message = `Password reset failed (${response.status}).`;
        try {
          message = JSON.parse(raw)?.message || message;
        } catch {
          message = raw || message;
        }
        throw new Error(message);
      }
      const data = await response.json();
      onUpdate?.(data);
      onClose?.();
    } catch (error) {
      setNotice({ open: true, message: error.message || 'Password reset failed.', severity: 'error' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Dialog open={open} onClose={saving ? undefined : onClose} fullScreen={fullScreen} maxWidth="sm" fullWidth PaperProps={{ sx: stableDialogPaperSx(fullScreen) }}>
        <DialogTitle sx={stableDialogTitleSx}>
          <Typography component="div" sx={{ fontSize: '1.15rem', fontWeight: 900, lineHeight: 1.25 }}>Reset Password</Typography>
          <IconButton aria-label="Close" onClick={onClose} disabled={saving} sx={stableCloseButtonSx}><CloseRoundedIcon /></IconButton>
        </DialogTitle>
        <DialogContent dividers sx={stableDialogContentSx}>
          <Box sx={stableFormGridSx}>
            <TextField
              label="User Email"
              value={formData.email}
              disabled
              error={Boolean(errors.email)}
              helperText={errors.email}
              sx={{ ...stableFieldSx, gridColumn: { xs: 'span 1', sm: 'span 12' } }}
            />
            <TextField
              required
              type="password"
              label="New Password"
              value={formData.newPassword}
              onChange={(event) => update('newPassword', event.target.value)}
              disabled={saving}
              error={Boolean(errors.newPassword)}
              helperText={errors.newPassword}
              sx={{ ...stableFieldSx, gridColumn: { xs: 'span 1', sm: 'span 6' } }}
            />
            <TextField
              required
              type="password"
              label="Confirm New Password"
              value={formData.confirmNewPassword}
              onChange={(event) => update('confirmNewPassword', event.target.value)}
              disabled={saving}
              error={Boolean(errors.confirmNewPassword)}
              helperText={errors.confirmNewPassword}
              sx={{ ...stableFieldSx, gridColumn: { xs: 'span 1', sm: 'span 6' } }}
            />
          </Box>
        </DialogContent>
        <DialogActions sx={stableDialogActionsSx}>
          <Button onClick={onClose} disabled={saving} sx={stableTextButtonSx}>Cancel</Button>
          <Button onClick={save} disabled={saving} variant="contained" sx={stablePrimaryButtonSx}>
            {saving ? <CircularProgress size={19} color="inherit" /> : 'Reset Password'}
          </Button>
        </DialogActions>
      </Dialog>
      <Snackbar open={notice.open} autoHideDuration={4500} onClose={() => setNotice((previous) => ({ ...previous, open: false }))} anchorOrigin={{ vertical: 'top', horizontal: 'center' }}>
        <Alert severity={notice.severity} onClose={() => setNotice((previous) => ({ ...previous, open: false }))}>{notice.message}</Alert>
      </Snackbar>
    </>
  );
}
