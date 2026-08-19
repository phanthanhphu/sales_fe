import React, { useCallback, useState } from 'react';
import {
  Box,
  Button,
  ListItemIcon,
  Menu,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Tooltip
} from '@mui/material';
import { Add, CloudDownload, CloudUpload, KeyboardArrowDown, Search } from '@mui/icons-material';

const fieldSx = {
  flex: '1 1 170px',
  minWidth: { xs: '100%', sm: 150, md: 165 },
  '& .MuiInputBase-root': { height: 34 },
  '& .MuiInputLabel-root': { fontWeight: 600 }
};

const actionButtonSx = {
  height: 34,
  minWidth: 82,
  px: 1.4,
  borderRadius: 1.2,
  textTransform: 'none',
  fontWeight: 700,
  whiteSpace: 'nowrap'
};

export default function MasterDataSearchPanel({
  config,
  values,
  onChange,
  onSearch,
  onReset,
  onAdd,
  onUpload,
  onDownloadTemplate,
  onDownloadEdit,
  onUploadEdit,
  showUpload = true,
  showTemplate = false,
  showEditWorkbook = false,
  disabled = false,
  actionsDisabled = false,
  embedded = false
}) {
  const writeDisabled = disabled || actionsDisabled;
  const [excelAnchorEl, setExcelAnchorEl] = useState(null);
  const hasExcelActions = showTemplate || showEditWorkbook || showUpload;
  const noWriteMessage = 'Sales permission is required to modify master data.';

  const handleKeyDown = useCallback(
    (event) => {
      if (event.key === 'Enter' && !disabled) onSearch?.();
    },
    [disabled, onSearch]
  );

  return (
    <Paper
      elevation={0}
      sx={{
        p: 0.75,
        mb: embedded ? 0 : 0.8,
        borderRadius: embedded ? 0 : 1.7,
        border: embedded ? 0 : '1px solid #e5e7eb',
        borderBottom: embedded ? '1px solid #e5e7eb' : undefined,
        backgroundColor: '#fff',
        overflow: 'hidden'
      }}
    >
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, alignItems: 'center', width: '100%' }}>
        {(config.searchFields || []).map((field) => (
          <TextField
            key={field.name}
            select={field.type === 'select'}
            type={field.type && field.type !== 'select' ? field.type : 'text'}
            label={field.label}
            size="small"
            value={values?.[field.name] ?? ''}
            onChange={(event) => onChange?.(field.name, event.target.value)}
            onKeyDown={handleKeyDown}
            disabled={disabled}
            placeholder={field.placeholder}
            inputProps={field.inputProps}
            fullWidth
            sx={{ ...fieldSx, ...(field.sx || {}) }}
          >
            {field.type === 'select' && (field.options || []).map((option) => (
              <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>
            ))}
          </TextField>
        ))}

        <Button
          variant="contained"
          startIcon={<Search fontSize="small" />}
          onClick={onSearch}
          disabled={disabled}
          sx={{ ...actionButtonSx, backgroundColor: '#103B5C', '&:hover': { backgroundColor: '#0b2f4a' } }}
        >
          Search
        </Button>
        <Button
          variant="outlined"
          onClick={onReset}
          disabled={disabled}
          sx={{ ...actionButtonSx, borderColor: '#cbd5e1', color: '#334155' }}
        >
          Reset
        </Button>

        <Box sx={{ flex: { xs: '1 1 100%', xl: 1 } }} />
        <Stack direction="row" spacing={0.6} alignItems="center" flexWrap="wrap" useFlexGap>
          {hasExcelActions && (
            <>
              <Button
                variant="outlined"
                startIcon={<CloudDownload fontSize="small" />}
                endIcon={<KeyboardArrowDown fontSize="small" />}
                onClick={(event) => setExcelAnchorEl(event.currentTarget)}
                disabled={writeDisabled}
                sx={{ ...actionButtonSx, borderColor: '#cbd5e1', color: '#334155', backgroundColor: '#fff' }}
              >
                Excel
              </Button>
              <Menu
                anchorEl={excelAnchorEl}
                open={Boolean(excelAnchorEl)}
                onClose={() => setExcelAnchorEl(null)}
                PaperProps={{ sx: { minWidth: 240, mt: 0.5, border: '1px solid #e2e8f0', boxShadow: '0 12px 32px rgba(15,23,42,.12)' } }}
              >
                {showTemplate && <MenuItem onClick={() => { setExcelAnchorEl(null); onDownloadTemplate?.(); }} disabled={writeDisabled}><ListItemIcon><CloudDownload fontSize="small" /></ListItemIcon>Download Template</MenuItem>}
                {showEditWorkbook && <MenuItem onClick={() => { setExcelAnchorEl(null); onDownloadEdit?.(); }} disabled={writeDisabled}><ListItemIcon><CloudDownload fontSize="small" /></ListItemIcon>Download Edit Excel</MenuItem>}
                {showEditWorkbook && <MenuItem onClick={() => { setExcelAnchorEl(null); onUploadEdit?.(); }} disabled={writeDisabled}><ListItemIcon><CloudUpload fontSize="small" /></ListItemIcon>Upload Edited Excel</MenuItem>}
                {showUpload && <MenuItem onClick={() => { setExcelAnchorEl(null); onUpload?.(); }} disabled={writeDisabled}><ListItemIcon><CloudUpload fontSize="small" /></ListItemIcon>Upload New Excel</MenuItem>}
              </Menu>
            </>
          )}
          <Tooltip title={actionsDisabled ? noWriteMessage : ''} arrow disableHoverListener={!actionsDisabled}>
            <span>
              <Button
                variant="contained"
                startIcon={<Add fontSize="small" />}
                onClick={onAdd}
                disabled={writeDisabled}
                sx={{ ...actionButtonSx, backgroundColor: '#103B5C', '&:hover': { backgroundColor: '#0b2f4a' } }}
              >
                Add {config.menuTitle}
              </Button>
            </span>
          </Tooltip>
        </Stack>
      </Box>
    </Paper>
  );
}
