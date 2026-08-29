import { Box, Button, MenuItem, TextField, Tooltip } from '@mui/material';
import { Add, RestartAlt, Search } from '@mui/icons-material';

export default function OrderSearch({ filters, onChange, onSearch, onReset, onAdd, loading, actionsDisabled = false, embedded = false }) {
  const writeDisabled = loading || actionsDisabled;
  const fieldSx = { '& .MuiInputBase-root': { height: 34 } };
  const buttonSx = { height: 34, minWidth: 78, textTransform: 'none', fontWeight: 700 };

  return (
    <Box
      sx={{
        p: 0.75,
        mb: embedded ? 0 : 0.8,
        border: embedded ? 0 : '1px solid #e5e7eb',
        borderBottom: embedded ? '1px solid #e5e7eb' : undefined,
        borderRadius: embedded ? 0 : 1.7,
        bgcolor: '#fff',
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        gap: 0.65
      }}
    >
      <TextField size="small" label="Keyword" value={filters.keyword} onChange={(event) => onChange('keyword', event.target.value)} onKeyDown={(event) => event.key === 'Enter' && onSearch()} sx={{ ...fieldSx, minWidth: { xs: '100%', md: 280 }, flex: 1 }} />
      <TextField size="small" label="Season" value={filters.season} onChange={(event) => onChange('season', event.target.value)} sx={{ ...fieldSx, width: { xs: '100%', sm: 135 } }} />
      <TextField size="small" select label="Status" value={filters.status} onChange={(event) => onChange('status', event.target.value)} sx={{ ...fieldSx, width: { xs: '100%', sm: 170 } }}>
        <MenuItem value="">All status</MenuItem>
        <MenuItem value="DRAFT">Draft</MenuItem>
        <MenuItem value="BOM_IN_PROGRESS">BOM in progress</MenuItem>
        <MenuItem value="BOM_SUBMITTED">BOM submitted</MenuItem>
        <MenuItem value="MPR_IN_PROGRESS">MPR in progress</MenuItem>
        <MenuItem value="MPR_COMPLETED">MPR completed</MenuItem>
      </TextField>
      <Button size="small" variant="contained" startIcon={<Search fontSize="small" />} onClick={onSearch} disabled={loading} sx={{ ...buttonSx, backgroundColor: '#103B5C' }}>Search</Button>
      <Button size="small" variant="text" startIcon={<RestartAlt fontSize="small" />} onClick={onReset} disabled={loading} sx={{ ...buttonSx, color: '#52677d' }}>Reset</Button>
      <Box sx={{ flex: { xs: '1 1 100%', lg: 1 } }} />
      <Tooltip title={actionsDisabled ? 'Sales permission is required to create orders.' : ''} arrow disableHoverListener={!actionsDisabled}>
        <span>
          <Button size="small" variant="contained" startIcon={<Add fontSize="small" />} onClick={onAdd} disabled={writeDisabled} sx={{ ...buttonSx, backgroundColor: '#103B5C' }}>Add Order</Button>
        </span>
      </Tooltip>
    </Box>
  );
}
