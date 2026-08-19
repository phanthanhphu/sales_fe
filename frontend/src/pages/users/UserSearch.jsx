import React, { useCallback } from 'react';
import { Box, Button, FormControl, InputLabel, MenuItem, Paper, Select, TextField } from '@mui/material';
import { Add, Search } from '@mui/icons-material';

const fieldSx = { flex: '1 1 155px', minWidth: { xs: '100%', sm: 145, md: 155 }, '& .MuiInputBase-root': { height: 34 }, '& .MuiInputLabel-root': { fontWeight: 600 } };
const actionButtonSx = { height: 34, minWidth: 82, px: 1.35, borderRadius: 1.2, textTransform: 'none', fontWeight: 700, whiteSpace: 'nowrap' };

export default function UserSearch({
  searchUsername, setSearchUsername, searchAddress, setSearchAddress, searchPhone, setSearchPhone,
  searchEmail, setSearchEmail, searchRole, setSearchRole, searchAccessPermission, setSearchAccessPermission,
  setPage, onSearch, onReset, onAdd, disabled = false
}) {
  const resetPage = () => setPage?.(0);
  const handleKeyDown = useCallback((event) => { if (event.key === 'Enter' && !disabled) { resetPage(); onSearch?.(); } }, [disabled, onSearch]);
  return (
    <Paper elevation={0} sx={{ p: 0.85, mb: 0.8, borderRadius: 1.7, border: '1px solid #e5e7eb', backgroundColor: '#fff', overflow: 'hidden' }}>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, alignItems: 'center', width: '100%' }}>
        <TextField label="Username" size="small" value={searchUsername} onChange={(event) => { resetPage(); setSearchUsername(event.target.value); }} onKeyDown={handleKeyDown} disabled={disabled} fullWidth sx={fieldSx} />
        <TextField label="Company Email" size="small" value={searchEmail} onChange={(event) => { resetPage(); setSearchEmail(event.target.value); }} onKeyDown={handleKeyDown} disabled={disabled} fullWidth sx={fieldSx} />
        <TextField label="Phone" size="small" value={searchPhone} onChange={(event) => { resetPage(); setSearchPhone(event.target.value); }} onKeyDown={handleKeyDown} disabled={disabled} fullWidth sx={fieldSx} />
        <FormControl fullWidth disabled={disabled} size="small" sx={fieldSx}><InputLabel>Role</InputLabel><Select value={searchRole || ''} label="Role" onChange={(event) => { resetPage(); setSearchRole(event.target.value); }}><MenuItem value="">All roles</MenuItem><MenuItem value="USER">User</MenuItem><MenuItem value="ADMIN">Admin</MenuItem></Select></FormControl>
        <FormControl fullWidth disabled={disabled} size="small" sx={fieldSx}><InputLabel>System Access</InputLabel><Select value={searchAccessPermission || ''} label="System Access" onChange={(event) => { resetPage(); setSearchAccessPermission?.(event.target.value); }}><MenuItem value="">All access</MenuItem><MenuItem value="BOM">BOM</MenuItem><MenuItem value="SALES">Sales</MenuItem><MenuItem value="VIEW_SYSTEM">View System</MenuItem></Select></FormControl>
        <TextField label="Address" size="small" value={searchAddress} onChange={(event) => { resetPage(); setSearchAddress(event.target.value); }} onKeyDown={handleKeyDown} disabled={disabled} fullWidth sx={fieldSx} />
        <Button variant="contained" startIcon={<Search fontSize="small" />} onClick={() => { resetPage(); onSearch?.(); }} disabled={disabled} sx={{ ...actionButtonSx, backgroundColor: '#103B5C' }}>Search</Button>
        <Button variant="outlined" onClick={onReset} disabled={disabled} sx={{ ...actionButtonSx, borderColor: '#cbd5e1', color: '#334155' }}>Reset</Button>
        <Box sx={{ flex: { xs: '1 1 100%', xl: 1 } }} />
        <Button variant="contained" startIcon={<Add fontSize="small" />} onClick={onAdd} disabled={disabled} sx={{ ...actionButtonSx, backgroundColor: '#103B5C' }}>Add User</Button>
      </Box>
    </Paper>
  );
}
