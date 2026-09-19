import { vietnamDownloadTimestamp } from 'utils/vietnamTime';
import React, { useState } from 'react';
import { Alert, Box, Paper, Snackbar } from '@mui/material';
import MasterDataUploadDialog from './MasterDataUploadDialog';
import ConfirmDeleteDialog from './ConfirmDeleteDialog';
import useMasterDataPage from './useMasterDataPage';
import { downloadMasterDataEditWorkbook, downloadMasterDataTemplate, getMasterDataErrorMessage, hasActiveShipToData, searchVendorCodeOptions } from '../../services/masterDataService';
import { canManageCurrency, canManageSales } from 'utils/accessControl';

const downloadTimestamp = () => vietnamDownloadTimestamp();

const downloadFilePart = (value, fallback) => {
  const clean = String(value || '').trim().toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
  return clean || fallback;
};

const MANAGER_FILE_CODES = {
  vendor: 'VENDORCODE',
  matInfo: 'MATINFO',
  loss: 'LOSS',
  shipTo: 'SHIPTO',
  materialShipTo: 'MATERIALSHIPTO'
};

const managerDownloadName = (config, scopeParams, template = false) => {
  const buyer = downloadFilePart(scopeParams?.buyerKey, 'BUYER');
  const manager = MANAGER_FILE_CODES[config?.type]
    || downloadFilePart(config?.menuTitle || config?.type, 'MANAGER');
  return `${buyer}_${manager}${template ? '_TEMPLATE' : ''}_${downloadTimestamp()}.xlsx`;
};

/**
 * Shared master-data shell.
 * The former page introduction card was removed to keep every master screen
 * focused on its search form and data table.
 */
export default function MasterDataFeaturePage({
  config,
  SearchComponent,
  TableComponent,
  AddDialog,
  EditDialog,
  scopeParams = {},
  scopeTitle = ''
}) {
  const page = useMasterDataPage(config, scopeParams);
  const canWrite = config?.type === 'currency' ? canManageCurrency() : canManageSales();
  const [editUploadOpen, setEditUploadOpen] = useState(false);
  const [downloadingEdit, setDownloadingEdit] = useState(false);
  const [downloadingTemplate, setDownloadingTemplate] = useState(false);
  const [checkingCreatePrerequisite, setCheckingCreatePrerequisite] = useState(false);

  const ensureCreatePrerequisite = async () => {
    const requiresVendor = Boolean(config?.requireVendorDataBeforeCreate);
    const requiresShipTo = Boolean(config?.requireShipToDataBeforeCreate);
    if (!requiresVendor && !requiresShipTo) return true;
    if (checkingCreatePrerequisite) return false;

    setCheckingCreatePrerequisite(true);
    try {
      if (requiresVendor) {
        // Lightweight indexed lookup: only one Vendor Code row is needed to decide
        // whether the Buyer has initialized Vendor master data.
        const response = await searchVendorCodeOptions('', 1, scopeParams?.buyerKey);
        const vendorRows = Array.isArray(response) ? response : response?.data;
        if (!Array.isArray(vendorRows) || vendorRows.length === 0) {
          page.notify(
            config.vendorPrerequisiteMessage || 'Please create Vendor Code data before creating MAT_INFO because MAT_INFO uses Vendor Code.',
            'warning'
          );
          return false;
        }
      }

      if (requiresShipTo) {
        // Existence-only endpoint: does not download the full active Ship To list.
        const hasShipTo = await hasActiveShipToData(scopeParams?.buyerKey);
        if (hasShipTo !== true) {
          page.notify(
            config.shipToPrerequisiteMessage || 'Please create Ship To data before creating Material Ship To because Material Ship To uses Ship To.',
            'warning'
          );
          return false;
        }
      }

      return true;
    } catch (error) {
      const fallback = requiresShipTo ? 'Unable to verify Ship To data.' : 'Unable to verify Vendor Code data.';
      page.notify(getMasterDataErrorMessage(error, fallback), 'error');
      return false;
    } finally {
      setCheckingCreatePrerequisite(false);
    }
  };

  const openAdd = async () => { if (canWrite && await ensureCreatePrerequisite()) page.setAddOpen(true); };
  const openUpload = async () => { if (canWrite && await ensureCreatePrerequisite()) page.setUploadOpen(true); };
  const openEditUpload = async () => { if (canWrite && config.allowEditWorkbook && await ensureCreatePrerequisite()) setEditUploadOpen(true); };
  const openEdit = (record) => { if (canWrite) page.openEdit(record); };
  const openDelete = (record) => { if (canWrite) page.confirmDelete(record); };

  const downloadEditWorkbook = async () => {
    if (!canWrite || !config.allowEditWorkbook || downloadingEdit) return;

    setDownloadingEdit(true);
    try {
      const response = await downloadMasterDataEditWorkbook(config.type, scopeParams);
      const blob = response?.data instanceof Blob
        ? response.data
        : new Blob([response?.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const disposition = response?.headers?.['content-disposition'] || '';
      const match = /filename="?([^";]+)"?/i.exec(disposition);
      const filename = match?.[1] || managerDownloadName(config, scopeParams);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      page.notify(`${config.menuTitle} edit Excel downloaded.`, 'success');
    } catch (error) {
      page.notify(getMasterDataErrorMessage(error, `Unable to download ${config.menuTitle} edit Excel.`), 'error');
    } finally {
      setDownloadingEdit(false);
    }
  };


  const downloadTemplate = async () => {
    if (!canWrite || !config.allowTemplate || downloadingTemplate) return;

    setDownloadingTemplate(true);
    try {
      const response = await downloadMasterDataTemplate(config.type, scopeParams);
      const blob = response?.data instanceof Blob
        ? response.data
        : new Blob([response?.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const disposition = response?.headers?.['content-disposition'] || '';
      const match = /filename="?([^";]+)"?/i.exec(disposition);
      const filename = match?.[1] || managerDownloadName(config, scopeParams, true);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      page.notify(`${config.menuTitle} template downloaded.`, 'success');
    } catch (error) {
      page.notify(getMasterDataErrorMessage(error, `Unable to download ${config.menuTitle} template.`), 'error');
    } finally {
      setDownloadingTemplate(false);
    }
  };

  return (
    <Box sx={{ p: { xs: 0.6, sm: 0.75, md: 0.9 } }}>
      <Paper elevation={0} sx={{ border: '1px solid #dfe6ee', borderRadius: 2, overflow: 'hidden', bgcolor: '#fff' }}>
        <SearchComponent
          embedded
          values={page.draftFilters}
          onChange={page.changeDraftFilter}
          onSearch={page.search}
          onReset={page.reset}
          onAdd={openAdd}
          onUpload={openUpload}
          onDownloadTemplate={downloadTemplate}
          onDownloadEdit={downloadEditWorkbook}
          onUploadEdit={openEditUpload}
          showUpload={config.allowUpload !== false}
          showTemplate={Boolean(config.allowTemplate)}
          showEditWorkbook={Boolean(config.allowEditWorkbook)}
          disabled={downloadingEdit || downloadingTemplate || checkingCreatePrerequisite}
          actionsDisabled={!canWrite}
        />

        <TableComponent
          embedded
          rows={page.rows}
          loading={page.loading}
          page={page.page}
          rowsPerPage={page.rowsPerPage}
          totalElements={page.totalElements}
          onPageChange={page.setPage}
          onRowsPerPageChange={page.setRowsPerPage}
          onEdit={openEdit}
          onDelete={openDelete}
          onRefresh={page.reload}
          actionsDisabled={!canWrite}
        />
      </Paper>

      <AddDialog
        open={canWrite && page.addOpen}
        onClose={() => page.setAddOpen(false)}
        onSaved={page.handleSaved}
        scopeParams={scopeParams}
      />

      <EditDialog
        open={canWrite && Boolean(page.editRecord)}
        record={page.editRecord}
        onClose={page.closeEdit}
        onSaved={page.handleSaved}
        scopeParams={scopeParams}
      />

      {config.allowUpload !== false && (
        <MasterDataUploadDialog
          key={`${config.type}-create-upload`}
          config={config}
          open={canWrite && page.uploadOpen}
          onClose={() => page.setUploadOpen(false)}
          onImported={page.handleImported}
          scopeParams={scopeParams}
        />
      )}

      {config.allowEditWorkbook && (
        <MasterDataUploadDialog
          key={`${config.type}-edit-upload`}
          config={config}
          editMode
          scopeParams={scopeParams}
          open={canWrite && editUploadOpen}
          onClose={() => setEditUploadOpen(false)}
          onImported={(result) => {
            setEditUploadOpen(false);
            page.handleImported(result);
          }}
        />
      )}

      <ConfirmDeleteDialog
        config={config}
        open={canWrite && Boolean(page.deleteTarget)}
        record={page.deleteTarget}
        deleting={page.deleting}
        onClose={page.closeDelete}
        onConfirm={page.deleteRecord}
      />

      <Snackbar
        open={page.notification.open}
        autoHideDuration={4500}
        onClose={page.closeNotification}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert
          severity={page.notification.severity}
          onClose={page.closeNotification}
          sx={{ fontSize: '0.85rem' }}
        >
          {page.notification.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
