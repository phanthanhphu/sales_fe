import React, { useEffect, useState } from 'react';
import {
  Alert,
  Avatar,
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
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import PhotoCameraOutlinedIcon from '@mui/icons-material/PhotoCameraOutlined';
import { useTheme } from '@mui/material/styles';
import { API_BASE_URL } from '../../config';
import {
  STABLE_FORM_COLORS,
  stableCloseButtonSx,
  stableDialogActionsSx,
  stableDialogContentSx,
  stableDialogPaperSx,
  stableDialogTitleSx,
  stableFieldSx,
  stableFloatingLabelSx,
  stableFormGridSx,
  stableImageFieldSx,
  stableOutlineButtonSx,
  stablePrimaryButtonSx,
  stableTextButtonSx
} from '../shared/stableDialogUi';

const absoluteImage = (raw) => {
  if (!raw) return '';
  const clean = String(raw).replace(/\\/g, '/').split('?')[0];
  if (clean.startsWith('http://') || clean.startsWith('https://')) return `${clean}?t=${Date.now()}`;
  return `${API_BASE_URL}${clean.startsWith('/') ? clean : `/${clean}`}?t=${Date.now()}`;
};

const toServerPath = (raw) => String(raw || '')
  .split('?')[0]
  .replace(`${API_BASE_URL}/`, '/')
  .replace(API_BASE_URL, '');

export default function ProfileEditDialog({ open, onClose, onUpdate, user }) {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));
  const [formData, setFormData] = useState({ username: '', email: '', phone: '', address: '' });
  const [keptImage, setKeptImage] = useState('');
  const [newImage, setNewImage] = useState(null);
  const [preview, setPreview] = useState('');
  const [imageToDelete, setImageToDelete] = useState('');
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const [notice, setNotice] = useState({ open: false, message: '', severity: 'success' });

  useEffect(() => {
    if (!(open && user)) return;
    const original = absoluteImage(user.profileImageUrl || user.avatar);
    setFormData({ username: user.username || '', email: user.email || '', phone: user.phone || '', address: user.address || '' });
    setKeptImage(original);
    setNewImage(null);
    setPreview(original);
    setImageToDelete('');
    setSaving(false);
    setErrors({});
    setNotice({ open: false, message: '', severity: 'success' });
  }, [open, user]);

  useEffect(() => () => {
    if (newImage && preview?.startsWith('blob:')) URL.revokeObjectURL(preview);
  }, [newImage, preview]);

  const update = (field, value) => {
    setFormData((previous) => ({ ...previous, [field]: value }));
    setErrors((previous) => ({ ...previous, [field]: '' }));
  };

  const selectImage = (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setNotice({ open: true, message: 'Select an image file.', severity: 'error' });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setNotice({ open: true, message: 'Profile image must be smaller than 5 MB.', severity: 'error' });
      return;
    }
    if (preview?.startsWith('blob:')) URL.revokeObjectURL(preview);
    if (keptImage) setImageToDelete(toServerPath(keptImage));
    setNewImage(file);
    setPreview(URL.createObjectURL(file));
  };

  const removeImage = () => {
    if (preview?.startsWith('blob:')) URL.revokeObjectURL(preview);
    if (keptImage) setImageToDelete(toServerPath(keptImage));
    setKeptImage('');
    setNewImage(null);
    setPreview('');
  };

  const validate = () => {
    const next = {};
    if (!formData.username.trim()) next.username = 'Username is required.';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const save = async () => {
    if (!user?.id) {
      setNotice({ open: true, message: 'User ID is missing.', severity: 'error' });
      return;
    }
    if (!validate()) {
      setNotice({ open: true, message: 'Please correct the highlighted fields.', severity: 'error' });
      return;
    }

    setSaving(true);
    try {
      const payload = new FormData();
      ['username', 'address', 'phone'].forEach((key) => payload.append(key, formData[key].trim()));
      if (newImage) payload.append('profileImage', newImage);
      if (imageToDelete) payload.append('imageToDelete', imageToDelete);

      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/users/${user.id}`, {
        method: 'PUT',
        headers: { accept: '*/*', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: payload
      });
      if (!response.ok) {
        const raw = await response.text();
        let message = `Unable to update profile (${response.status}).`;
        try {
          message = JSON.parse(raw)?.message || message;
        } catch {
          message = raw || message;
        }
        throw new Error(message);
      }

      const raw = await response.text();
      let body = {};
      try {
        body = JSON.parse(raw);
      } catch {
        // API may return an empty/non-JSON response.
      }
      const updated = body?.data || body?.user || body;
      const nextUser = { ...user, ...formData, ...(updated && typeof updated === 'object' ? updated : {}) };
      localStorage.setItem('user', JSON.stringify(nextUser));
      window.dispatchEvent(new Event('user-profile-updated'));
      onUpdate?.(nextUser);
      onClose?.();
    } catch (error) {
      setNotice({ open: true, message: error.message || 'Unable to update profile.', severity: 'error' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Dialog open={open} onClose={saving ? undefined : onClose} fullScreen={fullScreen} maxWidth="sm" fullWidth PaperProps={{ sx: stableDialogPaperSx(fullScreen) }}>
        <DialogTitle sx={stableDialogTitleSx}>
          <Typography component="div" sx={{ fontSize: '1.15rem', fontWeight: 750, lineHeight: 1.25 }}>Edit Profile</Typography>
          <IconButton aria-label="Close" onClick={onClose} disabled={saving} sx={stableCloseButtonSx}><CloseRoundedIcon /></IconButton>
        </DialogTitle>
        <DialogContent dividers sx={stableDialogContentSx}>
          <Box sx={stableFormGridSx}>
            <TextField required label="Username" value={formData.username} onChange={(event) => update('username', event.target.value)} disabled={saving} error={Boolean(errors.username)} helperText={errors.username} sx={{ ...stableFieldSx, gridColumn: { xs: 'span 1', sm: 'span 6' } }} />
            <TextField label="Company Email" value={formData.email} disabled sx={{ ...stableFieldSx, gridColumn: { xs: 'span 1', sm: 'span 6' } }} />
            <TextField label="Phone" value={formData.phone} onChange={(event) => update('phone', event.target.value)} disabled={saving} sx={{ ...stableFieldSx, gridColumn: { xs: 'span 1', sm: 'span 4' } }} />
            <TextField label="Address" value={formData.address} onChange={(event) => update('address', event.target.value)} disabled={saving} sx={{ ...stableFieldSx, gridColumn: { xs: 'span 1', sm: 'span 8' } }} />
            <Box sx={{ gridColumn: { xs: 'span 1', sm: 'span 12' }, ...stableImageFieldSx }}>
              <Typography sx={stableFloatingLabelSx}>Profile Image</Typography>
              <Avatar src={preview || undefined} sx={{ width: 34, height: 34, bgcolor: '#EAF1F8', color: STABLE_FORM_COLORS.navy, fontSize: '0.82rem', fontWeight: 700 }}>
                {!preview ? (formData.username?.[0] || 'U').toUpperCase() : null}
              </Avatar>
              <Typography noWrap sx={{ flex: 1, minWidth: 0, color: '#64748B', fontSize: '0.82rem' }}>{newImage?.name || (preview ? 'Current profile image' : 'No image selected')}</Typography>
              {preview && <IconButton aria-label="Remove profile image" onClick={removeImage} disabled={saving} size="small" sx={{ color: '#64748B' }}><DeleteOutlineRoundedIcon fontSize="small" /></IconButton>}
              <Button component="label" disabled={saving} startIcon={<PhotoCameraOutlinedIcon />} variant="outlined" sx={stableOutlineButtonSx}>Choose Image<input hidden type="file" accept="image/*" onChange={selectImage} /></Button>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions sx={stableDialogActionsSx}>
          <Button onClick={onClose} disabled={saving} sx={stableTextButtonSx}>Cancel</Button>
          <Button onClick={save} disabled={saving} variant="contained" sx={stablePrimaryButtonSx}>{saving ? <CircularProgress size={19} color="inherit" /> : 'Save changes'}</Button>
        </DialogActions>
      </Dialog>
      <Snackbar open={notice.open} autoHideDuration={4500} onClose={() => setNotice((previous) => ({ ...previous, open: false }))} anchorOrigin={{ vertical: 'top', horizontal: 'center' }}>
        <Alert severity={notice.severity} onClose={() => setNotice((previous) => ({ ...previous, open: false }))}>{notice.message}</Alert>
      </Snackbar>
    </>
  );
}
