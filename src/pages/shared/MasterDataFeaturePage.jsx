import React, { useState } from 'react';
import { Alert, Box, Snackbar } from '@mui/material';
import MasterDataUploadDialog from './MasterDataUploadDialog';
import ConfirmDeleteDialog from './ConfirmDeleteDialog';
import useMasterDataPage from './useMasterDataPage';
import { downloadMasterDataEditWorkbook, getMasterDataErrorMessage } from '../../services/masterDataService';
import { canManageSales } from 'utils/accessControl';

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
  const canWrite = canManageSales();
  const [editUploadOpen, setEditUploadOpen] = useState(false);
  const [downloadingEdit, setDownloadingEdit] = useState(false);

  const openAdd = () => { if (canWrite) page.setAddOpen(true); };
  const openUpload = () => { if (canWrite) page.setUploadOpen(true); };
  const openEditUpload = () => { if (canWrite && config.allowEditWorkbook) setEditUploadOpen(true); };
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
      const filename = match?.[1] || `${config.type || 'master-data'}-edit.xlsx`;
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

  return (
    <Box sx={{ p: { xs: 1.25, sm: 1.75, md: 2 } }}>
      {scopeTitle && (
        <Box sx={{ mb: 1.5 }}>
          <Box sx={{ color: '#103B5C', fontSize: '1.35rem', fontWeight: 950 }}>{scopeTitle}</Box>
        </Box>
      )}
      <SearchComponent
        values={page.draftFilters}
        onChange={page.changeDraftFilter}
        onSearch={page.search}
        onReset={page.reset}
        onAdd={openAdd}
        onUpload={openUpload}
        onDownloadEdit={downloadEditWorkbook}
        onUploadEdit={openEditUpload}
        showUpload={config.allowUpload !== false}
        showEditWorkbook={Boolean(config.allowEditWorkbook)}
        disabled={page.loading || downloadingEdit}
        actionsDisabled={!canWrite}
      />

      <TableComponent
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
