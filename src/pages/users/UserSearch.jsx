import React, { useCallback } from 'react';
import { Box, Button, FormControl, InputLabel, MenuItem, Paper, Select, Stack, TextField, Typography } from '@mui/material';
import { Add, Search } from '@mui/icons-material';

const fieldSx = { flex: '1 1 190px', minWidth: { xs: '100%', sm: 170, md: 190 }, '& .MuiInputBase-root': { height: 38 }, '& .MuiInputLabel-root': { fontWeight: 600 } };
const actionButtonSx = { height: 34, minWidth: 94, px: 2.2, borderRadius: 1.2, textTransform: 'none', fontWeight: 500, whiteSpace: 'nowrap' };

export default function UserSearch({
  searchUsername, setSearchUsername, searchAddress, setSearchAddress, searchPhone, setSearchPhone,
  searchEmail, setSearchEmail, searchRole, setSearchRole, searchAccessPermission, setSearchAccessPermission,
  setPage, onSearch, onReset, onAdd, disabled = false
}) {
  const resetPage = () => setPage?.(0);
  const handleKeyDown = useCallback((event) => { if (event.key === 'Enter' && !disabled) { resetPage(); onSearch?.(); } }, [disabled, onSearch]);
  return (
    <Paper elevation={0} sx={{ p: 1.25, mb: 1.25, borderRadius: 2, border: '1px solid #e5e7eb', backgroundColor: '#fff', overflow: 'hidden' }}>
      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'stretch', sm: 'center' }} spacing={1.25} sx={{ mb: 1.5 }}>
        <Typography variant="subtitle1" fontWeight={650}>User Filter</Typography>
        <Button variant="contained" startIcon={<Add fontSize="small" />} onClick={onAdd} disabled={disabled} sx={{ ...actionButtonSx, alignSelf: { xs: 'flex-start', sm: 'center' }, backgroundColor: '#111827', '&:hover': { backgroundColor: '#0b1220' } }}>Add User</Button>
      </Stack>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, alignItems: 'flex-end', width: '100%' }}>
        <TextField label="Username" size="small" value={searchUsername} onChange={(event) => { resetPage(); setSearchUsername(event.target.value); }} onKeyDown={handleKeyDown} disabled={disabled} fullWidth sx={fieldSx} />
        <TextField label="Company Email" size="small" value={searchEmail} onChange={(event) => { resetPage(); setSearchEmail(event.target.value); }} onKeyDown={handleKeyDown} disabled={disabled} fullWidth sx={fieldSx} />
        <TextField label="Phone" size="small" value={searchPhone} onChange={(event) => { resetPage(); setSearchPhone(event.target.value); }} onKeyDown={handleKeyDown} disabled={disabled} fullWidth sx={fieldSx} />
        <FormControl fullWidth disabled={disabled} size="small" sx={fieldSx}><InputLabel>Role</InputLabel><Select value={searchRole || ''} label="Role" onChange={(event) => { resetPage(); setSearchRole(event.target.value); }}><MenuItem value="">All roles</MenuItem><MenuItem value="USER">User</MenuItem><MenuItem value="ADMIN">Admin</MenuItem></Select></FormControl>
        <FormControl fullWidth disabled={disabled} size="small" sx={fieldSx}><InputLabel>System Access</InputLabel><Select value={searchAccessPermission || ''} label="System Access" onChange={(event) => { resetPage(); setSearchAccessPermission?.(event.target.value); }}><MenuItem value="">All access</MenuItem><MenuItem value="BOM">BOM</MenuItem><MenuItem value="SALES">Sales</MenuItem><MenuItem value="VIEW_SYSTEM">View System</MenuItem></Select></FormControl>
        <TextField label="Address" size="small" value={searchAddress} onChange={(event) => { resetPage(); setSearchAddress(event.target.value); }} onKeyDown={handleKeyDown} disabled={disabled} fullWidth sx={fieldSx} />
        <Stack direction="row" spacing={1} sx={{ flex: { xs: '1 1 100%', sm: '0 0 auto' }, minWidth: { xs: '100%', sm: 196 }, ml: { xs: 0, lg: 'auto' } }}>
          <Button variant="contained" startIcon={<Search fontSize="small" />} onClick={() => { resetPage(); onSearch?.(); }} disabled={disabled} fullWidth sx={{ ...actionButtonSx, flex: '1 1 0', backgroundColor: '#111827', boxShadow: 'none', '&:hover': { backgroundColor: '#0b1220', boxShadow: 'none' } }}>Search</Button>
          <Button variant="outlined" onClick={onReset} disabled={disabled} fullWidth sx={{ ...actionButtonSx, flex: '1 1 0', borderColor: '#111827', color: '#111827', '&:hover': { borderColor: '#0b1220', color: '#0b1220', backgroundColor: 'rgba(17,24,39,0.04)' } }}>Reset</Button>
        </Stack>
      </Box>
    </Paper>
  );
}
