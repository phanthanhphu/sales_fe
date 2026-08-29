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
  ListItemIcon,
  Menu,
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
  ArrowBackOutlined,
  Close,
  Delete,
  Edit,
  ExpandMore,
  FileDownload,
  FileUpload,
  Image,
  InsertDriveFile,
  KeyboardArrowDown,
  LayersOutlined,
  DescriptionOutlined,
  ChatBubbleOutline,
  RestartAlt,
  Save
} from '@mui/icons-material';
import { Link as RouterLink, useParams } from 'react-router-dom';

import {
  addBomLine,
  addBomProductColor,
  addPacking,
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
  openBomAttachment,
  getBomExportUrl,
  getBomTemplateUrl,
  replaceBomExcel,
  updateBom,
  updateBomLine,
  updateBomProductColor,
  updatePacking,
  uploadBomAttachment,
  uploadBomLineImage
} from '../../services/orderBomMprService';
import { canManageBom } from 'utils/accessControl';
import { buyerPath, normalizeBuyerKey } from 'utils/buyerContext';
import ConfirmDeleteDialog from '../shared/ConfirmDeleteDialog';
import ExcelUploadProgressDialog from '../../components/ExcelUploadProgressDialog';
import StatusBadge from '../../components/StatusBadge';
import EmptyTableState from '../../components/EmptyTableState';
import ColumnVisibilityMenu from '../../components/ColumnVisibilityMenu';
import SectionHeader from '../../components/SectionHeader';
import SortableTableCell from '../../components/SortableTableCell';
import useTableSort from '../../utils/useTableSort';
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

const bomOverviewCardSx = {
  border: '1px solid #e2e8f0',
  borderRadius: 1.5,
  backgroundColor: '#fff',
  boxShadow: '0 1px 2px rgba(15, 23, 42, 0.025)',
  overflow: 'hidden'
};

const OverviewCardTitle = ({ icon, title }) => (
  <Stack direction="row" spacing={0.6} alignItems="center" sx={{ pb: 0.55, mb: 0.6, borderBottom: '1px solid #edf1f5' }}>
    <Box
      sx={{
        width: 24,
        height: 24,
        borderRadius: 0.9,
        display: 'grid',
        placeItems: 'center',
        color: '#0a6ed1',
        backgroundColor: '#eef6ff',
        flexShrink: 0,
        '& .MuiSvgIcon-root': { fontSize: 15 }
      }}
    >
      {icon}
    </Box>
    <Typography sx={{ fontSize: '.78rem', fontWeight: 700, color: '#132238' }}>{title}</Typography>
  </Stack>
);

const overviewGridLine = '#dbe4ed';

const OverviewInfoCell = ({ label, value, strong = false, empty = false }) => (
  <TableCell
    sx={{
      px: 0.72,
      py: 0.5,
      height: 44,
      verticalAlign: 'middle',
      backgroundColor: '#fff',
      borderRight: `1px solid ${overviewGridLine}`,
      borderBottom: `1px solid ${overviewGridLine}`,
      '&:last-of-type': { borderRight: 0 }
    }}
  >
    {!empty && (
      <>
        <Typography
          sx={{
            mb: 0.12,
            fontSize: '.54rem',
            color: '#6f8296',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '.035em',
            lineHeight: 1.15,
            whiteSpace: 'nowrap'
          }}
        >
          {label}
        </Typography>
        <Typography
          sx={{
            minWidth: 0,
            fontSize: '.7rem',
            color: '#17283d',
            fontWeight: strong ? 700 : 560,
            lineHeight: 1.3,
            overflowWrap: 'anywhere'
          }}
        >
          {value || '—'}
        </Typography>
      </>
    )}
  </TableCell>
);

const OverviewInfoGroup = ({ title, children, subtle = false }) => (
  <TableRow
    sx={{
      '&:last-of-type td': { borderBottom: 0 }
    }}
  >
    <TableCell
      sx={{
        width: 116,
        minWidth: 116,
        px: 0.72,
        py: 0.5,
        height: 44,
        verticalAlign: 'middle',
        backgroundColor: subtle ? '#fafbfd' : '#f5f8fb',
        borderRight: `1px solid ${overviewGridLine}`,
        borderBottom: `1px solid ${overviewGridLine}`
      }}
    >
      <Typography
        sx={{
          fontSize: '.57rem',
          fontWeight: 750,
          color: subtle ? '#718397' : '#38536d',
          textTransform: 'uppercase',
          letterSpacing: '.045em',
          lineHeight: 1.3,
          whiteSpace: 'nowrap'
        }}
      >
        {title}
      </Typography>
    </TableCell>
    {children}
  </TableRow>
);

const asNumber = (value) => (
  value === '' || value === null || value === undefined || Number.isNaN(Number(value))
    ? null
    : Number(value)
);

// Keep BOM consumption decimals as text until they reach Java BigDecimal.
// This avoids IEEE-754 rounding and preserves all digits entered or imported from Excel.
const asDecimalValue = (value) => {
  if (value === '' || value === null || value === undefined) return null;
  const normalizedValue = String(value).trim().replace(',', '.');
  return /^(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/.test(normalizedValue)
    ? normalizedValue
    : null;
};

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
    safeProductColor.colorName,
    safeProductColor.patternNumber,
    safeProductColor.season,
    safeProductColor.styleNumber
  ].filter(Boolean).join(' · ');
};


const childColorsForProductColor = (productColorId, productColors = []) => {
  const productColor = (Array.isArray(productColors) ? productColors : []).find((item) => item?.id === productColorId);
  const unique = new Map();
  (productColor?.childColors || []).forEach((item) => {
    const id = String(item?.id || '').trim();
    const childColor = String(item?.childColor || '').trim();
    if (id && childColor) unique.set(id, { id, childColor });
  });
  return Array.from(unique.values());
};

const productColorImageAttachment = (bom = {}, productColorId = '') => (
  (bom?.attachments || []).find((attachment) => (
    String(attachment?.scope || '').toUpperCase() === 'COLOR'
    && String(attachment?.productColorId || '') === String(productColorId || '')
    && (String(attachment?.contentType || '').toLowerCase().startsWith('image/')
      || /\.(png|jpe?g|gif|webp|bmp|emf|wmf)$/i.test(String(attachment?.originalFileName || '')))
  )) || null
);

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
  detailConsumption: asDecimalValue(form.detailConsumption),
  consumptionNet: asDecimalValue(form.consumptionNet),
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

function LineDialog({ open, record, productColors = [], saving, onClose, onSave }) {
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
      <DialogTitle sx={{ pr: 6, fontWeight: 750, color: '#103B5C' }}>
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
          <TextField
            label="Detail CONS. (New Format)"
            type="text"
            inputProps={{ inputMode: 'decimal' }}
            value={form.detailConsumption}
            onChange={set('detailConsumption')}
            sx={fieldSx}
          />
          <TextField
            label="Consumption MPR"
            type="text"
            inputProps={{ inputMode: 'decimal' }}
            value={form.consumptionNet}
            onChange={set('consumptionNet')}
            sx={fieldSx}
          />
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
                <Typography sx={{ fontWeight: 750, fontSize: '0.83rem', color: '#103B5C' }}>Product Color Values</Typography>
                <Typography sx={{ fontSize: '0.73rem', color: 'text.secondary' }}>
                  Select the Product / Style Color first. The Child Color list comes from that Product Color inside this BOM. Each Product Color can be selected once per material line.
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
                        const childColors = childColorsForProductColor(item.productColorId, productColors);
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
                            helperText={item.productColorId ? 'No Child Color is configured for this Product Color in this BOM yet. Edit the Product Color to add one.' : 'Select Product / Style Color first.'}
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
        <Button variant="contained" onClick={save} disabled={saving} sx={{ textTransform: 'none', fontWeight: 700, backgroundColor: '#103B5C' }}>
          {saving ? 'Saving...' : record ? 'Save Changes' : 'Create Line'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function PackingDialog({ open, record, saving, onClose, onSave }) {
  const [packingName, setPackingName] = useState('');

  useEffect(() => {
    setPackingName(record?.packingName || '');
  }, [open, record]);

  return (
    <Dialog open={open} onClose={saving ? undefined : onClose} fullWidth maxWidth="sm">
      <DialogTitle sx={{ pr: 6, fontWeight: 750, color: '#103B5C' }}>
        {record ? 'Edit Packing' : 'Add Packing'}
        <Typography sx={{ mt: 0.25, fontSize: '0.8rem', color: 'text.secondary', fontWeight: 400 }}>
          {record ? 'Update the Packing name.' : 'Create a Packing for BOM material lines.'}
        </Typography>
        <IconButton onClick={onClose} disabled={saving} sx={{ position: 'absolute', right: 14, top: 14 }}>×</IconButton>
      </DialogTitle>
      <DialogContent dividers>
        <TextField
          fullWidth
          required
          autoFocus
          label="Packing Name"
          value={packingName}
          onChange={(event) => setPackingName(event.target.value)}
          placeholder="PACKING US"
        />
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose} disabled={saving} sx={{ textTransform: 'none' }}>Cancel</Button>
        <Button
          variant="contained"
          disabled={saving || !packingName.trim()}
          onClick={() => onSave?.({ packingName: packingName.trim() })}
          sx={{ textTransform: 'none', fontWeight: 700, backgroundColor: '#103B5C' }}
        >
          {saving ? 'Saving...' : record ? 'Save Changes' : 'Create Packing'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
function ProductColorDialog({ open, record, header = {}, bomId, imageAttachment, saving, onClose, onSave }) {
  const blankChildColor = () => ({ id: '', childColor: '' });
  const clean = (value) => String(value || '').trim();
  const mapChildColors = (source = []) => (
    Array.isArray(source)
      ? source.map((item) => ({ id: clean(item?.id), childColor: clean(item?.childColor || item?.value || item?.name) }))
      : []
  );

  const [form, setForm] = useState({ colorName: '', patternNumber: '', season: '', styleNumber: '', childColors: [] });
  const [imageFile, setImageFile] = useState(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState('');
  const [removeImageRequested, setRemoveImageRequested] = useState(false);
  const [imageError, setImageError] = useState('');
  const [childColorDeleteTarget, setChildColorDeleteTarget] = useState(null);
  const editableChildColorRows = form.childColors.map((item, sourceIndex) => ({ ...item, __sourceIndex: sourceIndex }));
  const { sortedRows: sortedEditableChildColors, sortKey: childSortKey, sortDirection: childSortDirection, requestSort: requestChildSort } = useTableSort(editableChildColorRows, { getValue: (item, key) => key === 'childColor' ? item.childColor : item?.[key] });

  useEffect(() => {
    if (!open) return;
    setForm({
      colorName: record?.colorName || '',
      patternNumber: record?.patternNumber || header?.patternNumber || '',
      season: record?.season || header?.season || '',
      styleNumber: record?.styleNumber || header?.styleNumber || '',
      childColors: mapChildColors(record?.childColors)
    });
    setImageFile(null);
    setRemoveImageRequested(false);
    setImageError('');
    setChildColorDeleteTarget(null);
  }, [open, record, header]);

  useEffect(() => {
    if (!imageFile) {
      setImagePreviewUrl('');
      return undefined;
    }
    const objectUrl = URL.createObjectURL(imageFile);
    setImagePreviewUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [imageFile]);

  const selectImage = (event) => {
    const file = event.target.files?.[0] || null;
    event.target.value = '';
    if (!file) return;
    if (!String(file.type || '').toLowerCase().startsWith('image/')) {
      setImageError('Please choose an image file.');
      return;
    }
    setImageError('');
    setRemoveImageRequested(false);
    setImageFile(file);
  };

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
    const label = clean(item?.childColor);
    if (!label) {
      setForm((current) => ({ ...current, childColors: current.childColors.filter((_, itemIndex) => itemIndex !== index) }));
      return;
    }
    setChildColorDeleteTarget({ index, label });
  };

  const confirmRemoveChildColor = () => {
    const targetIndex = childColorDeleteTarget?.index;
    if (!Number.isInteger(targetIndex)) return;
    setForm((current) => ({ ...current, childColors: current.childColors.filter((_, itemIndex) => itemIndex !== targetIndex) }));
    setChildColorDeleteTarget(null);
  };

  const normalizedChildColors = form.childColors
    .map((item) => ({ id: clean(item?.id), childColor: clean(item?.childColor) }))
    .filter((item) => item.childColor);
  const hasBlankChildColor = form.childColors.some((item) => !clean(item?.childColor));
  const duplicateChildColor = normalizedChildColors.some((item, index, items) => (
    items.findIndex((candidate) => normalized(candidate.childColor) === normalized(item.childColor)) !== index
  ));
  const canSave = Boolean(clean(form.colorName) && clean(form.patternNumber) && clean(form.season) && clean(form.styleNumber))
    && !hasBlankChildColor && !duplicateChildColor;

  const submit = () => onSave?.({
    imageFile,
    removeImage: removeImageRequested && !imageFile,
    imageAttachmentId: imageAttachment?.id || '',
    bomPayload: {
      colorName: clean(form.colorName),
      patternNumber: clean(form.patternNumber),
      season: clean(form.season),
      styleNumber: clean(form.styleNumber),
      childColors: normalizedChildColors
    }
  });

  return (
    <>
      <Dialog open={open} onClose={saving ? undefined : onClose} fullWidth maxWidth="lg" PaperProps={{ sx: { maxHeight: 'calc(100vh - 32px)' } }}>
        <DialogTitle sx={{ pr: 6, fontWeight: 750, color: '#103B5C' }}>
          {record ? 'Edit Product Color' : 'Add Product Color'}
          <Typography sx={{ mt: 0.25, fontSize: '0.8rem', color: 'text.secondary', fontWeight: 400 }}>
            This Product Color, its Child Colors and image belong only to this BOM.
          </Typography>
          <IconButton onClick={onClose} disabled={saving} sx={{ position: 'absolute', right: 14, top: 14 }}>×</IconButton>
        </DialogTitle>

        <DialogContent dividers>
          <Stack spacing={1.75}>
            <Alert severity="info" sx={{ py: 0.45 }}>
              Changes here do not affect any other BOM. If this BOM is already used by an IN_PROGRESS MPR, the MPR will show Update from BOM.
            </Alert>

            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))' }, gap: 1.25 }}>
              <TextField required label="Pattern Number" value={form.patternNumber} onChange={(event) => setForm((current) => ({ ...current, patternNumber: event.target.value }))} placeholder="LLB 352 A" />
              <TextField required label="Product / Style Color" value={form.colorName} onChange={(event) => setForm((current) => ({ ...current, colorName: event.target.value }))} placeholder="BLACK" />
              <TextField required label="Season" value={form.season} onChange={(event) => setForm((current) => ({ ...current, season: event.target.value }))} placeholder="F26" />
              <TextField required label="Style Number" value={form.styleNumber} onChange={(event) => setForm((current) => ({ ...current, styleNumber: event.target.value }))} placeholder="271893" />
            </Box>

            <Paper elevation={0} sx={{ p: 1.25, border: '1px solid #e2e8f0', borderRadius: 1.5, backgroundColor: '#fbfdff' }}>
              <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} alignItems={{ xs: 'stretch', md: 'center' }}>
                <Box sx={{ width: { xs: 1, md: 240 }, flexShrink: 0 }}>
                  {imagePreviewUrl ? (
                    <Box component="img" src={imagePreviewUrl} alt="Selected Product Color" sx={{ width: 1, height: 150, objectFit: 'contain', display: 'block', borderRadius: 1, backgroundColor: '#f8fafc' }} />
                  ) : imageAttachment && !removeImageRequested ? (
                    <ProtectedAttachmentImage bomId={bomId} attachment={imageAttachment} height={150} />
                  ) : (
                    <Stack alignItems="center" justifyContent="center" spacing={0.5} sx={{ height: 150, backgroundColor: '#f8fafc', borderRadius: 1 }}>
                      <Image color="action" />
                      <Typography sx={{ fontSize: '0.72rem', color: 'text.secondary' }}>
                        {removeImageRequested ? 'Image will be removed when saved' : 'No image selected'}
                      </Typography>
                    </Stack>
                  )}
                </Box>

                <Box sx={{ minWidth: 0, flex: 1 }}>
                  <Typography sx={{ fontWeight: 750, color: '#103B5C' }}>Product Image</Typography>
                  <Typography sx={{ mt: 0.25, fontSize: '0.76rem', color: 'text.secondary' }}>
                    This image is stored inside this BOM only. Replacing it does not change another BOM.
                  </Typography>
                  <Stack direction="row" flexWrap="wrap" gap={1} sx={{ mt: 1 }}>
                    <Button component="label" size="small" variant="outlined" startIcon={<FileUpload />} sx={{ textTransform: 'none' }} disabled={saving}>
                      {imageAttachment || imageFile ? 'Upload / Replace Image' : 'Upload Image'}
                      <input hidden type="file" accept="image/*" onChange={selectImage} />
                    </Button>
                    {(imageFile || (imageAttachment && !removeImageRequested)) && (
                      <Button size="small" variant="outlined" color="warning" startIcon={<Delete />} disabled={saving}
                        onClick={() => {
                          if (imageFile) { setImageFile(null); setImageError(''); }
                          else setRemoveImageRequested(true);
                        }} sx={{ textTransform: 'none' }}>
                        Remove Image
                      </Button>
                    )}
                    {removeImageRequested && (
                      <Button size="small" onClick={() => setRemoveImageRequested(false)} disabled={saving} sx={{ textTransform: 'none' }}>Undo Remove</Button>
                    )}
                  </Stack>
                  {imageFile && <Typography sx={{ mt: 0.6, fontSize: '0.72rem', color: 'text.secondary' }}>{imageFile.name}</Typography>}
                  {imageError && <Typography sx={{ mt: 0.6, fontSize: '0.72rem', color: 'error.main' }}>{imageError}</Typography>}
                </Box>
              </Stack>
            </Paper>

            <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', sm: 'center' }} spacing={1}>
              <Box>
                <Typography sx={{ fontWeight: 750, color: '#103B5C' }}>Child Colors</Typography>
                <Typography sx={{ fontSize: '0.76rem', color: 'text.secondary' }}>
                  These Child Colors are available only to material lines in this BOM. Existing IDs are retained when a row is renamed.
                </Typography>
              </Box>
              <Button size="small" startIcon={<Add />} variant="outlined"
                onClick={() => setForm((current) => ({ ...current, childColors: [...current.childColors, blankChildColor()] }))}
                disabled={saving} sx={{ textTransform: 'none' }}>
                Add Child Color
              </Button>
            </Stack>

            {duplicateChildColor && <Alert severity="error" sx={{ py: 0.4 }}>Duplicate Child Colors are not allowed.</Alert>}
            <Alert severity="info" sx={{ py: 0.4 }}>
              A Child Color that is already used by a Core or Packing material line cannot be deleted until that line is changed.
            </Alert>

            <TableContainer sx={{ border: '1px solid #e5e7eb', borderRadius: 1.5 }}>
              <Table size="small" sx={{ minWidth: 620 }}>
                <TableHead><TableRow>
                  <SortableTableCell label="No." sortable={false} sx={{ width: 64, fontWeight: 750, backgroundColor: '#f8fafc' }} />
                  <SortableTableCell label="Child Color / Comment" columnKey="childColor" sortKey={childSortKey} sortDirection={childSortDirection} onSort={requestChildSort} sx={{ fontWeight: 750, backgroundColor: '#f8fafc' }} />
                  <SortableTableCell label="Action" sortable={false} sx={{ width: 80, fontWeight: 750, backgroundColor: '#f8fafc' }} align="center" />
                </TableRow></TableHead>
                <TableBody>
                  {form.childColors.length === 0 && <TableRow><TableCell colSpan={3} sx={{ color: 'text.secondary', py: 2, textAlign: 'center' }}>No Child Color is entered yet.</TableCell></TableRow>}
                  {sortedEditableChildColors.map((item, index) => (
                    <TableRow key={item.id || `child-${item.__sourceIndex}`}>
                      <TableCell sx={{ color: 'text.secondary', fontWeight: 700 }}>{index + 1}</TableCell>
                      <TableCell><TextField size="small" required value={item.childColor} onChange={(event) => changeChildColor(item.__sourceIndex, event.target.value)} placeholder="MINERAL GREY YKK#181" fullWidth /></TableCell>
                      <TableCell align="center"><Tooltip title="Delete Child Color" arrow><span>
                        <IconButton color="error" size="small" onClick={() => removeChildColor(item.__sourceIndex)} disabled={saving}><Delete fontSize="small" /></IconButton>
                      </span></Tooltip></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Stack>
        </DialogContent>

        <DialogActions sx={{ p: 2 }}>
          <Button onClick={onClose} disabled={saving} sx={{ textTransform: 'none' }}>Cancel</Button>
          <Button variant="contained" disabled={saving || !canSave} onClick={submit} sx={{ textTransform: 'none', fontWeight: 700, backgroundColor: '#103B5C' }}>
            {saving ? 'Saving...' : record ? 'Save Product Color' : 'Add Product Color'}
          </Button>
        </DialogActions>
      </Dialog>

      <ConfirmDeleteDialog
        open={Boolean(childColorDeleteTarget)}
        title="Remove Child Color"
        subtitle="Please confirm before removing this Child Color from the BOM Product Color."
        message={<>Remove <b>{childColorDeleteTarget?.label}</b> from this Product Color?</>}
        warning="The change is applied when you save. If the Child Color is already used by a material line, the backend will block the deletion."
        itemName="Child Color"
        confirmText="Remove"
        deleting={saving}
        onClose={() => setChildColorDeleteTarget(null)}
        onConfirm={confirmRemoveChildColor}
      />
    </>
  );
}

function ProtectedAttachmentImage({ bomId, attachment, onOpen, height = 105 }) {
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
          height,
          objectFit: 'contain',
          display: 'block',
          backgroundColor: '#f8fafc',
          cursor: 'zoom-in'
        }}
      />
    );
  }

  return (
    <Stack
      alignItems="center"
      justifyContent="center"
      spacing={0.5}
      sx={{ height, backgroundColor: '#f8fafc' }}
    >
      <Image color={previewError ? 'disabled' : 'action'} />
      <Typography sx={{ fontSize: '0.66rem', color: 'text.secondary' }}>
        {previewError ? 'Preview unavailable' : 'Loading preview...'}
      </Typography>
    </Stack>
  );
}

function BomAttachmentImagePreviewDialog({ open, bomId, attachment, onClose }) {
  const [previewUrl, setPreviewUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    let active = true;
    let objectUrl = '';

    setPreviewUrl('');
    setLoadError(false);

    if (!open || !bomId || !attachment?.id) {
      setLoading(false);
      return undefined;
    }

    setLoading(true);
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
        if (active) setLoadError(true);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [open, bomId, attachment?.id]);

  const title = attachment?.originalFileName || 'BOM Image';

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
      <DialogTitle sx={{ pr: 7, py: 1.5, fontWeight: 750, color: '#103B5C' }}>
        <Typography noWrap sx={{ pr: 1, fontWeight: 750, color: '#103B5C' }}>
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
          <Typography sx={{ color: '#fff', fontWeight: 700 }}>Loading image...</Typography>
        )}

        {!loading && loadError && (
          <Stack spacing={1} alignItems="center" sx={{ color: '#fff', textAlign: 'center' }}>
            <Image sx={{ fontSize: 54, opacity: 0.8 }} />
            <Typography sx={{ fontWeight: 700 }}>Image preview is unavailable.</Typography>
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

function WholeBomImageCard({ bomId, attachment, saving, actionsDisabled, onUpload, onDelete, onOpen, onDownload }) {
  return (
    <Paper elevation={0} sx={{ ...bomOverviewCardSx, p: 0.8 }}>
      <OverviewCardTitle icon={<Image />} title="Whole BOM Image" />
      <Stack direction="row" spacing={0.8} alignItems="center" justifyContent="space-between">
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Tooltip title={attachment?.originalFileName || 'Whole BOM image'}>
            <Typography noWrap sx={{ fontSize: '.63rem', color: attachment ? '#667b90' : '#7a8c9f', mb: 0.3 }}>
              {attachment?.originalFileName || 'No image uploaded'}
            </Typography>
          </Tooltip>

          <Stack direction="row" flexWrap="wrap" gap={0.15} sx={{ '& .MuiButton-root': { minHeight: 22, px: 0.45, fontSize: '.61rem', textTransform: 'none' } }}>
            <Tooltip title={actionsDisabled ? 'BOM permission is required.' : ''} disableHoverListener={!actionsDisabled}>
              <span>
                <Button component="label" size="small" variant="text" disabled={actionsDisabled || saving}>
                  {attachment ? 'Replace' : 'Upload'}
                  <input hidden type="file" accept="image/*" onChange={onUpload} />
                </Button>
              </span>
            </Tooltip>
            {attachment && (
              <>
                <Button size="small" onClick={() => onOpen?.(attachment)}>Open</Button>
                <Button size="small" onClick={() => onDownload?.(attachment)}>Download</Button>
                <Tooltip title={actionsDisabled ? 'BOM permission is required.' : 'Delete image'}>
                  <span>
                    <IconButton size="small" color="error" disabled={actionsDisabled || saving} onClick={onDelete} sx={{ width: 22, height: 22 }}>
                      <Delete sx={{ fontSize: 13 }} />
                    </IconButton>
                  </span>
                </Tooltip>
              </>
            )}
          </Stack>
        </Box>

        <Box sx={{ width: 88, height: 58, flexShrink: 0, overflow: 'hidden', borderRadius: 1, border: '1px solid #e5eaf0', backgroundColor: '#f8fafc' }}>
          {attachment ? (
            <ProtectedAttachmentImage bomId={bomId} attachment={attachment} onOpen={onOpen} height={58} />
          ) : (
            <Stack alignItems="center" justifyContent="center" sx={{ height: 58 }}>
              <Image color="action" sx={{ fontSize: 18 }} />
            </Stack>
          )}
        </Box>
      </Stack>
    </Paper>
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
      <DialogTitle sx={{ pr: 7, py: 1.5, fontWeight: 750, color: '#103B5C' }}>
        <Typography noWrap sx={{ pr: 1, fontWeight: 750, color: '#103B5C' }}>
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
            <Typography sx={{ fontWeight: 700 }}>Image preview is unavailable.</Typography>
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

function BomLineImageCell({ bomId, line, onUpload, onDelete, onPreview, actionsDisabled = false, compact = false }) {
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
    <Stack direction="row" spacing={compact ? 0.35 : 0.5} alignItems="center" sx={{ minWidth: compact ? 76 : 118 }}>
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
          sx={{ width: compact ? 38 : 54, height: compact ? 38 : 54, objectFit: 'contain', border: '1px solid #dbe3ec', borderRadius: 1, cursor: 'zoom-in', backgroundColor: '#fff' }}
        />
      ) : (
        <Tooltip title={loadError ? 'Cannot create PNG preview. Check LibreOffice / LIBREOFFICE_PATH on the Backend server.' : ''}>
          <Box sx={{ width: compact ? 38 : 54, height: compact ? 38 : 54, display: 'grid', placeItems: 'center', border: '1px dashed #cbd5e1', borderRadius: 1, color: loadError ? '#dc2626' : '#94a3b8' }}>
            <Stack spacing={0} alignItems="center">
              <Image fontSize="small" />
              {loadError && <Typography sx={{ fontSize: '0.58rem', fontWeight: 700 }}>EMF</Typography>}
            </Stack>
          </Box>
        </Tooltip>
      )}
      <Stack spacing={0.05} sx={{ '& .MuiIconButton-root': compact ? { width: 24, height: 24 } : undefined }}>
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

const BOM_LINE_COLUMN_SIZES = {
  'No.': { minWidth: 58, maxWidth: 72 },
  Material: { minWidth: 180, maxWidth: 230 },
  'Material Type': { minWidth: 135, maxWidth: 170 },
  Image: { minWidth: 130, maxWidth: 155 },
  'SAP Code': { minWidth: 120, maxWidth: 155 },
  'Detail No': { minWidth: 100, maxWidth: 125 },
  Position: { minWidth: 250, maxWidth: 320 },
  'Position Description': { minWidth: 300, maxWidth: 380 },
  P: { minWidth: 80, maxWidth: 95 },
  X: { minWidth: 120, maxWidth: 145 },
  Y: { minWidth: 120, maxWidth: 145 },
  'Q.TY': { minWidth: 120, maxWidth: 145 },
  '><': { minWidth: 100, maxWidth: 120 },
  'Legacy Costing / MK': { minWidth: 160, maxWidth: 195 },
  'Legacy Costing / Unit': { minWidth: 160, maxWidth: 195 },
  'Detail CONS.': { minWidth: 170, maxWidth: 210 },
  'Consumption MPR': { minWidth: 145, maxWidth: 175 },
  'Consumption Unit': { minWidth: 110, maxWidth: 140 },
  'Remarks On BOM': { minWidth: 280, maxWidth: 360 },
  'Additional Remarks': { minWidth: 280, maxWidth: 360 },
  'Product Colors': { minWidth: 230, maxWidth: 320 }
};

const BOM_LINE_OVERVIEW_COLUMNS = [
  'No.', 'Material', 'Image', 'SAP Code', 'Position', 'Consumption MPR', 'Consumption Unit', 'Product Colors'
];

const BOM_LINE_VIEW_PRESETS = [
  { label: 'Overview', keys: BOM_LINE_OVERVIEW_COLUMNS },
  { label: 'Cutting Details', keys: ['No.', 'Material', 'Image', 'SAP Code', 'Position', 'P', 'X', 'Y', 'Q.TY', '><', 'Remarks On BOM'] },
  { label: 'Consumption', keys: ['No.', 'Material', 'Image', 'SAP Code', 'Position', 'Detail CONS.', 'Consumption MPR', 'Consumption Unit', 'Remarks On BOM'] },
  { label: 'Product Colors', keys: ['No.', 'Material', 'Image', 'SAP Code', 'Position', 'Product Colors', 'Remarks On BOM'] }
];

function LineTable({ bomId, rows, productColors = [], onEdit, onDelete, onAttach, onImageUpload, onImageDelete, onImagePreview, emptyText = 'No BOM lines.', actionsDisabled = false }) {
  const columns = [
    ['No.', (line) => line.materialGroupNo],
    ['Material', null],
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
  const [visibleLabels, setVisibleLabels] = useState(BOM_LINE_OVERVIEW_COLUMNS);
  const visibleColumns = columns.filter(([label]) => visibleLabels.includes(label));
  const { sortedRows, sortKey, sortDirection, requestSort } = useTableSort(rows, {
    getValue: (line, key) => {
      if (key === 'Material') return line.materialType || line.materialName || '';
      if (key === 'Image') return line.primaryImage?.fileName || line.primaryImage?.originalFileName || '';
      const column = columns.find(([label]) => label === key);
      return column?.[1] ? column[1](line) : line?.[key];
    }
  });
  const tableMinWidth = Math.max(1010, visibleColumns.reduce((total, [label]) => total + Number(BOM_LINE_COLUMN_SIZES[label]?.minWidth || 110), 0) + 120);

  return (
    <>
      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'stretch', sm: 'center' }} spacing={0.7} sx={{ px: 0.8, py: 0.45, borderBottom: '1px solid #e5e7eb', bgcolor: '#fff' }}>
        <Typography sx={{ fontSize: '.71rem', color: '#60758a', fontWeight: 600 }}>
          {rows.length} materials
        </Typography>
        <ColumnVisibilityMenu
          columns={columns.map(([label]) => ({ key: label, label }))}
          visibleKeys={visibleLabels}
          lockedKeys={['No.', 'Material', 'Image', 'Position', 'Consumption MPR']}
          onChange={setVisibleLabels}
          onCompact={() => setVisibleLabels(BOM_LINE_OVERVIEW_COLUMNS)}
          compactLabel="Overview"
          presets={BOM_LINE_VIEW_PRESETS.filter((preset) => preset.label !== 'Overview')}
        />
      </Stack>
      <TableContainer sx={{ overflowX: 'auto', maxHeight: 560 }}>
      <Table stickyHeader size="small" sx={{ minWidth: tableMinWidth }}>
        <TableHead>
          <TableRow>
            {visibleColumns.map(([label]) => (
              <SortableTableCell
                key={label}
                label={label}
                columnKey={label}
                sortKey={sortKey}
                sortDirection={sortDirection}
                onSort={requestSort}
                sortable={label !== 'No.'}
                sx={{
                  fontWeight: 750,
                  fontSize: '0.72rem',
                  backgroundColor: '#f8fafc',
                  whiteSpace: 'nowrap',
                  minWidth: BOM_LINE_COLUMN_SIZES[label]?.minWidth,
                  maxWidth: BOM_LINE_COLUMN_SIZES[label]?.maxWidth,
                  ...(label === 'No.' ? { position: 'sticky', left: 0, zIndex: 6, boxShadow: '1px 0 0 #e5e7eb' } : {}),
                  ...(label === 'Material' ? { position: 'sticky', left: 58, zIndex: 6, boxShadow: '1px 0 0 #e5e7eb' } : {})
                }}
              />
            ))}
            <TableCell sx={{ minWidth: 112, fontWeight: 750, fontSize: '0.72rem', backgroundColor: '#f8fafc', whiteSpace: 'nowrap', position: 'sticky', right: 0, zIndex: 6, boxShadow: '-1px 0 0 #e5e7eb' }}>Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {!rows.length ? (
            <EmptyTableState colSpan={visibleColumns.length + 1} title={emptyText} description="" />
          ) : sortedRows.map((line) => (
            <TableRow key={line.id} hover data-bom-line-id={line.id} sx={{ scrollMarginTop: 96 }}>
              {visibleColumns.map(([label, render]) => (
                <TableCell
                  key={label}
                  sx={{
                    fontSize: '0.75rem',
                    verticalAlign: 'top',
                    minWidth: BOM_LINE_COLUMN_SIZES[label]?.minWidth,
                    maxWidth: BOM_LINE_COLUMN_SIZES[label]?.maxWidth,
                    whiteSpace: 'normal',
                    wordBreak: 'break-word',
                    ...(label === 'No.' ? { position: 'sticky', left: 0, zIndex: 2, backgroundColor: '#fff', boxShadow: '1px 0 0 #e5e7eb' } : {}),
                    ...(label === 'Material' ? { position: 'sticky', left: 58, zIndex: 2, backgroundColor: '#fff', boxShadow: '1px 0 0 #e5e7eb' } : {})
                  }}
                >
                  {label === 'Material' ? (
                    <Stack direction="row" spacing={0.65} alignItems="center" sx={{ minWidth: 0 }}>
                      <BomLineImageCell
                        bomId={bomId}
                        line={line}
                        onUpload={onImageUpload}
                        onDelete={onImageDelete}
                        onPreview={onImagePreview}
                        actionsDisabled={actionsDisabled}
                        compact
                      />
                      <Box sx={{ minWidth: 0 }}>
                        <Typography sx={{ fontSize: '.75rem', fontWeight: 650, color: '#20354b', lineHeight: 1.25, overflowWrap: 'anywhere' }}>
                          {line.materialType || 'Material'}
                        </Typography>
                        {line.detailNo && (
                          <Typography sx={{ mt: 0.12, fontSize: '.64rem', color: '#7a8da0' }}>Detail {line.detailNo}</Typography>
                        )}
                      </Box>
                    </Stack>
                  ) : label === 'Image'
                    ? <BomLineImageCell bomId={bomId} line={line} onUpload={onImageUpload} onDelete={onImageDelete} onPreview={onImagePreview} actionsDisabled={actionsDisabled} />
                    : (render(line) ?? '—')}
                </TableCell>
              ))}
              <TableCell sx={{ minWidth: 112, whiteSpace: 'nowrap', position: 'sticky', right: 0, zIndex: 2, backgroundColor: '#fff', boxShadow: '-1px 0 0 #e5e7eb' }}>
                <Tooltip title={actionsDisabled ? 'BOM permission is required to modify BOM data.' : 'Add Line File'}><span><IconButton size="small" disabled={actionsDisabled} onClick={() => onAttach(line)}><Image fontSize="small" /></IconButton></span></Tooltip>
                <Tooltip title={actionsDisabled ? 'BOM permission is required to modify BOM data.' : 'Edit'}><span><IconButton size="small" disabled={actionsDisabled} onClick={() => onEdit(line)}><Edit fontSize="small" /></IconButton></span></Tooltip>
                <Tooltip title={actionsDisabled ? 'BOM permission is required to modify BOM data.' : 'Delete'}><span><IconButton size="small" color="error" disabled={actionsDisabled} onClick={() => onDelete(line)}><Delete fontSize="small" /></IconButton></span></Tooltip>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
    </>
  );
}

export default function BomDetailPage() {
  const { buyerKey: routeBuyerKey, orderId, bomId } = useParams();
  const buyerKey = normalizeBuyerKey(routeBuyerKey);
  const llBeanExcelEnabled = buyerKey === 'LLBEAN';
  const buyerFormatMessage = 'BOM Excel replacement is currently configured for L.L.BEAN only.';
  const fileRef = useRef(null);
  const lineAttachmentInputRef = useRef(null);
  const excelUploadTickerRef = useRef(null);
  const scrollRestoreRef = useRef(null);
  const scrollTargetRef = useRef(null);

  const [bom, setBom] = useState(null);
  // MPR completed for this order -> every BOM action is locked until it is reopened.
  const mprLocked = Boolean(bom?.orderMprCompleted);
  const canWrite = canManageBom() && !mprLocked;
  const writeBlockedMessage = mprLocked
    ? 'BOM is locked because the MPR for this order has been completed. Reopen the MPR to make changes.'
    : 'BOM permission is required to modify BOM data.';
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [headerOpen, setHeaderOpen] = useState(false);
  const [downloadAnchorEl, setDownloadAnchorEl] = useState(null);
  const [headerForm, setHeaderForm] = useState({});
  const [lineCtx, setLineCtx] = useState(null);
  const [packingCtx, setPackingCtx] = useState(null);
  const [productColorCtx, setProductColorCtx] = useState(null);
  const [notice, setNotice] = useState({ open: false, severity: 'success', message: '' });
  const [pendingAttachmentLineId, setPendingAttachmentLineId] = useState('');
  const [lineFilters, setLineFilters] = useState(emptyLineFilters);
  const [linePages, setLinePages] = useState({});
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteSaving, setDeleteSaving] = useState(false);
  const [imagePreviewLine, setImagePreviewLine] = useState(null);
  const [attachmentPreview, setAttachmentPreview] = useState(null);
  const [excelUploadProgress, setExcelUploadProgress] = useState(initialUploadProgress());

  const notify = useCallback((message, severity = 'success') => setNotice({ open: true, severity, message }), []);

  const load = useCallback(async ({ keepScroll = false, showLoading = true } = {}) => {
    const scrollY = keepScroll && typeof window !== 'undefined' ? window.scrollY : null;

    try {
      if (showLoading) setLoading(true);
      const data = await getBom(bomId, buyerKey);

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
  const rootAttachments = useMemo(
    () => (bom?.attachments || []),
    [bom]
  );
  const bomAttachments = useMemo(
    () => rootAttachments.filter((item) => String(item.scope || 'BOM').toUpperCase() === 'BOM'),
    [rootAttachments]
  );
  const wholeBomImages = useMemo(
    () => bomAttachments.filter(isImageAttachment),
    [bomAttachments]
  );
  const wholeBomImage = wholeBomImages.length ? wholeBomImages[wholeBomImages.length - 1] : null;

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

  const saveProductColor = async (dialogPayload) => {
    if (!canWrite) { notify(writeBlockedMessage, 'warning'); return; }
    const isCreate = !productColorCtx?.record?.id;
    const bomPayload = dialogPayload?.bomPayload || {};

    try {
      setSaving(true);
      let savedBom;
      let productColorId = productColorCtx?.record?.id || '';

      if (isCreate) {
        savedBom = await addBomProductColor(bomId, bomPayload);
        productColorId = resolveCreatedProductColorId(null, savedBom, bomPayload);
        if (!productColorId) throw new Error('Product Color was saved but its ID was not returned.');
      } else {
        savedBom = await updateBomProductColor(bomId, productColorId, bomPayload);
      }

      let imageActionFailed = false;
      try {
        if (dialogPayload?.imageFile) {
          await uploadBomAttachment(bomId, dialogPayload.imageFile, {
            scope: 'COLOR',
            productColorId,
            colorKey: bomPayload.colorName
          });
        } else if (dialogPayload?.removeImage && dialogPayload?.imageAttachmentId) {
          await deleteBomAttachment(bomId, dialogPayload.imageAttachmentId);
        }
      } catch (imageError) {
        imageActionFailed = true;
      }

      setProductColorCtx(null);
      const nextBom = await load({ keepScroll: !isCreate, showLoading: false });
      if (isCreate) scrollToCreatedTarget(`[data-bom-product-color-id="${cssAttributeEscape(productColorId)}"]`);

      if (imageActionFailed) {
        notify('Product Color and Child Colors were saved, but the BOM-local image change could not be completed.', 'warning');
      } else {
        notify(isCreate ? 'Product Color was added to this BOM.' : 'Product Color, Child Colors and image were updated for this BOM.');
      }
      return nextBom || savedBom;
    } catch (error) {
      notify(getApiError(error, 'Unable to save Product Color in this BOM.'), 'error');
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
      notify('BOM Excel replaced. Product / Style Colors, Child Colors, images, materials and packings were imported into this BOM.');
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

    const options = target || { scope: 'BOM', lineId: '' };

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


  const chooseLineAttachment = (line) => {
    if (!canWrite) { notify(writeBlockedMessage, 'warning'); return; }
    if (!line?.id) return;
    setPendingAttachmentLineId(line.id);
    requestAnimationFrame(() => lineAttachmentInputRef.current?.click());
  };

  const uploadPendingLineAttachment = async (event) => {
    const lineId = pendingAttachmentLineId;
    if (!lineId) {
      event.target.value = '';
      return;
    }
    await uploadAttachment(event, { scope: 'LINE', lineId });
    setPendingAttachmentLineId('');
  };

  const deleteWholeBomImage = async () => {
    if (!canWrite) { notify(writeBlockedMessage, 'warning'); return; }
    if (!wholeBomImages.length) return;
    try {
      setSaving(true);
      for (const attachment of wholeBomImages) {
        await deleteBomAttachment(bomId, attachment.id);
      }
      notify('Whole BOM image deleted.');
      await reloadWithoutJump();
    } catch (error) {
      notify(getApiError(error, 'Unable to delete Whole BOM image.'), 'error');
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
    if (isImageAttachment(attachment)) {
      setAttachmentPreview(attachment);
      return;
    }

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

  const bomDownloadDate = () => {
    const now = new Date();
    const pad = (value) => String(value).padStart(2, '0');
    return `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}`;
  };

  const bomDownloadPart = (value, fallback) => {
    const safe = String(value || fallback || '').trim()
      .replace(/[^A-Za-z0-9._-]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_+|_+$/g, '');
    return safe || fallback;
  };

  const bomDownloadName = (template = false) => {
    const buyer = bomDownloadPart(buyerKey, 'BUYER');
    const bomNo = bomDownloadPart(bom?.bomNo, 'BOM');
    const date = bomDownloadDate();
    return template
      ? `BOM_Upload_Template_${buyer}_${bomNo}_${date}.xlsx`
      : `BOM_${buyer}_${bomNo}_${date}.xlsx`;
  };

  const downloadBomUploadTemplate = async () => {
    try {
      await downloadWithAuth(getBomTemplateUrl(bomId), bomDownloadName(true));
      notify('Blank BOM template downloaded in the same layout as Export Original Format.');
    } catch (error) {
      notify(getApiError(error, 'Unable to download the BOM upload template.'), 'error');
    }
  };

  const exportOriginalFormat = async () => {
    try {
      await downloadWithAuth(getBomExportUrl(bomId), bomDownloadName(false));
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
      } else if (deleteTarget.type === 'wholeBomImage') {
        await deleteWholeBomImage();
      }
      setDeleteTarget(null);
    } finally {
      setDeleteSaving(false);
    }
  };

  if (loading || !bom) {
    return <Box sx={{ p: 4, textAlign: 'center' }}><Typography>Loading BOM...</Typography></Box>;
  }

  return (
    <Box sx={{ p: { xs: 0.75, sm: 1, md: 1.25 } }}>
      {mprLocked && (
        <Alert severity="warning" sx={{ mb: 1 }}>
          This order's MPR has been completed, so this BOM is locked (read-only). Reopen the MPR to make changes.
        </Alert>
      )}
      <Box id="bom-overview" sx={{ scrollMarginTop: 88, mb: 0.75 }}>
        <Stack direction={{ xs: 'column', lg: 'row' }} justifyContent="space-between" alignItems={{ xs: 'stretch', lg: 'flex-start' }} spacing={0.8} sx={{ mb: 0.65 }}>
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Stack direction="row" spacing={0.7} alignItems="center" flexWrap="wrap" useFlexGap>
              <Button
                component={RouterLink}
                to={buyerPath(buyerKey, `orders/${orderId}`)}
                size="small"
                variant="text"
                startIcon={<ArrowBackOutlined sx={{ fontSize: '15px !important' }} />}
                sx={{ px: 0.35, minHeight: 24, color: '#49657f', fontSize: '.68rem', textTransform: 'none' }}
              >
                Back to Order
              </Button>
              <Typography
                sx={{
                  fontSize: { xs: '1rem', sm: '1.16rem' },
                  fontWeight: 750,
                  color: '#132b45',
                  letterSpacing: '-0.012em',
                  lineHeight: 1.2
                }}
              >
                {bom.bomNo} — {bom.bomName}
              </Typography>
              <StatusBadge status={bom.status} />
            </Stack>

            <Stack direction="row" spacing={0.7} alignItems="center" flexWrap="wrap" useFlexGap sx={{ mt: 0.35 }}>
              <Typography noWrap sx={{ maxWidth: 720, fontSize: '.68rem', color: '#60758a' }}>
                {[bom.header?.styleName, bom.header?.season, bom.header?.patternNumber].filter(Boolean).join(' · ') || 'BOM detail'}
              </Typography>
              <Chip size="small" label={`${productColors.length} Colors`} variant="outlined" sx={{ height: 22, fontSize: '.61rem', bgcolor: '#fff', borderColor: '#d8e1eb' }} />
              <Chip size="small" label={`${(bom.packings || []).length} Packings`} variant="outlined" sx={{ height: 22, fontSize: '.61rem', bgcolor: '#fff', borderColor: '#d8e1eb' }} />
              {bom.sourceFileName && (
                <Tooltip title={bom.sourceFileName}>
                  <Chip
                    size="small"
                    icon={<DescriptionOutlined sx={{ fontSize: '13px !important' }} />}
                    label="Source Excel"
                    variant="outlined"
                    sx={{ height: 22, fontSize: '.61rem', bgcolor: '#fff', borderColor: '#d8e1eb' }}
                  />
                </Tooltip>
              )}
            </Stack>
          </Box>

          <Stack
            direction="row"
            flexWrap="wrap"
            justifyContent={{ xs: 'flex-start', lg: 'flex-end' }}
            alignItems="center"
            gap={0.55}
            sx={{ '& .MuiButton-root': { ...compactActionButtonSx, minHeight: 31, height: 31, px: 1, fontSize: '.7rem' } }}
          >
            <Button
              size="small"
              variant="outlined"
              startIcon={<FileDownload />}
              endIcon={<KeyboardArrowDown />}
              onClick={(event) => setDownloadAnchorEl(event.currentTarget)}
              sx={{ color: '#2f4b65', borderColor: '#cbd7e3', bgcolor: '#fff' }}
            >
              Download
            </Button>
            <Menu
              anchorEl={downloadAnchorEl}
              open={Boolean(downloadAnchorEl)}
              onClose={() => setDownloadAnchorEl(null)}
              PaperProps={{ sx: { minWidth: 220, mt: 0.5, border: '1px solid #e2e8f0', boxShadow: '0 12px 32px rgba(15,23,42,.12)' } }}
            >
              <MenuItem onClick={() => { setDownloadAnchorEl(null); downloadBomUploadTemplate(); }}>
                <ListItemIcon><FileDownload fontSize="small" /></ListItemIcon>
                BOM Template
              </MenuItem>
              <MenuItem onClick={() => { setDownloadAnchorEl(null); exportOriginalFormat(); }}>
                <ListItemIcon><FileDownload fontSize="small" /></ListItemIcon>
                Export Original Format
              </MenuItem>
            </Menu>
            <Tooltip title={!canWrite ? writeBlockedMessage : (!llBeanExcelEnabled ? buyerFormatMessage : 'Replace BOM Excel')}>
              <span>
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<FileUpload />}
                  onClick={() => fileRef.current?.click()}
                  disabled={saving || !canWrite || !llBeanExcelEnabled}
                  sx={{ color: '#2f4b65', borderColor: '#cbd7e3', bgcolor: '#fff' }}
                >
                  Replace Excel
                </Button>
              </span>
            </Tooltip>
            <input ref={fileRef} type="file" accept=".xls,.xlsx" hidden onChange={uploadExcel} />
            <input ref={lineAttachmentInputRef} type="file" accept="image/*,.pdf,.xlsx,.xls,.doc,.docx" hidden onChange={uploadPendingLineAttachment} />
            <Tooltip title={!canWrite ? writeBlockedMessage : 'Edit BOM header'}>
              <span>
                <Button
                  size="small"
                  variant="contained"
                  startIcon={<Edit />}
                  onClick={() => setHeaderOpen(true)}
                  disabled={!canWrite}
                  sx={{ backgroundColor: '#0b3a5b', '&:hover': { backgroundColor: '#082f4b' } }}
                >
                  Edit Header
                </Button>
              </span>
            </Tooltip>
          </Stack>
        </Stack>

        {!llBeanExcelEnabled && (
          <Alert severity="info" sx={{ mb: 1 }}>
            {buyerFormatMessage} Manual BOM maintenance remains available.
          </Alert>
        )}

        <Box
          sx={{
            borderBottom: '1px solid #dfe6ee',
            mb: 0.7,
            display: 'flex',
            alignItems: 'center',
            gap: 0.2,
            overflowX: 'auto',
            '& .MuiButton-root': {
              minWidth: 'auto',
              px: 0.95,
              py: 0.55,
              borderRadius: 0,
              textTransform: 'none',
              fontSize: '.7rem',
              fontWeight: 650,
              whiteSpace: 'nowrap',
              color: '#31465b'
            }
          }}
        >
          <Button sx={{ color: '#0a6ed1 !important', borderBottom: '2px solid #0a6ed1' }} onClick={() => document.getElementById('bom-overview')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}>Overview</Button>
          <Button onClick={() => document.getElementById('bom-core-materials')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}>Core Materials</Button>
          <Button onClick={() => document.getElementById('bom-packings')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}>Packing</Button>
          <Button onClick={() => document.getElementById('bom-product-colors')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}>Product Colors</Button>
        </Box>

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', lg: 'minmax(0, 3fr) minmax(285px, 1fr)' },
            gap: 0.7,
            alignItems: 'stretch'
          }}
        >
          <Paper elevation={0} sx={{ ...bomOverviewCardSx, p: { xs: 0.8, sm: 0.9 }, minWidth: 0 }}>
            <OverviewCardTitle icon={<LayersOutlined />} title="BOM Information" />

            <TableContainer
              component={Box}
              sx={{
                border: `1px solid ${overviewGridLine}`,
                borderRadius: 1,
                overflowX: 'auto',
                backgroundColor: '#fff'
              }}
            >
              <Table
                size="small"
                sx={{
                  tableLayout: 'fixed',
                  minWidth: 820,
                  '& td': { boxSizing: 'border-box' }
                }}
              >
                <colgroup>
                  <col style={{ width: 116 }} />
                  <col style={{ width: '25%' }} />
                  <col style={{ width: '25%' }} />
                  <col style={{ width: '25%' }} />
                  <col style={{ width: '25%' }} />
                </colgroup>
                <TableBody>
                  <OverviewInfoGroup title="Product">
                    <OverviewInfoCell label="Style Number" value={bom.header?.styleNumber} strong />
                    <OverviewInfoCell label="Style Name" value={bom.header?.styleName} strong />
                    <OverviewInfoCell label="Buyer" value={bom.header?.buyer} />
                    <OverviewInfoCell empty />
                  </OverviewInfoGroup>

                  <OverviewInfoGroup title="Pattern / Season">
                    <OverviewInfoCell label="Season" value={bom.header?.season} />
                    <OverviewInfoCell label="Pattern Number" value={bom.header?.patternNumber} />
                    <OverviewInfoCell label="Pattern Date" value={bom.header?.patternDate} />
                    <OverviewInfoCell label="Pattern Maker" value={bom.header?.patternMaker} />
                  </OverviewInfoGroup>

                  <OverviewInfoGroup title="BOM / Factory">
                    <OverviewInfoCell label="BOM Maker" value={bom.header?.bomMaker} />
                    <OverviewInfoCell label="BOM Date" value={bom.header?.bomDate} />
                    <OverviewInfoCell label="Revised Date" value={bom.header?.patternRevisedDate} />
                    <OverviewInfoCell label="Factory Product" value={bom.header?.factoryProduct} />
                  </OverviewInfoGroup>

                  <OverviewInfoGroup title="Additional" subtle>
                    <OverviewInfoCell label="Rev. Stage" value={bom.header?.revStage} />
                    <OverviewInfoCell label="Marker Date" value={bom.header?.markerDate} />
                    <OverviewInfoCell label="Marker Maker" value={bom.header?.markerMaker} />
                    <OverviewInfoCell label="Size (W x H x D)" value={bom.header?.size} />
                  </OverviewInfoGroup>
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>

          <Stack spacing={0.65} sx={{ minWidth: 0 }}>
            <Paper elevation={0} sx={{ ...bomOverviewCardSx, p: 0.8, flex: 1, minHeight: 64 }}>
              <OverviewCardTitle icon={<ChatBubbleOutline />} title="Comments" />
              <Typography
                sx={{
                  fontSize: '.69rem',
                  fontWeight: 500,
                  color: '#31465b',
                  whiteSpace: 'pre-wrap',
                  lineHeight: 1.35,
                  display: '-webkit-box',
                  WebkitLineClamp: 3,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden'
                }}
              >
                {bom.header?.comments || '—'}
              </Typography>
            </Paper>

            <WholeBomImageCard
              bomId={bomId}
              attachment={wholeBomImage}
              saving={saving}
              actionsDisabled={!canWrite}
              onUpload={(event) => uploadAttachment(event, { scope: 'BOM', lineId: '' })}
              onOpen={openAttachment}
              onDownload={downloadAttachment}
              onDelete={() => requestDelete({
                type: 'wholeBomImage',
                id: wholeBomImage?.id,
                itemName: 'Whole BOM Image',
                label: wholeBomImage?.originalFileName || 'Whole BOM image',
                message: <>Delete the Whole BOM image?</>,
                warning: 'This removes the image displayed below Comments.'
              })}
            />
          </Stack>
        </Box>

      </Box>

      <Paper id="bom-core-materials" elevation={0} sx={{ scrollMarginTop: 88, border: '1px solid #e5e7eb', borderRadius: 1.7, overflow: 'hidden', mb: 1 }}>
        <SectionHeader
          title="Core Materials"
          compact
          subtitle={`${lineFilters.source && lineFilters.source !== '__CORE__' ? 0 : filteredCoreLines.length} of ${bom.coreLineCount ?? (bom.coreLines || []).length} materials · use View for cutting, consumption or product-color fields`}
          actions={(
            <Tooltip title={!canWrite ? writeBlockedMessage : 'Add Core Material Line'}>
              <span>
                <Button
                  startIcon={<Add />}
                  size="small"
                  disabled={!canWrite}
                  onClick={() => setLineCtx({ record: null, packingId: '' })}
                  sx={{ textTransform: 'none', whiteSpace: 'nowrap', minHeight: 28, px: 0.8 }}
                >
                  Add Line
                </Button>
              </span>
            </Tooltip>
          )}
        />
        <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 0.55, px: 0.75, py: 0.6, borderBottom: '1px solid #e5e7eb', bgcolor: '#fbfcfe' }}>
          <TextField
            size="small"
            label="Keyword"
            value={lineFilters.keyword}
            onChange={(event) => setLineFilters((current) => ({ ...current, keyword: event.target.value }))}
            placeholder="SAP Code, description, child color..."
            sx={{ minWidth: { xs: '100%', md: 220 }, flex: 1, '& .MuiInputBase-root': { height: 32 } }}
          />
          <TextField
            size="small"
            select
            label="Product Color"
            value={lineFilters.productColorId}
            onChange={(event) => setLineFilters((current) => ({ ...current, productColorId: event.target.value }))}
            sx={{ minWidth: 150, '& .MuiInputBase-root': { height: 32 } }}
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
            sx={{ minWidth: 145, '& .MuiInputBase-root': { height: 32 } }}
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
            sx={{ minWidth: 150, '& .MuiInputBase-root': { height: 32 } }}
          >
            <MenuItem value="">Core + All Packings</MenuItem>
            <MenuItem value="__CORE__">Core BOM (No Packing)</MenuItem>
            {(bom.packings || []).map((packing) => <MenuItem key={packing.id} value={packing.id}>{packing.packingName || 'Packing'}</MenuItem>)}
          </TextField>
          <Button
            variant="outlined"
            startIcon={<RestartAlt />}
            onClick={() => setLineFilters(emptyLineFilters)}
            sx={{ textTransform: 'none', minHeight: 32, height: 32, px: 1 }}
          >
            Reset
          </Button>
        </Box>
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
          onAttach={chooseLineAttachment}
          onImageUpload={uploadLineImage}
          onImageDelete={removeLineImage}
          onImagePreview={setImagePreviewLine}
          actionsDisabled={!canWrite}
        />
        {linePages.__CORE__ && !linePages.__CORE__.last && (
          <Button size="small" onClick={() => loadMoreLines('')} sx={{ mt: 1, textTransform: 'none' }}>Load More Core Lines</Button>
        )}
      </Paper>

      <Paper id="bom-packings" elevation={0} sx={{ scrollMarginTop: 88, border: '1px solid #e5e7eb', borderRadius: 1.7, mb: 0.8, overflow: 'hidden' }}>
        <SectionHeader
          title={`Packings (${(bom.packings || []).length})`}
          compact
          actions={(
            <Tooltip title={!canWrite ? writeBlockedMessage : 'Add Packing'}>
              <span><Button startIcon={<Add />} variant="contained" size="small" disabled={!canWrite} onClick={() => setPackingCtx({ record: null })} sx={{ backgroundColor: '#103B5C' }}>Add Packing</Button></span>
            </Tooltip>
          )}
        />
      </Paper>

      {(bom.packings || [])
        .filter((packing) => !lineFilters.source || lineFilters.source === packing.id)
        .map((packing) => {
        const filteredPackingLines = (packing.lines || []).filter((line) => lineMatchesFilters(line, lineFilters, productColors));

        return (
          <Accordion
            key={packing.id}
            data-bom-packing-id={packing.id}
            sx={{
              scrollMarginTop: 96,
              mb: 0.55,
              border: '1px solid #e5e7eb',
              borderRadius: '7px !important',
              boxShadow: 'none',
              overflow: 'hidden',
              '&:before': { display: 'none' }
            }}
          >
            <AccordionSummary
              component="div"
              expandIcon={<ExpandMore sx={{ fontSize: 18 }} />}
              sx={{ minHeight: 38, px: 1, '& .MuiAccordionSummary-content': { my: 0.45 } }}
            >
              <Stack direction="row" spacing={0.65} alignItems="center" sx={{ width: 1, pr: 0.5 }}>
                <Typography sx={{ fontWeight: 700, fontSize: '.76rem' }}>{packing.packingName}</Typography>
                <Chip size="small" label={`${filteredPackingLines.length}/${packing.lineCount ?? (packing.lines || []).length} Lines`} sx={{ height: 21, fontSize: '.6rem' }} />
                <Box sx={{ flex: 1 }} />
                <Tooltip title={!canWrite ? writeBlockedMessage : 'Add Packing Line'}>
                  <span>
                    <Button
                      size="small"
                      startIcon={<Add />}
                      disabled={!canWrite}
                      onClick={(event) => {
                        event.stopPropagation();
                        setLineCtx({ record: null, packingId: packing.id });
                      }}
                      sx={{ textTransform: 'none', whiteSpace: 'nowrap', minHeight: 28, px: 0.8 }}
                    >
                      Add Line
                    </Button>
                  </span>
                </Tooltip>
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
            <AccordionDetails sx={{ p: 0.8 }}>
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
                  onAttach={chooseLineAttachment}
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

      <Paper id="bom-product-colors" elevation={0} sx={{ scrollMarginTop: 88, border: '1px solid #e2e8f0', borderRadius: 1.7, mt: 0.8, overflow: 'hidden' }}>
        <SectionHeader
          title={`Product Colors (${productColors.length})`}
          subtitle="Product Colors, Child Colors and images are maintained separately inside this BOM."
          actions={(
            <Tooltip title={!canWrite ? writeBlockedMessage : 'Add Product Color'}>
              <span><Button size="small" variant="contained" startIcon={<Add />} disabled={!canWrite} onClick={() => setProductColorCtx({ record: null })} sx={{ backgroundColor: '#103B5C' }}>Add Product Color</Button></span>
            </Tooltip>
          )}
          compact
        />

        {!productColors.length ? (
          <Box sx={{ m: 1.25, py: 3, textAlign: 'center', border: '1px dashed #cbd5e1', borderRadius: 1.5, backgroundColor: '#f8fafc' }}>
            <Typography sx={{ fontSize: '0.8rem', color: 'text.secondary' }}>No Product Color is configured for this BOM.</Typography>
          </Box>
        ) : (
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))', xl: 'repeat(3, minmax(0, 1fr))' }, gap: 0.7, m: 0.8 }}>
            {productColors.map((productColor) => {
              const imageAttachment = productColorImageAttachment(bom, productColor.id);
              return (
                <Paper key={productColor.id} elevation={0} data-bom-product-color-id={productColor.id} sx={{ p: 0.75, border: '1px solid #e2e8f0', borderRadius: 1.25, scrollMarginTop: 96 }}>
                  <Stack direction="row" spacing={0.7} alignItems="center">
                    <Box sx={{ width: 86, flexShrink: 0, overflow: 'hidden', borderRadius: 1 }}>
                      {imageAttachment ? (
                        <ProtectedAttachmentImage bomId={bomId} attachment={imageAttachment} height={64} />
                      ) : (
                        <Stack alignItems="center" justifyContent="center" sx={{ height: 64, backgroundColor: '#f8fafc', borderRadius: 1 }}>
                          <Image sx={{ fontSize: 20, color: '#94a3b8' }} />
                        </Stack>
                      )}
                    </Box>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography noWrap sx={{ fontWeight: 750, fontSize: '0.75rem' }}>{productColor.colorName || 'Product Color'}</Typography>
                      <Typography noWrap sx={{ mt: 0.2, fontSize: '0.66rem', color: 'text.secondary' }}>
                        {[productColor.patternNumber, productColor.season, productColor.styleNumber].filter(Boolean).join(' · ') || 'No Product Color information'}
                      </Typography>
                      <Chip size="small" variant="outlined" label={`${(productColor.childColors || []).length} child color(s)`} sx={{ mt: 0.4, height: 20, fontSize: '0.59rem' }} />
                    </Box>
                    <Stack spacing={0.25}>
                      <Tooltip title={!canWrite ? writeBlockedMessage : 'Edit Product Color and image'}>
                        <span><IconButton size="small" disabled={!canWrite} onClick={() => setProductColorCtx({ record: productColor })}><Edit fontSize="small" /></IconButton></span>
                      </Tooltip>
                      <Tooltip title={!canWrite ? writeBlockedMessage : 'Remove Product Color from BOM'}>
                        <span><IconButton size="small" color="error" disabled={!canWrite} onClick={() => requestDelete({
                          type: 'productColor',
                          id: productColor.id,
                          itemName: 'Product Color',
                          label: productColorLabel(productColor) || productColor.colorName || 'this Product Color',
                          message: <>Delete <b>{productColor.colorName || 'this Product Color'}</b> from this BOM?</>,
                          warning: 'This removes the Product Color and its BOM-local image. It does not affect another BOM.'
                        })}><Delete fontSize="small" /></IconButton></span>
                      </Tooltip>
                    </Stack>
                  </Stack>
                </Paper>
              );
            })}
          </Box>
        )}
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

      <BomAttachmentImagePreviewDialog
        open={Boolean(attachmentPreview)}
        bomId={bomId}
        attachment={attachmentPreview}
        onClose={() => setAttachmentPreview(null)}
      />

      <BomLineImagePreviewDialog
        open={Boolean(imagePreviewLine)}
        bomId={bomId}
        line={imagePreviewLine}
        onClose={() => setImagePreviewLine(null)}
      />

      <Dialog open={canWrite && headerOpen} onClose={saving ? undefined : () => setHeaderOpen(false)} fullWidth maxWidth="md">
        <DialogTitle sx={{ pr: 6, fontWeight: 750, color: '#103B5C' }}>
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
          <Button variant="contained" onClick={saveHeader} disabled={saving} sx={{ textTransform: 'none', fontWeight: 700, backgroundColor: '#103B5C' }}>
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogActions>
      </Dialog>

      <LineDialog open={canWrite && Boolean(lineCtx)} record={lineCtx?.record} productColors={productColors} saving={saving} onClose={() => setLineCtx(null)} onSave={saveLine} />
      <PackingDialog open={canWrite && Boolean(packingCtx)} record={packingCtx?.record} saving={saving} onClose={() => setPackingCtx(null)} onSave={savePacking} />
      <ProductColorDialog
        open={canWrite && Boolean(productColorCtx)}
        record={productColorCtx?.record}
        header={bom?.header}
        bomId={bomId}
        imageAttachment={productColorImageAttachment(bom, productColorCtx?.record?.id)}
        saving={saving}
        onClose={() => setProductColorCtx(null)}
        onSave={saveProductColor}
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
