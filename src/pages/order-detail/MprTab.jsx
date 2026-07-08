import { useCallback, useEffect, useMemo, useState } from 'react';
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
import { Delete, Download, Edit, Preview, Refresh, RestartAlt, Save } from '@mui/icons-material';
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

const emptyBomSelection = () => ({
  selected: false,
  colors: [],
  packingIds: [],
  poQtyByColor: {},
  shipToIdsByColor: {}
});

const initialSelection = (boms = []) => Object.fromEntries(
  boms.map((bom) => [bom.id, emptyBomSelection()])
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

const productColorLabel = (item = {}) => [
  item.colorName,
  item.patternNumber,
  item.season
].filter(Boolean).join(' · ');

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

const latestBomReview = (line = {}) => {
  const reviews = Array.isArray(line.bomReviews) ? line.bomReviews : [];
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

const mprLineSourceKey = (line = {}) => (
  !line.packingId && !line.packingName
    ? MPR_CORE_SOURCE
    : String(line.packingId || line.packingName || '')
);

const mprLineSourceLabel = (line = {}) => (
  mprLineSourceKey(line) === MPR_CORE_SOURCE
    ? 'Core BOM (No Packing)'
    : (line.packingName || `Packing ${line.packingId || ''}`.trim())
);

const mprLineReviewStatus = (line = {}) => latestBomReview(line)?.status || 'NO_REVIEW';

const mprLineMatchesFilters = (line = {}, filters = emptyMprFilters) => {
  const keyword = String(filters.keyword || '').trim();
  const reviewStatus = mprLineReviewStatus(line);

  if (keyword) {
    const searchable = [
      line.styleColorKey,
      line.styleDescription,
      line.styleColor,
      line.shipTo,
      line.salesComment,
      line.sapCode,
      line.bomLineNo,
      line.materialType,
      line.matFullDescription,
      line.matColor,
      line.matUnit,
      line.shortNameSupplier,
      line.vendorCode,
      line.vendorName,
      line.matCharger,
      mprLineSourceLabel(line)
    ];
    if (!searchable.some((value) => includesText(value, keyword))) return false;
  }

  if (filters.productColor && normalizeText(line.styleColor) !== normalizeText(filters.productColor)) return false;
  if (filters.source && mprLineSourceKey(line) !== filters.source) return false;
  if (filters.shipTo && normalizeText(line.shipTo) !== normalizeText(filters.shipTo)) return false;
  if (filters.reviewStatus && reviewStatus !== filters.reviewStatus) return false;

  return true;
};

const salesBomMatchesKeyword = (bom = {}, keyword = '') => {
  const needle = String(keyword || '').trim();
  if (!needle) return true;
  const productColors = productColorsForBom(bom).map((item) => item?.colorName);
  const packings = (bom.packings || []).map((packing) => packing?.packingName);
  return [
    bom.bomNo,
    bom.bomName,
    bom.header?.styleNumber,
    bom.header?.styleName,
    bom.header?.season,
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
  ['vendorCode', 'Vendor Code', 135],
  ['vendorName', 'Vendor Name', 190],
  ['matCharger', 'MAT CHARGER', 140],
  ['exchangeRate', 'Exchange Rate', 140],
  ['matPriceUsd', 'MAT PRICE (USD)', 150],
  ['matAmountUsd', 'MAT AMOUNT in USD', 165],
  ['matDueDate', 'MAT DUE-DATE', 140],
  ['totalMatAmountPerStyle', 'TOTAL MAT AMOUNT per STYLE', 215]
];

export default function MprTab({ order }) {
  const canWrite = canManageSales();
  const writeBlockedMessage = 'Sales permission is required to create or modify MPR data.';
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
        listMasterData('productColor', { page: 0, size: 200 })
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
  }, [order?.id]);

  useEffect(() => {
    load();
  }, [load]);

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
    if (!canWrite) { notify(writeBlockedMessage, 'warning'); return; }
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
    if (!canWrite) { notify(writeBlockedMessage, 'warning'); return; }
    if (!validateSelection()) return;
    try {
      const previousCount = mpr?.lines?.length || 0;
      const result = await generateMpr(order.id, payload);
      const addedCount = Math.max(0, (result?.lines?.length || 0) - previousCount);

      setMpr(result);
      setPreview(null);
      resetSelection();

      notify(
        previousCount
          ? `${addedCount} new MPR line(s) added. Existing MPR lines were kept.`
          : 'MPR generated and saved successfully.'
      );
    } catch (error) {
      notify(getApiError(error, 'Unable to add MPR lines.'), 'error');
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
      .filter((batch) => batch.lineCount > 0);
  }, [mpr]);

  return (
    <Box>
      <Paper elevation={0} sx={{ p: 2, border: '1px solid #e5e7eb', borderRadius: 2, mb: 2 }}>
        <Stack direction={{ xs: 'column', lg: 'row' }} justifyContent="space-between" spacing={2}>
          <Box>
            <Typography sx={{ fontWeight: 900, color: '#103B5C' }}>Sales / MPR</Typography>
            <Typography sx={{ mt: 0.25, fontSize: '.8rem', color: 'text.secondary' }}>
              Select submitted BOM and Product Color. Original BOM rows without a Packing are always included; Packing is optional and adds extra rows only for the applicable Product Color. Duplicate material rows within the same Product Color are kept once, with the original BOM row taking priority.
            </Typography>
          </Box>
          <Stack direction="row" flexWrap="wrap" spacing={1}>
            <Button startIcon={<Refresh />} onClick={load} disabled={loading} sx={{ textTransform: 'none' }}>Refresh</Button>
            {mpr && (
              <>
                <Button startIcon={<Download />} onClick={() => downloadWithAuth(getMprExportUrl(order.id), `${mpr.mprNo || 'MPR'}.xlsx`)} sx={{ textTransform: 'none' }}>
                  Export MPR
                </Button>
                <Tooltip title={!canWrite ? writeBlockedMessage : 'Delete MPR'}><span><Button color="error" startIcon={<Delete />} onClick={() => setDeleteOpen(true)} disabled={!canWrite} sx={{ textTransform: 'none' }}>
                  Delete MPR
                </Button></span></Tooltip>
              </>
            )}
            <Tooltip title={!canWrite ? writeBlockedMessage : 'Preview MPR'}><span><Button variant="outlined" startIcon={<Preview />} onClick={previewMprAction} disabled={loading || !canWrite} sx={{ textTransform: 'none' }}>
              Preview MPR
            </Button></span></Tooltip>
            <Tooltip title={!canWrite ? writeBlockedMessage : (mpr ? 'Add To MPR' : 'Create MPR')}><span><Button variant="contained" startIcon={<Save />} onClick={generate} disabled={loading || !canWrite} sx={{ textTransform: 'none', backgroundColor: '#103B5C' }}>
              {mpr ? 'Add To MPR' : 'Create MPR'}
            </Button></span></Tooltip>
          </Stack>
        </Stack>
      </Paper>

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
                <Typography sx={{ fontSize: '.75rem', color: 'text.secondary' }}>
                  Search submitted BOM number, BOM name, style, product color, or packing before creating MPR.
                </Typography>
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
                      {(bom.coreLines || []).length} core lines · {(bom.packings || []).length} packings
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
                  <Typography sx={{ fontSize: '.75rem', color: 'text.secondary', mb: 0.5 }}>
                    Core BOM rows without a Packing are always included for each selected Product Color. Select Packing only to add its extra rows.
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
              <Typography sx={{ mt: 0.2, fontSize: '.76rem', color: 'text.secondary' }}>
                Each row below is one Create / Add To MPR action. Update applies PO Qty and Ship To to all Core and selected Packing lines for the selected Product Color in that batch; Delete removes that batch only.
              </Typography>
            </Box>
            {!canManageBatches && (
              <Typography sx={{ fontSize: '.76rem', color: 'text.secondary' }}>
                Create the current preview first before deleting a saved batch.
              </Typography>
            )}
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
            <Typography sx={{ mt: 0.35, fontSize: '.76rem', color: 'text.secondary' }}>
              POUCH has been removed. MPR always includes original BOM Core rows for every selected Product Color; selected Packing rows are added after Core rows. Matching material items within the same Product Color are kept once, with Core taking priority. Every Add To MPR action keeps existing rows and appends only genuinely new material rows. BOM rows without a Consumption Unit are skipped when MPR is generated.
              {!canEditLines && ' Create MPR first to edit or delete Preview rows.'}
            </Typography>

            <Box sx={{ mt: 1.25, p: 1.15, border: '1px solid #e5e7eb', borderRadius: 1.5, backgroundColor: '#fbfdff' }}>
              <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" spacing={0.75} sx={{ mb: 0.85 }}>
                <Box>
                  <Typography sx={{ fontWeight: 900, fontSize: '.83rem', color: '#103B5C' }}>Sales / MPR Line Search & Filter</Typography>
                  <Typography sx={{ fontSize: '.73rem', color: 'text.secondary' }}>
                    Search material, SAP code, style color, child color, Ship To, vendor, packing, or BOM-review status.
                  </Typography>
                </Box>
                <Typography sx={{ fontSize: '.76rem', color: 'text.secondary', fontWeight: 700 }}>
                  Showing {visibleLines.length} / {unfilteredVisibleLines.length} line(s)
                </Typography>
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

          <TableContainer sx={{ maxHeight: 540 }}>
            <Table stickyHeader size="small" sx={{ minWidth: 5000 }}>
              <TableHead>
                <TableRow>
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
                    const color = line.styleColor || 'No Product Color';
                    if (!groupByColor.has(color)) {
                      const group = { color, packingGroups: [], packingByKey: new Map(), lineCount: 0 };
                      groupByColor.set(color, group);
                      colorGroups.push(group);
                    }

                    const colorGroup = groupByColor.get(color);
                    const isCoreLine = !line.packingId && !line.packingName;
                    const packingKey = line.packingId || line.packingName || 'CORE_BOM';
                    if (!colorGroup.packingByKey.has(packingKey)) {
                      const packingGroup = {
                        key: packingKey,
                        name: isCoreLine ? 'Core BOM (No Packing)' : (line.packingName || `Packing ${line.packingId}`),
                        lines: []
                      };
                      colorGroup.packingByKey.set(packingKey, packingGroup);
                      colorGroup.packingGroups.push(packingGroup);
                    }

                    colorGroup.packingByKey.get(packingKey).lines.push(line);
                    colorGroup.lineCount += 1;
                  });

                  return colorGroups.flatMap((colorGroup) => ([
                    <TableRow key={`color-group-${colorGroup.color}`}>
                      <TableCell
                        colSpan={MPR_COLUMNS.length + 1}
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
                          colSpan={MPR_COLUMNS.length + 1}
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
                          {MPR_COLUMNS.map(([field, header]) => (
                            <TableCell key={header} sx={{ whiteSpace: 'nowrap', verticalAlign: 'top' }}>
                              {field === 'matFullDescription' || field === 'salesComment'
                                ? (line[field] || '')
                                : formatValue(line[field])}
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
                    <TableCell colSpan={MPR_COLUMNS.length + 1} align="center" sx={{ py: 3, color: 'text.secondary' }}>
                      No MPR rows were generated.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}

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
