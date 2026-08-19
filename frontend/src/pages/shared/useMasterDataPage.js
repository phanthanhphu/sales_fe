import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  deleteMasterData,
  getMasterDataErrorMessage,
  listMasterData
} from '../../services/masterDataService';
import {
  cleanFilters,
  createEmptyFilters,
  normalizePageResponse
} from './masterDataUtils';

const VALID_SEVERITIES = new Set(['success', 'info', 'warning', 'error']);

const safeMessage = (value, fallback) => {
  if (typeof value === 'string' && value.trim()) return value.trim();
  return fallback;
};
const cssAttributeEscape = (value) => (
  typeof CSS !== 'undefined' && typeof CSS.escape === 'function'
    ? CSS.escape(String(value || ''))
    : String(value || '').replace(/["\\]/g, '\\$&')
);

const responseRecordId = (response) => {
  const candidates = [response, response?.data, response?.item, response?.result, response?.record].filter((item) => item && typeof item === 'object');
  for (const item of candidates) {
    if (item?.id) return String(item.id);
  }
  return '';
};


export default function useMasterDataPage(config = {}, scopeParams = {}) {
  const emptyFilters = useMemo(
    () => createEmptyFilters(config.searchFields || []),
    [config.searchFields]
  );

  const [draftFilters, setDraftFilters] = useState(emptyFilters);
  const [appliedFilters, setAppliedFilters] = useState(emptyFilters);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [totalElements, setTotalElements] = useState(0);

  const [addOpen, setAddOpen] = useState(false);
  const [editRecord, setEditRecord] = useState(null);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [notification, setNotification] = useState({
    open: false,
    severity: 'success',
    message: ''
  });
  const scrollTargetRef = useRef('');

  const notify = useCallback((message, severity = 'success') => {
    setNotification({
      open: true,
      severity: VALID_SEVERITIES.has(severity) ? severity : 'success',
      message: safeMessage(message, 'Operation completed successfully.')
    });
  }, []);

  const closeNotification = useCallback(() => {
    setNotification((current) => ({ ...current, open: false }));
  }, []);

  const load = useCallback(async (overrides = {}) => {
    const requestedPage = Number.isInteger(overrides.page) ? Math.max(0, overrides.page) : page;
    const requestedSize = Number.isInteger(overrides.size) ? Math.max(1, overrides.size) : rowsPerPage;
    setLoading(true);

    try {
      const response = await listMasterData(config.type, {
        ...scopeParams,
        ...cleanFilters(appliedFilters),
        page: requestedPage,
        size: requestedSize
      });

      const normalized = normalizePageResponse(response, requestedPage, requestedSize);
      const nextRows = Array.isArray(normalized.content) ? normalized.content : [];
      setRows(nextRows);
      setTotalElements(Number(normalized.totalElements || 0));

      if (Number.isInteger(normalized.number) && normalized.number !== requestedPage && normalized.totalPages > 0) {
        setPage(normalized.number);
      }

      return nextRows;
    } catch (error) {
      setRows([]);
      setTotalElements(0);
      notify(
        getMasterDataErrorMessage(error, `Unable to load ${config.menuTitle || 'master data'}.`),
        'error'
      );
    } finally {
      setLoading(false);
    }
  }, [appliedFilters, config.menuTitle, config.type, notify, page, rowsPerPage, scopeParams?.buyerKey]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (loading || !scrollTargetRef.current || typeof document === 'undefined') return;
    const selector = scrollTargetRef.current;
    scrollTargetRef.current = '';
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const element = document.querySelector(selector);
        if (!element) return;
        element.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
        const previousBoxShadow = element.style.boxShadow;
        const previousTransition = element.style.transition;
        element.style.transition = 'box-shadow 180ms ease';
        element.style.boxShadow = '0 0 0 3px rgba(17, 24, 39, 0.26)';
        window.setTimeout(() => {
          element.style.boxShadow = previousBoxShadow;
          element.style.transition = previousTransition;
        }, 1600);
      });
    });
  }, [loading, rows]);

  const changeDraftFilter = useCallback((name, value) => {
    setDraftFilters((current) => ({ ...current, [name]: value }));
  }, []);

  const search = useCallback(() => {
    setAppliedFilters(cleanFilters(draftFilters));
    setPage(0);
  }, [draftFilters]);

  const reset = useCallback(() => {
    const cleared = createEmptyFilters(config.searchFields || []);
    setDraftFilters(cleared);
    setAppliedFilters(cleared);
    setPage(0);
  }, [config.searchFields]);

  const openEdit = useCallback((record) => {
    setEditRecord(record || null);
  }, []);

  const closeEdit = useCallback(() => {
    setEditRecord(null);
  }, []);

  /*
   * Dialogs call onSaved(response, 'message'). `response` is an object, so it
   * must never be passed directly into Snackbar/Alert as a React child.
   */
  const handleSaved = useCallback(async (savedRecordOrMessage, customMessage = '', meta = {}) => {
    setAddOpen(false);
    setEditRecord(null);

    const message = safeMessage(
      customMessage,
      typeof savedRecordOrMessage === 'string'
        ? savedRecordOrMessage
        : `${config.singular || 'Record'} saved successfully.`
    );

    const createdId = meta?.mode === 'create' ? responseRecordId(savedRecordOrMessage) : '';
    if (createdId) {
      scrollTargetRef.current = `[data-master-row-id="${cssAttributeEscape(createdId)}"]`;
    }

    notify(message, 'success');
    const isCreate = meta?.mode === 'create';
    const targetPage = isCreate ? 0 : page;
    if (isCreate && page !== 0) setPage(0);
    await load({ page: targetPage });
  }, [config.singular, load, notify, page]);

  const handleImported = useCallback(async (result) => {
    const created = Number(result?.created || 0);
    const updated = Number(result?.updated || 0);
    const deleted = Number(result?.deleted || 0);
    const skipped = Number(result?.skipped || 0);
    const suffix = skipped > 0 ? ` ${skipped} skipped.` : '';

    notify(`Import completed: ${created} created, ${updated} updated, ${deleted} deleted.${suffix}`, 'success');
    setUploadOpen(false);
    if (page !== 0) setPage(0);
    await load({ page: 0 });
  }, [load, notify, page]);

  const confirmDelete = useCallback((record) => {
    setDeleteTarget(record || null);
  }, []);

  const closeDelete = useCallback(() => {
    if (!deleting) setDeleteTarget(null);
  }, [deleting]);

  const deleteRecord = useCallback(async () => {
    if (!deleteTarget?.id) {
      notify('Invalid record. Cannot delete.', 'error');
      return;
    }

    setDeleting(true);

    try {
      await deleteMasterData(config.type, deleteTarget.id, scopeParams);
      notify(`${config.singular || 'Record'} deleted successfully.`, 'success');
      setDeleteTarget(null);

      if (rows.length === 1 && page > 0) {
        setPage((current) => Math.max(0, current - 1));
      } else {
        await load();
      }
    } catch (error) {
      notify(
        getMasterDataErrorMessage(error, `Unable to delete ${config.singular || 'record'}.`),
        'error'
      );
    } finally {
      setDeleting(false);
    }
  }, [config.singular, config.type, deleteTarget, load, notify, page, rows.length, scopeParams?.buyerKey]);

  const changeRowsPerPage = useCallback((size) => {
    const normalizedSize = Number(size);
    setRowsPerPage(Number.isFinite(normalizedSize) && normalizedSize > 0 ? normalizedSize : 25);
    setPage(0);
  }, []);

  return {
    rows,
    loading,
    page,
    rowsPerPage,
    totalElements,
    draftFilters,
    addOpen,
    editRecord,
    uploadOpen,
    deleteTarget,
    deleting,
    notification,
    changeDraftFilter,
    search,
    reset,
    setPage,
    setRowsPerPage: changeRowsPerPage,
    reload: load,
    setAddOpen,
    openEdit,
    closeEdit,
    setUploadOpen,
    confirmDelete,
    closeDelete,
    deleteRecord,
    handleSaved,
    handleImported,
    closeNotification,
    notify
  };
}
