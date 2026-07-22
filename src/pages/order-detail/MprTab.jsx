import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
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
import { CheckCircle, Delete, Download, Edit, ErrorOutline, Preview, Refresh, RestartAlt, Save } from '@mui/icons-material';
import {
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
  updateMprBatch,
  updateMprLine
} from '../../services/orderBomMprService';
import MprLineEditDialog from './MprLineEditDialog';
import { formatDateTime, statusSx } from '../orders/orderUi';
import { listActiveShipTos, listMasterData } from '../../services/masterDataService';
import { canManageSales } from 'utils/accessControl';
import { normalizeBuyerKey } from 'utils/buyerContext';

const emptyBomSelection = () => ({
  selected: false,
  colors: [],
  packingIds: [],
  poQtyByColor: {},
  shipToIdsByColor: {}
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
    season: safeBom.header?.season || ''
  }));
};

const productColorLabel = (item = {}) => {
  const safeItem = item || {};
  return [
    safeItem.colorName,
    safeItem.patternNumber,
    safeItem.season
  ].filter(Boolean).join(' · ');
};

const numberValue = (value) => {
  if (value === '' || value === null || value === undefined) return '';
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : '';
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

const renderMprCellValue = (field, value, row = {}) => {
  if (field === 'vendorCode') return vendorCodeValue(value);
  if (MPR_TEXT_FIELDS.has(field)) return textValue(value);
  if (field === 'matPriceWithoutTax' && String(row?.currency || '').trim().toUpperCase() === 'VND') {
    return formatValue(value, 0).replace(/,/g, '.');
  }
  return formatValue(value);
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

const emptySalesBomFilter = { keyword: '' };
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

const salesBomMatchesKeyword = (bom = {}, keyword = '') => {
  const safeBom = bom || {};
  const needle = String(keyword || '').trim();
  if (!needle) return true;
  const productColors = productColorsForBom(safeBom).map((item) => item?.colorName);
  const packings = (safeBom.packings || []).map((packing) => packing?.packingName);
  return [
    safeBom.bomNo,
    safeBom.bomName,
    safeBom.header?.styleNumber,
    safeBom.header?.styleName,
    safeBom.header?.season,
    ...productColors,
    ...packings
  ].some((value) => includesText(value, needle));
};

const MPR_COLUMNS = [
  ['styleColorKey', 'STYLE_COLOR', 190],
  ['styleDescription', 'STYLE DESCRIPTION', 190],
  ['styleColor', 'STYLE COLOR', 150],
  ['shipTo', 'Ship To', 130],
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

export default function MprTab({ order, buyerKey: buyerKeyProp }) {
  const buyerKey = normalizeBuyerKey(buyerKeyProp || order?.buyerKey);
  const llBeanMprEnabled = buyerKey === 'LLBEAN';
  const canWrite = canManageSales();
  const writeBlockedMessage = 'Sales permission is required to create or modify MPR data.';
  const buyerStrategyMessage = 'MPR calculation is currently configured for L.L.BEAN only. The formula strategy for this Buyer has not been configured yet.';
  const [boms, setBoms] = useState([]);
  const [selection, setSelection] = useState({});
  const [mpr, setMpr] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState({ open: false, severity: 'success', message: '' });
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [batchDeleteTarget, setBatchDeleteTarget] = useState(null);
  const [batchDeleting, setBatchDeleting] = useState(false);
  const [editingLine, setEditingLine] = useState(null);
  const [lineDeleteTarget, setLineDeleteTarget] = useState(null);
  const [lineSaving, setLineSaving] = useState(false);
  const [shipTos, setShipTos] = useState([]);
  const [productColorMasters, setProductColorMasters] = useState([]);
  const [batchEditTarget, setBatchEditTarget] = useState(null);
  const [batchEditForm, setBatchEditForm] = useState({ poQtyByColor: {}, shipToIdsByColor: {} });
  const [batchSaving, setBatchSaving] = useState(false);
  const [salesBomFilter, setSalesBomFilter] = useState(emptySalesBomFilter);
  const [mprFilters, setMprFilters] = useState(emptyMprFilters);
  const progressTimerRef = useRef(null);
  const exportProgressTimerRef = useRef(null);
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
      const [allBoms, activeShipTos, productColorResponse] = await Promise.all([
        listBoms(order.id),
        listActiveShipTos(),
        listMasterData('productColor', { buyerKey, page: 0, size: 200 })
      ]);
      const submitted = (allBoms || []).filter((bom) => bom.status === 'SUBMITTED');
      setBoms(submitted);
      setShipTos(activeShipTos || []);
      setProductColorMasters(Array.isArray(productColorResponse)
        ? productColorResponse
        : (productColorResponse?.content || productColorResponse?.items || []));
      setSelection((previous) => {
        const next = initialSelection(submitted);
        submitted.forEach((bom) => {
          if (previous[bom.id]) next[bom.id] = { ...emptyBomSelection(), ...previous[bom.id] };
        });
        return next;
      });
      try {
        setMpr(await getMpr(order.id));
      } catch (error) {
        if (error?.response?.status === 404) setMpr(null);
        else throw error;
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
  }, []);

  const toggleBom = (bomId, checked) => {
    if (!canWrite) return;
    setSelection((current) => ({
      ...current,
      [bomId]: {
        ...(current[bomId] || emptyBomSelection()),
        selected: checked
      }
    }));
  };

  const toggleColor = (bomId, colorId) => {
    if (!canWrite) return;
    setSelection((current) => {
      const item = current[bomId] || emptyBomSelection();
      const selectedColors = new Set(item.colors || []);
      const poQtyByColor = { ...(item.poQtyByColor || {}) };
      const shipToIdsByColor = { ...(item.shipToIdsByColor || {}) };

      if (selectedColors.has(colorId)) {
        selectedColors.delete(colorId);
        delete poQtyByColor[colorId];
        delete shipToIdsByColor[colorId];
      } else {
        selectedColors.add(colorId);
        poQtyByColor[colorId] = '';
        shipToIdsByColor[colorId] = [];
      }

      return {
        ...current,
        [bomId]: {
          ...item,
          colors: Array.from(selectedColors),
          poQtyByColor,
          shipToIdsByColor
        }
      };
    });
  };

  const changePoQty = (bomId, colorId, value) => {
    if (!canWrite) return;
    setSelection((current) => {
      const item = current[bomId] || emptyBomSelection();
      return {
        ...current,
        [bomId]: {
          ...item,
          poQtyByColor: {
            ...(item.poQtyByColor || {}),
            [colorId]: value
          }
        }
      };
    });
  };

  const changeShipTos = (bomId, colorId, selected) => {
    if (!canWrite) return;
    setSelection((current) => {
      const item = current[bomId] || emptyBomSelection();
      return {
        ...current,
        [bomId]: {
          ...item,
          shipToIdsByColor: {
            ...(item.shipToIdsByColor || {}),
            [colorId]: (selected || []).map((shipTo) => shipTo.id).filter(Boolean)
          }
        }
      };
    });
  };

  const togglePacking = (bomId, packingId) => {
    if (!canWrite) return;
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
    // Retained for backward compatibility. Phase 1 takes PO Qty per Product Color below.
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
            (state.colors || []).map((colorId) => [
              colorId,
              numberValue(state.poQtyByColor?.[colorId])
            ])
          ),
          shipToIdsByColor: Object.fromEntries(
            (state.colors || []).map((colorId) => [
              colorId,
              state.shipToIdsByColor?.[colorId] || []
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

  const finishGenerateProgress = (addedRows) => {
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
      addedRows: Number(addedRows || 0),
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
      fileName: `${mpr?.mprNo || 'MPR'}.xlsx`,
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
        const quantity = selectedBom.poQtyByColor?.[colorId];
        if (quantity === '' || quantity === null || quantity === undefined || Number(quantity) < 0) {
          notify('Enter a valid PO Qty for every selected Product Color.', 'error');
          return false;
        }
        if (!(selectedBom.shipToIdsByColor?.[colorId] || []).length) {
          notify('Select at least one Ship To for every selected Product Color.', 'error');
          return false;
        }
      }
    }
    return true;
  };

  const resetSelection = () => {
    setSelection(initialSelection(boms));
  };

  const previewMprAction = async () => {
    if (!canWrite || !llBeanMprEnabled) {
      notify(!canWrite ? writeBlockedMessage : buyerStrategyMessage, 'warning');
      return;
    }
    if (!validateSelection()) return;
    try {
      const result = await previewMpr(order.id, payload);
      const currentCount = mpr?.lines?.length || 0;
      const addedCount = Math.max(0, (result?.lines?.length || 0) - currentCount);
      setPreview(result);

      notify(
        currentCount
          ? `MPR preview: ${currentCount} saved line(s) + ${addedCount} new line(s).`
          : `MPR preview generated: ${result?.lines?.length || 0} line(s).`
      );
    } catch (error) {
      notify(getApiError(error, 'Unable to preview MPR.'), 'error');
    }
  };

  const generate = async () => {
    if (!canWrite || !llBeanMprEnabled) {
      notify(!canWrite ? writeBlockedMessage : buyerStrategyMessage, 'warning');
      return;
    }
    if (generateProgress.status === 'processing') return;
    if (!validateSelection()) return;

    startGenerateProgress();

    try {
      const previousCount = mpr?.lines?.length || 0;
      const result = await generateMpr(order.id, payload);
      const addedCount = Math.max(0, (result?.lines?.length || 0) - previousCount);

      setMpr(result);
      setPreview(null);
      resetSelection();
      finishGenerateProgress(addedCount);

      notify(
        previousCount
          ? `${addedCount} new MPR line(s) added. Existing MPR lines were kept.`
          : 'MPR generated and saved successfully.'
      );
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
    if (generateProgress.status === 'processing' || exportProgress.status === 'processing') return;

    const fileName = `${mpr.mprNo || 'MPR'}.xlsx`;
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

  const remove = async () => {
    if (!canWrite) { notify(writeBlockedMessage, 'warning'); return; }
    try {
      await deleteMpr(order.id);
      setMpr(null);
      setPreview(null);
      setDeleteOpen(false);
      notify('MPR deleted.');
    } catch (error) {
      notify(getApiError(error, 'Unable to delete MPR.'), 'error');
    }
  };

  const removeMprBatch = async () => {
    if (!canWrite) { notify(writeBlockedMessage, 'warning'); return; }
    if (!mpr?.id || !batchDeleteTarget?.batchId) return;

    setBatchDeleting(true);
    try {
      const result = await deleteMprBatch(order.id, batchDeleteTarget.batchId);
      const removed = Number(result?.removedLineCount || 0);
      const remaining = Number(result?.remainingLineCount || 0);

      setPreview(null);
      setBatchDeleteTarget(null);

      if (result?.mprDeleted || !result?.mpr) {
        setMpr(null);
        notify(`Batch deleted. ${removed} MPR line(s) removed. The MPR is now empty.`);
      } else {
        setMpr(result.mpr);
        notify(`Batch deleted. ${removed} MPR line(s) removed. ${remaining} line(s) remain.`);
      }
    } catch (error) {
      notify(getApiError(error, 'Unable to delete this MPR batch.'), 'error');
    } finally {
      setBatchDeleting(false);
    }
  };

  const openBatchEdit = (batch) => {
    if (!canWrite) { notify(writeBlockedMessage, 'warning'); return; }
    setBatchEditTarget(batch);
    setBatchEditForm({
      poQtyByColor: Object.fromEntries((batch.colors || []).map((color) => [color, batch.poQtyByColor?.[color] ?? ''])),
      shipToIdsByColor: Object.fromEntries((batch.colors || []).map((color) => [color, batch.shipToIdsByColor?.[color] || []]))
    });
  };

  const changeBatchPoQty = (color, value) => {
    if (!canWrite) { notify(writeBlockedMessage, 'warning'); return; }
    setBatchEditForm((current) => ({
      ...current,
      poQtyByColor: { ...current.poQtyByColor, [color]: value }
    }));
  };

  const changeBatchShipTos = (color, selected) => {
    if (!canWrite) { notify(writeBlockedMessage, 'warning'); return; }
    setBatchEditForm((current) => ({
      ...current,
      shipToIdsByColor: {
        ...current.shipToIdsByColor,
        [color]: (selected || []).map((item) => item.id).filter(Boolean)
      }
    }));
  };

  const saveBatchEdit = async () => {
    if (!canWrite) { notify(writeBlockedMessage, 'warning'); return; }
    if (!batchEditTarget?.batchId) return;
    const colors = batchEditTarget.colors || [];
    for (const color of colors) {
      const quantity = numberValue(batchEditForm.poQtyByColor?.[color]);
      if (quantity === '' || Number(quantity) < 0) {
        notify(`Enter a valid PO Qty for Product Color ${color}.`, 'error');
        return;
      }
      if (!(batchEditForm.shipToIdsByColor?.[color] || []).length) {
        notify(`Select at least one Ship To for Product Color ${color}.`, 'error');
        return;
      }
    }

    setBatchSaving(true);
    try {
      const result = await updateMprBatch(order.id, batchEditTarget.batchId, {
        poQtyByColor: Object.fromEntries(colors.map((color) => [color, numberValue(batchEditForm.poQtyByColor?.[color])])),
        shipToIdsByColor: Object.fromEntries(colors.map((color) => [color, batchEditForm.shipToIdsByColor?.[color] || []]))
      });
      setMpr(result);
      setPreview(null);
      setBatchEditTarget(null);
      notify('PO Qty and Ship To were updated for every packing line in this batch.');
    } catch (error) {
      notify(getApiError(error, 'Unable to update this MPR batch.'), 'error');
    } finally {
      setBatchSaving(false);
    }
  };

  const saveMprLine = async (payload) => {
    if (!canWrite) { notify(writeBlockedMessage, 'warning'); return; }
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
    if (!canWrite) { notify(writeBlockedMessage, 'warning'); return; }
    if (!mpr?.id || !lineDeleteTarget?.id) return;
    setLineSaving(true);
    try {
      const result = await deleteMprLine(order.id, lineDeleteTarget.id);
      setMpr(result);
      setPreview(result);
      setLineDeleteTarget(null);
      notify('MPR item deleted.');
    } catch (error) {
      notify(getApiError(error, 'Unable to delete MPR item.'), 'error');
    } finally {
      setLineSaving(false);
    }
  };

  const displayedMpr = preview || mpr;
  const unfilteredVisibleLines = displayedMpr?.lines || [];
  const salesFilteredBoms = useMemo(
    () => boms.filter((bom) => salesBomMatchesKeyword(bom, salesBomFilter.keyword)),
    [boms, salesBomFilter.keyword]
  );
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
  const subtotalMatAmountUsd = useMemo(
    () => visibleLines.reduce((total, line) => {
      const value = Number(line?.matAmountUsd);
      return Number.isFinite(value) ? total + value : total;
    }, 0),
    [visibleLines]
  );
  const canEditLines = Boolean(canWrite && mpr?.id && (!preview || preview?.id === mpr.id));
  const canManageBatches = Boolean(canWrite && mpr?.id && (!preview || preview?.id === mpr.id));

  const batchSummaries = useMemo(() => {
    const linesByBatch = new Map();

    (mpr?.lines || []).forEach((line) => {
      const batchId = line?.generationBatchId;
      if (!batchId) return;

      if (!linesByBatch.has(batchId)) linesByBatch.set(batchId, []);
      linesByBatch.get(batchId).push(line);
    });

    return (mpr?.selections || [])
      .filter((selectionItem) => selectionItem?.batchId)
      .map((selectionItem) => {
        const lines = linesByBatch.get(selectionItem.batchId) || [];
        const packingNames = Array.from(new Set(
          lines
            .map((line) => line?.packingName || line?.packingId || 'Core BOM (No Packing)')
            .filter(Boolean)
        ));

        return {
          batchId: selectionItem.batchId,
          bomNo: selectionItem.bomNo || '',
          bomName: selectionItem.bomName || '',
          colors: selectionItem.colors || [],
          packingNames,
          createdAt: selectionItem.createdAt,
          createdBy: selectionItem.createdBy,
          poQtyByColor: selectionItem.poQtyByColor || {},
          shipToIdsByColor: selectionItem.shipToIdsByColor || {},
          shipToByColor: selectionItem.shipToByColor || {},
          lineCount: lines.length
        };
      })
      .filter((batch) => batch.lineCount > 0)
      .sort((left, right) => {
        const leftTime = left?.createdAt ? new Date(left.createdAt).getTime() : 0;
        const rightTime = right?.createdAt ? new Date(right.createdAt).getTime() : 0;
        if (leftTime !== rightTime) return rightTime - leftTime;
        return String(right?.batchId || '').localeCompare(String(left?.batchId || ''));
      });
  }, [mpr]);

  const generationBusy = generateProgress.status === 'processing';
  const exportBusy = exportProgress.status === 'processing';
  const operationBusy = generationBusy || exportBusy;

  return (
    <Box>
      <Paper elevation={0} sx={{ p: 2, border: '1px solid #e5e7eb', borderRadius: 2, mb: 2 }}>
        <Stack direction={{ xs: 'column', lg: 'row' }} justifyContent="space-between" spacing={2}>
          <Box>
            <Typography sx={{ fontWeight: 900, color: '#103B5C' }}>Sales / MPR</Typography>
          </Box>
          <Stack direction="row" flexWrap="wrap" spacing={1}>
            <Button startIcon={<Refresh />} onClick={load} disabled={loading || operationBusy} sx={{ textTransform: 'none' }}>Refresh</Button>
            {mpr && (
              <>
                <Button
                  startIcon={<Download />}
                  onClick={exportMprExcel}
                  disabled={loading || operationBusy}
                  sx={{ textTransform: 'none' }}
                >
                  {exportBusy ? 'Exporting Excel...' : 'Export MPR'}
                </Button>
                <Tooltip title={!canWrite ? writeBlockedMessage : 'Delete MPR'}><span><Button color="error" startIcon={<Delete />} onClick={() => setDeleteOpen(true)} disabled={!canWrite || operationBusy} sx={{ textTransform: 'none' }}>
                  Delete MPR
                </Button></span></Tooltip>
              </>
            )}
            <Tooltip title={!canWrite ? writeBlockedMessage : (!llBeanMprEnabled ? buyerStrategyMessage : 'Preview MPR')}><span><Button variant="outlined" startIcon={<Preview />} onClick={previewMprAction} disabled={loading || operationBusy || !canWrite || !llBeanMprEnabled} sx={{ textTransform: 'none' }}>
              Preview MPR
            </Button></span></Tooltip>
            <Tooltip title={!canWrite ? writeBlockedMessage : (!llBeanMprEnabled ? buyerStrategyMessage : (mpr ? 'Add To MPR' : 'Create MPR'))}><span><Button variant="contained" startIcon={<Save />} onClick={generate} disabled={loading || operationBusy || !canWrite || !llBeanMprEnabled} sx={{ textTransform: 'none', backgroundColor: '#103B5C' }}>
              {generationBusy ? 'Creating MPR...' : (mpr ? 'Add To MPR' : 'Create MPR')}
            </Button></span></Tooltip>
          </Stack>
        </Stack>
      </Paper>

      {!llBeanMprEnabled && (
        <Alert severity="info" sx={{ mb: 2 }}>
          {buyerStrategyMessage}
        </Alert>
      )}

      <Stack spacing={1.5}>
        {boms.length === 0 && (
          <Paper elevation={0} sx={{ p: 3, textAlign: 'center', border: '1px solid #e5e7eb', borderRadius: 2, color: 'text.secondary' }}>
            No submitted BOM is available. BOM/Admin must submit a BOM first.
          </Paper>
        )}

        {boms.length > 0 && (
          <Paper elevation={0} sx={{ p: 1.5, border: '1px solid #e5e7eb', borderRadius: 2 }}>
            <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" spacing={0.75} alignItems={{ md: 'center' }}>
              <Box>
                <Typography sx={{ fontWeight: 900, color: '#103B5C' }}>Sales BOM Search</Typography>
              </Box>
              <Typography sx={{ fontSize: '.78rem', color: 'text.secondary', fontWeight: 700 }}>
                Showing {salesFilteredBoms.length} / {boms.length} BOM(s)
              </Typography>
            </Stack>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ mt: 1 }}>
              <TextField
                size="small"
                label="Keyword"
                value={salesBomFilter.keyword}
                onChange={(event) => setSalesBomFilter({ keyword: event.target.value })}
                placeholder="BOM No, Product Color, Packing..."
                sx={{ minWidth: { xs: '100%', sm: 340 }, flex: 1 }}
              />
              <Button
                variant="outlined"
                startIcon={<RestartAlt />}
                onClick={() => setSalesBomFilter(emptySalesBomFilter)}
                sx={{ textTransform: 'none', alignSelf: { xs: 'stretch', sm: 'center' } }}
              >
                Reset
              </Button>
            </Stack>
          </Paper>
        )}

        {boms.length > 0 && salesFilteredBoms.length === 0 && (
          <Paper elevation={0} sx={{ p: 2.5, textAlign: 'center', border: '1px solid #e5e7eb', borderRadius: 2, color: 'text.secondary' }}>
            No submitted BOM matches the current Sales search.
          </Paper>
        )}

        {salesFilteredBoms.map((bom) => {
          const state = selection[bom.id] || emptyBomSelection();
          const productColors = productColorsForBom(bom);

          return (
            <Paper key={bom.id} elevation={0} sx={{ p: 2, border: `1px solid ${state.selected ? '#93c5fd' : '#e5e7eb'}`, borderRadius: 2 }}>
              <FormControlLabel
                control={<Checkbox checked={Boolean(state.selected)} disabled={!canWrite} onChange={(event) => toggleBom(bom.id, event.target.checked)} />}
                label={(
                  <Box>
                    <Typography sx={{ fontWeight: 900 }}>{bom.bomNo} — {bom.bomName}</Typography>
                    <Typography sx={{ fontSize: '.78rem', color: 'text.secondary' }}>
                      {bom.coreLineCount ?? (bom.coreLines || []).length} core lines · {bom.lineCount ?? ((bom.coreLines || []).length + (bom.packings || []).reduce((total, packing) => total + (packing.lineCount ?? (packing.lines || []).length), 0))} total lines · {(bom.packings || []).length} packings
                    </Typography>
                  </Box>
                )}
              />

              {state.selected && (
                <Box sx={{ ml: { sm: 4 }, mt: 1 }}>
                  <Divider sx={{ mb: 1.25 }} />
                  <Typography sx={{ fontSize: '.8rem', fontWeight: 900, mb: 0.75 }}>
                    1. Select Product Color, Enter PO Qty And Ship To
                  </Typography>

                  <Stack spacing={0.75}>
                    {productColors.map((productColor) => {
                      const colorId = productColor.id || productColor.colorName;
                      const checked = (state.colors || []).includes(colorId);
                      return (
                        <Stack key={colorId} direction={{ xs: 'column', sm: 'row' }} alignItems={{ sm: 'center' }} spacing={1} sx={{ maxWidth: 980 }}>
                          <FormControlLabel
                            sx={{ flex: 1, mr: 0 }}
                            control={<Checkbox size="small" checked={checked} disabled={!canWrite} onChange={() => toggleColor(bom.id, colorId)} />}
                            label={<Typography sx={{ fontSize: '.82rem' }}>{productColorLabel(productColor)}</Typography>}
                          />
                          {checked && (
                            <>
                              <TextField
                                label="PO Qty"
                                type="number"
                                required
                                size="small"
                                value={state.poQtyByColor?.[colorId] ?? ''}
                                onChange={(event) => changePoQty(bom.id, colorId, event.target.value)}
                                inputProps={{ min: 0, step: 'any' }}
                                disabled={!canWrite}
                                sx={{ width: { xs: '100%', sm: 150 } }}
                              />
                              <Autocomplete
                                multiple
                                size="small"
                                disabled={!canWrite}
                                options={shipTos}
                                value={shipTos.filter((item) => (state.shipToIdsByColor?.[colorId] || []).includes(item.id))}
                                onChange={(_, selected) => changeShipTos(bom.id, colorId, selected)}
                                getOptionLabel={(item) => [item.shipToCode, item.shipToName].filter(Boolean).join(' · ')}
                                isOptionEqualToValue={(option, value) => option.id === value.id}
                                renderInput={(params) => <TextField {...params} required label="Ship To" placeholder="Select one or more" />}
                                sx={{ width: { xs: '100%', sm: 360 } }}
                              />
                            </>
                          )}
                        </Stack>
                      );
                    })}
                  </Stack>

                  <Typography sx={{ fontSize: '.8rem', fontWeight: 900, mt: 1.5, mb: 0.2 }}>
                    2. Add Packing (Optional)
                  </Typography>
                  <Stack direction="row" flexWrap="wrap">
                    {(bom.packings || []).map((packing) => (
                      <FormControlLabel
                        key={packing.id}
                        control={<Checkbox size="small" checked={(state.packingIds || []).includes(packing.id)} disabled={!canWrite} onChange={() => togglePacking(bom.id, packing.id)} />}
                        label={<Typography sx={{ fontSize: '.8rem' }}>{packing.packingName}</Typography>}
                      />
                    ))}
                  </Stack>
                </Box>
              )}
            </Paper>
          );
        })}
      </Stack>

      {mpr && batchSummaries.length > 0 && (
        <Paper elevation={0} sx={{ mt: 2, p: 1.5, border: '1px solid #e5e7eb', borderRadius: 2 }}>
          <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" spacing={1} sx={{ mb: 1.25 }}>
            <Box>
              <Typography sx={{ fontWeight: 900, color: '#103B5C' }}>MPR Generation Batches</Typography>
            </Box>
          </Stack>

          <Stack spacing={1}>
            {batchSummaries.map((batch, index) => (
              <Box
                key={batch.batchId}
                sx={{
                  p: 1.25,
                  border: '1px solid #dbe3ef',
                  borderRadius: 1.5,
                  backgroundColor: '#fbfdff'
                }}
              >
                <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" spacing={1.25}>
                  <Box sx={{ minWidth: 0 }}>
                    <Typography sx={{ fontWeight: 900, color: '#103B5C' }}>
                      Batch {index + 1} · {batch.bomNo || 'BOM'}{batch.bomName ? ` — ${batch.bomName}` : ''}
                    </Typography>
                    <Typography sx={{ mt: 0.35, fontSize: '.8rem' }}>
                      Product Color: {batch.colors.length ? batch.colors.join(', ') : '-'}
                    </Typography>
                    <Typography sx={{ mt: 0.2, fontSize: '.8rem' }}>
                      Sources: {batch.packingNames.length ? batch.packingNames.join(', ') : '-'}
                    </Typography>
                    {(batch.colors || []).map((color) => (
                      <Typography key={color} sx={{ mt: 0.2, fontSize: '.76rem', color: 'text.secondary' }}>
                        {color}: PO Qty {formatValue(batch.poQtyByColor?.[color] ?? 0)} · Ship To {batch.shipToByColor?.[color] || '-'}
                      </Typography>
                    ))}
                    <Typography sx={{ mt: 0.2, fontSize: '.76rem', color: 'text.secondary' }}>
                      {batch.lineCount} MPR Line(s)
                      {batch.createdAt ? ` · Created ${formatDateTime(batch.createdAt)}` : ''}
                      {batch.createdBy ? ` · ${batch.createdBy}` : ''}
                    </Typography>
                  </Box>

                  <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ alignSelf: { xs: 'flex-start', md: 'center' } }}>
                    <Button
                      variant="outlined"
                      startIcon={<Edit />}
                      disabled={!canManageBatches || batchSaving}
                      onClick={() => openBatchEdit(batch)}
                      sx={{ textTransform: 'none' }}
                    >
                      Update Qty / Ship To
                    </Button>
                    <Button
                      color="error"
                      variant="outlined"
                      startIcon={<Delete />}
                      disabled={!canManageBatches || batchDeleting || batchSaving}
                      onClick={() => setBatchDeleteTarget(batch)}
                      sx={{ textTransform: 'none' }}
                    >
                      Delete Batch
                    </Button>
                  </Stack>
                </Stack>
              </Box>
            ))}
          </Stack>
        </Paper>
      )}

      {(preview || mpr) && (
        <Paper elevation={0} sx={{ mt: 2, border: '1px solid #e5e7eb', borderRadius: 2, overflow: 'hidden' }}>
          <Box sx={{ p: 1.5, borderBottom: '1px solid #e5e7eb' }}>
            <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" spacing={0.5}>
              <Typography sx={{ fontWeight: 900, color: '#103B5C' }}>
                {preview && mpr
                  ? `MPR Preview (${visibleLines.length} / ${unfilteredVisibleLines.length} Filtered Line(s): ${mpr?.lines?.length || 0} Saved + ${Math.max(0, unfilteredVisibleLines.length - (mpr?.lines?.length || 0))} New)`
                  : `MPR Preview (${visibleLines.length} / ${unfilteredVisibleLines.length} Filtered Line(s))`}
              </Typography>
              {mpr && (
                <Stack direction="row" spacing={1} alignItems="center">
                  <Chip label={mpr.status} sx={statusSx(mpr.status)} />
                  <Typography sx={{ fontSize: '.78rem', color: 'text.secondary' }}>Updated {formatDateTime(mpr.updatedAt)}</Typography>
                </Stack>
              )}
            </Stack>

            <Box sx={{ mt: 1.25, p: 1.15, border: '1px solid #e5e7eb', borderRadius: 1.5, backgroundColor: '#fbfdff' }}>
              <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" spacing={0.75} sx={{ mb: 0.85 }}>
                <Typography sx={{ fontWeight: 900, fontSize: '.83rem', color: '#103B5C' }}>Sales / MPR Line Search & Filter</Typography>
                <Stack direction="row" flexWrap="wrap" spacing={1} useFlexGap alignItems="center">
                  <Chip size="small" variant="outlined" label={`Showing ${visibleLines.length} / ${unfilteredVisibleLines.length} line(s)`} />
                  <Chip size="small" variant="outlined" label={`SUBTOTAL MAT AMOUNT in USD: ${formatValue(subtotalMatAmountUsd, 2)}`} />
                </Stack>
              </Stack>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', gap: 1 }}>
                <TextField
                  size="small"
                  label="Keyword"
                  value={mprFilters.keyword}
                  onChange={(event) => setMprFilters((current) => ({ ...current, keyword: event.target.value }))}
                  placeholder="SAP Code, material, vendor, child color..."
                  sx={{ minWidth: { xs: '100%', md: 285 }, flex: 1 }}
                />
                <TextField size="small" select label="Style Color" value={mprFilters.productColor} onChange={(event) => setMprFilters((current) => ({ ...current, productColor: event.target.value }))} sx={{ minWidth: 180 }}>
                  <MenuItem value="">All Style Colors</MenuItem>
                  {mprFilterOptions.productColors.map((option) => <MenuItem key={option.key} value={option.label}>{option.label}</MenuItem>)}
                </TextField>
                <TextField size="small" select label="Source" value={mprFilters.source} onChange={(event) => setMprFilters((current) => ({ ...current, source: event.target.value }))} sx={{ minWidth: 190 }}>
                  <MenuItem value="">Core + All Packings</MenuItem>
                  {mprFilterOptions.sources.map((option) => <MenuItem key={option.key} value={option.key}>{option.label}</MenuItem>)}
                </TextField>
                <TextField size="small" select label="Ship To" value={mprFilters.shipTo} onChange={(event) => setMprFilters((current) => ({ ...current, shipTo: event.target.value }))} sx={{ minWidth: 180 }}>
                  <MenuItem value="">All Ship To</MenuItem>
                  {mprFilterOptions.shipTos.map((option) => <MenuItem key={option.key} value={option.label}>{option.label}</MenuItem>)}
                </TextField>
                <TextField size="small" select label="BOM Review" value={mprFilters.reviewStatus} onChange={(event) => setMprFilters((current) => ({ ...current, reviewStatus: event.target.value }))} sx={{ minWidth: 165 }}>
                  <MenuItem value="">All Review Status</MenuItem>
                  <MenuItem value="NO_REVIEW">No Review</MenuItem>
                  <MenuItem value="PENDING_BOM_REVIEW">Pending BOM Review</MenuItem>
                  <MenuItem value="RECHECK_SALES">Recheck Sales</MenuItem>
                  <MenuItem value="APPLIED_TO_BOM">Applied To BOM</MenuItem>
                </TextField>
                <Button variant="outlined" startIcon={<RestartAlt />} onClick={() => setMprFilters(emptyMprFilters)} sx={{ textTransform: 'none' }}>Reset</Button>
              </Box>
            </Box>
          </Box>

          <Box sx={{ px: 1.5, py: 0.9, display: 'flex', justifyContent: 'flex-end', borderBottom: '1px solid #e5e7eb', backgroundColor: '#fff' }}>
            <Typography sx={{ fontWeight: 900, color: '#103B5C', fontSize: '.82rem' }}>
              =SUBTOTAL MAT AMOUNT in USD: {formatValue(subtotalMatAmountUsd, 2)}
            </Typography>
          </Box>

          <TableContainer sx={{ maxHeight: 540 }}>
            <Table stickyHeader size="small" sx={{ minWidth: 5120 }}>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ minWidth: 70, fontWeight: 900, backgroundColor: '#f8fafc', whiteSpace: 'nowrap' }}>
                    No.
                  </TableCell>
                  {MPR_COLUMNS.map(([, header, minWidth]) => (
                    <TableCell key={header} sx={{ minWidth, fontWeight: 900, backgroundColor: '#f8fafc', whiteSpace: 'nowrap' }}>
                      {header}
                    </TableCell>
                  ))}
                  <TableCell sx={{ minWidth: 110, fontWeight: 900, backgroundColor: '#f8fafc', whiteSpace: 'nowrap' }}>
                    Actions
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {(() => {
                  const colorGroups = [];
                  const groupByColor = new Map();

                  visibleLines.forEach((line) => {
                    const color = line?.styleColor || 'No Product Color';
                    if (!groupByColor.has(color)) {
                      const group = { color, packingGroups: [], packingByKey: new Map(), lineCount: 0 };
                      groupByColor.set(color, group);
                      colorGroups.push(group);
                    }

                    const colorGroup = groupByColor.get(color);
                    const lineWithRowNo = { ...line, __displayNo: colorGroup.lineCount + 1 };
                    const isCoreLine = !lineWithRowNo.packingId && !lineWithRowNo.packingName;
                    const packingKey = lineWithRowNo.packingId || lineWithRowNo.packingName || 'CORE_BOM';
                    if (!colorGroup.packingByKey.has(packingKey)) {
                      const packingGroup = {
                        key: packingKey,
                        name: isCoreLine ? 'Core BOM (No Packing)' : (lineWithRowNo.packingName || `Packing ${lineWithRowNo.packingId}`),
                        lines: []
                      };
                      colorGroup.packingByKey.set(packingKey, packingGroup);
                      colorGroup.packingGroups.push(packingGroup);
                    }

                    colorGroup.packingByKey.get(packingKey).lines.push(lineWithRowNo);
                    colorGroup.lineCount += 1;
                  });

                  return colorGroups.flatMap((colorGroup) => ([
                    <TableRow key={`color-group-${colorGroup.color}`}>
                      <TableCell
                        colSpan={MPR_COLUMNS.length + 2}
                        sx={{
                          py: 0.9,
                          fontWeight: 900,
                          color: '#103B5C',
                          backgroundColor: '#eef6ff',
                          borderTop: '2px solid #93c5fd'
                        }}
                      >
                        Product Color: {colorGroup.color} — {colorGroup.lineCount} Line(s)
                      </TableCell>
                    </TableRow>,
                    ...colorGroup.packingGroups.flatMap((packingGroup) => ([
                      <TableRow key={`packing-group-${colorGroup.color}-${packingGroup.key}`}>
                        <TableCell
                          colSpan={MPR_COLUMNS.length + 2}
                          sx={{
                            py: 0.65,
                            pl: 3,
                            fontWeight: 800,
                            color: '#334155',
                            backgroundColor: '#f8fafc'
                          }}
                        >
                          Source: {packingGroup.name} — {packingGroup.lines.length} Line(s)
                        </TableCell>
                      </TableRow>,
                      ...packingGroup.lines.map((line) => (
                        <TableRow key={line.id} hover>
                          <TableCell sx={{ whiteSpace: 'nowrap', verticalAlign: 'top', fontWeight: 700 }}>
                            {line.__displayNo}
                          </TableCell>
                          {MPR_COLUMNS.map(([field, header]) => (
                            <TableCell key={header} sx={{ whiteSpace: 'nowrap', verticalAlign: 'top' }}>
                              {renderMprCellValue(field, line[field], line)}
                            </TableCell>
                          ))}
                          <TableCell sx={{ whiteSpace: 'nowrap' }}>
                            {(() => {
                              const review = latestBomReview(line);
                              const chip = reviewChip(review);
                              return chip ? (
                                <Tooltip title={review.reviewComment || 'Sales correction is tracked in BOM review.'}>
                                  <Chip size="small" color={chip.color} label={chip.label} sx={{ mr: 0.5, mb: 0.35 }} />
                                </Tooltip>
                              ) : null;
                            })()}
                            <Tooltip title={canEditLines ? 'Edit MPR Item' : (!canWrite ? writeBlockedMessage : 'Create MPR First')}>
                              <span>
                                <IconButton size="small" disabled={!canEditLines} onClick={() => setEditingLine(line)}>
                                  <Edit fontSize="small" />
                                </IconButton>
                              </span>
                            </Tooltip>
                            <Tooltip title={canEditLines ? 'Delete MPR Item' : (!canWrite ? writeBlockedMessage : 'Create MPR First')}>
                              <span>
                                <IconButton size="small" color="error" disabled={!canEditLines} onClick={() => setLineDeleteTarget(line)}>
                                  <Delete fontSize="small" />
                                </IconButton>
                              </span>
                            </Tooltip>
                          </TableCell>
                        </TableRow>
                      ))
                    ]))
                  ]));
                })()}
                {!visibleLines.length && (
                  <TableRow>
                    <TableCell colSpan={MPR_COLUMNS.length + 2} align="center" sx={{ py: 3, color: 'text.secondary' }}>
                      No MPR rows were generated.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}

      <Dialog
        open={generateProgress.open}
        onClose={closeGenerateProgress}
        disableEscapeKeyDown={generationBusy}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle sx={{ fontWeight: 900, color: '#103B5C' }}>
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
                <Typography sx={{ fontWeight: 800 }}>{generateProgress.message}</Typography>
                {generateProgress.status === 'processing' && generateProgress.currentColor && (
                  <Typography sx={{ mt: 0.35, fontSize: '.85rem', color: 'text.secondary' }}>
                    Current Product Color: {generateProgress.currentColor}
                  </Typography>
                )}
              </Box>
              <Typography sx={{ minWidth: 54, textAlign: 'right', fontSize: '1.05rem', fontWeight: 900, color: '#103B5C' }}>
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
                  <Typography sx={{ fontWeight: 900 }}>
                    {generateProgress.status === 'processing'
                      ? `${Math.min(generateProgress.completedColors, generateProgress.totalColors)} / ${generateProgress.totalColors}`
                      : generateProgress.totalColors}
                  </Typography>
                </Box>
                <Box>
                  <Typography sx={{ fontSize: '.74rem', color: 'text.secondary' }}>ESTIMATED MPR LINES</Typography>
                  <Typography sx={{ fontWeight: 900 }}>
                    {generateProgress.estimatedRows > 0
                      ? `${Math.min(generateProgress.processedRows, generateProgress.estimatedRows)} / ${generateProgress.estimatedRows}`
                      : '-'}
                  </Typography>
                </Box>
                {generateProgress.status === 'success' && (
                  <Box>
                    <Typography sx={{ fontSize: '.74rem', color: 'text.secondary' }}>NEW LINES ADDED</Typography>
                    <Typography sx={{ fontWeight: 900 }}>{generateProgress.addedRows}</Typography>
                  </Box>
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
        <DialogTitle sx={{ fontWeight: 900, color: '#103B5C' }}>
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
                <Typography sx={{ fontWeight: 800 }}>{exportProgress.message}</Typography>
                <Typography sx={{ mt: 0.35, fontSize: '.85rem', color: 'text.secondary' }}>
                  {exportProgress.fileName || 'MPR.xlsx'}
                </Typography>
              </Box>
              <Typography sx={{ minWidth: 54, textAlign: 'right', fontSize: '1.05rem', fontWeight: 900, color: '#103B5C' }}>
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
                  <Typography sx={{ fontWeight: 900 }}>{exportProgress.lineCount}</Typography>
                </Box>
                <Box>
                  <Typography sx={{ fontSize: '.74rem', color: 'text.secondary' }}>DOWNLOAD</Typography>
                  <Typography sx={{ fontWeight: 900 }}>
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
                    <Typography sx={{ fontWeight: 900 }}>{formatFileSize(exportProgress.fileSizeBytes)}</Typography>
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

      <Dialog open={canWrite && deleteOpen} onClose={() => setDeleteOpen(false)}>
        <DialogTitle>Delete MPR?</DialogTitle>
        <DialogContent>Each order has one current MPR. Delete it and return the order to BOM status?</DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteOpen(false)}>Cancel</Button>
          <Button color="error" variant="contained" onClick={remove}>Delete</Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={canWrite && Boolean(batchEditTarget)}
        onClose={batchSaving ? undefined : () => setBatchEditTarget(null)}
        fullWidth
        maxWidth="md"
      >
        <DialogTitle sx={{ pr: 6, fontWeight: 900, color: '#103B5C' }}>
          Update PO Qty And Ship To
          <Typography sx={{ mt: 0.25, fontSize: '.8rem', color: 'text.secondary', fontWeight: 400 }}>
            The values are applied to every Core and selected Packing MPR material line under this Product Color in the batch.
          </Typography>
          <IconButton onClick={() => setBatchEditTarget(null)} disabled={batchSaving} sx={{ position: 'absolute', right: 14, top: 14 }}>×</IconButton>
        </DialogTitle>
        <DialogContent dividers>
          <Stack spacing={1.25}>
            {(batchEditTarget?.colors || []).map((color) => (
              <Paper key={color} elevation={0} sx={{ p: 1.25, border: '1px solid #e5e7eb', borderRadius: 1.5 }}>
                <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.25} alignItems={{ md: 'center' }}>
                  <Typography sx={{ minWidth: 190, fontWeight: 900, color: '#103B5C' }}>{color}</Typography>
                  <TextField
                    label="PO Qty"
                    type="number"
                    required
                    size="small"
                    value={batchEditForm.poQtyByColor?.[color] ?? ''}
                    onChange={(event) => changeBatchPoQty(color, event.target.value)}
                    inputProps={{ min: 0, step: 'any' }}
                    disabled={!canWrite}
                    sx={{ width: { xs: '100%', md: 160 } }}
                  />
                  <Autocomplete
                    multiple
                    size="small"
                    disabled={!canWrite}
                    options={shipTos}
                    value={shipTos.filter((item) => (batchEditForm.shipToIdsByColor?.[color] || []).includes(item.id))}
                    onChange={(_, selected) => changeBatchShipTos(color, selected)}
                    getOptionLabel={(item) => [item.shipToCode, item.shipToName].filter(Boolean).join(' · ')}
                    isOptionEqualToValue={(option, value) => option.id === value.id}
                    renderInput={(params) => <TextField {...params} required label="Ship To" placeholder="Select one or more" />}
                    sx={{ flex: 1, minWidth: { xs: '100%', md: 300 } }}
                  />
                </Stack>
              </Paper>
            ))}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setBatchEditTarget(null)} disabled={batchSaving} sx={{ textTransform: 'none' }}>Cancel</Button>
          <Button variant="contained" onClick={saveBatchEdit} disabled={batchSaving} sx={{ textTransform: 'none', fontWeight: 800, backgroundColor: '#103B5C' }}>
            {batchSaving ? 'Updating...' : 'Apply To All MPR Lines'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={canWrite && Boolean(batchDeleteTarget)}
        onClose={batchDeleting ? undefined : () => setBatchDeleteTarget(null)}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>Delete This MPR Batch?</DialogTitle>
        <DialogContent>
          <Typography>
            Delete all <strong>{batchDeleteTarget?.lineCount || 0}</strong> MPR line(s) created in this batch?
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
        open={canWrite && Boolean(editingLine)}
        line={editingLine}
        productColorMasters={productColorMasters}
        saving={lineSaving}
        onClose={() => setEditingLine(null)}
        onSave={saveMprLine}
      />

      <Dialog open={canWrite && Boolean(lineDeleteTarget)} onClose={lineSaving ? undefined : () => setLineDeleteTarget(null)}>
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
