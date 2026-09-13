import React, { useEffect, useState } from 'react';
import {
  Alert, Avatar, Box, Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle,
  FormControl, FormHelperText, IconButton, InputLabel, MenuItem, Select, Snackbar, TextField, Typography, useMediaQuery
} from '@mui/material';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import PhotoCameraOutlinedIcon from '@mui/icons-material/PhotoCameraOutlined';
import { useTheme } from '@mui/material/styles';
import { API_BASE_URL } from '../../config';
import AccessPermissionSelector from './AccessPermissionSelector';
import BuyerPermissionSelector from './BuyerPermissionSelector';
import {
  buildAddUserPayload,
  getUserDepartmentLabel,
  getUserDepartments,
  userConfig,
  validateAddUserForm
} from './userConfig';
import {
  STABLE_FORM_COLORS, stableCloseButtonSx, stableDialogActionsSx, stableDialogContentSx, stableDialogPaperSx,
  stableDialogTitleSx, stableFieldSx, stableFloatingLabelSx, stableFormGridSx, stableImageFieldSx,
  stableOutlineButtonSx, stablePrimaryButtonSx, stableSelectFieldSx, stableTextButtonSx
} from '../shared/stableDialogUi';


export default function AddUserDialog({ open, onClose, onAdd }) {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));
  const [form, setForm] = useState(userConfig.defaultAddValues);
  const [departments, setDepartments] = useState([]);
  const [loadingDepartments, setLoadingDepartments] = useState(false);
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState('');
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const [notice, setNotice] = useState({ open: false, message: '', severity: 'success' });
  const locked = saving;

  const update = (name, value) => { setForm((previous) => ({ ...previous, [name]: value })); setErrors((previous) => ({ ...previous, [name]: '' })); };
  const showNotice = (message, severity = 'error') => setNotice({ open: true, message, severity });

  useEffect(() => {
    if (!open) return;
    setForm(userConfig.defaultAddValues); setErrors({}); setImage(null); setPreview(''); setNotice({ open: false, message: '', severity: 'success' });
    let alive = true;
    const load = async () => {
      setLoadingDepartments(true);
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${API_BASE_URL}/api/departments`, { headers: { accept: 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) } });
        if (!res.ok) throw new Error(`Unable to load departments (${res.status}).`);
        const payload = await res.json();
        if (alive) setDepartments(getUserDepartments(payload));
      } catch (error) { if (alive) showNotice(error.message || 'Unable to load departments.'); }
      finally { if (alive) setLoadingDepartments(false); }
    };
    load(); return () => { alive = false; };
  }, [open]);

  useEffect(() => () => { if (preview?.startsWith('blob:')) URL.revokeObjectURL(preview); }, [preview]);

  const selectImage = (event) => {
    const file = event.target.files?.[0]; event.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) return showNotice('Select an image file.');
    if (file.size > userConfig.maxProfileImageBytes) return showNotice('Profile image must be smaller than 5 MB.');
    if (preview?.startsWith('blob:')) URL.revokeObjectURL(preview);
    setImage(file); setPreview(URL.createObjectURL(file));
  };

  const validate = () => {
    const next = validateAddUserForm(form);
    setErrors(next);
    return !Object.keys(next).length;
  };

  const save = async () => {
    if (!validate()) return showNotice('Please correct the highlighted fields.');
    setSaving(true);
    try {
      const payload = buildAddUserPayload(form, image);
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/users/add`, { method: 'POST', headers: { accept: '*/*', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: payload });
      const raw = await response.text(); let body = {}; try { body = JSON.parse(raw); } catch { /* ignore */ }
      if (!response.ok) throw new Error(body?.message || raw || `Unable to create user (${response.status}).`);
      onAdd?.(body); onClose?.();
    } catch (error) { showNotice(error.message || 'Unable to create user.'); }
    finally { setSaving(false); }
  };

  return <>
    <Dialog open={open} onClose={locked ? undefined : onClose} fullScreen={fullScreen} maxWidth="md" fullWidth PaperProps={{ sx: stableDialogPaperSx(fullScreen) }}>
      <DialogTitle sx={stableDialogTitleSx}><Typography component="div" sx={{ fontSize: '1.15rem', fontWeight: 750 }}>Add User</Typography><IconButton aria-label="Close" onClick={onClose} disabled={locked} sx={stableCloseButtonSx}><CloseRoundedIcon /></IconButton></DialogTitle>
      <DialogContent dividers sx={stableDialogContentSx}><Box sx={stableFormGridSx}>
        <TextField required label="Username" value={form.username} onChange={(event) => update('username', event.target.value)} disabled={locked} error={Boolean(errors.username)} helperText={errors.username} sx={{ ...stableFieldSx, gridColumn: { xs: 'span 1', sm: 'span 4' } }} />
        <TextField required label="Company Email" value={form.email} onChange={(event) => update('email', event.target.value)} disabled={locked} error={Boolean(errors.email)} helperText={errors.email} sx={{ ...stableFieldSx, gridColumn: { xs: 'span 1', sm: 'span 5' } }} />
        <FormControl required error={Boolean(errors.departmentId)} disabled={locked || loadingDepartments} sx={{ ...stableSelectFieldSx, gridColumn: { xs: 'span 1', sm: 'span 3' } }}><InputLabel>Department</InputLabel><Select value={form.departmentId} label="Department" onChange={(event) => update('departmentId', event.target.value)}><MenuItem value="" disabled>{loadingDepartments ? 'Loading departments…' : 'Select department'}</MenuItem>{departments.map((department) => <MenuItem key={department.id} value={department.id}>{getUserDepartmentLabel(department)}</MenuItem>)}</Select>{errors.departmentId && <FormHelperText>{errors.departmentId}</FormHelperText>}</FormControl>
        <TextField required type="password" label="Initial Password" value={form.password} onChange={(event) => update('password', event.target.value)} disabled={locked} error={Boolean(errors.password)} helperText={errors.password || 'Password requirement: at least 8 characters.'} sx={{ ...stableFieldSx, gridColumn: { xs: 'span 1', sm: 'span 3' } }} />
        <FormControl disabled={locked} sx={{ ...stableSelectFieldSx, gridColumn: { xs: 'span 1', sm: 'span 3' } }}><InputLabel>Role</InputLabel><Select value={form.role} label="Role" onChange={(event) => update('role', event.target.value)}>{userConfig.roleOptions.map((option) => <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>)}</Select></FormControl>
        <TextField label="Phone" value={form.phone} onChange={(event) => update('phone', event.target.value)} disabled={locked} sx={{ ...stableFieldSx, gridColumn: { xs: 'span 1', sm: 'span 3' } }} />
        <FormControl disabled={locked} sx={{ ...stableSelectFieldSx, gridColumn: { xs: 'span 1', sm: 'span 3' } }}><InputLabel>Account Status</InputLabel><Select value={form.isEnabled ? 'true' : 'false'} label="Account Status" onChange={(event) => update('isEnabled', event.target.value === 'true')}>{userConfig.accountStatusOptions.map((option) => <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>)}</Select></FormControl>
        <TextField label="Address" value={form.address} onChange={(event) => update('address', event.target.value)} disabled={locked} sx={{ ...stableFieldSx, gridColumn: { xs: 'span 1', sm: 'span 12' } }} />
        <AccessPermissionSelector role={form.role} value={form.accessPermissions} onChange={(value) => update('accessPermissions', value)} disabled={locked} error={errors.accessPermissions} />
        <BuyerPermissionSelector role={form.role} value={form.buyerKeys} onChange={(value) => update('buyerKeys', value)} disabled={locked} error={errors.buyerKeys} />
        <Box sx={{ gridColumn: { xs: 'span 1', sm: 'span 12' }, ...stableImageFieldSx }}><Typography sx={stableFloatingLabelSx}>Profile Image</Typography><Avatar src={preview || undefined} sx={{ width: 34, height: 34, bgcolor: '#EAF1F8', color: STABLE_FORM_COLORS.navy, fontSize: '0.82rem', fontWeight: 700 }}>{!preview ? (form.username?.[0] || 'U').toUpperCase() : null}</Avatar><Typography noWrap sx={{ flex: 1, minWidth: 0, color: '#64748B', fontSize: '0.82rem' }}>{image?.name || 'No image selected'}</Typography>{preview && <IconButton aria-label="Remove profile image" onClick={() => { if (preview?.startsWith('blob:')) URL.revokeObjectURL(preview); setImage(null); setPreview(''); }} disabled={locked} size="small" sx={{ color: '#64748B' }}><DeleteOutlineRoundedIcon fontSize="small" /></IconButton>}<Button component="label" disabled={locked} startIcon={<PhotoCameraOutlinedIcon />} variant="outlined" sx={stableOutlineButtonSx}>Choose Image<input hidden type="file" accept="image/*" onChange={selectImage} /></Button></Box>
      </Box></DialogContent>
      <DialogActions sx={stableDialogActionsSx}><Button onClick={onClose} disabled={locked} sx={stableTextButtonSx}>Cancel</Button><Button onClick={save} disabled={locked} variant="contained" sx={stablePrimaryButtonSx}>{saving ? <CircularProgress size={19} color="inherit" /> : 'Create User'}</Button></DialogActions>
    </Dialog>
    <Snackbar open={notice.open} autoHideDuration={4500} onClose={() => setNotice((previous) => ({ ...previous, open: false }))} anchorOrigin={{ vertical: 'top', horizontal: 'center' }}><Alert severity={notice.severity} onClose={() => setNotice((previous) => ({ ...previous, open: false }))}>{notice.message}</Alert></Snackbar>
  </>;
}
