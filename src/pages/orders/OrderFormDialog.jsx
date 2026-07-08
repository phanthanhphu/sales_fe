import { useEffect, useState } from 'react';
import { Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, Stack, TextField, Typography } from '@mui/material';
import { Close } from '@mui/icons-material';
import { emptyOrder } from './orderUi';

export default function OrderFormDialog({ open, record, saving, onClose, onSave }) {
  const [form, setForm] = useState(emptyOrder);

  useEffect(() => {
    setForm(record ? {
      orderNo: record.orderNo || '',
      style: record.style || '',
      customer: record.customer || '',
      season: record.season || '',
      comment: record.comment || ''
    } : emptyOrder);
  }, [record, open]);

  const set = (name) => (event) => setForm((current) => ({ ...current, [name]: event.target.value }));
  const save = () => onSave?.({ ...form, orderNo: form.orderNo.trim(), style: form.style.trim(), customer: form.customer.trim(), season: form.season.trim(), comment: form.comment.trim() });

  return (
    <Dialog open={open} onClose={saving ? undefined : onClose} fullWidth maxWidth="sm">
      <DialogTitle sx={{ pr: 6, fontWeight: 900, color: '#103B5C' }}>
        {record ? 'Edit Order' : 'Add Order'}
        <Typography sx={{ mt: 0.25, fontSize: '0.8rem', color: 'text.secondary', fontWeight: 400 }}>
          Sales creates the order; BOM will then create BOM records inside it.
        </Typography>
        <IconButton onClick={onClose} disabled={saving} sx={{ position: 'absolute', right: 14, top: 14 }}><Close /></IconButton>
      </DialogTitle>
      <DialogContent dividers>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
          <TextField required label="Order No" value={form.orderNo} onChange={set('orderNo')} fullWidth />
          <TextField required label="Season" placeholder="F26" value={form.season} onChange={set('season')} fullWidth />
          <TextField required label="Style" value={form.style} onChange={set('style')} fullWidth />
          <TextField required label="Customer" value={form.customer} onChange={set('customer')} fullWidth />
          <TextField label="Comment" value={form.comment} onChange={set('comment')} multiline minRows={3} fullWidth sx={{ gridColumn: { sm: '1 / -1' } }} />
        </Box>
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose} disabled={saving} sx={{ textTransform: 'none' }}>Cancel</Button>
        <Button variant="contained" onClick={save} disabled={saving} sx={{ textTransform: 'none', fontWeight: 800, backgroundColor: '#103B5C' }}>
          {saving ? 'Saving...' : record ? 'Save changes' : 'Create order'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
