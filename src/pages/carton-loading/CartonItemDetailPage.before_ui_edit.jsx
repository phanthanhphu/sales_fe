import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography
} from '@mui/material';
import {
  ArrowBackOutlined,
  CheckCircleOutline,
  KeyboardOutlined,
  QrCodeScannerOutlined,
  RefreshOutlined,
  ScaleOutlined,
  WarningAmberOutlined
} from '@mui/icons-material';

import {
  getCartonTransaction,
  getCurrentStationTransaction,
  listCartonsForItem,
  listScaleStations,
  scanNextCarton,
  submitManualWeight
} from 'services/cartonLoadingService';
import { getPackingOrder } from 'services/packingListService';
import { getBuyerBySlug } from 'utils/buyerAccess';

const FINAL_STATUSES = ['COMPLETED', 'WEIGHT_WARNING'];

const getErrorMessage = (error, fallback) => (
  error?.response?.data?.message
  || error?.response?.data?.error
  || error?.message
  || fallback
);

const stationStorageKey = (buyerCode) => `orderScan.station.${buyerCode}`;
const palletStorageKey = (buyerCode) => `orderScan.pallet.${buyerCode}`;
const modeStorageKey = (buyerCode) => `orderScan.mode.${buyerCode}`;

const readStorage = (key, fallback = '') => {
  try {
    return localStorage.getItem(key) || fallback;
  } catch {
    return fallback;
  }
};

const writeStorage = (key, value) => {
  try {
    localStorage.setItem(key, value || '');
  } catch {
    // Local storage can be unavailable in restricted browser sessions.
  }
};

const weightMeta = (value) => {
  const status = String(value || 'NOT_WEIGHED').toUpperCase();
  if (status === 'OK') return { label: 'OK', color: 'success' };
  if (status === 'UNDER') return { label: 'Underweight', color: 'error' };
  if (status === 'OVER') return { label: 'Overweight', color: 'warning' };
  if (status === 'NO_STANDARD') return { label: 'No standard', color: 'info' };
  return { label: 'Not weighed', color: 'default' };
};

const scanMeta = (value) => {
  const status = String(value || 'PLANNED').toUpperCase();
  if (status === 'COMPLETED') return { label: 'Completed', color: 'success' };
  if (status === 'WEIGHT_WARNING') return { label: 'Weight warning', color: 'warning' };
  if (status === 'WAITING_WEIGHT') return { label: 'Waiting for weight', color: 'info' };
  if (status === 'CANCELLED') return { label: 'Cancelled', color: 'default' };
  return { label: 'Not scanned', color: 'default' };
};

const kg = (value) => value == null
  ? '—'
  : `${Number(value).toLocaleString('en-US', { minimumFractionDigits: 3, maximumFractionDigits: 3 })} kg`;

export default function CartonItemDetailPage() {
  const { buyerSlug, orderId, masterLineId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const buyer = getBuyerBySlug(buyerSlug);
  const scanInputRef = useRef(null);

  const routedTransaction = location.state?.activeTransaction;
  const [order, setOrder] = useState(null);
  const [rows, setRows] = useState([]);
  const [stations, setStations] = useState([]);
  const [stationCode, setStationCode] = useState(() => (
    location.state?.stationCode
    || (buyer?.code ? readStorage(stationStorageKey(buyer.code)) : '')
  ));
  const [palletCode, setPalletCode] = useState(() => (
    location.state?.palletCode
    || (buyer?.code ? readStorage(palletStorageKey(buyer.code), 'P01') : 'P01')
  ));
  const [scanInputMode, setScanInputMode] = useState(() => (
    location.state?.inputMode
    || (buyer?.code ? readStorage(modeStorageKey(buyer.code), 'ZEBRA') : 'ZEBRA')
  ));
  const [weightMode, setWeightMode] = useState(routedTransaction?.stationCode ? 'PLC' : 'MANUAL');
  const [barcode, setBarcode] = useState('');
  const [manualWeight, setManualWeight] = useState('');
  const [manualReason, setManualReason] = useState('Manual test / PLC unavailable');
  const [activeTransaction, setActiveTransaction] = useState(
    routedTransaction?.masterLineId === masterLineId ? routedTransaction : null
  );
  const [keyword, setKeyword] = useState('');
  const [status, setStatus] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [scanSubmitting, setScanSubmitting] = useState(false);
  const [weightSubmitting, setWeightSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const focusScanner = useCallback(() => {
    window.setTimeout(() => scanInputRef.current?.focus(), 100);
  }, []);

  const loadRows = useCallback(async ({ showLoading = true } = {}) => {
    if (!buyer?.code || !orderId || !masterLineId) return;
    if (showLoading) setLoading(true);
    try {
      const [orderData, itemRows] = await Promise.all([
        getPackingOrder(buyer.code, orderId),
        listCartonsForItem(buyer.code, orderId, masterLineId)
      ]);
      setOrder(orderData);
      setRows(Array.isArray(itemRows) ? itemRows : []);
    } catch (requestError) {
      setError(getErrorMessage(requestError, 'Unable to load the child item list.'));
    } finally {
      if (showLoading) setLoading(false);
    }
  }, [buyer?.code, orderId, masterLineId]);

  const loadStations = useCallback(async () => {
    try {
      const data = await listScaleStations(true);
      const activeStations = Array.isArray(data) ? data : [];
      setStations(activeStations);
      setStationCode((current) => {
        if (!current) return '';
        if (activeStations.some((station) => station.stationCode === current)) return current;
        return '';
      });
    } catch (requestError) {
      setError(getErrorMessage(requestError, 'Unable to load Scale Stations.'));
    }
  }, []);

  useEffect(() => {
    setError('');
    setNotice('');
    const nextTransaction = routedTransaction?.masterLineId === masterLineId ? routedTransaction : null;
    setActiveTransaction(nextTransaction);
    setWeightMode(nextTransaction?.stationCode ? 'PLC' : 'MANUAL');
    setBarcode('');
    setManualWeight('');
    loadRows();
  }, [masterLineId, routedTransaction, loadRows]);

  useEffect(() => {
    loadStations();
  }, [loadStations]);

  useEffect(() => {
    if (!buyer?.code) return;
    writeStorage(stationStorageKey(buyer.code), stationCode);
  }, [buyer?.code, stationCode]);

  useEffect(() => {
    if (!buyer?.code) return;
    writeStorage(palletStorageKey(buyer.code), palletCode);
  }, [buyer?.code, palletCode]);

  useEffect(() => {
    if (!buyer?.code) return;
    writeStorage(modeStorageKey(buyer.code), scanInputMode);
  }, [buyer?.code, scanInputMode]);

  useEffect(() => {
    if (!buyer?.code || !stationCode || activeTransaction?.status === 'WAITING_WEIGHT') return;
    let cancelled = false;
    getCurrentStationTransaction(buyer.code, stationCode)
      .then((transaction) => {
        if (!cancelled && transaction?.masterLineId === masterLineId) {
          setActiveTransaction(transaction);
        }
      })
      .catch(() => {
        // No active station job is a valid state.
      });
    return () => { cancelled = true; };
  }, [buyer?.code, stationCode, masterLineId, activeTransaction?.status]);

  useEffect(() => {
    if (!buyer?.code || !activeTransaction?.id || activeTransaction.status !== 'WAITING_WEIGHT') return undefined;

    let cancelled = false;
    const checkWeight = async () => {
      try {
        const latest = await getCartonTransaction(buyer.code, activeTransaction.id);
        if (cancelled || !latest) return;
        setActiveTransaction(latest);
        if (latest.status !== 'WAITING_WEIGHT') {
          setNotice(`Child ${latest.cartonSequence} completed with ${kg(latest.weightKg)} from ${latest.weightSource || 'weight input'}.`);
          await loadRows({ showLoading: false });
          setManualWeight('');
        }
      } catch {
        // Keep polling; a transient network error should not cancel the weighing workflow.
      }
    };

    const timer = window.setInterval(checkWeight, 1200);
    checkWeight();
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [buyer?.code, activeTransaction?.id, activeTransaction?.status, loadRows]);

  const waitingForWeight = activeTransaction?.status === 'WAITING_WEIGHT';

  useEffect(() => {
    if (!loading && !scanSubmitting && !waitingForWeight && scanInputMode === 'ZEBRA') {
      focusScanner();
    }
  }, [loading, scanSubmitting, waitingForWeight, scanInputMode, focusScanner]);

  const filtered = useMemo(() => {
    const key = keyword.trim().toUpperCase();
    return rows.filter((row) => {
      const matchStatus = status === 'ALL' || row.status === status || row.weightStatus === status;
      const text = [row.itemKey, row.poNumber, row.articleNumber, row.color, row.size, row.stationCode, row.scannedBy].join(' ').toUpperCase();
      return matchStatus && (!key || text.includes(key));
    });
  }, [rows, keyword, status]);

  const first = rows[0] || {};
  const completed = rows.filter((row) => FINAL_STATUSES.includes(row.status)).length;
  const waiting = rows.filter((row) => row.status === 'WAITING_WEIGHT').length;
  const warnings = rows.filter((row) => ['UNDER', 'OVER'].includes(row.weightStatus)).length;
  const nextPlanned = rows.find((row) => row.status === 'PLANNED');

  const submitScan = async () => {
    const code = barcode.trim();
    if (!buyer?.code || scanSubmitting) return;
    if (waitingForWeight) {
      setError(`Child ${activeTransaction.cartonSequence} is still waiting for weight. Complete it before scanning the next child.`);
      return;
    }
    if (!code) {
      setError('Scan or enter a QA Code.');
      focusScanner();
      return;
    }

    setScanSubmitting(true);
    setError('');
    setNotice('');
    try {
      const transaction = await scanNextCarton(buyer.code, orderId, {
        stationCode: stationCode || null,
        barcode: code,
        palletCode: palletCode.trim() || null,
        scanId: globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`,
        masterLineId,
        manualMode: !stationCode
      });
      setBarcode('');
      setActiveTransaction(transaction);
      setWeightMode(transaction.stationCode ? 'PLC' : 'MANUAL');
      setNotice(`QA Code matched. Child ${transaction.cartonSequence} was selected automatically and is waiting for weight.`);

      if (transaction.masterLineId !== masterLineId) {
        navigate(`/buyers/${buyer.slug}/orders/${orderId}/items/${transaction.masterLineId}`, {
          state: {
            activeTransaction: transaction,
            stationCode,
            palletCode,
            inputMode: scanInputMode,
            scannedBarcode: code
          }
        });
        return;
      }
      await loadRows({ showLoading: false });
    } catch (requestError) {
      setError(getErrorMessage(requestError, 'Unable to scan the QA Code.'));
      focusScanner();
    } finally {
      setScanSubmitting(false);
    }
  };

  const submitWeightManually = async () => {
    if (!buyer?.code || !activeTransaction?.id || weightSubmitting) return;
    const value = Number(manualWeight);
    if (!Number.isFinite(value) || value <= 0) {
      setError('Enter a valid weight greater than 0 kg.');
      return;
    }
    if (!manualReason.trim()) {
      setError('Enter the reason for manual weight input.');
      return;
    }

    setWeightSubmitting(true);
    setError('');
    try {
      const completedTransaction = await submitManualWeight(buyer.code, activeTransaction.id, {
        weightKg: value,
        reason: manualReason.trim()
      });
      setActiveTransaction(completedTransaction);
      setNotice(`Child ${completedTransaction.cartonSequence} completed manually with ${kg(completedTransaction.weightKg)}.`);
      setManualWeight('');
      await loadRows({ showLoading: false });
      focusScanner();
    } catch (requestError) {
      setError(getErrorMessage(requestError, 'Unable to save the manual weight.'));
    } finally {
      setWeightSubmitting(false);
    }
  };

  if (!buyer) return <Alert severity="warning">Buyer could not be identified.</Alert>;

  return (
    <Box sx={{ p: { xs: 1.25, md: 2.5 } }}>
      <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" spacing={1.5} mb={2}>
        <Box>
          <Button
            size="small"
            startIcon={<ArrowBackOutlined />}
            onClick={() => navigate(`/buyers/${buyer.slug}/orders/${orderId}`)}
            sx={{ mb: 0.5, textTransform: 'none' }}
          >
            Back to Order
          </Button>
          <Typography sx={{ fontSize: '1.5rem', fontWeight: 950, color: '#103B5C' }}>Item Child Scan & Weight</Typography>
          <Typography color="text.secondary">
            {buyer.label} · {order?.orderName || 'Order'} · PO {first.poNumber || '—'} · Article {first.articleNumber || '—'}
          </Typography>
        </Box>
        <Stack direction="row" spacing={1} alignItems="flex-start" flexWrap="wrap" useFlexGap>
          <Button variant="outlined" startIcon={<RefreshOutlined />} onClick={() => loadRows()} disabled={loading} sx={{ textTransform: 'none' }}>
            Refresh
          </Button>
          <Button
            variant="contained"
            startIcon={<QrCodeScannerOutlined />}
            onClick={() => navigate(`/buyers/${buyer.slug}/orders/${orderId}/scan`)}
            sx={{ textTransform: 'none', bgcolor: '#103B5C' }}
          >
            Scan Another Item
          </Button>
        </Stack>
      </Stack>

      {error && <Alert severity="error" sx={{ mb: 1.5 }}>{error}</Alert>}
      {notice && <Alert severity="success" sx={{ mb: 1.5 }}>{notice}</Alert>}

      <Paper variant="outlined" sx={{ p: 1.5, mb: 1.5, borderRadius: 2 }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.25} alignItems={{ md: 'center' }}>
          <Box sx={{ flex: 1 }}>
            <Typography sx={{ fontWeight: 900, color: '#103B5C' }}>Matched parent item</Typography>
            <Typography variant="body2" color="text.secondary">
              Supplier {first.supplierNumber || '—'} · PO {first.poNumber || '—'} · Article {first.articleNumber || '—'} · Size {first.size || '—'} · Color {first.color || '—'}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Each successful scan automatically selects the first child with status Not scanned.
            </Typography>
          </Box>
          <Chip label={`Total ${rows.length}`} color="primary" />
          <Chip label={`Completed ${completed}`} color="success" variant="outlined" />
          <Chip label={`Waiting ${waiting}`} color="info" variant="outlined" />
          <Chip label={`Next ${nextPlanned?.cartonSequence ?? 'Done'}`} color={nextPlanned ? 'warning' : 'success'} variant="outlined" />
        </Stack>
      </Paper>

      <Paper variant="outlined" sx={{ p: { xs: 1.5, md: 2 }, mb: 1.5, borderRadius: 2, borderColor: waitingForWeight ? 'info.main' : 'divider' }}>
        <Stack spacing={1.5}>
          <Stack direction={{ xs: 'column', lg: 'row' }} spacing={1.2} alignItems={{ lg: 'center' }}>
            <FormControl size="small" sx={{ minWidth: 250 }}>
              <InputLabel id="item-scan-station-label">Scale Station</InputLabel>
              <Select
                labelId="item-scan-station-label"
                value={stationCode}
                label="Scale Station"
                onChange={(event) => setStationCode(event.target.value)}
                disabled={waitingForWeight}
              >
                <MenuItem value=""><em>Manual weight only — no PLC station</em></MenuItem>
                {stations.map((station) => (
                  <MenuItem key={station.stationCode} value={station.stationCode}>
                    {station.stationName || station.stationCode} ({station.stationCode})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              size="small"
              label="Pallet / Location"
              value={palletCode}
              onChange={(event) => setPalletCode(event.target.value)}
              disabled={waitingForWeight}
              sx={{ minWidth: 220 }}
            />
            <ToggleButtonGroup
              exclusive
              size="small"
              value={scanInputMode}
              onChange={(_, value) => value && setScanInputMode(value)}
              disabled={waitingForWeight}
            >
              <ToggleButton value="ZEBRA"><QrCodeScannerOutlined sx={{ mr: 0.5 }} /> Zebra USB</ToggleButton>
              <ToggleButton value="MANUAL"><KeyboardOutlined sx={{ mr: 0.5 }} /> Manual QA</ToggleButton>
            </ToggleButtonGroup>
          </Stack>

          <Stack direction={{ xs: 'column', md: 'row' }} spacing={1}>
            <TextField
              inputRef={scanInputRef}
              fullWidth
              label={scanInputMode === 'ZEBRA' ? 'Zebra USB scan input' : 'Enter QA Code manually'}
              value={barcode}
              onChange={(event) => setBarcode(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && scanInputMode === 'ZEBRA') {
                  event.preventDefault();
                  submitScan();
                }
              }}
              disabled={waitingForWeight || scanSubmitting}
              autoComplete="off"
              placeholder={scanInputMode === 'ZEBRA'
                ? 'Scan the same QA Code; Zebra Enter selects the next unfinished child automatically'
                : 'Type or paste the QA Code, then click Search Next Child'}
            />
            <Button
              variant="contained"
              startIcon={scanSubmitting ? <CircularProgress size={18} color="inherit" /> : <QrCodeScannerOutlined />}
              onClick={submitScan}
              disabled={waitingForWeight || scanSubmitting || !barcode.trim()}
              sx={{ minWidth: 175, textTransform: 'none', bgcolor: '#103B5C' }}
            >
              {scanSubmitting ? 'Searching...' : (scanInputMode === 'MANUAL' ? 'Search Next Child' : 'Search Now')}
            </Button>
          </Stack>

          {activeTransaction ? (
            <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2, bgcolor: activeTransaction.status === 'WAITING_WEIGHT' ? '#F0F9FF' : '#F0FDF4' }}>
              <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.2} alignItems={{ md: 'center' }}>
                <Box sx={{ flex: 1 }}>
                  <Stack direction="row" spacing={0.8} alignItems="center">
                    {activeTransaction.status === 'WAITING_WEIGHT'
                      ? <ScaleOutlined color="info" />
                      : <CheckCircleOutline color="success" />}
                    <Typography sx={{ fontWeight: 950, color: '#103B5C' }}>
                      Child #{activeTransaction.cartonSequence} / {activeTransaction.plannedCartons}
                    </Typography>
                    <Chip size="small" label={scanMeta(activeTransaction.status).label} color={scanMeta(activeTransaction.status).color} />
                  </Stack>
                  <Typography variant="body2" color="text.secondary">
                    Job {activeTransaction.jobId || '—'} · Station {activeTransaction.stationCode || 'Manual test'} · Item key {activeTransaction.itemKey || '—'}
                  </Typography>
                  {activeTransaction.status !== 'WAITING_WEIGHT' && (
                    <Typography sx={{ mt: 0.5, fontWeight: 900 }}>
                      Actual weight: {kg(activeTransaction.weightKg)} · Source: {activeTransaction.weightSource || '—'}
                    </Typography>
                  )}
                </Box>

                {activeTransaction.status === 'WAITING_WEIGHT' && (
                  <ToggleButtonGroup
                    exclusive
                    size="small"
                    value={weightMode}
                    onChange={(_, value) => value && setWeightMode(value)}
                  >
                    <ToggleButton value="PLC" disabled={!activeTransaction.stationCode}><ScaleOutlined sx={{ mr: 0.5 }} /> PLC automatic</ToggleButton>
                    <ToggleButton value="MANUAL"><KeyboardOutlined sx={{ mr: 0.5 }} /> Manual weight</ToggleButton>
                  </ToggleButtonGroup>
                )}
              </Stack>

              {activeTransaction.status === 'WAITING_WEIGHT' && weightMode === 'PLC' && (
                <Alert severity="info" sx={{ mt: 1.3 }}>
                  Waiting for PLC to send a stable weight for Job {activeTransaction.jobId}. The page checks the result automatically.
                </Alert>
              )}

              {activeTransaction.status === 'WAITING_WEIGHT' && !activeTransaction.stationCode && (
                <Alert severity="warning" sx={{ mt: 1.3 }}>
                  This child was opened without a Scale Station. PLC input is unavailable for this child; enter the weight manually below.
                </Alert>
              )}

              {activeTransaction.status === 'WAITING_WEIGHT' && weightMode === 'MANUAL' && (
                <Stack direction={{ xs: 'column', md: 'row' }} spacing={1} sx={{ mt: 1.3 }}>
                  <TextField
                    type="number"
                    label="Actual weight (kg)"
                    value={manualWeight}
                    onChange={(event) => setManualWeight(event.target.value)}
                    inputProps={{ min: 0, step: '0.001' }}
                    sx={{ minWidth: 210 }}
                  />
                  <TextField
                    fullWidth
                    label="Manual input reason"
                    value={manualReason}
                    onChange={(event) => setManualReason(event.target.value)}
                  />
                  <Button
                    variant="contained"
                    color="warning"
                    startIcon={weightSubmitting ? <CircularProgress size={18} color="inherit" /> : <ScaleOutlined />}
                    onClick={submitWeightManually}
                    disabled={weightSubmitting || !manualWeight}
                    sx={{ minWidth: 180, textTransform: 'none' }}
                  >
                    {weightSubmitting ? 'Saving...' : 'Confirm Weight'}
                  </Button>
                </Stack>
              )}
            </Paper>
          ) : (
            <Alert severity="info">
              No child is currently waiting for weight. Scan the QA Code to select the first unfinished child automatically.
            </Alert>
          )}
        </Stack>
      </Paper>

      <Paper variant="outlined" sx={{ p: 1.5, mb: 1.5, borderRadius: 2 }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
          <TextField size="small" label="Search Item Key / PO / Article" value={keyword} onChange={(event) => setKeyword(event.target.value)} sx={{ minWidth: 290 }} />
          <TextField select SelectProps={{ native: true }} size="small" label="Status" value={status} onChange={(event) => setStatus(event.target.value)} sx={{ minWidth: 180 }}>
            <option value="ALL">All</option>
            <option value="PLANNED">Not scanned</option>
            <option value="WAITING_WEIGHT">Waiting for weight</option>
            <option value="COMPLETED">Completed</option>
            <option value="WEIGHT_WARNING">Weight warning</option>
            <option value="UNDER">Underweight</option>
            <option value="OVER">Overweight</option>
            <option value="OK">OK</option>
          </TextField>
          <Button variant="outlined" onClick={() => { setKeyword(''); setStatus('ALL'); }} sx={{ textTransform: 'none' }}>Reset</Button>
        </Stack>
      </Paper>

      <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden' }}>
        <TableContainer sx={{ maxHeight: 'calc(100vh - 530px)', minHeight: 300 }}>
          <Table stickyHeader size="small" sx={{ minWidth: 1240 }}>
            <TableHead>
              <TableRow>
                {['Child', 'Item Key', 'Scan Status', 'Expected', 'Actual', 'Difference', 'Weight Status', 'Source', 'Station', 'Updated By'].map((label) => (
                  <TableCell key={label} sx={{ bgcolor: '#F8FAFC', fontWeight: 900, fontSize: '0.75rem', whiteSpace: 'nowrap' }}>{label}</TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={10} align="center" sx={{ py: 6 }}><CircularProgress size={30} /></TableCell></TableRow>
              ) : filtered.length ? filtered.map((row) => {
                const scan = scanMeta(row.status);
                const weight = weightMeta(row.weightStatus);
                const isActive = activeTransaction?.id === row.id;
                const isNext = !activeTransaction || activeTransaction.status !== 'WAITING_WEIGHT'
                  ? nextPlanned?.id === row.id
                  : false;
                return (
                  <TableRow
                    key={row.id || row.itemKey}
                    hover
                    selected={isActive}
                    sx={{
                      '&.Mui-selected': { bgcolor: '#E0F2FE' },
                      ...(isNext ? { bgcolor: '#FFF7ED' } : {})
                    }}
                  >
                    <TableCell sx={{ fontWeight: 900 }}>
                      #{row.cartonSequence ?? row.itemSequence ?? '—'}
                      {isNext && <Chip size="small" label="Next" color="warning" sx={{ ml: 0.8 }} />}
                    </TableCell>
                    <TableCell sx={{ fontWeight: 850, color: '#103B5C', whiteSpace: 'nowrap' }}>{row.itemKey || row.cartonCode || '—'}</TableCell>
                    <TableCell><Chip size="small" label={scan.label} color={scan.color} variant="outlined" /></TableCell>
                    <TableCell>{kg(row.expectedWeightKg)}</TableCell>
                    <TableCell sx={{ fontWeight: row.weightKg != null ? 900 : 400 }}>{kg(row.weightKg)}</TableCell>
                    <TableCell>{row.weightDifferenceKg == null ? '—' : kg(row.weightDifferenceKg)}</TableCell>
                    <TableCell><Chip size="small" label={weight.label} color={weight.color} /></TableCell>
                    <TableCell>{row.weightSource || '—'}</TableCell>
                    <TableCell>{row.stationCode || '—'}</TableCell>
                    <TableCell>{row.weighedBy || row.scannedBy || '—'}</TableCell>
                  </TableRow>
                );
              }) : (
                <TableRow><TableCell colSpan={10} align="center" sx={{ py: 6, color: 'text.secondary' }}>No matching data.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
        <Box sx={{ p: 1.25, borderTop: '1px solid #E5E7EB', display: 'flex', justifyContent: 'space-between', gap: 1 }}>
          <Typography variant="caption" color="text.secondary">
            Scan sequence is controlled by the backend: the lowest unfinished child is selected atomically.
          </Typography>
          <Typography variant="caption" fontWeight={800}>{filtered.length.toLocaleString('en-US')} rows</Typography>
        </Box>
      </Paper>

      {warnings > 0 && (
        <Alert severity="warning" icon={<WarningAmberOutlined />} sx={{ mt: 1.5 }}>
          This item has {warnings} child weight warning(s). Review the expected weight and tolerance.
        </Alert>
      )}
    </Box>
  );
}
