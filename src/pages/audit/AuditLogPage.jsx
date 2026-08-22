import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
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
  TablePagination,
  TableRow,
  TextField,
  Tooltip,
  Typography
} from '@mui/material';
import { Refresh, RestartAlt, Search, VisibilityOutlined } from '@mui/icons-material';
import { listAuditLogs } from '../../services/auditLogService';
import { listBuyers } from '../../services/buyerService';
import StatusBadge from '../../components/StatusBadge';
import SortableTableCell from '../../components/SortableTableCell';

const emptyFilters = {
  keyword: '',
  username: '',
  action: '',
  buyerKey: '',
  module: '',
  status: '',
  httpMethod: '',
  from: '',
  to: ''
};

const modules = ['USER', 'DEPARTMENT', 'BUYER', 'ORDER', 'BOM', 'MPR', 'CURRENCY', 'VENDOR_CODE', 'MAT_INFO', 'MATERIAL_SHIP_TO', 'LOSS', 'SHIP_TO', 'PRODUCT_COLOR', 'FILE', 'SYSTEM'];
const actions = ['ADD', 'EDIT', 'DELETE'];
const methods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];

const formatDateTime = (value) => {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString('vi-VN');
};

const requestDateValue = (value) => value ? `${value}:00` : '';
const readable = (value) => String(value || '—').replaceAll('_', ' ');
const isSuccessful = (row = {}) => row.status ? row.status === 'SUCCESS' : (row.httpStatus ? Number(row.httpStatus) < 400 : true);

const fileSize = (value) => {
  const size = Number(value || 0);
  if (!size) return '—';
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / 1024 / 1024).toFixed(2)} MB`;
};

export default function AuditLogPage() {
  const [filters, setFilters] = useState(emptyFilters);
  const [appliedFilters, setAppliedFilters] = useState(emptyFilters);
  const [rows, setRows] = useState([]);
  const [buyers, setBuyers] = useState([]);
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(25);
  const [total, setTotal] = useState(0);
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortDirection, setSortDirection] = useState('desc');
  const [loading, setLoading] = useState(false);
  const [detail, setDetail] = useState(null);
  const [notice, setNotice] = useState({ open: false, severity: 'error', message: '' });
  const tableColumns = [
    { label: 'No.', sortable: false },
    { label: 'Time', key: 'createdAt' },
    { label: 'User', key: 'user' },
    { label: 'Buyer', key: 'buyerKey' },
    { label: 'Module', key: 'module' },
    { label: 'Action', key: 'action' },
    { label: 'Result', key: 'result' },
    { label: 'Resource / File', key: 'resource' },
    { label: 'Duration', key: 'durationMs' },
    { label: 'Details', sortable: false }
  ];

  useEffect(() => {
    let active = true;
    listBuyers()
      .then((data) => {
        if (!active) return;
        const next = Array.isArray(data) ? data : Array.isArray(data?.content) ? data.content : [];
        setBuyers(next.filter((item) => item?.buyerKey));
      })
      .catch(() => {
        if (active) setBuyers([]);
      });
    return () => { active = false; };
  }, []);

  const buyerLabel = (buyerKey) => {
    if (!buyerKey) return 'SYSTEM / GLOBAL';
    const buyer = buyers.find((item) => item.buyerKey === buyerKey);
    return buyer?.buyerName ? `${buyer.buyerName} (${buyerKey})` : buyerKey;
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await listAuditLogs({
        ...appliedFilters,
        from: requestDateValue(appliedFilters.from),
        to: requestDateValue(appliedFilters.to),
        page,
        size,
        sortBy,
        sortDir: sortDirection
      });
      setRows(Array.isArray(response?.content) ? response.content : []);
      setTotal(Number(response?.totalElements || 0));
    } catch (error) {
      setNotice({ open: true, severity: 'error', message: error?.response?.data?.message || error?.message || 'Unable to load audit logs.' });
    } finally {
      setLoading(false);
    }
  }, [appliedFilters, page, size, sortBy, sortDirection]);

  useEffect(() => { load(); }, [load]);

  const handleSort = useCallback((key) => {
    if (!key) return;
    setPage(0);
    if (sortBy === key) {
      setSortDirection((current) => current === 'asc' ? 'desc' : 'asc');
      return;
    }
    setSortBy(key);
    setSortDirection('asc');
  }, [sortBy]);

  const apply = () => {
    setPage(0);
    setAppliedFilters({ ...filters });
  };

  const reset = () => {
    setPage(0);
    setFilters(emptyFilters);
    setAppliedFilters(emptyFilters);
  };

  const updateFilter = (key, value) => setFilters((current) => ({ ...current, [key]: value }));

  return (
    <Box>
      <Paper
        elevation={0}
        sx={{
          p: 1.25,
          border: '1px solid #e5e7eb',
          borderRadius: 2,
          mb: 1,
          backgroundColor: '#fff'
        }}
      >
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: 'repeat(6, minmax(0, 1fr))', lg: 'repeat(18, minmax(0, 1fr))' },
            gap: 1,
            alignItems: 'center',
            '& .MuiTextField-root': { minWidth: 0 },
            '& .MuiInputBase-root': { height: 40, backgroundColor: '#fff' }
          }}
        >
          <TextField
            size="small"
            label="Keyword"
            value={filters.keyword}
            onChange={(event) => updateFilter('keyword', event.target.value)}
            onKeyDown={(event) => event.key === 'Enter' && apply()}
            placeholder="Resource ID, endpoint, file..."
            sx={{ gridColumn: { xs: '1 / -1', sm: 'span 3', lg: 'span 4' } }}
          />
          <TextField
            size="small"
            label="User / Email"
            value={filters.username}
            onChange={(event) => updateFilter('username', event.target.value)}
            sx={{ gridColumn: { xs: '1 / -1', sm: 'span 3', lg: 'span 4' } }}
          />
          <TextField
            size="small"
            select
            label="Buyer"
            value={filters.buyerKey}
            onChange={(event) => updateFilter('buyerKey', event.target.value)}
            sx={{ gridColumn: { xs: '1 / -1', sm: 'span 2', lg: 'span 4' } }}
          >
            <MenuItem value="">All Buyers</MenuItem>
            {buyers.map((item) => <MenuItem key={item.buyerKey} value={item.buyerKey}>{item.buyerName || item.buyerKey} ({item.buyerKey})</MenuItem>)}
          </TextField>
          <TextField
            size="small"
            select
            label="Module"
            value={filters.module}
            onChange={(event) => updateFilter('module', event.target.value)}
            sx={{ gridColumn: { xs: '1 / -1', sm: 'span 2', lg: 'span 3' } }}
          >
            <MenuItem value="">All Modules</MenuItem>
            {modules.map((item) => <MenuItem key={item} value={item}>{readable(item)}</MenuItem>)}
          </TextField>
          <TextField
            size="small"
            select
            label="Action"
            value={filters.action}
            onChange={(event) => updateFilter('action', event.target.value)}
            sx={{ gridColumn: { xs: '1 / -1', sm: 'span 2', lg: 'span 3' } }}
          >
            <MenuItem value="">All Actions</MenuItem>
            {actions.map((item) => <MenuItem key={item} value={item}>{readable(item)}</MenuItem>)}
          </TextField>

          <TextField
            size="small"
            select
            label="Result"
            value={filters.status}
            onChange={(event) => updateFilter('status', event.target.value)}
            sx={{ gridColumn: { xs: '1 / -1', sm: 'span 3', lg: 'span 2' } }}
          >
            <MenuItem value="">All Results</MenuItem>
            <MenuItem value="SUCCESS">Success</MenuItem>
            <MenuItem value="FAILED">Failed</MenuItem>
          </TextField>
          <TextField
            size="small"
            select
            label="HTTP Method"
            value={filters.httpMethod}
            onChange={(event) => updateFilter('httpMethod', event.target.value)}
            sx={{ gridColumn: { xs: '1 / -1', sm: 'span 3', lg: 'span 2' } }}
          >
            <MenuItem value="">All Methods</MenuItem>
            {methods.map((item) => <MenuItem key={item} value={item}>{item}</MenuItem>)}
          </TextField>
          <TextField
            size="small"
            type="datetime-local"
            label="From"
            value={filters.from}
            onChange={(event) => updateFilter('from', event.target.value)}
            InputLabelProps={{ shrink: true }}
            sx={{ gridColumn: { xs: '1 / -1', sm: 'span 3', lg: 'span 4' } }}
          />
          <TextField
            size="small"
            type="datetime-local"
            label="To"
            value={filters.to}
            onChange={(event) => updateFilter('to', event.target.value)}
            InputLabelProps={{ shrink: true }}
            sx={{ gridColumn: { xs: '1 / -1', sm: 'span 3', lg: 'span 4' } }}
          />
          <Stack
            direction="row"
            spacing={0.75}
            justifyContent="flex-end"
            sx={{ gridColumn: { xs: '1 / -1', sm: '1 / -1', lg: 'span 6' }, minWidth: 0 }}
          >
            <Button
              variant="outlined"
              startIcon={<Refresh fontSize="small" />}
              onClick={load}
              disabled={loading}
              sx={{ textTransform: 'none', height: 40, minWidth: 0, flex: { xs: 1, sm: '0 0 auto' }, px: 1.25 }}
            >
              Refresh
            </Button>
            <Button
              variant="outlined"
              startIcon={<RestartAlt fontSize="small" />}
              onClick={reset}
              disabled={loading}
              sx={{ textTransform: 'none', height: 40, minWidth: 0, flex: { xs: 1, sm: '0 0 auto' }, px: 1.25 }}
            >
              Reset
            </Button>
            <Button
              variant="contained"
              startIcon={<Search fontSize="small" />}
              onClick={apply}
              disabled={loading}
              sx={{
                textTransform: 'none',
                height: 40,
                minWidth: 0,
                flex: { xs: 1, sm: '0 0 auto' },
                px: 1.5,
                backgroundColor: '#103B5C',
                '&:hover': { backgroundColor: '#0B2F4A' }
              }}
            >
              Search
            </Button>
          </Stack>
        </Box>
      </Paper>

      <Paper elevation={0} sx={{ border: '1px solid #e5e7eb', borderRadius: 2, overflow: 'hidden' }}>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                {tableColumns.map((column) => (
                  <SortableTableCell
                    key={column.label}
                    label={column.label}
                    columnKey={column.key}
                    sortable={column.sortable !== false}
                    sortKey={sortBy}
                    sortDirection={sortDirection}
                    onSort={handleSort}
                    sx={{ fontWeight: 750, backgroundColor: '#f8fafc', whiteSpace: 'nowrap' }}
                  />
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {loading && <TableRow><TableCell colSpan={10}>Loading audit logs...</TableCell></TableRow>}
              {!loading && rows.length === 0 && <TableRow><TableCell colSpan={10} align="center" sx={{ py: 5, color: 'text.secondary' }}>No audit logs match the current filters.</TableCell></TableRow>}
              {!loading && rows.map((row, index) => (
                <TableRow hover key={row.id || row.requestId}>
                  <TableCell align="center" sx={{ width: 56, color: '#64748b', fontWeight: 650 }}>{page * size + index + 1}</TableCell>
                  <TableCell sx={{ whiteSpace: 'nowrap' }}>{formatDateTime(row.createdAt)}</TableCell>
                  <TableCell>
                    <Typography sx={{ fontSize: '0.78rem', fontWeight: 700 }}>{row.username || row.userEmail || 'ANONYMOUS'}</Typography>
                    <Typography sx={{ fontSize: '0.7rem', color: 'text.secondary' }}>{row.userEmail || '—'}</Typography>
                  </TableCell>
                  <TableCell sx={{ whiteSpace: 'nowrap' }}>
                    {row.buyerKey ? <Chip size="small" label={buyerLabel(row.buyerKey)} variant="outlined" /> : <Typography sx={{ fontSize: '0.72rem', color: 'text.secondary' }}>SYSTEM / GLOBAL</Typography>}
                  </TableCell>
                  <TableCell><Chip size="small" label={readable(row.module)} variant="outlined" /></TableCell>
                  <TableCell>
                    <Typography sx={{ fontSize: '0.76rem', fontWeight: 700 }}>{readable(row.action)}</Typography>
                    <Typography sx={{ fontSize: '0.68rem', color: 'text.secondary' }}>{row.httpMethod || '—'}</Typography>
                  </TableCell>
                  <TableCell><StatusBadge status={isSuccessful(row) ? 'SUCCESS' : 'FAILED'} /></TableCell>
                  <TableCell sx={{ maxWidth: 260 }}>
                    <Typography noWrap sx={{ fontSize: '0.76rem', fontWeight: 700 }}>{row.resourceId || row.fileName || '—'}</Typography>
                    <Typography noWrap sx={{ fontSize: '0.68rem', color: 'text.secondary' }}>{row.fileName || row.endpoint || '—'}</Typography>
                  </TableCell>
                  <TableCell sx={{ whiteSpace: 'nowrap' }}>{Number(row.durationMs || 0).toLocaleString()} ms</TableCell>
                  <TableCell>
                    <Tooltip title="View audit details"><IconButton size="small" onClick={() => setDetail(row)}><VisibilityOutlined fontSize="small" /></IconButton></Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          component="div"
          count={total}
          page={page}
          rowsPerPage={size}
          rowsPerPageOptions={[10, 25, 50, 100]}
          onPageChange={(_, nextPage) => setPage(nextPage)}
          onRowsPerPageChange={(event) => { setSize(Number(event.target.value)); setPage(0); }}
        />
      </Paper>

      <Dialog open={Boolean(detail)} onClose={() => setDetail(null)} fullWidth maxWidth="md">
        <DialogTitle sx={{ fontWeight: 750, color: '#103B5C' }}>Audit Log Details</DialogTitle>
        <DialogContent dividers>
          {detail && (
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))' }, gap: 1.25 }}>
              {[
                ['Time', formatDateTime(detail.createdAt)],
                ['User', detail.username || '—'],
                ['Email', detail.userEmail || '—'],
                ['Role', detail.role || '—'],
                ['Buyer', buyerLabel(detail.buyerKey)],
                ['Module', readable(detail.module)],
                ['Action', readable(detail.action)],
                ['Result', `${detail.status || '—'} · HTTP ${detail.httpStatus ?? '—'}`],
                ['Duration', `${Number(detail.durationMs || 0).toLocaleString()} ms`],
                ['Resource Type', readable(detail.resourceType)],
                ['Resource ID', detail.resourceId || '—'],
                ['File', detail.fileName ? `${detail.fileName} (${fileSize(detail.fileSize)})` : '—'],
                ['Method', detail.httpMethod || '—'],
                ['Endpoint', detail.endpoint || '—'],
                ['Query', detail.queryString || '—'],
                ['IP Address', detail.ipAddress || '—'],
                ['Request ID', detail.requestId || '—'],
                ['Description', detail.description || '—']
              ].map(([label, value]) => (
                <Box key={label} sx={{ p: 1.1, border: '1px solid #e5e7eb', borderRadius: 1.25, gridColumn: ['Endpoint', 'Query', 'Description'].includes(label) ? { sm: '1 / -1' } : undefined }}>
                  <Typography sx={{ fontSize: '0.68rem', fontWeight: 750, color: '#64748b', textTransform: 'uppercase' }}>{label}</Typography>
                  <Typography sx={{ mt: 0.25, fontSize: '0.8rem', wordBreak: 'break-word' }}>{value}</Typography>
                </Box>
              ))}
            </Box>
          )}
        </DialogContent>
        <DialogActions><Button onClick={() => setDetail(null)} sx={{ textTransform: 'none' }}>Close</Button></DialogActions>
      </Dialog>

      <Snackbar open={notice.open} autoHideDuration={4000} onClose={() => setNotice((current) => ({ ...current, open: false }))}>
        <Alert severity={notice.severity} variant="filled">{notice.message}</Alert>
      </Snackbar>
    </Box>
  );
}
