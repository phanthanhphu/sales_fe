import React, { useState } from 'react';
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

const formatFileSize = (size = 0) => `${(size / 1024 / 1024).toFixed(2)} MB`;

export default function MasterDataUploadDialog({ config, open, onClose, onImported, editMode = false }) {
  const sheetName = config.excelSheetName || config.menuTitle;
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);

  const locked = uploading;

  const reset = () => {
    setFile(null);
    setError('');
    setResult(null);
    setUploading(false);
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
  };

  const upload = async () => {
    if (!file) {
      setError('Select an Excel file before uploading.');
      return;
    }

    setUploading(true);
    setError('');
    setResult(null);

    try {
      const response = editMode
        ? await uploadEditedMasterData(config.type, file)
        : await uploadMasterData(config.type, file, 'CREATE_ONLY');
      setResult(response);
      if (response?.applied) onImported?.(response);
    } catch (requestError) {
      setError(getMasterDataErrorMessage(requestError, 'Excel import failed.'));
      setResult(requestError?.response?.data || null);
    } finally {
      setUploading(false);
    }
  };

  const errors = Array.isArray(result?.errors) ? result.errors : [];

  return (
    <Dialog
      open={open}
      onClose={locked ? undefined : close}
      fullScreen={fullScreen}
      maxWidth="sm"
      fullWidth
      PaperProps={{ sx: { borderRadius: fullScreen ? 0 : 2 } }}
    >
      <DialogTitle sx={{ pr: 6, px: 3, pt: 2.35, pb: 1.75, fontWeight: 900, color: '#103B5C' }}>
        {editMode ? `Upload Edited ${config.menuTitle}` : `Upload ${config.menuTitle}`}
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

          {result && (
            <Box sx={{ p: 1.5, borderRadius: 1.25, border: '1px solid #d1fae5', backgroundColor: '#f0fdf4' }}>
              <Typography fontWeight={800} color="#166534">Import result</Typography>
              <Typography sx={{ mt: 0.45, fontSize: '0.86rem', color: '#166534' }}>
                Total: {result.totalRows ?? 0} · Valid: {result.validRows ?? 0} · Created: {result.created ?? 0} · Updated: {result.updated ?? 0}
              </Typography>
              {errors.length > 0 && (
                <>
                  <Divider sx={{ my: 1 }} />
                  <Stack spacing={0.6}>
                    {errors.slice(0, 8).map((item, index) => (
                      <Typography key={`${item?.rowNumber}-${item?.field}-${index}`} sx={{ fontSize: '0.8rem', color: '#b91c1c' }}>
                        Row {item?.rowNumber ?? '?'}{item?.field ? ` · ${item.field}` : ''}: {item?.message || 'Invalid data'}
                      </Typography>
                    ))}
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
          sx={{ textTransform: 'none', fontWeight: 800, backgroundColor: '#103B5C', '&:hover': { backgroundColor: '#0b2e49' } }}
        >
          {uploading ? <CircularProgress size={20} color="inherit" /> : (editMode ? 'Upload Edited File' : 'Upload & Create')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
