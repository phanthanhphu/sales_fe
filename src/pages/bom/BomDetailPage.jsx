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
  Close,
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
  deleteBomLineImage,
  deleteBomProductColor,
  deletePacking,
  downloadBomAttachment,
  downloadWithAuth,
  getApiError,
  getBomAttachmentObjectUrl,
  getBomLineImageObjectUrl,
  getBom,
  listBomLines,
  listBomMprReviews,
  openBomAttachment,
  getBomExportUrl,
  recheckBomMprReview,
  replaceBomExcel,
  updateBom,
  updateBomLine,
  updateBomProductColor,
  updatePacking,
  uploadBomAttachment,
  uploadBomLineImage
} from '../../services/orderBomMprService';
import { listMasterData } from '../../services/masterDataService';
import ProductColorImage from '../../components/ProductColorImage';
import { canManageBom } from 'utils/accessControl';
import { buyerPath, normalizeBuyerKey } from 'utils/buyerContext';
import BomMprReviewDialog from './BomMprReviewDialog';
import ConfirmDeleteDialog from '../shared/ConfirmDeleteDialog';
import ExcelUploadProgressDialog from '../../components/ExcelUploadProgressDialog';
import { initialUploadProgress, startProcessingTicker, uploadProgressFromEvent, uploadStage } from '../../utils/uploadProgress';

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
  detailConsumption: '',
  consumptionNet: '',
  consumptionUnit: '',
  bomRemark: '',
  additionalRemark: '',
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
  fontWeight: 400,
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
  { key: 'markerDate', label: 'Marker Date' },
  { key: 'markerMaker', label: 'Marker Maker' },
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
    season: safeBom.header?.season || '',
    styleNumber: safeBom.header?.styleNumber || '',
    sequence: null
  }));
};

const productColorLabel = (productColor = {}) => {
  const safeProductColor = productColor || {};
  return [
    safeProductColor.sequence ? `#${safeProductColor.sequence}` : '',
    safeProductColor.colorName,
    safeProductColor.patternNumber,
    safeProductColor.season,
    safeProductColor.styleNumber
  ].filter(Boolean).join(' · ');
};

const productColorIdentityMatches = (master = {}, productColor = {}) => (
  normalized(master?.patternNumber) === normalized(productColor?.patternNumber)
  && normalized(master?.productColor) === normalized(productColor?.colorName)
  && normalized(master?.season) === normalized(productColor?.season)
  && normalized(master?.styleNumber) === normalized(productColor?.styleNumber)
);

const productColorMasterLabel = (master = {}) => [
  master?.patternNumber,
  master?.productColor,
  master?.season,
  master?.styleNumber
].map((value) => String(value || '').trim()).filter(Boolean).join(' · ');

const productColorMasterForBom = (productColor = {}, productColorMasters = []) => {
  const safeProductColor = productColor || {};
  const safeMasters = Array.isArray(productColorMasters) ? productColorMasters : [];
  const linked = safeMasters.find((item) => item?.id === safeProductColor?.productColorMasterId);

  if (linked && productColorIdentityMatches(linked, safeProductColor)) return linked;
  return safeMasters.find((item) => productColorIdentityMatches(item, safeProductColor)) || null;
};

const childColorsForProductColor = (productColorId, productColors = [], productColorMasters = []) => {
  const safeProductColors = Array.isArray(productColors) ? productColors : [];
  const safeMasters = Array.isArray(productColorMasters) ? productColorMasters : [];
  const productColor = safeProductColors.find((item) => item?.id === productColorId);
  const master = productColorMasterForBom(productColor || {}, safeMasters);
  const unique = new Map();
  (master?.childColors || []).forEach((item) => {
    const id = String(item?.id || '').trim();
    const childColor = String(item?.childColor || '').trim();
    if (id && childColor) unique.set(id, { id, childColor });
  });
  return Array.from(unique.values());
};

const productColorIdsForPacking = (packing = {}, productColors = []) => {
  const safePacking = packing || {};
  const safeProductColors = Array.isArray(productColors) ? productColors : [];

  const linkedIds = Array.isArray(safePacking.applicableProductColorIds)
    ? safePacking.applicableProductColorIds.filter(Boolean)
    : [];

  if (linkedIds.length) return linkedIds;

  return (safePacking.applicableColors || [])
    .map((colorName) => safeProductColors.find((item) => normalized(item?.colorName) === normalized(colorName))?.id)
    .filter(Boolean);
};

const productColorNamesForLine = (line = {}, productColors = []) => {
  const safeLine = line || {};
  const safeProductColors = Array.isArray(productColors) ? productColors : [];
  const ids = (safeLine.productColorValues || []).map((item) => item?.productColorId).filter(Boolean);
  if (ids.length) {
    return ids
      .map((id) => safeProductColors.find((item) => item?.id === id)?.colorName)
      .filter(Boolean);
  }
  return Object.keys(safeLine.colorValues || {});
};

const cssAttributeEscape = (value) => (
  typeof CSS !== 'undefined' && typeof CSS.escape === 'function'
    ? CSS.escape(String(value || ''))
    : String(value || '').replace(/["\\]/g, '\\$&')
);

const createdIdFromResponse = (response, keys = []) => {
  const candidates = [
    response,
    response?.data,
    response?.item,
    response?.result,
    response?.record,
    response?.line,
    response?.packing,
    response?.productColor
  ].filter((item) => item && typeof item === 'object');

  for (const item of candidates) {
    for (const key of [...keys, 'id']) {
      if (item?.[key]) return String(item[key]);
    }
  }

  return '';
};

const lastOf = (items = []) => items[items.length - 1];
const valuesEqual = (left, right) => normalized(left) === normalized(right);

const resolveCreatedPackingId = (created, nextBom, payload = {}) => {
  const directId = createdIdFromResponse(created, ['packingId']);
  if (directId) return directId;
  const packings = nextBom?.packings || [];
  const matches = packings.filter((packing) => (
    valuesEqual(packing?.packingName, payload.packingName)
    && (payload.sequence === null || payload.sequence === undefined || payload.sequence === '' || Number(packing?.sequence) === Number(payload.sequence))
  ));
  return String((lastOf(matches) || lastOf(packings) || {})?.id || '');
};

const resolveCreatedProductColorId = (created, nextBom, payload = {}) => {
  const directId = createdIdFromResponse(created, ['productColorId']);
  if (directId) return directId;
  const productColors = productColorsForBom(nextBom);
  const matches = productColors.filter((productColor) => (
    valuesEqual(productColor?.colorName, payload.colorName)
    && valuesEqual(productColor?.patternNumber, payload.patternNumber)
    && valuesEqual(productColor?.season, payload.season)
    && (payload.styleNumber ? valuesEqual(productColor?.styleNumber, payload.styleNumber) : true)
    && (payload.sequence === null || payload.sequence === undefined || payload.sequence === '' || Number(productColor?.sequence) === Number(payload.sequence))
  ));
  return String((lastOf(matches) || lastOf(productColors) || {})?.id || '');
};

const resolveCreatedLineId = (created, nextBom, payload = {}, packingId = '') => {
  const directId = createdIdFromResponse(created, ['lineId', 'bomLineId']);
  if (directId) return directId;
  const lines = packingId
    ? (nextBom?.packings || []).find((packing) => String(packing?.id || '') === String(packingId))?.lines || []
    : nextBom?.coreLines || [];
  const matches = lines.filter((line) => (
    (payload.materialType ? valuesEqual(line?.materialType, payload.materialType) : true)
    && (payload.sapCode ? valuesEqual(line?.sapCode, payload.sapCode) : true)
    && (payload.detailNo ? valuesEqual(line?.detailNo, payload.detailNo) : true)
    && (payload.position ? valuesEqual(line?.position, payload.position) : true)
    && (payload.positionDescription ? valuesEqual(line?.positionDescription, payload.positionDescription) : true)
    && (payload.bomRemark ? valuesEqual(line?.bomRemark, payload.bomRemark) : true)
  ));
  return String((lastOf(matches) || lastOf(lines) || {})?.id || '');
};

const emptyLineFilters = {
  keyword: '',
  productColorId: '',
  materialType: '',
  source: ''
};

const lineMatchesFilters = (line = {}, filters = emptyLineFilters, productColors = []) => {
  const safeLine = line || {};
  const safeFilters = filters || emptyLineFilters;
  const safeProductColors = Array.isArray(productColors) ? productColors : [];
  const keyword = String(safeFilters.keyword || '').trim();
  const selectedProductColorId = String(safeFilters.productColorId || '').trim();
  const selectedMaterialType = normalized(safeFilters.materialType);
  const lineProductColors = productColorNamesForLine(safeLine, safeProductColors);
  const childColors = [
    ...(safeLine.productColorValues || []).map((item) => item?.value),
    ...Object.values(safeLine.colorValues || {})
  ].filter(Boolean);

  if (keyword) {
    const searchable = [
      safeLine.materialGroupNo,
      safeLine.materialType,
      safeLine.sapCode,
      safeLine.detailNo,
      safeLine.position,
      safeLine.positionDescription,
      safeLine.positionDescriptionExtra,
      safeLine.pieceCode,
      safeLine.dimensionX,
      safeLine.dimensionY,
      safeLine.quantity,
      safeLine.direction,
      safeLine.costing,
      safeLine.costingUnit,
      safeLine.detailConsumption,
      safeLine.consumptionNet,
      safeLine.consumptionUnit,
      safeLine.bomRemark,
      safeLine.additionalRemark,
      ...lineProductColors,
      ...childColors
    ];
    if (!searchable.some((value) => normalized(value).includes(normalized(keyword)))) return false;
  }

  if (selectedMaterialType && normalized(safeLine.materialType) !== selectedMaterialType) return false;

  if (selectedProductColorId) {
    const selected = safeProductColors.find((item) => String(item?.id || '') === selectedProductColorId);
    const linkedIds = (safeLine.productColorValues || []).map((item) => String(item?.productColorId || '')).filter(Boolean);
    const matchedById = linkedIds.includes(selectedProductColorId);
    const matchedByName = selected && lineProductColors.some((name) => normalized(name) === normalized(selected.colorName));
    if (!matchedById && !matchedByName) return false;
  }

  return true;
};

const isImageAttachment = (attachment = {}) => {
  const safeAttachment = attachment || {};
  const contentType = String(safeAttachment.contentType || '').toLowerCase();
  const name = String(safeAttachment.originalFileName || '').toLowerCase();
  return contentType.startsWith('image/') || /\.(png|jpe?g|gif|webp|bmp)$/i.test(name);
};

const attachmentLabel = (attachment = {}) => {
  const safeAttachment = attachment || {};
  const name = safeAttachment.originalFileName || 'Attachment';
  return safeAttachment.importedFromExcel ? `${name} · Imported From Excel` : name;
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
    detailConsumption: line?.detailConsumption ?? '',
    consumptionNet: line?.consumptionNet ?? '',
    additionalRemark: line?.additionalRemark ?? '',
    productColorValues: linkedValues
  };
};

const formToLine = (form = {}) => ({
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
  detailConsumption: asNumber(form.detailConsumption),
  consumptionNet: asNumber(form.consumptionNet),
  consumptionUnit: String(form.consumptionUnit || '').trim(),
  bomRemark: String(form.bomRemark || '').trim(),
  additionalRemark: String(form.additionalRemark || '').trim(),
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
          Supports both the legacy BOM format and the new A:Y format. Consumption MPR is stored separately from the new detail CONS. value.
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

          <TextField label="Legacy Costing / MK" type="number" value={form.costing} onChange={set('costing')} sx={fieldSx} />
          <TextField label="Legacy Costing / Unit" value={form.costingUnit} onChange={set('costingUnit')} sx={fieldSx} />
          <TextField label="Detail CONS. (New Format)" type="number" value={form.detailConsumption} onChange={set('detailConsumption')} sx={fieldSx} />
          <TextField label="Consumption MPR" type="number" value={form.consumptionNet} onChange={set('consumptionNet')} sx={fieldSx} />
          <TextField label="Consumption Unit" value={form.consumptionUnit} onChange={set('consumptionUnit')} sx={fieldSx} />

          <FormControlLabel
            control={<Checkbox checked={Boolean(form.detailLine)} onChange={set('detailLine')} />}
            label="Detail Line"
            sx={{ gridColumn: { xs: '1', sm: 'span 2' }, alignSelf: 'center' }}
          />

          <TextField
            label="Remarks On BOM"
            value={form.bomRemark}
            onChange={set('bomRemark')}
            multiline
            minRows={2}
            sx={{ gridColumn: { xs: '1', sm: 'span 2' } }}
          />
          <TextField
            label="Additional Remarks (New Format)"
            value={form.additionalRemark}
            onChange={set('additionalRemark')}
            multiline
            minRows={2}
            sx={{ gridColumn: { xs: '1', sm: 'span 2' } }}
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
              <Alert severity="info" sx={{ py: 0.25 }}>Replace the BOM Excel first to load its Product Color items.</Alert>
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
    setApplicableProductColorIds(record ? productColorIdsForPacking(record, productColors) : []);
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

function ProductColorDialog({ open, record, header = {}, productColorMasters = [], buyerKey, saving, onClose, onSave }) {
  const [form, setForm] = useState({ productColorMasterId: '', colorName: '', patternNumber: '', season: '', styleNumber: '', sequence: '' });

  useEffect(() => {
    const matchedMaster = productColorMasterForBom(record || {}, productColorMasters);
    setForm({
      productColorMasterId: matchedMaster?.id || '',
      colorName: record?.colorName || matchedMaster?.productColor || '',
      patternNumber: matchedMaster?.patternNumber || record?.patternNumber || header?.patternNumber || '',
      season: matchedMaster?.season || record?.season || header?.season || '',
      styleNumber: matchedMaster?.styleNumber || record?.styleNumber || header?.styleNumber || '',
      sequence: record?.sequence ?? ''
    });
  }, [open, record, header, productColorMasters]);

  const chooseMaster = (event) => {
    const productColorMasterId = event.target.value;
    const master = productColorMasters.find((item) => item.id === productColorMasterId);
    setForm((current) => ({
      ...current,
      productColorMasterId,
      colorName: master?.productColor || '',
      patternNumber: master?.patternNumber || '',
      season: master?.season || '',
      styleNumber: master?.styleNumber || '',
      sequence: current.sequence
    }));
  };
  const canSave = Boolean(form.productColorMasterId)
    && form.colorName.trim()
    && form.patternNumber.trim()
    && form.season.trim()
    && form.styleNumber.trim();

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
                {productColorMasterLabel(item) || item.productColor}
              </MenuItem>
            ))}
          </TextField>
          <TextField required label="Product / Style Color" value={form.colorName} placeholder="BLACK" disabled />
          <TextField required label="Pattern Number" value={form.patternNumber} disabled />
          <TextField required label="Season" value={form.season} disabled />
          <TextField required label="Style Number" value={form.styleNumber} disabled />
          <TextField label="Sequence" type="number" value={form.sequence} onChange={(event) => setForm((current) => ({ ...current, sequence: event.target.value }))} inputProps={{ min: 1, step: 1 }} />
          <Alert severity="info" sx={{ py: 0.25 }}>
            Pattern Number, Product / Style Color, Season and Style Number must all match the selected Product Color Master. Sequence remains specific to this BOM.
          </Alert>
          <Button component={RouterLink} to={buyerPath(buyerKey, 'product-colors')} size="small" sx={{ alignSelf: 'flex-start', textTransform: 'none' }}>
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
          season: form.season.trim(),
          styleNumber: form.styleNumber.trim(),
          sequence: asNumber(form.sequence)
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
                    <IconButton size="small" color="error" disabled={actionsDisabled} onClick={() => onDelete(attachment)}>
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
function BomLineImagePreviewDialog({ open, bomId, line, onClose }) {
  const [previewUrl, setPreviewUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    let active = true;
    let objectUrl = '';

    setPreviewUrl('');
    setLoadError(false);

    if (!open || !bomId || !line?.id || !line?.primaryImage) {
      setLoading(false);
      return undefined;
    }

    setLoading(true);
    getBomLineImageObjectUrl(
      bomId,
      line.id,
      'preview',
      line?.primaryImage?.id || line?.primaryImage?.updatedAt || ''
    )
      .then((url) => {
        objectUrl = url;
        if (!active) {
          URL.revokeObjectURL(url);
          return;
        }
        setPreviewUrl(url);
        setLoadError(false);
      })
      .catch(() => {
        if (active) setLoadError(true);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [open, bomId, line?.id, line?.primaryImage?.id, line?.primaryImage?.updatedAt]);

  const title = line?.primaryImage?.originalFileName
    || [line?.materialType, line?.detailNo, line?.sapCode].filter(Boolean).join(' - ')
    || 'BOM Material Image';

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="lg"
      PaperProps={{
        sx: {
          width: 'min(1100px, calc(100vw - 32px))',
          maxHeight: 'calc(100vh - 32px)',
          borderRadius: 2
        }
      }}
    >
      <DialogTitle sx={{ pr: 7, py: 1.5, fontWeight: 900, color: '#103B5C' }}>
        <Typography noWrap sx={{ pr: 1, fontWeight: 900, color: '#103B5C' }}>
          {title}
        </Typography>
        <IconButton
          aria-label="Close image preview"
          onClick={onClose}
          sx={{ position: 'absolute', right: 12, top: 8 }}
        >
          <Close />
        </IconButton>
      </DialogTitle>
      <DialogContent
        dividers
        sx={{
          p: { xs: 1, sm: 2 },
          minHeight: 260,
          display: 'grid',
          placeItems: 'center',
          bgcolor: '#0f172a'
        }}
      >
        {loading && (
          <Typography sx={{ color: '#fff', fontWeight: 700 }}>
            Loading image...
          </Typography>
        )}

        {!loading && loadError && (
          <Stack spacing={1} alignItems="center" sx={{ color: '#fff', textAlign: 'center' }}>
            <Image sx={{ fontSize: 54, opacity: 0.8 }} />
            <Typography sx={{ fontWeight: 800 }}>Image preview is unavailable.</Typography>
            <Typography sx={{ fontSize: '0.78rem', opacity: 0.8 }}>
              Check the image conversion service on the Backend server.
            </Typography>
          </Stack>
        )}

        {!loading && previewUrl && (
          <Box
            component="img"
            src={previewUrl}
            alt={title}
            sx={{
              display: 'block',
              maxWidth: '100%',
              maxHeight: 'calc(100vh - 150px)',
              width: 'auto',
              height: 'auto',
              objectFit: 'contain',
              mx: 'auto'
            }}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function BomLineImageCell({ bomId, line, onUpload, onDelete, onPreview, actionsDisabled = false }) {
  const [thumbnailUrl, setThumbnailUrl] = useState('');
  const [loadError, setLoadError] = useState(false);
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    let active = true;
    let objectUrl = '';
    if (!line?.primaryImage) {
      setThumbnailUrl('');
      setLoadError(false);
      return undefined;
    }

    setLoadError(false);
    getBomLineImageObjectUrl(bomId, line.id, 'thumbnail', line?.primaryImage?.id || line?.primaryImage?.updatedAt || '')
      .then((url) => {
        objectUrl = url;
        if (active) {
          setThumbnailUrl(url);
          setLoadError(false);
        } else URL.revokeObjectURL(url);
      })
      .catch(() => {
        if (active) {
          setThumbnailUrl('');
          setLoadError(true);
        }
      });

    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [bomId, line?.id, line?.primaryImage?.id, line?.primaryImage?.updatedAt, retryKey]);

  return (
    <Stack direction="row" spacing={0.5} alignItems="center" sx={{ minWidth: 118 }}>
      {thumbnailUrl ? (
        <Box
          component="img"
          loading="lazy"
          src={thumbnailUrl}
          alt={line?.primaryImage?.originalFileName || 'BOM material'}
          onClick={() => onPreview?.(line)}
          onError={() => {
            setThumbnailUrl('');
            setLoadError(true);
          }}
          sx={{ width: 54, height: 54, objectFit: 'contain', border: '1px solid #dbe3ec', borderRadius: 1, cursor: 'zoom-in', backgroundColor: '#fff' }}
        />
      ) : (
        <Tooltip title={loadError ? 'Cannot create PNG preview. Check LibreOffice / LIBREOFFICE_PATH on the Backend server.' : ''}>
          <Box sx={{ width: 54, height: 54, display: 'grid', placeItems: 'center', border: '1px dashed #cbd5e1', borderRadius: 1, color: loadError ? '#dc2626' : '#94a3b8' }}>
            <Stack spacing={0} alignItems="center">
              <Image fontSize="small" />
              {loadError && <Typography sx={{ fontSize: '0.58rem', fontWeight: 800 }}>EMF</Typography>}
            </Stack>
          </Box>
        </Tooltip>
      )}
      <Stack spacing={0.1}>
        <Tooltip title={actionsDisabled ? 'BOM permission is required to modify BOM data.' : (line?.primaryImage ? 'Replace Image' : 'Upload Image')}>
          <span>
            <IconButton component="label" size="small" disabled={actionsDisabled}>
              <FileUpload fontSize="inherit" />
              <input
                hidden
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif,image/bmp,.emf,.wmf"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  event.target.value = '';
                  if (file) onUpload?.(line, file);
                }}
              />
            </IconButton>
          </span>
        </Tooltip>
        {line?.primaryImage && loadError && (
          <Tooltip title="Retry Image Preview">
            <span><IconButton size="small" onClick={() => setRetryKey((value) => value + 1)}><RestartAlt fontSize="inherit" /></IconButton></span>
          </Tooltip>
        )}
        {line?.primaryImage && (
          <Tooltip title={actionsDisabled ? 'BOM permission is required to modify BOM data.' : 'Delete Image'}>
            <span><IconButton size="small" color="error" disabled={actionsDisabled} onClick={() => onDelete?.(line)}><Delete fontSize="inherit" /></IconButton></span>
          </Tooltip>
        )}
      </Stack>
    </Stack>
  );
}

function LineTable({ bomId, rows, productColors = [], onEdit, onDelete, onAttach, onImageUpload, onImageDelete, onImagePreview, emptyText = 'No BOM lines.', actionsDisabled = false }) {
  const columns = [
    ['No.', (line) => line.materialGroupNo],
    ['Material Type', (line) => line.materialType],
    ['Image', null],
    ['SAP Code', (line) => line.sapCode],
    ['Detail No', (line) => line.detailNo],
    ['Position', (line) => line.position],
    ['Position Description', (line) => [line.positionDescription, line.positionDescriptionExtra].filter(Boolean).join(' / ')],
    ['P', (line) => line.pieceCode],
    ['X', (line) => line.dimensionX],
    ['Y', (line) => line.dimensionY],
    ['Q.TY', (line) => line.quantity],
    ['><', (line) => line.direction],
    ['Legacy Costing / MK', (line) => line.costing],
    ['Legacy Costing / Unit', (line) => line.costingUnit],
    ['Detail CONS.', (line) => line.detailConsumption],
    ['Consumption MPR', (line) => line.consumptionNet],
    ['Consumption Unit', (line) => line.consumptionUnit],
    ['Remarks On BOM', (line) => line.bomRemark],
    ['Additional Remarks', (line) => line.additionalRemark],
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
            <TableRow key={line.id} hover data-bom-line-id={line.id} sx={{ scrollMarginTop: 96 }}>
              {columns.map(([label, render]) => (
                <TableCell key={label} sx={{ fontSize: '0.75rem', verticalAlign: 'top', maxWidth: label === 'Position Description' ? 220 : 170, whiteSpace: 'normal', wordBreak: 'break-word' }}>
                  {label === 'Image'
                    ? <BomLineImageCell bomId={bomId} line={line} onUpload={onImageUpload} onDelete={onImageDelete} onPreview={onImagePreview} actionsDisabled={actionsDisabled} />
                    : (render(line) ?? '—')}
                </TableCell>
              ))}
              <TableCell><Chip size="small" label={line.attachmentCount ?? (line.attachments || []).length} variant="outlined" /></TableCell>
              <TableCell sx={{ whiteSpace: 'nowrap' }}>
                <Tooltip title={actionsDisabled ? 'BOM permission is required to modify BOM data.' : 'Add Line File'}><span><IconButton size="small" disabled={actionsDisabled} onClick={() => onAttach(line)}><Image fontSize="small" /></IconButton></span></Tooltip>
                <Tooltip title={actionsDisabled ? 'BOM permission is required to modify BOM data.' : 'Edit'}><span><IconButton size="small" disabled={actionsDisabled} onClick={() => onEdit(line)}><Edit fontSize="small" /></IconButton></span></Tooltip>
                <Tooltip title={actionsDisabled ? 'BOM permission is required to modify BOM data.' : 'Delete'}><span><IconButton size="small" color="error" disabled={actionsDisabled} onClick={() => onDelete(line)}><Delete fontSize="small" /></IconButton></span></Tooltip>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

export default function BomDetailPage() {
  const { buyerKey: routeBuyerKey, orderId, bomId } = useParams();
  const buyerKey = normalizeBuyerKey(routeBuyerKey);
  const canWrite = canManageBom();
  const llBeanExcelEnabled = buyerKey === 'LLBEAN';
  const writeBlockedMessage = 'BOM permission is required to modify BOM data.';
  const buyerFormatMessage = 'BOM Excel replacement is currently configured for L.L.BEAN only.';
  const fileRef = useRef(null);
  const excelUploadTickerRef = useRef(null);
  const scrollRestoreRef = useRef(null);
  const scrollTargetRef = useRef(null);

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
  const [linePages, setLinePages] = useState({});
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteSaving, setDeleteSaving] = useState(false);
  const [imagePreviewLine, setImagePreviewLine] = useState(null);
  const [excelUploadProgress, setExcelUploadProgress] = useState(initialUploadProgress());

  const notify = useCallback((message, severity = 'success') => setNotice({ open: true, severity, message }), []);

  const load = useCallback(async ({ keepScroll = false, showLoading = true } = {}) => {
    const scrollY = keepScroll && typeof window !== 'undefined' ? window.scrollY : null;

    try {
      if (showLoading) setLoading(true);
      const [data, masterResponse, reviews] = await Promise.all([
        getBom(bomId, buyerKey),
        listMasterData('productColor', { buyerKey, page: 0, size: 200 }),
        listBomMprReviews(bomId)
      ]);

      const scopes = [
        { key: '__CORE__', packingId: '' },
        ...(data?.packings || []).map((packing) => ({ key: packing.id, packingId: packing.id }))
      ];
      const pageResults = await Promise.all(scopes.map(async (scope) => {
        const response = await listBomLines(bomId, { packingId: scope.packingId, page: 0, size: 100 });
        return [scope.key, response];
      }));
      const nextPages = Object.fromEntries(pageResults);
      const nextBom = {
        ...data,
        coreLines: nextPages.__CORE__?.items || [],
        packings: (data?.packings || []).map((packing) => ({
          ...packing,
          lines: nextPages[packing.id]?.items || [],
          lineCount: nextPages[packing.id]?.totalElements ?? packing.lineCount ?? 0
        }))
      };

      if (scrollY !== null) scrollRestoreRef.current = scrollY;

      setBom(nextBom);
      setLinePages(nextPages);
      setProductColorMasters(Array.isArray(masterResponse) ? masterResponse : (masterResponse?.content || masterResponse?.items || []));
      setMprReviews(Array.isArray(reviews) ? reviews : []);
      setHeaderForm(data?.header || {});
      return nextBom;
    } catch (error) {
      notify(getApiError(error, 'Unable to load BOM.'), 'error');
    } finally {
      if (showLoading) setLoading(false);
    }
  }, [bomId, buyerKey, notify]);

  const reloadWithoutJump = useCallback(() => load({ keepScroll: true, showLoading: false }), [load]);

  const replaceLineInState = useCallback((updatedLine) => {
    if (!updatedLine?.id) return;
    setBom((current) => current ? ({
      ...current,
      coreLines: (current.coreLines || []).map((line) => line.id === updatedLine.id ? updatedLine : line),
      packings: (current.packings || []).map((packing) => ({
        ...packing,
        lines: (packing.lines || []).map((line) => line.id === updatedLine.id ? updatedLine : line)
      }))
    }) : current);
  }, []);

  const loadMoreLines = useCallback(async (packingId = '') => {
    const key = packingId || '__CORE__';
    const currentPage = linePages[key];
    if (!currentPage || currentPage.last) return;
    try {
      const nextPage = await listBomLines(bomId, { packingId, page: currentPage.page + 1, size: currentPage.size || 100 });
      setLinePages((current) => ({ ...current, [key]: nextPage }));
      setBom((current) => {
        if (!current) return current;
        if (!packingId) return { ...current, coreLines: [...(current.coreLines || []), ...(nextPage.items || [])] };
        return {
          ...current,
          packings: (current.packings || []).map((packing) => packing.id === packingId
            ? { ...packing, lines: [...(packing.lines || []), ...(nextPage.items || [])], lineCount: nextPage.totalElements }
            : packing)
        };
      });
    } catch (error) {
      notify(getApiError(error, 'Unable to load more BOM lines.'), 'error');
    }
  }, [bomId, linePages, notify]);

  const scrollToCreatedTarget = useCallback((selector) => {
    if (selector) scrollTargetRef.current = selector;
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (loading || scrollRestoreRef.current === null || typeof window === 'undefined') return;

    const scrollY = scrollRestoreRef.current;
    scrollRestoreRef.current = null;

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        window.scrollTo({ top: scrollY, left: 0, behavior: 'auto' });
      });
    });
  }, [bom, loading]);

  useEffect(() => {
    if (loading || !scrollTargetRef.current || typeof document === 'undefined') return;

    const selector = scrollTargetRef.current;
    scrollTargetRef.current = null;

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const element = document.querySelector(selector);
        if (!element) return;

        element.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
        const previousBoxShadow = element.style.boxShadow;
        const previousTransition = element.style.transition;
        element.style.transition = 'box-shadow 180ms ease';
        element.style.boxShadow = '0 0 0 3px rgba(16, 59, 92, 0.28)';

        window.setTimeout(() => {
          element.style.boxShadow = previousBoxShadow;
          element.style.transition = previousTransition;
        }, 1600);
      });
    });
  }, [bom, loading]);

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

  const requestDelete = useCallback((target) => {
    if (!canWrite) { notify(writeBlockedMessage, 'warning'); return; }
    setDeleteTarget(target || null);
  }, [canWrite, notify]);

  const closeDeleteDialog = useCallback(() => {
    if (!deleteSaving) setDeleteTarget(null);
  }, [deleteSaving]);

  const lineDeleteLabel = useCallback((line = {}) => (
    [line.materialType, line.positionDescription || line.position, line.detailNo]
      .filter(Boolean)
      .join(' — ') || line.id || 'this BOM line'
  ), []);

  const saveHeader = async () => {
    if (!canWrite) { notify(writeBlockedMessage, 'warning'); return; }
    try {
      setSaving(true);
      await updateBom(bomId, { bomNo: bom.bomNo, bomName: bom.bomName, header: headerForm });
      setHeaderOpen(false);
      notify('BOM Header Saved.');
      await reloadWithoutJump();
    } catch (error) {
      notify(getApiError(error, 'Unable to save BOM header.'), 'error');
    } finally {
      setSaving(false);
    }
  };

  const saveLine = async (payload) => {
    if (!canWrite) { notify(writeBlockedMessage, 'warning'); return; }
    const currentLineCtx = lineCtx || {};
    const isCreate = !currentLineCtx?.record?.id;
    const packingId = currentLineCtx?.packingId || '';

    try {
      setSaving(true);
      let savedLine = null;
      if (isCreate) {
        savedLine = await addBomLine(bomId, payload, packingId);
      } else {
        await updateBomLine(bomId, currentLineCtx.record.id, payload);
      }
      setLineCtx(null);
      notify('BOM Line Saved.');

      if (isCreate) {
        const nextBom = await load({ keepScroll: false, showLoading: false });
        const createdLineId = resolveCreatedLineId(savedLine, nextBom, payload, packingId);
        scrollToCreatedTarget(createdLineId ? `[data-bom-line-id="${cssAttributeEscape(createdLineId)}"]` : '');
      } else {
        await reloadWithoutJump();
      }
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
      await reloadWithoutJump();
    } catch (error) {
      notify(getApiError(error, 'Unable to delete BOM line.'), 'error');
    }
  };

  const saveProductColor = async (payload) => {
    if (!canWrite) { notify(writeBlockedMessage, 'warning'); return; }
    const isCreate = !productColorCtx?.record?.id;

    try {
      setSaving(true);
      let savedProductColor = null;
      if (isCreate) {
        savedProductColor = await addBomProductColor(bomId, payload);
        notify('Product Color link created. Manage the shared image in Product Color Master edit screen.');
      } else {
        await updateBomProductColor(bomId, productColorCtx.record.id, payload);
        notify('Product Color Information Updated. Linked Packing And Material Line Views Now Use The New Information.');
      }
      setProductColorCtx(null);

      if (isCreate) {
        const nextBom = await load({ keepScroll: false, showLoading: false });
        const createdProductColorId = resolveCreatedProductColorId(savedProductColor, nextBom, payload);
        scrollToCreatedTarget(createdProductColorId ? `[data-bom-product-color-id="${cssAttributeEscape(createdProductColorId)}"]` : '');
      } else {
        await reloadWithoutJump();
      }
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
      await reloadWithoutJump();
    } catch (error) {
      notify(getApiError(error, 'Unable to delete Product Color.'), 'error');
    } finally {
      setSaving(false);
    }
  };

  const savePacking = async (payload) => {
    if (!canWrite) { notify(writeBlockedMessage, 'warning'); return; }
    const isCreate = !packingCtx?.record?.id;

    try {
      setSaving(true);
      let savedPacking = null;
      if (isCreate) {
        savedPacking = await addPacking(bomId, payload);
      } else {
        await updatePacking(bomId, packingCtx.record.id, payload);
      }
      setPackingCtx(null);
      notify('Packing Saved.');

      if (isCreate) {
        const nextBom = await load({ keepScroll: false, showLoading: false });
        const createdPackingId = resolveCreatedPackingId(savedPacking, nextBom, payload);
        scrollToCreatedTarget(createdPackingId ? `[data-bom-packing-id="${cssAttributeEscape(createdPackingId)}"]` : '');
      } else {
        await reloadWithoutJump();
      }
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
      await reloadWithoutJump();
    } catch (error) {
      notify(getApiError(error, 'Unable to delete packing.'), 'error');
    }
  };

  const stopExcelUploadTicker = () => {
    if (excelUploadTickerRef.current) window.clearInterval(excelUploadTickerRef.current);
    excelUploadTickerRef.current = null;
  };

  const executeExcelReplacement = async (file) => {
    if (!file) return;
    setSaving(true);
    setExcelUploadProgress(initialUploadProgress(file, 'Preparing BOM Excel replacement...'));
    stopExcelUploadTicker();
    excelUploadTickerRef.current = startProcessingTicker(setExcelUploadProgress);

    try {
      await replaceBomExcel(bomId, file, {
        onUploadProgress: (event) => {
          const nextValue = uploadProgressFromEvent(event);
          setExcelUploadProgress((current) => ({
            ...current,
            open: true,
            file,
            progress: Math.max(Number(current.progress || 0), nextValue),
            status: uploadStage(nextValue),
            state: 'processing'
          }));
        }
      });
      stopExcelUploadTicker();
      setExcelUploadProgress({
        open: true,
        file,
        progress: 100,
        status: 'BOM Excel replacement completed.',
        detail: 'Product Colors, Child Colors, materials and packing data were re-imported successfully.',
        state: 'success'
      });
      notify('BOM Excel replaced. Product / Style Colors and Child Colors were linked to Product Color Master; materials and packings were re-imported into this BOM.');
      await reloadWithoutJump();
    } catch (error) {
      stopExcelUploadTicker();
      const message = getApiError(error, 'Unable to replace BOM Excel.');
      setExcelUploadProgress((current) => ({
        ...current,
        open: true,
        file,
        status: 'BOM Excel replacement failed.',
        detail: message,
        state: 'error'
      }));
      notify(message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const uploadExcel = async (event) => {
    if (!canWrite || !llBeanExcelEnabled) {
      event.target.value = '';
      notify(!canWrite ? writeBlockedMessage : buyerFormatMessage, 'warning');
      return;
    }
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    await executeExcelReplacement(file);
  };

  const uploadLineImage = async (line, file) => {
    if (!canWrite) { notify(writeBlockedMessage, 'warning'); return; }
    try {
      setSaving(true);
      const updated = await uploadBomLineImage(bomId, line.id, file);
      replaceLineInState(updated);
      setBom((current) => current ? ({ ...current, imageCount: (current.imageCount || 0) + (line.primaryImage ? 0 : 1) }) : current);
      notify(line.primaryImage ? 'BOM Line Image Replaced.' : 'BOM Line Image Uploaded.');
    } catch (error) {
      notify(getApiError(error, 'Unable to upload BOM line image.'), 'error');
    } finally {
      setSaving(false);
    }
  };

  const removeLineImage = async (line) => {
    if (!canWrite) { notify(writeBlockedMessage, 'warning'); return; }
    try {
      setSaving(true);
      const updated = await deleteBomLineImage(bomId, line.id);
      replaceLineInState(updated);
      setBom((current) => current ? ({ ...current, imageCount: Math.max(0, (current.imageCount || 0) - 1) }) : current);
      notify('BOM Line Image Deleted.');
    } catch (error) {
      notify(getApiError(error, 'Unable to delete BOM line image.'), 'error');
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
      await reloadWithoutJump();
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
      await reloadWithoutJump();
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

  const confirmDeleteTarget = async () => {
    if (!deleteTarget?.type || !deleteTarget?.id) {
      setDeleteTarget(null);
      return;
    }

    setDeleteSaving(true);
    try {
      if (deleteTarget.type === 'line') {
        await removeLine(deleteTarget.id);
      } else if (deleteTarget.type === 'packing') {
        await removePacking(deleteTarget.id);
      } else if (deleteTarget.type === 'productColor') {
        await removeProductColor(deleteTarget.id);
      } else if (deleteTarget.type === 'attachment') {
        await deleteAttachment(deleteTarget.id);
      }
      setDeleteTarget(null);
    } finally {
      setDeleteSaving(false);
    }
  };

  const applyMprReview = async (reviewId, comment) => {
    if (!canWrite) { notify(writeBlockedMessage, 'warning'); return; }
    try {
      setReviewSavingId(reviewId);
      await applyBomMprReview(bomId, reviewId, { comment });
      notify('Sales MPR change was applied to the selected BOM line.');
      await reloadWithoutJump();
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
      await reloadWithoutJump();
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
          <Button component={RouterLink} to={buyerPath(buyerKey, `orders/${orderId}`)} sx={{ px: 0, textTransform: 'none' }}>← Back To Order</Button>
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
          <Tooltip title={!canWrite ? writeBlockedMessage : (!llBeanExcelEnabled ? buyerFormatMessage : 'Replace BOM Excel')}><span><Button size="small" variant="outlined" startIcon={<FileUpload />} onClick={() => fileRef.current?.click()} disabled={saving || !canWrite || !llBeanExcelEnabled}>
            Replace BOM Excel
          </Button></span></Tooltip>
          <input ref={fileRef} type="file" accept=".xls,.xlsx" hidden onChange={uploadExcel} />
          <Tooltip title={!canWrite ? writeBlockedMessage : 'Edit Header'}><span><Button size="small" variant="contained" startIcon={<Save />} onClick={() => setHeaderOpen(true)} disabled={!canWrite} sx={{ backgroundColor: '#103B5C' }}>
            Edit Header
          </Button></span></Tooltip>
        </Stack>
      </Stack>

      {!llBeanExcelEnabled && (
        <Alert severity="info" sx={{ mb: 2 }}>
          {buyerFormatMessage} Manual BOM maintenance remains available.
        </Alert>
      )}

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
            Showing {matchedBomLineCount} / {totalBomLineCount} loaded line(s)
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
            <Typography sx={{ fontWeight: 900, color: '#103B5C' }}>Core Materials ({lineFilters.source && lineFilters.source !== '__CORE__' ? 0 : filteredCoreLines.length} Loaded / {bom.coreLineCount ?? (bom.coreLines || []).length})</Typography>
            <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>Columns A–Z, including the dedicated Image column and all Product Color values, are retained from the original BOM Excel.</Typography>
          </Box>
          <Tooltip title={!canWrite ? writeBlockedMessage : 'Add Material'}><span><Button startIcon={<Add />} variant="contained" size="small" disabled={!canWrite} onClick={() => setLineCtx({ record: null, packingId: '' })} sx={{ textTransform: 'none', backgroundColor: '#103B5C' }}>
            Add Material
          </Button></span></Tooltip>
        </Stack>
        <LineTable
          bomId={bomId}
          rows={lineFilters.source && lineFilters.source !== '__CORE__' ? [] : filteredCoreLines}
          productColors={productColors}
          emptyText="No Core BOM lines match the current filter."
          onEdit={(record) => setLineCtx({ record, packingId: '' })}
          onDelete={(record) => requestDelete({
            type: 'line',
            id: record?.id,
            itemName: 'BOM Line',
            label: lineDeleteLabel(record),
            message: <>Delete BOM Line <b>{lineDeleteLabel(record)}</b>?</>,
            warning: 'This will remove only the selected BOM material line.'
          })}
          onAttach={(record) => setAttachmentLineId(record.id) || setAttachmentScope('LINE')}
          onImageUpload={uploadLineImage}
          onImageDelete={removeLineImage}
          onImagePreview={setImagePreviewLine}
          actionsDisabled={!canWrite}
        />
        {linePages.__CORE__ && !linePages.__CORE__.last && (
          <Button size="small" onClick={() => loadMoreLines('')} sx={{ mt: 1, textTransform: 'none' }}>Load More Core Lines</Button>
        )}
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
          <Accordion key={packing.id} defaultExpanded data-bom-packing-id={packing.id} sx={{ scrollMarginTop: 96 }}>
            <AccordionSummary component="div" expandIcon={<ExpandMore />}>
              <Stack direction="row" spacing={1} alignItems="center" sx={{ width: 1, pr: 1 }}>
                <Typography sx={{ fontWeight: 900 }}>{packing.packingName}</Typography>
                <Chip size="small" label={`${filteredPackingLines.length} Loaded / ${packing.lineCount ?? (packing.lines || []).length} Lines`} />
                <Chip size="small" label={linkedProductColors.length ? `${linkedProductColors.length} Product Colors` : 'All Product Colors'} variant="outlined" />
                <Box sx={{ flex: 1 }} />
                <Tooltip title={!canWrite ? writeBlockedMessage : 'Edit Packing'}><span><IconButton size="small" disabled={!canWrite} onClick={(event) => { event.stopPropagation(); setPackingCtx({ record: packing }); }}><Edit fontSize="small" /></IconButton></span></Tooltip>
                <Tooltip title={!canWrite ? writeBlockedMessage : 'Delete Packing'}><span><IconButton color="error" size="small" disabled={!canWrite} onClick={(event) => {
                      event.stopPropagation();
                      requestDelete({
                        type: 'packing',
                        id: packing.id,
                        itemName: 'Packing',
                        label: packing.packingName || 'this packing',
                        message: <>Delete Packing <b>{packing.packingName || 'this packing'}</b>?</>,
                        warning: 'This will remove the selected Packing and its material lines from this BOM.'
                      });
                    }}><Delete fontSize="small" /></IconButton></span></Tooltip>
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
                  <AttachmentCards
                    attachments={packing.attachments || []}
                    bomId={bomId}
                    onDelete={(attachment) => requestDelete({
                      type: 'attachment',
                      id: attachment?.id,
                      itemName: 'Attachment',
                      label: attachmentLabel(attachment),
                      message: <>Delete file <b>{attachmentLabel(attachment)}</b>?</>,
                      warning: 'This will remove the selected file from this BOM.'
                    })}
                    onOpen={openAttachment}
                    onDownload={downloadAttachment}
                    actionsDisabled={!canWrite}
                    emptyText=""
                  />
                </Box>
              )}
              <Box sx={{ mt: 1.5 }}>
                <LineTable
                  bomId={bomId}
                  rows={filteredPackingLines}
                  productColors={productColors}
                  emptyText="No Packing lines match the current filter."
                  onEdit={(record) => setLineCtx({ record, packingId: packing.id })}
                  onDelete={(record) => requestDelete({
                    type: 'line',
                    id: record?.id,
                    itemName: 'Packing Line',
                    label: lineDeleteLabel(record),
                    message: <>Delete Packing Line <b>{lineDeleteLabel(record)}</b>?</>,
                    warning: 'This will remove only the selected Packing material line.'
                  })}
                  onAttach={(record) => setAttachmentLineId(record.id) || setAttachmentScope('LINE')}
                  onImageUpload={uploadLineImage}
                  onImageDelete={removeLineImage}
                  onImagePreview={setImagePreviewLine}
                  actionsDisabled={!canWrite}
                />
                {linePages[packing.id] && !linePages[packing.id].last && (
                  <Button size="small" onClick={() => loadMoreLines(packing.id)} sx={{ mt: 1, textTransform: 'none' }}>Load More Lines</Button>
                )}
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
        <AttachmentCards
          attachments={bomAttachments}
          bomId={bomId}
          onDelete={(attachment) => requestDelete({
            type: 'attachment',
            id: attachment?.id,
            itemName: 'Attachment',
            label: attachmentLabel(attachment),
            message: <>Delete file <b>{attachmentLabel(attachment)}</b>?</>,
            warning: 'This will remove the selected file from this BOM.'
          })}
          onOpen={openAttachment}
          onDownload={downloadAttachment}
          actionsDisabled={!canWrite}
          emptyText="No BOM-level images/files."
        />

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
                <Paper key={productColor.id} elevation={0} data-bom-product-color-id={productColor.id} sx={{ p: 1.2, border: '1px solid #e5e7eb', borderRadius: 1.5, scrollMarginTop: 96 }}>
                  <Stack direction="row" justifyContent="space-between" spacing={1} alignItems="flex-start">
                    <Box>
                      <Typography sx={{ fontWeight: 900, fontSize: '0.8rem' }}>{productColor.colorName}</Typography>
                      <Typography sx={{ fontSize: '0.72rem', color: 'text.secondary' }}>Pattern Number: {productColor.patternNumber || '—'}</Typography>
                      <Typography sx={{ fontSize: '0.72rem', color: 'text.secondary' }}>Season: {productColor.season || '—'}</Typography>
                      <Typography sx={{ fontSize: '0.72rem', color: 'text.secondary' }}>Style Number: {productColor.styleNumber || '—'}</Typography>
                      <Typography sx={{ fontSize: '0.72rem', color: 'text.secondary' }}>Sequence: {productColor.sequence ?? '—'}</Typography>
                    </Box>
                    <Stack spacing={0.25} alignItems="flex-end">
                      <Tooltip title={!canWrite ? writeBlockedMessage : 'Change Product Color Master link'}><span><Button size="small" startIcon={<Edit />} disabled={!canWrite} onClick={() => setProductColorCtx({ record: productColor })} sx={{ textTransform: 'none', whiteSpace: 'nowrap' }}>
                        Change Link
                      </Button></span></Tooltip>
                      <Tooltip title={!canWrite ? writeBlockedMessage : 'Delete BOM Product Color link'}><span><Button size="small" color="error" startIcon={<Delete />} disabled={!canWrite} onClick={() => requestDelete({
                          type: 'productColor',
                          id: productColor.id,
                          itemName: 'Product Color Link',
                          label: productColorLabel(productColor) || productColor.colorName || 'this Product Color link',
                          message: <>Delete Product Color Link <b>{productColorLabel(productColor) || productColor.colorName || 'this Product Color link'}</b>?</>,
                          warning: 'This removes only the Product Color link from this BOM. It does not delete the Product Color Master record.'
                        })} sx={{ textTransform: 'none', whiteSpace: 'nowrap' }}>
                        Delete Link
                      </Button></span></Tooltip>
                    </Stack>
                  </Stack>
                  <Box sx={{ mt: 1 }}>
                    <ProductColorImage productColor={master || productColor} height={125} emptyText={master ? 'No image saved in Product Color Master' : 'Product Color Master link is required'} />
                  </Box>
                  <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1} sx={{ mt: 0.75 }}>
                    <Typography noWrap sx={{ minWidth: 0, flex: 1, fontSize: '0.7rem', color: master ? 'text.secondary' : 'warning.main' }}>
                      {master ? `Master: ${productColorMasterLabel(master) || master.productColor || productColor.colorName}` : 'No linked Product Color Master'}
                    </Typography>
                    <Button component={RouterLink} to={buyerPath(buyerKey, 'product-colors')} size="small" sx={{ textTransform: 'none', whiteSpace: 'nowrap' }}>
                      Open Master
                    </Button>
                  </Stack>
                </Paper>
              );
            })}
          </Box>
        </Box>
      </Paper>

      <ExcelUploadProgressDialog
        open={excelUploadProgress.open}
        title="Replacing BOM Excel"
        file={excelUploadProgress.file}
        progress={excelUploadProgress.progress}
        status={excelUploadProgress.status}
        detail={excelUploadProgress.detail}
        state={excelUploadProgress.state}
        onClose={() => setExcelUploadProgress(initialUploadProgress())}
        onRetry={excelUploadProgress.state === 'error' ? () => executeExcelReplacement(excelUploadProgress.file) : undefined}
      />

      <BomLineImagePreviewDialog
        open={Boolean(imagePreviewLine)}
        bomId={bomId}
        line={imagePreviewLine}
        onClose={() => setImagePreviewLine(null)}
      />

      <Dialog open={canWrite && headerOpen} onClose={saving ? undefined : () => setHeaderOpen(false)} fullWidth maxWidth="md">
        <DialogTitle sx={{ pr: 6, fontWeight: 900, color: '#103B5C' }}>
          Edit BOM Header
          <IconButton onClick={() => setHeaderOpen(false)} disabled={saving} sx={{ position: 'absolute', right: 14, top: 14 }}>×</IconButton>
        </DialogTitle>
        <DialogContent dividers>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' }, gap: 1.5 }}>
            {['buyer', 'revStage', 'season', 'styleNumber', 'styleName', 'markerDate', 'markerMaker', 'factoryProduct', 'patternNumber', 'patternMaker', 'bomMaker', 'size', 'bomDate', 'patternDate', 'patternRevisedDate', 'comments'].map((key) => (
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
      <ProductColorDialog open={canWrite && Boolean(productColorCtx)} record={productColorCtx?.record} header={bom?.header} productColorMasters={productColorMasters} buyerKey={buyerKey} saving={saving} onClose={() => setProductColorCtx(null)} onSave={saveProductColor} />

      <BomMprReviewDialog
        open={canWrite && reviewOpen}
        reviews={mprReviews}
        savingReviewId={reviewSavingId}
        actionsDisabled={!canWrite}
        onClose={() => setReviewOpen(false)}
        onApply={applyMprReview}
        onRecheck={recheckMprReview}
      />

      <ConfirmDeleteDialog
        open={canWrite && Boolean(deleteTarget)}
        record={deleteTarget}
        itemName={deleteTarget?.itemName || 'Item'}
        title={`Delete ${deleteTarget?.itemName || 'Item'}?`}
        subtitle="Please confirm before deleting this item."
        message={deleteTarget?.message}
        warning={deleteTarget?.warning}
        deleting={deleteSaving}
        onClose={closeDeleteDialog}
        onConfirm={confirmDeleteTarget}
      />

      <Snackbar open={notice.open} autoHideDuration={3500} onClose={() => setNotice((current) => ({ ...current, open: false }))}>
        <Alert severity={notice.severity} variant="filled">{notice.message}</Alert>
      </Snackbar>
    </Box>
  );
}
