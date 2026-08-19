import PropTypes from 'prop-types';
import { useState } from 'react';
import {
  Button,
  Checkbox,
  Divider,
  ListItemText,
  Menu,
  MenuItem,
  Stack,
  Typography
} from '@mui/material';
import ViewColumnOutlinedIcon from '@mui/icons-material/ViewColumnOutlined';

export default function ColumnVisibilityMenu({
  columns = [],
  visibleKeys = [],
  lockedKeys = [],
  onChange,
  onCompact,
  compactLabel = 'Compact',
  presets = []
}) {
  const [anchorEl, setAnchorEl] = useState(null);
  const locked = new Set(lockedKeys);
  const visible = new Set(visibleKeys);
  const allKeys = columns.map((column) => column.key);

  const toggle = (key) => {
    if (locked.has(key)) return;
    const next = new Set(visible);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    onChange?.(allKeys.filter((item) => next.has(item)));
  };

  const applyKeys = (keys = []) => {
    const requested = new Set([...(keys || []), ...lockedKeys]);
    onChange?.(allKeys.filter((item) => requested.has(item)));
  };

  return (
    <>
      <Button
        size="small"
        variant="outlined"
        startIcon={<ViewColumnOutlinedIcon />}
        onClick={(event) => setAnchorEl(event.currentTarget)}
        sx={{ whiteSpace: 'nowrap', color: '#334155', borderColor: '#cbd5e1', bgcolor: '#fff' }}
      >
        View · {visibleKeys.length}/{columns.length}
      </Button>
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={() => setAnchorEl(null)}
        PaperProps={{ sx: { width: 310, maxHeight: 480, mt: 0.5, border: '1px solid #e2e8f0', boxShadow: '0 12px 32px rgba(15,23,42,.12)' } }}
      >
        <Stack sx={{ px: 1.5, pt: 1.05, pb: 0.8 }} spacing={0.75}>
          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <Typography sx={{ fontSize: '0.75rem', fontWeight: 700, color: '#334155' }}>Table view</Typography>
            <Button size="small" onClick={() => onChange?.(allKeys)} sx={{ minWidth: 0, px: 0.7, fontSize: '.69rem' }}>
              Show all
            </Button>
          </Stack>
          {(presets.length > 0 || onCompact) && (
            <Stack direction="row" flexWrap="wrap" gap={0.5} useFlexGap>
              {onCompact && (
                <Button size="small" variant="outlined" onClick={() => onCompact?.()} sx={{ minHeight: 28, px: 0.8, fontSize: '.68rem', borderColor: '#dbe3ec' }}>
                  {compactLabel}
                </Button>
              )}
              {presets.map((preset) => (
                <Button
                  key={preset.label}
                  size="small"
                  variant="outlined"
                  onClick={() => applyKeys(preset.keys)}
                  sx={{ minHeight: 28, px: 0.8, fontSize: '.68rem', borderColor: '#dbe3ec' }}
                >
                  {preset.label}
                </Button>
              ))}
            </Stack>
          )}
        </Stack>
        <Divider />
        <Typography sx={{ px: 1.5, pt: 0.8, pb: 0.35, fontSize: '.66rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.04em' }}>
          Columns
        </Typography>
        {columns.map((column) => (
          <MenuItem key={column.key} dense disabled={locked.has(column.key)} onClick={() => toggle(column.key)} sx={{ py: 0.2 }}>
            <Checkbox size="small" checked={visible.has(column.key)} disabled={locked.has(column.key)} />
            <ListItemText primary={column.label} primaryTypographyProps={{ fontSize: '.76rem' }} />
          </MenuItem>
        ))}
      </Menu>
    </>
  );
}

ColumnVisibilityMenu.propTypes = {
  columns: PropTypes.array,
  visibleKeys: PropTypes.array,
  lockedKeys: PropTypes.array,
  onChange: PropTypes.func,
  onCompact: PropTypes.func,
  compactLabel: PropTypes.string,
  presets: PropTypes.array
};
