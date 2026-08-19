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

const fallbackLabel = (record, config, itemName) => {
  if (!record || typeof record !== 'object') return itemName || config?.singular || 'this item';
  const primaryField = config?.primaryField;
  return (
    (primaryField && record?.[primaryField])
    || record?.label
    || record?.name
    || record?.title
    || record?.code
    || record?.id
    || itemName
    || config?.singular
    || 'this item'
  );
};

export default function ConfirmDeleteDialog({
  open,
  record,
  config = {},
  title,
  subtitle,
  message,
  warning,
  itemName,
  confirmText = 'Delete',
  deleting,
  onClose,
  onConfirm
}) {
  const singular = itemName || config?.singular || 'Item';
  const label = fallbackLabel(record, config, itemName);
  const dialogTitle = title || `Delete ${singular}`;
  const helperText = subtitle || 'Please confirm before deleting this item.';
  const confirmMessage = message || <>Delete <b>{label}</b> permanently?</>;
  const warningText = warning || 'This action cannot be undone. The system may block deletion when this record is referenced by other data.';

  return (
    <Dialog
      open={Boolean(open)}
      onClose={deleting ? undefined : onClose}
      maxWidth="xs"
      fullWidth
      PaperProps={{ sx: { borderRadius: 2 } }}
    >
      <DialogTitle sx={{ pr: 6, fontWeight: 750, color: '#b91c1c' }}>
        {dialogTitle}
        <Typography sx={{ mt: 0.25, fontSize: '0.8rem', color: 'text.secondary', fontWeight: 400 }}>
          {helperText}
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
          {confirmMessage}
        </Typography>
        {warningText && (
          <Alert severity="warning" sx={{ borderRadius: 1.25 }}>
            {warningText}
          </Alert>
        )}
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
          sx={{ textTransform: 'none', fontWeight: 700 }}
        >
          {deleting ? 'Deleting...' : confirmText}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
