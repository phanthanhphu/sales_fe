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

const API_BASE = `${API_BASE_URL}/api/departments`;

export default function AddDepartmentDialog({ open, onClose, onSuccess }) {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));
  const [division, setDivision] = useState('');
  const [departmentName, setDepartmentName] = useState('');
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const [notice, setNotice] = useState({ open: false, message: '', severity: 'success' });

  useEffect(() => {
    if (!open) return;
    setDivision('');
    setDepartmentName('');
    setSaving(false);
    setErrors({});
    setNotice({ open: false, message: '', severity: 'success' });
  }, [open]);

  const validate = () => {
    const next = {};
    if (!division.trim()) next.division = 'Division is required.';
    if (!departmentName.trim()) next.departmentName = 'Department name is required.';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const save = async () => {
    if (!validate()) {
      setNotice({ open: true, message: 'Please correct the highlighted fields.', severity: 'error' });
      return;
    }

    setSaving(true);
    try {
      const params = new URLSearchParams({
        division: division.trim(),
        departmentName: departmentName.trim()
      });
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}?${params}`, {
        method: 'POST',
        headers: { accept: '*/*', ...(token ? { Authorization: `Bearer ${token}` } : {}) }
      });

      if (!response.ok) {
        const raw = await response.text();
        let message = `Unable to create department (${response.status}).`;
        try {
          message = JSON.parse(raw)?.message || message;
        } catch {
          message = raw || message;
        }
        throw new Error(message);
      }

      let result = {};
      try {
        result = await response.json();
      } catch {
        result = { division, departmentName };
      }
      onSuccess?.(result);
      onClose?.(true);
    } catch (error) {
      setNotice({ open: true, message: error.message || 'Unable to create department.', severity: 'error' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Dialog
        open={open}
        onClose={saving ? undefined : onClose}
        fullScreen={fullScreen}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: stableDialogPaperSx(fullScreen) }}
      >
        <DialogTitle sx={stableDialogTitleSx}>
          <Typography component="div" sx={{ fontSize: '1.15rem', fontWeight: 900, lineHeight: 1.25 }}>
            Add Department
          </Typography>
          <IconButton aria-label="Close" onClick={onClose} disabled={saving} sx={stableCloseButtonSx}>
            <CloseRoundedIcon />
          </IconButton>
        </DialogTitle>

        <DialogContent dividers sx={stableDialogContentSx}>
          <Box sx={stableFormGridSx}>
            <TextField
              required
              label="Division"
              value={division}
              onChange={(event) => {
                setDivision(event.target.value);
                setErrors((current) => ({ ...current, division: '' }));
              }}
              disabled={saving}
              error={Boolean(errors.division)}
              helperText={errors.division}
              sx={{ ...stableFieldSx, gridColumn: { xs: 'span 1', sm: 'span 6' } }}
            />
            <TextField
              required
              label="Department Name"
              value={departmentName}
              onChange={(event) => {
                setDepartmentName(event.target.value);
                setErrors((current) => ({ ...current, departmentName: '' }));
              }}
              disabled={saving}
              error={Boolean(errors.departmentName)}
              helperText={errors.departmentName}
              sx={{ ...stableFieldSx, gridColumn: { xs: 'span 1', sm: 'span 6' } }}
            />
          </Box>
        </DialogContent>

        <DialogActions sx={stableDialogActionsSx}>
          <Button onClick={onClose} disabled={saving} sx={stableTextButtonSx}>Cancel</Button>
          <Button onClick={save} disabled={saving} variant="contained" sx={stablePrimaryButtonSx}>
            {saving ? <CircularProgress size={19} color="inherit" /> : 'Create Department'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={notice.open}
        autoHideDuration={4500}
        onClose={() => setNotice((current) => ({ ...current, open: false }))}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert severity={notice.severity} onClose={() => setNotice((current) => ({ ...current, open: false }))}>
          {notice.message}
        </Alert>
      </Snackbar>
    </>
  );
}
