import React from 'react';
import PropTypes from 'prop-types';
import {
  Box,
  Button,
  Paper,
  Stack,
  TextField,
  Tooltip,
  Typography
} from '@mui/material';
import { Add, Search } from '@mui/icons-material';

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

export default function DepartmentSearch({
  searchValue,
  departmentNameValue,
  onSearchChange,
  onDepartmentNameChange,
  onSearch,
  onReset,
  onAdd,
  canManage = true,
  manageMessage = '',
  disabled = false
}) {
  const handleSearch = () => {
    onSearch?.({
      division: searchValue || '',
      departmentName: departmentNameValue || ''
    });
  };

  const handleKeyDown = (event) => {
    if (event.key === 'Enter' && !disabled) {
      handleSearch();
    }
  };

  const handleReset = () => {
    onSearchChange?.('');
    onDepartmentNameChange?.('');
    onReset?.();
  };

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
          Department Filter
        </Typography>

        <Tooltip title={canManage ? 'Add Department' : manageMessage} arrow>
          <span>
            <Button
              variant="contained"
              startIcon={<Add fontSize="small" />}
              onClick={onAdd}
              disabled={disabled || !canManage}
              sx={{
                ...actionButtonSx,
                alignSelf: { xs: 'flex-start', sm: 'center' },
                backgroundColor: '#111827',
                '&:hover': { backgroundColor: '#0b1220' }
              }}
            >
              Add Department
            </Button>
          </span>
        </Tooltip>
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
        <TextField
          label="Department Name"
          size="small"
          value={departmentNameValue || ''}
          onChange={(event) => onDepartmentNameChange?.(event.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          fullWidth
          sx={fieldSx}
        />

        <TextField
          label="Division"
          size="small"
          value={searchValue || ''}
          onChange={(event) => onSearchChange?.(event.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          fullWidth
          sx={fieldSx}
        />

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
            onClick={handleSearch}
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
            onClick={handleReset}
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

DepartmentSearch.propTypes = {
  searchValue: PropTypes.string,
  departmentNameValue: PropTypes.string,
  onSearchChange: PropTypes.func,
  onDepartmentNameChange: PropTypes.func,
  onSearch: PropTypes.func,
  onReset: PropTypes.func,
  onAdd: PropTypes.func,
  canManage: PropTypes.bool,
  manageMessage: PropTypes.string,
  disabled: PropTypes.bool
};
