import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
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
  TextField,
  Typography
} from '@mui/material';
import {
  ArrowBackOutlined,
  Inventory2Outlined,
  QrCodeScannerOutlined,
  ScaleOutlined
} from '@mui/icons-material';

import {
  getCartonProgress,
  listScaleStations,
  scanAssignedFactoryBarcode
} from 'services/cartonLoadingService';
import { getPackingOrder } from 'services/packingListService';
import { getBuyerBySlug } from 'utils/buyerAccess';

const getErrorMessage = (error, fallback) => (
  error?.response?.data?.message
  || error?.response?.data?.error
  || error?.message
  || fallback
);

const stationStorageKey = (buyerCode) => `orderScan.station.${buyerCode}`;
const palletStorageKey = (buyerCode) => `orderScan.pallet.${buyerCode}`;

const readStorage = (key, fallback = '') => {
  try { return localStorage.getItem(key) || fallback; } catch { return fallback; }
};
const writeStorage = (key, value) => {
  try { localStorage.setItem(key, value || ''); } catch { /* restricted browser */ }
};

export default function OrderScanPage() {
  const { buyerSlug, orderId } = useParams();
  const navigate = useNavigate();
  const buyer = getBuyerBySlug(buyerSlug);
  const scanInputRef = useRef(null);

  const [order, setOrder] = useState(null);
  const [stations, setStations] = useState([]);
  const [progress, setProgress] = useState(null);
  const [stationCode, setStationCode] = useState(() => buyer?.code ? readStorage(stationStorageKey(buyer.code)) : '');
  const [palletCode, setPalletCode] = useState(() => buyer?.code ? readStorage(palletStorageKey(buyer.code), 'P01') : 'P01');
  const [factoryBarcode, setFactoryBarcode] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const focusScanner = useCallback(() => {
    window.setTimeout(() => scanInputRef.current?.focus(), 80);
  }, []);

  const loadSetup = useCallback(async () => {
    if (!buyer?.code || !orderId) return;
    setLoading(true);
    setError('');
    try {
      const [orderData, stationData, progressData] = await Promise.all([
        getPackingOrder(buyer.code, orderId),
        listScaleStations(true),
        getCartonProgress(buyer.code, orderId)
      ]);
      const activeStations = Array.isArray(stationData) ? stationData : [];
      setOrder(orderData);
      setStations(activeStations);
      setProgress(progressData);
      setStationCode((current) => {
        if (current && activeStations.some((station) => station.stationCode === current)) return current;
        return activeStations[0]?.stationCode || '';
      });
    } catch (requestError) {
      setError(getErrorMessage(requestError, 'Unable to load the selected Order scan setup.'));
    } finally {
      setLoading(false);
      focusScanner();
    }
  }, [buyer?.code, orderId, focusScanner]);

  useEffect(() => { loadSetup(); }, [loadSetup]);
  useEffect(() => { if (buyer?.code) writeStorage(stationStorageKey(buyer.code), stationCode); }, [buyer?.code, stationCode]);
  useEffect(() => { if (buyer?.code) writeStorage(palletStorageKey(buyer.code), palletCode); }, [buyer?.code, palletCode]);
  useEffect(() => { if (!submitting) focusScanner(); }, [submitting, focusScanner]);

  const scanBarcode = async () => {
    const code = factoryBarcode.trim();
    if (!buyer?.code || !orderId || submitting) return;
    if (!code) {
      setError('Scan or enter a Factory Barcode.');
      focusScanner();
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      const transaction = await scanAssignedFactoryBarcode(buyer.code, orderId, {
        stationCode: stationCode || null,
        factoryBarcode: code,
        palletCode: palletCode.trim() || null,
        scanId: globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`,
        manualMode: !stationCode
      });
      setFactoryBarcode('');
      navigate(`/buyers/${buyer.slug}/orders/${orderId}/items/${transaction.masterLineId}`, {
        state: {
          activeTransaction: transaction,
          stationCode,
          palletCode,
          scannedBarcode: code
        }
      });
    } catch (requestError) {
      setError(getErrorMessage(requestError, 'Unable to identify the carton from this Factory Barcode.'));
      focusScanner();
    } finally {
      setSubmitting(false);
    }
  };

  if (!buyer) return <Alert severity="warning">Buyer could not be identified.</Alert>;

  const planned = Number(progress?.planned || 0);
  const completed = Number(progress?.completed || 0) + Number(progress?.warning || 0);
  const remaining = Number(progress?.remaining || 0);

  return (
    <Box sx={{ p: { xs: 0.5, md: 0.75 }, width: '100%', maxWidth: 1500, mx: 'auto' }}>
      <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ md: 'center' }} spacing={0.8} mb={1}>
        <Stack direction="row" spacing={0.7} alignItems="center" flexWrap="wrap" useFlexGap>
          <Button size="small" startIcon={<ArrowBackOutlined />} onClick={() => navigate(`/buyers/${buyer.slug}/orders/${orderId}`)}>Back</Button>
          <Typography sx={{ fontSize: '0.82rem', fontWeight: 700, color: '#41566E' }}>{order?.orderName || 'Order'}</Typography>
        </Stack>
        <Stack direction="row" spacing={0.6} flexWrap="wrap" useFlexGap>
          <Chip label={`Planned ${planned.toLocaleString()}`} color="primary" variant="outlined" />
          <Chip label={`Completed ${completed.toLocaleString()}`} color="success" variant="outlined" />
          <Chip label={`Remaining ${remaining.toLocaleString()}`} color="warning" variant="outlined" />
        </Stack>
      </Stack>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Paper variant="outlined" sx={{ p: { xs: 1.5, md: 2.2 }, borderRadius: 2.25, minHeight: { md: 420 }, boxShadow: '0 10px 28px rgba(16, 59, 92, 0.06)' }}>
        {loading ? (
          <Box sx={{ py: 8, textAlign: 'center' }}><CircularProgress /></Box>
        ) : (
          <Stack spacing={3}>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'minmax(330px, .8fr) minmax(420px, 1.2fr)' }, gap: 2 }}>
              <FormControl fullWidth sx={{ '& .MuiInputBase-root': { minHeight: 62, fontSize: '1.05rem' } }}>
                <InputLabel id="factory-scan-station-label">Scale Station</InputLabel>
                <Select labelId="factory-scan-station-label" value={stationCode} label="Scale Station" onChange={(event) => setStationCode(event.target.value)}>
                  <MenuItem value=""><em>Manual test — no PLC station</em></MenuItem>
                  {stations.map((station) => (
                    <MenuItem key={station.stationCode} value={station.stationCode}>
                      {station.stationName || station.stationCode} ({station.stationCode})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <TextField label="Pallet / Location" value={palletCode} onChange={(event) => setPalletCode(event.target.value)} placeholder="P01" sx={{ '& .MuiInputBase-root': { minHeight: 62, fontSize: '1.05rem' } }} />
            </Box>

            {!stationCode && (
              <Alert severity="info" icon={<ScaleOutlined />}>
                Manual test mode is active. The carton can still be identified by Factory Barcode; actual weight is entered manually on the next screen.
              </Alert>
            )}

            <Paper variant="outlined" sx={{ p: { xs: 1.5, md: 2 }, borderRadius: 2, bgcolor: '#F8FAFC' }}>
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                <Inventory2Outlined sx={{ color: '#103B5C' }} />
                <Typography sx={{ fontWeight: 800, color: '#173B63', fontSize: '1.05rem' }}>Scan Factory Barcode</Typography>
              </Stack>
              <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} alignItems="stretch">
                <TextField
                  inputRef={scanInputRef}
                  autoFocus
                  fullWidth
                  label="Factory Use Only Barcode"
                  value={factoryBarcode}
                  onChange={(event) => setFactoryBarcode(event.target.value.replace(/\s/g, ''))}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault();
                      scanBarcode();
                    }
                  }}
                  disabled={submitting}
                  autoComplete="off"
                  placeholder="Example: 26002000025429"
                  helperText="The barcode must already be assigned from the correct Master row → View Physical Cartons. Zebra USB Enter starts lookup automatically."
                  sx={{ flex: 1, '& .MuiInputBase-root': { minHeight: 72, fontSize: { xs: '1.05rem', md: '1.25rem' }, fontWeight: 900, letterSpacing: 0.8 } }}
                />
                <Button
                  variant="contained"
                  size="large"
                  startIcon={submitting ? <CircularProgress size={18} color="inherit" /> : <QrCodeScannerOutlined />}
                  onClick={scanBarcode}
                  disabled={submitting || !factoryBarcode.trim()}
                  sx={{ minWidth: { xs: '100%', md: 250 }, minHeight: 72, px: 3, fontSize: '1.05rem', fontWeight: 900, textTransform: 'none', bgcolor: '#103B5C' }}
                >
                  {submitting ? 'Identifying...' : 'Identify Carton'}
                </Button>
              </Stack>
            </Paper>

            <Alert severity="success">
              Workflow: Factory Barcode → exact assigned carton → PO / Article / Color / Size / Qty → weight job. No carton is selected by sequence at this stage.
            </Alert>
          </Stack>
        )}
      </Paper>
    </Box>
  );
}
