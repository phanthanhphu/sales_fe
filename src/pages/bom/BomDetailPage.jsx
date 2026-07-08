import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControlLabel,
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
import {
  Add,
  Delete,
  Edit,
  ExpandMore,
  FileDownload,
  FileUpload,
  Image,
  InsertDriveFile,
  RestartAlt,
  Save
} from '@mui/icons-material';
import { Link as RouterLink, useParams } from 'react-router-dom';

import {
  addBomLine,
  addBomProductColor,
  addPacking,
  applyBomMprReview,
  deleteBomAttachment,
  deleteBomLine,
  deleteBomProductColor,
  deletePacking,
  downloadBomAttachment,
  downloadWithAuth,
  getApiError,
  getBomAttachmentObjectUrl,
  getBom,
  listBomMprReviews,
  openBomAttachment,
  getBomExportUrl,
  recheckBomMprReview,
  replaceBomExcel,
  updateBom,
  updateBomLine,
  updateBomProductColor,
  updatePacking,
  uploadBomAttachment
} from '../../services/orderBomMprService';
import { listMasterData } from '../../services/masterDataService';
import ProductColorImage from '../../components/ProductColorImage';
import { canManageBom } from 'utils/accessControl';
import BomMprReviewDialog from './BomMprReviewDialog';

const blankLine = {
  materialGroupNo: '',
  materialType: '',
  sapCode: '',
  detailNo: '',
  position: '',
  positionDescription: '',
  positionDescriptionExtra: '',
  pieceCode: '',
  dimensionX: '',
  dimensionY: '',
  quantity: '',
  direction: '',
  costing: '',
  costingUnit: '',
  consumptionNet: '',
  consumptionUnit: '',
  bomRemark: '',
  detailLine: false,
  productColorValues: []
};

const fieldSx = {
  '& .MuiInputBase-root': { minHeight: 38 }
};

const compactActionButtonSx = {
  textTransform: 'none',
  minHeight: 34,
  height: 34,
  px: 1.2,
  whiteSpace: 'nowrap'
};

const headerLabelSx = {
  fontSize: '0.72rem',
  fontWeight: 800,
  color: '#64748b',
  textTransform: 'uppercase',
  letterSpacing: 0.2
};

const headerValueSx = {
  fontSize: '0.86rem',
  fontWeight: 900,
  color: '#0f172a',
  wordBreak: 'break-word'
};

const headerDisplayFields = [
  { key: 'buyer', label: 'Buyer' },
  { key: 'revStage', label: 'Rev. Stage' },
  { key: 'season', label: 'Season' },
  { key: 'patternDate', label: 'Pattern Date' },
  { key: 'styleNumber', label: 'Style Number' },
  { key: 'patternRevisedDate', label: 'Pattern Revised Date' },
  { key: 'patternNumber', label: 'Pattern Number' },
  { key: 'patternMaker', label: 'Pattern Maker' },
  { key: 'styleName', label: 'Style Name' },
  { key: 'factoryProduct', label: 'Factory Product' },
  { key: 'size', label: 'Size (W x H x D)' },
  { key: 'bomMaker', label: 'BOM Maker' },
  { key: 'bomDate', label: 'BOM Date' }
];

const HeaderInfoCell = ({ label, value, wide = false }) => (
  <Box
    sx={{
      minHeight: 54,
      p: 1,
      border: '1px solid #e2e8f0',
      borderRadius: 1.25,
      backgroundColor: '#fff',
      gridColumn: wide ? { xs: '1', md: 'span 2' } : undefined
    }}
  >
    <Typography sx={headerLabelSx}>{label}</Typography>
    <Typography sx={headerValueSx}>{value || '—'}</Typography>
  </Box>
);

const asNumber = (value) => (
  value === '' || value === null || value === undefined || Number.isNaN(Number(value))
    ? null
    : Number(value)
);

const normalized = (value) => String(value || '').trim().replace(/\s+/g, ' ').toUpperCase();

const productColorsForBom = (bom) => {
  // During the first render, BOM data has not returned from the API yet.
  // A default parameter only protects `undefined`, not an explicit `null`.
  const safeBom = bom || {};

  if (Array.isArray(safeBom.productColors) && safeBom.productColors.length) {
    return safeBom.productColors;
  }

  return (safeBom.colors || []).map((color) => ({
    id: color,
    colorName: color,
    patternNumber: safeBom.header?.patternNumber || '',
    season: safeBom.header?.season || ''
  }));
};

const productColorLabel = (productColor = {}) => [
  productColor.colorName,
  productColor.patternNumber,
  productColor.season
].filter(Boolean).join(' · ');

const productColorMasterForBom = (productColor = {}, productColorMasters = []) => (
  productColorMasters.find((item) => item?.id === productColor?.productColorMasterId)
  || productColorMasters.find((item) => (
    normalized(item?.productColor) === normalized(productColor?.colorName)
    && (!productColor?.season || normalized(item?.season) === normalized(productColor?.season))
    && (!productColor?.patternNumber || normalized(item?.patternNumber) === normalized(productColor?.patternNumber))
  ))
  || null
);

const childColorsForProductColor = (productColorId, productColors = [], productColorMasters = []) => {
  const productColor = productColors.find((item) => item?.id === productColorId);
  const masterId = productColor?.productColorMasterId;
  const master = productColorMasters.find((item) => item?.id === masterId)
    || productColorMasters.find((item) => normalized(item?.productColor) === normalized(productColor?.colorName));
  const unique = new Map();
  (master?.childColors || []).forEach((item) => {
    const id = String(item?.id || '').trim();
    const childColor = String(item?.childColor || '').trim();
    if (id && childColor) unique.set(id, { id, childColor });
  });
  return Array.from(unique.values());
};

const productColorIdsForPacking = (packing = {}, productColors = []) => {
  const linkedIds = Array.isArray(packing.applicableProductColorIds)
    ? packing.applicableProductColorIds.filter(Boolean)
    : [];

  if (linkedIds.length) return linkedIds;

  return (packing.applicableColors || [])
    .map((colorName) => productColors.find((item) => normalized(item.colorName) === normalized(colorName))?.id)
    .filter(Boolean);
};

const productColorNamesForLine = (line = {}, productColors = []) => {
  const ids = (line.productColorValues || []).map((item) => item?.productColorId).filter(Boolean);
  if (ids.length) {
    return ids
      .map((id) => productColors.find((item) => item.id === id)?.colorName)
      .filter(Boolean);
  }
  return Object.keys(line.colorValues || {});
};

const emptyLineFilters = {
  keyword: '',
  productColorId: '',
  materialType: '',
  source: ''
};

const lineMatchesFilters = (line = {}, filters = emptyLineFilters, productColors = []) => {
  const keyword = String(filters.keyword || '').trim();
  const selectedProductColorId = String(filters.productColorId || '').trim();
  const selectedMaterialType = normalized(filters.materialType);
  const lineProductColors = productColorNamesForLine(line, productColors);
  const childColors = [
    ...(line.productColorValues || []).map((item) => item?.value),
    ...Object.values(line.colorValues || {})
  ].filter(Boolean);

  if (keyword) {
    const searchable = [
      line.materialGroupNo,
      line.materialType,
      line.sapCode,
      line.detailNo,
      line.position,
      line.positionDescription,
      line.positionDescriptionExtra,
      line.pieceCode,
      line.dimensionX,
      line.dimensionY,
      line.quantity,
      line.direction,
      line.costing,
      line.costingUnit,
      line.consumptionNet,
      line.consumptionUnit,
      line.bomRemark,
      ...lineProductColors,
      ...childColors
    ];
    if (!searchable.some((value) => normalized(value).includes(normalized(keyword)))) return false;
  }

  if (selectedMaterialType && normalized(line.materialType) !== selectedMaterialType) return false;

  if (selectedProductColorId) {
    const selected = productColors.find((item) => String(item?.id || '') === selectedProductColorId);
    const linkedIds = (line.productColorValues || []).map((item) => String(item?.productColorId || '')).filter(Boolean);
    const matchedById = linkedIds.includes(selectedProductColorId);
    const matchedByName = selected && lineProductColors.some((name) => normalized(name) === normalized(selected.colorName));
    if (!matchedById && !matchedByName) return false;
  }

  return true;
};

const isImageAttachment = (attachment = {}) => {
  const contentType = String(attachment.contentType || '').toLowerCase();
  const name = String(attachment.originalFileName || '').toLowerCase();
  return contentType.startsWith('image/') || /\.(png|jpe?g|gif|webp|bmp)$/i.test(name);
};

const attachmentLabel = (attachment = {}) => {
  const name = attachment.originalFileName || 'Attachment';
  return attachment.importedFromExcel ? `${name} · Imported From Excel` : name;
};

const lineToForm = (line, productColors = []) => {
  const linkedValues = Array.isArray(line?.productColorValues) && line.productColorValues.length
    ? line.productColorValues.map((item) => ({
      productColorId: item?.productColorId || '',
      childColorId: item?.childColorId || '',
      value: item?.value ?? ''
    }))
    : Object.entries(line?.colorValues || {}).map(([colorName, value]) => ({
      productColorId: productColors.find((item) => normalized(item.colorName) === normalized(colorName))?.id || '',
      childColorId: '',
      value: value ?? ''
    }));

  return {
    ...blankLine,
    ...line,
    materialGroupNo: line?.materialGroupNo ?? '',
    dimensionX: line?.dimensionX ?? '',
    dimensionY: line?.dimensionY ?? '',
    quantity: line?.quantity ?? '',
    costing: line?.costing ?? '',
    consumptionNet: line?.consumptionNet ?? '',
    productColorValues: linkedValues
  };
};

const formToLine = (form) => ({
  materialGroupNo: asNumber(form.materialGroupNo),
  materialType: String(form.materialType || '').trim(),
  sapCode: String(form.sapCode || '').trim(),
  detailNo: String(form.detailNo || '').trim(),
  position: String(form.position || '').trim(),
  positionDescription: String(form.positionDescription || '').trim(),
  positionDescriptionExtra: String(form.positionDescriptionExtra || '').trim(),
  pieceCode: String(form.pieceCode || '').trim(),
  dimensionX: asNumber(form.dimensionX),
  dimensionY: asNumber(form.dimensionY),
  quantity: asNumber(form.quantity),
  direction: String(form.direction || '').trim(),
  costing: asNumber(form.costing),
  costingUnit: String(form.costingUnit || '').trim(),
  consumptionNet: asNumber(form.consumptionNet),
  consumptionUnit: String(form.consumptionUnit || '').trim(),
  bomRemark: String(form.bomRemark || '').trim(),
  detailLine: Boolean(form.detailLine),
  productColorValues: (form.productColorValues || [])
    .map((item) => ({
      productColorId: String(item?.productColorId || '').trim(),
      childColorId: String(item?.childColorId || '').trim(),
      value: String(item?.value || '').trim()
    }))
    .filter((item) => item.productColorId && item.value)
});

function LineDialog({ open, record, productColors = [], productColorMasters = [], saving, onClose, onSave }) {
  const [form, setForm] = useState(blankLine);

  useEffect(() => {
    setForm(record ? lineToForm(record, productColors) : blankLine);
  }, [open, record, productColors]);

  const set = (key) => (event) => {
    const value = event.target.type === 'checkbox' ? event.target.checked : event.target.value;
    setForm((current) => ({ ...current, [key]: value }));
  };

  const save = () => {
    const payload = formToLine(form);
    if (!payload.detailLine && !payload.materialType) return;
    onSave?.(payload);
  };

  return (
    <Dialog open={open} onClose={saving ? undefined : onClose} fullWidth maxWidth="lg">
      <DialogTitle sx={{ pr: 6, fontWeight: 900, color: '#103B5C' }}>
        {record ? 'Edit BOM Line' : 'Add BOM Line'}
        <Typography sx={{ mt: 0.25, fontSize: '0.8rem', color: 'text.secondary', fontWeight: 400 }}>
          All fields match the BOM Details Excel columns A to Q. For each Product / Style Color, select one saved Child Color; the BOM row stores its stable Child Color link.
        </Typography>
        <IconButton onClick={onClose} disabled={saving} sx={{ position: 'absolute', right: 14, top: 14 }}>
          ×
        </IconButton>
      </DialogTitle>

      <DialogContent dividers>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(4, minmax(0, 1fr))' }, gap: 1.5 }}>
          <TextField label="Group No" type="number" value={form.materialGroupNo} onChange={set('materialGroupNo')} sx={fieldSx} />
          <TextField required={!form.detailLine} label="Material Type" value={form.materialType} onChange={set('materialType')} sx={fieldSx} />
          <TextField label="SAP Code" value={form.sapCode} onChange={set('sapCode')} sx={fieldSx} />
          <TextField label="Detail No" value={form.detailNo} onChange={set('detailNo')} sx={fieldSx} />

          <TextField label="Position" value={form.position} onChange={set('position')} sx={fieldSx} />
          <TextField label="Position Description" value={form.positionDescription} onChange={set('positionDescription')} sx={fieldSx} />
          <TextField label="Position Description 2" value={form.positionDescriptionExtra} onChange={set('positionDescriptionExtra')} sx={fieldSx} />
          <TextField label="P" value={form.pieceCode} onChange={set('pieceCode')} sx={fieldSx} />

          <TextField label="X" type="number" value={form.dimensionX} onChange={set('dimensionX')} sx={fieldSx} />
          <TextField label="Y" type="number" value={form.dimensionY} onChange={set('dimensionY')} sx={fieldSx} />
          <TextField label="Q.TY" type="number" value={form.quantity} onChange={set('quantity')} sx={fieldSx} />
          <TextField label="><" value={form.direction} onChange={set('direction')} sx={fieldSx} />

          <TextField label="Costing / MK" type="number" value={form.costing} onChange={set('costing')} sx={fieldSx} />
          <TextField label="Costing / Unit" value={form.costingUnit} onChange={set('costingUnit')} sx={fieldSx} />
          <TextField label="Consumption / Net" type="number" value={form.consumptionNet} onChange={set('consumptionNet')} sx={fieldSx} />
          <TextField label="Consumption / Unit" value={form.consumptionUnit} onChange={set('consumptionUnit')} sx={fieldSx} />

          <FormControlLabel
            control={<Checkbox checked={Boolean(form.detailLine)} onChange={set('detailLine')} />}
            label="Detail Line"
            sx={{ gridColumn: { xs: '1', sm: 'span 2' }, alignSelf: 'center' }}
          />

          <TextField
            label="B.O.M Remarks"
            value={form.bomRemark}
            onChange={set('bomRemark')}
            multiline
            minRows={2}
            sx={{ gridColumn: { xs: '1', sm: 'span 4' } }}
          />

          <Box sx={{ gridColumn: { xs: '1', sm: 'span 4' }, border: '1px solid #dbe3ec', borderRadius: 1.5, p: 1.25 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1} sx={{ mb: 1 }}>
              <Box>
                <Typography sx={{ fontWeight: 900, fontSize: '0.83rem', color: '#103B5C' }}>Product Color Values</Typography>
                <Typography sx={{ fontSize: '0.73rem', color: 'text.secondary' }}>
                  Select the Product / Style Color first. The Child Color list is then filtered from its Product Color Master. Each Product Color can be selected once per material line.
                </Typography>
              </Box>
              <Button
                size="small"
                startIcon={<Add />}
                onClick={() => setForm((current) => ({ ...current, productColorValues: [...(current.productColorValues || []), { productColorId: '', childColorId: '', value: '' }] }))}
                disabled={!productColors.length}
                sx={{ textTransform: 'none', whiteSpace: 'nowrap' }}
              >
                Add Color Value
              </Button>
            </Stack>

            {!productColors.length ? (
              <Alert severity="info" sx={{ py: 0.25 }}>Upload or replace the BOM Excel first to load its Product Color items.</Alert>
            ) : !(form.productColorValues || []).length ? (
              <Typography sx={{ py: 1, color: 'text.secondary', fontSize: '0.78rem' }}>No Product Color value is assigned to this material line.</Typography>
            ) : (
              <Stack spacing={1}>
                {(form.productColorValues || []).map((item, index) => {
                  const selectedIds = (form.productColorValues || []).map((row) => row.productColorId).filter(Boolean);
                  return (
                    <Stack key={`${item.productColorId}-${index}`} direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ sm: 'center' }}>
                      <TextField
                        select
                        required
                        size="small"
                        label="Product / Style Color"
                        value={item.productColorId}
                        onChange={(event) => setForm((current) => ({
                          ...current,
                          productColorValues: (current.productColorValues || []).map((row, rowIndex) => rowIndex === index
                            ? { ...row, productColorId: event.target.value, childColorId: '', value: '' }
                            : row)
                        }))}
                        sx={{ minWidth: { sm: 290 }, flex: 1 }}
                      >
                        <MenuItem value=""><em>Select Product / Style Color</em></MenuItem>
                        {productColors.map((productColor) => (
                          <MenuItem key={productColor.id} value={productColor.id} disabled={selectedIds.includes(productColor.id) && item.productColorId !== productColor.id}>
                            {productColorLabel(productColor)}
                          </MenuItem>
                        ))}
                      </TextField>
                      {(() => {
                        const childColors = childColorsForProductColor(item.productColorId, productColors, productColorMasters);
                        const selectedChildId = item.childColorId || childColors.find((child) => normalized(child.childColor) === normalized(item.value))?.id || '';
                        if (item.productColorId && childColors.length) {
                          return (
                            <TextField
                              select
                              required
                              size="small"
                              label="Child Color"
                              value={selectedChildId}
                              onChange={(event) => {
                                const child = childColors.find((option) => option.id === event.target.value);
                                setForm((current) => ({
                                  ...current,
                                  productColorValues: (current.productColorValues || []).map((row, rowIndex) => rowIndex === index
                                    ? { ...row, childColorId: child?.id || '', value: child?.childColor || '' }
                                    : row)
                                }));
                              }}
                              helperText="Child Colors are filtered by the selected Style Color."
                              sx={{ flex: 1 }}
                            >
                              <MenuItem value=""><em>Select Child Color</em></MenuItem>
                              {childColors.map((child) => <MenuItem key={child.id} value={child.id}>{child.childColor}</MenuItem>)}
                            </TextField>
                          );
                        }
                        return (
                          <TextField
                            required
                            size="small"
                            label="Child Color"
                            value={item.value}
                            onChange={(event) => setForm((current) => ({
                              ...current,
                              productColorValues: (current.productColorValues || []).map((row, rowIndex) => rowIndex === index
                                ? { ...row, childColorId: '', value: event.target.value }
                                : row)
                            }))}
                            helperText={item.productColorId ? 'No Child Color is configured for this Style Color yet. Add it in Product Color Master.' : 'Select Product / Style Color first.'}
                            placeholder="Child Color"
                            sx={{ flex: 1 }}
                          />
                        );
                      })()}
                      <IconButton color="error" onClick={() => setForm((current) => ({
                        ...current,
                        productColorValues: (current.productColorValues || []).filter((_, rowIndex) => rowIndex !== index)
                      }))}>
                        <Delete />
                      </IconButton>
                    </Stack>
                  );
                })}
              </Stack>
            )}
          </Box>
        </Box>
      </DialogContent>

      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose} disabled={saving} sx={{ textTransform: 'none' }}>Cancel</Button>
        <Button variant="contained" onClick={save} disabled={saving} sx={{ textTransform: 'none', fontWeight: 800, backgroundColor: '#103B5C' }}>
          {saving ? 'Saving...' : record ? 'Save Changes' : 'Create Line'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function PackingDialog({ open, record, productColors = [], saving, onClose, onSave }) {
  const [packingName, setPackingName] = useState('');
  const [sequence, setSequence] = useState('');
  const [applicableProductColorIds, setApplicableProductColorIds] = useState([]);

  useEffect(() => {
    setPackingName(record?.packingName || '');
    setSequence(record?.sequence ?? '');
    setApplicableProductColorIds(productColorIdsForPacking(record, productColors));
  }, [open, record, productColors]);

  const toggleProductColor = (productColorId) => {
    setApplicableProductColorIds((current) => (
      current.includes(productColorId)
        ? current.filter((id) => id !== productColorId)
        : [...current, productColorId]
    ));
  };

  return (
    <Dialog open={open} onClose={saving ? undefined : onClose} fullWidth maxWidth="md">
      <DialogTitle sx={{ pr: 6, fontWeight: 900, color: '#103B5C' }}>
        {record ? 'Edit Packing' : 'Add Packing'}
        <Typography sx={{ mt: 0.25, fontSize: '0.8rem', color: 'text.secondary', fontWeight: 400 }}>
          Link this Packing to Product Color items. Editing a Product Color later updates its information everywhere this Packing uses it.
        </Typography>
        <IconButton onClick={onClose} disabled={saving} sx={{ position: 'absolute', right: 14, top: 14 }}>×</IconButton>
      </DialogTitle>
      <DialogContent dividers>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 160px' }, gap: 1.5 }}>
          <TextField required label="Packing Name" value={packingName} onChange={(event) => setPackingName(event.target.value)} placeholder="PACKING US" />
          <TextField label="Sequence" type="number" value={sequence} onChange={(event) => setSequence(event.target.value)} />
        </Box>

        <Box sx={{ mt: 2, border: '1px solid #e5e7eb', borderRadius: 1.5, p: 1.25 }}>
          <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', sm: 'center' }} spacing={0.75}>
            <Box>
              <Typography sx={{ fontWeight: 800, fontSize: '0.83rem' }}>Applicable Product Colors</Typography>
              <Typography sx={{ fontSize: '0.74rem', color: 'text.secondary' }}>
                Leave all unselected to apply this Packing to every Product Color.
              </Typography>
            </Box>
            <Stack direction="row" spacing={0.5}>
              <Button size="small" onClick={() => setApplicableProductColorIds(productColors.map((item) => item.id))} sx={{ textTransform: 'none' }}>Select All</Button>
              <Button size="small" onClick={() => setApplicableProductColorIds([])} sx={{ textTransform: 'none' }}>Clear</Button>
            </Stack>
          </Stack>
          {!productColors.length ? (
            <Alert severity="info" sx={{ mt: 1.2 }}>Create Product Color items first, then link them to this Packing.</Alert>
          ) : (
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))' }, mt: 0.75 }}>
              {productColors.map((productColor) => (
                <FormControlLabel
                  key={productColor.id}
                  control={<Checkbox checked={applicableProductColorIds.includes(productColor.id)} onChange={() => toggleProductColor(productColor.id)} />}
                  label={<Typography sx={{ fontSize: '0.78rem' }}>{productColorLabel(productColor)}</Typography>}
                  sx={{ mr: 0 }}
                />
              ))}
            </Box>
          )}
        </Box>
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose} disabled={saving} sx={{ textTransform: 'none' }}>Cancel</Button>
        <Button
          variant="contained"
          disabled={saving || !packingName.trim()}
          onClick={() => onSave?.({
            packingName: packingName.trim(),
            sequence: asNumber(sequence),
            applicableProductColorIds
          })}
          sx={{ textTransform: 'none', fontWeight: 800, backgroundColor: '#103B5C' }}
        >
          {saving ? 'Saving...' : record ? 'Save Changes' : 'Create Packing'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function ProductColorDialog({ open, record, header = {}, productColorMasters = [], saving, onClose, onSave }) {
  const [form, setForm] = useState({ productColorMasterId: '', colorName: '', patternNumber: '', season: '' });

  useEffect(() => {
    const matchedMaster = productColorMasterForBom(record || {}, productColorMasters);
    setForm({
      productColorMasterId: record?.productColorMasterId || matchedMaster?.id || '',
      colorName: record?.colorName || matchedMaster?.productColor || '',
      patternNumber: record?.patternNumber || matchedMaster?.patternNumber || header?.patternNumber || header?.styleNumber || '',
      season: record?.season || matchedMaster?.season || header?.season || ''
    });
  }, [open, record, header, productColorMasters]);

  const chooseMaster = (event) => {
    const productColorMasterId = event.target.value;
    const master = productColorMasters.find((item) => item.id === productColorMasterId);
    setForm((current) => ({
      ...current,
      productColorMasterId,
      colorName: master?.productColor || current.colorName,
      patternNumber: master?.patternNumber || current.patternNumber,
      season: master?.season || current.season
    }));
  };
  const canSave = Boolean(form.productColorMasterId) && form.colorName.trim() && form.patternNumber.trim() && form.season.trim();

  return (
    <Dialog open={open} onClose={saving ? undefined : onClose} fullWidth maxWidth="sm">
      <DialogTitle sx={{ pr: 6, fontWeight: 900, color: '#103B5C' }}>
        {record ? 'Edit Product Color' : 'Add Product Color'}
        <Typography sx={{ mt: 0.25, fontSize: '0.8rem', color: 'text.secondary', fontWeight: 400 }}>
          For a manual BOM, select Product Color Master so its saved Child Colors are available when users edit the BOM material lines.
        </Typography>
        <IconButton onClick={onClose} disabled={saving} sx={{ position: 'absolute', right: 14, top: 14 }}>×</IconButton>
      </DialogTitle>
      <DialogContent dividers>
        <Stack spacing={1.4}>
          <TextField
            select
            label="Product Color Master"
            value={form.productColorMasterId}
            onChange={chooseMaster}
            helperText={productColorMasters.length ? 'Select a saved Product Color. Its saved image and Child Colors are reused in this BOM.' : 'Create Product Color and upload its image in Product Color Master first.'}
          >
            {productColorMasters.map((item) => (
              <MenuItem key={item.id} value={item.id}>
                {[item.productColor, item.season, item.patternNumber, item.styleName].filter(Boolean).join(' · ')}
              </MenuItem>
            ))}
          </TextField>
          <TextField required label="Product Color" value={form.colorName} placeholder="BLACK" disabled />
          <TextField required label="Pattern Number" value={form.patternNumber} placeholder="LLB 352 A" disabled />
          <TextField required label="Season" value={form.season} placeholder="F26" disabled />
          <Button component={RouterLink} to="/product-colors" size="small" sx={{ alignSelf: 'flex-start', textTransform: 'none' }}>
            Manage Product Color Master
          </Button>
        </Stack>
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose} disabled={saving} sx={{ textTransform: 'none' }}>Cancel</Button>
        <Button variant="contained" disabled={saving || !canSave} onClick={() => onSave?.({
          productColorMasterId: form.productColorMasterId || null,
          colorName: form.colorName.trim(),
          patternNumber: form.patternNumber.trim(),
          season: form.season.trim()
        })} sx={{ textTransform: 'none', fontWeight: 800, backgroundColor: '#103B5C' }}>
          {saving ? 'Saving...' : record ? 'Save Changes' : 'Create Product Color'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function ProtectedAttachmentImage({ bomId, attachment, onOpen }) {
  const [previewUrl, setPreviewUrl] = useState('');
  const [previewError, setPreviewError] = useState(false);

  useEffect(() => {
    let active = true;
    let objectUrl = '';

    setPreviewUrl('');
    setPreviewError(false);

    getBomAttachmentObjectUrl(bomId, attachment.id)
      .then((url) => {
        objectUrl = url;

        if (!active) {
          URL.revokeObjectURL(url);
          return;
        }

        setPreviewUrl(url);
      })
      .catch(() => {
        if (active) {
          setPreviewError(true);
        }
      });

    return () => {
      active = false;
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [attachment.id, bomId]);

  if (previewUrl) {
    return (
      <Box
        component="img"
        src={previewUrl}
        alt={attachment.originalFileName || 'BOM attachment'}
        onClick={() => onOpen?.(attachment)}
        sx={{
          width: 1,
          height: 105,
          objectFit: 'contain',
          display: 'block',
          backgroundColor: '#f8fafc',
          cursor: 'pointer'
        }}
      />
    );
  }

  return (
    <Stack
      alignItems="center"
      justifyContent="center"
      spacing={0.5}
      sx={{ height: 105, backgroundColor: '#f8fafc' }}
    >
      <Image color={previewError ? 'disabled' : 'action'} />
      <Typography sx={{ fontSize: '0.66rem', color: 'text.secondary' }}>
        {previewError ? 'Preview unavailable' : 'Loading preview...'}
      </Typography>
    </Stack>
  );
}

function AttachmentCards({
  attachments,
  bomId,
  onDelete,
  onDownload,
  onOpen,
  emptyText = 'No files.',
  actionsDisabled = false
}) {
  if (!attachments.length) {
    return <Typography sx={{ mt: 1, color: 'text.secondary', fontSize: '0.8rem' }}>{emptyText}</Typography>;
  }

  return (
    <Stack direction="row" flexWrap="wrap" gap={1.25} sx={{ mt: 1.25 }}>
      {attachments.map((attachment) => {
        const image = isImageAttachment(attachment);

        return (
          <Paper key={attachment.id} elevation={0} sx={{ width: 160, overflow: 'hidden', border: '1px solid #e5e7eb', borderRadius: 1.5 }}>
            {image ? (
              <ProtectedAttachmentImage bomId={bomId} attachment={attachment} onOpen={onOpen} />
            ) : (
              <Stack alignItems="center" justifyContent="center" sx={{ height: 105, backgroundColor: '#f8fafc' }}>
                <InsertDriveFile color="action" />
              </Stack>
            )}

            <Box sx={{ p: 0.9 }}>
              <Tooltip title={attachmentLabel(attachment)}>
                <Typography noWrap sx={{ fontSize: '0.72rem', fontWeight: 700 }}>
                  {attachment.originalFileName || 'Attachment'}
                </Typography>
              </Tooltip>

              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mt: 0.5 }}>
                <Stack direction="row" spacing={0.75}>
                  <Button
                    size="small"
                    onClick={() => onOpen?.(attachment)}
                    sx={{ minWidth: 0, p: 0, textTransform: 'none', fontSize: '0.68rem' }}
                  >
                    Open
                  </Button>
                  <Button
                    size="small"
                    onClick={() => onDownload?.(attachment)}
                    sx={{ minWidth: 0, p: 0, textTransform: 'none', fontSize: '0.68rem' }}
                  >
                    Download
                  </Button>
                </Stack>

                <Tooltip title={actionsDisabled ? 'BOM permission is required to delete files.' : 'Delete'}>
                  <span>
                    <IconButton size="small" color="error" disabled={actionsDisabled} onClick={() => onDelete(attachment.id)}>
                      <Delete fontSize="inherit" />
                    </IconButton>
                  </span>
                </Tooltip>
              </Stack>
            </Box>
          </Paper>
        );
      })}
    </Stack>
  );
}
function LineTable({ rows, productColors = [], onEdit, onDelete, onAttach, emptyText = 'No BOM lines.', actionsDisabled = false }) {
  const columns = [
    ['No.', (line) => line.materialGroupNo],
    ['Material Type', (line) => line.materialType],
    ['SAP Code', (line) => line.sapCode],
    ['Detail No', (line) => line.detailNo],
    ['Position', (line) => line.position],
    ['Position Description', (line) => [line.positionDescription, line.positionDescriptionExtra].filter(Boolean).join(' / ')],
    ['P', (line) => line.pieceCode],
    ['X', (line) => line.dimensionX],
    ['Y', (line) => line.dimensionY],
    ['Q.TY', (line) => line.quantity],
    ['><', (line) => line.direction],
    ['Costing / MK', (line) => line.costing],
    ['Costing / Unit', (line) => line.costingUnit],
    ['Consumption / Net', (line) => line.consumptionNet],
    ['Consumption / Unit', (line) => line.consumptionUnit],
    ['B.O.M Remarks', (line) => line.bomRemark],
    ['Product Colors', (line) => productColorNamesForLine(line, productColors).join(', ')]
  ];

  return (
    <TableContainer sx={{ overflowX: 'auto' }}>
      <Table size="small" sx={{ minWidth: 2200 }}>
        <TableHead>
          <TableRow>
            {columns.map(([label]) => (
              <TableCell key={label} sx={{ fontWeight: 900, fontSize: '0.72rem', backgroundColor: '#f8fafc', whiteSpace: 'nowrap' }}>
                {label}
              </TableCell>
            ))}
            <TableCell sx={{ fontWeight: 900, fontSize: '0.72rem', backgroundColor: '#f8fafc', whiteSpace: 'nowrap' }}>Files</TableCell>
            <TableCell sx={{ fontWeight: 900, fontSize: '0.72rem', backgroundColor: '#f8fafc', whiteSpace: 'nowrap' }}>Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {!rows.length ? (
            <TableRow><TableCell colSpan={columns.length + 2} align="center" sx={{ py: 2.5, color: 'text.secondary' }}>{emptyText}</TableCell></TableRow>
          ) : rows.map((line) => (
            <TableRow key={line.id} hover>
              {columns.map(([label, render]) => (
                <TableCell key={label} sx={{ fontSize: '0.75rem', verticalAlign: 'top', maxWidth: label === 'Position Description' ? 220 : 170, whiteSpace: 'normal', wordBreak: 'break-word' }}>
                  {render(line) ?? '—'}
                </TableCell>
              ))}
              <TableCell><Chip size="small" label={(line.attachments || []).length} variant="outlined" /></TableCell>
              <TableCell sx={{ whiteSpace: 'nowrap' }}>
                <Tooltip title={actionsDisabled ? 'BOM permission is required to modify BOM data.' : 'Add Line Image Or File'}><span><IconButton size="small" disabled={actionsDisabled} onClick={() => onAttach(line)}><Image fontSize="small" /></IconButton></span></Tooltip>
                <Tooltip title={actionsDisabled ? 'BOM permission is required to modify BOM data.' : 'Edit'}><span><IconButton size="small" disabled={actionsDisabled} onClick={() => onEdit(line)}><Edit fontSize="small" /></IconButton></span></Tooltip>
                <Tooltip title={actionsDisabled ? 'BOM permission is required to modify BOM data.' : 'Delete'}><span><IconButton size="small" color="error" disabled={actionsDisabled} onClick={() => onDelete(line.id)}><Delete fontSize="small" /></IconButton></span></Tooltip>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

export default function BomDetailPage() {
  const { orderId, bomId } = useParams();
  const canWrite = canManageBom();
  const writeBlockedMessage = 'BOM permission is required to modify BOM data.';
  const fileRef = useRef(null);

  const [bom, setBom] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [headerOpen, setHeaderOpen] = useState(false);
  const [headerForm, setHeaderForm] = useState({});
  const [lineCtx, setLineCtx] = useState(null);
  const [packingCtx, setPackingCtx] = useState(null);
  const [productColorCtx, setProductColorCtx] = useState(null);
  const [notice, setNotice] = useState({ open: false, severity: 'success', message: '' });
  const [attachmentScope, setAttachmentScope] = useState('BOM');
  const [attachmentLineId, setAttachmentLineId] = useState('');
  const [productColorMasters, setProductColorMasters] = useState([]);
  const [mprReviews, setMprReviews] = useState([]);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewSavingId, setReviewSavingId] = useState('');
  const [lineFilters, setLineFilters] = useState(emptyLineFilters);

  const notify = useCallback((message, severity = 'success') => setNotice({ open: true, severity, message }), []);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const [data, masterResponse, reviews] = await Promise.all([
        getBom(bomId),
        listMasterData('productColor', { page: 0, size: 200 }),
        listBomMprReviews(bomId)
      ]);
      setBom(data);
      setProductColorMasters(Array.isArray(masterResponse) ? masterResponse : (masterResponse?.content || masterResponse?.items || []));
      setMprReviews(Array.isArray(reviews) ? reviews : []);
      setHeaderForm(data?.header || {});
    } catch (error) {
      notify(getApiError(error, 'Unable to load BOM.'), 'error');
    } finally {
      setLoading(false);
    }
  }, [bomId, notify]);

  useEffect(() => { load(); }, [load]);

  const productColors = useMemo(() => productColorsForBom(bom), [bom]);
  const allBomLines = useMemo(() => [
    ...(bom?.coreLines || []),
    ...(bom?.packings || []).flatMap((packing) => packing?.lines || [])
  ], [bom]);
  const materialTypeOptions = useMemo(() => {
    const values = new Map();
    allBomLines.forEach((line) => {
      const label = String(line?.materialType || '').trim();
      if (label) values.set(normalized(label), label);
    });
    return Array.from(values, ([key, label]) => ({ key, label }))
      .sort((left, right) => left.label.localeCompare(right.label));
  }, [allBomLines]);
  const filteredCoreLines = useMemo(
    () => (bom?.coreLines || []).filter((line) => lineMatchesFilters(line, lineFilters, productColors)),
    [bom?.coreLines, lineFilters, productColors]
  );
  const matchedPackingLineCount = useMemo(
    () => (bom?.packings || [])
      .filter((packing) => !lineFilters.source || lineFilters.source === packing.id)
      .flatMap((packing) => packing?.lines || [])
      .filter((line) => lineMatchesFilters(line, lineFilters, productColors)).length,
    [bom?.packings, lineFilters, productColors]
  );
  const totalBomLineCount = useMemo(() => {
    const visibleCoreCount = !lineFilters.source || lineFilters.source === '__CORE__'
      ? (bom?.coreLines || []).length
      : 0;
    const visiblePackingCount = (bom?.packings || [])
      .filter((packing) => !lineFilters.source || lineFilters.source === packing.id)
      .reduce((count, packing) => count + (packing?.lines || []).length, 0);
    return visibleCoreCount + visiblePackingCount;
  }, [bom?.coreLines, bom?.packings, lineFilters.source]);
  const matchedBomLineCount = (lineFilters.source && lineFilters.source !== '__CORE__' ? 0 : filteredCoreLines.length)
    + matchedPackingLineCount;
  const pendingMprReviewCount = useMemo(
    () => mprReviews.filter((review) => review?.status === 'PENDING_BOM_REVIEW').length,
    [mprReviews]
  );

  const rootAttachments = useMemo(
    () => (bom?.attachments || []),
    [bom]
  );
  const bomAttachments = useMemo(
    () => rootAttachments.filter((item) => String(item.scope || 'BOM').toUpperCase() === 'BOM'),
    [rootAttachments]
  );
  const saveHeader = async () => {
    if (!canWrite) { notify(writeBlockedMessage, 'warning'); return; }
    try {
      setSaving(true);
      await updateBom(bomId, { bomNo: bom.bomNo, bomName: bom.bomName, header: headerForm });
      setHeaderOpen(false);
      notify('BOM Header Saved.');
      await load();
    } catch (error) {
      notify(getApiError(error, 'Unable to save BOM header.'), 'error');
    } finally {
      setSaving(false);
    }
  };

  const saveLine = async (payload) => {
    if (!canWrite) { notify(writeBlockedMessage, 'warning'); return; }
    try {
      setSaving(true);
      if (lineCtx?.record?.id) {
        await updateBomLine(bomId, lineCtx.record.id, payload);
      } else {
        await addBomLine(bomId, payload, lineCtx?.packingId || '');
      }
      setLineCtx(null);
      notify('BOM Line Saved.');
      await load();
    } catch (error) {
      notify(getApiError(error, 'Unable to save BOM line.'), 'error');
    } finally {
      setSaving(false);
    }
  };

  const removeLine = async (lineId) => {
    if (!canWrite) { notify(writeBlockedMessage, 'warning'); return; }
    try {
      await deleteBomLine(bomId, lineId);
      notify('BOM Line Deleted.');
      await load();
    } catch (error) {
      notify(getApiError(error, 'Unable to delete BOM line.'), 'error');
    }
  };

  const saveProductColor = async (payload) => {
    if (!canWrite) { notify(writeBlockedMessage, 'warning'); return; }
    try {
      setSaving(true);
      if (productColorCtx?.record?.id) {
        await updateBomProductColor(bomId, productColorCtx.record.id, payload);
        notify('Product Color Information Updated. Linked Packing And Material Line Views Now Use The New Information.');
      } else {
        await addBomProductColor(bomId, payload);
        notify('Product Color Created. Upload One Backpack Image For This Color.');
      }
      setProductColorCtx(null);
      await load();
    } catch (error) {
      notify(getApiError(error, 'Unable to save Product Color.'), 'error');
    } finally {
      setSaving(false);
    }
  };

  const removeProductColor = async (productColorId) => {
    if (!canWrite) { notify(writeBlockedMessage, 'warning'); return; }
    try {
      setSaving(true);
      await deleteBomProductColor(bomId, productColorId);
      notify('Product Color Deleted.');
      await load();
    } catch (error) {
      notify(getApiError(error, 'Unable to delete Product Color.'), 'error');
    } finally {
      setSaving(false);
    }
  };

  const savePacking = async (payload) => {
    if (!canWrite) { notify(writeBlockedMessage, 'warning'); return; }
    try {
      setSaving(true);
      if (packingCtx?.record?.id) {
        await updatePacking(bomId, packingCtx.record.id, payload);
      } else {
        await addPacking(bomId, payload);
      }
      setPackingCtx(null);
      notify('Packing Saved.');
      await load();
    } catch (error) {
      notify(getApiError(error, 'Unable to save packing.'), 'error');
    } finally {
      setSaving(false);
    }
  };

  const removePacking = async (packingId) => {
    if (!canWrite) { notify(writeBlockedMessage, 'warning'); return; }
    try {
      await deletePacking(bomId, packingId);
      notify('Packing Deleted.');
      await load();
    } catch (error) {
      notify(getApiError(error, 'Unable to delete packing.'), 'error');
    }
  };

  const uploadExcel = async (event) => {
    if (!canWrite) { notify(writeBlockedMessage, 'warning'); return; }
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    try {
      setSaving(true);
      await replaceBomExcel(bomId, file);
      notify('BOM Excel Replaced. Product Color Items, Materials, And Packings Were Re-Imported.');
      await load();
    } catch (error) {
      notify(getApiError(error, 'Unable to replace BOM Excel.'), 'error');
    } finally {
      setSaving(false);
    }
  };

  const uploadAttachment = async (event, target = null) => {
    if (!canWrite) { notify(writeBlockedMessage, 'warning'); return; }
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    const options = target || {
      scope: attachmentScope,
      lineId: attachmentScope === 'LINE' ? attachmentLineId : ''
    };

    if (options.scope === 'LINE' && !options.lineId) {
      notify('Select A Material Line Before Uploading.', 'error');
      return;
    }

    try {
      setSaving(true);
      await uploadBomAttachment(bomId, file, options);
      notify('File Uploaded.');
      await load();
    } catch (error) {
      notify(getApiError(error, 'Unable to upload file.'), 'error');
    } finally {
      setSaving(false);
    }
  };

  const deleteAttachment = async (attachmentId) => {
    if (!canWrite) { notify(writeBlockedMessage, 'warning'); return; }
    try {
      await deleteBomAttachment(bomId, attachmentId);
      notify('Attachment Deleted.');
      await load();
    } catch (error) {
      notify(getApiError(error, 'Unable to delete attachment.'), 'error');
    }
  };

  const openAttachment = async (attachment) => {
    try {
      await openBomAttachment(bomId, attachment.id);
    } catch (error) {
      notify(getApiError(error, 'Unable to open attachment.'), 'error');
    }
  };

  const downloadAttachment = async (attachment) => {
    try {
      await downloadBomAttachment(
        bomId,
        attachment.id,
        attachment.originalFileName || attachment.fileName || 'attachment'
      );
    } catch (error) {
      notify(getApiError(error, 'Unable to download attachment.'), 'error');
    }
  };

  const exportOriginalFormat = async () => {
    try {
      await downloadWithAuth(getBomExportUrl(bomId), `${bom.bomNo || 'BOM'}.xlsx`);
    } catch (error) {
      notify(getApiError(error, 'Unable to export BOM.'), 'error');
    }
  };

  const applyMprReview = async (reviewId, comment) => {
    if (!canWrite) { notify(writeBlockedMessage, 'warning'); return; }
    try {
      setReviewSavingId(reviewId);
      await applyBomMprReview(bomId, reviewId, { comment });
      notify('Sales MPR change was applied to the selected BOM line.');
      await load();
    } catch (error) {
      notify(getApiError(error, 'Unable to apply the MPR change to BOM.'), 'error');
    } finally {
      setReviewSavingId('');
    }
  };

  const recheckMprReview = async (reviewId, comment) => {
    if (!canWrite) { notify(writeBlockedMessage, 'warning'); return; }
    try {
      setReviewSavingId(reviewId);
      await recheckBomMprReview(bomId, reviewId, { comment });
      notify('The item was returned to Sales for recheck.');
      await load();
    } catch (error) {
      notify(getApiError(error, 'Unable to return the MPR change to Sales.'), 'error');
    } finally {
      setReviewSavingId('');
    }
  };

  if (loading || !bom) {
    return <Box sx={{ p: 4, textAlign: 'center' }}><Typography>Loading BOM...</Typography></Box>;
  }

  return (
    <Box sx={{ p: { xs: 1.5, md: 2.5 } }}>
      <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" spacing={1.5} sx={{ mb: 2 }}>
        <Box>
          <Button component={RouterLink} to={`/orders/${orderId}`} sx={{ px: 0, textTransform: 'none' }}>← Back To Order</Button>
          <Typography sx={{ fontSize: '1.45rem', fontWeight: 950, color: '#103B5C' }}>{bom.bomNo} — {bom.bomName}</Typography>
          <Stack direction="row" spacing={0.75} flexWrap="wrap" sx={{ mt: 0.75 }}>
            <Chip label={bom.status} />
            <Chip label={`${productColors.length} Product Colors`} variant="outlined" />
            <Chip label={`${(bom.packings || []).length} Packings`} variant="outlined" />
            {bom.sourceFileName && <Chip label={`Template: ${bom.sourceFileName}`} variant="outlined" />}
          </Stack>
        </Box>

        <Stack
          direction="row"
          flexWrap="wrap"
          justifyContent={{ xs: 'flex-start', md: 'flex-end' }}
          alignItems="center"
          gap={1}
          sx={{ '& .MuiButton-root': compactActionButtonSx }}
        >
          <Button size="small" variant="outlined" startIcon={<FileDownload />} onClick={exportOriginalFormat}>
            Export Original Format
          </Button>
          <Tooltip title={!canWrite ? writeBlockedMessage : 'Review Sales MPR changes'}><span><Button
            size="small"
            variant={pendingMprReviewCount ? 'contained' : 'outlined'}
            onClick={() => setReviewOpen(true)}
            disabled={!canWrite || saving || Boolean(reviewSavingId)}
            sx={pendingMprReviewCount ? { backgroundColor: '#B45309' } : undefined}
          >
            Review MPR Changes{pendingMprReviewCount ? ` (${pendingMprReviewCount})` : ''}
          </Button></span></Tooltip>
          <Tooltip title={!canWrite ? writeBlockedMessage : 'Replace BOM Excel'}><span><Button size="small" variant="outlined" startIcon={<FileUpload />} onClick={() => fileRef.current?.click()} disabled={saving || !canWrite}>
            Replace BOM Excel
          </Button></span></Tooltip>
          <input ref={fileRef} type="file" accept=".xls,.xlsx" hidden onChange={uploadExcel} />
          <Tooltip title={!canWrite ? writeBlockedMessage : 'Edit Header'}><span><Button size="small" variant="contained" startIcon={<Save />} onClick={() => setHeaderOpen(true)} disabled={!canWrite} sx={{ backgroundColor: '#103B5C' }}>
            Edit Header
          </Button></span></Tooltip>
        </Stack>
      </Stack>

      <Paper elevation={0} sx={{ p: 2, border: '1px solid #e5e7eb', borderRadius: 2, mb: 2, backgroundColor: '#f8fafc' }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', sm: 'center' }} spacing={0.75} sx={{ mb: 1.25 }}>
          <Box>
            <Typography sx={{ fontWeight: 900, color: '#103B5C' }}>BOM Header</Typography>
            <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>Hiển thị đầy đủ các thông tin header được import từ vùng THE BOM DETAILS trong file Excel.</Typography>
          </Box>
          <Chip size="small" variant="outlined" label="THE BOM DETAILS" sx={{ fontWeight: 800, backgroundColor: '#fff' }} />
        </Stack>

        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(4, minmax(0, 1fr))' }, gap: 1 }}>
          {headerDisplayFields.map((field) => (
            <HeaderInfoCell key={field.key} label={field.label} value={bom.header?.[field.key]} />
          ))}
          <HeaderInfoCell label="Comments" value={bom.header?.comments} wide />
        </Box>
      </Paper>

      <Paper elevation={0} sx={{ p: 1.5, border: '1px solid #e5e7eb', borderRadius: 2, mb: 2 }}>
        <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" spacing={0.75} sx={{ mb: 1.1 }}>
          <Box>
            <Typography sx={{ fontWeight: 900, color: '#103B5C' }}>BOM Material Search & Filter</Typography>
            <Typography sx={{ fontSize: '.75rem', color: 'text.secondary' }}>
              Search material type, SAP code, description, position, product color, child color, or BOM remark. Filters apply to Core and Packing lines.
            </Typography>
          </Box>
          <Typography sx={{ fontSize: '.78rem', color: 'text.secondary', fontWeight: 700 }}>
            Showing {matchedBomLineCount} / {totalBomLineCount} line(s)
          </Typography>
        </Stack>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', gap: 1 }}>
          <TextField
            size="small"
            label="Keyword"
            value={lineFilters.keyword}
            onChange={(event) => setLineFilters((current) => ({ ...current, keyword: event.target.value }))}
            placeholder="SAP Code, description, child color..."
            sx={{ minWidth: { xs: '100%', md: 285 }, flex: 1 }}
          />
          <TextField
            size="small"
            select
            label="Product Color"
            value={lineFilters.productColorId}
            onChange={(event) => setLineFilters((current) => ({ ...current, productColorId: event.target.value }))}
            sx={{ minWidth: 200 }}
          >
            <MenuItem value="">All Product Colors</MenuItem>
            {productColors.map((productColor) => <MenuItem key={productColor.id} value={productColor.id}>{productColorLabel(productColor)}</MenuItem>)}
          </TextField>
          <TextField
            size="small"
            select
            label="Material Type"
            value={lineFilters.materialType}
            onChange={(event) => setLineFilters((current) => ({ ...current, materialType: event.target.value }))}
            sx={{ minWidth: 180 }}
          >
            <MenuItem value="">All Material Types</MenuItem>
            {materialTypeOptions.map((option) => <MenuItem key={option.key} value={option.key}>{option.label}</MenuItem>)}
          </TextField>
          <TextField
            size="small"
            select
            label="Source"
            value={lineFilters.source}
            onChange={(event) => setLineFilters((current) => ({ ...current, source: event.target.value }))}
            sx={{ minWidth: 200 }}
          >
            <MenuItem value="">Core + All Packings</MenuItem>
            <MenuItem value="__CORE__">Core BOM (No Packing)</MenuItem>
            {(bom.packings || []).map((packing) => <MenuItem key={packing.id} value={packing.id}>{packing.packingName || 'Packing'}</MenuItem>)}
          </TextField>
          <Button
            variant="outlined"
            startIcon={<RestartAlt />}
            onClick={() => setLineFilters(emptyLineFilters)}
            sx={{ textTransform: 'none' }}
          >
            Reset
          </Button>
        </Box>
      </Paper>

      <Paper elevation={0} sx={{ border: '1px solid #e5e7eb', borderRadius: 2, overflow: 'hidden', mb: 2 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ p: 1.5, borderBottom: '1px solid #e5e7eb' }}>
          <Box>
            <Typography sx={{ fontWeight: 900, color: '#103B5C' }}>Core Materials ({lineFilters.source && lineFilters.source !== '__CORE__' ? 0 : filteredCoreLines.length} / {(bom.coreLines || []).length})</Typography>
            <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>Columns A–Q and all product color values are retained from the original BOM Excel.</Typography>
          </Box>
          <Tooltip title={!canWrite ? writeBlockedMessage : 'Add Material'}><span><Button startIcon={<Add />} variant="contained" size="small" disabled={!canWrite} onClick={() => setLineCtx({ record: null, packingId: '' })} sx={{ textTransform: 'none', backgroundColor: '#103B5C' }}>
            Add Material
          </Button></span></Tooltip>
        </Stack>
        <LineTable
          rows={lineFilters.source && lineFilters.source !== '__CORE__' ? [] : filteredCoreLines}
          productColors={productColors}
          emptyText="No Core BOM lines match the current filter."
          onEdit={(record) => setLineCtx({ record, packingId: '' })}
          onDelete={removeLine}
          onAttach={(record) => setAttachmentLineId(record.id) || setAttachmentScope('LINE')}
          actionsDisabled={!canWrite}
        />
      </Paper>

      <Paper elevation={0} sx={{ p: 1.5, border: '1px solid #e5e7eb', borderRadius: 2, mb: 2 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1}>
          <Box>
            <Typography sx={{ fontWeight: 900, color: '#103B5C' }}>Packings</Typography>
            <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>Each Packing links to Product Color items and stores its own material lines. Packing-file upload is not used.</Typography>
          </Box>
          <Tooltip title={!canWrite ? writeBlockedMessage : 'Add Packing'}><span><Button startIcon={<Add />} variant="contained" size="small" disabled={!canWrite} onClick={() => setPackingCtx({ record: null })} sx={{ textTransform: 'none', backgroundColor: '#103B5C' }}>
            Add Packing
          </Button></span></Tooltip>
        </Stack>
      </Paper>

      {(bom.packings || [])
        .filter((packing) => !lineFilters.source || lineFilters.source === packing.id)
        .map((packing) => {
        const linkedProductColorIds = productColorIdsForPacking(packing, productColors);
        const linkedProductColors = linkedProductColorIds
          .map((id) => productColors.find((item) => item.id === id))
          .filter(Boolean);
        const filteredPackingLines = (packing.lines || []).filter((line) => lineMatchesFilters(line, lineFilters, productColors));

        return (
          <Accordion key={packing.id} defaultExpanded>
            <AccordionSummary component="div" expandIcon={<ExpandMore />}>
              <Stack direction="row" spacing={1} alignItems="center" sx={{ width: 1, pr: 1 }}>
                <Typography sx={{ fontWeight: 900 }}>{packing.packingName}</Typography>
                <Chip size="small" label={`${filteredPackingLines.length} / ${(packing.lines || []).length} Lines`} />
                <Chip size="small" label={linkedProductColors.length ? `${linkedProductColors.length} Product Colors` : 'All Product Colors'} variant="outlined" />
                <Box sx={{ flex: 1 }} />
                <Tooltip title={!canWrite ? writeBlockedMessage : 'Edit Packing'}><span><IconButton size="small" disabled={!canWrite} onClick={(event) => { event.stopPropagation(); setPackingCtx({ record: packing }); }}><Edit fontSize="small" /></IconButton></span></Tooltip>
                <Tooltip title={!canWrite ? writeBlockedMessage : 'Delete Packing'}><span><IconButton color="error" size="small" disabled={!canWrite} onClick={(event) => { event.stopPropagation(); removePacking(packing.id); }}><Delete fontSize="small" /></IconButton></span></Tooltip>
              </Stack>
            </AccordionSummary>
            <AccordionDetails>
              <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'stretch', sm: 'center' }} spacing={1} sx={{ mb: 1 }}>
                <Box>
                  <Typography sx={{ fontSize: '0.8rem', color: 'text.secondary' }}>
                    Product Color information and images are linked from Product Color Master. Updating the saved master image updates every linked BOM automatically.
                  </Typography>
                  <Stack direction="row" flexWrap="wrap" gap={0.5} sx={{ mt: 0.75 }}>
                    {linkedProductColors.length
                      ? linkedProductColors.map((item) => <Chip key={item.id} size="small" label={productColorLabel(item)} />)
                      : <Chip size="small" variant="outlined" label="Applies To All Product Colors" />}
                  </Stack>
                </Box>
                <Tooltip title={!canWrite ? writeBlockedMessage : 'Add Packing Line'}><span><Button size="small" startIcon={<Add />} disabled={!canWrite} onClick={() => setLineCtx({ record: null, packingId: packing.id })} sx={{ textTransform: 'none', whiteSpace: 'nowrap' }}>
                  Add Packing Line
                </Button></span></Tooltip>
              </Stack>

              {(packing.attachments || []).length > 0 && (
                <Box sx={{ mb: 1.25 }}>
                  <Typography sx={{ fontSize: '0.73rem', color: 'text.secondary' }}>Imported Packing Files</Typography>
                  <AttachmentCards attachments={packing.attachments || []} bomId={bomId} onDelete={deleteAttachment} onOpen={openAttachment} onDownload={downloadAttachment} actionsDisabled={!canWrite} emptyText="" />
                </Box>
              )}
              <Box sx={{ mt: 1.5 }}>
                <LineTable
                  rows={filteredPackingLines}
                  productColors={productColors}
                  emptyText="No Packing lines match the current filter."
                  onEdit={(record) => setLineCtx({ record, packingId: packing.id })}
                  onDelete={removeLine}
                  onAttach={(record) => setAttachmentLineId(record.id) || setAttachmentScope('LINE')}
                  actionsDisabled={!canWrite}
                />
              </Box>
            </AccordionDetails>
          </Accordion>
        );
      })}

      <Paper elevation={0} sx={{ p: 2, border: '1px solid #e5e7eb', borderRadius: 2, mt: 2 }}>
        <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" spacing={1.5}>
          <Box>
            <Typography sx={{ fontWeight: 900, color: '#103B5C' }}>BOM Files And Product Color Images</Typography>
            <Typography sx={{ fontSize: '0.78rem', color: 'text.secondary' }}>
              Upload whole-BOM or material-line files here. Product Color images are stored and managed in Product Color Master, then automatically shown in this BOM through the Product Color link.
            </Typography>
          </Box>

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
            <TextField size="small" select label="Attach To" disabled={!canWrite} value={attachmentScope} onChange={(event) => setAttachmentScope(event.target.value)} sx={{ minWidth: 150 }}>
              <MenuItem value="BOM">Whole BOM</MenuItem>
              <MenuItem value="LINE">Material Line</MenuItem>
            </TextField>

            {attachmentScope === 'LINE' && (
              <TextField size="small" select label="Material Line" disabled={!canWrite} value={attachmentLineId} onChange={(event) => setAttachmentLineId(event.target.value)} sx={{ minWidth: 180 }}>
                {[...(bom.coreLines || []), ...(bom.packings || []).flatMap((packing) => packing.lines || [])].map((line) => (
                  <MenuItem key={line.id} value={line.id}>{[line.materialType, line.positionDescription || line.position, line.detailNo].filter(Boolean).join(' — ') || line.id}</MenuItem>
                ))}
              </TextField>
            )}

            <Tooltip title={!canWrite ? writeBlockedMessage : 'Upload file'}><span><Button variant="outlined" startIcon={<Image />} component="label" disabled={!canWrite} sx={{ textTransform: 'none' }}>
              Upload
              <input hidden type="file" accept="image/*,.pdf,.xlsx,.xls,.doc,.docx" onChange={uploadAttachment} />
            </Button></span></Tooltip>
          </Stack>
        </Stack>

        <Divider sx={{ my: 1.75 }} />

        <Typography sx={{ fontWeight: 800, fontSize: '0.85rem' }}>Whole BOM Files</Typography>
        <AttachmentCards attachments={bomAttachments} bomId={bomId} onDelete={deleteAttachment} onOpen={openAttachment} onDownload={downloadAttachment} actionsDisabled={!canWrite} emptyText="No BOM-level images/files." />

        <Box sx={{ mt: 2 }}>
          <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', sm: 'center' }} spacing={1}>
            <Box>
              <Typography sx={{ fontWeight: 800, fontSize: '0.85rem' }}>Linked Product Colors</Typography>
              <Typography sx={{ mt: 0.25, fontSize: '0.76rem', color: 'text.secondary' }}>
                Each BOM Product Color must link to Product Color Master. The master owns the product image and Child Colors; this BOM never stores a duplicate image.
              </Typography>
            </Box>
            <Tooltip title={!canWrite ? writeBlockedMessage : 'Link Product Color Master'}><span><Button size="small" variant="contained" startIcon={<Add />} disabled={!canWrite} onClick={() => setProductColorCtx({ record: null })} sx={{ textTransform: 'none', backgroundColor: '#103B5C' }}>
              Link Product Color
            </Button></span></Tooltip>
          </Stack>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, minmax(0, 1fr))' }, gap: 1.25, mt: 1 }}>
            {productColors.map((productColor) => {
              const master = productColorMasterForBom(productColor, productColorMasters);
              return (
                <Paper key={productColor.id} elevation={0} sx={{ p: 1.2, border: '1px solid #e5e7eb', borderRadius: 1.5 }}>
                  <Stack direction="row" justifyContent="space-between" spacing={1} alignItems="flex-start">
                    <Box>
                      <Typography sx={{ fontWeight: 900, fontSize: '0.8rem' }}>{productColor.colorName}</Typography>
                      <Typography sx={{ fontSize: '0.72rem', color: 'text.secondary' }}>Pattern Number: {productColor.patternNumber || '—'}</Typography>
                      <Typography sx={{ fontSize: '0.72rem', color: 'text.secondary' }}>Season: {productColor.season || '—'}</Typography>
                    </Box>
                    <Stack spacing={0.25} alignItems="flex-end">
                      <Tooltip title={!canWrite ? writeBlockedMessage : 'Change Product Color Master link'}><span><Button size="small" startIcon={<Edit />} disabled={!canWrite} onClick={() => setProductColorCtx({ record: productColor })} sx={{ textTransform: 'none', whiteSpace: 'nowrap' }}>
                        Change Link
                      </Button></span></Tooltip>
                      <Tooltip title={!canWrite ? writeBlockedMessage : 'Delete BOM Product Color link'}><span><Button size="small" color="error" startIcon={<Delete />} disabled={!canWrite} onClick={() => removeProductColor(productColor.id)} sx={{ textTransform: 'none', whiteSpace: 'nowrap' }}>
                        Delete Link
                      </Button></span></Tooltip>
                    </Stack>
                  </Stack>
                  <Box sx={{ mt: 1 }}>
                    <ProductColorImage productColor={master || productColor} height={125} emptyText={master ? 'No image saved in Product Color Master' : 'Product Color Master link is required'} />
                  </Box>
                  <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1} sx={{ mt: 0.75 }}>
                    <Typography noWrap sx={{ minWidth: 0, flex: 1, fontSize: '0.7rem', color: master ? 'text.secondary' : 'warning.main' }}>
                      {master ? `Master: ${master.productColor || productColor.colorName}` : 'No linked Product Color Master'}
                    </Typography>
                    <Button component={RouterLink} to="/product-colors" size="small" sx={{ textTransform: 'none', whiteSpace: 'nowrap' }}>
                      Open Master
                    </Button>
                  </Stack>
                </Paper>
              );
            })}
          </Box>
        </Box>
      </Paper>

      <Dialog open={canWrite && headerOpen} onClose={saving ? undefined : () => setHeaderOpen(false)} fullWidth maxWidth="md">
        <DialogTitle sx={{ pr: 6, fontWeight: 900, color: '#103B5C' }}>
          Edit BOM Header
          <IconButton onClick={() => setHeaderOpen(false)} disabled={saving} sx={{ position: 'absolute', right: 14, top: 14 }}>×</IconButton>
        </DialogTitle>
        <DialogContent dividers>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' }, gap: 1.5 }}>
            {['buyer', 'revStage', 'season', 'styleNumber', 'styleName', 'factoryProduct', 'patternNumber', 'patternMaker', 'bomMaker', 'size', 'bomDate', 'patternDate', 'patternRevisedDate', 'comments'].map((key) => (
              <TextField
                key={key}
                label={key.replace(/([A-Z])/g, ' $1').replace(/^./, (value) => value.toUpperCase())}
                value={headerForm[key] || ''}
                onChange={(event) => setHeaderForm((current) => ({ ...current, [key]: event.target.value }))}
                multiline={key === 'comments'}
                minRows={key === 'comments' ? 2 : 1}
              />
            ))}
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setHeaderOpen(false)} disabled={saving} sx={{ textTransform: 'none' }}>Cancel</Button>
          <Button variant="contained" onClick={saveHeader} disabled={saving} sx={{ textTransform: 'none', fontWeight: 800, backgroundColor: '#103B5C' }}>
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogActions>
      </Dialog>

      <LineDialog open={canWrite && Boolean(lineCtx)} record={lineCtx?.record} productColors={productColors} productColorMasters={productColorMasters} saving={saving} onClose={() => setLineCtx(null)} onSave={saveLine} />
      <PackingDialog open={canWrite && Boolean(packingCtx)} record={packingCtx?.record} productColors={productColors} saving={saving} onClose={() => setPackingCtx(null)} onSave={savePacking} />
      <ProductColorDialog open={canWrite && Boolean(productColorCtx)} record={productColorCtx?.record} header={bom?.header} productColorMasters={productColorMasters} saving={saving} onClose={() => setProductColorCtx(null)} onSave={saveProductColor} />

      <BomMprReviewDialog
        open={canWrite && reviewOpen}
        reviews={mprReviews}
        savingReviewId={reviewSavingId}
        actionsDisabled={!canWrite}
        onClose={() => setReviewOpen(false)}
        onApply={applyMprReview}
        onRecheck={recheckMprReview}
      />

      <Snackbar open={notice.open} autoHideDuration={3500} onClose={() => setNotice((current) => ({ ...current, open: false }))}>
        <Alert severity={notice.severity} variant="filled">{notice.message}</Alert>
      </Snackbar>
    </Box>
  );
}
