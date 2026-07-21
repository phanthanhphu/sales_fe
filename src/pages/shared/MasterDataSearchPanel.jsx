import React, { useCallback } from 'react';
import {
  Box,
  Button,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Tooltip,
  Typography
} from '@mui/material';
import { Add, CloudDownload, CloudUpload, Search } from '@mui/icons-material';

const fieldSx = {
  flex: '1 1 210px',
  minWidth: { xs: '100%', sm: 190, md: 210 },
  '& .MuiInputBase-root': { height: 38 },
  '& .MuiInputLabel-root': { fontWeight: 600 }
};

const actionButtonSx = {
  height: 34,
  minWidth: 94,
  px: 2.2,
  borderRadius: 1.2,
  textTransform: 'none',
  fontWeight: 500,
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
  onDownloadEdit,
  onUploadEdit,
  showUpload = true,
  showEditWorkbook = false,
  disabled = false,
  actionsDisabled = false
}) {
  const writeDisabled = disabled || actionsDisabled;
  const noWriteMessage = 'Sales permission is required to modify master data.';

  const handleKeyDown = useCallback(
    (event) => {
      if (event.key === 'Enter' && !disabled) {
        onSearch?.();
      }
    },
    [disabled, onSearch]
  );

  return (
    <Paper
      elevation={0}
      sx={{
        p: 2,
        mb: 2,
        borderRadius: 2,
        border: '1px solid #e5e7eb',
        backgroundColor: '#fff',
        overflow: 'hidden'
      }}
    >
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        justifyContent="space-between"
        alignItems={{ xs: 'stretch', sm: 'center' }}
        spacing={1.25}
        sx={{ mb: 1.5 }}
      >
        <Typography variant="subtitle1" fontWeight={650}>
          {config.menuTitle} Filter
        </Typography>

        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
          {showEditWorkbook && (
            <Tooltip title={actionsDisabled ? noWriteMessage : 'Download current data to edit in Excel'} arrow>
              <span>
                <Button
                  variant="outlined"
                  startIcon={<CloudDownload fontSize="small" />}
                  onClick={onDownloadEdit}
                  disabled={writeDisabled}
                  sx={{
                    ...actionButtonSx,
                    borderColor: '#2563eb',
                    color: '#2563eb',
                    '&:hover': {
                      borderColor: '#1d4ed8',
                      backgroundColor: 'rgba(37,99,235,0.05)'
                    }
                  }}
                >
                  Download {config.menuTitle} Edit Excel
                </Button>
              </span>
            </Tooltip>
          )}

          {showEditWorkbook && (
            <Tooltip title={actionsDisabled ? noWriteMessage : 'Upload the edited Excel file by Key'} arrow disableHoverListener={!actionsDisabled}>
              <span>
                <Button
                  variant="outlined"
                  startIcon={<CloudUpload fontSize="small" />}
                  onClick={onUploadEdit}
                  disabled={writeDisabled}
                  sx={{
                    ...actionButtonSx,
                    borderColor: '#0f766e',
                    color: '#0f766e',
                    '&:hover': {
                      borderColor: '#115e59',
                      backgroundColor: 'rgba(15,118,110,0.05)'
                    }
                  }}
                >
                  Upload Edited {config.menuTitle}
                </Button>
              </span>
            </Tooltip>
          )}

          {showUpload && (
            <Tooltip title={actionsDisabled ? noWriteMessage : ''} arrow disableHoverListener={!actionsDisabled}>
              <span>
            <Button
              variant="outlined"
              startIcon={<CloudUpload fontSize="small" />}
              onClick={onUpload}
              disabled={writeDisabled}
              sx={{
                ...actionButtonSx,
                borderColor: '#111827',
                color: '#111827',
                '&:hover': {
                  borderColor: '#0b1220',
                  backgroundColor: 'rgba(17,24,39,0.04)'
                }
              }}
            >
              Upload New {config.menuTitle}
            </Button>
              </span>
            </Tooltip>
          )}

          <Tooltip title={actionsDisabled ? noWriteMessage : ''} arrow disableHoverListener={!actionsDisabled}>
            <span>
          <Button
            variant="contained"
            startIcon={<Add fontSize="small" />}
            onClick={onAdd}
            disabled={writeDisabled}
            sx={{
              ...actionButtonSx,
              backgroundColor: '#111827',
              '&:hover': { backgroundColor: '#0b1220' }
            }}
          >
            Add {config.menuTitle}
          </Button>
            </span>
          </Tooltip>
        </Stack>
      </Stack>

      <Box
        sx={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 1.5,
          alignItems: 'flex-end',
          width: '100%'
        }}
      >
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
              <MenuItem key={option.value} value={option.value}>
                {option.label}
              </MenuItem>
            ))}
          </TextField>
        ))}

        <Stack
          direction="row"
          spacing={1}
          sx={{
            flex: { xs: '1 1 100%', sm: '0 0 auto' },
            minWidth: { xs: '100%', sm: 196 },
            ml: { xs: 0, lg: 'auto' }
          }}
        >
          <Button
            variant="contained"
            startIcon={<Search fontSize="small" />}
            onClick={onSearch}
            disabled={disabled}
            fullWidth
            sx={{
              ...actionButtonSx,
              flex: '1 1 0',
              backgroundColor: '#111827',
              boxShadow: 'none',
              '&:hover': { backgroundColor: '#0b1220', boxShadow: 'none' }
            }}
          >
            Search
          </Button>

          <Button
            variant="outlined"
            onClick={onReset}
            disabled={disabled}
            fullWidth
            sx={{
              ...actionButtonSx,
              flex: '1 1 0',
              borderColor: '#111827',
              color: '#111827',
              '&:hover': {
                borderColor: '#0b1220',
                color: '#0b1220',
                backgroundColor: 'rgba(17,24,39,0.04)'
              }
            }}
          >
            Reset
          </Button>
        </Stack>
      </Box>
    </Paper>
  );
}
