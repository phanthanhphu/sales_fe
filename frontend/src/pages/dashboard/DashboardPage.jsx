import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  MenuItem,
  Paper,
  Snackbar,
  Stack,
  TextField,
  Typography
} from '@mui/material';
import {
  AssignmentTurnedInOutlined,
  AutorenewOutlined,
  DescriptionOutlined,
  PaidOutlined,
  RefreshOutlined,
  RestartAltOutlined,
  ScheduleOutlined
} from '@mui/icons-material';
import { alpha } from '@mui/material/styles';

import { getDashboardError, getDashboardSummary } from '../../services/dashboardService';
import { getAccessibleBuyers, getDefaultBuyerKey } from '../../utils/buyerContext';
import { listAccessibleBuyers } from '../../services/buyerService';

const ORDER_COLORS = ['#22A06B', '#F59E0B', '#EF5B5B'];
const BOM_COLORS = ['#2563EB', '#A8D4FA'];
const MATERIAL_COLORS = ['#2563EB', '#22A06B', '#8B5CF6'];
const GRID = '#E8EEF5';
const TEXT = '#173B63';
const MUTED = '#6B7C90';

const formatInteger = (value) => new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(Number(value || 0));
const formatUsd = (value) => new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0
}).format(Number(value || 0));
const formatCompact = (value) => new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(Number(value || 0));

const safeNumber = (value) => {
  const number = Number(value || 0);
  return Number.isFinite(number) ? number : 0;
};

const percentage = (value, total) => total > 0 ? (safeNumber(value) / safeNumber(total)) * 100 : 0;

const niceMax = (value) => {
  const n = Math.max(1, safeNumber(value));
  const power = 10 ** Math.floor(Math.log10(n));
  const normalized = n / power;
  const step = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
  return step * power;
};

function KpiCard({ label, value, icon: Icon, tone = '#2563EB', helper = '' }) {
  return (
    <Paper
      elevation={0}
      sx={{
        p: 1.45,
        minHeight: 104,
        border: `1px solid ${alpha(tone, 0.28)}`,
        borderRadius: 2.25,
        background: `linear-gradient(135deg, #FFFFFF 0%, ${alpha(tone, 0.045)} 100%)`,
        minWidth: 0,
        boxShadow: '0 4px 18px rgba(22, 56, 93, 0.035)'
      }}
    >
      <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1.1} sx={{ height: 1 }}>
        <Box sx={{ minWidth: 0 }}>
          <Typography sx={{ color: tone, fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.25, whiteSpace: 'nowrap' }}>
            {label}
          </Typography>
          <Typography sx={{ mt: 0.55, color: '#173B63', fontSize: '1.45rem', lineHeight: 1.08, fontWeight: 800, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {value}
          </Typography>
          {helper ? (
            <Typography sx={{ mt: 0.65, color: '#71849A', fontSize: '0.7rem', fontWeight: 650, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {helper}
            </Typography>
          ) : null}
        </Box>
        <Box
          sx={{
            width: 46,
            height: 46,
            borderRadius: '50%',
            display: 'grid',
            placeItems: 'center',
            bgcolor: alpha(tone, 0.12),
            color: tone,
            flexShrink: 0
          }}
        >
          <Icon sx={{ fontSize: 23 }} />
        </Box>
      </Stack>
    </Paper>
  );
}

function ChartCard({ title, subtitle = '', children, sx }) {
  return (
    <Paper
      elevation={0}
      sx={{
        border: '1px solid #E2E8F0',
        borderRadius: 2.35,
        bgcolor: '#FFFFFF',
        overflow: 'hidden',
        minWidth: 0,
        boxShadow: '0 4px 18px rgba(22, 56, 93, 0.035)',
        ...sx
      }}
    >
      <Box sx={{ px: 1.7, pt: 1.45, pb: 0.6 }}>
        <Typography sx={{ color: '#173B63', fontSize: '0.9rem', fontWeight: 800 }}>{title}</Typography>
        {subtitle ? <Typography sx={{ mt: 0.25, color: '#71849A', fontSize: '0.72rem', fontWeight: 600 }}>{subtitle}</Typography> : null}
      </Box>
      <Box sx={{ px: 1.5, pt: 0.55, pb: 1.45 }}>{children}</Box>
    </Paper>
  );
}

function EmptyChart() {
  return (
    <Box sx={{ height: 230, display: 'grid', placeItems: 'center' }}>
      <Typography sx={{ color: '#94A3B8', fontSize: '0.82rem', fontWeight: 650 }}>No data</Typography>
    </Box>
  );
}

function DonutChart({ data = [] }) {
  const total = data.reduce((sum, item) => sum + safeNumber(item.count), 0);
  if (!total) return <EmptyChart />;

  let cursor = 0;
  const segments = data.map((item, index) => {
    const pct = percentage(item.count, total);
    const start = cursor;
    cursor += pct;
    return `${ORDER_COLORS[index % ORDER_COLORS.length]} ${start}% ${cursor}%`;
  });

  return (
    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2.3} alignItems="center" justifyContent="center" sx={{ minHeight: 245, px: 0.5 }}>
      <Box sx={{ position: 'relative', width: 178, height: 178, flexShrink: 0 }}>
        <Box sx={{ width: 1, height: 1, borderRadius: '50%', background: `conic-gradient(${segments.join(',')})`, transform: 'rotate(-90deg)' }} />
        <Box sx={{ position: 'absolute', inset: 35, borderRadius: '50%', bgcolor: '#FFFFFF', display: 'grid', placeItems: 'center', textAlign: 'center', boxShadow: '0 0 0 1px #EEF2F7' }}>
          <Box>
            <Typography sx={{ fontSize: '1.55rem', fontWeight: 800, color: TEXT, lineHeight: 1 }}>{formatInteger(total)}</Typography>
            <Typography sx={{ mt: 0.45, fontSize: '0.68rem', fontWeight: 700, color: MUTED }}>Total Orders</Typography>
          </Box>
        </Box>
      </Box>

      <Stack spacing={1.25} sx={{ minWidth: 176, width: { xs: '100%', sm: 'auto' } }}>
        {data.map((item, index) => {
          const pct = percentage(item.count, total);
          return (
            <Box key={item.status} sx={{ display: 'grid', gridTemplateColumns: '10px minmax(0, 1fr) auto', gap: 0.8, alignItems: 'center' }}>
              <Box sx={{ width: 9, height: 9, borderRadius: '50%', bgcolor: ORDER_COLORS[index % ORDER_COLORS.length] }} />
              <Box sx={{ minWidth: 0 }}>
                <Typography sx={{ fontSize: '0.76rem', color: '#40566E', fontWeight: 700, whiteSpace: 'nowrap' }}>{item.status}</Typography>
                <Typography sx={{ mt: 0.1, fontSize: '0.68rem', color: '#8A98AA', fontWeight: 600 }}>{pct.toFixed(1)}%</Typography>
              </Box>
              <Typography sx={{ fontSize: '0.8rem', color: TEXT, fontWeight: 800 }}>{formatInteger(item.count)}</Typography>
            </Box>
          );
        })}
      </Stack>
    </Stack>
  );
}

function LineChart({ data = [] }) {
  if (!data.length) return <EmptyChart />;

  const width = 720;
  const height = 245;
  const left = 46;
  const right = 18;
  const top = 22;
  const bottom = 42;
  const innerW = width - left - right;
  const innerH = height - top - bottom;
  const maxValue = niceMax(Math.max(1, ...data.map((item) => safeNumber(item.count))));
  const tickCount = 4;
  const points = data.map((item, index) => ({
    x: left + (data.length <= 1 ? innerW / 2 : (index / (data.length - 1)) * innerW),
    y: top + innerH - (safeNumber(item.count) / maxValue) * innerH,
    ...item
  }));
  const polyline = points.map((point) => `${point.x},${point.y}`).join(' ');
  const areaPath = `M ${points[0].x} ${top + innerH} L ${polyline.replaceAll(' ', ' L ')} L ${points[points.length - 1].x} ${top + innerH} Z`;
  const labelStep = Math.max(1, Math.ceil(data.length / 8));

  return (
    <Box sx={{ width: '100%', height: 245 }}>
      <svg viewBox={`0 0 ${width} ${height}`} width="100%" height="100%" aria-label="Orders by month">
        <defs>
          <linearGradient id="ordersArea" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2563EB" stopOpacity="0.16" />
            <stop offset="100%" stopColor="#2563EB" stopOpacity="0.015" />
          </linearGradient>
        </defs>
        {Array.from({ length: tickCount + 1 }).map((_, index) => {
          const ratio = index / tickCount;
          const y = top + ratio * innerH;
          const value = maxValue * (1 - ratio);
          return (
            <g key={index}>
              <line x1={left} x2={width - right} y1={y} y2={y} stroke={GRID} strokeWidth="1" />
              <text x={left - 9} y={y + 3.5} textAnchor="end" fontSize="10" fontWeight="600" fill="#8A98AA">{formatCompact(value)}</text>
            </g>
          );
        })}
        <path d={areaPath} fill="url(#ordersArea)" />
        <polyline fill="none" stroke="#2563EB" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" points={polyline} />
        {points.map((point, index) => (
          <g key={`${point.month}-${index}`}>
            <circle cx={point.x} cy={point.y} r="4.3" fill="#FFFFFF" stroke="#2563EB" strokeWidth="2.5" />
            <text x={point.x} y={Math.max(13, point.y - 11)} textAnchor="middle" fontSize="10" fontWeight="800" fill="#314A65">{formatInteger(point.count)}</text>
            {(index % labelStep === 0 || index === points.length - 1) && (
              <text x={point.x} y={height - 15} textAnchor="middle" fontSize="9.5" fontWeight="650" fill="#71849A">{point.month}</text>
            )}
          </g>
        ))}
      </svg>
    </Box>
  );
}

function BomProgressChart({ data = [], buyerName = '' }) {
  const submitted = safeNumber(data.find((item) => String(item.status || '').toLowerCase().includes('submit'))?.count);
  const draft = safeNumber(data.find((item) => String(item.status || '').toLowerCase().includes('draft'))?.count);
  const total = submitted + draft;
  if (!total) return <EmptyChart />;

  const draftPct = (draft / total) * 100;
  const submittedPct = (submitted / total) * 100;

  return (
    <Stack sx={{ minHeight: 245, justifyContent: 'center', px: 1.15 }} spacing={2.2}>
      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <Box>
          <Typography sx={{ fontSize: '0.77rem', color: '#40566E', fontWeight: 750 }}>{buyerName}</Typography>
          <Typography sx={{ mt: 0.25, fontSize: '0.68rem', color: '#8A98AA', fontWeight: 600 }}>{formatInteger(total)} BOM records</Typography>
        </Box>
        <Typography sx={{ fontSize: '0.78rem', color: TEXT, fontWeight: 800 }}>{submittedPct.toFixed(0)}% submitted</Typography>
      </Stack>

      <Box>
        <Box sx={{ position: 'relative', height: 34, borderRadius: 1.25, bgcolor: '#EFF4F8', overflow: 'hidden', display: 'flex' }}>
          <Box sx={{ width: `${draftPct}%`, bgcolor: BOM_COLORS[0], minWidth: draft > 0 ? 28 : 0, display: 'grid', placeItems: 'center' }}>
            {draft > 0 ? <Typography sx={{ color: '#FFFFFF', fontSize: '0.72rem', fontWeight: 800 }}>{formatInteger(draft)}</Typography> : null}
          </Box>
          <Box sx={{ width: `${submittedPct}%`, bgcolor: BOM_COLORS[1], minWidth: submitted > 0 ? 28 : 0, display: 'grid', placeItems: 'center' }}>
            {submitted > 0 ? <Typography sx={{ color: '#173B63', fontSize: '0.72rem', fontWeight: 800 }}>{formatInteger(submitted)}</Typography> : null}
          </Box>
        </Box>
        <Stack direction="row" justifyContent="space-between" sx={{ mt: 0.75 }}>
          <Typography sx={{ fontSize: '0.66rem', color: '#94A3B8', fontWeight: 600 }}>0</Typography>
          <Typography sx={{ fontSize: '0.66rem', color: '#94A3B8', fontWeight: 600 }}>{formatInteger(total)}</Typography>
        </Stack>
      </Box>

      <Stack direction="row" spacing={2.2} justifyContent="center" flexWrap="wrap" useFlexGap>
        {[['Draft BOM', draft, BOM_COLORS[0]], ['Submitted BOM', submitted, BOM_COLORS[1]]].map(([label, value, color]) => (
          <Stack key={label} direction="row" spacing={0.7} alignItems="center">
            <Box sx={{ width: 10, height: 10, borderRadius: 0.55, bgcolor: color }} />
            <Typography sx={{ fontSize: '0.72rem', color: '#5F738A', fontWeight: 650 }}>{label}</Typography>
            <Typography sx={{ fontSize: '0.72rem', color: TEXT, fontWeight: 800 }}>{formatInteger(value)}</Typography>
          </Stack>
        ))}
      </Stack>
    </Stack>
  );
}

function PurchaseByStyleChart({ data = [] }) {
  const rows = (data || []).slice(0, 10);
  const max = Math.max(1, ...rows.map((item) => safeNumber(item.purchaseAmountUsd)));
  if (!rows.some((item) => safeNumber(item.purchaseAmountUsd) > 0)) return <EmptyChart />;

  return (
    <Stack spacing={0.82} sx={{ minHeight: 300, justifyContent: 'center', py: 0.35 }}>
      {rows.map((item) => {
        const value = safeNumber(item.purchaseAmountUsd);
        return (
          <Box key={item.style} sx={{ display: 'grid', gridTemplateColumns: { xs: '92px minmax(0, 1fr) 72px', sm: '130px minmax(0, 1fr) 86px' }, gap: 0.9, alignItems: 'center' }}>
            <Typography title={item.style} sx={{ textAlign: 'right', minWidth: 0, fontSize: '0.7rem', color: '#50677E', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {item.style}
            </Typography>
            <Box sx={{ height: 14, bgcolor: '#EFF4F8', borderRadius: 0.7, overflow: 'hidden' }}>
              <Box sx={{ width: `${Math.max(value ? 2.5 : 0, (value / max) * 100)}%`, height: 1, bgcolor: '#2563EB', borderRadius: 0.7 }} />
            </Box>
            <Typography sx={{ fontSize: '0.7rem', fontWeight: 800, color: '#314A65', whiteSpace: 'nowrap' }}>{formatUsd(value)}</Typography>
          </Box>
        );
      })}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '92px minmax(0, 1fr) 72px', sm: '130px minmax(0, 1fr) 86px' }, gap: 0.9, alignItems: 'center', mt: 0.15 }}>
        <Box />
        <Stack direction="row" justifyContent="space-between">
          {[0, 0.25, 0.5, 0.75, 1].map((ratio) => <Typography key={ratio} sx={{ fontSize: '0.62rem', color: '#9AA8B8', fontWeight: 600 }}>{formatCompact(max * ratio)}</Typography>)}
        </Stack>
        <Box />
      </Box>
    </Stack>
  );
}

function MaterialValueChart({ data = [] }) {
  const rows = (data || []).slice(0, 8);
  const maxValue = Math.max(1, ...rows.flatMap((item) => [safeNumber(item.requiredValueUsd), safeNumber(item.stockValueUsd), safeNumber(item.purchaseValueUsd)]));
  if (!rows.some((item) => safeNumber(item.requiredValueUsd) + safeNumber(item.stockValueUsd) + safeNumber(item.purchaseValueUsd) > 0)) return <EmptyChart />;

  const width = 980;
  const height = 320;
  const left = 58;
  const right = 18;
  const top = 22;
  const bottom = 64;
  const innerW = width - left - right;
  const innerH = height - top - bottom;
  const yMax = niceMax(maxValue);
  const tickCount = 4;
  const groupWidth = innerW / rows.length;
  const barWidth = Math.min(24, groupWidth * 0.2);
  const gap = Math.min(8, groupWidth * 0.06);

  return (
    <Box>
      <Box sx={{ width: 1, height: 320 }}>
        <svg viewBox={`0 0 ${width} ${height}`} width="100%" height="100%" aria-label="Material required versus stock versus purchase">
          {Array.from({ length: tickCount + 1 }).map((_, index) => {
            const ratio = index / tickCount;
            const y = top + ratio * innerH;
            const value = yMax * (1 - ratio);
            return (
              <g key={index}>
                <line x1={left} x2={width - right} y1={y} y2={y} stroke={GRID} strokeWidth="1" />
                <text x={left - 9} y={y + 3.5} textAnchor="end" fontSize="10" fontWeight="600" fill="#8A98AA">{formatCompact(value)}</text>
              </g>
            );
          })}

          {rows.map((item, rowIndex) => {
            const values = [safeNumber(item.requiredValueUsd), safeNumber(item.stockValueUsd), safeNumber(item.purchaseValueUsd)];
            const center = left + groupWidth * rowIndex + groupWidth / 2;
            const totalBarsWidth = barWidth * 3 + gap * 2;
            const startX = center - totalBarsWidth / 2;
            return (
              <g key={item.materialType}>
                {values.map((value, index) => {
                  const barHeight = (value / yMax) * innerH;
                  const x = startX + index * (barWidth + gap);
                  const y = top + innerH - barHeight;
                  return (
                    <g key={index}>
                      <rect x={x} y={y} width={barWidth} height={barHeight} rx="3" fill={MATERIAL_COLORS[index]} />
                      {value > 0 && barHeight > 22 ? (
                        <text x={x + barWidth / 2} y={Math.max(top + 11, y - 5)} textAnchor="middle" fontSize="9" fontWeight="700" fill="#40566E">{formatCompact(value)}</text>
                      ) : null}
                    </g>
                  );
                })}
                <text x={center} y={height - 27} textAnchor="middle" fontSize="9.5" fontWeight="650" fill="#5F738A">
                  {String(item.materialType || '').length > 14 ? `${String(item.materialType).slice(0, 12)}…` : item.materialType}
                </text>
              </g>
            );
          })}
        </svg>
      </Box>
      <Stack direction="row" spacing={2.2} justifyContent="center" flexWrap="wrap" useFlexGap sx={{ mt: -1.1 }}>
        {['Required Value (USD)', 'Stock Value (USD)', 'Purchase Value (USD)'].map((label, index) => (
          <Stack key={label} direction="row" spacing={0.65} alignItems="center">
            <Box sx={{ width: 10, height: 10, borderRadius: 0.5, bgcolor: MATERIAL_COLORS[index] }} />
            <Typography sx={{ fontSize: '0.7rem', color: '#60758C', fontWeight: 650 }}>{label}</Typography>
          </Stack>
        ))}
      </Stack>
    </Box>
  );
}

const initialData = {
  totalOrders: 0,
  completedOrders: 0,
  inProgressOrders: 0,
  notStartedOrders: 0,
  totalBoms: 0,
  materialsNeedPurchase: 0,
  purchaseAmountUsd: 0,
  seasons: [],
  styles: [],
  orderProgress: [],
  ordersByMonth: [],
  bomProgress: [],
  purchaseByStyle: [],
  materialValues: []
};

export default function DashboardPage() {
  const [buyers, setBuyers] = useState(() => getAccessibleBuyers());
  const initialFilters = useMemo(() => ({
    buyerKey: getDefaultBuyerKey() || getAccessibleBuyers()?.[0]?.buyerKey || 'LLBEAN',
    fromDate: '',
    toDate: '',
    season: '',
    style: ''
  }), []);
  const [filters, setFilters] = useState(initialFilters);
  const [data, setData] = useState(initialData);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState({ open: false, severity: 'error', message: '' });

  useEffect(() => {
    let active = true;
    const loadBuyers = async () => {
      try {
        const result = await listAccessibleBuyers();
        const rows = Array.isArray(result) ? result : Array.isArray(result?.data) ? result.data : [];
        if (!active || !rows.length) return;
        const normalized = rows.filter((item) => item?.active !== false).map((item) => ({
          buyerKey: item.buyerKey,
          buyerName: item.buyerName || item.buyerKey,
          sequence: Number(item.sequence || 0)
        }));
        setBuyers(normalized);
        setFilters((current) => ({ ...current, buyerKey: current.buyerKey || normalized[0]?.buyerKey || 'LLBEAN' }));
      } catch {
        // Keep local login buyer definitions as fallback.
      }
    };
    loadBuyers();
    return () => { active = false; };
  }, []);

  const load = useCallback(async (nextFilters = filters) => {
    if (!nextFilters.buyerKey) return;
    if (nextFilters.fromDate && nextFilters.toDate && nextFilters.fromDate > nextFilters.toDate) {
      setNotice({ open: true, severity: 'warning', message: 'From Date must be before To Date.' });
      return;
    }
    setLoading(true);
    try {
      const result = await getDashboardSummary({
        buyerKey: nextFilters.buyerKey,
        ...(nextFilters.fromDate ? { fromDate: nextFilters.fromDate } : {}),
        ...(nextFilters.toDate ? { toDate: nextFilters.toDate } : {}),
        ...(nextFilters.season ? { season: nextFilters.season } : {}),
        ...(nextFilters.style ? { style: nextFilters.style } : {})
      });
      setData({ ...initialData, ...(result || {}) });
    } catch (error) {
      setNotice({ open: true, severity: 'error', message: getDashboardError(error) });
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    load();
    // Initial load only; subsequent changes are applied through the filter action.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const buyerName = useMemo(() => buyers.find((item) => item.buyerKey === filters.buyerKey)?.buyerName || filters.buyerKey, [buyers, filters.buyerKey]);
  const totalOrders = safeNumber(data.totalOrders);
  const completedPct = percentage(data.completedOrders, totalOrders);
  const inProgressPct = percentage(data.inProgressOrders, totalOrders);
  const notStartedPct = percentage(data.notStartedOrders, totalOrders);

  const resetFilters = () => {
    const next = { ...initialFilters, buyerKey: filters.buyerKey || initialFilters.buyerKey };
    setFilters(next);
    load(next);
  };

  return (
    <Box sx={{ p: { xs: 0.75, sm: 1, md: 1.15 } }}>
      <Paper elevation={0} sx={{ p: 1.15, border: '1px solid #E2E8F0', borderRadius: 2.25, bgcolor: '#FFFFFF', mb: 1.1, boxShadow: '0 4px 18px rgba(22, 56, 93, 0.03)' }}>
        <Stack direction={{ xs: 'column', xl: 'row' }} spacing={0.9} alignItems={{ xs: 'stretch', xl: 'center' }}>
          <TextField
            select
            size="small"
            label="Buyer"
            value={filters.buyerKey}
            onChange={(event) => setFilters((current) => ({ ...current, buyerKey: event.target.value, season: '', style: '' }))}
            sx={{ minWidth: { xs: '100%', xl: 180 } }}
          >
            {buyers.map((buyer) => <MenuItem key={buyer.buyerKey} value={buyer.buyerKey}>{buyer.buyerName}</MenuItem>)}
          </TextField>
          <TextField
            select
            size="small"
            label="Season"
            value={filters.season}
            onChange={(event) => setFilters((current) => ({ ...current, season: event.target.value }))}
            sx={{ minWidth: { xs: '100%', xl: 145 } }}
          >
            <MenuItem value="">All</MenuItem>
            {(data.seasons || []).map((item) => <MenuItem key={item} value={item}>{item}</MenuItem>)}
          </TextField>
          <TextField
            select
            size="small"
            label="Style"
            value={filters.style}
            onChange={(event) => setFilters((current) => ({ ...current, style: event.target.value }))}
            sx={{ minWidth: { xs: '100%', xl: 190 }, flex: { xl: 1 } }}
          >
            <MenuItem value="">All</MenuItem>
            {(data.styles || []).map((item) => <MenuItem key={item} value={item}>{item}</MenuItem>)}
          </TextField>
          <TextField
            size="small"
            label="From Date"
            type="date"
            value={filters.fromDate}
            onChange={(event) => setFilters((current) => ({ ...current, fromDate: event.target.value }))}
            InputLabelProps={{ shrink: true }}
            sx={{ minWidth: { xs: '100%', xl: 150 } }}
          />
          <TextField
            size="small"
            label="To Date"
            type="date"
            value={filters.toDate}
            onChange={(event) => setFilters((current) => ({ ...current, toDate: event.target.value }))}
            InputLabelProps={{ shrink: true }}
            sx={{ minWidth: { xs: '100%', xl: 150 } }}
          />
          <Button
            variant="contained"
            startIcon={loading ? <CircularProgress size={15} color="inherit" /> : <RefreshOutlined />}
            disabled={loading}
            onClick={() => load(filters)}
            sx={{ minHeight: 40, px: 2.1, textTransform: 'none', fontWeight: 750, whiteSpace: 'nowrap' }}
          >
            Apply
          </Button>
          <Button
            variant="outlined"
            startIcon={<RestartAltOutlined />}
            disabled={loading}
            onClick={resetFilters}
            sx={{ minHeight: 40, px: 1.6, textTransform: 'none', fontWeight: 700, whiteSpace: 'nowrap' }}
          >
            Reset
          </Button>
        </Stack>
      </Paper>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))', xl: 'repeat(5, minmax(0, 1fr))' }, gap: 1.05, mb: 1.1 }}>
        <KpiCard label="Total Orders" value={formatInteger(data.totalOrders)} icon={DescriptionOutlined} helper={`${formatInteger(data.totalBoms)} BOM records`} />
        <KpiCard label="Completed" value={formatInteger(data.completedOrders)} icon={AssignmentTurnedInOutlined} tone="#22A06B" helper={`${completedPct.toFixed(1)}% of total`} />
        <KpiCard label="In Progress" value={formatInteger(data.inProgressOrders)} icon={AutorenewOutlined} tone="#F59E0B" helper={`${inProgressPct.toFixed(1)}% of total`} />
        <KpiCard label="Not Started" value={formatInteger(data.notStartedOrders)} icon={ScheduleOutlined} tone="#EF5B5B" helper={`${notStartedPct.toFixed(1)}% of total`} />
        <KpiCard label="Purchase Amount (USD)" value={formatUsd(data.purchaseAmountUsd)} icon={PaidOutlined} tone="#7C3AED" helper={`${formatInteger(data.materialsNeedPurchase)} materials need purchase`} />
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', xl: 'repeat(12, minmax(0, 1fr))' }, gap: 1.05 }}>
        <ChartCard title="1. Order Progress" subtitle="Status distribution" sx={{ gridColumn: { xl: 'span 4' } }}>
          <DonutChart data={data.orderProgress} />
        </ChartCard>
        <ChartCard title="2. Orders by Month" subtitle={`Orders created · ${buyerName}`} sx={{ gridColumn: { xl: 'span 4' } }}>
          <LineChart data={data.ordersByMonth} />
        </ChartCard>
        <ChartCard title="3. BOM Progress" subtitle="Draft vs Submitted" sx={{ gridColumn: { xl: 'span 4' } }}>
          <BomProgressChart data={data.bomProgress} buyerName={buyerName} />
        </ChartCard>
        <ChartCard title="4. Purchase Amount by Style (USD)" subtitle="Top 10 styles by purchase amount" sx={{ gridColumn: { xl: 'span 5' } }}>
          <PurchaseByStyleChart data={data.purchaseByStyle} />
        </ChartCard>
        <ChartCard title="5. Material Required vs Stock vs Purchase (USD)" subtitle="Comparison by material type" sx={{ gridColumn: { xl: 'span 7' } }}>
          <MaterialValueChart data={data.materialValues} />
        </ChartCard>
      </Box>

      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" spacing={0.7} sx={{ mt: 1.05, px: 0.4 }}>
        <Typography sx={{ color: '#8A98AA', fontSize: '0.67rem', fontWeight: 600 }}>All monetary values are shown in USD.</Typography>
        <Typography sx={{ color: '#8A98AA', fontSize: '0.67rem', fontWeight: 600 }}>Charts reflect the current dashboard filters.</Typography>
      </Stack>

      <Snackbar open={notice.open} autoHideDuration={3500} onClose={() => setNotice((current) => ({ ...current, open: false }))}>
        <Alert severity={notice.severity} variant="filled">{notice.message}</Alert>
      </Snackbar>
    </Box>
  );
}
