import { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  MenuItem,
  Stack,
  TextField,
  Typography
} from '@mui/material';

const emptyForm = {
  styleDescription: '', styleColor: '', shipTo: '', salesComment: '',
  sapCode: '', bomLineNo: '', materialType: '', matFullDescription: '',
  matColor: '', matUnit: '', yield: '', lossFactor: '', poQuantity: '',
  currency: '', matPriceWithoutTax: '', shortNameSupplier: '', vendorCode: '',
  vendorName: '', matCharger: ''
};

const text = (value) => value === null || value === undefined ? '' : String(value);
const number = (value) => {
  if (value === '' || value === null || value === undefined) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const toForm = (line = {}) => Object.fromEntries(
  Object.keys(emptyForm).map((key) => [key, text(line[key])])
);

const displayNumber = (value) => Number.isFinite(value)
  ? value.toLocaleString('en-US', { maximumFractionDigits: 6 })
  : '-';

export default function MprLineEditDialog({ open, line, productColorMasters = [], saving, onClose, onSave }) {
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (open) {
      setForm(toForm(line));
      setErrors({});
    }
  }, [open, line]);

  const calculated = useMemo(() => {
    const yieldValue = number(form.yield);
    const factor = number(form.lossFactor);
    const poQty = number(form.poQuantity);
    const totalYield = yieldValue !== null && factor !== null ? yieldValue * factor : null;
    const required = totalYield !== null && poQty !== null ? totalYield * poQty : null;
    return { totalYield, required };
  }, [form.yield, form.lossFactor, form.poQuantity]);

  const childColorOptions = useMemo(() => {
    const normalize = (value) => String(value || '').trim().replace(/\s+/g, ' ').toUpperCase();
    const styleColor = normalize(form.styleColor);
    const styleDescription = normalize(form.styleDescription);
    const master = productColorMasters.find((item) => (
      normalize(item?.productColor) === styleColor && normalize(item?.styleName) === styleDescription
    )) || productColorMasters.find((item) => normalize(item?.productColor) === styleColor);
    const unique = new Map();
    (master?.childColors || []).forEach((item) => {
      const id = String(item?.id || '').trim();
      const childColor = String(item?.childColor || '').trim();
      if (id && childColor) unique.set(id, { id, childColor });
    });
    return Array.from(unique.values());
  }, [form.styleColor, form.styleDescription, productColorMasters]);

  const change = (name, value) => {
    setForm((current) => ({ ...current, [name]: value }));
    setErrors((current) => ({ ...current, [name]: '' }));
  };

  const validate = () => {
    const next = {};
    if (!form.materialType.trim()) next.materialType = 'Material Type Is Required.';
    if (!form.matFullDescription.trim()) next.matFullDescription = 'MAT Full Description Is Required.';
    if (!form.matUnit.trim()) next.matUnit = 'MAT Unit Is Required.';

    const yieldValue = number(form.yield);
    const factor = number(form.lossFactor);
    const poQty = number(form.poQuantity);
    const price = number(form.matPriceWithoutTax);

    if (yieldValue !== null && yieldValue < 0) next.yield = 'Yield Cannot Be Negative.';
    if (factor === null || factor <= 0) next.lossFactor = 'Loss Factor Must Be Greater Than Zero.';
    if (poQty !== null && poQty < 0) next.poQuantity = 'PO Qty Cannot Be Negative.';
    if (price !== null && price < 0) next.matPriceWithoutTax = 'MAT Price Cannot Be Negative.';

    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const save = () => {
    if (!validate()) return;

    onSave({
      styleDescription: form.styleDescription.trim(),
      styleColor: form.styleColor.trim(),
      shipTo: form.shipTo.trim(),
      salesComment: form.salesComment.trim(),
      sapCode: form.sapCode.trim(),
      bomLineNo: number(form.bomLineNo),
      materialType: form.materialType.trim(),
      matFullDescription: form.matFullDescription.trim(),
      matColor: form.matColor.trim(),
      matUnit: form.matUnit.trim(),
      yield: number(form.yield),
      lossFactor: number(form.lossFactor),
      poQuantity: number(form.poQuantity),
      currency: form.currency.trim().toUpperCase(),
      matPriceWithoutTax: number(form.matPriceWithoutTax),
      shortNameSupplier: form.shortNameSupplier.trim(),
      vendorCode: form.vendorCode.trim(),
      vendorName: form.vendorName.trim(),
      matCharger: form.matCharger.trim()
    });
  };

  const field = (name, label, props = {}) => (
    <TextField
      key={name}
      fullWidth
      size="small"
      label={label}
      value={form[name] ?? ''}
      onChange={(event) => change(name, event.target.value)}
      error={Boolean(errors[name])}
      helperText={errors[name] || props.helperText || ''}
      {...props}
    />
  );

  return (
    <Dialog open={open} onClose={saving ? undefined : onClose} fullWidth maxWidth="md">
      <DialogTitle sx={{ fontWeight: 900, color: '#103B5C' }}>Edit MPR Item</DialogTitle>
      <DialogContent dividers>
        <Typography sx={{ mb: 1.5, fontSize: '.8rem', color: 'text.secondary' }}>
          The system recalculates T.YIELD and MAT REQUIRED Q&apos;TY from Yield, Loss Factor, and PO Qty when you save.
        </Typography>

        <Typography sx={{ fontSize: '.84rem', fontWeight: 900, mb: .75 }}>Style And BOM Information</Typography>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))' }, gap: 1.25 }}>
          {field('styleDescription', 'Style Description')}
          {field('styleColor', 'Style Color')}
          {field('shipTo', 'Ship To')}
          {field('sapCode', 'SAP Code')}
          {field('bomLineNo', 'BOM No', { type: 'number', inputProps: { min: 0, step: 1 } })}
          {field('materialType', 'Material Type', { required: true })}
          <Box sx={{ gridColumn: { sm: 'span 2' } }}>
            {field('matFullDescription', 'MAT Full Description', { required: true, multiline: true, minRows: 2 })}
          </Box>
          {childColorOptions.length ? (
            <TextField
              select
              fullWidth
              size="small"
              label="MAT Color (Child Color)"
              value={childColorOptions.find((item) => item.childColor === form.matColor)?.id || ''}
              onChange={(event) => {
                const selected = childColorOptions.find((item) => item.id === event.target.value);
                change('matColor', selected?.childColor || '');
              }}
              helperText="Child Colors are filtered by STYLE COLOR."
            >
              <MenuItem value=""><em>Select Child Color</em></MenuItem>
              {childColorOptions.map((item) => <MenuItem key={item.id} value={item.id}>{item.childColor}</MenuItem>)}
            </TextField>
          ) : field('matColor', 'MAT Color (Child Color)', { helperText: 'No Child Color is available for this STYLE COLOR yet.' })}
          {field('matUnit', 'MAT Unit', { required: true })}
          <Box sx={{ gridColumn: { sm: 'span 2' } }}>
            {field('salesComment', 'Sales Comment', { multiline: true, minRows: 2 })}
          </Box>
        </Box>

        <Divider sx={{ my: 2 }} />
        <Typography sx={{ fontSize: '.84rem', fontWeight: 900, mb: .75 }}>Quantity Calculation</Typography>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, minmax(0, 1fr))' }, gap: 1.25 }}>
          {field('yield', 'Yield', { type: 'number', inputProps: { min: 0, step: 'any' } })}
          {field('lossFactor', 'Loss Factor', { type: 'number', helperText: 'Example: 1.03 For 3% Loss.', inputProps: { min: 0.000001, step: 'any' } })}
          {field('poQuantity', 'PO Qty', { type: 'number', inputProps: { min: 0, step: 'any' } })}
        </Box>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ mt: 1.25 }}>
          <Box sx={{ flex: 1, p: 1.25, border: '1px solid #e5e7eb', borderRadius: 1.5 }}>
            <Typography sx={{ fontSize: '.72rem', color: 'text.secondary' }}>T.YIELD</Typography>
            <Typography sx={{ fontWeight: 900 }}>{displayNumber(calculated.totalYield)}</Typography>
          </Box>
          <Box sx={{ flex: 1, p: 1.25, border: '1px solid #e5e7eb', borderRadius: 1.5 }}>
            <Typography sx={{ fontSize: '.72rem', color: 'text.secondary' }}>MAT REQUIRED Q&apos;TY</Typography>
            <Typography sx={{ fontWeight: 900 }}>{displayNumber(calculated.required)}</Typography>
          </Box>
        </Stack>

        <Divider sx={{ my: 2 }} />
        <Typography sx={{ fontSize: '.84rem', fontWeight: 900, mb: .75 }}>Commercial And Supplier Information</Typography>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))' }, gap: 1.25 }}>
          {field('currency', 'CUR', { inputProps: { maxLength: 3 } })}
          {field('matPriceWithoutTax', 'MAT Price (W/O Tax)', { type: 'number', inputProps: { min: 0, step: 'any' } })}
          {field('shortNameSupplier', 'Short Name Supplier')}
          {field('vendorCode', 'Vendor Code')}
          {field('vendorName', 'Vendor Name')}
          {field('matCharger', 'MAT Charger')}
        </Box>
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button disabled={saving} onClick={onClose}>Cancel</Button>
        <Button disabled={saving} variant="contained" onClick={save} sx={{ backgroundColor: '#103B5C' }}>
          {saving ? 'Saving...' : 'Save Changes'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
