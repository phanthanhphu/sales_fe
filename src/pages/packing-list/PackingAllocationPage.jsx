import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
  Pagination,
  Paper,
  Snackbar,
  Stack,
  Tab,
  Tabs,
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
import AddOutlinedIcon from '@mui/icons-material/AddOutlined';
import ArrowBackOutlinedIcon from '@mui/icons-material/ArrowBackOutlined';
import DeleteOutlineOutlinedIcon from '@mui/icons-material/DeleteOutlineOutlined';
import DownloadOutlinedIcon from '@mui/icons-material/DownloadOutlined';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import PlaylistAddCheckOutlinedIcon from '@mui/icons-material/PlaylistAddCheckOutlined';
import QrCodeScannerOutlinedIcon from '@mui/icons-material/QrCodeScannerOutlined';
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined';
import AssignmentTurnedInOutlinedIcon from '@mui/icons-material/AssignmentTurnedInOutlined';
import LinkOffOutlinedIcon from '@mui/icons-material/LinkOffOutlined';
import RestartAltOutlinedIcon from '@mui/icons-material/RestartAltOutlined';
import SearchOutlinedIcon from '@mui/icons-material/SearchOutlined';
import UploadFileOutlinedIcon from '@mui/icons-material/UploadFileOutlined';
import { Link as RouterLink, useNavigate, useParams } from 'react-router-dom';

import { canManageSales } from 'utils/accessControl';
import { getBuyerBySlug } from 'utils/buyerAccess';
import { getApiError } from 'services/orderBomMprService';
import {
  assignFactoryBarcodeToCarton,
  checkFactoryBarcodeForAssignment,
  generateCartonPlanFromWsp,
  listCartonsForItem,
  unassignFactoryBarcodeFromCarton
} from 'services/cartonLoadingService';
import {
  createPackingAllocationLine,
  createPackingListLine,
  deletePackingAllocationLine,
  deletePackingListLine,
  downloadOrderMaster,
  downloadPackingList,
  generatePackingList,
  getPackingOrder,
  importPackingAllocationLines,
  importPackingListLines,
  listPackingAllocationLines,
  listPackingListLines,
  saveBlob,
  updatePackingAllocationLine,
  updatePackingListLine
} from 'services/packingListService';
import PackingAllocationFormDialog from './PackingAllocationFormDialog';
import PackingAllocationImportDialog from './PackingAllocationImportDialog';
import PackingListImportDialog from './PackingListImportDialog';
import PackingListLineFormDialog from './PackingListLineFormDialog';
import { formatPackingValue, PACKING_ALLOCATION_FIELDS, PACKING_LIST_FIELDS } from './packingListConfig';
import SortableTableCell from 'components/SortableTableCell';
import useTableSort from 'utils/useTableSort';

const emptyMasterFilters = {
  keyword: '', poNumber: '', articleNumber: '', styleNumber: '', color: '', sizeValue: '', shipmentMode: '', status: ''
};
const emptyPackingFilters = {
  keyword: '', poNumber: '', articleNumber: '', styleNumber: '', color: '', sizeValue: ''
};

const cartonSortValue = (row, key) => {
  if (key === 'physicalCarton') return row.cartonCode || row.cartonSequence;
  if (key === 'qtyPerCarton') return row.cartonPcs ?? row.qtyPerCarton;
  return row?.[key];
};

const summaryCard = (label, value) => (
  <Paper key={label} elevation={0} sx={{ p: 1.2, border: '1px solid #e2e8f0', borderRadius: 2 }}>
    <Typography sx={{ fontSize: '0.72rem', color: 'text.secondary' }}>{label}</Typography>
    <Typography sx={{ fontSize: '1rem', fontWeight: 750, color: '#103B5C' }}>{Number(value || 0).toLocaleString()}</Typography>
  </Paper>
);

export default function PackingAllocationPage() {
  const { buyerSlug, orderId } = useParams();
  const navigate = useNavigate();
  const buyer = getBuyerBySlug(buyerSlug);
  const canWrite = canManageSales();
  const [order, setOrder] = useState(null);
  const [tab, setTab] = useState(0);
  const [notice, setNotice] = useState({ open: false, severity: 'success', message: '' });

  const [masterFilters, setMasterFilters] = useState(emptyMasterFilters);
  const [masterApplied, setMasterApplied] = useState(emptyMasterFilters);
  const [masterRows, setMasterRows] = useState([]);
  const { sortedRows: sortedMasterRows, sortKey: masterSortKey, sortDirection: masterSortDirection, requestSort: requestMasterSort } = useTableSort(masterRows);
  const [masterPage, setMasterPage] = useState(0);
  const [masterPages, setMasterPages] = useState(1);
  const [masterTotal, setMasterTotal] = useState(0);
  const [masterLoading, setMasterLoading] = useState(false);
  const [masterFormOpen, setMasterFormOpen] = useState(false);
  const [masterFormRecord, setMasterFormRecord] = useState(null);
  const [masterSaving, setMasterSaving] = useState(false);
  const [masterDeleteTarget, setMasterDeleteTarget] = useState(null);
  const [masterImportOpen, setMasterImportOpen] = useState(false);
  const [masterImporting, setMasterImporting] = useState(false);
  const [masterImportResult, setMasterImportResult] = useState(null);

  const [packingFilters, setPackingFilters] = useState(emptyPackingFilters);
  const [packingApplied, setPackingApplied] = useState(emptyPackingFilters);
  const [packingRows, setPackingRows] = useState([]);
  const { sortedRows: sortedPackingRows, sortKey: packingSortKey, sortDirection: packingSortDirection, requestSort: requestPackingSort } = useTableSort(packingRows);
  const [packingPage, setPackingPage] = useState(0);
  const [packingPages, setPackingPages] = useState(1);
  const [packingTotal, setPackingTotal] = useState(0);
  const [packingLoading, setPackingLoading] = useState(false);
  const [packingFormOpen, setPackingFormOpen] = useState(false);
  const [packingFormRecord, setPackingFormRecord] = useState(null);
  const [packingSaving, setPackingSaving] = useState(false);
  const [packingDeleteTarget, setPackingDeleteTarget] = useState(null);
  const [packingImportOpen, setPackingImportOpen] = useState(false);
  const [packingImporting, setPackingImporting] = useState(false);
  const [packingImportResult, setPackingImportResult] = useState(null);
  const [generateOpen, setGenerateOpen] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [cartonGenerateOpen, setCartonGenerateOpen] = useState(false);
  const [cartonGenerating, setCartonGenerating] = useState(false);
  const [cartonItemOpen, setCartonItemOpen] = useState(false);
  const [cartonItemRow, setCartonItemRow] = useState(null);
  const [cartonItemChildren, setCartonItemChildren] = useState([]);
  const { sortedRows: sortedCartonChildren, sortKey: cartonSortKey, sortDirection: cartonSortDirection, requestSort: requestCartonSort } = useTableSort(cartonItemChildren, { getValue: cartonSortValue });
  const [cartonItemLoading, setCartonItemLoading] = useState(false);
  const [cartonAssignTarget, setCartonAssignTarget] = useState(null);
  const [cartonBarcode, setCartonBarcode] = useState('');
  const [cartonCheckedBarcode, setCartonCheckedBarcode] = useState(null);
  const [cartonBarcodeChecking, setCartonBarcodeChecking] = useState(false);
  const [cartonAssigningId, setCartonAssigningId] = useState('');
  const [cartonAssignError, setCartonAssignError] = useState('');
  const [cartonAssignNotice, setCartonAssignNotice] = useState('');
  const cartonBarcodeInputRef = useRef(null);

  const notify = (message, severity = 'success') => setNotice({ open: true, severity, message });

  const loadOrder = useCallback(async () => {
    if (!buyer?.code || !orderId) return;
    try {
      setOrder(await getPackingOrder(buyer.code, orderId));
    } catch (error) {
      notify(getApiError(error, 'Unable to load the Order.'), 'error');
    }
  }, [buyer?.code, orderId]);

  const loadMaster = useCallback(async () => {
    if (!buyer?.code || !orderId) return;
    setMasterLoading(true);
    try {
      const data = await listPackingAllocationLines(buyer.code, orderId, { ...masterApplied, page: masterPage, size: 50 });
      setMasterRows(Array.isArray(data?.content) ? data.content : []);
      setMasterPages(Math.max(1, data?.totalPages || 1));
      setMasterTotal(data?.totalElements || 0);
    } catch (error) {
      notify(getApiError(error, 'Unable to load Order Items.'), 'error');
    } finally {
      setMasterLoading(false);
    }
  }, [buyer?.code, masterApplied, masterPage, orderId]);

  const loadPacking = useCallback(async () => {
    if (!buyer?.code || !orderId) return;
    setPackingLoading(true);
    try {
      const data = await listPackingListLines(buyer.code, orderId, { ...packingApplied, page: packingPage, size: 50 });
      setPackingRows(Array.isArray(data?.content) ? data.content : []);
      setPackingPages(Math.max(1, data?.totalPages || 1));
      setPackingTotal(data?.totalElements || 0);
    } catch (error) {
      notify(getApiError(error, 'Unable to load Packing List rows.'), 'error');
    } finally {
      setPackingLoading(false);
    }
  }, [buyer?.code, orderId, packingApplied, packingPage]);

  useEffect(() => { loadOrder(); }, [loadOrder]);
  useEffect(() => { if (tab === 0) loadMaster(); }, [loadMaster, tab]);
  useEffect(() => { if (tab === 1) loadPacking(); }, [loadPacking, tab]);

  const masterTotals = useMemo(() => masterRows.reduce((summary, row) => ({
    pcs: summary.pcs + Number(row.totalPcs || 0),
    cartons: summary.cartons + Number(row.totalCartons || 0),
    pcsAir: summary.pcsAir + Number(row.pcsAir || 0),
    pcsSea: summary.pcsSea + Number(row.pcsSea || 0)
  }), { pcs: 0, cartons: 0, pcsAir: 0, pcsSea: 0 }), [masterRows]);

  const packingTotals = useMemo(() => packingRows.reduce((summary, row) => ({
    pcs: summary.pcs + Number(row.totalPcs || 0),
    cartons: summary.cartons + Number(row.cartonsQty || 0),
    cbm: summary.cbm + Number(row.cbm || 0),
    grossWeight: summary.grossWeight + Number(row.grossWeightKg || 0),
    netWeight: summary.netWeight + Number(row.netWeightKg || 0)
  }), { pcs: 0, cartons: 0, cbm: 0, grossWeight: 0, netWeight: 0 }), [packingRows]);

  const saveMaster = async (payload) => {
    if (!canWrite || !buyer?.code) return;
    setMasterSaving(true);
    try {
      if (masterFormRecord?.id) await updatePackingAllocationLine(buyer.code, orderId, masterFormRecord.id, payload);
      else await createPackingAllocationLine(buyer.code, orderId, payload);
      setMasterFormOpen(false);
      setMasterFormRecord(null);
      notify('Order Item saved successfully.');
      await Promise.all([loadMaster(), loadOrder()]);
    } catch (error) {
      notify(getApiError(error, 'Unable to save the Order Item.'), 'error');
    } finally {
      setMasterSaving(false);
    }
  };

  const removeMaster = async () => {
    if (!canWrite || !masterDeleteTarget?.id || !buyer?.code) return;
    try {
      await deletePackingAllocationLine(buyer.code, orderId, masterDeleteTarget.id);
      setMasterDeleteTarget(null);
      notify('Order Item deleted.');
      if (masterRows.length === 1 && masterPage > 0) setMasterPage((value) => value - 1);
      else await Promise.all([loadMaster(), loadOrder()]);
    } catch (error) {
      notify(getApiError(error, 'Unable to delete the Order Item.'), 'error');
    }
  };

  const importMaster = async (file, mode) => {
    if (!canWrite || !file || !buyer?.code) return;
    setMasterImporting(true);
    setMasterImportResult(null);
    try {
      const result = await importPackingAllocationLines(buyer.code, orderId, file, mode);
      setMasterImportResult(result);
      const message = `Order Items import: ${result.created || 0} created, ${result.updated || 0} updated, ${result.deleted || 0} deleted. Prepare or regenerate the Packing List before generating Carton Master data.`;
      notify(message, 'success');
      setMasterPage(0);
      await Promise.all([loadMaster(), loadOrder()]);
    } catch (error) {
      const result = error?.response?.data;
      setMasterImportResult(result && typeof result === 'object' ? result : { applied: false, errors: [{ message: getApiError(error) }] });
      notify(getApiError(error, 'Order Items import failed.'), 'error');
    } finally {
      setMasterImporting(false);
    }
  };

  const exportMaster = async () => {
    try {
      const response = await downloadOrderMaster(buyer.code, orderId);
      saveBlob(response, `${order?.orderName || 'ORDER'}_ORDER_ITEMS.xlsx`);
    } catch (error) {
      notify(getApiError(error, 'Unable to download the Order Items.'), 'error');
    }
  };

  const savePacking = async (payload) => {
    if (!canWrite || !buyer?.code) return;
    setPackingSaving(true);
    try {
      if (packingFormRecord?.id) await updatePackingListLine(buyer.code, orderId, packingFormRecord.id, payload);
      else await createPackingListLine(buyer.code, orderId, payload);
      setPackingFormOpen(false);
      setPackingFormRecord(null);
      notify('Packing List row saved successfully.');
      await Promise.all([loadPacking(), loadOrder()]);
    } catch (error) {
      notify(getApiError(error, 'Unable to save the Packing List row.'), 'error');
    } finally {
      setPackingSaving(false);
    }
  };

  const removePacking = async () => {
    if (!canWrite || !packingDeleteTarget?.id || !buyer?.code) return;
    try {
      await deletePackingListLine(buyer.code, orderId, packingDeleteTarget.id);
      setPackingDeleteTarget(null);
      notify('Packing List row deleted.');
      if (packingRows.length === 1 && packingPage > 0) setPackingPage((value) => value - 1);
      else await Promise.all([loadPacking(), loadOrder()]);
    } catch (error) {
      notify(getApiError(error, 'Unable to delete the Packing List row.'), 'error');
    }
  };

  const importPacking = async (file, mode) => {
    if (!canWrite || !file || !buyer?.code) return;
    setPackingImporting(true);
    setPackingImportResult(null);
    try {
      const result = await importPackingListLines(buyer.code, orderId, file, mode);
      setPackingImportResult(result);
      notify(`Packing List import completed: ${result.created || 0} created and ${result.updated || 0} updated.`);
      setPackingPage(0);
      await Promise.all([loadPacking(), loadOrder()]);
    } catch (error) {
      const result = error?.response?.data;
      setPackingImportResult(result && typeof result === 'object' ? result : { applied: false, errors: [{ message: getApiError(error) }] });
      notify(getApiError(error, 'Packing List import failed.'), 'error');
    } finally {
      setPackingImporting(false);
    }
  };

  const exportPacking = async () => {
    try {
      const response = await downloadPackingList(buyer.code, orderId);
      saveBlob(response, `${order?.orderName || 'ORDER'}_PACKING_LIST.xlsx`);
    } catch (error) {
      notify(getApiError(error, 'Unable to download the Packing List.'), 'error');
    }
  };

  const loadCartonChildren = useCallback(async (row = cartonItemRow) => {
    if (!buyer?.code || !orderId || !row?.id) return;
    setCartonItemLoading(true);
    try {
      const rows = await listCartonsForItem(buyer.code, orderId, row.id);
      setCartonItemChildren(Array.isArray(rows) ? rows : []);
    } catch (error) {
      setCartonItemChildren([]);
      notify(getApiError(error, 'Unable to load physical cartons for this Master row.'), 'error');
    } finally {
      setCartonItemLoading(false);
    }
  }, [buyer?.code, orderId, cartonItemRow]);

  const openCartonItem = async (row) => {
    if (!buyer?.code || !row?.id) return;
    setCartonItemRow(row);
    setCartonItemChildren([]);
    setCartonAssignTarget(null);
    setCartonBarcode('');
    setCartonCheckedBarcode(null);
    setCartonAssignError('');
    setCartonAssignNotice('');
    setCartonItemOpen(true);
    setCartonItemLoading(true);
    try {
      const rows = await listCartonsForItem(buyer.code, orderId, row.id);
      setCartonItemChildren(Array.isArray(rows) ? rows : []);
    } catch (error) {
      setCartonItemChildren([]);
      notify(getApiError(error, 'Unable to load physical cartons for this Master row.'), 'error');
    } finally {
      setCartonItemLoading(false);
    }
  };

  const closeCartonAssignment = () => {
    if (cartonBarcodeChecking || cartonAssigningId) return;
    setCartonAssignTarget(null);
    setCartonBarcode('');
    setCartonCheckedBarcode(null);
    setCartonAssignError('');
    setCartonAssignNotice('');
  };

  const startCartonAssignment = (carton) => {
    if (!carton?.id || carton.factoryBarcode || carton.status !== 'PLANNED') return;
    setCartonAssignTarget(carton);
    setCartonBarcode('');
    setCartonCheckedBarcode(null);
    setCartonAssignError('');
    setCartonAssignNotice('');
    window.setTimeout(() => cartonBarcodeInputRef.current?.focus(), 80);
  };

  const checkCartonBarcode = async () => {
    const code = cartonBarcode.trim();
    if (!buyer?.code || !cartonAssignTarget?.id || !code || cartonBarcodeChecking) return;
    setCartonBarcodeChecking(true);
    setCartonAssignError('');
    setCartonAssignNotice('');
    setCartonCheckedBarcode(null);
    try {
      const result = await checkFactoryBarcodeForAssignment(buyer.code, orderId, code);
      setCartonCheckedBarcode(result);
      setCartonBarcode(result?.barcode || code);
      setCartonAssignNotice(`Factory Barcode ${result?.barcode || code} is available for this physical carton.`);
    } catch (error) {
      setCartonAssignError(getApiError(error, 'Factory Barcode cannot be used for assignment.'));
      window.setTimeout(() => cartonBarcodeInputRef.current?.focus(), 80);
    } finally {
      setCartonBarcodeChecking(false);
    }
  };

  const assignBarcodeToSelectedCarton = async () => {
    if (!buyer?.code || !cartonAssignTarget?.id || !cartonCheckedBarcode?.barcode || cartonAssigningId) return;
    setCartonAssigningId(cartonAssignTarget.id);
    setCartonAssignError('');
    try {
      const assigned = await assignFactoryBarcodeToCarton(buyer.code, orderId, {
        factoryBarcode: cartonCheckedBarcode.barcode,
        cartonId: cartonAssignTarget.id
      });
      const assignedCode = cartonCheckedBarcode.barcode;
      setCartonAssignTarget(null);
      setCartonBarcode('');
      setCartonCheckedBarcode(null);
      setCartonAssignError('');
      setCartonAssignNotice('');
      await loadCartonChildren(cartonItemRow);
      notify(`Assigned ${assignedCode} to ${assigned?.cartonCode || `Carton #${assigned?.cartonSequence || cartonAssignTarget.cartonSequence}`}.`);
    } catch (error) {
      setCartonAssignError(getApiError(error, 'Unable to assign Factory Barcode to this physical carton.'));
    } finally {
      setCartonAssigningId('');
    }
  };

  const unassignCartonBarcode = async (carton) => {
    if (!buyer?.code || !carton?.id || !carton.factoryBarcode || carton.status !== 'PLANNED' || cartonAssigningId) return;
    if (!window.confirm(`Unassign Factory Barcode ${carton.factoryBarcode} from Carton #${carton.cartonSequence || '—'}?`)) return;
    setCartonAssigningId(carton.id);
    try {
      await unassignFactoryBarcodeFromCarton(buyer.code, orderId, carton.id);
      await loadCartonChildren(cartonItemRow);
      notify(`Factory Barcode ${carton.factoryBarcode} was unassigned.`);
    } catch (error) {
      notify(getApiError(error, 'Unable to unassign Factory Barcode.'), 'error');
    } finally {
      setCartonAssigningId('');
    }
  };

  const runGenerateCartons = async () => {
    if (!canWrite || !buyer?.code) return;
    setCartonGenerating(true);
    try {
      const result = await generateCartonPlanFromWsp(buyer.code, orderId, true);
      if (!result?.applied) {
        notify(result?.message || 'Unable to generate Carton Master from the Packing List.', 'warning');
        return;
      }
      setCartonGenerateOpen(false);
      await Promise.all([loadMaster(), loadOrder()]);
      notify(`${result.message} Generated ${Number(result.createdCartons || 0).toLocaleString('en-US')} physical cartons. Use View Physical Cartons on a Master row to scan and assign barcodes.`);
    } catch (error) {
      notify(getApiError(error, 'Unable to generate Carton Master from the Packing List.'), 'error');
    } finally {
      setCartonGenerating(false);
    }
  };

  const runGenerate = async () => {
    if (!canWrite || !buyer?.code) return;
    setGenerating(true);
    try {
      const result = await generatePackingList(buyer.code, orderId, true);
      if (!result?.applied) {
        notify(result?.message || 'The Packing List could not be generated.', 'warning');
      } else {
        notify(`${result.message || 'Packing List generated.'} Created: ${result.created || 0}; skipped: ${result.skipped || 0}.`);
        setGenerateOpen(false);
        setPackingPage(0);
        setTab(1);
        await Promise.all([loadPacking(), loadOrder()]);
      }
    } catch (error) {
      notify(getApiError(error, 'Unable to generate the Packing List.'), 'error');
    } finally {
      setGenerating(false);
    }
  };

  if (!buyer?.code) {
    return <Box sx={{ p: 2 }}><Alert severity="error">Buyer not found or access is not allowed.</Alert></Box>;
  }

  return (
    <Box sx={{ p: { xs: 0.25, sm: 0.4, md: 0.5 } }}>

      <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" spacing={1.2} sx={{ mb: 1.4 }}>
        <Box>
          <Stack direction="row" spacing={1} alignItems="center">
            <Button component={RouterLink} to={`/buyers/${buyer.slug}/orders`} size="small" startIcon={<ArrowBackOutlinedIcon />} sx={{ textTransform: 'none' }}>Back to Orders</Button>
            <Chip label={buyer.label} color="primary" size="small" />
          </Stack>
          <Typography sx={{ mt: 0.7, fontSize: '1rem', fontWeight: 750, color: '#103B5C' }}>
            {order?.orderName || '—'}
          </Typography>
        </Box>
        <Stack direction="row" spacing={0.8} flexWrap="wrap" useFlexGap alignItems="flex-start">
          <Button
            variant="contained"
            startIcon={<QrCodeScannerOutlinedIcon />}
            onClick={() => navigate(`/buyers/${buyer.slug}/orders/${orderId}/scan`)}
            sx={{ textTransform: 'none', bgcolor: '#103B5C' }}
          >
            Check Weight
          </Button>
          {order?.supplierName && <Chip size="small" label={`Supplier: ${order.supplierName}`} variant="outlined" />}
          {order?.supplierNumber && <Chip size="small" label={`e.s. Supplier #: ${order.supplierNumber}`} variant="outlined" />}
          {order?.productionFacility && <Chip size="small" label={`Facility: ${order.productionFacility}`} variant="outlined" />}
          {order?.orderDate && <Chip size="small" label={`Date: ${order.orderDate}`} color="primary" />}
          {order?.createdBy && <Chip size="small" label={`Created by: ${order.createdBy}`} variant="outlined" />}
        </Stack>
      </Stack>

      <Paper elevation={0} sx={{ mb: 1.4, border: '1px solid #e2e8f0', borderRadius: 2, overflow: 'hidden' }}>
        <Tabs value={tab} onChange={(_, value) => setTab(value)} variant="scrollable" scrollButtons="auto">
          <Tab label={`Order Items (${Number(order?.masterLineCount || 0).toLocaleString('en-US')})`} />
          <Tab label={`Packing List (${Number(order?.packingLineCount || 0).toLocaleString()})`} />
        </Tabs>
      </Paper>

      {tab === 0 ? (
        <>
          <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" spacing={1} sx={{ mb: 1.2 }}>
            <Box>
              <Typography sx={{ fontWeight: 750, color: '#103B5C', fontSize: '1.06rem' }}>{`Order Items – ${buyer.label}`}</Typography>
              <Typography sx={{ fontSize: '0.78rem', color: 'text.secondary' }}>Upload the ALLOCATION sheet. The downloadable edit file includes ACTION values CREATE, UPDATE, DELETE and a KEY column for batch editing.</Typography>
            </Box>
            <Stack direction="row" spacing={0.8} flexWrap="wrap" useFlexGap>
              <Button variant="outlined" startIcon={<DownloadOutlinedIcon />} onClick={exportMaster} sx={{ textTransform: 'none' }}>Download Edit File</Button>
              <Tooltip title={canWrite ? '' : 'SALES permission is required'}><span>
                <Button disabled={!canWrite} variant="outlined" startIcon={<UploadFileOutlinedIcon />} onClick={() => { setMasterImportResult(null); setMasterImportOpen(true); }} sx={{ textTransform: 'none' }}>Upload Excel</Button>
              </span></Tooltip>
              <Tooltip title={canWrite ? '' : 'SALES permission is required'}><span>
                <Button disabled={!canWrite} variant="contained" startIcon={<AddOutlinedIcon />} onClick={() => { setMasterFormRecord(null); setMasterFormOpen(true); }} sx={{ textTransform: 'none' }}>Add Row</Button>
              </span></Tooltip>
              <Tooltip title={canWrite ? '' : 'SALES permission is required'}><span>
                <Button disabled={!canWrite} color="secondary" variant="contained" startIcon={<PlaylistAddCheckOutlinedIcon />} onClick={() => setGenerateOpen(true)} sx={{ textTransform: 'none' }}>Generate Packing List</Button>
              </span></Tooltip>
              <Tooltip title={canWrite ? 'Generate one Carton Master row for each physical carton in the Packing List' : 'SALES permission is required'}><span>
                <Button disabled={!canWrite} color="success" variant="contained" startIcon={<Inventory2OutlinedIcon />} onClick={() => setCartonGenerateOpen(true)} sx={{ textTransform: 'none' }}>Generate Carton Master</Button>
              </span></Tooltip>
            </Stack>
          </Stack>

          <Paper elevation={0} sx={{ p: 1, mb: 0.7, border: '1px solid #DCE4EC', borderRadius: 1.5 }}>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))', lg: 'repeat(4, minmax(0, 1fr))' }, gap: 1 }}>
              <TextField size="small" label="General keyword" value={masterFilters.keyword} onChange={(event) => setMasterFilters((current) => ({ ...current, keyword: event.target.value }))} />
              <TextField size="small" label="e.s. PO #" value={masterFilters.poNumber} onChange={(event) => setMasterFilters((current) => ({ ...current, poNumber: event.target.value }))} />
              <TextField size="small" label="e.s. Article #" value={masterFilters.articleNumber} onChange={(event) => setMasterFilters((current) => ({ ...current, articleNumber: event.target.value }))} />
              <TextField size="small" label="STYLE# or STYLE" value={masterFilters.styleNumber} onChange={(event) => setMasterFilters((current) => ({ ...current, styleNumber: event.target.value }))} />
              <TextField size="small" label="Color" value={masterFilters.color} onChange={(event) => setMasterFilters((current) => ({ ...current, color: event.target.value }))} />
              <TextField size="small" label="Size" value={masterFilters.sizeValue} onChange={(event) => setMasterFilters((current) => ({ ...current, sizeValue: event.target.value }))} />
              <TextField size="small" label="Mode of shipment" value={masterFilters.shipmentMode} onChange={(event) => setMasterFilters((current) => ({ ...current, shipmentMode: event.target.value }))} />
              <TextField size="small" label="STATUS" value={masterFilters.status} onChange={(event) => setMasterFilters((current) => ({ ...current, status: event.target.value }))} />
            </Box>
            <Stack direction="row" spacing={1} sx={{ mt: 1.2 }}>
              <Button variant="contained" startIcon={<SearchOutlinedIcon />} onClick={() => { setMasterApplied(masterFilters); setMasterPage(0); }} sx={{ textTransform: 'none' }}>Search</Button>
              <Button variant="outlined" startIcon={<RestartAltOutlinedIcon />} onClick={() => { setMasterFilters(emptyMasterFilters); setMasterApplied(emptyMasterFilters); setMasterPage(0); }} sx={{ textTransform: 'none' }}>Reset</Button>
            </Stack>
          </Paper>

          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(5, 1fr)' }, gap: 1, mb: 1.3 }}>
            {[
              ['Total rows', masterTotal], ['PCS on page', masterTotals.pcs], ['CTNS on page', masterTotals.cartons],
              ['AIR PCS on page', masterTotals.pcsAir], ['SEA PCS on page', masterTotals.pcsSea]
            ].map(([label, value]) => summaryCard(label, value))}
          </Box>

          <Paper elevation={0} sx={{ border: '1px solid #e2e8f0', borderRadius: 2, overflow: 'hidden' }}>
            <TableContainer sx={{ maxHeight: 'calc(100vh - 470px)', minHeight: 300 }}>
              <Table stickyHeader size="small" sx={{ minWidth: 3600 }}>
                <TableHead><TableRow>
                  <SortableTableCell label="No." sortable={false} sx={{ position: 'sticky', left: 0, zIndex: 5, bgcolor: '#eaf1f6', fontWeight: 750, minWidth: 70 }} />
                  {PACKING_ALLOCATION_FIELDS.map((field) => <SortableTableCell key={field.name} label={field.label} columnKey={field.name} sortKey={masterSortKey} sortDirection={masterSortDirection} onSort={requestMasterSort} sx={{ bgcolor: '#eaf1f6', fontWeight: 750, minWidth: field.width, whiteSpace: 'nowrap' }} />)}
                  <SortableTableCell label="Actions" sortable={false} align="center" sx={{ position: 'sticky', right: 0, zIndex: 5, bgcolor: '#eaf1f6', fontWeight: 750, minWidth: 100 }} />
                </TableRow></TableHead>
                <TableBody>
                  {masterLoading && <TableRow><TableCell colSpan={PACKING_ALLOCATION_FIELDS.length + 2} align="center" sx={{ py: 4 }}>Loading Order Items...</TableCell></TableRow>}
                  {!masterLoading && masterRows.length === 0 && <TableRow><TableCell colSpan={PACKING_ALLOCATION_FIELDS.length + 2} align="center" sx={{ py: 4, color: 'text.secondary' }}>No matching Order Items.</TableCell></TableRow>}
                  {!masterLoading && sortedMasterRows.map((row, index) => <TableRow
                    key={row.id}
                    hover
                  >
                    <TableCell sx={{ position: 'sticky', left: 0, zIndex: 2, bgcolor: 'background.paper', fontWeight: 700 }}>{masterPage * 50 + index + 1}</TableCell>
                    {PACKING_ALLOCATION_FIELDS.map((field) => <TableCell key={field.name} sx={{ minWidth: field.width, maxWidth: field.name === 'style' ? 340 : field.width + 80, whiteSpace: ['style', 'remarks'].includes(field.name) ? 'normal' : 'nowrap' }}>{formatPackingValue(row[field.name], field.type)}</TableCell>)}
                    <TableCell align="center" sx={{ position: 'sticky', right: 0, zIndex: 2, bgcolor: 'background.paper', whiteSpace: 'nowrap' }}>
                      <Tooltip title={`View physical cartons for this Master row`}><span><IconButton color="primary" onClick={(event) => { event.stopPropagation(); openCartonItem(row); }}><Inventory2OutlinedIcon fontSize="small" /></IconButton></span></Tooltip>
                      <Tooltip title={canWrite ? 'Edit row' : 'SALES permission is required'}><span><IconButton disabled={!canWrite} onClick={(event) => { event.stopPropagation(); setMasterFormRecord(row); setMasterFormOpen(true); }}><EditOutlinedIcon fontSize="small" /></IconButton></span></Tooltip>
                      <Tooltip title={canWrite ? 'Delete row' : 'SALES permission is required'}><span><IconButton disabled={!canWrite} color="error" onClick={(event) => { event.stopPropagation(); setMasterDeleteTarget(row); }}><DeleteOutlineOutlinedIcon fontSize="small" /></IconButton></span></Tooltip>
                    </TableCell>
                  </TableRow>)}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mt: 1.3 }}>
            <Typography sx={{ fontSize: '0.82rem', color: 'text.secondary' }}>Total: {masterTotal} rows</Typography>
            <Pagination page={masterPage + 1} count={masterPages} onChange={(_, value) => setMasterPage(value - 1)} />
          </Stack>
        </>
      ) : (
        <>
          <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" spacing={1} sx={{ mb: 1.2 }}>
            <Box>
              <Typography sx={{ fontWeight: 750, color: '#103B5C', fontSize: '1.06rem' }}>Packing List</Typography>
            </Box>
            <Stack direction="row" spacing={0.8} flexWrap="wrap" useFlexGap>
              <Button variant="outlined" startIcon={<DownloadOutlinedIcon />} onClick={exportPacking} sx={{ textTransform: 'none' }}>Download</Button>
              <Tooltip title={canWrite ? '' : 'SALES permission is required'}><span>
                <Button disabled={!canWrite} variant="outlined" startIcon={<UploadFileOutlinedIcon />} onClick={() => { setPackingImportResult(null); setPackingImportOpen(true); }} sx={{ textTransform: 'none' }}>Upload PKL</Button>
              </span></Tooltip>
              <Tooltip title={canWrite ? '' : 'SALES permission is required'}><span>
                <Button disabled={!canWrite} variant="contained" startIcon={<AddOutlinedIcon />} onClick={() => { setPackingFormRecord(null); setPackingFormOpen(true); }} sx={{ textTransform: 'none' }}>Add Row</Button>
              </span></Tooltip>
              <Tooltip title={canWrite ? '' : 'SALES permission is required'}><span>
                <Button disabled={!canWrite} color="secondary" variant="contained" startIcon={<PlaylistAddCheckOutlinedIcon />} onClick={() => setGenerateOpen(true)} sx={{ textTransform: 'none' }}>Regenerate from Master</Button>
              </span></Tooltip>
            </Stack>
          </Stack>

          <Paper elevation={0} sx={{ p: 1, mb: 0.7, border: '1px solid #DCE4EC', borderRadius: 1.5 }}>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))', lg: 'repeat(3, minmax(0, 1fr))' }, gap: 1 }}>
              <TextField size="small" label="General keyword" value={packingFilters.keyword} onChange={(event) => setPackingFilters((current) => ({ ...current, keyword: event.target.value }))} />
              <TextField size="small" label="P.O. #" value={packingFilters.poNumber} onChange={(event) => setPackingFilters((current) => ({ ...current, poNumber: event.target.value }))} />
              <TextField size="small" label="Art.no." value={packingFilters.articleNumber} onChange={(event) => setPackingFilters((current) => ({ ...current, articleNumber: event.target.value }))} />
              <TextField size="small" label="Style # or Style" value={packingFilters.styleNumber} onChange={(event) => setPackingFilters((current) => ({ ...current, styleNumber: event.target.value }))} />
              <TextField size="small" label="Color" value={packingFilters.color} onChange={(event) => setPackingFilters((current) => ({ ...current, color: event.target.value }))} />
              <TextField size="small" label="Size" value={packingFilters.sizeValue} onChange={(event) => setPackingFilters((current) => ({ ...current, sizeValue: event.target.value }))} />
            </Box>
            <Stack direction="row" spacing={1} sx={{ mt: 1.2 }}>
              <Button variant="contained" startIcon={<SearchOutlinedIcon />} onClick={() => { setPackingApplied(packingFilters); setPackingPage(0); }} sx={{ textTransform: 'none' }}>Search</Button>
              <Button variant="outlined" startIcon={<RestartAltOutlinedIcon />} onClick={() => { setPackingFilters(emptyPackingFilters); setPackingApplied(emptyPackingFilters); setPackingPage(0); }} sx={{ textTransform: 'none' }}>Reset</Button>
            </Stack>
          </Paper>

          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(5, 1fr)' }, gap: 1, mb: 1.3 }}>
            {[
              ['Total rows', packingTotal], ['PCS on page', packingTotals.pcs], ['CTNS on page', packingTotals.cartons],
              ['CBM on page', packingTotals.cbm], ['Gross weight on page', packingTotals.grossWeight]
            ].map(([label, value]) => summaryCard(label, value))}
          </Box>

          <Paper elevation={0} sx={{ border: '1px solid #e2e8f0', borderRadius: 2, overflow: 'hidden' }}>
            <TableContainer sx={{ maxHeight: 'calc(100vh - 470px)', minHeight: 300 }}>
              <Table stickyHeader size="small" sx={{ minWidth: 2350 }}>
                <TableHead><TableRow>
                  <SortableTableCell label="No." sortable={false} sx={{ position: 'sticky', left: 0, zIndex: 5, bgcolor: '#eaf1f6', fontWeight: 750, minWidth: 70 }} />
                  {PACKING_LIST_FIELDS.map((field) => <SortableTableCell key={field.name} label={field.label} columnKey={field.name} sortKey={packingSortKey} sortDirection={packingSortDirection} onSort={requestPackingSort} sx={{ bgcolor: '#eaf1f6', fontWeight: 750, minWidth: field.width, whiteSpace: 'nowrap' }} />)}
                  <SortableTableCell label="Actions" sortable={false} align="center" sx={{ position: 'sticky', right: 0, zIndex: 5, bgcolor: '#eaf1f6', fontWeight: 750, minWidth: 100 }} />
                </TableRow></TableHead>
                <TableBody>
                  {packingLoading && <TableRow><TableCell colSpan={PACKING_LIST_FIELDS.length + 2} align="center" sx={{ py: 4 }}>Loading Packing List...</TableCell></TableRow>}
                  {!packingLoading && packingRows.length === 0 && <TableRow><TableCell colSpan={PACKING_LIST_FIELDS.length + 2} align="center" sx={{ py: 4, color: 'text.secondary' }}>No matching Packing List rows.</TableCell></TableRow>}
                  {!packingLoading && sortedPackingRows.map((row, index) => <TableRow key={row.id} hover>
                    <TableCell sx={{ position: 'sticky', left: 0, zIndex: 2, bgcolor: 'background.paper', fontWeight: 700 }}>{packingPage * 50 + index + 1}</TableCell>
                    {PACKING_LIST_FIELDS.map((field) => <TableCell key={field.name} sx={{ minWidth: field.width, maxWidth: field.name === 'style' ? 340 : field.width + 80, whiteSpace: ['style', 'remarks'].includes(field.name) ? 'normal' : 'nowrap' }}>{formatPackingValue(row[field.name], field.type)}</TableCell>)}
                    <TableCell align="center" sx={{ position: 'sticky', right: 0, zIndex: 2, bgcolor: 'background.paper', whiteSpace: 'nowrap' }}>
                      <Tooltip title={canWrite ? 'Edit row' : 'SALES permission is required'}><span><IconButton disabled={!canWrite} onClick={() => { setPackingFormRecord(row); setPackingFormOpen(true); }}><EditOutlinedIcon fontSize="small" /></IconButton></span></Tooltip>
                      <Tooltip title={canWrite ? 'Delete row' : 'SALES permission is required'}><span><IconButton disabled={!canWrite} color="error" onClick={() => setPackingDeleteTarget(row)}><DeleteOutlineOutlinedIcon fontSize="small" /></IconButton></span></Tooltip>
                    </TableCell>
                  </TableRow>)}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mt: 1.3 }}>
            <Typography sx={{ fontSize: '0.82rem', color: 'text.secondary' }}>Total: {packingTotal} rows</Typography>
            <Pagination page={packingPage + 1} count={packingPages} onChange={(_, value) => setPackingPage(value - 1)} />
          </Stack>
        </>
      )}

      <PackingAllocationFormDialog open={masterFormOpen} record={masterFormRecord} saving={masterSaving} onClose={() => { setMasterFormOpen(false); setMasterFormRecord(null); }} onSave={saveMaster} />
      <PackingAllocationImportDialog open={masterImportOpen} importing={masterImporting} result={masterImportResult} onClose={() => setMasterImportOpen(false)} onImport={importMaster} />
      <PackingListLineFormDialog open={packingFormOpen} record={packingFormRecord} saving={packingSaving} onClose={() => { setPackingFormOpen(false); setPackingFormRecord(null); }} onSave={savePacking} />
      <PackingListImportDialog open={packingImportOpen} importing={packingImporting} result={packingImportResult} onClose={() => setPackingImportOpen(false)} onImport={importPacking} />

      <Dialog
        open={cartonItemOpen}
        onClose={() => !cartonAssigningId && setCartonItemOpen(false)}
        fullWidth
        maxWidth="lg"
      >
        <DialogTitle sx={{ fontWeight: 750, pb: 1 }}>
          Physical Cartons · Article {cartonItemRow?.articleNumber || '—'}
        </DialogTitle>
        <DialogContent dividers sx={{ p: 1.5 }}>
          <Stack spacing={1.25}>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={0.8} flexWrap="wrap" useFlexGap>
              <Chip size="small" label={`PO: ${cartonItemRow?.poNumber || '—'}`} />
              <Chip size="small" label={`Size: ${cartonItemRow?.size || '—'}`} />
              <Chip size="small" label={`Color: ${cartonItemRow?.color || '—'}`} />
              <Chip size="small" label={`Qty/CTN: ${cartonItemRow?.qtyPerCarton ?? '—'}`} />
              <Chip
                size="small"
                color="primary"
                variant="outlined"
                label={`${cartonItemChildren.length.toLocaleString('en-US')} physical cartons`}
              />
            </Stack>

            <Alert severity="info" sx={{ py: 0.35 }}>
              Assign Barcode is available only on the physical carton rows below. Select the correct carton, scan its printed Factory Barcode, verify it, then assign one-to-one.
            </Alert>

            {cartonItemLoading ? (
              <Box textAlign="center" py={5}><CircularProgress /></Box>
            ) : cartonItemChildren.length ? (
              <Paper elevation={0} sx={{ border: '1px solid #DCE4EC', borderRadius: 1.5, overflow: 'hidden' }}>
                <TableContainer sx={{ maxHeight: 480 }}>
                  <Table stickyHeader size="small" sx={{ minWidth: 980 }}>
                    <TableHead>
                      <TableRow>
                        {[
                          { label: 'No.', sortable: false },
                          { label: 'Physical Carton', key: 'physicalCarton' },
                          { label: 'CTN No.', key: 'cartonNumber' },
                          { label: 'Qty/CTN', key: 'qtyPerCarton' },
                          { label: 'Status', key: 'status' },
                          { label: 'Factory Barcode', key: 'factoryBarcode' },
                          { label: 'Weight', key: 'weightKg' },
                          { label: 'Action', sortable: false }
                        ].map((column) => (
                          <SortableTableCell key={column.label} label={column.label} columnKey={column.key} sortable={column.sortable !== false} sortKey={cartonSortKey} sortDirection={cartonSortDirection} onSort={requestCartonSort} sx={{ bgcolor: '#EAF1F6', fontWeight: 750, whiteSpace: 'nowrap' }} />
                        ))}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {sortedCartonChildren.map((carton, index) => {
                        const completed = ['COMPLETED', 'WEIGHT_WARNING'].includes(carton.status);
                        const canAssign = canWrite && !carton.factoryBarcode && carton.status === 'PLANNED';
                        const canUnassign = canWrite && Boolean(carton.factoryBarcode) && carton.status === 'PLANNED';
                        return (
                          <TableRow key={carton.id} hover>
                            <TableCell sx={{ fontWeight: 700 }}>{index + 1}</TableCell>
                            <TableCell sx={{ whiteSpace: 'nowrap' }}>
                              <Typography sx={{ fontSize: '0.8rem', fontWeight: 750, color: '#103B5C' }}>
                                {carton.cartonCode || `Carton #${carton.cartonSequence || '—'}`}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {carton.cartonSequence || '—'} / {carton.plannedCartons || cartonItemChildren.length}
                              </Typography>
                            </TableCell>
                            <TableCell sx={{ fontWeight: 700 }}>{carton.cartonNumber ?? '—'}</TableCell>
                            <TableCell sx={{ fontWeight: 700 }}>{carton.cartonPcs ?? carton.qtyPerCarton ?? cartonItemRow?.qtyPerCarton ?? '—'}</TableCell>
                            <TableCell>
                              <Chip
                                size="small"
                                label={carton.status || 'PLANNED'}
                                color={completed ? 'success' : carton.status === 'WAITING_WEIGHT' ? 'warning' : 'default'}
                                variant={completed ? 'filled' : 'outlined'}
                              />
                            </TableCell>
                            <TableCell sx={{ fontWeight: carton.factoryBarcode ? 750 : 500, whiteSpace: 'nowrap' }}>
                              {carton.factoryBarcode || 'Unassigned'}
                            </TableCell>
                            <TableCell sx={{ whiteSpace: 'nowrap' }}>
                              {carton.weightKg != null
                                ? `${Number(carton.weightKg).toLocaleString('en-US', { maximumFractionDigits: 3 })} kg`
                                : '—'}
                            </TableCell>
                            <TableCell sx={{ whiteSpace: 'nowrap' }}>
                              {canAssign ? (
                                <Button
                                  size="small"
                                  variant="contained"
                                  startIcon={<AssignmentTurnedInOutlinedIcon />}
                                  onClick={() => startCartonAssignment(carton)}
                                  disabled={Boolean(cartonAssigningId)}
                                  sx={{ textTransform: 'none', fontWeight: 700 }}
                                >
                                  Assign Barcode
                                </Button>
                              ) : canUnassign ? (
                                <Button
                                  size="small"
                                  color="error"
                                  variant="outlined"
                                  startIcon={cartonAssigningId === carton.id ? <CircularProgress size={14} color="inherit" /> : <LinkOffOutlinedIcon />}
                                  onClick={() => unassignCartonBarcode(carton)}
                                  disabled={Boolean(cartonAssigningId)}
                                  sx={{ textTransform: 'none' }}
                                >
                                  Unassign
                                </Button>
                              ) : (
                                <Typography variant="caption" color="text.secondary">
                                  {carton.factoryBarcode ? 'Locked after process starts' : 'Not assignable'}
                                </Typography>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Paper>
            ) : (
              <Alert severity="warning">
                No physical cartons are available for this Master row. Generate Carton Master from the Packing List first.
              </Alert>
            )}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 1.5, py: 1 }}>
          <Button onClick={() => setCartonItemOpen(false)} disabled={Boolean(cartonAssigningId)} sx={{ textTransform: 'none' }}>Close</Button>
          <Button
            variant="outlined"
            startIcon={<QrCodeScannerOutlinedIcon />}
            onClick={() => cartonItemRow?.id && navigate(`/buyers/${buyer.slug}/orders/${orderId}/items/${cartonItemRow.id}`)}
            sx={{ textTransform: 'none' }}
          >
            Open Item Page
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={Boolean(cartonAssignTarget)} onClose={closeCartonAssignment} fullWidth maxWidth="sm">
        <DialogTitle sx={{ fontWeight: 750 }}>Assign Factory Barcode</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={1.25}>
            <Paper elevation={0} sx={{ p: 1.2, border: '1px solid #DCE4EC', borderRadius: 1.5, bgcolor: '#F8FAFC' }}>
              <Typography sx={{ fontSize: '0.72rem', color: 'text.secondary', fontWeight: 650 }}>Selected physical carton</Typography>
              <Typography sx={{ mt: 0.3, fontSize: '1rem', color: '#103B5C', fontWeight: 800 }}>
                {cartonAssignTarget?.cartonCode || `Carton #${cartonAssignTarget?.cartonSequence || '—'}`}
              </Typography>
              <Typography sx={{ mt: 0.35, fontSize: '0.75rem', color: 'text.secondary' }}>
                Article {cartonItemRow?.articleNumber || '—'} · Size {cartonItemRow?.size || '—'} · Qty/CTN {cartonAssignTarget?.cartonPcs ?? cartonAssignTarget?.qtyPerCarton ?? cartonItemRow?.qtyPerCarton ?? '—'}
              </Typography>
            </Paper>

            {cartonAssignError && <Alert severity="error">{cartonAssignError}</Alert>}
            {cartonAssignNotice && <Alert severity="success">{cartonAssignNotice}</Alert>}

            <TextField
              inputRef={cartonBarcodeInputRef}
              autoFocus
              fullWidth
              label="Scan Factory Barcode"
              value={cartonBarcode}
              onChange={(event) => {
                setCartonBarcode(event.target.value);
                setCartonCheckedBarcode(null);
                setCartonAssignError('');
                setCartonAssignNotice('');
              }}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  checkCartonBarcode();
                }
              }}
              disabled={cartonBarcodeChecking || Boolean(cartonAssigningId)}
              helperText="Scan with the barcode scanner or type the code, then press Enter to verify availability."
              InputProps={{
                endAdornment: cartonBarcodeChecking ? <CircularProgress size={18} /> : null
              }}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 1.5, py: 1 }}>
          <Button onClick={closeCartonAssignment} disabled={cartonBarcodeChecking || Boolean(cartonAssigningId)} sx={{ textTransform: 'none' }}>Cancel</Button>
          {!cartonCheckedBarcode ? (
            <Button
              variant="outlined"
              startIcon={<QrCodeScannerOutlinedIcon />}
              onClick={checkCartonBarcode}
              disabled={!cartonBarcode.trim() || cartonBarcodeChecking || Boolean(cartonAssigningId)}
              sx={{ textTransform: 'none', fontWeight: 700 }}
            >
              Verify Barcode
            </Button>
          ) : (
            <Button
              variant="contained"
              startIcon={cartonAssigningId ? <CircularProgress size={15} color="inherit" /> : <AssignmentTurnedInOutlinedIcon />}
              onClick={assignBarcodeToSelectedCarton}
              disabled={Boolean(cartonAssigningId)}
              sx={{ textTransform: 'none', fontWeight: 750 }}
            >
              Assign Barcode
            </Button>
          )}
        </DialogActions>
      </Dialog>

      <Dialog open={Boolean(masterDeleteTarget)} onClose={() => setMasterDeleteTarget(null)} fullWidth maxWidth="xs">
        <DialogTitle sx={{ fontWeight: 700 }}>Delete Order Item?</DialogTitle>
        <DialogContent><Typography>Delete Article <strong>{masterDeleteTarget?.articleNumber}</strong>, Size <strong>{masterDeleteTarget?.size}</strong> from this Order?</Typography></DialogContent>
        <DialogActions><Button onClick={() => setMasterDeleteTarget(null)} sx={{ textTransform: 'none' }}>Cancel</Button><Button color="error" variant="contained" onClick={removeMaster} sx={{ textTransform: 'none' }}>Delete</Button></DialogActions>
      </Dialog>

      <Dialog open={Boolean(packingDeleteTarget)} onClose={() => setPackingDeleteTarget(null)} fullWidth maxWidth="xs">
        <DialogTitle sx={{ fontWeight: 700 }}>Delete Packing List Row?</DialogTitle>
        <DialogContent><Typography>Delete carton range <strong>{formatPackingValue(packingDeleteTarget?.cartonFrom, 'number')}–{formatPackingValue(packingDeleteTarget?.cartonTo, 'number')}</strong>, Article <strong>{packingDeleteTarget?.articleNumber}</strong>?</Typography></DialogContent>
        <DialogActions><Button onClick={() => setPackingDeleteTarget(null)} sx={{ textTransform: 'none' }}>Cancel</Button><Button color="error" variant="contained" onClick={removePacking} sx={{ textTransform: 'none' }}>Delete</Button></DialogActions>
      </Dialog>

      <Dialog open={generateOpen} onClose={generating ? undefined : () => setGenerateOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle sx={{ fontWeight: 700 }}>Generate Packing List from Order Items?</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 1.4 }}>The current Packing List rows will be replaced.</Alert>
          <Typography>
            The system will use SEA quantities when available; otherwise it will use total quantities. Carton measurement and weight fields can be edited after generation.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setGenerateOpen(false)} disabled={generating} sx={{ textTransform: 'none' }}>Cancel</Button>
          <Button onClick={runGenerate} disabled={generating} variant="contained" color="secondary" sx={{ textTransform: 'none' }}>{generating ? 'Generating...' : 'Generate Packing List'}</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={cartonGenerateOpen} onClose={cartonGenerating ? undefined : () => setCartonGenerateOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle sx={{ fontWeight: 700 }}>Generate one Carton Master row for each physical carton in the Packing List?</DialogTitle>
        <DialogContent>
          <Alert severity="info" sx={{ mb: 1.4 }}>Each generated row represents one physical carton. CTNS Qty/carton range controls the number of rows; Qty/CTN is the quantity inside each carton.</Alert>
          <Typography>
            The existing Carton Master will be regenerated only when barcode assignment, scanning, or weighing has not started. After generation, use View Physical Cartons on the correct Master row. Barcode assignment is performed only inside that row's physical-carton list.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCartonGenerateOpen(false)} disabled={cartonGenerating}>Cancel</Button>
          <Button onClick={runGenerateCartons} disabled={cartonGenerating} variant="contained" color="success">{cartonGenerating ? 'Generating...' : 'Generate Carton Master'}</Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={notice.open} autoHideDuration={4500} onClose={() => setNotice((current) => ({ ...current, open: false }))}>
        <Alert severity={notice.severity} variant="filled">{notice.message}</Alert>
      </Snackbar>
    </Box>
  );
}
