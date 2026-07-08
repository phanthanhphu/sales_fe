import React from 'react';
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Typography
} from '@mui/material';
import { Close, DeleteForever } from '@mui/icons-material';

export default function ConfirmDeleteDialog({ open, record, config, deleting, onClose, onConfirm }) {
  const label = record?.[config.primaryField] || config.singular;

  return (
    <Dialog
      open={open}
      onClose={deleting ? undefined : onClose}
      maxWidth="xs"
      fullWidth
      PaperProps={{ sx: { borderRadius: 2 } }}
    >
      <DialogTitle sx={{ pr: 6, fontWeight: 900, color: '#b91c1c' }}>
        Delete {config.singular}
        <Typography sx={{ mt: 0.25, fontSize: '0.8rem', color: 'text.secondary', fontWeight: 400 }}>
          This action permanently removes the selected record.
        </Typography>
        <IconButton
          onClick={onClose}
          disabled={deleting}
          aria-label="Close delete dialog"
          sx={{ position: 'absolute', right: 14, top: 14 }}
        >
          <Close />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers>
        <Typography sx={{ mb: 1.25 }}>
          Delete <b>{label}</b> permanently?
        </Typography>
        <Alert severity="warning" sx={{ borderRadius: 1.25 }}>
          This action cannot be undone. The system may block deletion when this record is referenced by MAT_INFO, BOM or MPR data.
        </Alert>
      </DialogContent>

      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose} disabled={deleting} sx={{ textTransform: 'none', color: '#4b5563' }}>
          Cancel
        </Button>
        <Button
          variant="contained"
          color="error"
          startIcon={<DeleteForever />}
          onClick={onConfirm}
          disabled={deleting}
          sx={{ textTransform: 'none', fontWeight: 800 }}
        >
          {deleting ? 'Deleting...' : 'Delete'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
