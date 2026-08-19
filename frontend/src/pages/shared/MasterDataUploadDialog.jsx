import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  Stack,
  Typography,
  useMediaQuery
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import CloseIcon from '@mui/icons-material/Close';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import InsertDriveFileRoundedIcon from '@mui/icons-material/InsertDriveFileRounded';
import { getMasterDataErrorMessage, uploadEditedMasterData, uploadMasterData } from '../../services/masterDataService';
import { initialUploadProgress, startProcessingTicker, uploadProgressFromEvent, uploadStage } from '../../utils/uploadProgress';
import ExcelUploadProgressDialog from '../../components/ExcelUploadProgressDialog';
import SalesBomLoadingPanel from '../../components/SalesBomLoadingPanel';

const formatFileSize = (size = 0) => `${(size / 1024 / 1024).toFixed(2)} MB`;

export default function MasterDataUploadDialog({ config, open, onClose, onImported, editMode = false, scopeParams = {} }) {
  const sheetName = config.excelSheetName || config.menuTitle;
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));
  const tickerRef = useRef(null);
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(initialUploadProgress());
  const useLargeProgressDialog = true;

  const locked = uploading;

  const stopTicker = () => {
    if (tickerRef.current) window.clearInterval(tickerRef.current);
    tickerRef.current = null;
  };

  useEffect(() => {
    if (tickerRef.current) window.clearInterval(tickerRef.current);
    tickerRef.current = null;
    setFile(null);
    setError('');
    setResult(null);
    setUploading(false);
    setUploadProgress(initialUploadProgress());
  }, [config?.type, editMode, open]);

  const reset = () => {
    stopTicker();
    setFile(null);
    setError('');
    setResult(null);
    setUploading(false);
    setUploadProgress(initialUploadProgress());
  };

  const close = () => {
    if (locked) return;
    reset();
    onClose?.();
  };

  const handleFileChange = (event) => {
    const selected = event.target.files?.[0] || null;
    event.target.value = '';

    if (!selected) return;

    if (!/\.(xlsx|xls)$/i.test(selected.name)) {
      setError('Only Excel files (.xlsx or .xls) are supported.');
      return;
    }

    setFile(selected);
    setError('');
    setResult(null);
    setUploadProgress(initialUploadProgress());
  };

  const upload = async () => {
    if (!file) {
      setError('Select an Excel file before uploading.');
      return;
    }

    setUploading(true);
    setError('');
    setResult(null);
    setUploadProgress(initialUploadProgress(file));
    stopTicker();
    tickerRef.current = startProcessingTicker(setUploadProgress);

    const options = {
      onUploadProgress: (event) => {
        const nextValue = uploadProgressFromEvent(event);
        setUploadProgress((current) => ({
          ...current,
          open: true,
          file,
          progress: Math.max(Number(current.progress || 0), nextValue),
          status: uploadStage(nextValue),
          state: 'processing'
        }));
      }
    };

    try {
      const response = editMode
        ? await uploadEditedMasterData(config.type, file, scopeParams, options)
        : await uploadMasterData(config.type, file, 'CREATE_ONLY', scopeParams, options);
      stopTicker();
      setResult(response);
      setUploadProgress({
        open: true,
        file,
        progress: 100,
        status: `${config.menuTitle} Excel import completed.`,
        detail: `Processed ${response?.totalRows ?? 0} row(s); valid ${response?.validRows ?? 0}, created ${response?.created ?? 0}, updated ${response?.updated ?? 0}, deleted ${response?.deleted ?? 0}, skipped ${response?.skipped ?? 0}, errors ${Array.isArray(response?.errors) ? response.errors.length : 0}.`,
        state: 'success'
      });
      if (response?.applied && !useLargeProgressDialog) onImported?.(response);
    } catch (requestError) {
      stopTicker();
      const message = getMasterDataErrorMessage(requestError, `${config.menuTitle} Excel import failed.`);
      setError(message);
      setResult(requestError?.response?.data || null);
      setUploadProgress((current) => ({
        ...current,
        open: true,
        file,
        status: `${config.menuTitle} Excel import failed.`,
        detail: message,
        state: 'error'
      }));
    } finally {
      setUploading(false);
    }
  };

  const errors = Array.isArray(result?.errors) ? result.errors : [];

  const closeProgress = () => {
    if (uploading || uploadProgress.state === 'processing') return;

    if (useLargeProgressDialog && uploadProgress.state === 'success' && result?.applied) {
      onImported?.(result);
      return;
    }

    setUploadProgress(initialUploadProgress());
  };

  const progressTitle = editMode
    ? `${config.menuTitle} — Upload Edited Excel`
    : `${config.menuTitle} — Upload New Excel`;

  return (
    <Dialog
      open={open}
      onClose={locked ? undefined : close}
      fullScreen={fullScreen}
      maxWidth="sm"
      fullWidth
      PaperProps={{ sx: { borderRadius: fullScreen ? 0 : 2 } }}
    >
      <DialogTitle sx={{ pr: 6, px: 3, pt: 2.35, pb: 1.75, fontWeight: 750, color: '#103B5C' }}>
        {editMode ? `${config.menuTitle} — Upload Edited Excel` : `${config.menuTitle} — Upload New Excel`}
        <Typography sx={{ mt: 0.25, fontSize: '0.8rem', color: 'text.secondary', fontWeight: 400 }}>
          {editMode
            ? 'Upload the Excel file downloaded from this page after editing data.'
            : 'Create new master data from the expected Excel sheet.'}
        </Typography>
        <IconButton onClick={close} disabled={locked} aria-label="Close upload dialog" sx={{ position: 'absolute', right: 14, top: 14 }}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers sx={{ p: 3 }}>
        <Stack spacing={2}>
          {error && <Alert severity="error" sx={{ borderRadius: 1.25 }}>{error}</Alert>}

          <Alert severity="info" sx={{ borderRadius: 1.25 }}>
            <b>Current module: {config.menuTitle}</b><br />
            {editMode ? (
              <>Use the downloaded <b>{sheetName}</b> edit file. Keep Key to update; leave Key blank to create a new row.</>
            ) : (
              <>Use the <b>{sheetName}</b> sheet and the expected header columns. This upload only creates new rows.</>
            )}
          </Alert>

          {config.importHint && (
            <Alert severity="warning" sx={{ borderRadius: 1.25 }}>
              {config.importHint}
            </Alert>
          )}


          <Box>
            <Button
              variant="outlined"
              component="label"
              startIcon={<CloudUploadIcon />}
              disabled={locked}
              fullWidth
              sx={{ py: 1.35, borderStyle: 'dashed', borderWidth: 2, borderRadius: 1.25, textTransform: 'none', fontWeight: 700 }}
            >
              Select Excel File (.xlsx / .xls)
              <input hidden type="file" accept=".xlsx,.xls" onChange={handleFileChange} />
            </Button>

            {file && (
              <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1} sx={{ mt: 1.2, px: 1.2, py: 0.9, border: '1px solid #e5e7eb', borderRadius: 1.25, background: '#fff' }}>
                <Stack direction="row" alignItems="center" spacing={1} sx={{ minWidth: 0 }}>
                  <InsertDriveFileRoundedIcon fontSize="small" color="primary" />
                  <Box sx={{ minWidth: 0 }}>
                    <Typography variant="body2" fontWeight={700} noWrap>{file.name}</Typography>
                    <Typography fontSize={12} color="text.secondary">{formatFileSize(file.size)}</Typography>
                  </Box>
                </Stack>
                <Button size="small" color="inherit" onClick={() => setFile(null)} disabled={locked} sx={{ textTransform: 'none' }}>Remove</Button>
              </Stack>
            )}
          </Box>

          {uploadProgress.open && !useLargeProgressDialog && (
            <SalesBomLoadingPanel
              compact
              file={uploadProgress.file || file}
              progress={uploadProgress.progress}
              status={uploadProgress.status}
              detail={uploadProgress.detail}
              state={uploadProgress.state}
            />
          )}

          {result && (
            <Box sx={{ p: 1.5, borderRadius: 1.25, border: '1px solid #d1fae5', backgroundColor: '#f0fdf4' }}>
              <Typography fontWeight={800} color="#166534">Import result</Typography>
              <Typography sx={{ mt: 0.45, fontSize: '0.86rem', color: '#166534' }}>
                Total: {result.totalRows ?? 0} · Valid: {result.validRows ?? 0} · Created: {result.created ?? 0} · Updated: {result.updated ?? 0} · Deleted: {result.deleted ?? 0} · Skipped: {result.skipped ?? 0} · Errors: {errors.length}
              </Typography>
              {errors.length > 0 && (
                <>
                  <Divider sx={{ my: 1 }} />
                  <Stack spacing={0.6}>
                    <Box sx={{ maxHeight: 190, overflowY: 'auto', pr: 0.5 }}>
                  {errors.slice(0, 20).map((item, index) => (
                      <Typography key={`${item?.rowNumber}-${item?.field}-${index}`} sx={{ fontSize: '0.8rem', color: '#b91c1c' }}>
                        Row {item?.rowNumber ?? '?'}{item?.field ? ` · ${item.field}` : ''}: {item?.message || 'Invalid data'}
                      </Typography>
                    ))}
                    {errors.length > 20 && (
                      <Typography sx={{ fontSize: '0.78rem', color: '#b91c1c', fontWeight: 700 }}>
                        +{errors.length - 20} more error(s). Correct the Excel file and upload again.
                      </Typography>
                    )}
                  </Box>
                  </Stack>
                </>
              )}
            </Box>
          )}
        </Stack>
      </DialogContent>

      <DialogActions sx={{ p: 2 }}>
        <Button onClick={close} disabled={locked} sx={{ textTransform: 'none', color: '#4b5563' }}>
          Close
        </Button>
        <Button
          onClick={upload}
          disabled={locked || !file}
          variant="contained"
          sx={{ textTransform: 'none', fontWeight: 700, backgroundColor: '#103B5C', '&:hover': { backgroundColor: '#0b2e49' } }}
        >
          {uploading ? <CircularProgress size={20} color="inherit" /> : (editMode ? 'Upload Edited File' : 'Upload & Create')}
        </Button>
      </DialogActions>

      <ExcelUploadProgressDialog
        open={useLargeProgressDialog && uploadProgress.open}
        title={progressTitle}
        file={uploadProgress.file || file}
        progress={uploadProgress.progress}
        status={uploadProgress.status}
        detail={uploadProgress.detail}
        state={uploadProgress.state}
        onClose={closeProgress}
        onRetry={uploadProgress.state === 'error' ? upload : undefined}
      />
    </Dialog>
  );
}
