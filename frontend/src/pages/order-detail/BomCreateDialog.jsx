import { useEffect, useState } from 'react';
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, Stack, TextField, Typography } from '@mui/material';
import { Close } from '@mui/icons-material';

export default function BomCreateDialog({ open, saving, onClose, onSave }) {
  const [form, setForm] = useState({ bomNo: '', bomName: '' });
  useEffect(() => { if (open) setForm({ bomNo: '', bomName: '' }); }, [open]);
  return <Dialog open={open} onClose={saving ? undefined : onClose} fullWidth maxWidth="sm">
    <DialogTitle sx={{ fontWeight: 750, color: '#103B5C' }}>Add BOM<IconButton onClick={onClose} disabled={saving} sx={{ position: 'absolute', top: 12, right: 12 }}><Close /></IconButton><Typography sx={{ fontSize: '0.8rem', color: 'text.secondary', fontWeight: 400 }}>Create a blank BOM. You can add packings, materials, and images afterward.</Typography></DialogTitle>
    <DialogContent dividers><Stack spacing={2}><TextField required label="BOM No" value={form.bomNo} onChange={(e) => setForm((x) => ({ ...x, bomNo: e.target.value }))} /><TextField required label="BOM Name" value={form.bomName} onChange={(e) => setForm((x) => ({ ...x, bomName: e.target.value }))} /></Stack></DialogContent>
    <DialogActions sx={{ p: 2 }}><Button onClick={onClose} disabled={saving} sx={{ textTransform: 'none' }}>Cancel</Button><Button onClick={() => onSave(form)} variant="contained" disabled={saving} sx={{ textTransform: 'none', backgroundColor: '#103B5C' }}>{saving ? 'Saving...' : 'Create BOM'}</Button></DialogActions>
  </Dialog>;
}
