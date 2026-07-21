import { useEffect, useMemo, useState } from 'react';
import { Alert, Box, Checkbox, CircularProgress, FormControlLabel, FormGroup, Typography } from '@mui/material';
import { listBuyers } from '../../services/buyerService';
import { DEFAULT_BUYERS, normalizeBuyerKey } from '../../utils/buyerContext';

export const normalizeBuyerPermissions = (value, role, fallbackToLegacy = true) => {
  if (String(role || '').trim().toUpperCase() === 'ADMIN') {
    return DEFAULT_BUYERS.map((item) => item.buyerKey);
  }
  const source = Array.isArray(value) ? value : String(value || '').split(/[,;|]/);
  const keys = [...new Set(source
    .map((item) => String(item || '').trim())
    .filter(Boolean)
    .map(normalizeBuyerKey))];
  return keys.length ? keys : (fallbackToLegacy ? ['LLBEAN'] : []);
};

export default function BuyerPermissionSelector({ role, value, onChange, disabled = false, error = '' }) {
  const isAdmin = String(role || '').trim().toUpperCase() === 'ADMIN';
  const [buyers, setBuyers] = useState(DEFAULT_BUYERS);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState('');
  const selected = useMemo(() => normalizeBuyerPermissions(value, role, false), [role, value]);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    listBuyers({ active: true })
      .then((rows) => {
        if (!alive) return;
        const items = Array.isArray(rows) && rows.length ? rows : DEFAULT_BUYERS;
        setBuyers(items);
        setLoadError('');
      })
      .catch(() => {
        if (!alive) return;
        setBuyers(DEFAULT_BUYERS);
        setLoadError('Unable to load Buyer Master. Default Buyers are shown.');
      })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);

  const toggle = (buyerKey) => {
    if (disabled || isAdmin) return;
    const key = normalizeBuyerKey(buyerKey);
    const next = new Set(selected);
    next.has(key) ? next.delete(key) : next.add(key);
    onChange?.([...next]);
  };

  return (
    <Box sx={{ gridColumn: { xs: 'span 1', sm: 'span 12' }, border: '1px solid #DCE6F2', borderRadius: 2, px: 1.35, py: 1.1, backgroundColor: '#FBFDFF' }}>
      <Typography sx={{ color: '#173B63', fontSize: '0.84rem', fontWeight: 850 }}>Buyer Access</Typography>
      <Typography sx={{ mt: 0.2, color: '#73859A', fontSize: '0.73rem' }}>
        {isAdmin ? 'Admin can access all active Buyers.' : 'Only selected Buyer menus and Buyer-owned data are available to this user.'}
      </Typography>
      {loadError && <Alert severity="warning" sx={{ mt: 0.75, py: 0 }}>{loadError}</Alert>}
      {loading ? (
        <Box sx={{ py: 1, display: 'flex', alignItems: 'center', gap: 1 }}><CircularProgress size={18} /><Typography sx={{ fontSize: '0.76rem' }}>Loading Buyers…</Typography></Box>
      ) : (
        <FormGroup row sx={{ mt: 0.55, display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))', md: 'repeat(3, minmax(0, 1fr))' }, gap: 0.25 }}>
          {buyers.map((buyer) => (
            <FormControlLabel
              key={buyer.buyerKey}
              sx={{ m: 0 }}
              control={<Checkbox size="small" checked={isAdmin || selected.includes(normalizeBuyerKey(buyer.buyerKey))} disabled={disabled || isAdmin} onChange={() => toggle(buyer.buyerKey)} />}
              label={<Typography sx={{ fontSize: '0.79rem', fontWeight: 700, color: '#274762' }}>{buyer.buyerName}</Typography>}
            />
          ))}
        </FormGroup>
      )}
      {error && <Typography sx={{ mt: 0.45, color: '#D92D20', fontSize: '0.72rem' }}>{error}</Typography>}
    </Box>
  );
}
