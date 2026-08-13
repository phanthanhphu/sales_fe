import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Paper,
  Snackbar,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Typography
} from '@mui/material';
import {
  ArrowDownward,
  ArrowUpward,
  Delete,
  Edit,
  Inbox as InboxIcon,
  Refresh
} from '@mui/icons-material';
import SockJS from 'sockjs-client';
import { Client } from '@stomp/stompjs';
import { API_BASE_URL } from '../../config';
import AddDepartmentDialog from './AddDepartmentDialog';
import EditDepartmentDialog from './EditDepartmentDialog';
import DepartmentSearch from './DepartmentSearch';
import { PaginationBar } from '../shared/MasterDataTable';

const API_URL = `${API_BASE_URL}/api/departments`;
const MANAGE_MESSAGE = 'Only Admin or IT department users can add, edit, or delete departments.';

const normalizeText = (value) => String(value || '')
  .trim()
  .toUpperCase()
  .replace(/[_-]+/g, ' ')
  .replace(/\s+/g, ' ');

const isAdminRole = (role) => Array.isArray(role)
  ? role.some(isAdminRole)
  : ['ADMIN', 'ROLE ADMIN', 'ROLE_ADMIN'].includes(normalizeText(role));

const isItDepartmentName = (value) => {
  const text = normalizeText(value);
  return text === 'IT'
    || text === 'IT DEPARTMENT'
    || text === 'INFORMATION TECHNOLOGY'
    || text === 'INFORMATION TECHNOLOGY DEPARTMENT'
    || /(^|\s)IT(\s|$)/.test(text);
};

const parseStored = (value) => {
  try {
    return JSON.parse(value || '{}') || {};
  } catch {
    return {};
  }
};

const currentUser = () => parseStored(localStorage.getItem('user'));

const canUseDepartmentAdmin = (user = {}) => isAdminRole(user.role || user.roles)
  || [
    user.departmentName,
    user.division,
    user.department?.departmentName,
    user.department?.name
  ].some(isItDepartmentName);

const formatDate = (value) => {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString();
};

const SortIndicator = ({ active, direction }) => {
  if (!active) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', ml: 0.25, lineHeight: 0 }}>
        <ArrowUpward sx={{ fontSize: '0.7rem', color: '#9ca3af' }} />
        <ArrowDownward sx={{ fontSize: '0.7rem', color: '#9ca3af', mt: '-4px' }} />
      </Box>
    );
  }

  return direction === 'asc' ? (
    <Box sx={{ display: 'flex', flexDirection: 'column', ml: 0.25, lineHeight: 0 }}>
      <ArrowUpward sx={{ fontSize: '0.85rem', color: '#4b5563' }} />
      <ArrowDownward sx={{ fontSize: '0.7rem', color: '#d1d5db', mt: '-4px' }} />
    </Box>
  ) : (
    <Box sx={{ display: 'flex', flexDirection: 'column', ml: 0.25, lineHeight: 0 }}>
      <ArrowUpward sx={{ fontSize: '0.7rem', color: '#d1d5db' }} />
      <ArrowDownward sx={{ fontSize: '0.85rem', color: '#4b5563', mt: '-4px' }} />
    </Box>
  );
};

export default function DepartmentManagement() {
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [canManage, setCanManage] = useState(() => canUseDepartmentAdmin(currentUser()));
  const [searchDivision, setSearchDivision] = useState('');
  const [searchDeptName, setSearchDeptName] = useState('');
  const [appliedFilters, setAppliedFilters] = useState({ division: '', departmentName: '' });
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [totalRows, setTotalRows] = useState(0);
  const [sortConfig, setSortConfig] = useState({ key: 'createdAt', direction: 'desc' });
  const [selectedDepartment, setSelectedDepartment] = useState(null);
  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [notice, setNotice] = useState({ open: false, message: '', severity: 'success' });
  const refreshRef = useRef(null);

  const fetchDepartments = useCallback(async (filters = {}, options = {}) => {
    const requestedPage = Number.isInteger(options.page) ? Math.max(0, options.page) : page;
    const requestedSize = Number.isInteger(options.size) ? Math.max(1, options.size) : rowsPerPage;
    const requestedSort = options.sort || sortConfig;
    if (!options.silent) setLoading(true);

    try {
      const user = currentUser();
      const userId = user.id || user.userId || user._id || localStorage.getItem('userId') || '';
      const params = new URLSearchParams({ skipDepartmentFilter: 'true' });
      params.set('paged', 'true');
      if (userId) params.set('userId', userId);
      if (filters.departmentName?.trim()) params.set('departmentName', filters.departmentName.trim());
      if (filters.division?.trim()) params.set('division', filters.division.trim());
      params.set('page', String(requestedPage));
      params.set('size', String(requestedSize));
      params.set('sortBy', requestedSort.key || 'createdAt');
      params.set('sortDir', requestedSort.direction || 'desc');

      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/search?${params}`, {
        headers: {
          accept: '*/*',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        }
      });

      if (!response.ok) throw new Error(`Unable to load departments (${response.status}).`);

      const data = await response.json();
      const list = Array.isArray(data?.departments)
        ? data.departments
        : Array.isArray(data)
          ? data
          : Array.isArray(data?.content)
            ? data.content
            : [];

      setDepartments(list.map((item) => ({
        id: item.id,
        division: item.division || '',
        departmentName: item.departmentName || item.name || '',
        createdAt: item.createdAt || item.createdDate || '',
        updatedAt: item.updatedAt || item.updatedDate || ''
      })));
      setTotalRows(Number(data?.totalElements ?? list.length ?? 0));

      const apiUser = data?.currentUser || data?.user || {};
      setCanManage(Boolean(data?.isAdmin) || canUseDepartmentAdmin(user) || canUseDepartmentAdmin(apiUser));
      return { rows: list, totalElements: Number(data?.totalElements ?? list.length ?? 0) };
    } catch (error) {
      setDepartments([]);
      setTotalRows(0);
      setNotice({ open: true, message: error.message || 'Unable to load departments.', severity: 'error' });
      return { rows: [], totalElements: 0 };
    } finally {
      if (!options.silent) setLoading(false);
    }
  }, [page, rowsPerPage, sortConfig]);

  useEffect(() => {
    fetchDepartments(appliedFilters);
  }, [appliedFilters, fetchDepartments]);

  useEffect(() => {
    refreshRef.current = () => fetchDepartments(appliedFilters, { silent: true });
  }, [appliedFilters, fetchDepartments]);

  useEffect(() => {
    const client = new Client({
      webSocketFactory: () => new SockJS(`${API_BASE_URL}/ws`),
      reconnectDelay: 5000,
      debug: () => {},
      onConnect: () => client.subscribe('/topic/app-events', (message) => {
        let event = {};
        try {
          event = JSON.parse(message.body);
        } catch {
          event = { module: 'ALL' };
        }

        const module = String(event?.module || 'ALL').toUpperCase();
        if (['DEPARTMENT', 'DEPARTMENTS', 'ALL'].includes(module)) {
          refreshRef.current?.();
        }
      })
    });

    client.activate();
    return () => client.deactivate();
  }, []);

  const guard = (callback) => {
    if (!canManage) {
      setNotice({ open: true, message: MANAGE_MESSAGE, severity: 'error' });
      return;
    }
    callback();
  };

  const search = (filters) => {
    const division = filters?.division || '';
    const departmentName = filters?.departmentName || '';
    setSearchDivision(division);
    setSearchDeptName(departmentName);
    setPage(0);
    setAppliedFilters({ division, departmentName });
  };

  const reset = () => {
    setSearchDivision('');
    setSearchDeptName('');
    setSortConfig({ key: 'createdAt', direction: 'desc' });
    setPage(0);
    setAppliedFilters({ division: '', departmentName: '' });
  };

  const deleteDepartment = async () => {
    if (!selectedDepartment?.id) return;

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/${selectedDepartment.id}`, {
        method: 'DELETE',
        headers: {
          accept: '*/*',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        }
      });

      if (!response.ok) {
        const raw = await response.text();
        throw new Error(raw || `Unable to delete department (${response.status}).`);
      }

      setDeleteOpen(false);
      setSelectedDepartment(null);
      const remaining = Math.max(0, totalRows - 1);
      const lastPage = Math.max(0, Math.ceil(remaining / rowsPerPage) - 1);
      const targetPage = Math.min(page, lastPage);
      if (targetPage === page) await fetchDepartments(appliedFilters, { page: targetPage });
      else setPage(targetPage);
      setNotice({ open: true, message: 'Department deleted successfully.', severity: 'success' });
    } catch (error) {
      setNotice({ open: true, message: error.message || 'Unable to delete department.', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const changeSort = (key) => {
    setPage(0);
    setSortConfig((current) => {
      if (current.key !== key) return { key, direction: 'asc' };
      if (current.direction === 'asc') return { key, direction: 'desc' };
      return { key: 'createdAt', direction: 'desc' };
    });
  };

  const headerCell = (label, key, options = {}) => {
    const { align = 'left', minWidth = 140, sortable = true } = options;
    const active = sortConfig.key === key;

    return (
      <TableCell
        align={align}
        onClick={() => sortable && changeSort(key)}
        sx={{
          minWidth,
          px: 0.75,
          py: 0.8,
          fontWeight: 800,
          fontSize: '0.75rem',
          backgroundColor: '#f9fafb',
          color: '#374151',
          borderBottom: '1px solid #e5e7eb',
          cursor: sortable ? 'pointer' : 'default',
          userSelect: 'none',
          whiteSpace: 'nowrap'
        }}
      >
        <Stack direction="row" alignItems="center" justifyContent={align === 'center' ? 'center' : 'flex-start'}>
          <span>{label}</span>
          {sortable && <SortIndicator active={active} direction={sortConfig.direction} />}
        </Stack>
      </TableCell>
    );
  };

  return (
    <Box sx={{ p: { xs: 0.75, sm: 1, md: 1.25 } }}>
      <DepartmentSearch
        searchValue={searchDivision}
        departmentNameValue={searchDeptName}
        onSearchChange={setSearchDivision}
        onDepartmentNameChange={setSearchDeptName}
        onSearch={search}
        onReset={reset}
        onAdd={() => guard(() => setAddOpen(true))}
        canManage={canManage}
        manageMessage={MANAGE_MESSAGE}
        disabled={loading}
      />

      <Paper elevation={0} sx={{ borderRadius: 2, border: '1px solid #e5e7eb', overflow: 'hidden', backgroundColor: '#fff' }}>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          justifyContent="space-between"
          alignItems={{ xs: 'stretch', sm: 'center' }}
          spacing={1}
          sx={{ px: 1.5, py: 1.15, borderBottom: '1px solid #e5e7eb', backgroundColor: '#fff' }}
        >
          <Box>
            <Typography sx={{ fontWeight: 650, fontSize: '0.98rem' }}>Department List</Typography>
            <Typography sx={{ mt: 0.1, fontSize: '0.75rem', color: 'text.secondary' }}>
              {loading ? 'Loading records…' : `${totalRows || 0} record(s)`}
            </Typography>
          </Box>
          <Button
            size="small"
            variant="outlined"
            startIcon={loading ? <CircularProgress size={14} /> : <Refresh fontSize="small" />}
            disabled={loading}
            onClick={() => fetchDepartments(appliedFilters)}
            sx={{ alignSelf: { xs: 'flex-start', sm: 'center' }, textTransform: 'none', borderRadius: 1.2 }}
          >
            Refresh
          </Button>
        </Stack>

        <TableContainer sx={{ maxHeight: 'calc(100vh - 370px)', minHeight: 290 }}>
          <Table stickyHeader size="small" sx={{ minWidth: 760 }}>
            <TableHead>
              <TableRow>
                <TableCell
                  align="center"
                  sx={{ width: 54, px: 0.7, py: 0.8, fontWeight: 800, fontSize: '0.75rem', backgroundColor: '#f9fafb', color: '#374151', borderBottom: '1px solid #e5e7eb' }}
                >
                  No
                </TableCell>
                {headerCell('Division', 'division', { minWidth: 190 })}
                {headerCell('Department Name', 'departmentName', { minWidth: 250 })}
                {headerCell('Created At', 'createdAt', { minWidth: 190 })}
                {headerCell('Actions', 'actions', { align: 'center', minWidth: 96, sortable: false })}
              </TableRow>
            </TableHead>

            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} sx={{ py: 5 }}>
                    <Stack alignItems="center" spacing={1}>
                      <CircularProgress size={28} />
                      <Typography sx={{ fontSize: '0.84rem', color: 'text.secondary' }}>Loading Department…</Typography>
                    </Stack>
                  </TableCell>
                </TableRow>
              ) : departments.length > 0 ? (
                departments.map((department, index) => (
                  <TableRow key={department.id || `${department.division}-${department.departmentName}-${index}`} hover>
                    <TableCell align="center" sx={{ py: 0.6, px: 0.7, color: '#6b7280', fontSize: '0.75rem' }}>
                      {page * rowsPerPage + index + 1}
                    </TableCell>
                    <TableCell sx={{ py: 0.6, px: 0.75, color: '#374151', fontSize: '0.78rem', verticalAlign: 'top' }}>
                      {department.division || '—'}
                    </TableCell>
                    <TableCell sx={{ py: 0.6, px: 0.75, color: '#374151', fontSize: '0.78rem', verticalAlign: 'top' }}>
                      {department.departmentName || '—'}
                    </TableCell>
                    <TableCell sx={{ py: 0.6, px: 0.75, color: '#374151', fontSize: '0.78rem', verticalAlign: 'top' }}>
                      {formatDate(department.createdAt)}
                    </TableCell>
                    <TableCell align="center" sx={{ py: 0.45, px: 0.7 }}>
                      <Stack direction="row" spacing={0.4} justifyContent="center">
                        <Tooltip title={canManage ? 'Edit Department' : MANAGE_MESSAGE} arrow>
                          <span>
                            <IconButton
                              size="small"
                              disabled={!canManage || loading}
                              sx={{ p: 0.25, color: '#2563eb' }}
                              onClick={() => guard(() => {
                                setSelectedDepartment(department);
                                setEditOpen(true);
                              })}
                            >
                              <Edit fontSize="small" />
                            </IconButton>
                          </span>
                        </Tooltip>
                        <Tooltip title={canManage ? 'Delete Department' : MANAGE_MESSAGE} arrow>
                          <span>
                            <IconButton
                              size="small"
                              disabled={!canManage || loading}
                              sx={{ p: 0.25, color: '#dc2626' }}
                              onClick={() => guard(() => {
                                setSelectedDepartment(department);
                                setDeleteOpen(true);
                              })}
                            >
                              <Delete fontSize="small" />
                            </IconButton>
                          </span>
                        </Tooltip>
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} sx={{ py: 5 }}>
                    <Stack direction="column" alignItems="center" spacing={0.5} sx={{ color: 'text.secondary' }}>
                      <InboxIcon sx={{ fontSize: 32, opacity: 0.55 }} />
                      <Typography sx={{ fontSize: '0.85rem' }}>No Department Found</Typography>
                    </Stack>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>

        <PaginationBar
          count={totalRows}
          page={page}
          rowsPerPage={rowsPerPage}
          loading={loading}
          onPageChange={(nextPage) => setPage(Math.max(0, Number(nextPage) || 0))}
          onRowsPerPageChange={(nextSize) => {
            setRowsPerPage(Number(nextSize) || 25);
            setPage(0);
          }}
        />
      </Paper>

      <AddDepartmentDialog
        open={addOpen}
        onClose={(created) => {
          setAddOpen(false);
          if (created) {
            if (page === 0) fetchDepartments(appliedFilters);
            else setPage(0);
            setNotice({ open: true, message: 'Department created successfully.', severity: 'success' });
          }
        }}
      />
      <EditDepartmentDialog
        open={editOpen}
        department={selectedDepartment}
        onClose={(updated) => {
          setEditOpen(false);
          if (updated) {
            fetchDepartments(appliedFilters);
            setNotice({ open: true, message: 'Department updated successfully.', severity: 'success' });
          }
        }}
      />

      <Dialog open={deleteOpen} onClose={loading ? undefined : () => setDeleteOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ borderBottom: '1px solid #e5e7eb', fontWeight: 650 }}>Delete Department</DialogTitle>
        <DialogContent sx={{ pt: 2.2 }}>
          <Typography sx={{ fontSize: '0.9rem' }}>
            Delete <b>{selectedDepartment?.departmentName || 'this department'}</b>?
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 1.5, borderTop: '1px solid #e5e7eb' }}>
          <Button variant="outlined" onClick={() => setDeleteOpen(false)} disabled={loading} sx={{ textTransform: 'none', borderColor: '#111827', color: '#111827' }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={deleteDepartment}
            disabled={loading}
            sx={{ textTransform: 'none', backgroundColor: '#dc2626', '&:hover': { backgroundColor: '#b91c1c' } }}
          >
            {loading ? <CircularProgress size={19} color="inherit" /> : 'Delete Department'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={notice.open}
        autoHideDuration={4500}
        onClose={() => setNotice((previous) => ({ ...previous, open: false }))}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert
          severity={notice.severity}
          onClose={() => setNotice((previous) => ({ ...previous, open: false }))}
          sx={{ fontSize: '0.85rem' }}
        >
          {notice.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
