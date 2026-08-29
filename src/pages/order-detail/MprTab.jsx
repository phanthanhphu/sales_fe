import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Autocomplete,
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
  LinearProgress,
  IconButton,
  InputAdornment,
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
  TablePagination,
  Tab,
  Tabs,
  TextField,
  Tooltip,
  Typography
} from '@mui/material';
import { CheckCircle, Delete, Download, Edit, ErrorOutline, ExpandMore, FileUpload, LockOpen, Preview, Refresh, RestartAlt, Save, Search as SearchIcon } from '@mui/icons-material';
import {
  confirmMpr,
  deleteMpr,
  deleteMprBatch,
  deleteMprLine,
  downloadWithAuth,
  generateMpr,
  getApiError,
  getMpr,
  getMprExportUrl,
  listBoms,
  previewMpr,
  reopenMpr,
  refreshAllMprBomSources,
  refreshMprBomSource,
  validateMpr,
  validateMprMasterData,
  updateMprBatch,
  updateMprLine,
  uploadMprExcel
} from '../../services/orderBomMprService';
import MprLineEditDialog from './MprLineEditDialog';
import { formatDateTime } from '../orders/orderUi';
import StatusBadge from '../../components/StatusBadge';
import EmptyTableState from '../../components/EmptyTableState';
import ColumnVisibilityMenu from '../../components/ColumnVisibilityMenu';
import ExcelUploadProgressDialog from '../../components/ExcelUploadProgressDialog';
import SortableTableCell from '../../components/SortableTableCell';
import useTableSort from '../../utils/useTableSort';
import { initialUploadProgress, startProcessingTicker, uploadProgressFromEvent, uploadStage } from '../../utils/uploadProgress';
import { listActiveShipTos } from '../../services/masterDataService';
import { canManageSales, canReopenCompletedMpr } from 'utils/accessControl';
import { normalizeBuyerKey } from 'utils/buyerContext';

const emptyBomSelection = () => ({
  selected: false,
  colors: [],
  packingIds: [],
  poQtyByColor: {},
  shipToIdsByColor: {},
  shipToQtyByColor: {}
});

const initialSelection = (boms = []) => Object.fromEntries(
  (Array.isArray(boms) ? boms : []).filter(Boolean).map((bom) => [bom.id, emptyBomSelection()])
);

const productColorsForBom = (bom) => {
  const safeBom = bom || {};
  if (Array.isArray(safeBom.productColors) && safeBom.productColors.length) {
    return safeBom.productColors;
  }
  return (safeBom.colors || []).map((color) => ({
    id: color,
    colorName: color,
    patternNumber: safeBom.header?.patternNumber || '',
    season: safeBom.header?.season || '',
    styleNumber: safeBom.header?.styleNumber || ''
  }));
};

const productColorLabel = (item = {}) => {
  const safeItem = item || {};
  return [
    safeItem.colorName,
    safeItem.patternNumber,
    safeItem.season,
    safeItem.styleNumber
  ].filter(Boolean).join(' · ');
};

const normalizedColorKey = (value) => String(value || '').trim().replace(/\s+/g, ' ').toUpperCase();

const cssAttributeEscape = (value) => (
  typeof CSS !== 'undefined' && typeof CSS.escape === 'function'
    ? CSS.escape(String(value || ''))
    : String(value || '').replace(/["\\]/g, '\\$&')
);

const downloadDate = () => {
  const now = new Date();
  const pad = (value) => String(value).padStart(2, '0');
  return `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}`;
};

const downloadFilePart = (value, fallback) => {
  const safe = String(value || fallback || '').trim()
    .replace(/[^A-Za-z0-9._-]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '');
  return safe || fallback;
};


const productColorBusinessKey = (item = {}) => [
  item?.colorName,
  item?.patternNumber,
  item?.season,
  item?.styleNumber
].map(normalizedColorKey).join('|');

const productColorKey = (item = {}) => item.id || productColorBusinessKey(item) || item.colorName || '';

const sameVisibleColorCount = (options = [], option = {}) => (
  (options || []).filter((item) => (
    normalizedColorKey(item?.colorName) === normalizedColorKey(option?.colorName)
  )).length
);

const batchLineProductColorIds = (mprDoc, batch) => {
  const batchId = batch?.batchId;
  if (!batchId) return new Set();

  const ids = new Set();
  (mprDoc?.lines || []).forEach((line) => {
    const directBatchMatch = String(line?.generationBatchId || '') === String(batchId);
    const traceBatchMatch = (line?.sourceTraces || []).some((trace) => (
      String(trace?.generationBatchId || '') === String(batchId)
    ));
    if ((directBatchMatch || traceBatchMatch) && line?.productColorId) {
      ids.add(String(line.productColorId));
    }
  });
  return ids;
};

const savedColorForOption = (savedColors = [], option = {}, options = [], mprDoc = null, batch = null) => {
  const optionId = String(productColorKey(option) || '');
  const exact = (savedColors || []).find((color) => (
    normalizedColorKey(color) === normalizedColorKey(optionId)
  ));
  if (exact) return exact;

  const generatedIds = batchLineProductColorIds(mprDoc, batch);
  if (generatedIds.size && option?.id) {
    return generatedIds.has(String(option.id)) ? option.id : '';
  }

  if (sameVisibleColorCount(options, option) !== 1) return '';
  return (savedColors || []).find((color) => (
    normalizedColorKey(color) === normalizedColorKey(option.colorName)
  )) || '';
};

const mappedColorValue = (values = {}, option = {}, options = [], fallback = undefined) => {
  const exactKey = productColorKey(option);
  const exactEntry = Object.entries(values || {}).find(([key]) => (
    normalizedColorKey(key) === normalizedColorKey(exactKey)
  ));
  if (exactEntry) return exactEntry[1];

  if (sameVisibleColorCount(options, option) !== 1) return fallback;
  const legacyEntry = Object.entries(values || {}).find(([key]) => (
    normalizedColorKey(key) === normalizedColorKey(option.colorName)
  ));
  return legacyEntry ? legacyEntry[1] : fallback;
};

const productColorOptionForRef = (options = [], reference = '') => {
  const ref = normalizedColorKey(reference);
  if (!ref) return null;

  const exact = (options || []).find((option) => (
    normalizedColorKey(productColorKey(option)) === ref
      || normalizedColorKey(productColorBusinessKey(option)) === ref
  ));
  if (exact) return exact;

  const byName = (options || []).filter((option) => (
    normalizedColorKey(option?.colorName) === ref
  ));
  return byName.length === 1 ? byName[0] : null;
};

const numberValue = (value) => {
  if (value === '' || value === null || value === undefined) return '';
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : '';
};

const sumShipToQty = (shipToQty = {}, shipToIds = []) => (shipToIds || []).reduce((total, shipToId) => {
  const value = numberValue(shipToQty?.[shipToId]);
  return value === '' ? total : total + value;
}, 0);

const shipToDisplayLabel = (shipTo = {}) => [shipTo.shipToCode, shipTo.shipToName].filter(Boolean).join(' · ');

const issueAllowedShipToIds = (issue = {}) => {
  if (Array.isArray(issue.allowedShipToIds) && issue.allowedShipToIds.length) return issue.allowedShipToIds;
  return issue.requiredShipToId ? [issue.requiredShipToId] : [];
};

const isValidationIssueResolved = (issue, selectedIds = []) =>
  issueAllowedShipToIds(issue).some((id) => selectedIds.includes(id));

const issueShipToLabel = (issue = {}) => {
  const values = Array.isArray(issue.allowedShipToCodes) && issue.allowedShipToCodes.length
    ? issue.allowedShipToCodes
    : (Array.isArray(issue.allowedShipToNames) && issue.allowedShipToNames.length
      ? issue.allowedShipToNames
      : issueAllowedShipToIds(issue));
  return values.filter(Boolean).join(' / ') || 'Dedicated Ship To';
};

const legacyAwareShipToQty = (savedQty = {}, shipToIds = [], legacyTotal = '') => {
  const selectedIds = (shipToIds || []).filter(Boolean);
  const current = savedQty && typeof savedQty === 'object' ? savedQty : {};
  if (Object.keys(current).length) {
    return Object.fromEntries(selectedIds.map((id) => [id, current?.[id] ?? '']));
  }
  if (selectedIds.length === 1 && legacyTotal !== '' && legacyTotal !== null && legacyTotal !== undefined) {
    return { [selectedIds[0]]: legacyTotal };
  }
  return Object.fromEntries(selectedIds.map((id) => [id, '']));
};

const sourceSelectionFromBatch = (bom, batch, selected = false, mprDoc = null) => {
  if (!bom || !batch) return { ...emptyBomSelection(), selected };

  const options = productColorsForBom(bom);
  const selectedOptions = options.filter((option) => savedColorForOption(batch.colors, option, options, mprDoc, batch));
  const colorKeys = selectedOptions.map(productColorKey).filter(Boolean);

  const shipToIdsByColor = Object.fromEntries(selectedOptions.map((option) => [
    productColorKey(option),
    mappedColorValue(batch.shipToIdsByColor, option, options, []) || []
  ]));
  const shipToQtyByColor = Object.fromEntries(selectedOptions.map((option) => {
    const colorKey = productColorKey(option);
    const ids = shipToIdsByColor[colorKey] || [];
    return [colorKey, legacyAwareShipToQty(
      mappedColorValue(batch.shipToQtyByColor, option, options, {}),
      ids,
      mappedColorValue(batch.poQtyByColor, option, options, '')
    )];
  }));

  return {
    selected,
    colors: colorKeys,
    packingIds: [...(batch.packingIds || [])],
    poQtyByColor: Object.fromEntries(selectedOptions.map((option) => {
      const colorKey = productColorKey(option);
      return [colorKey, sumShipToQty(shipToQtyByColor[colorKey] || {}, shipToIdsByColor[colorKey] || [])];
    })),
    shipToIdsByColor,
    shipToQtyByColor
  };
};

const batchesForBom = (mprDoc, bomId) => (mprDoc?.selections || [])
  .filter((item) => item?.batchId && item?.bomId === bomId)
  .sort((left, right) => {
    const leftTime = left?.createdAt ? new Date(left.createdAt).getTime() : 0;
    const rightTime = right?.createdAt ? new Date(right.createdAt).getTime() : 0;
    if (leftTime !== rightTime) return rightTime - leftTime;
    return String(right?.batchId || '').localeCompare(String(left?.batchId || ''));
  });

const generatedSourceInfoForColor = (mprDoc, bomId, productColor = {}) => {
  const matchingBatches = batchesForBom(mprDoc, bomId).filter((batch) => {
    const exact = (batch?.colors || []).some((color) => (
      normalizedColorKey(color) === normalizedColorKey(productColorKey(productColor))
    ));
    if (exact) return true;

    const generatedIds = batchLineProductColorIds(mprDoc, batch);
    if (generatedIds.size && productColor?.id) {
      return generatedIds.has(String(productColor.id));
    }
    return false;
  });

  return {
    coreGenerated: matchingBatches.length > 0,
    packingIds: new Set(matchingBatches.flatMap((batch) => batch?.packingIds || []).filter(Boolean)),
    latestBatch: matchingBatches[0] || null,
    batchCount: matchingBatches.length
  };
};

const mprActionButtonSx = {
  minHeight: 36,
  px: 1.5,
  borderRadius: 1.25,
  textTransform: 'none',
  fontSize: '.78rem',
  fontWeight: 750,
  lineHeight: 1.2,
  whiteSpace: 'nowrap',
  boxShadow: 'none',
  '& .MuiButton-startIcon': {
    mr: 0.75
  },
  '& .MuiSvgIcon-root': {
    fontSize: 17
  }
};

const mprNeutralActionButtonSx = {
  ...mprActionButtonSx,
  color: '#334155',
  borderColor: '#cbd5e1',
  backgroundColor: '#ffffff',
  '&:hover': {
    borderColor: '#94a3b8',
    backgroundColor: '#f8fafc',
    boxShadow: 'none'
  }
};

const mprPreviewActionButtonSx = {
  ...mprActionButtonSx,
  color: '#2563eb',
  borderColor: '#93c5fd',
  backgroundColor: '#ffffff',
  '&:hover': {
    borderColor: '#2563eb',
    backgroundColor: '#eff6ff',
    boxShadow: 'none'
  }
};

const mprPrimaryActionButtonSx = {
  ...mprActionButtonSx,
  color: '#ffffff',
  backgroundColor: '#103B5C',
  '&:hover': {
    backgroundColor: '#0b2f4a',
    boxShadow: 'none'
  }
};

const formatValue = (value, maximumFractionDigits = 6) => {
  if (value === null || value === undefined || value === '') return '';
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return String(value);
  return numeric.toLocaleString('en-US', {
    maximumFractionDigits,
    minimumFractionDigits: 0
  });
};

const sumMprColumn = (lines = [], field) => (
  (Array.isArray(lines) ? lines : []).reduce((total, line) => {
    const numeric = Number(line?.[field]);
    return Number.isFinite(numeric) ? total + numeric : total;
  }, 0)
);

const textValue = (value) => {
  if (value === null || value === undefined || value === '') return '';
  return String(value);
};

const formatFileSize = (value) => {
  const bytes = Number(value || 0);
  if (!Number.isFinite(bytes) || bytes <= 0) return '-';
  if (bytes < 1024) return `${Math.round(bytes)} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};

const vendorCodeValue = (value) => {
  const text = textValue(value).trim();
  // Vender Code is an identifier, not a money/quantity column.
  // Remove thousands separators only when the whole value is numeric-like.
  return /^[0-9,]+$/.test(text) ? text.replace(/,/g, '') : text;
};

const MPR_TEXT_FIELDS = new Set([
  'styleColorKey',
  'styleDescription',
  'styleColor',
  'shipTo',
  'salesComment',
  'sapCode',
  'materialType',
  'matFullDescription',
  'matColor',
  'matUnit',
  'currency',
  'shortNameSupplier',
  'vendorCode',
  'vendorName',
  'matCharger',
  'matDueDate'
]);

const MPR_NUMERIC_FIELDS = new Set([
  'bomLineNo', 'yield', 'lossFactor', 'totalYield', 'poQuantity',
  'matRequiredQuantity', 'sampleQuantity', 'matSampleQuantity',
  'mcdStock', 'cmcdStock', 'sapStockQuantity', 'nonSapStockQuantity',
  'purchaseQuantity', 'matPriceWithoutTax', 'exchangeRate', 'matPriceUsd',
  'matAmountUsd', 'totalMatAmountPerStyle'
]);

const renderMprCellValue = (field, value, row = {}) => {
  if (field === 'vendorCode') return vendorCodeValue(value);
  if (MPR_TEXT_FIELDS.has(field)) return textValue(value);
  const safeValue = MPR_NUMERIC_FIELDS.has(field) && (value === null || value === undefined || value === '') ? 0 : value;
  if (field === 'matPriceWithoutTax') {
    const currency = String(row?.currency || '').trim().toUpperCase();
    if (currency === 'VND' || currency === 'USD' || currency === 'US') {
      const numeric = Number(safeValue);
      if (!Number.isFinite(numeric)) return String(safeValue ?? '');
      return numeric.toLocaleString('en-US', {
        minimumFractionDigits: 3,
        maximumFractionDigits: 3
      });
    }
  }
  return formatValue(safeValue);
};

const latestBomReview = (line = {}) => {
  const safeLine = line || {};
  const reviews = Array.isArray(safeLine.bomReviews) ? safeLine.bomReviews : [];
  return reviews.reduce((latest, item) => {
    if (!item) return latest;
    if (!latest) return item;
    const itemTime = new Date(item.requestedAt || item.reviewedAt || 0).getTime();
    const latestTime = new Date(latest.requestedAt || latest.reviewedAt || 0).getTime();
    return itemTime >= latestTime ? item : latest;
  }, null);
};

const reviewChip = (review) => {
  const status = String(review?.status || '').toUpperCase();
  if (status === 'PENDING_BOM_REVIEW') return { label: 'BOM Review', color: 'warning' };
  if (status === 'RECHECK_SALES') return { label: 'Recheck Sales', color: 'error' };
  if (status === 'APPLIED_TO_BOM') return { label: 'Applied', color: 'success' };
  return null;
};

const emptyMprFilters = {
  keyword: '',
  productColor: '',
  source: '',
  shipTo: '',
  reviewStatus: ''
};

const MPR_CORE_SOURCE = '__CORE_BOM__';
const normalizeText = (value) => String(value || '').trim().replace(/\s+/g, ' ').toUpperCase();
const includesText = (value, needle) => normalizeText(value).includes(normalizeText(needle));

const mprLineSourceKey = (line = {}) => {
  const safeLine = line || {};
  return !safeLine.packingId && !safeLine.packingName
    ? MPR_CORE_SOURCE
    : String(safeLine.packingId || safeLine.packingName || '');
};

const mprLineSourceLabel = (line = {}) => {
  const safeLine = line || {};
  return mprLineSourceKey(safeLine) === MPR_CORE_SOURCE
    ? 'Core BOM (No Packing)'
    : (safeLine.packingName || `Packing ${safeLine.packingId || ''}`.trim());
};

const mprLineSourceTraces = (line = {}) => {
  const traces = Array.isArray(line?.sourceTraces) ? line.sourceTraces.filter(Boolean) : [];
  if (traces.length) return traces;
  return [{
    generationBatchId: line?.generationBatchId,
    sourceLineId: line?.sourceLineId,
    sourceRowNumber: line?.sourceRowNumber,
    packingId: line?.packingId,
    packingName: line?.packingName,
    section: line?.section,
    sourceLabel: mprLineSourceLabel(line)
  }];
};

const mprLineHasBatch = (line = {}, batchId = '') => (
  Boolean(batchId) && mprLineSourceTraces(line).some((trace) => trace?.generationBatchId === batchId)
);

const mprPhysicalSourceCount = (lines = []) => (
  (Array.isArray(lines) ? lines : []).reduce((total, line) => total + Math.max(1, mprLineSourceTraces(line).length), 0)
);

const mprRemovedDuplicateCount = (lines = []) => (
  (Array.isArray(lines) ? lines : []).reduce((total, line) => {
    const explicit = Number(line?.removedDuplicateCount);
    return total + (Number.isFinite(explicit) ? Math.max(0, explicit) : Math.max(0, mprLineSourceTraces(line).length - 1));
  }, 0)
);

const MPR_BOM_GROUP_STYLES = [
  { backgroundColor: '#f1f5f9', borderColor: '#94a3b8', color: '#0f172a' }
];

const MPR_LEGEND_ITEMS = [
  { label: 'BOM group', color: '#64748b' },
  { label: 'Product color', color: '#94a3b8' },
  { label: 'Source', color: '#cbd5e1' },
  { label: 'Duplicates merged', color: '#d4a72c' }
];

const mprLineReviewStatus = (line = {}) => latestBomReview(line)?.status || 'NO_REVIEW';

const mprLineMatchesFilters = (line = {}, filters = emptyMprFilters) => {
  const safeLine = line || {};
  const safeFilters = filters || emptyMprFilters;
  const keyword = String(safeFilters.keyword || '').trim();
  const reviewStatus = mprLineReviewStatus(safeLine);

  if (keyword) {
    const searchable = [
      safeLine.styleColorKey,
      safeLine.styleDescription,
      safeLine.styleColor,
      safeLine.shipTo,
      safeLine.salesComment,
      safeLine.sapCode,
      safeLine.bomLineNo,
      safeLine.materialType,
      safeLine.matFullDescription,
      safeLine.matColor,
      safeLine.matUnit,
      safeLine.shortNameSupplier,
      safeLine.vendorCode,
      safeLine.vendorName,
      safeLine.matCharger,
      safeLine.bomNo,
      safeLine.bomName,
      safeLine.duplicateNote,
      mprLineSourceLabel(safeLine)
    ];
    if (!searchable.some((value) => includesText(value, keyword))) return false;
  }

  if (safeFilters.productColor && normalizeText(safeLine.styleColor) !== normalizeText(safeFilters.productColor)) return false;
  if (safeFilters.source && mprLineSourceKey(safeLine) !== safeFilters.source) return false;
  if (safeFilters.shipTo && normalizeText(safeLine.shipTo) !== normalizeText(safeFilters.shipTo)) return false;
  if (safeFilters.reviewStatus && reviewStatus !== safeFilters.reviewStatus) return false;

  return true;
};

const MPR_COLUMNS = [
  ['styleDescription', 'STYLE DESCRIPTION', 190],
  ['styleColor', 'STYLE COLOR', 150],
  ['shipTo', 'Ship To', 130],
  ['styleColorKey', 'STYLE_COLOR', 190],
  ['salesComment', 'Sales Comment', 200],
  ['sapCode', 'SAP CODE', 135],
  ['bomLineNo', 'BOM No', 90],
  ['materialType', 'Material Type', 125],
  ['matFullDescription', 'MAT FULL DESCRIPTION', 280],
  ['matColor', 'MAT COLOR', 220],
  ['matUnit', 'MAT UNIT', 100],
  ['yield', 'YIELD', 110],
  ['lossFactor', 'LOSS', 100],
  ['totalYield', 'T.YIELD', 110],
  ['poQuantity', 'PO QTY', 110],
  ['matRequiredQuantity', "MAT REQUIRED Q'TY", 150],
  ['sampleQuantity', "SAMPLE Q'TY", 130],
  ['matSampleQuantity', "MAT SAMPLE Q'TY", 160],
  ['mcdStock', 'MCD STOCK', 120],
  ['cmcdStock', 'CMCD STOCK', 130],
  ['sapStockQuantity', 'SAP STOCK QTY', 140],
  ['nonSapStockQuantity', 'NON SAP STOCK QTY', 160],
  ['purchaseQuantity', 'PURCHASE QTY', 140],
  ['currency', 'CUR', 80],
  ['matPriceWithoutTax', 'MAT PRICE (W/O TAX)', 170],
  ['shortNameSupplier', 'Short Name Supplier', 180],
  ['vendorCode', 'Vender Code', 135],
  ['vendorName', 'Vender Name', 190],
  ['matCharger', 'MAT CHARGER', 140],
  ['exchangeRate', 'Exchange Rate', 140],
  ['matPriceUsd', 'MAT PRICE (USD)', 150],
  ['matAmountUsd', 'MAT AMOUNT in USD', 165],
  ['matDueDate', 'MAT DUE-DATE', 140],
  ['totalMatAmountPerStyle', 'TOTAL MAT AMOUNT per STYLE', 215]
];

const MPR_COMPACT_FIELDS = [
  'styleDescription', 'styleColor', 'shipTo', 'sapCode', 'bomLineNo', 'materialType',
  'matFullDescription', 'matColor', 'matUnit', 'poQuantity', 'matRequiredQuantity',
  'sapStockQuantity', 'nonSapStockQuantity', 'purchaseQuantity', 'vendorCode', 'matDueDate', 'matAmountUsd'
];

const MPR_VIEW_PRESETS = [
  {
    label: 'Material',
    keys: ['styleDescription', 'styleColor', 'shipTo', 'sapCode', 'bomLineNo', 'materialType', 'matFullDescription', 'matColor', 'matUnit', 'shortNameSupplier', 'vendorCode', 'matDueDate']
  },
  {
    label: 'Requirements',
    keys: ['styleDescription', 'styleColor', 'shipTo', 'sapCode', 'matFullDescription', 'matColor', 'matUnit', 'yield', 'lossFactor', 'totalYield', 'poQuantity', 'matRequiredQuantity', 'sampleQuantity', 'matSampleQuantity', 'purchaseQuantity']
  },
  {
    label: 'Stock & Purchase',
    keys: ['styleDescription', 'styleColor', 'shipTo', 'sapCode', 'matFullDescription', 'matColor', 'matUnit', 'matRequiredQuantity', 'mcdStock', 'cmcdStock', 'sapStockQuantity', 'nonSapStockQuantity', 'purchaseQuantity', 'currency', 'matPriceUsd', 'matAmountUsd', 'vendorCode', 'matDueDate']
  }
];

const MprSummaryMetric = ({ label, value, helper = '' }) => (
  <Box
    sx={{
      minWidth: 0,
      px: 1.05,
      py: 0.8,
      border: '1px solid #e2e8f0',
      borderRadius: 1.2,
      bgcolor: '#fff'
    }}
  >
    <Typography sx={{ fontSize: '.62rem', fontWeight: 700, color: '#7b8794', textTransform: 'uppercase', letterSpacing: '.04em' }}>
      {label}
    </Typography>
    <Typography sx={{ mt: 0.15, fontSize: '.93rem', fontWeight: 700, color: '#102a43', lineHeight: 1.2 }}>
      {value}
    </Typography>
    {helper && <Typography sx={{ mt: 0.1, fontSize: '.65rem', color: '#94a3b8' }}>{helper}</Typography>}
  </Box>
);

export default function MprTab({ order, buyerKey: buyerKeyProp, onOrderStatusChange }) {
  const buyerKey = normalizeBuyerKey(buyerKeyProp || order?.buyerKey);
  const llBeanMprEnabled = buyerKey === 'LLBEAN';
  const canWrite = canManageSales();
  const writeBlockedMessage = 'Sales permission is required to create or modify MPR data.';
  const buyerStrategyMessage = 'MPR calculation is currently configured for L.L.BEAN only. The formula strategy for this Buyer has not been configured yet.';
  const [boms, setBoms] = useState([]);
  const [selection, setSelection] = useState({});
  const [mpr, setMpr] = useState(null);
  const normalizedMprStatus = String(mpr?.status || '').trim().toUpperCase();
  const mprStatus = !mpr?.id ? 'NOT_STARTED' : normalizedMprStatus === 'DRAFT' ? 'IN_PROGRESS' : normalizedMprStatus;
  const mprCompleted = mprStatus === 'COMPLETED';
  const canMutateMpr = canWrite && !mprCompleted;
  const canReopenMpr = Boolean(mprCompleted && canReopenCompletedMpr());
  const completedLockMessage = 'This MPR is completed and locked. Reopen it before changing MPR data.';
  const mutationBlockedMessage = !canWrite ? writeBlockedMessage : completedLockMessage;
  const mprDownloadName = (mprDoc = mpr) => `MPR_FILE_${downloadFilePart(buyerKey, 'BUYER')}_${downloadFilePart(mprDoc?.mprNo, 'MPR')}_${downloadDate()}.xlsx`;
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState({ open: false, severity: 'success', message: '' });
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [reopenOpen, setReopenOpen] = useState(false);
  const [reopenReason, setReopenReason] = useState('');
  const [reopening, setReopening] = useState(false);
  const [batchDeleteTarget, setBatchDeleteTarget] = useState(null);
  const [batchDeleting, setBatchDeleting] = useState(false);
  const [editingLine, setEditingLine] = useState(null);
  const [lineDeleteTarget, setLineDeleteTarget] = useState(null);
  const [lineSaving, setLineSaving] = useState(false);
  const [shipTos, setShipTos] = useState([]);
  const [batchEditTarget, setBatchEditTarget] = useState(null);
  const [batchEditForm, setBatchEditForm] = useState({ colors: [], packingIds: [], poQtyByColor: {}, shipToIdsByColor: {}, shipToQtyByColor: {} });
  const [batchSaving, setBatchSaving] = useState(false);
  const [sourceRefreshingBomId, setSourceRefreshingBomId] = useState('');
  const [sourceRefreshingAll, setSourceRefreshingAll] = useState(false);
  const [mprFilters, setMprFilters] = useState(emptyMprFilters);
  const [mprUploading, setMprUploading] = useState(false);
  const [mprUploadProgress, setMprUploadProgress] = useState(initialUploadProgress());
  const [mprVisibleFields, setMprVisibleFields] = useState(MPR_COMPACT_FIELDS);
  const [workspaceTab, setWorkspaceTab] = useState('sources');
  const [bomSearch, setBomSearch] = useState('');
  const [bomStatusFilter, setBomStatusFilter] = useState('ALL');
  const [bomPage, setBomPage] = useState(0);
  const [bomRowsPerPage, setBomRowsPerPage] = useState(20);
  const [expandedBomId, setExpandedBomId] = useState(null);
  const [preflightBusy, setPreflightBusy] = useState(false);
  const [validationReview, setValidationReview] = useState({ open: false, issues: [] });
  const [focusedValidationIssue, setFocusedValidationIssue] = useState(null);
  const [masterDataWarning, setMasterDataWarning] = useState({ open: false, issues: [], actionLabel: '' });
  const [batchSearch, setBatchSearch] = useState('');
  const [batchPage, setBatchPage] = useState(0);
  const [batchRowsPerPage, setBatchRowsPerPage] = useState(10);
  const [expandedBatchId, setExpandedBatchId] = useState(null);
  const mprUploadRef = useRef(null);
  const mprUploadTickerRef = useRef(null);
  const progressTimerRef = useRef(null);
  const exportProgressTimerRef = useRef(null);
  const masterDataWarningResolverRef = useRef(null);
  const [generateProgress, setGenerateProgress] = useState({
    open: false,
    status: 'idle',
    percent: 0,
    message: '',
    currentColor: '',
    processedRows: 0,
    estimatedRows: 0,
    totalColors: 0,
    completedColors: 0,
    addedRows: 0,
    duplicateRows: 0,
    finalRows: 0,
    errorMessage: ''
  });
  const [exportProgress, setExportProgress] = useState({
    open: false,
    status: 'idle',
    percent: 0,
    message: '',
    lineCount: 0,
    downloadedBytes: 0,
    totalBytes: 0,
    fileSizeBytes: 0,
    fileName: '',
    errorMessage: ''
  });

  const notify = (message, severity = 'success') => {
    setNotice({ open: true, severity, message: String(message || '') });
  };

  const load = useCallback(async () => {
    if (!order?.id) return;
    setLoading(true);
    try {
      const [allBoms, activeShipTos] = await Promise.all([
        listBoms(order.id),
        listActiveShipTos(buyerKey)
      ]);
      const submitted = (allBoms || []).filter((bom) => bom.status === 'SUBMITTED');
      setBoms(submitted);
      setShipTos(activeShipTos || []);
      setSelection((previous) => {
        const next = initialSelection(submitted);
        submitted.forEach((bom) => {
          if (previous[bom.id]) next[bom.id] = { ...emptyBomSelection(), ...previous[bom.id] };
        });
        return next;
      });
      try {
        const currentMpr = await getMpr(order.id);
        setMpr(currentMpr);
      } catch (error) {
        if (error?.response?.status === 404) {
          setMpr(null);
        } else throw error;
      }
    } catch (error) {
      notify(getApiError(error, 'Unable to load MPR data.'), 'error');
    } finally {
      setLoading(false);
    }
  }, [buyerKey, order?.id]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => () => {
    if (progressTimerRef.current) window.clearInterval(progressTimerRef.current);
    if (exportProgressTimerRef.current) window.clearInterval(exportProgressTimerRef.current);
    if (mprUploadTickerRef.current) window.clearInterval(mprUploadTickerRef.current);
  }, []);

  const toggleBom = (bomId, checked) => {
    if (!canMutateMpr) return;
    setSelection((current) => ({
      ...current,
      [bomId]: {
        ...(current[bomId] || emptyBomSelection()),
        selected: checked
      }
    }));
    if (checked) setExpandedBomId(bomId);
    else if (expandedBomId === bomId) setExpandedBomId(null);
  };

  const toggleColor = (bomId, colorId) => {
    if (!canMutateMpr) return;
    setSelection((current) => {
      const item = current[bomId] || emptyBomSelection();
      const selectedColors = new Set(item.colors || []);
      const poQtyByColor = { ...(item.poQtyByColor || {}) };
      const shipToIdsByColor = { ...(item.shipToIdsByColor || {}) };
      const shipToQtyByColor = { ...(item.shipToQtyByColor || {}) };

      if (selectedColors.has(colorId)) {
        selectedColors.delete(colorId);
        delete poQtyByColor[colorId];
        delete shipToIdsByColor[colorId];
        delete shipToQtyByColor[colorId];
      } else {
        selectedColors.add(colorId);
        poQtyByColor[colorId] = '';
        shipToIdsByColor[colorId] = [];
        shipToQtyByColor[colorId] = {};
      }

      return {
        ...current,
        [bomId]: {
          ...item,
          colors: Array.from(selectedColors),
          poQtyByColor,
          shipToIdsByColor,
          shipToQtyByColor
        }
      };
    });
  };

  const changeShipToQty = (bomId, colorId, shipToId, value) => {
    if (!canMutateMpr) return;
    setSelection((current) => {
      const item = current[bomId] || emptyBomSelection();
      const selectedIds = item.shipToIdsByColor?.[colorId] || [];
      const nextColorQty = { ...(item.shipToQtyByColor?.[colorId] || {}), [shipToId]: value };
      return {
        ...current,
        [bomId]: {
          ...item,
          shipToQtyByColor: { ...(item.shipToQtyByColor || {}), [colorId]: nextColorQty },
          poQtyByColor: { ...(item.poQtyByColor || {}), [colorId]: sumShipToQty(nextColorQty, selectedIds) }
        }
      };
    });
  };

  const changeShipTos = (bomId, colorId, selected) => {
    if (!canMutateMpr) return;
    setSelection((current) => {
      const item = current[bomId] || emptyBomSelection();
      const selectedIds = (selected || []).map((shipTo) => shipTo.id).filter(Boolean);
      const previousQty = item.shipToQtyByColor?.[colorId] || {};
      const nextColorQty = Object.fromEntries(selectedIds.map((id) => [id, previousQty?.[id] ?? '']));
      return {
        ...current,
        [bomId]: {
          ...item,
          shipToIdsByColor: { ...(item.shipToIdsByColor || {}), [colorId]: selectedIds },
          shipToQtyByColor: { ...(item.shipToQtyByColor || {}), [colorId]: nextColorQty },
          poQtyByColor: { ...(item.poQtyByColor || {}), [colorId]: sumShipToQty(nextColorQty, selectedIds) }
        }
      };
    });
  };

  const togglePacking = (bomId, packingId) => {
    if (!canMutateMpr) return;
    setSelection((current) => {
      const item = current[bomId] || emptyBomSelection();
      const packingIds = new Set(item.packingIds || []);
      if (packingIds.has(packingId)) packingIds.delete(packingId);
      else packingIds.add(packingId);
      return {
        ...current,
        [bomId]: {
          ...item,
          packingIds: Array.from(packingIds)
        }
      };
    });
  };

  const payload = useMemo(() => ({
    mprNo: `MPR-${order?.orderNo || ''}`,
    // Sample Qty is no longer entered from the MPR toolbar; keep it at zero for compatibility.
    poQuantity: 0,
    sampleQuantity: 0,
    selections: boms
      .filter((bom) => selection[bom.id]?.selected)
      .map((bom) => {
        const state = selection[bom.id] || emptyBomSelection();
        return {
          bomId: bom.id,
          colors: state.colors || [],
          packingIds: state.packingIds || [],
          poQtyByColor: Object.fromEntries(
            (state.colors || []).map((colorId) => {
              const ids = state.shipToIdsByColor?.[colorId] || [];
              return [colorId, sumShipToQty(state.shipToQtyByColor?.[colorId] || {}, ids)];
            })
          ),
          shipToIdsByColor: Object.fromEntries(
            (state.colors || []).map((colorId) => [colorId, state.shipToIdsByColor?.[colorId] || []])
          ),
          shipToQtyByColor: Object.fromEntries(
            (state.colors || []).map((colorId) => [
              colorId,
              Object.fromEntries((state.shipToIdsByColor?.[colorId] || []).map((shipToId) => [
                shipToId, numberValue(state.shipToQtyByColor?.[colorId]?.[shipToId])
              ]))
            ])
          )
        };
      })
  }), [boms, selection, order?.orderNo]);

  const generationPlan = useMemo(() => {
    const items = [];

    payload.selections.forEach((selectedBom) => {
      const bom = boms.find((item) => item.id === selectedBom.bomId);
      if (!bom) return;

      const coreLines = Number(bom.coreLineCount ?? (bom.coreLines || []).length) || 0;
      const selectedPackingLines = (bom.packings || [])
        .filter((packing) => (selectedBom.packingIds || []).includes(packing.id))
        .reduce((total, packing) => total + (Number(packing.lineCount ?? (packing.lines || []).length) || 0), 0);
      const estimatedRowsPerColor = coreLines + selectedPackingLines;
      const productColors = productColorsForBom(bom);

      (selectedBom.colors || []).forEach((colorId) => {
        const color = productColors.find((item) => (item.id || item.colorName) === colorId);
        items.push({
          bomId: bom.id,
          bomNo: bom.bomNo || '',
          colorId,
          colorName: color?.colorName || String(colorId || ''),
          estimatedRows: estimatedRowsPerColor
        });
      });
    });

    return {
      items,
      totalColors: items.length,
      estimatedRows: items.reduce((total, item) => total + item.estimatedRows, 0)
    };
  }, [boms, payload.selections]);

  const stopProgressTimer = () => {
    if (progressTimerRef.current) {
      window.clearInterval(progressTimerRef.current);
      progressTimerRef.current = null;
    }
  };

  const startGenerateProgress = () => {
    stopProgressTimer();

    const totalColors = Math.max(1, generationPlan.totalColors);
    const estimatedRows = Math.max(0, generationPlan.estimatedRows);

    setGenerateProgress({
      open: true,
      status: 'processing',
      percent: 4,
      message: 'Checking BOM data and preparing MPR lines...',
      currentColor: generationPlan.items[0]?.colorName || '',
      processedRows: 0,
      estimatedRows,
      totalColors: generationPlan.totalColors,
      completedColors: 0,
      addedRows: 0,
      duplicateRows: 0,
      finalRows: 0,
      errorMessage: ''
    });

    progressTimerRef.current = window.setInterval(() => {
      setGenerateProgress((current) => {
        if (current.status !== 'processing') return current;

        const increment = current.percent < 24 ? 4 : current.percent < 60 ? 2 : 1;
        const percent = Math.min(92, current.percent + increment);
        const workRatio = Math.max(0, Math.min(1, (percent - 10) / 82));
        const activeIndex = Math.min(totalColors - 1, Math.floor(workRatio * totalColors));
        const completedColors = Math.min(totalColors, Math.floor(workRatio * totalColors));
        const currentItem = generationPlan.items[activeIndex];
        const processedRows = estimatedRows > 0 ? Math.min(estimatedRows, Math.floor(estimatedRows * workRatio)) : 0;

        return {
          ...current,
          percent,
          message: percent < 12
            ? 'Checking BOM data and preparing MPR lines...'
            : `Processing Product Color ${currentItem?.colorName || activeIndex + 1}...`,
          currentColor: currentItem?.colorName || '',
          processedRows,
          completedColors
        };
      });
    }, 350);
  };

  const finishGenerateProgress = ({ sourceRows = 0, duplicateRows = 0, finalRows = 0 } = {}) => {
    stopProgressTimer();
    setGenerateProgress((current) => ({
      ...current,
      open: true,
      status: 'success',
      percent: 100,
      message: 'MPR created successfully.',
      currentColor: '',
      processedRows: current.estimatedRows,
      completedColors: current.totalColors,
      addedRows: Number(sourceRows || 0),
      duplicateRows: Number(duplicateRows || 0),
      finalRows: Number(finalRows || 0),
      errorMessage: ''
    }));
  };

  const failGenerateProgress = (message) => {
    stopProgressTimer();
    setGenerateProgress((current) => ({
      ...current,
      open: true,
      status: 'error',
      message: 'Unable to create MPR.',
      errorMessage: String(message || 'An unexpected error occurred.')
    }));
  };

  const closeGenerateProgress = () => {
    if (generateProgress.status === 'processing') return;
    setGenerateProgress((current) => ({ ...current, open: false }));
  };

  const stopExportProgressTimer = () => {
    if (exportProgressTimerRef.current) {
      window.clearInterval(exportProgressTimerRef.current);
      exportProgressTimerRef.current = null;
    }
  };

  const startExportProgress = () => {
    stopExportProgressTimer();

    setExportProgress({
      open: true,
      status: 'processing',
      percent: 3,
      message: 'Preparing MPR data for Excel export...',
      lineCount: mpr?.lines?.length || 0,
      downloadedBytes: 0,
      totalBytes: 0,
      fileSizeBytes: 0,
      fileName: mprDownloadName(),
      errorMessage: ''
    });

    exportProgressTimerRef.current = window.setInterval(() => {
      setExportProgress((current) => {
        if (current.status !== 'processing' || current.percent >= 90) return current;

        const increment = current.percent < 20 ? 3 : current.percent < 55 ? 2 : 1;
        const percent = Math.min(88, current.percent + increment);
        let message = 'Preparing MPR data for Excel export...';

        if (percent >= 18 && percent < 45) message = 'Creating Excel workbook and worksheets...';
        else if (percent >= 45 && percent < 70) message = 'Writing MPR rows, formulas and totals...';
        else if (percent >= 70) message = 'Applying Excel formatting and finalizing the file...';

        return { ...current, percent, message };
      });
    }, 450);
  };

  const updateExportDownloadProgress = ({ loaded = 0, total = 0, progress = null } = {}) => {
    setExportProgress((current) => {
      if (current.status !== 'processing') return current;

      const networkPercent = progress === null
        ? Math.max(92, current.percent)
        : Math.min(99, 90 + (progress * 9));

      return {
        ...current,
        percent: networkPercent,
        message: 'Excel file generated. Downloading to your computer...',
        downloadedBytes: Number(loaded || 0),
        totalBytes: Number(total || 0)
      };
    });
  };

  const finishExportProgress = (result = {}) => {
    stopExportProgressTimer();
    setExportProgress((current) => ({
      ...current,
      open: true,
      status: 'success',
      percent: 100,
      message: 'MPR Excel file exported successfully.',
      downloadedBytes: Number(result?.sizeBytes || current.downloadedBytes || 0),
      totalBytes: Number(result?.sizeBytes || current.totalBytes || 0),
      fileSizeBytes: Number(result?.sizeBytes || 0),
      fileName: result?.fileName || current.fileName,
      errorMessage: ''
    }));
  };

  const failExportProgress = (message) => {
    stopExportProgressTimer();
    setExportProgress((current) => ({
      ...current,
      open: true,
      status: 'error',
      message: 'Unable to export MPR Excel file.',
      errorMessage: String(message || 'An unexpected export error occurred.')
    }));
  };

  const closeExportProgress = () => {
    if (exportProgress.status === 'processing') return;
    setExportProgress((current) => ({ ...current, open: false }));
  };

  const selectedSourceStatus = useMemo(() => {
    let selectedColors = 0;
    let colorsWithNewSources = 0;
    let duplicateOnlyColors = 0;

    boms.forEach((bom) => {
      const state = selection[bom.id] || emptyBomSelection();
      if (!state.selected) return;
      const options = productColorsForBom(bom);

      (state.colors || []).forEach((colorId) => {
        const option = options.find((item) => (
          normalizedColorKey(productColorKey(item)) === normalizedColorKey(colorId)
          || normalizedColorKey(item?.colorName) === normalizedColorKey(colorId)
        ));
        if (!option) return;

        selectedColors += 1;
        const generated = generatedSourceInfoForColor(mpr, bom.id, option);
        const hasNewPacking = (state.packingIds || []).some((packingId) => !generated.packingIds.has(packingId));
        const hasNewSource = !generated.coreGenerated || hasNewPacking;
        if (hasNewSource) colorsWithNewSources += 1;
        else duplicateOnlyColors += 1;
      });
    });

    return {
      selectedColors,
      colorsWithNewSources,
      duplicateOnlyColors,
      duplicateOnly: selectedColors > 0 && colorsWithNewSources === 0
    };
  }, [boms, selection, mpr]);

  const validateSelection = () => {
    if (!payload.selections.length) {
      notify('Select at least one submitted BOM.', 'error');
      return false;
    }

    for (const selectedBom of payload.selections) {
      if (!selectedBom.colors.length) {
        notify('Select at least one Product Color for every selected BOM.', 'error');
        return false;
      }
      for (const colorId of selectedBom.colors) {
        const selectedShipToIds = selectedBom.shipToIdsByColor?.[colorId] || [];
        if (!selectedShipToIds.length) {
          notify('Select at least one Ship To for every selected Product Color.', 'error');
          return false;
        }
        for (const shipToId of selectedShipToIds) {
          const quantity = selectedBom.shipToQtyByColor?.[colorId]?.[shipToId];
          if (quantity === '' || quantity === null || quantity === undefined || !Number.isFinite(Number(quantity)) || Number(quantity) < 0) {
            notify('Enter a valid PO Qty for every selected Ship To.', 'error');
            return false;
          }
        }
      }
    }

    if (selectedSourceStatus.duplicateOnly) {
      notify('This setup is already in MPR. Choose a new Product Color or Packing, or edit the existing batch in Generation Batches.', 'warning');
      return false;
    }

    return true;
  };

  const isBlockingValidationIssue = (issue) => issue?.blocking !== false;
  const isMasterDataWarningIssue = (issue) => issue?.blocking === false
    && ['MAT_INFO_MISMATCH', 'MAT_INFO_NOT_FOUND'].includes(String(issue?.code || '').toUpperCase());

  const requestMasterDataWarningConfirmation = (issues, actionLabel) => new Promise((resolve) => {
    masterDataWarningResolverRef.current = resolve;
    setMasterDataWarning({
      open: true,
      issues: Array.isArray(issues) ? issues : [],
      actionLabel: actionLabel || 'Continue'
    });
  });

  const resolveMasterDataWarning = (proceed) => {
    const resolver = masterDataWarningResolverRef.current;
    masterDataWarningResolverRef.current = null;
    setMasterDataWarning((current) => ({ ...current, open: false }));
    if (resolver) resolver(Boolean(proceed));
  };

  const unresolvedValidationIssues = useMemo(() => (validationReview.issues || []).filter((issue) => {
    const state = selection[issue?.bomId] || emptyBomSelection();
    const colorId = issue?.productColorId || '';
    const selectedIds = state.shipToIdsByColor?.[colorId] || [];
    return !isValidationIssueResolved(issue, selectedIds);
  }), [selection, validationReview.issues]);

  const reviewValidationIssue = (issue) => {
    if (!issue?.bomId) return;
    const bomIndex = boms.findIndex((item) => item?.id === issue.bomId);
    setValidationReview((current) => ({ ...current, open: false }));
    setWorkspaceTab('sources');
    setBomSearch('');
    setBomStatusFilter('ALL');
    setSelection((current) => ({
      ...current,
      [issue.bomId]: {
        ...(current[issue.bomId] || emptyBomSelection()),
        selected: true
      }
    }));
    setExpandedBomId(issue.bomId);
    setFocusedValidationIssue(issue);

    // Filter-reset effects may briefly return the list to page 1. Apply the
    // target page immediately after those effects, then scroll to the color.
    window.setTimeout(() => {
      if (bomIndex >= 0) setBomPage(Math.floor(bomIndex / Math.max(1, bomRowsPerPage)));
      window.setTimeout(() => {
        const selector = `[data-mpr-bom-id="${cssAttributeEscape(issue.bomId)}"][data-mpr-color-id="${cssAttributeEscape(issue.productColorId || '')}"]`;
        const element = document.querySelector(selector);
        if (element) element.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
      }, 220);
    }, 20);
  };

  const runMprPreflight = async (actionLabel = 'Create MPR') => {
    setPreflightBusy(true);
    try {
      const result = await validateMpr(order.id, payload);
      const issues = Array.isArray(result?.issues) ? result.issues : [];
      const blockingIssues = issues.filter(isBlockingValidationIssue);
      const warningIssues = issues.filter(isMasterDataWarningIssue);

      setValidationReview({ open: blockingIssues.length > 0, issues: blockingIssues });
      if (blockingIssues.length > 0) {
        setFocusedValidationIssue(blockingIssues[0]);
        return false;
      }
      setFocusedValidationIssue(null);

      if (warningIssues.length > 0) {
        return await requestMasterDataWarningConfirmation(warningIssues, actionLabel);
      }
      return true;
    } catch (error) {
      notify(getApiError(error, 'Unable to validate MPR setup.'), 'error');
      return false;
    } finally {
      setPreflightBusy(false);
    }
  };

  const resetSelection = () => {
    setSelection(initialSelection(boms));
    setExpandedBomId(null);
    setValidationReview({ open: false, issues: [] });
    setFocusedValidationIssue(null);
  };

  const previewMprAction = async () => {
    if (!canMutateMpr || !llBeanMprEnabled) {
      notify(!canMutateMpr ? mutationBlockedMessage : buyerStrategyMessage, 'warning');
      return;
    }
    if (!validateSelection()) return;
    if (!(await runMprPreflight('Preview MPR'))) return;
    try {
      const result = await previewMpr(order.id, payload);
      const currentLines = mpr?.lines || [];
      const resultLines = result?.lines || [];
      const currentSourceRows = mprPhysicalSourceCount(currentLines);
      const resultSourceRows = mprPhysicalSourceCount(resultLines);
      const addedSourceRows = Math.max(0, resultSourceRows - currentSourceRows);
      const addedDuplicateRows = Math.max(0, mprRemovedDuplicateCount(resultLines) - mprRemovedDuplicateCount(currentLines));
      setPreview(result);

      notify(
        `MPR preview: ${addedSourceRows} new source row(s), ${addedDuplicateRows} duplicate row(s) consolidated, ${resultLines.length} final MPR row(s).`
      );
    } catch (error) {
      notify(getApiError(error, 'Unable to preview MPR.'), 'error');
    }
  };

  const generate = async () => {
    if (!canMutateMpr || !llBeanMprEnabled) {
      notify(!canMutateMpr ? mutationBlockedMessage : buyerStrategyMessage, 'warning');
      return;
    }
    if (generateProgress.status === 'processing' || preflightBusy) return;
    if (!validateSelection()) return;
    if (!(await runMprPreflight('Create MPR'))) return;

    startGenerateProgress();

    try {
      const previousLines = mpr?.lines || [];
      const result = await generateMpr(order.id, payload);
      const resultLines = result?.lines || [];
      const addedSourceRows = Math.max(0, mprPhysicalSourceCount(resultLines) - mprPhysicalSourceCount(previousLines));
      const addedDuplicateRows = Math.max(0, mprRemovedDuplicateCount(resultLines) - mprRemovedDuplicateCount(previousLines));

      const previousBatchIds = new Set((mpr?.selections || []).map((item) => item?.batchId).filter(Boolean));
      const newBatches = (result?.selections || [])
        .filter((item) => item?.batchId && !previousBatchIds.has(item.batchId))
        .sort((left, right) => {
          const leftTime = left?.createdAt ? new Date(left.createdAt).getTime() : 0;
          const rightTime = right?.createdAt ? new Date(right.createdAt).getTime() : 0;
          return rightTime - leftTime;
        });

      setMpr(result);
      setPreview(null);
      onOrderStatusChange?.('MPR_IN_PROGRESS');
      // Clear the active source selection so the same BOMs are not accidentally
      // generated twice. Their last successful configuration remains persisted
      // in MPR Generation Batches and is restored when Configure is opened again.
      resetSelection();
      setExpandedBomId(null);
      setBatchSearch('');
      setBatchPage(0);
      setExpandedBatchId(newBatches[0]?.batchId || null);
      setWorkspaceTab('batches');
      finishGenerateProgress({
        sourceRows: addedSourceRows,
        duplicateRows: addedDuplicateRows,
        finalRows: resultLines.length
      });

      notify(`${addedSourceRows} source row(s) accepted; ${addedDuplicateRows} duplicate row(s) consolidated; ${resultLines.length} MPR row(s) saved.`);
    } catch (error) {
      const message = getApiError(error, 'Unable to add MPR lines.');
      failGenerateProgress(message);
      notify(message, 'error');
    }
  };

  const exportMprExcel = async () => {
    if (!mpr?.id || !order?.id) {
      notify('Create MPR data before exporting Excel.', 'warning');
      return;
    }
    if (generateProgress.status === 'processing' || exportProgress.status === 'processing' || preflightBusy) return;

    setPreflightBusy(true);
    try {
      const validation = await validateMprMasterData(order.id);
      const warningIssues = (Array.isArray(validation?.issues) ? validation.issues : []).filter(isMasterDataWarningIssue);
      if (warningIssues.length > 0) {
        const proceed = await requestMasterDataWarningConfirmation(warningIssues, 'Export MPR');
        if (!proceed) return;
      }
    } catch (error) {
      notify(getApiError(error, 'Unable to validate MAT Info before export.'), 'error');
      return;
    } finally {
      setPreflightBusy(false);
    }

    const fileName = mprDownloadName(mpr);
    startExportProgress();

    try {
      const result = await downloadWithAuth(
        getMprExportUrl(order.id),
        fileName,
        { onDownloadProgress: updateExportDownloadProgress }
      );
      finishExportProgress(result);
      notify(`MPR Excel exported successfully: ${fileName}`);
    } catch (error) {
      const message = getApiError(error, 'Unable to export MPR Excel file.');
      failExportProgress(message);
      notify(message, 'error');
    }
  };

  const uploadEditedMprExcel = async (event) => {
    const file = event?.target?.files?.[0];
    if (event?.target) event.target.value = '';
    if (!file) return;
    if (!canMutateMpr) { notify(mutationBlockedMessage, 'warning'); return; }
    if (!mpr?.id || !order?.id) {
      notify('Create MPR and download the current MPR file before uploading changes.', 'warning');
      return;
    }

    setMprUploading(true);
    if (mprUploadTickerRef.current) window.clearInterval(mprUploadTickerRef.current);
    setMprUploadProgress(initialUploadProgress(file));
    mprUploadTickerRef.current = startProcessingTicker(setMprUploadProgress);
    try {
      const result = await uploadMprExcel(order.id, file, {
        onUploadProgress: (progressEvent) => {
          const nextValue = uploadProgressFromEvent(progressEvent);
          setMprUploadProgress((current) => ({
            ...current, open: true, file, progress: Math.max(Number(current.progress || 0), nextValue),
            status: uploadStage(nextValue), state: 'processing'
          }));
        }
      });
      if (mprUploadTickerRef.current) window.clearInterval(mprUploadTickerRef.current);
      mprUploadTickerRef.current = null;
      setMpr(result);
      setPreview(null);
      setMprUploadProgress({
        open: true, file, progress: 100, status: 'MPR Excel update completed.',
        detail: `${Array.isArray(result?.lines) ? result.lines.length : 0} MPR line(s) loaded. SAMPLE QTY, MCD STOCK, CMCD STOCK and NON SAP STOCK QTY were saved; calculated columns were recalculated.`,
        state: 'success'
      });
      notify(`MPR updated from ${file.name}.`);
    } catch (error) {
      if (mprUploadTickerRef.current) window.clearInterval(mprUploadTickerRef.current);
      mprUploadTickerRef.current = null;
      const message = getApiError(error, 'Unable to update MPR from Excel.');
      setMprUploadProgress((current) => ({ ...current, open: true, file, status: 'MPR Excel update failed.', detail: message, state: 'error' }));
      notify(message, 'error');
    } finally {
      setMprUploading(false);
    }
  };

  const confirmCurrentMpr = async () => {
    if (!canMutateMpr) { notify(mutationBlockedMessage, 'warning'); return; }
    if ((mpr?.selections || []).some((item) => item?.bomSourceChanged)) {
      notify('A source BOM has changed. Update the changed BOM source before confirming this MPR.', 'warning');
      return;
    }
    if (!mpr?.id || !order?.id || confirming) return;

    setConfirming(true);
    try {
      const result = await confirmMpr(order.id);
      setMpr(result);
      setPreview(null);
      setConfirmOpen(false);
      onOrderStatusChange?.('MPR_COMPLETED');
      notify('MPR confirmed. Order status changed to MPR COMPLETED.');
    } catch (error) {
      notify(getApiError(error, 'Unable to confirm MPR.'), 'error');
    } finally {
      setConfirming(false);
    }
  };

  const reopenCurrentMpr = async () => {
    if (!canReopenMpr) {
      notify('You do not have permission to reopen a completed MPR.', 'warning');
      return;
    }
    const reason = reopenReason.trim();
    if (!reason) {
      notify('Enter a reason for reopening this MPR.', 'warning');
      return;
    }
    if (!order?.id || reopening) return;

    setReopening(true);
    try {
      const result = await reopenMpr(order.id, reason);
      setMpr(result);
      setPreview(null);
      setReopenOpen(false);
      setReopenReason('');
      onOrderStatusChange?.('MPR_IN_PROGRESS');
      notify('MPR reopened and changed back to IN PROGRESS.');
    } catch (error) {
      notify(getApiError(error, 'Unable to reopen MPR.'), 'error');
    } finally {
      setReopening(false);
    }
  };

  const remove = async () => {
    if (!canMutateMpr) { notify(mutationBlockedMessage, 'warning'); return; }
    try {
      await deleteMpr(order.id);
      setMpr(null);
      setPreview(null);
      setDeleteOpen(false);
      setWorkspaceTab('sources');
      setExpandedBatchId(null);
      onOrderStatusChange?.('BOM_SUBMITTED');
      notify('MPR deleted.');
    } catch (error) {
      notify(getApiError(error, 'Unable to delete MPR.'), 'error');
    }
  };

  const removeMprBatch = async () => {
    if (!canMutateMpr) { notify(mutationBlockedMessage, 'warning'); return; }
    if (!mpr?.id || !batchDeleteTarget?.batchId) return;

    setBatchDeleting(true);
    try {
      const result = await deleteMprBatch(order.id, batchDeleteTarget.batchId);
      const removed = Number(result?.removedLineCount || 0);
      const remaining = Number(result?.remainingLineCount || 0);

      setPreview(null);
      setBatchDeleteTarget(null);
      setExpandedBatchId(null);

      if (result?.mprDeleted || !result?.mpr) {
        setMpr(null);
        setWorkspaceTab('sources');
        onOrderStatusChange?.('BOM_SUBMITTED');
        notify(`Batch deleted. ${removed} source row(s) removed. The MPR is now empty.`);
      } else {
        setMpr(result.mpr);
        notify(`Batch deleted. ${removed} source row(s) removed. ${remaining} final MPR row(s) remain.`);
      }
    } catch (error) {
      notify(getApiError(error, 'Unable to delete this MPR batch.'), 'error');
    } finally {
      setBatchDeleting(false);
    }
  };

  const openBatchEdit = (batch) => {
    if (!canMutateMpr) { notify(mutationBlockedMessage, 'warning'); return; }
    const bom = boms.find((item) => item.id === batch.bomId);
    if (!bom) {
      notify('The source BOM is no longer available for editing.', 'error');
      return;
    }

    const options = productColorsForBom(bom);
    const selectedOptions = options.filter((option) => savedColorForOption(batch.colors, option, options, mpr, batch));
    const colorKeys = selectedOptions.map(productColorKey).filter(Boolean);

    const shipToIdsByColor = Object.fromEntries(selectedOptions.map((option) => [
      productColorKey(option),
      mappedColorValue(batch.shipToIdsByColor, option, options, []) || []
    ]));
    const shipToQtyByColor = Object.fromEntries(selectedOptions.map((option) => {
      const colorKey = productColorKey(option);
      const ids = shipToIdsByColor[colorKey] || [];
      return [colorKey, legacyAwareShipToQty(
        mappedColorValue(batch.shipToQtyByColor, option, options, {}),
        ids,
        mappedColorValue(batch.poQtyByColor, option, options, '')
      )];
    }));

    setBatchEditTarget(batch);
    setBatchEditForm({
      colors: colorKeys,
      packingIds: [...(batch.packingIds || [])],
      poQtyByColor: Object.fromEntries(selectedOptions.map((option) => {
        const colorKey = productColorKey(option);
        return [colorKey, sumShipToQty(shipToQtyByColor[colorKey] || {}, shipToIdsByColor[colorKey] || [])];
      })),
      shipToIdsByColor,
      shipToQtyByColor
    });
  };

  const toggleBatchColor = (colorId) => {
    if (!canMutateMpr) { notify(mutationBlockedMessage, 'warning'); return; }
    setBatchEditForm((current) => {
      const colors = new Set(current.colors || []);
      const poQtyByColor = { ...(current.poQtyByColor || {}) };
      const shipToIdsByColor = { ...(current.shipToIdsByColor || {}) };
      const shipToQtyByColor = { ...(current.shipToQtyByColor || {}) };
      if (colors.has(colorId)) {
        colors.delete(colorId);
        delete poQtyByColor[colorId];
        delete shipToIdsByColor[colorId];
        delete shipToQtyByColor[colorId];
      } else {
        colors.add(colorId);
        poQtyByColor[colorId] = '';
        shipToIdsByColor[colorId] = [];
        shipToQtyByColor[colorId] = {};
      }
      return { ...current, colors: Array.from(colors), poQtyByColor, shipToIdsByColor, shipToQtyByColor };
    });
  };

  const toggleBatchPacking = (packingId) => {
    if (!canMutateMpr) { notify(mutationBlockedMessage, 'warning'); return; }
    setBatchEditForm((current) => {
      const packingIds = new Set(current.packingIds || []);
      if (packingIds.has(packingId)) packingIds.delete(packingId);
      else packingIds.add(packingId);
      return { ...current, packingIds: Array.from(packingIds) };
    });
  };

  const changeBatchShipToQty = (color, shipToId, value) => {
    if (!canMutateMpr) { notify(mutationBlockedMessage, 'warning'); return; }
    setBatchEditForm((current) => {
      const ids = current.shipToIdsByColor?.[color] || [];
      const nextColorQty = { ...(current.shipToQtyByColor?.[color] || {}), [shipToId]: value };
      return {
        ...current,
        shipToQtyByColor: { ...current.shipToQtyByColor, [color]: nextColorQty },
        poQtyByColor: { ...current.poQtyByColor, [color]: sumShipToQty(nextColorQty, ids) }
      };
    });
  };

  const changeBatchShipTos = (color, selected) => {
    if (!canMutateMpr) { notify(mutationBlockedMessage, 'warning'); return; }
    setBatchEditForm((current) => {
      const selectedIds = (selected || []).map((item) => item.id).filter(Boolean);
      const previousQty = current.shipToQtyByColor?.[color] || {};
      const nextColorQty = Object.fromEntries(selectedIds.map((id) => [id, previousQty?.[id] ?? '']));
      return {
        ...current,
        shipToIdsByColor: { ...current.shipToIdsByColor, [color]: selectedIds },
        shipToQtyByColor: { ...current.shipToQtyByColor, [color]: nextColorQty },
        poQtyByColor: { ...current.poQtyByColor, [color]: sumShipToQty(nextColorQty, selectedIds) }
      };
    });
  };

  const saveBatchEdit = async () => {
    if (!canMutateMpr) { notify(mutationBlockedMessage, 'warning'); return; }
    if (!batchEditTarget?.batchId) return;
    const colors = batchEditForm.colors || [];
    if (!colors.length) {
      notify('Select at least one Product Color.', 'error');
      return;
    }
    for (const color of colors) {
      const selectedShipToIds = batchEditForm.shipToIdsByColor?.[color] || [];
      if (!selectedShipToIds.length) {
        notify('Select at least one Ship To for every selected Product Color.', 'error');
        return;
      }
      for (const shipToId of selectedShipToIds) {
        const quantity = batchEditForm.shipToQtyByColor?.[color]?.[shipToId];
        if (quantity === '' || quantity === null || quantity === undefined || !Number.isFinite(Number(quantity)) || Number(quantity) < 0) {
          notify('Enter a valid PO Qty for every selected Ship To.', 'error');
          return;
        }
      }
    }

    setBatchSaving(true);
    try {
      const result = await updateMprBatch(order.id, batchEditTarget.batchId, {
        colors,
        packingIds: batchEditForm.packingIds || [],
        poQtyByColor: Object.fromEntries(colors.map((color) => [
          color, sumShipToQty(batchEditForm.shipToQtyByColor?.[color] || {}, batchEditForm.shipToIdsByColor?.[color] || [])
        ])),
        shipToIdsByColor: Object.fromEntries(colors.map((color) => [color, batchEditForm.shipToIdsByColor?.[color] || []])),
        shipToQtyByColor: Object.fromEntries(colors.map((color) => [
          color,
          Object.fromEntries((batchEditForm.shipToIdsByColor?.[color] || []).map((shipToId) => [
            shipToId, numberValue(batchEditForm.shipToQtyByColor?.[color]?.[shipToId])
          ]))
        ]))
      });
      setMpr(result);
      setPreview(null);
      setBatchEditTarget(null);
      notify('Product Color, Packing and PO Qty by Ship To were updated for this MPR batch.');
    } catch (error) {
      notify(getApiError(error, 'Unable to update this MPR batch.'), 'error');
    } finally {
      setBatchSaving(false);
    }
  };

  const refreshChangedBomSource = async (bomId) => {
    if (!canMutateMpr) { notify(mutationBlockedMessage, 'warning'); return; }
    if (!order?.id || !bomId || sourceRefreshingBomId || sourceRefreshingAll) return;

    setSourceRefreshingBomId(bomId);
    try {
      const result = await refreshMprBomSource(order.id, bomId);
      setMpr(result);
      setPreview(null);
      notify('MPR was updated from the latest BOM while keeping MPR-owned Sales and stock inputs.');
    } catch (error) {
      notify(getApiError(error, 'Unable to update MPR from this BOM.'), 'error');
    } finally {
      setSourceRefreshingBomId('');
    }
  };

  const refreshAllChangedBomSources = async () => {
    if (!canMutateMpr) { notify(mutationBlockedMessage, 'warning'); return; }
    if (!order?.id || sourceRefreshingAll || sourceRefreshingBomId) return;

    setSourceRefreshingAll(true);
    try {
      const result = await refreshAllMprBomSources(order.id);
      setMpr(result);
      setPreview(null);
      notify('All changed BOM sources were updated in the MPR.');
    } catch (error) {
      notify(getApiError(error, 'Unable to update all changed BOM sources.'), 'error');
    } finally {
      setSourceRefreshingAll(false);
    }
  };

  const saveMprLine = async (payload) => {
    if (!canMutateMpr) { notify(mutationBlockedMessage, 'warning'); return; }
    if (!mpr?.id || !editingLine?.id) return;
    setLineSaving(true);
    try {
      const result = await updateMprLine(order.id, editingLine.id, payload);
      setMpr(result);
      setPreview(result);
      const updatedLine = (result?.lines || []).find((item) => item?.id === editingLine.id);
      const latestReview = latestBomReview(updatedLine);
      setEditingLine(null);
      notify(
        latestReview?.status === 'PENDING_BOM_REVIEW'
          ? 'MPR item updated and sent to BOM for review.'
          : 'MPR item updated.'
      );
    } catch (error) {
      notify(getApiError(error, 'Unable to update MPR item.'), 'error');
    } finally {
      setLineSaving(false);
    }
  };

  const removeMprLine = async () => {
    if (!canMutateMpr) { notify(mutationBlockedMessage, 'warning'); return; }
    if (!mpr?.id || !lineDeleteTarget?.id) return;
    setLineSaving(true);
    try {
      const result = await deleteMprLine(order.id, lineDeleteTarget.id);
      setMpr(result);
      setPreview(result);
      setLineDeleteTarget(null);
      if (!result) {
        setWorkspaceTab('sources');
        onOrderStatusChange?.('BOM_SUBMITTED');
        notify('The last MPR item was deleted. MPR status is now NOT STARTED.');
      } else {
        notify('MPR item deleted.');
      }
    } catch (error) {
      notify(getApiError(error, 'Unable to delete MPR item.'), 'error');
    } finally {
      setLineSaving(false);
    }
  };

  const displayedMpr = preview || mpr;
  const unfilteredVisibleLines = displayedMpr?.lines || [];
  const mprFilterOptions = useMemo(() => {
    const productColors = new Map();
    const sources = new Map();
    const shipTos = new Map();

    unfilteredVisibleLines.forEach((line) => {
      const color = String(line?.styleColor || '').trim();
      const sourceKey = mprLineSourceKey(line);
      const sourceLabel = mprLineSourceLabel(line);
      const shipTo = String(line?.shipTo || '').trim();
      if (color) productColors.set(normalizeText(color), color);
      if (sourceKey) sources.set(sourceKey, sourceLabel);
      if (shipTo) shipTos.set(normalizeText(shipTo), shipTo);
    });

    return {
      productColors: Array.from(productColors, ([key, label]) => ({ key, label }))
        .sort((left, right) => left.label.localeCompare(right.label)),
      sources: Array.from(sources, ([key, label]) => ({ key, label }))
        .sort((left, right) => left.label.localeCompare(right.label)),
      shipTos: Array.from(shipTos, ([key, label]) => ({ key, label }))
        .sort((left, right) => left.label.localeCompare(right.label))
    };
  }, [unfilteredVisibleLines]);
  const visibleLines = useMemo(
    () => unfilteredVisibleLines.filter((line) => mprLineMatchesFilters(line, mprFilters)),
    [unfilteredVisibleLines, mprFilters]
  );
  const { sortedRows: sortedVisibleLines, sortKey: mprSortKey, sortDirection: mprSortDirection, requestSort: requestMprSort } = useTableSort(visibleLines);
  const mprColumnTotals = useMemo(() => ({
    poQuantity: sumMprColumn(visibleLines, 'poQuantity'),
    matRequiredQuantity: sumMprColumn(visibleLines, 'matRequiredQuantity'),
    purchaseQuantity: sumMprColumn(visibleLines, 'purchaseQuantity')
  }), [visibleLines]);
  const subtotalMatAmountUsd = useMemo(
    () => sumMprColumn(visibleLines, 'matAmountUsd'),
    [visibleLines]
  );
  const canEditLines = Boolean(canMutateMpr && mpr?.id && (!preview || preview?.id === mpr.id));
  const canManageBatches = Boolean(canMutateMpr && mpr?.id && (!preview || preview?.id === mpr.id));

  const batchSummaries = useMemo(() => (
    (mpr?.selections || [])
      .filter((selectionItem) => selectionItem?.batchId)
      .map((selectionItem) => {
        const sourceBom = (boms || []).find((bom) => String(bom?.id || '') === String(selectionItem?.bomId || ''));
        const sourceProductColors = productColorsForBom(sourceBom);
        const colorLabels = (selectionItem.colors || []).map((reference) => {
          const option = productColorOptionForRef(sourceProductColors, reference);
          return option ? productColorLabel(option) : reference;
        });
        const representedLines = (mpr?.lines || []).filter((line) => mprLineHasBatch(line, selectionItem.batchId));
        const batchTraces = representedLines.flatMap((line) => (
          mprLineSourceTraces(line).filter((trace) => trace?.generationBatchId === selectionItem.batchId)
        ));
        const packingNames = Array.from(new Set(
          batchTraces.map((trace) => (
            String(trace?.section || '').toUpperCase() === 'PACKING'
              ? (trace?.packingName || trace?.packingId || 'Packing')
              : 'Core BOM (No Packing)'
          )).filter(Boolean)
        ));

        return {
          batchId: selectionItem.batchId,
          bomId: selectionItem.bomId || '',
          bomNo: selectionItem.bomNo || '',
          bomName: selectionItem.bomName || '',
          colors: selectionItem.colors || [],
          colorLabels,
          packingIds: selectionItem.packingIds || [],
          packingNames,
          createdAt: selectionItem.createdAt,
          createdBy: selectionItem.createdBy,
          poQtyByColor: selectionItem.poQtyByColor || {},
          shipToIdsByColor: selectionItem.shipToIdsByColor || {},
          shipToQtyByColor: selectionItem.shipToQtyByColor || {},
          shipToByColor: selectionItem.shipToByColor || {},
          bomSourceRevision: selectionItem.bomSourceRevision ?? 0,
          currentBomSourceRevision: selectionItem.currentBomSourceRevision ?? selectionItem.bomSourceRevision ?? 0,
          currentBomSourceChangedAt: selectionItem.currentBomSourceChangedAt || null,
          currentBomSourceChangedBy: selectionItem.currentBomSourceChangedBy || '',
          currentBomSourceChangeSummary: selectionItem.currentBomSourceChangeSummary || '',
          bomSourceChanged: Boolean(selectionItem.bomSourceChanged),
          bomSourceMissing: Boolean(selectionItem.bomSourceMissing),
          sourceLineCount: batchTraces.length,
          lineCount: representedLines.length
        };
      })
      .filter((batch) => batch.sourceLineCount > 0)
      .sort((left, right) => {
        const leftTime = left?.createdAt ? new Date(left.createdAt).getTime() : 0;
        const rightTime = right?.createdAt ? new Date(right.createdAt).getTime() : 0;
        if (leftTime !== rightTime) return rightTime - leftTime;
        return String(right?.batchId || '').localeCompare(String(left?.batchId || ''));
      })
  ), [mpr, boms]);

  const bomBatchCountById = useMemo(() => {
    const counts = new Map();
    batchSummaries.forEach((batch) => {
      if (!batch?.bomId) return;
      counts.set(batch.bomId, (counts.get(batch.bomId) || 0) + 1);
    });
    return counts;
  }, [batchSummaries]);

  const selectedBomCount = useMemo(
    () => boms.reduce((count, bom) => count + (selection[bom.id]?.selected ? 1 : 0), 0),
    [boms, selection]
  );

  const filteredBoms = useMemo(() => boms.filter((bom) => {
    const batchCount = bomBatchCountById.get(bom.id) || 0;
    const isSelected = Boolean(selection[bom.id]?.selected);
    const searchable = [
      bom.bomNo,
      bom.bomName,
      bom.header?.styleNo,
      bom.header?.styleNumber,
      bom.header?.patternNumber,
      bom.header?.season
    ].filter(Boolean).join(' ');
    const matchesKeyword = !bomSearch.trim() || includesText(searchable, bomSearch);
    const matchesStatus = bomStatusFilter === 'ALL'
      || (bomStatusFilter === 'ADDED' && batchCount > 0)
      || (bomStatusFilter === 'NOT_ADDED' && batchCount === 0)
      || (bomStatusFilter === 'SELECTED' && isSelected);
    return matchesKeyword && matchesStatus;
  }), [boms, bomBatchCountById, bomSearch, bomStatusFilter, selection]);
  const { sortedRows: sortedSourceBoms, sortKey: sourceSortKey, sortDirection: sourceSortDirection, requestSort: requestSourceSort } = useTableSort(filteredBoms, {
    getValue: (bom, key) => {
      const coreCount = Number(bom.coreLineCount ?? (bom.coreLines || []).length) || 0;
      const totalCount = Number(bom.lineCount ?? ((bom.coreLines || []).length + (bom.packings || []).reduce((total, packing) => total + (packing.lineCount ?? (packing.lines || []).length), 0))) || 0;
      if (key === 'bom') return `${bom.bomNo || ''} ${bom.bomName || ''}`;
      if (key === 'core') return coreCount;
      if (key === 'total') return totalCount;
      if (key === 'packings') return (bom.packings || []).length;
      if (key === 'mprStatus') return selection[bom.id]?.selected ? 'SELECTED' : ((bomBatchCountById.get(bom.id) || 0) > 0 ? 'ADDED' : 'NOT_ADDED');
      return bom?.[key];
    }
  });

  const pagedBoms = useMemo(() => {
    const start = bomPage * bomRowsPerPage;
    return sortedSourceBoms.slice(start, start + bomRowsPerPage);
  }, [sortedSourceBoms, bomPage, bomRowsPerPage]);

  const filteredBatches = useMemo(() => batchSummaries.filter((batch) => {
    const searchable = [
      batch.bomNo,
      batch.bomName,
      ...(batch.colors || []),
      ...(batch.colorLabels || []),
      ...(batch.packingNames || []),
      batch.createdBy
    ].filter(Boolean).join(' ');
    return !batchSearch.trim() || includesText(searchable, batchSearch);
  }), [batchSummaries, batchSearch]);

  const pagedBatches = useMemo(() => {
    const start = batchPage * batchRowsPerPage;
    return filteredBatches.slice(start, start + batchRowsPerPage);
  }, [filteredBatches, batchPage, batchRowsPerPage]);

  useEffect(() => {
    setBomPage(0);
  }, [bomSearch, bomStatusFilter, bomRowsPerPage]);

  useEffect(() => {
    setBatchPage(0);
  }, [batchSearch, batchRowsPerPage]);

  useEffect(() => {
    const maxPage = Math.max(0, Math.ceil(filteredBoms.length / bomRowsPerPage) - 1);
    if (bomPage > maxPage) setBomPage(maxPage);
  }, [filteredBoms.length, bomPage, bomRowsPerPage]);

  useEffect(() => {
    const maxPage = Math.max(0, Math.ceil(filteredBatches.length / batchRowsPerPage) - 1);
    if (batchPage > maxPage) setBatchPage(maxPage);
  }, [filteredBatches.length, batchPage, batchRowsPerPage]);

  const openBomConfiguration = (bom) => {
    if (!canMutateMpr || !bom?.id) return;

    // Keep already-generated selections visible as saved history, but do not
    // silently load them into the next Create MPR request. This prevents an
    // old batch from looking like a new selection and being submitted again.
    setSelection((current) => ({
      ...current,
      [bom.id]: {
        ...(current[bom.id] || emptyBomSelection()),
        selected: true
      }
    }));
    setExpandedBomId((current) => current === bom.id ? null : bom.id);
  };

  const batchEditBom = useMemo(
    () => boms.find((bom) => bom.id === batchEditTarget?.bomId) || null,
    [boms, batchEditTarget?.bomId]
  );
  const batchEditProductColors = useMemo(
    () => productColorsForBom(batchEditBom),
    [batchEditBom]
  );

  const staleBomGroups = useMemo(() => {
    const groups = new Map();
    (mpr?.selections || []).forEach((item) => {
      if (!item?.bomSourceChanged || !item?.bomId) return;
      const existing = groups.get(item.bomId) || {
        bomId: item.bomId,
        bomNo: item.bomNo || '',
        bomName: item.bomName || '',
        batchCount: 0,
        currentBomSourceRevision: item.currentBomSourceRevision ?? item.bomSourceRevision ?? 0,
        changedAt: item.currentBomSourceChangedAt || null,
        changedBy: item.currentBomSourceChangedBy || '',
        summary: item.currentBomSourceChangeSummary || 'BOM source data changed',
        missing: Boolean(item.bomSourceMissing)
      };
      existing.batchCount += 1;
      existing.currentBomSourceRevision = item.currentBomSourceRevision ?? existing.currentBomSourceRevision;
      existing.changedAt = item.currentBomSourceChangedAt || existing.changedAt;
      existing.changedBy = item.currentBomSourceChangedBy || existing.changedBy;
      existing.summary = item.currentBomSourceChangeSummary || existing.summary;
      existing.missing = existing.missing || Boolean(item.bomSourceMissing);
      groups.set(item.bomId, existing);
    });
    return Array.from(groups.values());
  }, [mpr]);
  const refreshableStaleBomGroups = useMemo(() => staleBomGroups.filter((item) => !item.missing), [staleBomGroups]);
  const hasStaleBomSources = staleBomGroups.length > 0;
  const sourceRefreshBusy = Boolean(sourceRefreshingBomId || sourceRefreshingAll);

  const generationBusy = generateProgress.status === 'processing';
  const exportBusy = exportProgress.status === 'processing';
  const operationBusy = generationBusy || preflightBusy || exportBusy || mprUploading || confirming || reopening || sourceRefreshBusy;
  const visibleMprColumns = useMemo(() => MPR_COLUMNS.filter(([field]) => mprVisibleFields.includes(field)), [mprVisibleFields]);
  const mprTableMinWidth = useMemo(() => Math.max(1500, visibleMprColumns.reduce((total, [, , minWidth]) => total + Number(minWidth || 100), 0) + 190), [visibleMprColumns]);

  return (
    <Box>
      <Paper elevation={0} sx={{ px: 1, py: 0.75, border: '1px solid #e5e7eb', borderRadius: 1.7, mb: 0.8 }}>
        <Stack direction={{ xs: 'column', xl: 'row' }} justifyContent="space-between" spacing={1} alignItems={{ xl: 'center' }}>
          <Box sx={{ minWidth: 220 }}>
            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
              <Typography sx={{ fontWeight: 750, color: '#103B5C', fontSize: '1rem' }}>Sales / MPR</Typography>
              <StatusBadge status={mprStatus} />
              {mpr && (
                <Chip
                  size="small"
                  variant="outlined"
                  label={`${mpr?.lines?.length || 0} MPR line(s)`}
                  sx={{ height: 24, fontWeight: 700, color: '#475569', borderColor: '#cbd5e1' }}
                />
              )}
            </Stack>
          </Box>

          <Stack direction="row" flexWrap="wrap" useFlexGap spacing={0.75} alignItems="center" justifyContent={{ xs: 'flex-start', xl: 'flex-end' }}>
            <Button
              size="small"
              variant="outlined"
              startIcon={<Refresh />}
              onClick={load}
              disabled={loading || operationBusy}
              sx={mprNeutralActionButtonSx}
            >
              Refresh
            </Button>
            {mpr && (
              <>
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<Download />}
                  onClick={exportMprExcel}
                  disabled={loading || operationBusy}
                  sx={{ ...mprNeutralActionButtonSx, minWidth: 116 }}
                >
                  {exportBusy ? 'Exporting...' : 'Export MPR'}
                </Button>
                <Tooltip title={!canMutateMpr ? mutationBlockedMessage : 'Upload edited SAMPLE QTY, MCD STOCK, CMCD STOCK and NON SAP STOCK QTY values'}>
                  <span>
                    <Button
                      size="small"
                      variant="outlined"
                      startIcon={<FileUpload />}
                      onClick={() => mprUploadRef.current?.click()}
                      disabled={loading || operationBusy || !canMutateMpr}
                      sx={{ ...mprNeutralActionButtonSx, minWidth: 118 }}
                    >
                      {mprUploading ? 'Uploading...' : 'Upload MPR'}
                    </Button>
                  </span>
                </Tooltip>
                <input
                  ref={mprUploadRef}
                  type="file"
                  accept=".xlsx,.xls"
                  hidden
                  onChange={uploadEditedMprExcel}
                />
              </>
            )}

            <Box sx={{ display: { xs: 'none', md: 'block' }, height: 28, borderLeft: '1px solid #e2e8f0', mx: 0.25 }} />

            <Tooltip title={!canMutateMpr ? mutationBlockedMessage : (!llBeanMprEnabled ? buyerStrategyMessage : (selectedSourceStatus.duplicateOnly ? 'This setup is already in MPR. Choose a new Product Color or Packing, or edit the existing batch.' : (selectedBomCount ? 'Preview selected BOM configuration' : 'Select at least one BOM first')))}>
              <span>
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<Preview />}
                  onClick={previewMprAction}
                  disabled={loading || operationBusy || !canMutateMpr || !llBeanMprEnabled || selectedBomCount === 0 || selectedSourceStatus.duplicateOnly}
                  sx={mprPreviewActionButtonSx}
                >
                  Preview{selectedBomCount > 0 ? ` (${selectedBomCount})` : ''}
                </Button>
              </span>
            </Tooltip>
            <Tooltip title={!canMutateMpr ? mutationBlockedMessage : (!llBeanMprEnabled ? buyerStrategyMessage : (selectedSourceStatus.duplicateOnly ? 'This setup is already in MPR. Choose a new Product Color or Packing, or edit the existing batch.' : (selectedBomCount ? (mpr ? 'Add selected BOMs to MPR' : 'Create MPR from selected BOMs') : 'Select at least one BOM first')))}>
              <span>
                <Button
                  size="small"
                  variant="contained"
                  startIcon={<Save />}
                  onClick={generate}
                  disabled={loading || operationBusy || !canMutateMpr || !llBeanMprEnabled || selectedBomCount === 0 || selectedSourceStatus.duplicateOnly}
                  sx={{ ...mprPrimaryActionButtonSx, minWidth: 126 }}
                >
                  {preflightBusy ? 'Checking...' : generationBusy ? 'Creating...' : `${mpr ? 'Add To MPR' : 'Create MPR'}${selectedBomCount > 0 ? ` (${selectedBomCount})` : ''}`}
                </Button>
              </span>
            </Tooltip>

            {mpr && (
              <Tooltip title={!canWrite ? writeBlockedMessage : (mprCompleted ? completedLockMessage : (hasStaleBomSources ? 'Update changed BOM sources before confirming this MPR.' : 'Confirm the current MPR as completed'))}>
                <span>
                  <Button
                    size="small"
                    variant={mprCompleted ? 'outlined' : 'contained'}
                    color="success"
                    startIcon={<CheckCircle />}
                    onClick={() => setConfirmOpen(true)}
                    disabled={!canMutateMpr || operationBusy || hasStaleBomSources}
                    sx={{ ...mprActionButtonSx, minWidth: 124, boxShadow: 'none' }}
                  >
                    {mprCompleted ? 'Confirmed' : 'Confirm MPR'}
                  </Button>
                </span>
              </Tooltip>
            )}


            {mprCompleted && (
              <Tooltip title={canReopenMpr ? 'Reopen this MPR and change it back to In Progress' : 'Additional Reopen Completed MPR permission is required'}>
                <span>
                  <Button
                    size="small"
                    variant="contained"
                    color="warning"
                    startIcon={<LockOpen />}
                    onClick={() => setReopenOpen(true)}
                    disabled={!canReopenMpr || operationBusy}
                    sx={{ ...mprActionButtonSx, minWidth: 126, boxShadow: 'none' }}
                  >
                    Reopen MPR
                  </Button>
                </span>
              </Tooltip>
            )}

            {mpr && (
              <Tooltip title={!canMutateMpr ? mutationBlockedMessage : 'Delete the entire MPR'}>
                <span>
                  <Button
                    size="small"
                    variant="outlined"
                    color="error"
                    startIcon={<Delete />}
                    onClick={() => setDeleteOpen(true)}
                    disabled={!canMutateMpr || operationBusy}
                    sx={{
                      ...mprActionButtonSx,
                      backgroundColor: '#ffffff',
                      '&:hover': { backgroundColor: '#fff7f7', boxShadow: 'none' }
                    }}
                  >
                    Delete MPR
                  </Button>
                </span>
              </Tooltip>
            )}
          </Stack>
        </Stack>
      </Paper>

      {!llBeanMprEnabled && (
        <Alert severity="info" sx={{ mb: 2 }}>
          {buyerStrategyMessage}
        </Alert>
      )}

      {hasStaleBomSources && (
        <Alert
          severity={mprCompleted ? 'info' : 'warning'}
          sx={{ mb: 0.8, alignItems: 'flex-start' }}
        >
          <Stack spacing={1} sx={{ width: '100%' }}>
            <Box>
              <Typography sx={{ fontWeight: 800, fontSize: '.85rem' }}>
                {mprCompleted ? 'Source BOM changed after this MPR was completed' : 'Source BOM changed — MPR update required'}
              </Typography>
              <Typography sx={{ mt: 0.25, fontSize: '.76rem' }}>
                {mprCompleted
                  ? 'This completed MPR stays frozen. The BOM change is shown for information only until an authorized user reopens the MPR. After reopening, Update from BOM becomes available.'
                  : 'One or more BOMs changed after this MPR was generated. Review the BOMs below and update the MPR before confirming.'}
              </Typography>
            </Box>

            {staleBomGroups.map((item) => (
              <Paper key={item.bomId} variant="outlined" sx={{ p: 1, borderColor: '#f59e0b', backgroundColor: '#fffdf7' }}>
                <Stack direction={{ xs: 'column', md: 'row' }} spacing={1} justifyContent="space-between" alignItems={{ md: 'center' }}>
                  <Box sx={{ minWidth: 0 }}>
                    <Typography sx={{ fontWeight: 800, fontSize: '.78rem', color: '#7c2d12' }}>
                      {item.bomNo || 'BOM'}{item.bomName ? ` — ${item.bomName}` : ''}
                    </Typography>
                    <Typography sx={{ mt: 0.2, fontSize: '.72rem', color: '#78716c' }}>
                      {item.missing ? 'Source BOM is no longer available.' : item.summary}
                      {item.changedAt ? ` · ${formatDateTime(item.changedAt)}` : ''}
                      {item.changedBy ? ` · ${item.changedBy}` : ''}
                      {item.batchCount > 1 ? ` · ${item.batchCount} MPR batches affected` : ''}
                    </Typography>
                  </Box>
                  {!mprCompleted && !item.missing && (
                    <Button
                      size="small"
                      variant="contained"
                      color="warning"
                      startIcon={<Refresh />}
                      onClick={() => refreshChangedBomSource(item.bomId)}
                      disabled={!canMutateMpr || sourceRefreshBusy}
                      sx={{ textTransform: 'none', fontWeight: 800, whiteSpace: 'nowrap' }}
                    >
                      {sourceRefreshingBomId === item.bomId ? 'Updating...' : 'Update from BOM'}
                    </Button>
                  )}
                </Stack>
              </Paper>
            ))}

            {!mprCompleted && refreshableStaleBomGroups.length > 1 && (
              <Box>
                <Button
                  size="small"
                  variant="outlined"
                  color="warning"
                  startIcon={<Refresh />}
                  onClick={refreshAllChangedBomSources}
                  disabled={!canMutateMpr || sourceRefreshBusy}
                  sx={{ textTransform: 'none', fontWeight: 800 }}
                >
                  {sourceRefreshingAll ? 'Updating all...' : `Update all changed BOMs (${refreshableStaleBomGroups.length})`}
                </Button>
              </Box>
            )}
          </Stack>
        </Alert>
      )}

      {mprCompleted && (
        <Alert severity="info" sx={{ mb: 0.8 }}>
          This MPR is COMPLETED and read-only. Its saved data stays frozen until an authorized user explicitly reopens it with a reason.
        </Alert>
      )}

      <Paper elevation={0} sx={{ border: '1px solid #e5e7eb', borderRadius: 2, overflow: 'hidden' }}>
        <Box sx={{ px: 1.5, borderBottom: '1px solid #e5e7eb', backgroundColor: '#ffffff' }}>
          <Tabs
            value={workspaceTab}
            onChange={(_, value) => setWorkspaceTab(value)}
            variant="scrollable"
            scrollButtons="auto"
            sx={{ minHeight: 40, '& .MuiTab-root': { minHeight: 40, py: 0.75, textTransform: 'none', fontWeight: 700, fontSize: '.8rem' } }}
          >
            <Tab value="sources" label={`BOM Sources (${boms.length})`} />
            <Tab value="batches" label={`Generation Batches (${batchSummaries.length})`} />
          </Tabs>
        </Box>

        {workspaceTab === 'sources' && (
          <Box>
            <Stack
              direction={{ xs: 'column', md: 'row' }}
              spacing={1}
              justifyContent="space-between"
              alignItems={{ md: 'center' }}
              sx={{ px: 1.25, py: 1, backgroundColor: '#fbfdff', borderBottom: '1px solid #e5e7eb' }}
            >
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ flex: 1, maxWidth: 760 }}>
                <TextField
                  size="small"
                  fullWidth
                  value={bomSearch}
                  onChange={(event) => setBomSearch(event.target.value)}
                  placeholder="Search BOM no., BOM name, style, pattern or season..."
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon sx={{ fontSize: 18, color: '#64748b' }} />
                      </InputAdornment>
                    )
                  }}
                />
                <TextField
                  select
                  size="small"
                  label="Status"
                  value={bomStatusFilter}
                  onChange={(event) => setBomStatusFilter(event.target.value)}
                  sx={{ minWidth: { xs: '100%', sm: 160 } }}
                >
                  <MenuItem value="ALL">All BOMs</MenuItem>
                  <MenuItem value="NOT_ADDED">Not Added</MenuItem>
                  <MenuItem value="ADDED">Added to MPR</MenuItem>
                  <MenuItem value="SELECTED">Selected</MenuItem>
                </TextField>
              </Stack>

              <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap alignItems="center">
                <Chip size="small" variant="outlined" label={`${filteredBoms.length} BOM(s)`} sx={{ fontWeight: 700 }} />
                <Chip
                  size="small"
                  label={`${selectedBomCount} selected`}
                  sx={{ fontWeight: 700, color: selectedBomCount ? '#1d4ed8' : '#64748b', backgroundColor: selectedBomCount ? '#eff6ff' : '#f8fafc' }}
                />
                {selectedBomCount > 0 && canMutateMpr && (
                  <Button size="small" onClick={resetSelection} sx={{ textTransform: 'none', fontWeight: 700 }}>
                    Clear selection
                  </Button>
                )}
              </Stack>
            </Stack>

            {boms.length === 0 ? (
              <Box sx={{ py: 4.5, px: 2, textAlign: 'center', color: 'text.secondary' }}>
                <Typography sx={{ fontWeight: 700, color: '#334155', fontSize: '.88rem' }}>No submitted BOM is available</Typography>
                <Typography sx={{ mt: 0.35, fontSize: '.76rem' }}>Submit a BOM first, then return here to configure Product Color, Ship To and PO Qty.</Typography>
              </Box>
            ) : (
              <>
                <TableContainer sx={{ maxHeight: 660 }}>
                  <Table stickyHeader size="small" sx={{ minWidth: 900 }}>
                    <TableHead>
                      <TableRow>
                        <TableCell padding="checkbox" sx={{ width: 44, backgroundColor: '#f8fafc' }} />
                        <SortableTableCell label="No." sortable={false} align="center" sx={{ width: 56, fontWeight: 750, backgroundColor: '#f8fafc' }} />
                        <SortableTableCell label="BOM" columnKey="bom" sortKey={sourceSortKey} sortDirection={sourceSortDirection} onSort={requestSourceSort} sx={{ fontWeight: 750, backgroundColor: '#f8fafc' }} />
                        <SortableTableCell label="Core" columnKey="core" sortKey={sourceSortKey} sortDirection={sourceSortDirection} onSort={requestSourceSort} align="right" sx={{ width: 90, fontWeight: 750, backgroundColor: '#f8fafc' }} />
                        <SortableTableCell label="Total" columnKey="total" sortKey={sourceSortKey} sortDirection={sourceSortDirection} onSort={requestSourceSort} align="right" sx={{ width: 90, fontWeight: 750, backgroundColor: '#f8fafc' }} />
                        <SortableTableCell label="Packings" columnKey="packings" sortKey={sourceSortKey} sortDirection={sourceSortDirection} onSort={requestSourceSort} align="right" sx={{ width: 100, fontWeight: 750, backgroundColor: '#f8fafc' }} />
                        <SortableTableCell label="MPR Status" columnKey="mprStatus" sortKey={sourceSortKey} sortDirection={sourceSortDirection} onSort={requestSourceSort} sx={{ width: 150, fontWeight: 750, backgroundColor: '#f8fafc' }} />
                        <SortableTableCell label="Action" sortable={false} align="right" sx={{ width: 185, fontWeight: 750, backgroundColor: '#f8fafc' }} />
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {pagedBoms.map((bom, index) => {
                        const state = selection[bom.id] || emptyBomSelection();
                        const productColors = productColorsForBom(bom);
                        const coreSourceRows = Number(bom.coreLineCount ?? (bom.coreLines || []).length) || 0;
                        const totalSourceRows = Number(bom.lineCount ?? ((bom.coreLines || []).length + (bom.packings || []).reduce((total, packing) => total + (packing.lineCount ?? (packing.lines || []).length), 0))) || 0;
                        const batchCount = bomBatchCountById.get(bom.id) || 0;
                        const generatedBatches = batchesForBom(mpr, bom.id);
                        const latestGeneratedBatch = generatedBatches[0] || null;
                        const isExpanded = expandedBomId === bom.id && state.selected;
                        const selectedPackingDetails = (bom.packings || [])
                          .filter((packing) => (state.packingIds || []).includes(packing.id))
                          .map((packing) => ({
                            name: packing.packingName || 'Packing',
                            count: Number(packing.lineCount ?? (packing.lines || []).length) || 0
                          }));
                        const selectedPackingSourceRows = selectedPackingDetails.reduce((total, item) => total + item.count, 0);
                        const sourceRowsPerColor = coreSourceRows + selectedPackingSourceRows;
                        const selectedColorCount = (state.colors || []).length;

                        return (
                          <Fragment key={bom.id}>
                            <TableRow
                              hover
                              selected={Boolean(state.selected)}
                              sx={{
                                '&.Mui-selected': { backgroundColor: '#f5f9ff' },
                                '&.Mui-selected:hover': { backgroundColor: '#eef6ff' }
                              }}
                            >
                              <TableCell padding="checkbox">
                                <Checkbox
                                  size="small"
                                  checked={Boolean(state.selected)}
                                  disabled={!canMutateMpr}
                                  onChange={(event) => toggleBom(bom.id, event.target.checked)}
                                />
                              </TableCell>
                              <TableCell align="center" sx={{ color: '#64748b', fontWeight: 650 }}>
                                {bomPage * bomRowsPerPage + index + 1}
                              </TableCell>
                              <TableCell>
                                <Typography sx={{ fontWeight: 750, color: '#0f172a', fontSize: '.83rem' }}>
                                  {bom.bomNo || '-'}{bom.bomName ? ` — ${bom.bomName}` : ''}
                                </Typography>
                                <Typography sx={{ mt: 0.15, fontSize: '.72rem', color: 'text.secondary' }}>
                                  {[bom.header?.patternNumber, bom.header?.season].filter(Boolean).join(' · ') || 'Submitted BOM'}
                                </Typography>
                              </TableCell>
                              <TableCell align="right" sx={{ fontWeight: 750 }}>{coreSourceRows}</TableCell>
                              <TableCell align="right" sx={{ fontWeight: 750 }}>{totalSourceRows}</TableCell>
                              <TableCell align="right" sx={{ fontWeight: 750 }}>{(bom.packings || []).length}</TableCell>
                              <TableCell>
                                {batchCount > 0 ? (
                                  <Chip
                                    size="small"
                                    label={`${batchCount} batch${batchCount > 1 ? 'es' : ''}`}
                                    sx={{ height: 24, fontWeight: 700, color: '#166534', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0' }}
                                  />
                                ) : (
                                  <Chip
                                    size="small"
                                    variant="outlined"
                                    label="Not added"
                                    sx={{ height: 24, fontWeight: 700, color: '#64748b', borderColor: '#cbd5e1' }}
                                  />
                                )}
                              </TableCell>
                              <TableCell align="right">
                                <Button
                                  size="small"
                                  variant="outlined"
                                  startIcon={<Edit sx={{ fontSize: '16px !important' }} />}
                                  disabled={!canMutateMpr}
                                  onClick={() => openBomConfiguration(bom)}
                                  sx={{
                                    minWidth: 148,
                                    px: 1.4,
                                    py: 0.55,
                                    borderRadius: 1.5,
                                    textTransform: 'none',
                                    whiteSpace: 'nowrap',
                                    fontWeight: 700,
                                    color: isExpanded ? '#475569' : '#2563eb',
                                    borderColor: isExpanded ? '#cbd5e1' : '#bfdbfe',
                                    backgroundColor: isExpanded ? '#f8fafc' : '#ffffff',
                                    '&:hover': {
                                      borderColor: isExpanded ? '#94a3b8' : '#60a5fa',
                                      backgroundColor: isExpanded ? '#f1f5f9' : '#eff6ff'
                                    }
                                  }}
                                >
                                  {isExpanded ? 'Close Setup' : 'Configure'}
                                </Button>
                              </TableCell>
                            </TableRow>

                            {isExpanded && (
                              <TableRow>
                                <TableCell colSpan={8} sx={{ p: 0, borderBottom: '1px solid #cbd5e1' }}>
                                  <Box sx={{ p: { xs: 1, md: 1.25 }, backgroundColor: '#fbfdff', borderTop: '1px solid #dbeafe' }}>
                                    <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" spacing={1} sx={{ mb: 1.25 }}>
                                      <Box>
                                        <Typography sx={{ fontWeight: 750, color: '#103B5C', fontSize: '.86rem' }}>
                                          Configure {bom.bomNo || 'BOM'}
                                        </Typography>
                                        <Typography sx={{ fontSize: '.74rem', color: 'text.secondary' }}>
                                          Select Product Color, Ship To quantities and optional Packing sources.
                                        </Typography>
                                      </Box>
                                      <Stack direction="row" spacing={0.6} alignItems="center" flexWrap="wrap" useFlexGap sx={{ alignSelf: { xs: 'flex-start', md: 'center' } }}>
                                        {batchCount > 0 && (
                                          <>
                                            <Chip
                                              size="small"
                                              label={`${batchCount} generated batch${batchCount > 1 ? 'es' : ''}`}
                                              sx={{ height: 24, fontWeight: 700, color: '#166534', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0' }}
                                            />
                                            {latestGeneratedBatch && (
                                              <Button
                                                size="small"
                                                variant="text"
                                                startIcon={<Edit sx={{ fontSize: '15px !important' }} />}
                                                onClick={() => openBatchEdit(latestGeneratedBatch)}
                                                sx={{ minWidth: 0, px: 0.75, textTransform: 'none', fontWeight: 700, fontSize: '.73rem' }}
                                              >
                                                Edit existing
                                              </Button>
                                            )}
                                          </>
                                        )}
                                        <Chip
                                          size="small"
                                          variant="outlined"
                                          label={`${selectedColorCount} color(s) selected`}
                                          sx={{ fontWeight: 700 }}
                                        />
                                      </Stack>
                                    </Stack>

                                    {batchCount > 0 && (
                                      <Alert severity="success" sx={{ mb: 1, py: 0.15, '& .MuiAlert-message': { width: '100%' } }}>
                                        <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" spacing={0.5} alignItems={{ sm: 'center' }}>
                                          <Typography sx={{ fontSize: '.73rem', fontWeight: 700 }}>
                                            Existing MPR selections are shown in green below. Use Generation Batches to change saved values.
                                          </Typography>
                                          <Button
                                            size="small"
                                            onClick={() => {
                                              setWorkspaceTab('batches');
                                              setExpandedBatchId(latestGeneratedBatch?.batchId || null);
                                            }}
                                            sx={{ alignSelf: { xs: 'flex-start', sm: 'center' }, textTransform: 'none', fontWeight: 700, whiteSpace: 'nowrap' }}
                                          >
                                            View batches
                                          </Button>
                                        </Stack>
                                      </Alert>
                                    )}

                                    <Typography sx={{ fontSize: '.78rem', fontWeight: 750, mb: 0.75 }}>
                                      1. Add Product Color / Ship To / PO Qty
                                    </Typography>
                                    <Stack spacing={0.85}>
                                      {productColors.map((productColor) => {
                                        const colorId = productColor.id || productColor.colorName;
                                        const checked = (state.colors || []).includes(colorId);
                                        const selectedShipToIds = state.shipToIdsByColor?.[colorId] || [];
                                        const selectedShipTos = shipTos.filter((item) => selectedShipToIds.includes(item.id));
                                        const generatedInfo = generatedSourceInfoForColor(mpr, bom.id, productColor);
                                        const savedState = generatedInfo.latestBatch
                                          ? sourceSelectionFromBatch(bom, generatedInfo.latestBatch, false, mpr)
                                          : null;
                                        const savedShipToIds = savedState?.shipToIdsByColor?.[colorId] || [];
                                        const savedShipTos = shipTos.filter((item) => savedShipToIds.includes(item.id));
                                        const savedPackingNames = (bom.packings || [])
                                          .filter((packing) => generatedInfo.packingIds.has(packing.id))
                                          .map((packing) => packing.packingName || 'Packing');
                                        const selectedHasNewPacking = (state.packingIds || []).some((packingId) => !generatedInfo.packingIds.has(packingId));
                                        const duplicateOnlyColor = checked && generatedInfo.coreGenerated && !selectedHasNewPacking;
                                        const colorIssues = (validationReview.issues || []).filter((issue) => (
                                          issue?.bomId === bom.id && issue?.productColorId === colorId
                                        ));
                                        const unresolvedColorIssues = colorIssues.filter((issue) => !isValidationIssueResolved(issue, selectedShipToIds));
                                        const isFocusedIssue = focusedValidationIssue?.bomId === bom.id && focusedValidationIssue?.productColorId === colorId;
                                        return (
                                          <Box
                                            key={colorId}
                                            data-mpr-bom-id={bom.id}
                                            data-mpr-color-id={colorId}
                                            sx={{
                                              p: 1,
                                              border: `1px solid ${unresolvedColorIssues.length ? '#fca5a5' : duplicateOnlyColor ? '#fbbf24' : isFocusedIssue && colorIssues.length ? '#86efac' : checked ? '#bfdbfe' : '#e5e7eb'}`,
                                              borderRadius: 1.25,
                                              backgroundColor: unresolvedColorIssues.length ? '#fffafa' : duplicateOnlyColor ? '#fffbeb' : checked ? '#ffffff' : '#f8fafc',
                                              boxShadow: isFocusedIssue ? `0 0 0 2px ${unresolvedColorIssues.length ? 'rgba(239,68,68,.10)' : 'rgba(34,197,94,.10)'}` : 'none',
                                              transition: 'border-color .18s ease, box-shadow .18s ease, background-color .18s ease'
                                            }}
                                          >
                                            <Stack direction={{ xs: 'column', md: 'row' }} alignItems={{ md: 'flex-start' }} spacing={1.25}>
                                              <Box sx={{ flex: '0 0 260px', minWidth: 0 }}>
                                                <FormControlLabel
                                                  sx={{ mr: 0, mt: 0.15, alignItems: 'flex-start' }}
                                                  control={<Checkbox size="small" checked={checked} disabled={!canMutateMpr} onChange={() => toggleColor(bom.id, colorId)} />}
                                                  label={(
                                                    <Stack direction="row" spacing={0.55} alignItems="center" flexWrap="wrap" useFlexGap sx={{ pt: 0.15 }}>
                                                      <Typography sx={{ fontSize: '.8rem', fontWeight: checked ? 800 : 600 }}>{productColorLabel(productColor)}</Typography>
                                                      {generatedInfo.coreGenerated && (
                                                        <Chip
                                                          size="small"
                                                          label="Already in MPR"
                                                          sx={{ height: 20, fontSize: '.64rem', fontWeight: 700, color: '#166534', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0' }}
                                                        />
                                                      )}
                                                    </Stack>
                                                  )}
                                                />
                                                {generatedInfo.batchCount > 1 && (
                                                  <Typography sx={{ ml: 4, mt: 0.15, fontSize: '.66rem', color: '#64748b' }}>
                                                    Used in {generatedInfo.batchCount} batches
                                                  </Typography>
                                                )}
                                              </Box>

                                              <Box sx={{ flex: 1, minWidth: 0 }}>
                                                {generatedInfo.coreGenerated && (
                                                  <Box sx={{ mb: checked ? 0.8 : 0, px: 0.9, py: 0.7, border: '1px solid #bbf7d0', borderRadius: 1, backgroundColor: '#f0fdf4' }}>
                                                    <Stack direction="row" spacing={0.6} flexWrap="wrap" useFlexGap alignItems="center">
                                                      <Typography sx={{ fontSize: '.7rem', fontWeight: 750, color: '#166534' }}>In MPR:</Typography>
                                                      {savedShipTos.length > 0 ? savedShipTos.map((shipTo) => {
                                                        const qty = savedState?.shipToQtyByColor?.[colorId]?.[shipTo.id];
                                                        return (
                                                          <Chip
                                                            key={shipTo.id}
                                                            size="small"
                                                            variant="outlined"
                                                            label={`${shipTo.shipToCode || shipTo.shipToName}${qty === '' || qty === undefined || qty === null ? '' : `: ${formatValue(qty)}`}`}
                                                            sx={{ height: 21, fontSize: '.66rem', fontWeight: 700, backgroundColor: '#fff', borderColor: '#86efac' }}
                                                          />
                                                        );
                                                      }) : (
                                                        <Typography sx={{ fontSize: '.68rem', color: '#166534' }}>Ship To saved in previous batch</Typography>
                                                      )}
                                                      <Chip size="small" label="Core" sx={{ height: 21, fontSize: '.64rem', fontWeight: 700, color: '#166534', backgroundColor: '#dcfce7' }} />
                                                      {savedPackingNames.map((name) => (
                                                        <Chip key={name} size="small" label={name} sx={{ height: 21, fontSize: '.64rem', color: '#166534', backgroundColor: '#dcfce7' }} />
                                                      ))}
                                                    </Stack>
                                                  </Box>
                                                )}

                                                {checked && (
                                                  <>
                                                    <Autocomplete
                                                      multiple
                                                      size="small"
                                                      disabled={!canMutateMpr}
                                                      options={shipTos}
                                                      value={selectedShipTos}
                                                      onChange={(_, selected) => changeShipTos(bom.id, colorId, selected)}
                                                      getOptionLabel={shipToDisplayLabel}
                                                      isOptionEqualToValue={(option, value) => option.id === value.id}
                                                      renderInput={(params) => <TextField {...params} required label="Ship To" placeholder="Select one or more" />}
                                                      sx={{ width: '100%' }}
                                                    />

                                                    {duplicateOnlyColor && (
                                                      <Alert severity="warning" sx={{ mt: 0.65, py: 0, '& .MuiAlert-message': { py: 0.45, width: '100%' } }}>
                                                        <Typography sx={{ fontSize: '.72rem', fontWeight: 700 }}>
                                                          Core and selected Packing sources already exist in MPR. Choose a new Packing or edit the existing batch.
                                                        </Typography>
                                                      </Alert>
                                                    )}

                                                    {colorIssues.length > 0 && (
                                                      <Stack spacing={0.5} sx={{ mt: 0.65 }}>
                                                        {colorIssues.map((issue) => {
                                                          const resolved = isValidationIssueResolved(issue, selectedShipToIds);
                                                          return (
                                                            <Alert
                                                              key={`${issue?.bomId}-${issue?.productColorId}-${issueAllowedShipToIds(issue).join('-')}`}
                                                              severity={resolved ? 'success' : 'error'}
                                                              sx={{ py: 0, '& .MuiAlert-message': { py: 0.45, width: '100%' } }}
                                                            >
                                                              <Typography sx={{ fontSize: '.72rem', fontWeight: 700 }}>
                                                                {resolved ? 'Resolved' : `Select at least one: ${issueShipToLabel(issue)}`}
                                                                {!resolved && Array.isArray(issue?.materials) && issue.materials.length > 0 ? ` · ${issue.materials.slice(0, 2).join(', ')}${issue.materials.length > 2 ? ` +${issue.materials.length - 2}` : ''}` : ''}
                                                              </Typography>
                                                            </Alert>
                                                          );
                                                        })}
                                                      </Stack>
                                                    )}
                                                    {selectedShipTos.length > 0 && (
                                                      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} flexWrap="wrap" useFlexGap sx={{ mt: 1 }}>
                                                        {selectedShipTos.map((shipTo) => (
                                                          <TextField
                                                            key={shipTo.id}
                                                            label={`PO Qty · ${shipTo.shipToCode || shipTo.shipToName || 'Ship To'}`}
                                                            type="number"
                                                            required
                                                            size="small"
                                                            value={state.shipToQtyByColor?.[colorId]?.[shipTo.id] ?? ''}
                                                            onChange={(event) => changeShipToQty(bom.id, colorId, shipTo.id, event.target.value)}
                                                            inputProps={{ min: 0, step: 'any' }}
                                                            disabled={!canMutateMpr}
                                                            helperText={shipTo.shipToCode && shipTo.shipToName ? shipTo.shipToName : ''}
                                                            sx={{ width: { xs: '100%', sm: 190 } }}
                                                          />
                                                        ))}
                                                        <Chip
                                                          variant="outlined"
                                                          label={`Total PO Qty: ${formatValue(sumShipToQty(state.shipToQtyByColor?.[colorId] || {}, selectedShipToIds))}`}
                                                          sx={{ alignSelf: { xs: 'flex-start', sm: 'center' }, fontWeight: 700 }}
                                                        />
                                                      </Stack>
                                                    )}
                                                  </>
                                                )}
                                              </Box>
                                            </Stack>
                                          </Box>
                                        );
                                      })}
                                    </Stack>

                                    <Typography sx={{ fontSize: '.78rem', fontWeight: 750, mt: 1.5, mb: 0.35 }}>
                                      2. Packing Sources (Optional)
                                    </Typography>
                                    {(bom.packings || []).length > 0 ? (
                                      <Stack direction="row" flexWrap="wrap" useFlexGap spacing={0.35}>
                                        {(bom.packings || []).map((packing) => {
                                          const selectedOptions = productColors.filter((option) => (
                                            (state.colors || []).some((colorId) => (
                                              normalizedColorKey(productColorKey(option)) === normalizedColorKey(colorId)
                                              || normalizedColorKey(option?.colorName) === normalizedColorKey(colorId)
                                            ))
                                          ));
                                          const usedBefore = generatedBatches.some((batch) => (batch?.packingIds || []).includes(packing.id));
                                          const usedForAllSelected = selectedOptions.length > 0 && selectedOptions.every((option) => (
                                            generatedSourceInfoForColor(mpr, bom.id, option).packingIds.has(packing.id)
                                          ));
                                          return (
                                            <Box key={packing.id} sx={{ display: 'flex', alignItems: 'center', gap: 0.35, mr: 1 }}>
                                              <FormControlLabel
                                                sx={{ mr: 0 }}
                                                control={<Checkbox size="small" checked={(state.packingIds || []).includes(packing.id)} disabled={!canMutateMpr} onChange={() => togglePacking(bom.id, packing.id)} />}
                                                label={<Typography sx={{ fontSize: '.78rem' }}>{packing.packingName} ({Number(packing.lineCount ?? (packing.lines || []).length) || 0})</Typography>}
                                              />
                                              {(usedForAllSelected || (!selectedOptions.length && usedBefore)) && (
                                                <Chip
                                                  size="small"
                                                  label={usedForAllSelected ? 'Already in MPR' : 'Used before'}
                                                  sx={{ height: 19, fontSize: '.62rem', fontWeight: 700, color: '#166534', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0' }}
                                                />
                                              )}
                                            </Box>
                                          );
                                        })}
                                      </Stack>
                                    ) : (
                                      <Typography sx={{ fontSize: '.76rem', color: 'text.secondary' }}>No packing source is available for this BOM.</Typography>
                                    )}

                                    <Alert severity="info" sx={{ mt: 1.25, py: 0.25 }}>
                                      <Typography sx={{ fontSize: '.76rem', fontWeight: 700 }}>
                                        Per color: {coreSourceRows} Core
                                        {selectedPackingDetails.map((item) => ` + ${item.count} ${item.name}`).join('')}
                                        {' = '}{sourceRowsPerColor} source row(s)
                                        {selectedColorCount > 0 ? ` · Estimated total: ${sourceRowsPerColor * selectedColorCount} row(s) before consolidation.` : ''}
                                      </Typography>
                                    </Alert>
                                  </Box>
                                </TableCell>
                              </TableRow>
                            )}
                          </Fragment>
                        );
                      })}
                      {pagedBoms.length === 0 && (
                        <EmptyTableState colSpan={8} title="No BOM matches the current filter" description="" />
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
                <TablePagination
                  component="div"
                  count={filteredBoms.length}
                  page={bomPage}
                  onPageChange={(_, nextPage) => setBomPage(nextPage)}
                  rowsPerPage={bomRowsPerPage}
                  onRowsPerPageChange={(event) => setBomRowsPerPage(Number(event.target.value))}
                  rowsPerPageOptions={[10, 20, 50, 100]}
                  labelRowsPerPage="BOMs per page"
                  sx={{ borderTop: '1px solid #e5e7eb' }}
                />
              </>
            )}
          </Box>
        )}

        {workspaceTab === 'batches' && (
          <Box>
            <Stack
              direction={{ xs: 'column', md: 'row' }}
              spacing={1}
              justifyContent="space-between"
              alignItems={{ md: 'center' }}
              sx={{ px: 1.25, py: 1, backgroundColor: '#fbfdff', borderBottom: '1px solid #e5e7eb' }}
            >
              <TextField
                size="small"
                value={batchSearch}
                onChange={(event) => setBatchSearch(event.target.value)}
                placeholder="Search batch by BOM, Product Color, Packing or user..."
                sx={{ width: { xs: '100%', md: 520 } }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon sx={{ fontSize: 18, color: '#64748b' }} />
                    </InputAdornment>
                  )
                }}
              />
              <Chip size="small" variant="outlined" label={`${filteredBatches.length} batch(es)`} sx={{ fontWeight: 700 }} />
            </Stack>

            {!mpr || batchSummaries.length === 0 ? (
              <Box sx={{ p: 4, textAlign: 'center' }}>
                <Typography sx={{ fontWeight: 700, color: '#334155' }}>No generation batch yet</Typography>
                <Typography sx={{ mt: 0.4, fontSize: '.8rem', color: 'text.secondary' }}>Select BOM Sources and add them to the MPR to create the first batch.</Typography>
                <Button size="small" onClick={() => setWorkspaceTab('sources')} sx={{ mt: 1, textTransform: 'none', fontWeight: 700 }}>
                  Go to BOM Sources
                </Button>
              </Box>
            ) : (
              <>
                <Box sx={{ p: 1.25 }}>
                  {pagedBatches.map((batch, index) => {
                    const batchNumber = (batchPage * batchRowsPerPage) + index + 1;
                    const totalPoQty = (batch.colors || []).reduce((total, color) => total + (Number(batch.poQtyByColor?.[color]) || 0), 0);
                    return (
                      <Accordion
                        key={batch.batchId}
                        disableGutters
                        expanded={expandedBatchId === batch.batchId}
                        onChange={(_, expanded) => setExpandedBatchId(expanded ? batch.batchId : null)}
                        elevation={0}
                        sx={{
                          mb: 1,
                          border: '1px solid #dbe3ef',
                          borderRadius: '10px !important',
                          overflow: 'hidden',
                          '&:before': { display: 'none' }
                        }}
                      >
                        <AccordionSummary
                          expandIcon={<ExpandMore />}
                          sx={{
                            minHeight: 58,
                            backgroundColor: expandedBatchId === batch.batchId ? '#f8fbff' : '#ffffff',
                            '& .MuiAccordionSummary-content': { my: 1 }
                          }}
                        >
                          <Stack direction={{ xs: 'column', md: 'row' }} spacing={{ xs: 0.5, md: 1.5 }} alignItems={{ md: 'center' }} sx={{ width: '100%', minWidth: 0, pr: 1 }}>
                            <Chip size="small" label={`Batch ${batchNumber}`} sx={{ fontWeight: 700, color: '#103B5C', backgroundColor: '#eef6ff' }} />
                            {batch.bomSourceChanged && (
                              <Chip
                                size="small"
                                color="warning"
                                label={mprCompleted ? 'BOM changed after completion' : 'BOM update required'}
                                sx={{ fontWeight: 800 }}
                              />
                            )}
                            <Box sx={{ flex: 1, minWidth: 0 }}>
                              <Typography noWrap sx={{ fontWeight: 750, color: '#0f172a', fontSize: '.83rem' }}>
                                {batch.bomNo || 'BOM'}{batch.bomName ? ` — ${batch.bomName}` : ''}
                              </Typography>
                              <Typography noWrap sx={{ mt: 0.1, fontSize: '.72rem', color: 'text.secondary' }}>
                                {(batch.colors || []).length} color(s) · {batch.sourceLineCount} source row(s) → {batch.lineCount} final line(s)
                                {batch.createdAt ? ` · ${formatDateTime(batch.createdAt)}` : ''}
                              </Typography>
                            </Box>
                            <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
                              <Chip size="small" variant="outlined" label={`${formatValue(totalPoQty)} PO Qty`} sx={{ fontWeight: 700 }} />
                              <Chip size="small" variant="outlined" label={`${(batch.packingNames || []).length} source group(s)`} sx={{ fontWeight: 700 }} />
                            </Stack>
                          </Stack>
                        </AccordionSummary>
                        <AccordionDetails sx={{ pt: 0, pb: 1.5, px: 1.5, backgroundColor: '#fbfdff', borderTop: '1px solid #e5e7eb' }}>
                          <Stack direction={{ xs: 'column', lg: 'row' }} justifyContent="space-between" spacing={1.5} sx={{ pt: 1.25 }}>
                            <Box sx={{ flex: 1, minWidth: 0 }}>
                              <Typography sx={{ fontSize: '.78rem' }}>
                                <strong>Product Color:</strong> {batch.colorLabels?.length ? batch.colorLabels.join(', ') : '-'}
                              </Typography>
                              <Typography sx={{ mt: 0.3, fontSize: '.78rem' }}>
                                <strong>Sources:</strong> {batch.packingNames.length ? batch.packingNames.join(', ') : '-'}
                              </Typography>
                              {(batch.colors || []).map((color, colorIndex) => {
                                const selectedIds = batch.shipToIdsByColor?.[color] || [];
                                const displayColor = batch.colorLabels?.[colorIndex] || color;
                                const qtyMap = batch.shipToQtyByColor?.[color] || {};
                                const details = selectedIds.map((shipToId) => {
                                  const shipTo = shipTos.find((item) => item.id === shipToId);
                                  const label = shipTo ? shipToDisplayLabel(shipTo) : shipToId;
                                  const qty = qtyMap?.[shipToId];
                                  return qty === undefined || qty === null || qty === '' ? label : `${label}: ${formatValue(qty)}`;
                                }).join(' | ');
                                return (
                                  <Box key={color} sx={{ mt: 0.65, p: 0.85, border: '1px solid #e2e8f0', borderRadius: 1, backgroundColor: '#ffffff' }}>
                                    <Typography sx={{ fontSize: '.75rem', fontWeight: 700, color: '#334155' }}>
                                      {displayColor} · Total PO Qty {formatValue(batch.poQtyByColor?.[color] ?? 0)}
                                    </Typography>
                                    <Typography sx={{ mt: 0.15, fontSize: '.73rem', color: 'text.secondary' }}>
                                      Ship To: {details || batch.shipToByColor?.[color] || '-'}
                                    </Typography>
                                  </Box>
                                );
                              })}
                              <Typography sx={{ mt: 0.75, fontSize: '.72rem', color: 'text.secondary' }}>
                                {batch.sourceLineCount} Source Row(s) represented by {batch.lineCount} final MPR Line(s)
                                {batch.createdBy ? ` · Created by ${batch.createdBy}` : ''}
                              </Typography>
                            </Box>

                            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ alignSelf: { xs: 'flex-start', lg: 'flex-start' } }}>
                              <Button
                                size="small"
                                variant="outlined"
                                startIcon={<Edit />}
                                disabled={!canManageBatches || batchSaving}
                                onClick={() => openBatchEdit(batch)}
                                sx={{ textTransform: 'none', fontWeight: 700 }}
                              >
                                Edit Color / Packing
                              </Button>
                              <Button
                                size="small"
                                color="error"
                                variant="outlined"
                                startIcon={<Delete />}
                                disabled={!canManageBatches || batchDeleting || batchSaving}
                                onClick={() => setBatchDeleteTarget(batch)}
                                sx={{ textTransform: 'none', fontWeight: 700 }}
                              >
                                Delete Batch
                              </Button>
                            </Stack>
                          </Stack>
                        </AccordionDetails>
                      </Accordion>
                    );
                  })}
                  {pagedBatches.length === 0 && (
                    <Box sx={{ p: 4, textAlign: 'center' }}>
                      <Typography sx={{ fontWeight: 700, color: '#64748b' }}>No batch matches the current search.</Typography>
                    </Box>
                  )}
                </Box>
                <TablePagination
                  component="div"
                  count={filteredBatches.length}
                  page={batchPage}
                  onPageChange={(_, nextPage) => setBatchPage(nextPage)}
                  rowsPerPage={batchRowsPerPage}
                  onRowsPerPageChange={(event) => setBatchRowsPerPage(Number(event.target.value))}
                  rowsPerPageOptions={[5, 10, 20, 50]}
                  labelRowsPerPage="Batches per page"
                  sx={{ borderTop: '1px solid #e5e7eb' }}
                />
              </>
            )}
          </Box>
        )}
      </Paper>

      {(preview || mpr) && (
        <Paper elevation={0} sx={{ mt: 0.8, border: '1px solid #e5e7eb', borderRadius: 1.7, overflow: 'hidden' }}>
          <Box sx={{ p: 1.25, borderBottom: '1px solid #e5e7eb', backgroundColor: '#fff' }}>
            <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" spacing={0.6} alignItems={{ sm: 'flex-start' }}>
              <Box>
                <Typography sx={{ fontWeight: 750, color: '#102a43', fontSize: '.98rem', letterSpacing: '-0.005em' }}>
                  MPR Planning
                </Typography>
                <Typography sx={{ mt: 0.2, fontSize: '.7rem', color: '#64748b' }}>
                  {visibleLines.length} of {unfilteredVisibleLines.length} final lines shown · {mprPhysicalSourceCount(unfilteredVisibleLines)} source rows · {mprRemovedDuplicateCount(unfilteredVisibleLines)} duplicates consolidated
                </Typography>
              </Box>
              {mpr && (
                <Stack direction="row" spacing={0.8} alignItems="center">
                  <StatusBadge status={mprStatus} />
                  <Typography sx={{ fontSize: '.7rem', color: '#94a3b8' }}>Updated {formatDateTime(mpr.updatedAt)}</Typography>
                </Stack>
              )}
            </Stack>

            <Box
              sx={{
                mt: 1,
                display: 'grid',
                gridTemplateColumns: { xs: 'repeat(2, minmax(0, 1fr))', md: 'repeat(5, minmax(0, 1fr))' },
                gap: 0.65,
                p: 0.8,
                border: '1px solid #e5eaf0',
                borderRadius: 1.4,
                bgcolor: '#f8fafc'
              }}
            >
              <MprSummaryMetric label="Final Lines" value={formatValue(visibleLines.length, 0)} helper="Shown by filters" />
              <MprSummaryMetric label="PO Qty" value={formatValue(mprColumnTotals.poQuantity)} />
              <MprSummaryMetric label="Mat Required" value={formatValue(mprColumnTotals.matRequiredQuantity)} />
              <MprSummaryMetric label="Purchase Qty" value={formatValue(mprColumnTotals.purchaseQuantity)} />
              <MprSummaryMetric label="Material Amount" value={`$${formatValue(subtotalMatAmountUsd, 2)}`} helper="Shown rows" />
            </Box>

            <Box sx={{ mt: 0.85, p: 0.9, border: '1px solid #e5eaf0', borderRadius: 1.4, backgroundColor: '#fbfdff' }}>
              <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" spacing={0.65} sx={{ mb: 0.75 }}>
<Box />
                <ColumnVisibilityMenu
                  columns={MPR_COLUMNS.map(([key, label]) => ({ key, label }))}
                  visibleKeys={mprVisibleFields}
                  lockedKeys={['styleDescription', 'matFullDescription', 'purchaseQuantity']}
                  onChange={setMprVisibleFields}
                  onCompact={() => setMprVisibleFields(MPR_COMPACT_FIELDS)}
                  presets={MPR_VIEW_PRESETS}
                />
              </Stack>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', gap: 0.8 }}>
                <TextField
                  size="small"
                  label="Keyword"
                  value={mprFilters.keyword}
                  onChange={(event) => setMprFilters((current) => ({ ...current, keyword: event.target.value }))}
                  placeholder="SAP Code, material, vendor, child color..."
                  sx={{ minWidth: { xs: '100%', md: 280 }, flex: 1 }}
                />
                <TextField size="small" select label="Style Color" value={mprFilters.productColor} onChange={(event) => setMprFilters((current) => ({ ...current, productColor: event.target.value }))} sx={{ minWidth: 165 }}>
                  <MenuItem value="">All Style Colors</MenuItem>
                  {mprFilterOptions.productColors.map((option) => <MenuItem key={option.key} value={option.label}>{option.label}</MenuItem>)}
                </TextField>
                <TextField size="small" select label="Source" value={mprFilters.source} onChange={(event) => setMprFilters((current) => ({ ...current, source: event.target.value }))} sx={{ minWidth: 175 }}>
                  <MenuItem value="">Core + All Packings</MenuItem>
                  {mprFilterOptions.sources.map((option) => <MenuItem key={option.key} value={option.key}>{option.label}</MenuItem>)}
                </TextField>
                <TextField size="small" select label="Ship To" value={mprFilters.shipTo} onChange={(event) => setMprFilters((current) => ({ ...current, shipTo: event.target.value }))} sx={{ minWidth: 165 }}>
                  <MenuItem value="">All Ship To</MenuItem>
                  {mprFilterOptions.shipTos.map((option) => <MenuItem key={option.key} value={option.label}>{option.label}</MenuItem>)}
                </TextField>
                <TextField size="small" select label="BOM Review" value={mprFilters.reviewStatus} onChange={(event) => setMprFilters((current) => ({ ...current, reviewStatus: event.target.value }))} sx={{ minWidth: 155 }}>
                  <MenuItem value="">All Review Status</MenuItem>
                  <MenuItem value="NO_REVIEW">No Review</MenuItem>
                  <MenuItem value="PENDING_BOM_REVIEW">Pending BOM Review</MenuItem>
                  <MenuItem value="RECHECK_SALES">Recheck Sales</MenuItem>
                  <MenuItem value="APPLIED_TO_BOM">Applied To BOM</MenuItem>
                </TextField>
                <Button variant="outlined" startIcon={<RestartAlt />} onClick={() => setMprFilters(emptyMprFilters)} sx={{ color: '#475569', borderColor: '#cbd5e1' }}>Reset</Button>
              </Box>
            </Box>
          </Box>

          <Box sx={{ px: 1.5, py: 0.9, borderBottom: '1px solid #e5e7eb', backgroundColor: '#fff' }}>
            <Stack
              direction={{ xs: 'column', lg: 'row' }}
              spacing={0.9}
              alignItems={{ lg: 'center' }}
              justifyContent="space-between"
            >
              <Stack direction="row" spacing={1.4} useFlexGap flexWrap="wrap" alignItems="center">
                <Typography sx={{ fontWeight: 700, color: '#334155', fontSize: '.78rem' }}>Table guide</Typography>
                {MPR_LEGEND_ITEMS.map((item) => (
                  <Stack key={item.label} direction="row" spacing={0.55} alignItems="center">
                    <Box sx={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: item.color, flex: '0 0 auto' }} />
                    <Typography sx={{ fontSize: '.75rem', color: '#475569' }}>{item.label}</Typography>
                  </Stack>
                ))}
              </Stack>
              <Typography sx={{ fontSize: '.72rem', color: '#94a3b8' }}>
                Duplicate key: MTR + POSITION + CONS. + NET/MK + UNIT · Hover “Removed” to view details.
              </Typography>
            </Stack>
          </Box>


          <TableContainer sx={{ maxHeight: 540 }}>
            <Table stickyHeader size="small" sx={{ minWidth: mprTableMinWidth }}>
              <TableHead>
                <TableRow>
                  <SortableTableCell label="No." sortable={false} sx={{ minWidth: 64, width: 64, fontWeight: 750, backgroundColor: '#f8fafc', whiteSpace: 'nowrap', position: 'sticky', left: 0, zIndex: 5, boxShadow: '1px 0 0 #e5e7eb' }} />
                  {visibleMprColumns.map(([field, header, minWidth]) => (
                    <SortableTableCell
                      key={header}
                      label={header}
                      columnKey={field}
                      sortKey={mprSortKey}
                      sortDirection={mprSortDirection}
                      onSort={requestMprSort}
                      sx={{
                        minWidth,
                        fontWeight: 750,
                        backgroundColor: '#f8fafc',
                        whiteSpace: 'nowrap',
                        ...(field === 'styleDescription' ? { position: 'sticky', left: 64, zIndex: 5, boxShadow: '1px 0 0 #e5e7eb' } : {})
                      }}
                    />
                  ))}
                  <TableCell sx={{ minWidth: 110, fontWeight: 750, backgroundColor: '#f8fafc', whiteSpace: 'nowrap', position: 'sticky', right: 0, zIndex: 5, boxShadow: '-1px 0 0 #e5e7eb' }}>
                    Actions
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {(() => {
                  const selectionByBom = new Map(
                    (displayedMpr?.selections || []).filter(Boolean).map((item) => [String(item.bomId || ''), item])
                  );
                  const bomGroups = [];
                  const bomByKey = new Map();

                  sortedVisibleLines.forEach((line) => {
                    const fallbackSelection = selectionByBom.get(String(line?.bomId || '')) || {};
                    const bomKey = String(line?.bomId || line?.bomNo || line?.bomName || 'UNKNOWN_BOM');
                    if (!bomByKey.has(bomKey)) {
                      const group = {
                        key: bomKey,
                        bomNo: line?.bomNo || fallbackSelection.bomNo || '',
                        bomName: line?.bomName || fallbackSelection.bomName || '',
                        colorGroups: [],
                        colorByKey: new Map(),
                        lines: [],
                        lineCount: 0
                      };
                      bomByKey.set(bomKey, group);
                      bomGroups.push(group);
                    }

                    const bomGroup = bomByKey.get(bomKey);
                    const color = line?.styleColor || 'No Product Color';
                    const colorKey = normalizeText(color) || 'NO_COLOR';
                    if (!bomGroup.colorByKey.has(colorKey)) {
                      const colorGroup = { key: colorKey, color, packingGroups: [], packingByKey: new Map(), lines: [] };
                      bomGroup.colorByKey.set(colorKey, colorGroup);
                      bomGroup.colorGroups.push(colorGroup);
                    }

                    const colorGroup = bomGroup.colorByKey.get(colorKey);
                    const lineWithRowNo = { ...line, __displayNo: bomGroup.lineCount + 1 };
                    const packingKey = mprLineSourceKey(lineWithRowNo);
                    if (!colorGroup.packingByKey.has(packingKey)) {
                      const packingGroup = {
                        key: packingKey,
                        name: mprLineSourceLabel(lineWithRowNo),
                        lines: []
                      };
                      colorGroup.packingByKey.set(packingKey, packingGroup);
                      colorGroup.packingGroups.push(packingGroup);
                    }

                    colorGroup.packingByKey.get(packingKey).lines.push(lineWithRowNo);
                    colorGroup.lines.push(lineWithRowNo);
                    bomGroup.lines.push(lineWithRowNo);
                    bomGroup.lineCount += 1;
                  });

                  return bomGroups.flatMap((bomGroup, bomIndex) => {
                    const bomStyle = MPR_BOM_GROUP_STYLES[bomIndex % MPR_BOM_GROUP_STYLES.length];
                    const bomSourceRows = mprPhysicalSourceCount(bomGroup.lines);
                    const bomDuplicates = mprRemovedDuplicateCount(bomGroup.lines);
                    return [
                      <TableRow key={`bom-group-${bomGroup.key}`}>
                        <TableCell
                          colSpan={visibleMprColumns.length + 2}
                          sx={{
                            py: 1.05,
                            fontWeight: 750,
                            color: bomStyle.color,
                            backgroundColor: bomStyle.backgroundColor,
                            borderTop: `3px solid ${bomStyle.borderColor}`,
                            borderBottom: `1px solid ${bomStyle.borderColor}`
                          }}
                        >
                          BOM {bomIndex + 1}: {bomGroup.bomNo || 'BOM'}{bomGroup.bomName ? ` — ${bomGroup.bomName}` : ''}
                          {' · '}{bomSourceRows} Source Row(s) → {bomGroup.lineCount} Final MPR Row(s)
                          {bomDuplicates > 0 ? ` · ${bomDuplicates} Duplicate Row(s) Removed` : ' · No Duplicate'}
                        </TableCell>
                      </TableRow>,
                      ...bomGroup.colorGroups.flatMap((colorGroup) => {
                        const colorSourceRows = mprPhysicalSourceCount(colorGroup.lines);
                        const colorDuplicates = mprRemovedDuplicateCount(colorGroup.lines);
                        return [
                          <TableRow key={`color-group-${bomGroup.key}-${colorGroup.key}`}>
                            <TableCell
                              colSpan={visibleMprColumns.length + 2}
                              sx={{
                                py: 0.85,
                                pl: 2.25,
                                fontWeight: 750,
                                color: '#334155',
                                backgroundColor: '#f8fafc',
                                borderTop: '1px solid #cbd5e1'
                              }}
                            >
                              Product Color: {colorGroup.color} · {colorSourceRows} Source Row(s) → {colorGroup.lines.length} Final Row(s)
                              {colorDuplicates > 0 ? ` · ${colorDuplicates} Duplicate Removed` : ''}
                            </TableCell>
                          </TableRow>,
                          ...colorGroup.packingGroups.flatMap((packingGroup) => ([
                            <TableRow key={`packing-group-${bomGroup.key}-${colorGroup.key}-${packingGroup.key}`}>
                              <TableCell
                                colSpan={visibleMprColumns.length + 2}
                                sx={{
                                  py: 0.65,
                                  pl: 4,
                                  fontWeight: 700,
                                  color: '#64748b',
                                  backgroundColor: '#ffffff',
                                  borderTop: '1px solid #e2e8f0'
                                }}
                              >
                                Source: {packingGroup.name} — {mprPhysicalSourceCount(packingGroup.lines)} Source Row(s) represented by {packingGroup.lines.length} Final Row(s)
                              </TableCell>
                            </TableRow>,
                            ...packingGroup.lines.map((line) => {
                              const duplicateCount = Number(line?.removedDuplicateCount || 0);
                              const duplicate = Boolean(line?.duplicateHighlighted || duplicateCount > 0);
                              const duplicateNote = line?.duplicateNote || `Removed ${duplicateCount} duplicate row(s).`;
                              return (
                                <TableRow
                                  key={line.id}
                                  hover
                                  sx={{
                                    backgroundColor: duplicate ? '#fffbeb' : 'inherit',
                                    '&:hover': { backgroundColor: duplicate ? '#fef3c7 !important' : undefined }
                                  }}
                                >
                                  <TableCell sx={{ whiteSpace: 'nowrap', verticalAlign: 'top', fontWeight: 700, position: 'sticky', left: 0, zIndex: 2, backgroundColor: '#fff', boxShadow: '1px 0 0 #e5e7eb' }}>
                                    <Stack spacing={0.45} alignItems="flex-start">
                                      <span>{line.__displayNo}</span>
                                      {duplicate && (
                                        <Tooltip title={duplicateNote} arrow>
                                          <Chip
                                            size="small"
                                            variant="outlined"
                                            label={`Removed ${duplicateCount}`}
                                            sx={{
                                              height: 20,
                                              color: '#854d0e',
                                              backgroundColor: '#fffdf7',
                                              borderColor: '#d4a72c',
                                              fontWeight: 700,
                                              '& .MuiChip-label': { px: 0.7, fontSize: '.68rem' }
                                            }}
                                          />
                                        </Tooltip>
                                      )}
                                    </Stack>
                                  </TableCell>
                                  {visibleMprColumns.map(([field, header]) => (
                                    <TableCell
                                      key={header}
                                      sx={{
                                        whiteSpace: 'nowrap',
                                        verticalAlign: 'top',
                                        ...(field === 'styleDescription' ? { position: 'sticky', left: 64, zIndex: 2, backgroundColor: '#fff', boxShadow: '1px 0 0 #e5e7eb' } : {})
                                      }}
                                    >
                                      {renderMprCellValue(field, line[field], line)}
                                    </TableCell>
                                  ))}
                                  <TableCell sx={{ whiteSpace: 'nowrap', verticalAlign: 'top', position: 'sticky', right: 0, zIndex: 2, backgroundColor: '#fff', boxShadow: '-1px 0 0 #e5e7eb' }}>
                                    {(() => {
                                      const review = latestBomReview(line);
                                      const chip = reviewChip(review);
                                      return chip ? (
                                        <Tooltip title={review.reviewComment || 'Sales correction is tracked in BOM review.'}>
                                          <Chip size="small" color={chip.color} label={chip.label} sx={{ mr: 0.5, mb: 0.35 }} />
                                        </Tooltip>
                                      ) : null;
                                    })()}
                                    <Tooltip title={canEditLines ? 'Edit MPR Item' : (!canMutateMpr ? mutationBlockedMessage : 'Create MPR First')}>
                                      <span>
                                        <IconButton size="small" disabled={!canEditLines} onClick={() => setEditingLine(line)}>
                                          <Edit fontSize="small" />
                                        </IconButton>
                                      </span>
                                    </Tooltip>
                                    <Tooltip title={canEditLines ? 'Delete MPR Item' : (!canMutateMpr ? mutationBlockedMessage : 'Create MPR First')}>
                                      <span>
                                        <IconButton size="small" color="error" disabled={!canEditLines} onClick={() => setLineDeleteTarget(line)}>
                                          <Delete fontSize="small" />
                                        </IconButton>
                                      </span>
                                    </Tooltip>
                                  </TableCell>
                                </TableRow>
                              );
                            })
                          ]))
                        ];
                      })
                    ];
                  });
                })()}
                {!visibleLines.length && (
                  <EmptyTableState
                    colSpan={visibleMprColumns.length + 2}
                    title="No MPR lines to show"
                    description=""
                  />
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}

      <Dialog
        open={validationReview.open}
        onClose={() => setValidationReview((current) => ({ ...current, open: false }))}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle sx={{ fontWeight: 750, color: '#103B5C' }}>MPR Setup Needs Attention</DialogTitle>
        <DialogContent dividers sx={{ p: 0 }}>
          <Box sx={{ p: 1.5, borderBottom: '1px solid #e5e7eb', bgcolor: '#fff' }}>
            <Stack direction="row" spacing={1} alignItems="center">
              <ErrorOutline color="error" sx={{ fontSize: 26 }} />
              <Box>
                <Typography sx={{ fontWeight: 750 }}>{unresolvedValidationIssues.length} Ship To issue(s) found</Typography>
                <Typography sx={{ fontSize: '.76rem', color: 'text.secondary' }}>Fix the highlighted Product Colors before creating MPR.</Typography>
              </Box>
            </Stack>
          </Box>
          <Stack spacing={0}>
            {(validationReview.issues || []).map((issue, index) => {
              const state = selection[issue?.bomId] || emptyBomSelection();
              const selectedIds = state.shipToIdsByColor?.[issue?.productColorId] || [];
              const resolved = isValidationIssueResolved(issue, selectedIds);
              return (
                <Box key={`${issue?.bomId}-${issue?.productColorId}-${issueAllowedShipToIds(issue).join('-')}-${index}`} sx={{ px: 1.5, py: 1.1, borderBottom: index < validationReview.issues.length - 1 ? '1px solid #eef2f7' : 0, bgcolor: resolved ? '#f8fff9' : '#fff' }}>
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} justifyContent="space-between" alignItems={{ sm: 'center' }}>
                    <Box sx={{ minWidth: 0 }}>
                      <Stack direction="row" spacing={0.75} alignItems="center" flexWrap="wrap" useFlexGap>
                        <Typography sx={{ fontSize: '.82rem', fontWeight: 800, color: '#102a43' }}>BOM {issue?.bomNo || '-'}</Typography>
                        <Typography sx={{ fontSize: '.82rem', color: '#64748b' }}>·</Typography>
                        <Typography sx={{ fontSize: '.82rem', fontWeight: 700 }}>{issue?.productColor || '-'}</Typography>
                        <Chip
                          size="small"
                          label={resolved ? 'Resolved' : `Select one: ${issueShipToLabel(issue)}`}
                          color={resolved ? 'success' : 'error'}
                          variant="outlined"
                          sx={{ height: 22, fontSize: '.68rem', fontWeight: 700 }}
                        />
                      </Stack>
                      {!resolved && Array.isArray(issue?.materials) && issue.materials.length > 0 && (
                        <Typography sx={{ mt: 0.35, fontSize: '.72rem', color: '#7f1d1d' }}>
                          Material: {issue.materials.slice(0, 3).join(', ')}{issue.materials.length > 3 ? ` +${issue.materials.length - 3} more` : ''}
                        </Typography>
                      )}
                    </Box>
                    {!resolved && (
                      <Button size="small" variant="outlined" color="error" onClick={() => reviewValidationIssue(issue)} sx={{ textTransform: 'none', fontWeight: 700, flexShrink: 0 }}>
                        Fix
                      </Button>
                    )}
                  </Stack>
                </Box>
              );
            })}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 1.5 }}>
          <Button onClick={() => setValidationReview((current) => ({ ...current, open: false }))} sx={{ textTransform: 'none' }}>Close</Button>
          <Button
            variant="contained"
            color="error"
            disabled={!unresolvedValidationIssues.length}
            onClick={() => reviewValidationIssue(unresolvedValidationIssues[0])}
            sx={{ textTransform: 'none', fontWeight: 700 }}
          >
            Review Issues
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={masterDataWarning.open}
        onClose={() => resolveMasterDataWarning(false)}
        fullWidth
        maxWidth="md"
      >
        <DialogTitle sx={{ fontWeight: 750, color: '#9a6700' }}>Master Data Warning</DialogTitle>
        <DialogContent dividers sx={{ p: 0 }}>
          <Box sx={{ p: 1.5, borderBottom: '1px solid #e5e7eb', bgcolor: '#fffbeb' }}>
            <Stack direction="row" spacing={1} alignItems="flex-start">
              <ErrorOutline sx={{ fontSize: 26, color: '#d97706', mt: 0.15 }} />
              <Box>
                <Typography sx={{ fontWeight: 800 }}>
                  {(masterDataWarning.issues || []).length} material line(s) do not exactly match MAT Info
                </Typography>
                <Typography sx={{ mt: 0.25, fontSize: '.78rem', color: '#6b7280' }}>
                  You can continue, but Currency, MAT Price or Supplier may be blank. Review the 4-key Master Data: Material Type + MAT Full Description + MAT Color + MAT Unit.
                </Typography>
              </Box>
            </Stack>
          </Box>

          <Stack spacing={0}>
            {(masterDataWarning.issues || []).map((issue, index) => {
              const mismatchSet = new Set(Array.isArray(issue?.mismatchFields) ? issue.mismatchFields : []);
              const pairs = [
                ['Material Type', issue?.materialType, issue?.masterMaterialType],
                ['MAT Full Description', issue?.matFullDescription, issue?.masterMatFullDescription],
                ['MAT Color', issue?.matColor, issue?.masterMatColor],
                ['MAT Unit', issue?.matUnit, issue?.masterMatUnit]
              ];
              const hasPossibleMatch = String(issue?.code || '').toUpperCase() === 'MAT_INFO_MISMATCH';
              return (
                <Box
                  key={`${issue?.bomId || ''}-${issue?.productColorId || ''}-${issue?.sourceRowNumber || index}-${issue?.matFullDescription || ''}`}
                  sx={{ px: 1.5, py: 1.25, borderBottom: index < masterDataWarning.issues.length - 1 ? '1px solid #eef2f7' : 0 }}
                >
                  <Stack direction="row" spacing={0.75} alignItems="center" flexWrap="wrap" useFlexGap>
                    <Typography sx={{ fontSize: '.8rem', fontWeight: 800, color: '#102a43' }}>BOM {issue?.bomNo || '-'}</Typography>
                    {issue?.productColor && <Typography sx={{ fontSize: '.76rem', color: '#64748b' }}>· {issue.productColor}</Typography>}
                    {issue?.sourceRowNumber && <Chip size="small" label={`Source row ${issue.sourceRowNumber}`} variant="outlined" sx={{ height: 21, fontSize: '.66rem' }} />}
                    <Chip
                      size="small"
                      label={hasPossibleMatch ? 'Possible mismatch' : 'MAT Info not found'}
                      sx={{ height: 21, fontSize: '.66rem', fontWeight: 700, bgcolor: '#fff7ed', color: '#9a3412' }}
                    />
                  </Stack>

                  <Typography sx={{ mt: 0.55, fontSize: '.79rem', fontWeight: 700, color: '#334155' }}>
                    {issue?.matFullDescription || issue?.materials?.[0] || '-'}
                  </Typography>

                  <Box sx={{ mt: 0.8, border: '1px solid #e5e7eb', borderRadius: 1, overflow: 'hidden' }}>
                    <Box sx={{ display: 'grid', gridTemplateColumns: '145px minmax(0,1fr) minmax(0,1fr)', bgcolor: '#f8fafc', borderBottom: '1px solid #e5e7eb' }}>
                      <Typography sx={{ px: 1, py: 0.6, fontSize: '.69rem', fontWeight: 800 }}>4-key field</Typography>
                      <Typography sx={{ px: 1, py: 0.6, fontSize: '.69rem', fontWeight: 800 }}>BOM / MPR value</Typography>
                      <Typography sx={{ px: 1, py: 0.6, fontSize: '.69rem', fontWeight: 800 }}>Possible MAT Info value</Typography>
                    </Box>
                    {pairs.map(([label, sourceValue, masterValue]) => {
                      const mismatch = mismatchSet.has(label);
                      return (
                        <Box key={label} sx={{ display: 'grid', gridTemplateColumns: '145px minmax(0,1fr) minmax(0,1fr)', borderBottom: label !== 'MAT Unit' ? '1px solid #f1f5f9' : 0, bgcolor: mismatch ? '#fff7ed' : '#fff' }}>
                          <Typography sx={{ px: 1, py: 0.55, fontSize: '.69rem', fontWeight: mismatch ? 800 : 600, color: mismatch ? '#9a3412' : '#475569' }}>{label}</Typography>
                          <Typography sx={{ px: 1, py: 0.55, fontSize: '.69rem', wordBreak: 'break-word' }}>{sourceValue || '-'}</Typography>
                          <Typography sx={{ px: 1, py: 0.55, fontSize: '.69rem', wordBreak: 'break-word', color: mismatch ? '#9a3412' : '#475569' }}>{hasPossibleMatch ? (masterValue || '-') : 'No close 3/4-key match'}</Typography>
                        </Box>
                      );
                    })}
                  </Box>
                </Box>
              );
            })}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 1.5, justifyContent: 'space-between' }}>
          <Button
            onClick={() => resolveMasterDataWarning(false)}
            sx={{ textTransform: 'none', fontWeight: 700 }}
          >
            Review Master Data
          </Button>
          <Button
            variant="contained"
            color="warning"
            onClick={() => resolveMasterDataWarning(true)}
            sx={{ textTransform: 'none', fontWeight: 800 }}
          >
            Continue & {masterDataWarning.actionLabel || 'Proceed'}
          </Button>
        </DialogActions>
      </Dialog>

      <ExcelUploadProgressDialog
        open={mprUploadProgress.open}
        title="Upload MPR Excel"
        file={mprUploadProgress.file}
        progress={mprUploadProgress.progress}
        status={mprUploadProgress.status}
        detail={mprUploadProgress.detail}
        state={mprUploadProgress.state}
        onClose={() => { if (!mprUploading) setMprUploadProgress(initialUploadProgress()); }}
      />

      <Dialog
        open={generateProgress.open}
        onClose={closeGenerateProgress}
        disableEscapeKeyDown={generationBusy}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle sx={{ fontWeight: 750, color: '#103B5C' }}>
          {generateProgress.status === 'processing' && 'Creating MPR'}
          {generateProgress.status === 'success' && 'MPR Created Successfully'}
          {generateProgress.status === 'error' && 'MPR Creation Failed'}
        </DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2}>
            <Stack direction="row" spacing={1.25} alignItems="center">
              {generateProgress.status === 'success' && <CheckCircle color="success" sx={{ fontSize: 34 }} />}
              {generateProgress.status === 'error' && <ErrorOutline color="error" sx={{ fontSize: 34 }} />}
              <Box sx={{ flex: 1 }}>
                <Typography sx={{ fontWeight: 700 }}>{generateProgress.message}</Typography>
                {generateProgress.status === 'processing' && generateProgress.currentColor && (
                  <Typography sx={{ mt: 0.35, fontSize: '.85rem', color: 'text.secondary' }}>
                    Current Product Color: {generateProgress.currentColor}
                  </Typography>
                )}
              </Box>
              <Typography sx={{ minWidth: 54, textAlign: 'right', fontSize: '1.05rem', fontWeight: 750, color: '#103B5C' }}>
                {Math.round(generateProgress.percent)}%
              </Typography>
            </Stack>

            <LinearProgress
              variant="determinate"
              value={generateProgress.percent}
              color={generateProgress.status === 'error' ? 'error' : generateProgress.status === 'success' ? 'success' : 'primary'}
              sx={{ height: 10, borderRadius: 999 }}
            />

            <Paper elevation={0} sx={{ p: 1.5, border: '1px solid #e5e7eb', borderRadius: 1.5, backgroundColor: '#f8fafc' }}>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} justifyContent="space-between">
                <Box>
                  <Typography sx={{ fontSize: '.74rem', color: 'text.secondary' }}>PRODUCT COLORS</Typography>
                  <Typography sx={{ fontWeight: 750 }}>
                    {generateProgress.status === 'processing'
                      ? `${Math.min(generateProgress.completedColors, generateProgress.totalColors)} / ${generateProgress.totalColors}`
                      : generateProgress.totalColors}
                  </Typography>
                </Box>
                <Box>
                  <Typography sx={{ fontSize: '.74rem', color: 'text.secondary' }}>ESTIMATED SOURCE ROWS</Typography>
                  <Typography sx={{ fontWeight: 750 }}>
                    {generateProgress.estimatedRows > 0
                      ? `${Math.min(generateProgress.processedRows, generateProgress.estimatedRows)} / ${generateProgress.estimatedRows}`
                      : '-'}
                  </Typography>
                </Box>
                {generateProgress.status === 'success' && (
                  <>
                    <Box>
                      <Typography sx={{ fontSize: '.74rem', color: 'text.secondary' }}>SOURCE ROWS ACCEPTED</Typography>
                      <Typography sx={{ fontWeight: 750 }}>{generateProgress.addedRows}</Typography>
                    </Box>
                    <Box>
                      <Typography sx={{ fontSize: '.74rem', color: 'text.secondary' }}>DUPLICATES CONSOLIDATED</Typography>
                      <Typography sx={{ fontWeight: 750 }}>{generateProgress.duplicateRows}</Typography>
                    </Box>
                    <Box>
                      <Typography sx={{ fontSize: '.74rem', color: 'text.secondary' }}>FINAL MPR ROWS</Typography>
                      <Typography sx={{ fontWeight: 750 }}>{generateProgress.finalRows}</Typography>
                    </Box>
                  </>
                )}
              </Stack>
            </Paper>

            {generateProgress.status === 'processing' && (
              <Alert severity="info">
                Progress is estimated while the server is processing. Please do not close this window or click Create MPR again.
              </Alert>
            )}

            {generateProgress.status === 'error' && (
              <Alert severity="error">{generateProgress.errorMessage}</Alert>
            )}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          {generateProgress.status === 'error' && (
            <Button
              variant="outlined"
              onClick={() => {
                setGenerateProgress((current) => ({ ...current, open: false, status: 'idle' }));
                window.setTimeout(generate, 0);
              }}
              sx={{ textTransform: 'none' }}
            >
              Retry
            </Button>
          )}
          <Button
            variant={generateProgress.status === 'success' ? 'contained' : 'text'}
            disabled={generationBusy}
            onClick={closeGenerateProgress}
            sx={{ textTransform: 'none', ...(generateProgress.status === 'success' ? { backgroundColor: '#103B5C' } : {}) }}
          >
            {generateProgress.status === 'success' ? 'View MPR' : 'Close'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={exportProgress.open}
        onClose={closeExportProgress}
        disableEscapeKeyDown={exportBusy}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle sx={{ fontWeight: 750, color: '#103B5C' }}>
          {exportProgress.status === 'processing' && 'Exporting MPR Excel'}
          {exportProgress.status === 'success' && 'Excel Export Completed'}
          {exportProgress.status === 'error' && 'Excel Export Failed'}
        </DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2}>
            <Stack direction="row" spacing={1.25} alignItems="center">
              {exportProgress.status === 'processing' && <Download color="primary" sx={{ fontSize: 34 }} />}
              {exportProgress.status === 'success' && <CheckCircle color="success" sx={{ fontSize: 34 }} />}
              {exportProgress.status === 'error' && <ErrorOutline color="error" sx={{ fontSize: 34 }} />}
              <Box sx={{ flex: 1 }}>
                <Typography sx={{ fontWeight: 700 }}>{exportProgress.message}</Typography>
                <Typography sx={{ mt: 0.35, fontSize: '.85rem', color: 'text.secondary' }}>
                  {exportProgress.fileName || 'MPR.xlsx'}
                </Typography>
              </Box>
              <Typography sx={{ minWidth: 54, textAlign: 'right', fontSize: '1.05rem', fontWeight: 750, color: '#103B5C' }}>
                {Math.round(exportProgress.percent)}%
              </Typography>
            </Stack>

            <LinearProgress
              variant="determinate"
              value={exportProgress.percent}
              color={exportProgress.status === 'error' ? 'error' : exportProgress.status === 'success' ? 'success' : 'primary'}
              sx={{ height: 10, borderRadius: 999 }}
            />

            <Paper elevation={0} sx={{ p: 1.5, border: '1px solid #e5e7eb', borderRadius: 1.5, backgroundColor: '#f8fafc' }}>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} justifyContent="space-between">
                <Box>
                  <Typography sx={{ fontSize: '.74rem', color: 'text.secondary' }}>MPR LINES</Typography>
                  <Typography sx={{ fontWeight: 750 }}>{exportProgress.lineCount}</Typography>
                </Box>
                <Box>
                  <Typography sx={{ fontSize: '.74rem', color: 'text.secondary' }}>DOWNLOAD</Typography>
                  <Typography sx={{ fontWeight: 750 }}>
                    {exportProgress.totalBytes > 0
                      ? `${formatFileSize(exportProgress.downloadedBytes)} / ${formatFileSize(exportProgress.totalBytes)}`
                      : exportProgress.downloadedBytes > 0
                        ? formatFileSize(exportProgress.downloadedBytes)
                        : 'Waiting for file...'}
                  </Typography>
                </Box>
                {exportProgress.status === 'success' && (
                  <Box>
                    <Typography sx={{ fontSize: '.74rem', color: 'text.secondary' }}>FILE SIZE</Typography>
                    <Typography sx={{ fontWeight: 750 }}>{formatFileSize(exportProgress.fileSizeBytes)}</Typography>
                  </Box>
                )}
              </Stack>
            </Paper>

            {exportProgress.status === 'processing' && (
              <Alert severity="info">
                The server is generating the Excel workbook. Progress is estimated until the file starts downloading. Please do not export again or close this window.
              </Alert>
            )}

            {exportProgress.status === 'error' && (
              <Alert severity="error">{exportProgress.errorMessage}</Alert>
            )}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          {exportProgress.status === 'error' && (
            <Button
              variant="outlined"
              onClick={() => {
                setExportProgress((current) => ({ ...current, open: false, status: 'idle' }));
                window.setTimeout(exportMprExcel, 0);
              }}
              sx={{ textTransform: 'none' }}
            >
              Retry Export
            </Button>
          )}
          <Button
            variant={exportProgress.status === 'success' ? 'contained' : 'text'}
            disabled={exportBusy}
            onClick={closeExportProgress}
            sx={{ textTransform: 'none', ...(exportProgress.status === 'success' ? { backgroundColor: '#103B5C' } : {}) }}
          >
            {exportProgress.status === 'success' ? 'Done' : 'Close'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={canMutateMpr && confirmOpen} onClose={confirming ? undefined : () => setConfirmOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Confirm MPR?</DialogTitle>
        <DialogContent>
          <Typography>
            Confirm the current MPR as completed? This will change the Order status to <strong>MPR COMPLETED</strong>.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button disabled={confirming} onClick={() => setConfirmOpen(false)}>Cancel</Button>
          <Button color="success" variant="contained" disabled={confirming} onClick={confirmCurrentMpr}>
            {confirming ? 'Confirming...' : 'Confirm'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={canReopenMpr && reopenOpen} onClose={reopening ? undefined : () => setReopenOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Reopen completed MPR?</DialogTitle>
        <DialogContent>
          <Stack spacing={1.5} sx={{ pt: 0.5 }}>
            <Alert severity="warning">
              Reopening changes the status from COMPLETED to IN PROGRESS and enables MPR data changes again. If a source BOM changed while this MPR was completed, update it from BOM after reopening.
            </Alert>
            <TextField
              autoFocus
              required
              multiline
              minRows={3}
              label="Reason for reopening"
              value={reopenReason}
              onChange={(event) => setReopenReason(event.target.value)}
              inputProps={{ maxLength: 1000 }}
              helperText={`${reopenReason.length}/1000 · This reason is saved in MPR history.`}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button disabled={reopening} onClick={() => setReopenOpen(false)}>Cancel</Button>
          <Button color="warning" variant="contained" disabled={reopening || !reopenReason.trim()} onClick={reopenCurrentMpr}>
            {reopening ? 'Reopening...' : 'Reopen MPR'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={canMutateMpr && deleteOpen} onClose={() => setDeleteOpen(false)}>
        <DialogTitle>Delete MPR?</DialogTitle>
        <DialogContent>Each order has one current MPR. Delete it and return the order to BOM status?</DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteOpen(false)}>Cancel</Button>
          <Button color="error" variant="contained" onClick={remove}>Delete</Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={canMutateMpr && Boolean(batchEditTarget)}
        onClose={batchSaving ? undefined : () => setBatchEditTarget(null)}
        fullWidth
        maxWidth="md"
      >
        <DialogTitle sx={{ pr: 6, fontWeight: 750, color: '#103B5C' }}>
          Edit MPR Selection
          <Typography sx={{ mt: 0.25, fontSize: '.8rem', color: 'text.secondary', fontWeight: 400 }}>
            Change Product Color, Packing, Ship To and PO Qty for each Ship To. Unchanged material lines keep their saved MPR values.
          </Typography>
          <IconButton onClick={() => setBatchEditTarget(null)} disabled={batchSaving} sx={{ position: 'absolute', right: 14, top: 14 }}>×</IconButton>
        </DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2}>
            <Box>
              <Typography sx={{ mb: 0.75, fontWeight: 750, color: '#103B5C' }}>Product Color</Typography>
              <Stack spacing={0.75}>
                {batchEditProductColors.map((productColor) => {
                  const colorId = productColorKey(productColor);
                  const checked = (batchEditForm.colors || []).includes(colorId);
                  const selectedShipToIds = batchEditForm.shipToIdsByColor?.[colorId] || [];
                  const selectedShipTos = shipTos.filter((item) => selectedShipToIds.includes(item.id));
                  return (
                    <Paper key={colorId} elevation={0} sx={{ p: 1.15, border: '1px solid #e5e7eb', borderRadius: 1.5 }}>
                      <FormControlLabel
                        sx={{ m: 0 }}
                        control={<Checkbox size="small" checked={checked} disabled={batchSaving} onChange={() => toggleBatchColor(colorId)} />}
                        label={<Typography sx={{ fontSize: '.84rem', fontWeight: 700 }}>{productColorLabel(productColor)}</Typography>}
                      />
                      {checked && (
                        <Box sx={{ mt: 1, ml: { sm: 4 } }}>
                          <Autocomplete
                            multiple
                            size="small"
                            disabled={batchSaving}
                            options={shipTos}
                            value={selectedShipTos}
                            onChange={(_, selected) => changeBatchShipTos(colorId, selected)}
                            getOptionLabel={shipToDisplayLabel}
                            isOptionEqualToValue={(option, value) => option.id === value.id}
                            renderInput={(params) => <TextField {...params} required label="Ship To" placeholder="Select one or more" />}
                            sx={{ maxWidth: 560 }}
                          />
                          {selectedShipTos.length > 0 && (
                            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} flexWrap="wrap" useFlexGap sx={{ mt: 1 }}>
                              {selectedShipTos.map((shipTo) => (
                                <TextField
                                  key={shipTo.id}
                                  label={`PO Qty · ${shipTo.shipToCode || shipTo.shipToName || 'Ship To'}`}
                                  type="number"
                                  required
                                  size="small"
                                  value={batchEditForm.shipToQtyByColor?.[colorId]?.[shipTo.id] ?? ''}
                                  onChange={(event) => changeBatchShipToQty(colorId, shipTo.id, event.target.value)}
                                  inputProps={{ min: 0, step: 'any' }}
                                  disabled={batchSaving}
                                  helperText={shipTo.shipToCode && shipTo.shipToName ? shipTo.shipToName : ''}
                                  sx={{ width: { xs: '100%', sm: 195 } }}
                                />
                              ))}
                              <Chip
                                variant="outlined"
                                label={`Total PO Qty: ${formatValue(sumShipToQty(batchEditForm.shipToQtyByColor?.[colorId] || {}, selectedShipToIds))}`}
                                sx={{ alignSelf: { xs: 'flex-start', sm: 'center' }, fontWeight: 700 }}
                              />
                            </Stack>
                          )}
                        </Box>
                      )}
                    </Paper>
                  );
                })}
              </Stack>
            </Box>

            <Divider />

            <Box>
              <Typography sx={{ fontWeight: 750, color: '#103B5C' }}>Packing</Typography>
              <Typography sx={{ mb: 0.75, fontSize: '.78rem', color: 'text.secondary' }}>
                Core BOM is always included. Select the additional Packing sources required for this batch.
              </Typography>
              {(batchEditBom?.packings || []).length ? (
                <Stack direction={{ xs: 'column', sm: 'row' }} flexWrap="wrap" useFlexGap spacing={0.5}>
                  {(batchEditBom?.packings || []).map((packing) => (
                    <FormControlLabel
                      key={packing.id}
                      sx={{ minWidth: { sm: 240 }, mr: 1 }}
                      control={(
                        <Checkbox
                          size="small"
                          checked={(batchEditForm.packingIds || []).includes(packing.id)}
                          disabled={batchSaving}
                          onChange={() => toggleBatchPacking(packing.id)}
                        />
                      )}
                      label={(
                        <Typography sx={{ fontSize: '.82rem' }}>
                          {packing.packingName || 'Packing'} ({packing.lineCount ?? (packing.lines || []).length} lines)
                        </Typography>
                      )}
                    />
                  ))}
                </Stack>
              ) : (
                <Typography sx={{ fontSize: '.82rem', color: 'text.secondary' }}>This BOM has no additional Packing source.</Typography>
              )}
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setBatchEditTarget(null)} disabled={batchSaving} sx={{ textTransform: 'none' }}>Cancel</Button>
          <Button variant="contained" onClick={saveBatchEdit} disabled={batchSaving} sx={{ textTransform: 'none', fontWeight: 700, backgroundColor: '#103B5C' }}>
            {batchSaving ? 'Saving...' : 'Save MPR Selection'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={canMutateMpr && Boolean(batchDeleteTarget)}
        onClose={batchDeleting ? undefined : () => setBatchDeleteTarget(null)}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>Delete This MPR Batch?</DialogTitle>
        <DialogContent>
          <Typography>
            Delete all <strong>{batchDeleteTarget?.sourceLineCount || 0}</strong> physical source row(s) created in this batch?
          </Typography>
          <Typography sx={{ mt: 1, fontSize: '.86rem', color: 'text.secondary' }}>
            Product Color: {batchDeleteTarget?.colors?.join(', ') || '-'}
            <br />
            Sources: {batchDeleteTarget?.packingNames?.join(', ') || '-'}
          </Typography>
          <Typography sx={{ mt: 1, fontSize: '.86rem', color: 'text.secondary' }}>
            Other MPR batches remain unchanged.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button disabled={batchDeleting} onClick={() => setBatchDeleteTarget(null)}>Cancel</Button>
          <Button color="error" variant="contained" disabled={batchDeleting} onClick={removeMprBatch}>
            {batchDeleting ? 'Deleting...' : 'Delete Batch'}
          </Button>
        </DialogActions>
      </Dialog>

      <MprLineEditDialog
        open={canMutateMpr && Boolean(editingLine)}
        line={editingLine}
        productColors={productColorsForBom((boms || []).find((bom) => String(bom?.id || '') === String(editingLine?.bomId || '')))}
        saving={lineSaving}
        onClose={() => setEditingLine(null)}
        onSave={saveMprLine}
      />

      <Dialog open={canMutateMpr && Boolean(lineDeleteTarget)} onClose={lineSaving ? undefined : () => setLineDeleteTarget(null)}>
        <DialogTitle>Delete MPR Item?</DialogTitle>
        <DialogContent>
          Delete <strong>{lineDeleteTarget?.matFullDescription || 'this MPR item'}</strong>? This only removes the selected row from the current MPR.
        </DialogContent>
        <DialogActions>
          <Button disabled={lineSaving} onClick={() => setLineDeleteTarget(null)}>Cancel</Button>
          <Button color="error" variant="contained" disabled={lineSaving} onClick={removeMprLine}>
            {lineSaving ? 'Deleting...' : 'Delete Item'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={notice.open} autoHideDuration={3500} onClose={() => setNotice((current) => ({ ...current, open: false }))}>
        <Alert severity={notice.severity} variant="filled">{notice.message}</Alert>
      </Snackbar>
    </Box>
  );
}
