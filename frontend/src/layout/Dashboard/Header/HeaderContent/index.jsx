import { useMemo } from 'react';
import { matchPath, useLocation } from 'react-router-dom';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import { alpha, useTheme } from '@mui/material/styles';

import Profile from './Profile';

const getPageMeta = (pathname = '') => {
  const patterns = [
    { match: '/dashboard', title: 'Dashboard', section: 'Planning Overview' },
    { match: '/users', title: 'Users', section: 'Management' },
    { match: '/departments', title: 'Departments', section: 'Management' },
    { match: '/buyers', title: 'Buyers', section: 'Management' },
    { match: '/audit-logs', title: 'Audit Logs', section: 'Management' },
    { match: '/settings/general', title: 'Settings', section: 'Appearance' },
    { match: '/currencies', title: 'Currency', section: 'Master Data' },
    { match: '/vendor-codes', title: 'Vendor Code', section: 'Master Data' },
    { match: '/ship-tos', title: 'Ship To', section: 'Master Data' },
    { match: '/buyers/:buyerKey/orders/:orderId/boms/:bomId', title: 'BOM Detail', section: 'Buyer Workspace' },
    { match: '/buyers/:buyerKey/orders/:orderId', title: 'Order Detail', section: 'Buyer Workspace' },
    { match: '/buyers/:buyerKey/orders', title: 'Orders', section: 'Buyer Workspace' },
    { match: '/buyers/:buyerKey/mat-info', title: 'MAT Info', section: 'Buyer Workspace' },
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
  const pageMeta = useMemo(() => getPageMeta(pathname), [pathname]);

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
      <Profile />
    </Box>
  );
}
