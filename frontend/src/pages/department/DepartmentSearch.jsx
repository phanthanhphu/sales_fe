import React from 'react';
import PropTypes from 'prop-types';
import { Box, Button, Paper, TextField, Tooltip } from '@mui/material';
import { Add, Search } from '@mui/icons-material';

const fieldSx = {
  flex: '1 1 200px',
  minWidth: { xs: '100%', sm: 180, md: 200 },
  '& .MuiInputBase-root': { height: 34 },
  '& .MuiInputLabel-root': { fontWeight: 600 }
};
const actionButtonSx = { height: 34, minWidth: 82, px: 1.4, borderRadius: 1.2, textTransform: 'none', fontWeight: 700, whiteSpace: 'nowrap' };

export default function DepartmentSearch({ searchValue, departmentNameValue, onSearchChange, onDepartmentNameChange, onSearch, onReset, onAdd, canManage = true, manageMessage = '', disabled = false }) {
  const handleSearch = () => onSearch?.({ division: searchValue || '', departmentName: departmentNameValue || '' });
  const handleKeyDown = (event) => { if (event.key === 'Enter' && !disabled) handleSearch(); };
  const handleReset = () => { onSearchChange?.(''); onDepartmentNameChange?.(''); onReset?.(); };

  return (
    <Paper elevation={0} sx={{ p: 0.85, mb: 0.8, borderRadius: 1.7, border: '1px solid #e5e7eb', backgroundColor: '#fff', overflow: 'hidden' }}>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, alignItems: 'center', width: '100%' }}>
        <TextField label="Department Name" size="small" value={departmentNameValue || ''} onChange={(event) => onDepartmentNameChange?.(event.target.value)} onKeyDown={handleKeyDown} disabled={disabled} fullWidth sx={fieldSx} />
        <TextField label="Division" size="small" value={searchValue || ''} onChange={(event) => onSearchChange?.(event.target.value)} onKeyDown={handleKeyDown} disabled={disabled} fullWidth sx={fieldSx} />
        <Button variant="contained" startIcon={<Search fontSize="small" />} onClick={handleSearch} disabled={disabled} sx={{ ...actionButtonSx, backgroundColor: '#103B5C' }}>Search</Button>
        <Button variant="outlined" onClick={handleReset} disabled={disabled} sx={{ ...actionButtonSx, borderColor: '#cbd5e1', color: '#334155' }}>Reset</Button>
        <Box sx={{ flex: 1 }} />
        <Tooltip title={canManage ? '' : manageMessage} arrow disableHoverListener={canManage}>
          <span><Button variant="contained" startIcon={<Add fontSize="small" />} onClick={onAdd} disabled={disabled || !canManage} sx={{ ...actionButtonSx, backgroundColor: '#103B5C' }}>Add Department</Button></span>
        </Tooltip>
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
