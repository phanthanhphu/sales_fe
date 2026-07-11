import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  MenuItem,
  Paper,
  Snackbar,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography
} from '@mui/material';
import { Add, Delete, Edit, FileUpload, Refresh } from '@mui/icons-material';
import {
  createMasterData,
  deleteMasterData,
  deleteProductColorImage,
  getMasterDataErrorMessage,
  listMasterData,
  updateMasterData,
  uploadProductColorImage
} from '../../services/masterDataService';
import ProductColorImage from '../../components/ProductColorImage';
import { canManageSales } from 'utils/accessControl';
import ConfirmDeleteDialog from '../shared/ConfirmDeleteDialog';

const blankChildColor = () => ({ id: '', childColor: '' });
const blankForm = () => ({
  productColor: '',
  active: 'true',
  childColors: []
});

const trim = (value) => String(value || '').trim();
const pageContent = (response) => Array.isArray(response) ? response : (response?.content || response?.items || []);
const text = (value, fallback = '-') => trim(value) || fallback;
const sameId = (left, right) => String(left || '') === String(right || '');
const hasImage = (record = {}) => Boolean(
  record?.hasImage
  || record?.imageAvailable
  || record?.imageFileName
  || record?.imageStorageKey
  || record?.imageUpdatedAt
);

const childColorNames = (record = {}) => (
  Array.isArray(record?.childColors)
    ? record.childColors.map((item) => trim(item?.childColor || item?.value || item?.name)).filter(Boolean)
    : []
);


const cssAttributeEscape = (value) => (
  typeof CSS !== 'undefined' && typeof CSS.escape === 'function'
    ? CSS.escape(String(value || ''))
    : String(value || '').replace(/["\\]/g, '\\$&')
);

const responseRecordId = (response) => {
  const candidates = [response, response?.data, response?.item, response?.result, response?.record].filter((item) => item && typeof item === 'object');
  for (const item of candidates) {
    if (item?.id) return String(item.id);
  }
  return '';
};

const lastOf = (items = []) => items[items.length - 1];
const sameText = (left, right) => trim(left).toUpperCase() === trim(right).toUpperCase();

const resolveCreatedProductColorMasterId = (created, rows = [], payload = {}) => {
  const directId = responseRecordId(created);
  if (directId) return directId;
  const matches = rows.filter((row) => sameText(row?.productColor, payload.productColor));
  return String((lastOf(matches) || lastOf(rows) || {})?.id || '');
};

function ChildColorChips({ colors = [], maxVisible = 4 }) {
  const visible = colors.slice(0, maxVisible);
  const remaining = colors.length - visible.length;

  if (!colors.length) {
    return <Typography sx={{ fontSize: '.78rem', color: 'text.secondary' }}>No Child Color</Typography>;
  }

  return (
    <Stack direction="row" flexWrap="wrap" gap={0.5} alignItems="center">
      {visible.map((color, index) => (
        <Chip key={`${color}-${index}`} size="small" label={color} sx={{ maxWidth: 170, fontSize: '.68rem' }} />
      ))}
      {remaining > 0 && <Chip size="small" variant="outlined" label={`+${remaining}`} sx={{ fontSize: '.68rem' }} />}
    </Stack>
  );
}


function ChildColorsPreviewDialog({ open, record, onClose }) {
  const colors = childColorNames(record);

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle sx={{ pr: 6, fontWeight: 900, color: '#103B5C' }}>
        Child Colors
        <Typography sx={{ mt: 0.25, fontSize: '.8rem', color: 'text.secondary', fontWeight: 400 }}>
          {text(record?.productColor, 'Product / Style Color')}
        </Typography>
        <IconButton onClick={onClose} sx={{ position: 'absolute', right: 14, top: 14 }}>×</IconButton>
      </DialogTitle>
      <DialogContent dividers>
        {!colors.length ? (
          <Alert severity="info" sx={{ py: 0.5 }}>No Child Color is saved for this Product / Style Color.</Alert>
        ) : (
          <TableContainer sx={{ border: '1px solid #e5e7eb', borderRadius: 1.5 }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ width: 70, fontWeight: 900, backgroundColor: '#f8fafc' }}>No.</TableCell>
                  <TableCell sx={{ fontWeight: 900, backgroundColor: '#f8fafc' }}>Child Color / Comment</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {colors.map((color, index) => (
                  <TableRow key={`${color}-${index}`} hover>
                    <TableCell sx={{ color: 'text.secondary', fontWeight: 700 }}>{index + 1}</TableCell>
                    <TableCell>
                      <Typography sx={{ fontSize: '.82rem', wordBreak: 'break-word' }}>{color}</Typography>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </DialogContent>
      <DialogActions sx={{ p: 1.5 }}>
        <Button onClick={onClose} sx={{ textTransform: 'none' }}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}

function ProductColorDialog({
  open,
  record,
  saving,
  canWrite,
  onClose,
  onSave,
  onUploadImage,
  onRequestRemoveImage
}) {
  const [form, setForm] = useState(blankForm());
  const isEdit = Boolean(record?.id);
  const imageExists = hasImage(record);

  useEffect(() => {
    if (!open) return;
    setForm({
      productColor: record?.productColor || '',
      active: record?.active === false ? 'false' : 'true',
      childColors: Array.isArray(record?.childColors)
        ? record.childColors.map((item) => ({ ...blankChildColor(), ...item }))
        : []
    });
  }, [open, record]);

  const set = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value }));
  const changeChildColor = (index, value) => {
    setForm((current) => ({
      ...current,
      childColors: current.childColors.map((item, itemIndex) => (
        itemIndex === index ? { ...item, childColor: value } : item
      ))
    }));
  };
  const removeChildColor = (index) => {
    const item = form.childColors[index];
    const label = trim(item?.childColor) || 'this Child Color';
    const confirmed = typeof window === 'undefined'
      || !trim(item?.childColor)
      || window.confirm(`Remove ${label} from this Product Color?`);
    if (!confirmed) return;

    setForm((current) => ({
      ...current,
      childColors: current.childColors.filter((_, itemIndex) => itemIndex !== index)
    }));
  };

  const canSave = trim(form.productColor);
  const save = () => onSave({
    productColor: trim(form.productColor),
    active: String(form.active) !== 'false',
    childColors: form.childColors
      .map((item) => ({ id: trim(item.id), childColor: trim(item.childColor) }))
      .filter((item) => item.childColor)
  });

  return (
    <Dialog open={open} onClose={saving ? undefined : onClose} fullWidth maxWidth="lg">
      <DialogTitle sx={{ pr: 6, fontWeight: 900, color: '#103B5C' }}>
        {record ? 'Edit Product Color' : 'Add Product Color'}
        <Typography sx={{ mt: 0.25, fontSize: '.8rem', color: 'text.secondary', fontWeight: 400 }}>
          Product Color Master only stores Product / Style Color, shared Child Colors and one shared image. BOM-specific header information stays in the BOM.
        </Typography>
        <IconButton onClick={onClose} disabled={saving} sx={{ position: 'absolute', right: 14, top: 14 }}>×</IconButton>
      </DialogTitle>
      <DialogContent dividers>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '2fr 1fr' }, gap: 1.25 }}>
          <TextField required label="Product / Style Color" value={form.productColor} onChange={set('productColor')} placeholder="BLACK" />
          <TextField select label="Status" value={form.active} onChange={set('active')}>
            <MenuItem value="true">Active</MenuItem>
            <MenuItem value="false">Inactive</MenuItem>
          </TextField>
        </Box>

        <Paper elevation={0} sx={{ mt: 2, p: 1.25, border: '1px solid #e5e7eb', borderRadius: 1.5, backgroundColor: '#fbfdff' }}>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} alignItems={{ xs: 'stretch', md: 'center' }}>
            <Box sx={{ width: { xs: 1, md: 240 }, flexShrink: 0 }}>
              <ProductColorImage productColor={record || {}} height={150} emptyText={isEdit ? 'No product image' : 'Save first to upload image'} />
            </Box>
            <Box sx={{ minWidth: 0, flex: 1 }}>
              <Typography sx={{ fontWeight: 900, color: '#103B5C' }}>Product Image</Typography>
              <Typography sx={{ mt: 0.25, fontSize: '.76rem', color: 'text.secondary' }}>
                Upload, replace or remove the shared Product Color image directly in this Edit screen. All linked BOM screens reuse this image automatically.
              </Typography>

              {isEdit ? (
                <Stack direction="row" flexWrap="wrap" gap={1} sx={{ mt: 1 }}>
                  <Tooltip title={!canWrite ? 'Sales permission is required to change Product Color master data.' : 'Upload or replace image'} arrow>
                    <span>
                      <Button
                        variant="outlined"
                        size="small"
                        component="label"
                        startIcon={<FileUpload />}
                        disabled={!canWrite || saving}
                        sx={{ textTransform: 'none' }}
                      >
                        Upload / Replace Image
                        <input hidden type="file" accept="image/*" onChange={(event) => onUploadImage?.(event, record)} />
                      </Button>
                    </span>
                  </Tooltip>
                  {imageExists && (
                    <Tooltip title={!canWrite ? 'Sales permission is required to change Product Color master data.' : 'Remove image'} arrow>
                      <span>
                        <Button
                          variant="outlined"
                          color="warning"
                          size="small"
                          startIcon={<Delete />}
                          disabled={!canWrite || saving}
                          onClick={() => onRequestRemoveImage?.(record)}
                          sx={{ textTransform: 'none' }}
                        >
                          Remove Image
                        </Button>
                      </span>
                    </Tooltip>
                  )}
                </Stack>
              ) : (
                <Alert severity="info" sx={{ mt: 1, py: 0.3 }}>
                  Save this Product Color first, then open Edit again to upload the image.
                </Alert>
              )}
            </Box>
          </Stack>
        </Paper>

        <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', sm: 'center' }} spacing={1} sx={{ mt: 2.25, mb: 1 }}>
          <Box>
            <Typography sx={{ fontWeight: 900, color: '#103B5C' }}>Child Colors</Typography>
            <Typography sx={{ fontSize: '.76rem', color: 'text.secondary' }}>
              Recommended table layout: one row per Child Color/comment. Keep it simple so BOM import and BOM line edit can reuse the same list.
            </Typography>
          </Box>
          <Button size="small" startIcon={<Add />} variant="outlined" onClick={() => setForm((current) => ({ ...current, childColors: [...current.childColors, blankChildColor()] }))} sx={{ textTransform: 'none' }}>
            Add Child Color
          </Button>
        </Stack>

        <TableContainer sx={{ border: '1px solid #e5e7eb', borderRadius: 1.5 }}>
          <Table size="small" sx={{ minWidth: 620 }}>
            <TableHead><TableRow>
              <TableCell sx={{ width: 64, fontWeight: 900, backgroundColor: '#f8fafc' }}>No.</TableCell>
              <TableCell sx={{ fontWeight: 900, backgroundColor: '#f8fafc' }}>Child Color / Comment</TableCell>
              <TableCell sx={{ width: 80, fontWeight: 900, backgroundColor: '#f8fafc' }} align="center">Action</TableCell>
            </TableRow></TableHead>
            <TableBody>
              {form.childColors.length === 0 && (
                <TableRow><TableCell colSpan={3} sx={{ color: 'text.secondary', py: 2, textAlign: 'center' }}>No Child Color is entered yet. BOM Detail import can add missing Child Colors automatically.</TableCell></TableRow>
              )}
              {form.childColors.map((item, index) => (
                <TableRow key={item.id || `child-${index}`}>
                  <TableCell sx={{ color: 'text.secondary', fontWeight: 700 }}>{index + 1}</TableCell>
                  <TableCell><TextField size="small" required value={item.childColor} onChange={(event) => changeChildColor(index, event.target.value)} placeholder="MINERAL GREY YKK#181" fullWidth /></TableCell>
                  <TableCell align="center"><IconButton color="error" size="small" onClick={() => removeChildColor(index)}><Delete fontSize="small" /></IconButton></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose} disabled={saving} sx={{ textTransform: 'none' }}>Cancel</Button>
        <Button variant="contained" onClick={save} disabled={saving || !canSave} sx={{ textTransform: 'none', fontWeight: 800, backgroundColor: '#103B5C' }}>
          {saving ? 'Saving...' : 'Save Product Color'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default function ProductColorPage() {
  const [filters, setFilters] = useState({ productColor: '' });
  const [appliedFilters, setAppliedFilters] = useState(filters);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [formRecord, setFormRecord] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [imageDeleteTarget, setImageDeleteTarget] = useState(null);
  const [childColorViewTarget, setChildColorViewTarget] = useState(null);
  const [notice, setNotice] = useState({ open: false, severity: 'success', message: '' });
  const scrollTargetRef = useRef('');
  const canWrite = canManageSales();
  const writeBlockedMessage = 'Sales permission is required to change Product Color master data.';

  const notify = (message, severity = 'success') => setNotice({ open: true, severity, message });
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await listMasterData('productColor', { ...appliedFilters, page: 0, size: 200 });
      const nextRows = pageContent(response);
      setRows(nextRows);
      return nextRows;
    } catch (error) {
      setRows([]);
      notify(getMasterDataErrorMessage(error, 'Unable to load Product Color Master.'), 'error');
      return [];
    } finally { setLoading(false); }
  }, [appliedFilters]);

  useEffect(() => { load(); }, [load]);

  const syncOpenRecord = (nextRows = [], id = '') => {
    if (!id) return;
    const updated = nextRows.find((item) => sameId(item?.id, id));
    if (updated) setFormRecord(updated);
  };

  const scrollToCreatedRow = useCallback((id) => {
    if (id) scrollTargetRef.current = `[data-product-color-master-id="${cssAttributeEscape(id)}"]`;
  }, []);

  useEffect(() => {
    if (loading || !scrollTargetRef.current || typeof document === 'undefined') return;
    const selector = scrollTargetRef.current;
    scrollTargetRef.current = '';
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const element = document.querySelector(selector);
        if (!element) return;
        element.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
        const previousBoxShadow = element.style.boxShadow;
        const previousTransition = element.style.transition;
        element.style.transition = 'box-shadow 180ms ease';
        element.style.boxShadow = '0 0 0 3px rgba(17, 24, 39, 0.28)';
        window.setTimeout(() => {
          element.style.boxShadow = previousBoxShadow;
          element.style.transition = previousTransition;
        }, 1600);
      });
    });
  }, [loading, rows]);

  const save = async (payload) => {
    if (!canWrite) { notify(writeBlockedMessage, 'warning'); return; }
    const isCreate = !formRecord?.id;

    setSaving(true);
    try {
      let savedRecord = null;
      if (isCreate) savedRecord = await createMasterData('productColor', payload);
      else await updateMasterData('productColor', formRecord.id, payload);
      setFormOpen(false);
      notify('Product Color saved. Image can be uploaded or removed from the Edit screen.');
      const nextRows = await load();
      if (isCreate) {
        scrollToCreatedRow(resolveCreatedProductColorMasterId(savedRecord, nextRows, payload));
      }
    } catch (error) {
      notify(getMasterDataErrorMessage(error, 'Unable to save Product Color.'), 'error');
    } finally { setSaving(false); }
  };

  const remove = async () => {
    if (!canWrite) { notify(writeBlockedMessage, 'warning'); return; }
    if (!deleteTarget?.id) return;
    setSaving(true);
    try {
      await deleteMasterData('productColor', deleteTarget.id);
      setDeleteTarget(null);
      notify('Product Color deleted.');
      await load();
    } catch (error) {
      notify(getMasterDataErrorMessage(error, 'Unable to delete Product Color.'), 'error');
    } finally { setSaving(false); }
  };

  const uploadImage = async (event, row) => {
    if (!canWrite) { notify(writeBlockedMessage, 'warning'); return; }
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || !row?.id) return;
    if (!String(file.type || '').toLowerCase().startsWith('image/')) {
      notify('Please choose an image file.', 'error');
      return;
    }

    setSaving(true);
    try {
      await uploadProductColorImage(row.id, file);
      notify('Product Color image saved. Any BOM linked to this Product Color now uses the same image.');
      const nextRows = await load();
      syncOpenRecord(nextRows, row.id);
    } catch (error) {
      notify(getMasterDataErrorMessage(error, 'Unable to upload Product Color image.'), 'error');
    } finally { setSaving(false); }
  };

  const removeImage = async () => {
    if (!canWrite) { notify(writeBlockedMessage, 'warning'); return; }
    if (!imageDeleteTarget?.id) return;

    const targetId = imageDeleteTarget.id;
    setSaving(true);
    try {
      await deleteProductColorImage(targetId);
      setImageDeleteTarget(null);
      notify('Product Color image removed. BOM no longer shows this image.');
      const nextRows = await load();
      syncOpenRecord(nextRows, targetId);
    } catch (error) {
      notify(getMasterDataErrorMessage(error, 'Unable to remove Product Color image.'), 'error');
    } finally { setSaving(false); }
  };

  const resetFilters = () => {
    const cleared = { productColor: '' };
    setFilters(cleared);
    setAppliedFilters(cleared);
  };

  const summary = useMemo(() => `${rows.length} record(s) shown`, [rows.length]);

  return (
    <Box sx={{ p: { xs: 1.25, sm: 1.75, md: 2 } }}>
      <Paper elevation={0} sx={{ p: 2, mb: 2, border: '1px solid #e5e7eb', borderRadius: 2 }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'stretch', sm: 'center' }} spacing={1.25} sx={{ mb: 1.5 }}>
          <Box>
            <Typography variant="subtitle1" fontWeight={700}>Product Color Master</Typography>
            <Typography sx={{ fontSize: '.76rem', color: 'text.secondary' }}>
              Save only shared Product / Style Color, Child Colors and one image here. BOM-specific header information stays in each BOM.
            </Typography>
          </Box>
          <Tooltip title={!canWrite ? writeBlockedMessage : ''} arrow disableHoverListener={canWrite}>
            <span>
              <Button
                variant="contained"
                startIcon={<Add />}
                onClick={() => { if (canWrite) { setFormRecord(null); setFormOpen(true); } }}
                disabled={loading || !canWrite}
                sx={{ textTransform: 'none', backgroundColor: '#111827', alignSelf: { xs: 'flex-start', sm: 'center' } }}
              >
                Add Product Color
              </Button>
            </span>
          </Tooltip>
        </Stack>

        <Box sx={{ display: 'flex', flexWrap: { xs: 'wrap', lg: 'nowrap' }, alignItems: 'center', gap: 1 }}>
          {[
            ['productColor', 'Product / Style Color']
          ].map(([key, label]) => (
            <TextField
              key={key}
              size="small"
              label={label}
              value={filters[key]}
              onChange={(event) => setFilters((current) => ({ ...current, [key]: event.target.value }))}
              sx={{ flex: { xs: '1 1 100%', sm: '1 1 180px', lg: '1 1 0' }, minWidth: { sm: 170 } }}
            />
          ))}
          <Button
            variant="contained"
            onClick={() => setAppliedFilters(filters)}
            disabled={loading}
            sx={{ textTransform: 'none', backgroundColor: '#111827', height: 40, px: 2.2, flexShrink: 0 }}
          >
            Search
          </Button>
          <Button
            variant="outlined"
            onClick={resetFilters}
            disabled={loading}
            sx={{ textTransform: 'none', height: 40, px: 2.2, flexShrink: 0 }}
          >
            Reset
          </Button>
        </Box>
      </Paper>

      <Paper elevation={0} sx={{ border: '1px solid #e5e7eb', borderRadius: 2, overflow: 'hidden' }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ px: 1.5, py: 1.1, borderBottom: '1px solid #e5e7eb' }}>
          <Typography sx={{ fontWeight: 700, fontSize: '.95rem' }}>{loading ? 'Loading...' : summary}</Typography>
          <Button size="small" startIcon={<Refresh />} onClick={load} disabled={loading || saving} sx={{ textTransform: 'none' }}>Refresh</Button>
        </Stack>
        <TableContainer sx={{ maxHeight: 'calc(100vh - 295px)' }}>
          <Table stickyHeader size="small" sx={{ minWidth: 920 }}>
            <TableHead><TableRow>
              <TableCell sx={{ width: 70, fontWeight: 900, backgroundColor: '#f8fafc', whiteSpace: 'nowrap' }}>No.</TableCell>
              {['Product / Style Color', 'Child Colors', 'Product Image', 'Status', 'Actions'].map((title) => <TableCell key={title} sx={{ fontWeight: 900, backgroundColor: '#f8fafc', whiteSpace: 'nowrap' }}>{title}</TableCell>)}
            </TableRow></TableHead>
            <TableBody>
              {rows.length === 0 && <TableRow><TableCell colSpan={6} align="center" sx={{ py: 4, color: 'text.secondary' }}>{loading ? 'Loading...' : 'No Product Color found.'}</TableCell></TableRow>}
              {rows.map((row, index) => {
                const colors = childColorNames(row);
                return (
                  <TableRow key={row.id} hover data-product-color-master-id={row.id} sx={{ scrollMarginTop: 96 }}>
                    <TableCell sx={{ color: 'text.secondary', fontWeight: 800 }}>{index + 1}</TableCell>
                    <TableCell sx={{ minWidth: 230 }}>
                      <Typography sx={{ fontWeight: 900, fontSize: '.82rem' }}>{text(row.productColor)}</Typography>

                    </TableCell>
                    <TableCell sx={{ minWidth: 330 }}>
                      <ChildColorChips colors={colors} />
                      <Stack direction="row" alignItems="center" spacing={1} sx={{ mt: 0.35 }}>
                        <Typography sx={{ fontSize: '.68rem', color: 'text.secondary' }}>{colors.length} child color(s)</Typography>
                        <Button size="small" variant="text" disabled={!colors.length} onClick={() => setChildColorViewTarget(row)} sx={{ minWidth: 0, p: 0, textTransform: 'none', fontSize: '.68rem', fontWeight: 800 }}>
                          Open
                        </Button>
                      </Stack>
                    </TableCell>
                    <TableCell sx={{ minWidth: 132 }}>
                      <ProductColorImage productColor={row} height={62} />
                    </TableCell>
                    <TableCell>{row.active === false ? 'Inactive' : 'Active'}</TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={0.25}>
                        <Tooltip title={!canWrite ? writeBlockedMessage : 'Edit Product Color / Image / Child Colors'} arrow>
                          <span><IconButton size="small" color="primary" disabled={!canWrite || saving} onClick={() => { if (canWrite) { setFormRecord(row); setFormOpen(true); } }}><Edit fontSize="small" /></IconButton></span>
                        </Tooltip>
                        <Tooltip title={!canWrite ? writeBlockedMessage : 'Delete Product Color'} arrow>
                          <span><IconButton size="small" color="error" disabled={!canWrite || saving} onClick={() => { if (canWrite) setDeleteTarget(row); }}><Delete fontSize="small" /></IconButton></span>
                        </Tooltip>
                      </Stack>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      <ProductColorDialog
        open={canWrite && formOpen}
        record={formRecord}
        saving={saving}
        canWrite={canWrite}
        onClose={() => setFormOpen(false)}
        onSave={save}
        onUploadImage={uploadImage}
        onRequestRemoveImage={setImageDeleteTarget}
      />

      <ChildColorsPreviewDialog
        open={Boolean(childColorViewTarget)}
        record={childColorViewTarget}
        onClose={() => setChildColorViewTarget(null)}
      />

      <ConfirmDeleteDialog
        open={canWrite && Boolean(imageDeleteTarget)}
        record={{ label: imageDeleteTarget?.productColor || 'this Product Color image' }}
        itemName="Product Image"
        title="Remove Product Image?"
        subtitle="Please confirm before removing this image."
        message={<>Remove the saved image for <b>{imageDeleteTarget?.productColor || 'this Product Color'}</b>?</>}
        warning="BOM screens linked to this Product Color will no longer show this image."
        deleting={saving}
        onClose={() => setImageDeleteTarget(null)}
        onConfirm={removeImage}
        confirmText="Remove Image"
      />

      <ConfirmDeleteDialog
        open={canWrite && Boolean(deleteTarget)}
        record={{ label: deleteTarget?.productColor || 'this Product Color' }}
        itemName="Product Color"
        title="Delete Product Color?"
        subtitle="Please confirm before deleting this Product Color."
        message={<>Delete <b>{deleteTarget?.productColor || 'this Product Color'}</b>, its Child Colors and saved image?</>}
        warning="This can affect BOM screens linked to this Product Color Master."
        deleting={saving}
        onClose={() => setDeleteTarget(null)}
        onConfirm={remove}
        confirmText="Delete Product Color"
      />

      <Snackbar open={notice.open} autoHideDuration={4200} onClose={() => setNotice((current) => ({ ...current, open: false }))}>
        <Alert severity={notice.severity} variant="filled">{notice.message}</Alert>
      </Snackbar>
    </Box>
  );
}
