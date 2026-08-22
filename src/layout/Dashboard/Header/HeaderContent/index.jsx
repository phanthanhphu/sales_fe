import { useEffect, useMemo, useState } from 'react';
import { matchPath, useLocation, useNavigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import Button from '@mui/material/Button';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import ListItemText from '@mui/material/ListItemText';
import { alpha, useTheme } from '@mui/material/styles';
import { Check, KeyboardArrowDown, SwapHorizOutlined } from '@mui/icons-material';

import Profile from './Profile';
import { listAccessibleBuyers } from 'services/buyerService';
import { buyerPath, getAccessibleBuyers, getSelectedBuyerKey, normalizeBuyerKey, setSelectedBuyerKey } from 'utils/buyerContext';

const BUYER_WORKSPACE_SECTIONS = new Set(['orders', 'mat-info', 'vendor-codes', 'loss', 'ship-tos', 'product-colors', 'material-ship-to']);

const buyerSwitchTarget = (pathname, targetBuyerKey) => {
  const parts = String(pathname || '').split('/').filter(Boolean);
  if (parts[0] === 'buyers' && BUYER_WORKSPACE_SECTIONS.has(parts[2])) {
    // Order/BOM ids belong to the current Buyer. Never carry those ids to another Buyer.
    if (parts[2] === 'orders' && parts.length > 3) return buyerPath(targetBuyerKey, 'orders');
    return buyerPath(targetBuyerKey, parts[2]);
  }
  if (String(pathname || '') === '/dashboard') return '/dashboard';
  return pathname || buyerPath(targetBuyerKey, 'orders');
};

const getPageMeta = (pathname = '') => {
  const patterns = [
    { match: '/dashboard', title: 'Dashboard', section: 'Planning Overview' },
    { match: '/users', title: 'Users', section: 'Management' },
    { match: '/departments', title: 'Departments', section: 'Management' },
    { match: '/buyers', title: 'Buyers', section: 'Management' },
    { match: '/audit-logs', title: 'Audit Logs', section: 'Management' },
    { match: '/settings/general', title: 'Settings', section: 'Appearance' },
    { match: '/currencies', title: 'Currency', section: 'Master Data' },
    { match: '/buyers/:buyerKey/orders/:orderId/boms/:bomId', title: 'BOM Detail', section: 'Buyer Workspace' },
    { match: '/buyers/:buyerKey/orders/:orderId', title: 'Order Detail', section: 'Buyer Workspace' },
    { match: '/buyers/:buyerKey/orders', title: 'Orders', section: 'Buyer Workspace' },
    { match: '/buyers/:buyerKey/mat-info', title: 'MAT Info', section: 'Buyer Workspace' },
    { match: '/buyers/:buyerKey/vendor-codes', title: 'Vendor Code', section: 'Buyer Workspace' },
    { match: '/buyers/:buyerKey/ship-tos', title: 'Ship To', section: 'Buyer Workspace' },
    { match: '/buyers/:buyerKey/loss', title: 'Loss', section: 'Buyer Workspace' },
    { match: '/buyers/:buyerKey/product-colors', title: 'Product Color', section: 'Buyer Workspace' },
    { match: '/buyers/:buyerKey/material-ship-to', title: 'Material Ship To', section: 'Buyer Workspace' }
  ];

  for (const item of patterns) {
    const matched = matchPath({ path: item.match, end: true }, pathname);
    if (matched) {
      const buyerKey = String(matched.params?.buyerKey || '').replace(/-/g, ' ').toUpperCase();
      return {
        title: item.title,
        section: item.section,
        buyerKey
      };
    }
  }

  return { title: 'Workspace', section: 'Supply Chain Collaboration', buyerKey: '' };
};

export default function HeaderContent() {
  const theme = useTheme();
  const layoutColor = theme.layoutColor;
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const pageMeta = useMemo(() => getPageMeta(pathname), [pathname]);
  const [buyers, setBuyers] = useState(() => getAccessibleBuyers());
  const [activeBuyerKey, setActiveBuyerKey] = useState(() => getSelectedBuyerKey());
  const [buyerAnchor, setBuyerAnchor] = useState(null);

  useEffect(() => {
    let active = true;
    const loadBuyers = async () => {
      try {
        const data = await listAccessibleBuyers();
        if (!active || !Array.isArray(data)) return;
        const normalized = data
          .filter((item) => item?.active !== false)
          .map((item) => ({
            buyerKey: normalizeBuyerKey(item?.buyerKey),
            buyerName: item?.buyerName || item?.buyerKey,
            sequence: Number(item?.sequence || 0)
          }))
          .sort((left, right) => (left.sequence - right.sequence) || String(left.buyerName || '').localeCompare(String(right.buyerName || '')));
        setBuyers(normalized);
        localStorage.setItem('accessibleBuyers', JSON.stringify(normalized));
        const selected = getSelectedBuyerKey();
        if (normalized.length && !normalized.some((item) => item.buyerKey === selected)) {
          setSelectedBuyerKey(normalized[0].buyerKey);
        } else {
          setActiveBuyerKey(selected);
        }
      } catch {
        // Login buyerKeys/localStorage remains the fallback when the request is unavailable.
      }
    };

    loadBuyers();
    const handleBuyerChanged = (event) => {
      setActiveBuyerKey(normalizeBuyerKey(event?.detail?.buyerKey || getSelectedBuyerKey()));
    };

    window.addEventListener('buyers:changed', loadBuyers);
    window.addEventListener('buyer:changed', handleBuyerChanged);
    return () => {
      active = false;
      window.removeEventListener('buyers:changed', loadBuyers);
      window.removeEventListener('buyer:changed', handleBuyerChanged);
    };
  }, []);

  const currentBuyerKey = pageMeta.buyerKey ? normalizeBuyerKey(pageMeta.buyerKey) : activeBuyerKey;
  useEffect(() => {
    if (!pageMeta.buyerKey) return;
    const routeBuyerKey = normalizeBuyerKey(pageMeta.buyerKey);
    if (!buyers.some((buyer) => buyer.buyerKey === routeBuyerKey)) return;
    if (routeBuyerKey !== activeBuyerKey) setSelectedBuyerKey(routeBuyerKey);
  }, [activeBuyerKey, buyers, pageMeta.buyerKey]);

  const currentBuyer = buyers.find((buyer) => buyer.buyerKey === currentBuyerKey) || null;

  const switchBuyer = (buyer) => {
    setBuyerAnchor(null);
    const targetBuyerKey = normalizeBuyerKey(buyer?.buyerKey);
    if (!targetBuyerKey || targetBuyerKey === currentBuyerKey) return;
    if (!setSelectedBuyerKey(targetBuyerKey)) return;
    const target = buyerSwitchTarget(pathname, targetBuyerKey);
    if (target !== pathname) navigate(target);
  };

  return (
    <Box sx={{ width: 1, display: 'flex', alignItems: 'center', gap: 1.5, minWidth: 0 }}>
      <Stack spacing={0.15} sx={{ minWidth: 0, flex: 1 }}>
        <Stack direction="row" spacing={0.8} alignItems="center" sx={{ minWidth: 0 }}>
          <Typography
            sx={{
              color: '#183658',
              fontSize: '1rem',
              fontWeight: 800,
              minWidth: 0,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}
          >
            {pageMeta.title}
          </Typography>
          {pageMeta.buyerKey ? (
            <Chip
              label={pageMeta.buyerKey}
              size="small"
              sx={{
                height: 24,
                borderRadius: 999,
                fontSize: '0.72rem',
                fontWeight: 700,
                color: layoutColor.chipText,
                bgcolor: alpha(layoutColor.chipAccent, 0.08),
                border: `1px solid ${alpha(layoutColor.chipAccent, 0.12)}`
              }}
            />
          ) : null}
        </Stack>
        <Typography
          sx={{
            color: '#71849A',
            fontSize: '0.76rem',
            fontWeight: 600,
            letterSpacing: 0.1,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap'
          }}
        >
          {pageMeta.section}
        </Typography>
      </Stack>
      {buyers.length > 1 ? (
        <>
          <Button
            size="small"
            variant="outlined"
            startIcon={<SwapHorizOutlined sx={{ fontSize: '17px !important' }} />}
            endIcon={<KeyboardArrowDown sx={{ fontSize: '17px !important' }} />}
            onClick={(event) => setBuyerAnchor(event.currentTarget)}
            sx={{
              display: { xs: 'none', sm: 'inline-flex' },
              height: 34,
              minWidth: 150,
              maxWidth: 220,
              px: 1.15,
              justifyContent: 'space-between',
              textTransform: 'none',
              fontSize: '0.76rem',
              fontWeight: 750,
              color: '#183658',
              borderColor: '#D6E0EA',
              bgcolor: '#fff',
              '&:hover': { borderColor: '#9FB2C5', bgcolor: '#F8FAFC' }
            }}
          >
            <Box component="span" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {currentBuyer?.buyerName || 'Switch Buyer'}
            </Box>
          </Button>
          <Menu
            anchorEl={buyerAnchor}
            open={Boolean(buyerAnchor)}
            onClose={() => setBuyerAnchor(null)}
            PaperProps={{ sx: { mt: 0.6, minWidth: 240, maxHeight: 360, borderRadius: 1.5 } }}
          >
            {buyers.map((buyer) => {
              const selected = buyer.buyerKey === currentBuyerKey;
              return (
                <MenuItem
                  key={buyer.buyerKey}
                  selected={selected}
                  onClick={() => switchBuyer(buyer)}
                  sx={{ py: 0.8, gap: 1 }}
                >
                  <Box sx={{ width: 20, display: 'flex', justifyContent: 'center' }}>
                    {selected ? <Check fontSize="small" color="primary" /> : null}
                  </Box>
                  <ListItemText
                    primary={buyer.buyerName || buyer.buyerKey}
                    secondary={buyer.buyerKey}
                    primaryTypographyProps={{ fontSize: '0.82rem', fontWeight: selected ? 750 : 650 }}
                    secondaryTypographyProps={{ fontSize: '0.68rem' }}
                  />
                </MenuItem>
              );
            })}
          </Menu>
        </>
      ) : null}
      <Profile />
    </Box>
  );
}
