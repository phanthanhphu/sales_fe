import { useEffect, useState } from 'react';
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, Stack, TextField, Typography } from '@mui/material';
import { Close } from '@mui/icons-material';

const EMPTY_FORM = {
  bomName: ''
};

export default function BomCreateDialog({ open, saving, onClose, onSave }) {
  const [form, setForm] = useState(EMPTY_FORM);
  useEffect(() => { if (open) setForm(EMPTY_FORM); }, [open]);

  const submit = () => onSave({
    bomName: form.bomName.trim()
  });

  return <Dialog open={open} onClose={saving ? undefined : onClose} fullWidth maxWidth="sm">
    <DialogTitle sx={{ fontWeight: 750, color: '#103B5C' }}>
      Add BOM
      <IconButton onClick={onClose} disabled={saving} sx={{ position: 'absolute', top: 12, right: 12 }}><Close /></IconButton>
      <Typography sx={{ fontSize: '0.8rem', color: 'text.secondary', fontWeight: 400 }}>
        Only BOM Name is required when creating a BOM. BOM No and Buyer are taken from the current Order/workspace. Complete Style Name and other BOM Information afterward.
      </Typography>
    </DialogTitle>
    <DialogContent dividers>
      <Stack spacing={2}>
        <TextField
          required
          autoFocus
          label="BOM Name"
          value={form.bomName}
          inputProps={{ maxLength: 200 }}
          helperText={`${form.bomName.length}/200`}
          onChange={(e) => setForm((x) => ({ ...x, bomName: e.target.value }))}
        />
      </Stack>
    </DialogContent>
    <DialogActions sx={{ p: 2 }}>
      <Button onClick={onClose} disabled={saving} sx={{ textTransform: 'none' }}>Cancel</Button>
      <Button
        onClick={submit}
        variant="contained"
        disabled={saving || !form.bomName.trim() || form.bomName.trim().length > 200}
        sx={{ textTransform: 'none', backgroundColor: '#103B5C' }}
      >
        {saving ? 'Saving...' : 'Create BOM'}
      </Button>
    </DialogActions>
  </Dialog>;
}
