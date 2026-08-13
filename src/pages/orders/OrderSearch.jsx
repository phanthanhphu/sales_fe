import { Box, Button, MenuItem, Paper, Stack, TextField, Tooltip, Typography } from '@mui/material';
import { Add, RestartAlt, Search } from '@mui/icons-material';

export default function OrderSearch({ filters, onChange, onSearch, onReset, onAdd, loading, actionsDisabled = false }) {
  const writeDisabled = loading || actionsDisabled;

  return (
    <Paper elevation={0} sx={{ p: 1.25, border: '1px solid #e5e7eb', borderRadius: 2, mb: 2 }}>
      <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" spacing={1.5} sx={{ mb: 1.5 }}>
        <Box>
          <Typography sx={{ fontWeight: 900, color: '#103B5C' }}>Order Filter</Typography>
          <Typography sx={{ mt: 0.2, fontSize: '0.78rem', color: 'text.secondary' }}>Search order number, style, customer, season, or status.</Typography>
        </Box>
        <Tooltip title={actionsDisabled ? 'Sales permission is required to create orders.' : ''} arrow disableHoverListener={!actionsDisabled}>
          <span>
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={onAdd}
              disabled={writeDisabled}
              sx={{ textTransform: 'none', fontWeight: 800, backgroundColor: '#103B5C' }}
            >
              Add Order
            </Button>
          </span>
        </Tooltip>
      </Stack>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', gap: 1.25 }}>
        <TextField size="small" label="Keyword" value={filters.keyword} onChange={(event) => onChange('keyword', event.target.value)} onKeyDown={(event) => event.key === 'Enter' && onSearch()} sx={{ minWidth: { xs: '100%', md: 260 }, flex: 1 }} />
        <TextField size="small" label="Season" value={filters.season} onChange={(event) => onChange('season', event.target.value)} sx={{ width: { xs: '100%', sm: 150 } }} />
        <TextField size="small" select label="Status" value={filters.status} onChange={(event) => onChange('status', event.target.value)} sx={{ width: { xs: '100%', sm: 180 } }}>
          <MenuItem value="">All status</MenuItem>
          <MenuItem value="DRAFT">Draft</MenuItem>
          <MenuItem value="BOM_IN_PROGRESS">BOM in progress</MenuItem>
          <MenuItem value="BOM_SUBMITTED">BOM submitted</MenuItem>
          <MenuItem value="MPR_DRAFT">MPR draft</MenuItem>
          <MenuItem value="MPR_COMPLETED">MPR completed</MenuItem>
        </TextField>
        <Button variant="contained" startIcon={<Search />} onClick={onSearch} disabled={loading} sx={{ textTransform: 'none', backgroundColor: '#111827' }}>Search</Button>
        <Button variant="outlined" startIcon={<RestartAlt />} onClick={onReset} disabled={loading} sx={{ textTransform: 'none', borderColor: '#9ca3af', color: '#374151' }}>Reset</Button>
      </Box>
    </Paper>
  );
}
