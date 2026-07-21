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

const emptyFilters = {
  keyword: '',
  username: '',
  action: '',
  module: '',
  status: '',
  httpMethod: '',
  from: '',
  to: ''
};

const modules = ['USER', 'DEPARTMENT', 'BUYER', 'ORDER', 'BOM', 'MPR', 'CURRENCY', 'VENDOR_CODE', 'MAT_INFO', 'LOSS', 'SHIP_TO', 'PRODUCT_COLOR', 'FILE', 'SYSTEM'];
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
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(25);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [detail, setDetail] = useState(null);
  const [notice, setNotice] = useState({ open: false, severity: 'error', message: '' });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await listAuditLogs({
        ...appliedFilters,
        from: requestDateValue(appliedFilters.from),
        to: requestDateValue(appliedFilters.to),
        page,
        size
      });
      setRows(Array.isArray(response?.content) ? response.content : []);
      setTotal(Number(response?.totalElements || 0));
    } catch (error) {
      setNotice({ open: true, severity: 'error', message: error?.response?.data?.message || error?.message || 'Unable to load audit logs.' });
    } finally {
      setLoading(false);
    }
  }, [appliedFilters, page, size]);

  useEffect(() => { load(); }, [load]);

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
      <Paper elevation={0} sx={{ p: 2, border: '1px solid #e5e7eb', borderRadius: 2, mb: 2 }}>
        <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" spacing={1.5}>
          <Box>
            <Typography sx={{ fontWeight: 900, color: '#103B5C', fontSize: '1.05rem' }}>Add / Edit / Delete Logs</Typography>
            <Typography sx={{ mt: 0.2, fontSize: '0.8rem', color: 'text.secondary' }}>
              Track only who added, edited or deleted data, when it happened, the affected module and the result.
            </Typography>
          </Box>
          <Button startIcon={<Refresh />} onClick={load} disabled={loading} sx={{ textTransform: 'none' }}>Refresh</Button>
        </Stack>
      </Paper>

      <Paper elevation={0} sx={{ p: 1.5, border: '1px solid #e5e7eb', borderRadius: 2, mb: 2 }}>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(4, minmax(0, 1fr))' }, gap: 1 }}>
          <TextField size="small" label="Keyword" value={filters.keyword} onChange={(event) => updateFilter('keyword', event.target.value)} onKeyDown={(event) => event.key === 'Enter' && apply()} placeholder="Resource ID, endpoint, file..." />
          <TextField size="small" label="User / Email" value={filters.username} onChange={(event) => updateFilter('username', event.target.value)} />
          <TextField size="small" select label="Module" value={filters.module} onChange={(event) => updateFilter('module', event.target.value)}>
            <MenuItem value="">All Modules</MenuItem>
            {modules.map((item) => <MenuItem key={item} value={item}>{readable(item)}</MenuItem>)}
          </TextField>
          <TextField size="small" select label="Action" value={filters.action} onChange={(event) => updateFilter('action', event.target.value)}>
            <MenuItem value="">All Actions</MenuItem>
            {actions.map((item) => <MenuItem key={item} value={item}>{readable(item)}</MenuItem>)}
          </TextField>
          <TextField size="small" select label="Result" value={filters.status} onChange={(event) => updateFilter('status', event.target.value)}>
            <MenuItem value="">All Results</MenuItem>
            <MenuItem value="SUCCESS">Success</MenuItem>
            <MenuItem value="FAILED">Failed</MenuItem>
          </TextField>
          <TextField size="small" select label="HTTP Method" value={filters.httpMethod} onChange={(event) => updateFilter('httpMethod', event.target.value)}>
            <MenuItem value="">All Methods</MenuItem>
            {methods.map((item) => <MenuItem key={item} value={item}>{item}</MenuItem>)}
          </TextField>
          <TextField size="small" type="datetime-local" label="From" value={filters.from} onChange={(event) => updateFilter('from', event.target.value)} InputLabelProps={{ shrink: true }} />
          <TextField size="small" type="datetime-local" label="To" value={filters.to} onChange={(event) => updateFilter('to', event.target.value)} InputLabelProps={{ shrink: true }} />
        </Box>
        <Stack direction="row" spacing={1} justifyContent="flex-end" sx={{ mt: 1.25 }}>
          <Button variant="outlined" startIcon={<RestartAlt />} onClick={reset} disabled={loading} sx={{ textTransform: 'none' }}>Reset</Button>
          <Button variant="contained" startIcon={<Search />} onClick={apply} disabled={loading} sx={{ textTransform: 'none', backgroundColor: '#103B5C' }}>Search</Button>
        </Stack>
      </Paper>

      <Paper elevation={0} sx={{ border: '1px solid #e5e7eb', borderRadius: 2, overflow: 'hidden' }}>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                {['Time', 'User', 'Module', 'Action', 'Result', 'Resource / File', 'Duration', 'Details'].map((heading) => (
                  <TableCell key={heading} sx={{ fontWeight: 900, backgroundColor: '#f8fafc', whiteSpace: 'nowrap' }}>{heading}</TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {loading && <TableRow><TableCell colSpan={8}>Loading audit logs...</TableCell></TableRow>}
              {!loading && rows.length === 0 && <TableRow><TableCell colSpan={8} align="center" sx={{ py: 5, color: 'text.secondary' }}>No audit logs match the current filters.</TableCell></TableRow>}
              {!loading && rows.map((row) => (
                <TableRow hover key={row.id || row.requestId}>
                  <TableCell sx={{ whiteSpace: 'nowrap' }}>{formatDateTime(row.createdAt)}</TableCell>
                  <TableCell>
                    <Typography sx={{ fontSize: '0.78rem', fontWeight: 800 }}>{row.username || row.userEmail || 'ANONYMOUS'}</Typography>
                    <Typography sx={{ fontSize: '0.7rem', color: 'text.secondary' }}>{row.userEmail || '—'}</Typography>
                  </TableCell>
                  <TableCell><Chip size="small" label={readable(row.module)} variant="outlined" /></TableCell>
                  <TableCell>
                    <Typography sx={{ fontSize: '0.76rem', fontWeight: 800 }}>{readable(row.action)}</Typography>
                    <Typography sx={{ fontSize: '0.68rem', color: 'text.secondary' }}>{row.httpMethod || '—'}</Typography>
                  </TableCell>
                  <TableCell><Chip size="small" color={isSuccessful(row) ? 'success' : 'error'} label={isSuccessful(row) ? 'Success' : 'Failed'} /></TableCell>
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
        <DialogTitle sx={{ fontWeight: 900, color: '#103B5C' }}>Audit Log Details</DialogTitle>
        <DialogContent dividers>
          {detail && (
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))' }, gap: 1.25 }}>
              {[
                ['Time', formatDateTime(detail.createdAt)],
                ['User', detail.username || '—'],
                ['Email', detail.userEmail || '—'],
                ['Role', detail.role || '—'],
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
                  <Typography sx={{ fontSize: '0.68rem', fontWeight: 900, color: '#64748b', textTransform: 'uppercase' }}>{label}</Typography>
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
