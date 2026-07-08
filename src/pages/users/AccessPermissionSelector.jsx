import React from 'react';
import { Box, Checkbox, FormControlLabel, FormGroup, Typography } from '@mui/material';

const OPTIONS = [
  {
    value: 'BOM',
    label: 'BOM Workspace',
    description: 'Create, edit, upload and manage BOM data and BOM review.'
  },
  {
    value: 'SALES',
    label: 'Sales / MPR & Master Data',
    description: 'Manage orders, MPR, Vendor Code, MAT Info, Ship To, Loss and other master data.'
  },
  {
    value: 'VIEW_SYSTEM',
    label: 'View System',
    description: 'View all modules only. No add, edit, delete, upload, import or save actions.'
  }
];

export const normalizeAccess = (value, role) => {
  if (String(role || '').toUpperCase() === 'ADMIN') {
    return ['BOM', 'SALES'];
  }

  const raw = Array.isArray(value) ? value : String(value || '').split(/[,;|]/);
  const selected = new Set(
    raw
      .map((item) => String(item || '').trim().toUpperCase())
      .filter((item) => OPTIONS.some((option) => option.value === item))
  );

  if (selected.has('VIEW_SYSTEM') || !selected.size) {
    return ['VIEW_SYSTEM'];
  }

  return [...selected];
};

export default function AccessPermissionSelector({ role, value, onChange, disabled = false, error = '' }) {
  const isAdmin = String(role || '').toUpperCase() === 'ADMIN';
  const permissions = normalizeAccess(value, role);

  const toggle = (permission) => {
    if (disabled || isAdmin) {
      return;
    }

    if (permission === 'VIEW_SYSTEM') {
      onChange?.(['VIEW_SYSTEM']);
      return;
    }

    const next = new Set(permissions.filter((item) => item !== 'VIEW_SYSTEM'));
    next.has(permission) ? next.delete(permission) : next.add(permission);
    onChange?.(next.size ? [...next] : ['VIEW_SYSTEM']);
  };

  return (
    <Box
      sx={{
        gridColumn: { xs: 'span 1', sm: 'span 12' },
        border: '1px solid #DCE6F2',
        borderRadius: 2,
        px: 1.35,
        py: 1.1,
        backgroundColor: '#FBFDFF'
      }}
    >
      <Typography sx={{ color: '#173B63', fontSize: '0.84rem', fontWeight: 850 }}>
        System Access
      </Typography>
      <Typography sx={{ mt: 0.2, color: '#73859A', fontSize: '0.73rem' }}>
        {isAdmin
          ? 'Admin receives full access to BOM, Sales / MPR, master data and system administration.'
          : 'Choose BOM, Sales / MPR & Master Data, both, or View System.'}
      </Typography>
      <FormGroup row sx={{ mt: 0.55, gap: { xs: 0, md: 1.1 } }}>
        {OPTIONS.map((option) => (
          <FormControlLabel
            key={option.value}
            sx={{ m: 0, mr: 1.6, alignItems: 'center' }}
            control={
              <Checkbox
                size="small"
                checked={permissions.includes(option.value)}
                disabled={disabled || isAdmin}
                onChange={() => toggle(option.value)}
              />
            }
            label={
              <Box>
                <Typography sx={{ fontSize: '0.79rem', fontWeight: 750, color: '#274762' }}>
                  {option.label}
                </Typography>
                <Typography sx={{ maxWidth: 270, color: '#8293A7', fontSize: '0.67rem', lineHeight: 1.35 }}>
                  {option.description}
                </Typography>
              </Box>
            }
          />
        ))}
      </FormGroup>
      {error && (
        <Typography sx={{ mt: 0.45, color: '#D92D20', fontSize: '0.72rem' }}>
          {error}
        </Typography>
      )}
    </Box>
  );
}
