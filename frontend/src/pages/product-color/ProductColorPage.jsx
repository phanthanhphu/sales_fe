import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
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
  getMasterDataById,
  getMasterDataErrorMessage,
  listMasterData,
  updateMasterData,
  uploadProductColorImage
} from '../../services/masterDataService';
import ProductColorImage from '../../components/ProductColorImage';
import StatusBadge from '../../components/StatusBadge';
import EmptyTableState from '../../components/EmptyTableState';
import { canManageSales } from 'utils/accessControl';
import { getBuyerDefinition, normalizeBuyerKey } from 'utils/buyerContext';
import ConfirmDeleteDialog from '../shared/ConfirmDeleteDialog';
import { PaginationBar, SortIndicator } from '../shared/MasterDataTable';
import { formatDateTime } from '../shared/masterDataUtils';

const blankChildColor = () => ({ id: '', childColor: '' });
const blankForm = () => ({
  patternNumber: '',
  productColor: '',
  season: '',
  styleNumber: '',
  active: 'true',
  childColors: []
});

const trim = (value) => String(value || '').trim();
const pageContent = (response) => Array.isArray(response) ? response : (response?.content || response?.items || []);
const pageTotalElements = (response) => Number(response?.totalElements ?? response?.total ?? pageContent(response).length) || 0;
const text = (value, fallback = '-') => trim(value) || fallback;
const sameId = (left, right) => String(left || '') === String(right || '');
const hasImage = (record = {}) => Boolean(
  record?.hasImage
  || record?.imageAvailable
  || record?.imageFileName
  || record?.imageStorageKey
  || record?.imageUpdatedAt
);

const productColorLinkedBomCount = (record = {}) => Math.max(
  0,
  Number(record?.linkedBomCount ?? record?.bomUsageCount ?? 0) || 0
);

const isProductColorLocked = (record = {}) => Boolean(
  record?.deleteLocked
  || record?.inUse
  || productColorLinkedBomCount(record) > 0
);

const productColorLockMessage = (record = {}) => {
  const count = productColorLinkedBomCount(record);
  return count > 0
    ? `Locked because this Product Color is linked to ${count} BOM(s). Remove or change every BOM link first.`
    : 'Locked because this Product Color is currently in use.';
};

const childColorUsageCount = (item = {}) => Math.max(
  0,
  Number(item?.usageCount ?? item?.materialLineUsageCount ?? 0) || 0
);

const isChildColorLocked = (item = {}) => Boolean(
  item?.deleteLocked
  || item?.inUse
  || childColorUsageCount(item) > 0
);

const childColorLockMessage = (item = {}) => (
  trim(item?.usageMessage)
  || (childColorUsageCount(item) > 0
    ? `This Child Color is used by ${childColorUsageCount(item)} material line(s). Change those lines to another Child Color before deleting it.`
    : 'This Child Color is already in use and cannot be deleted.')
);

const childColorNames = (record = {}) => (
  Array.isArray(record?.childColors)
    ? record.childColors.map((item) => trim(item?.childColor || item?.value || item?.name)).filter(Boolean)
    : []
);

const PRODUCT_COLOR_TABLE_COLUMNS = [
  { key: 'patternNumber', label: 'Pattern Number', minWidth: 150, sortable: true },
  { key: 'productColor', label: 'Product / Style Color', minWidth: 190, sortable: true },
  { key: 'season', label: 'Season', minWidth: 100, sortable: true },
  { key: 'styleNumber', label: 'Style Number', minWidth: 130, sortable: true },
  { key: 'childColors', label: 'Child Colors', minWidth: 330, sortable: false },
  { key: 'image', label: 'Product Image', minWidth: 132, sortable: false },
  { key: 'usage', label: 'Usage', minWidth: 125, sortable: false },
  { key: 'active', label: 'Status', minWidth: 95, sortable: false },
  { key: 'updatedAt', label: 'Updated At', minWidth: 150, sortable: true },
  { key: 'actions', label: 'Actions', minWidth: 95, sortable: false, align: 'center' }
];


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
  const matches = rows.filter((row) => (
    sameText(row?.patternNumber, payload.patternNumber)
    && sameText(row?.productColor, payload.productColor)
    && sameText(row?.season, payload.season)
    && sameText(row?.styleNumber, payload.styleNumber)
  ));
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
      <DialogTitle sx={{ pr: 6, fontWeight: 750, color: '#103B5C' }}>
        Child Colors
        <Typography sx={{ mt: 0.25, fontSize: '.8rem', color: 'text.secondary', fontWeight: 400 }}>
          {[record?.patternNumber, record?.productColor, record?.season, record?.styleNumber].map(trim).filter(Boolean).join(' · ') || 'Product / Style Color'}
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
                  <TableCell sx={{ width: 70, fontWeight: 750, backgroundColor: '#f8fafc' }}>No.</TableCell>
                  <TableCell sx={{ fontWeight: 750, backgroundColor: '#f8fafc' }}>Child Color / Comment</TableCell>
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
  onRequestRemoveImage,
  onBlockedDelete
}) {
  const [form, setForm] = useState(blankForm());
  const [childColorDeleteTarget, setChildColorDeleteTarget] = useState(null);
  const isEdit = Boolean(record?.id);
  const imageExists = hasImage(record);
  const identityLocked = isEdit && isProductColorLocked(record);

  useEffect(() => {
    if (!open) return;
    setChildColorDeleteTarget(null);
    setForm({
      patternNumber: record?.patternNumber || '',
      productColor: record?.productColor || '',
      season: record?.season || '',
      styleNumber: record?.styleNumber || '',
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
    if (isChildColorLocked(item)) {
      onBlockedDelete?.(childColorLockMessage(item));
      return;
    }

    const label = trim(item?.childColor);
    if (!label) {
      setForm((current) => ({
        ...current,
        childColors: current.childColors.filter((_, itemIndex) => itemIndex !== index)
      }));
      return;
    }

    setChildColorDeleteTarget({ index, label });
  };

  const confirmRemoveChildColor = () => {
    const targetIndex = childColorDeleteTarget?.index;
    if (!Number.isInteger(targetIndex)) return;
    setForm((current) => ({
      ...current,
      childColors: current.childColors.filter((_, itemIndex) => itemIndex !== targetIndex)
    }));
    setChildColorDeleteTarget(null);
  };

  const canSave = trim(form.patternNumber) && trim(form.productColor) && trim(form.season) && trim(form.styleNumber);
  const save = () => onSave({
    patternNumber: trim(form.patternNumber),
    productColor: trim(form.productColor),
    season: trim(form.season),
    styleNumber: trim(form.styleNumber),
    active: String(form.active) !== 'false',
    childColors: form.childColors
      .map((item) => ({ id: trim(item.id), childColor: trim(item.childColor) }))
      .filter((item) => item.childColor)
  });

  return (
    <>
      <Dialog open={open} onClose={saving ? undefined : onClose} fullWidth maxWidth="lg">
      <DialogTitle sx={{ pr: 6, fontWeight: 750, color: '#103B5C' }}>
        {record ? 'Edit Product Color' : 'Add Product Color'}
        <Typography sx={{ mt: 0.25, fontSize: '.8rem', color: 'text.secondary', fontWeight: 400 }}>
          A Product Color Master is reused only when Pattern Number, Product / Style Color, Season and Style Number all match.
        </Typography>
        <IconButton onClick={onClose} disabled={saving} sx={{ position: 'absolute', right: 14, top: 14 }}>×</IconButton>
      </DialogTitle>
      <DialogContent dividers>
        {identityLocked && (
          <Alert severity="warning" sx={{ mb: 1.5 }}>
            {productColorLockMessage(record)} Pattern Number, Product / Style Color, Season and Style Number are locked. Image and Child Colors can still be updated.
          </Alert>
        )}
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))' }, gap: 1.25 }}>
          <TextField required label="Pattern Number" value={form.patternNumber} onChange={set('patternNumber')} placeholder="LLB 352 A" disabled={identityLocked} />
          <TextField required label="Product / Style Color" value={form.productColor} onChange={set('productColor')} placeholder="BLACK" disabled={identityLocked} />
          <TextField required label="Season" value={form.season} onChange={set('season')} placeholder="F26" disabled={identityLocked} />
          <TextField required label="Style Number" value={form.styleNumber} onChange={set('styleNumber')} placeholder="271893" disabled={identityLocked} />
          <TextField select label="Status" value={form.active} onChange={set('active')} sx={{ gridColumn: { md: 'span 2' } }}>
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
              <Typography sx={{ fontWeight: 750, color: '#103B5C' }}>Product Image</Typography>
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
            <Typography sx={{ fontWeight: 750, color: '#103B5C' }}>Child Colors</Typography>
            <Typography sx={{ fontSize: '.76rem', color: 'text.secondary' }}>
              Recommended table layout: one row per Child Color/comment. Keep it simple so BOM import and BOM line edit can reuse the same list.
            </Typography>
          </Box>
          <Button size="small" startIcon={<Add />} variant="outlined" onClick={() => setForm((current) => ({ ...current, childColors: [...current.childColors, blankChildColor()] }))} sx={{ textTransform: 'none' }}>
            Add Child Color
          </Button>
        </Stack>

        {form.childColors.some(isChildColorLocked) && (
          <Alert severity="info" sx={{ mb: 1, py: 0.45 }}>
            Child Colors already used by BOM material lines are locked and cannot be deleted. Rename is still allowed.
          </Alert>
        )}

        <TableContainer sx={{ border: '1px solid #e5e7eb', borderRadius: 1.5 }}>
          <Table size="small" sx={{ minWidth: 620 }}>
            <TableHead><TableRow>
              <TableCell sx={{ width: 64, fontWeight: 750, backgroundColor: '#f8fafc' }}>No.</TableCell>
              <TableCell sx={{ fontWeight: 750, backgroundColor: '#f8fafc' }}>Child Color / Comment</TableCell>
              <TableCell sx={{ width: 80, fontWeight: 750, backgroundColor: '#f8fafc' }} align="center">Action</TableCell>
            </TableRow></TableHead>
            <TableBody>
              {form.childColors.length === 0 && (
                <TableRow><TableCell colSpan={3} sx={{ color: 'text.secondary', py: 2, textAlign: 'center' }}>No Child Color is entered yet. BOM Detail import can add missing Child Colors automatically.</TableCell></TableRow>
              )}
              {form.childColors.map((item, index) => (
                <TableRow key={item.id || `child-${index}`}>
                  <TableCell sx={{ color: 'text.secondary', fontWeight: 700 }}>{index + 1}</TableCell>
                  <TableCell><TextField size="small" required value={item.childColor} onChange={(event) => changeChildColor(index, event.target.value)} placeholder="MINERAL GREY YKK#181" fullWidth /></TableCell>
                  <TableCell align="center">
                    <Tooltip title={isChildColorLocked(item) ? childColorLockMessage(item) : 'Delete Child Color'} arrow>
                      <span>
                        <IconButton
                          color="error"
                          size="small"
                          onClick={() => removeChildColor(index)}
                          disabled={saving || isChildColorLocked(item)}
                        >
                          <Delete fontSize="small" />
                        </IconButton>
                      </span>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose} disabled={saving} sx={{ textTransform: 'none' }}>Cancel</Button>
        <Button variant="contained" onClick={save} disabled={saving || !canSave} sx={{ textTransform: 'none', fontWeight: 700, backgroundColor: '#103B5C' }}>
          {saving ? 'Saving...' : 'Save Product Color'}
        </Button>
      </DialogActions>
      </Dialog>

      <ConfirmDeleteDialog
        open={Boolean(childColorDeleteTarget)}
        title="Remove Child Color"
        subtitle="Please confirm before removing this Child Color from the Product Color."
        message={<>Remove <b>{childColorDeleteTarget?.label}</b> from this Product Color?</>}
        warning="The change is applied when you save the Product Color. Child Colors already used by BOM material lines remain protected and cannot be removed."
        itemName="Child Color"
        confirmText="Remove"
        deleting={saving}
        onClose={() => setChildColorDeleteTarget(null)}
        onConfirm={confirmRemoveChildColor}
      />
    </>
  );
}

export default function ProductColorPage() {
  const { buyerKey: routeBuyerKey } = useParams();
  const buyerKey = normalizeBuyerKey(routeBuyerKey);
  const buyer = getBuyerDefinition(buyerKey);
  const [filters, setFilters] = useState({ productColor: '' });
  const [appliedFilters, setAppliedFilters] = useState(filters);
  const [rows, setRows] = useState([]);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [totalElements, setTotalElements] = useState(0);
  const [sort, setSort] = useState({ key: 'createdAt', direction: 'desc' });
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
  const load = useCallback(async ({ pageOverride, sizeOverride, filtersOverride, sortOverride } = {}) => {
    const requestedPage = Number.isInteger(pageOverride) ? Math.max(0, pageOverride) : page;
    const requestedSize = Number.isInteger(sizeOverride) ? Math.max(1, sizeOverride) : rowsPerPage;
    const requestedFilters = filtersOverride || appliedFilters;
    const requestedSort = sortOverride || sort;

    setLoading(true);
    try {
      const response = await listMasterData('productColor', {
        ...requestedFilters,
        buyerKey,
        page: requestedPage,
        size: requestedSize,
        sortBy: requestedSort?.key || 'createdAt',
        sortDir: requestedSort?.direction || 'desc'
      });
      const nextRows = pageContent(response);
      const nextTotal = pageTotalElements(response);
      setRows(nextRows);
      setTotalElements(nextTotal);
      return { rows: nextRows, totalElements: nextTotal, page: requestedPage };
    } catch (error) {
      setRows([]);
      setTotalElements(0);
      notify(getMasterDataErrorMessage(error, 'Unable to load Product Color Master.'), 'error');
      return { rows: [], totalElements: 0, page: requestedPage };
    } finally { setLoading(false); }
  }, [appliedFilters, buyerKey, page, rowsPerPage, sort]);

  useEffect(() => { load(); }, [load]);

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

  const openEdit = async (row) => {
    if (!canWrite) { notify(writeBlockedMessage, 'warning'); return; }
    if (!row?.id) return;
    setSaving(true);
    try {
      const detail = await getMasterDataById('productColor', row.id);
      setFormRecord(detail || row);
      setFormOpen(true);
    } catch (error) {
      notify(getMasterDataErrorMessage(error, 'Unable to load Product Color usage details.'), 'error');
    } finally {
      setSaving(false);
    }
  };

  const save = async (payload) => {
    if (!canWrite) { notify(writeBlockedMessage, 'warning'); return; }
    const isCreate = !formRecord?.id;

    setSaving(true);
    try {
      let savedRecord = null;
      if (isCreate) savedRecord = await createMasterData('productColor', payload, { buyerKey });
      else await updateMasterData('productColor', formRecord.id, payload, { buyerKey });
      setFormOpen(false);
      notify('Product Color saved. Image can be uploaded or removed from the Edit screen.');
      const targetPage = isCreate ? 0 : page;
      if (isCreate && page !== 0) setPage(0);
      const result = await load({ pageOverride: targetPage });
      if (isCreate) {
        scrollToCreatedRow(resolveCreatedProductColorMasterId(savedRecord, result.rows, payload));
      }
    } catch (error) {
      notify(getMasterDataErrorMessage(error, 'Unable to save Product Color.'), 'error');
    } finally { setSaving(false); }
  };

  const remove = async () => {
    if (!canWrite) { notify(writeBlockedMessage, 'warning'); return; }
    if (!deleteTarget?.id) return;
    if (isProductColorLocked(deleteTarget)) {
      notify(productColorLockMessage(deleteTarget), 'warning');
      setDeleteTarget(null);
      return;
    }
    setSaving(true);
    try {
      await deleteMasterData('productColor', deleteTarget.id, { buyerKey });
      setDeleteTarget(null);
      notify('Product Color deleted.');
      const remainingAfterDelete = Math.max(0, totalElements - 1);
      const lastPage = Math.max(0, Math.ceil(remainingAfterDelete / rowsPerPage) - 1);
      const targetPage = Math.min(page, lastPage);
      if (targetPage !== page) setPage(targetPage);
      await load({ pageOverride: targetPage });
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
      await load();
      const detail = await getMasterDataById('productColor', row.id);
      setFormRecord(detail || row);
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
      await load();
      const detail = await getMasterDataById('productColor', targetId);
      setFormRecord(detail || imageDeleteTarget);
    } catch (error) {
      notify(getMasterDataErrorMessage(error, 'Unable to remove Product Color image.'), 'error');
    } finally { setSaving(false); }
  };

  const applySearch = () => {
    setPage(0);
    setAppliedFilters({ ...filters });
  };

  const resetFilters = () => {
    const cleared = { productColor: '' };
    setFilters(cleared);
    setPage(0);
    setAppliedFilters(cleared);
  };

  const changePage = (nextPage) => setPage(Math.max(0, Number(nextPage) || 0));
  const changeRowsPerPage = (nextSize) => {
    setRowsPerPage(Number(nextSize) || 25);
    setPage(0);
  };

  const changeSort = (column) => {
    if (!column?.sortable) return;
    setPage(0);
    setSort((current) => {
      if (current.key !== column.key) return { key: column.key, direction: 'asc' };
      if (current.direction === 'asc') return { key: column.key, direction: 'desc' };
      return { key: 'createdAt', direction: 'desc' };
    });
  };

  return (
    <Box sx={{ p: { xs: 0.6, sm: 0.75, md: 0.9 } }}>
      <Paper elevation={0} sx={{ p: 0.85, mb: 0.8, border: '1px solid #e5e7eb', borderRadius: 1.7 }}>
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
            onClick={applySearch}
            disabled={loading}
            sx={{ textTransform: 'none', backgroundColor: '#103B5C', height: 36, px: 2.2, flexShrink: 0 }}
          >
            Search
          </Button>
          <Button
            variant="outlined"
            onClick={resetFilters}
            disabled={loading}
            sx={{ textTransform: 'none', height: 36, px: 2.2, flexShrink: 0 }}
          >
            Reset
          </Button>
          <Box sx={{ flex: 1 }} />
          <Tooltip title={!canWrite ? writeBlockedMessage : ''} arrow disableHoverListener={canWrite}>
            <span>
              <Button
                variant="contained"
                startIcon={<Add fontSize="small" />}
                onClick={() => { if (canWrite) { setFormRecord(null); setFormOpen(true); } }}
                disabled={loading || !canWrite}
                sx={{ textTransform: 'none', backgroundColor: '#103B5C', height: 36, px: 1.6, flexShrink: 0 }}
              >
                Add Product Color
              </Button>
            </span>
          </Tooltip>
        </Box>
      </Paper>

      <Paper elevation={0} sx={{ borderRadius: 2, border: '1px solid #e5e7eb', overflow: 'hidden', backgroundColor: '#fff' }}>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          justifyContent="space-between"
          alignItems={{ xs: 'stretch', sm: 'center' }}
          spacing={1}
          sx={{ px: 1, py: 0.65, borderBottom: '1px solid #e5e7eb', backgroundColor: '#fff', minHeight: 42 }}
        >
          <Typography sx={{ fontWeight: 700, fontSize: '0.82rem', color: '#334155' }}>
            {loading ? 'Loading…' : `${totalElements || 0} records`}
          </Typography>
          <Button
            size="small"
            variant="outlined"
            startIcon={loading ? <CircularProgress size={14} /> : <Refresh fontSize="small" />}
            disabled={loading || saving}
            onClick={() => load()}
            sx={{ alignSelf: { xs: 'flex-start', sm: 'center' }, textTransform: 'none', borderRadius: 1.2 }}
          >
            Refresh
          </Button>
        </Stack>

        <TableContainer sx={{ maxHeight: 'calc(100vh - 250px)', minHeight: 320 }}>
          <Table stickyHeader size="small" sx={{ minWidth: 1370 }}>
            <TableHead>
              <TableRow>
                <TableCell
                  align="center"
                  sx={{ width: 54, px: 0.7, py: 0.8, fontWeight: 700, fontSize: '0.75rem', backgroundColor: '#f9fafb', color: '#374151', borderBottom: '1px solid #e5e7eb' }}
                >
                  No
                </TableCell>
                {PRODUCT_COLOR_TABLE_COLUMNS.map((column) => {
                  const activeSort = sort.key === column.key;
                  return (
                    <TableCell
                      key={column.key}
                      align={column.align || 'left'}
                      onClick={() => changeSort(column)}
                      sx={{
                        minWidth: column.minWidth,
                        px: 0.75,
                        py: 0.8,
                        fontWeight: 700,
                        fontSize: '0.75rem',
                        whiteSpace: 'nowrap',
                        backgroundColor: '#f9fafb',
                        color: '#374151',
                        borderBottom: '1px solid #e5e7eb',
                        cursor: column.sortable ? 'pointer' : 'default',
                        userSelect: 'none',
                        '&:hover': column.sortable ? { backgroundColor: '#f3f4f6' } : undefined
                      }}
                    >
                      <Stack direction="row" alignItems="center" justifyContent={column.align === 'center' ? 'center' : 'flex-start'} spacing={0.2}>
                        <Box component="span">{column.label}</Box>
                        {column.sortable && <SortIndicator active={activeSort} direction={sort.direction} />}
                      </Stack>
                    </TableCell>
                  );
                })}
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={11} sx={{ py: 5 }}>
                    <Stack direction="row" justifyContent="center" alignItems="center" spacing={1}>
                      <CircularProgress size={20} />
                      <Typography sx={{ fontSize: '0.82rem', color: 'text.secondary' }}>Loading Product Color records…</Typography>
                    </Stack>
                  </TableCell>
                </TableRow>
              ) : rows.length === 0 ? (
                <EmptyTableState colSpan={11} title="No Product Color found" description="" />
              ) : rows.map((row, index) => {
                const colors = childColorNames(row);
                return (
                  <TableRow key={row.id} hover data-product-color-master-id={row.id} sx={{ scrollMarginTop: 96 }}>
                    <TableCell align="center" sx={{ py: 0.6, px: 0.7, color: '#6b7280', fontSize: '0.75rem' }}>
                      {page * rowsPerPage + index + 1}
                    </TableCell>
                    <TableCell sx={{ py: 0.6, px: 0.75, minWidth: 150, color: '#374151', fontSize: '0.78rem', verticalAlign: 'top' }}>{text(row.patternNumber)}</TableCell>
                    <TableCell sx={{ py: 0.6, px: 0.75, minWidth: 190, color: '#374151', fontSize: '0.78rem', verticalAlign: 'top' }}>
                      <Typography sx={{ fontWeight: 700, fontSize: '0.78rem' }}>{text(row.productColor)}</Typography>
                    </TableCell>
                    <TableCell sx={{ py: 0.6, px: 0.75, minWidth: 100, color: '#374151', fontSize: '0.78rem', verticalAlign: 'top' }}>{text(row.season)}</TableCell>
                    <TableCell sx={{ py: 0.6, px: 0.75, minWidth: 130, color: '#374151', fontSize: '0.78rem', verticalAlign: 'top' }}>{text(row.styleNumber)}</TableCell>
                    <TableCell sx={{ py: 0.6, px: 0.75, minWidth: 330, color: '#374151', fontSize: '0.78rem', verticalAlign: 'top' }}>
                      <ChildColorChips colors={colors} />
                      <Stack direction="row" alignItems="center" spacing={1} sx={{ mt: 0.35 }}>
                        <Typography sx={{ fontSize: '.68rem', color: 'text.secondary' }}>{colors.length} child color(s)</Typography>
                        <Button size="small" variant="text" disabled={!colors.length} onClick={() => setChildColorViewTarget(row)} sx={{ minWidth: 0, p: 0, textTransform: 'none', fontSize: '.68rem', fontWeight: 700 }}>
                          Open
                        </Button>
                      </Stack>
                    </TableCell>
                    <TableCell sx={{ py: 0.6, px: 0.75, minWidth: 132, verticalAlign: 'top' }}>
                      <ProductColorImage productColor={row} height={62} />
                    </TableCell>
                    <TableCell sx={{ py: 0.6, px: 0.75, minWidth: 125, color: '#374151', fontSize: '0.78rem', verticalAlign: 'top' }}>
                      <Tooltip title={isProductColorLocked(row) ? productColorLockMessage(row) : 'Not linked to any BOM. This Product Color can be deleted.'} arrow>
                        <Chip
                          size="small"
                          label={isProductColorLocked(row) ? `Locked · ${productColorLinkedBomCount(row)} BOM` : 'Available'}
                          color={isProductColorLocked(row) ? 'warning' : 'default'}
                          variant="outlined"
                          sx={{ height: 23, fontSize: '0.67rem', fontWeight: 750 }}
                        />
                      </Tooltip>
                    </TableCell>
                    <TableCell sx={{ py: 0.6, px: 0.75, minWidth: 95, color: '#374151', fontSize: '0.78rem', verticalAlign: 'top' }}>
<StatusBadge status={row.active === false ? 'INACTIVE' : 'ACTIVE'} />
                    </TableCell>
                    <TableCell sx={{ py: 0.6, px: 0.75, minWidth: 150, color: '#374151', fontSize: '0.76rem', verticalAlign: 'top' }}>
                      {formatDateTime(row.updatedAt)}
                    </TableCell>
                    <TableCell align="center" sx={{ py: 0.45, px: 0.7, minWidth: 95 }}>
                      <Stack direction="row" spacing={0.4} justifyContent="center">
                        <Tooltip title={!canWrite ? writeBlockedMessage : 'Edit Product Color / Image / Child Colors'} arrow>
                          <span><IconButton size="small" color="primary" disabled={!canWrite || saving} sx={{ p: 0.25 }} onClick={() => { if (canWrite) openEdit(row); }}><Edit fontSize="small" /></IconButton></span>
                        </Tooltip>
                        <Tooltip title={!canWrite ? writeBlockedMessage : (isProductColorLocked(row) ? productColorLockMessage(row) : 'Delete Product Color')} arrow>
                          <span>
                            <IconButton
                              size="small"
                              color="error"
                              disabled={!canWrite || saving || isProductColorLocked(row)}
                              sx={{ p: 0.25 }}
                              onClick={() => { if (canWrite && !isProductColorLocked(row)) setDeleteTarget(row); }}
                            >
                              <Delete fontSize="small" />
                            </IconButton>
                          </span>
                        </Tooltip>
                      </Stack>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>

        <Box sx={{ p: 1, borderTop: '1px solid #e5e7eb', backgroundColor: '#fff' }}>
          <PaginationBar
            count={totalElements}
            page={page}
            rowsPerPage={rowsPerPage}
            loading={loading}
            onPageChange={changePage}
            onRowsPerPageChange={changeRowsPerPage}
          />
        </Box>
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
        onBlockedDelete={(message) => notify(message, 'warning')}
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
        warning="Only Product Colors that are not linked to any BOM can be deleted."
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
