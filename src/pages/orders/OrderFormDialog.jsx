import { useEffect, useMemo, useState } from 'react';
import { Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, TextField, Typography } from '@mui/material';
import { Close } from '@mui/icons-material';
import { todayLocalDate } from './orderUi';

const createEmptyForm = () => ({
  orderName: '',
  startDate: todayLocalDate(),
  endDate: ''
});

export default function OrderFormDialog({ open, record, saving, onClose, onSave }) {
  const [form, setForm] = useState(createEmptyForm);

  useEffect(() => {
    setForm(record ? {
      orderName: record.orderName || '',
      startDate: record.startDate || todayLocalDate(),
      endDate: record.endDate || ''
    } : createEmptyForm());
  }, [record, open]);

  const set = (name) => (event) => setForm((current) => ({ ...current, [name]: event.target.value }));
  const endDateInvalid = useMemo(() => Boolean(form.endDate && form.startDate && form.endDate < form.startDate), [form.endDate, form.startDate]);
  const canSave = Boolean(form.orderName.trim() && form.endDate && !endDateInvalid);

  const save = () => {
    if (!canSave) return;
    onSave?.({
      orderName: form.orderName.trim(),
      endDate: form.endDate
    });
  };

  return (
    <Dialog open={open} onClose={saving ? undefined : onClose} fullWidth maxWidth="sm">
      <DialogTitle sx={{ pr: 6, fontWeight: 750, color: '#103B5C' }}>
        {record ? 'Edit Order' : 'Add Order'}
        <Typography sx={{ mt: 0.25, fontSize: '0.8rem', color: 'text.secondary', fontWeight: 400 }}>
          Order No is generated automatically. Start Date is set to the current date when the order is created.
        </Typography>
        <IconButton onClick={onClose} disabled={saving} sx={{ position: 'absolute', right: 14, top: 14 }}><Close /></IconButton>
      </DialogTitle>
      <DialogContent dividers>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
          {record && (
            <TextField
              label="Order No"
              value={record.orderNo || ''}
              disabled
              fullWidth
            />
          )}
          <TextField
            required
            label="Order Name"
            value={form.orderName}
            onChange={set('orderName')}
            fullWidth
            sx={{ gridColumn: record ? undefined : { sm: '1 / -1' } }}
          />
          <TextField
            label="Start Date"
            type="date"
            value={form.startDate}
            disabled
            InputLabelProps={{ shrink: true }}
            helperText="Set automatically by the system."
            fullWidth
          />
          <TextField
            required
            label="End Date"
            type="date"
            value={form.endDate}
            onChange={set('endDate')}
            inputProps={{ min: form.startDate || undefined }}
            InputLabelProps={{ shrink: true }}
            error={endDateInvalid}
            helperText={endDateInvalid ? 'End Date cannot be before Start Date.' : ' '}
            fullWidth
          />
        </Box>
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose} disabled={saving} sx={{ textTransform: 'none' }}>Cancel</Button>
        <Button
          variant="contained"
          onClick={save}
          disabled={saving || !canSave}
          sx={{ textTransform: 'none', fontWeight: 700, backgroundColor: '#103B5C' }}
        >
          {saving ? 'Saving...' : record ? 'Save changes' : 'Create order'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
