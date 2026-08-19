import { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  CircularProgress,
  Paper,
  Stack,
  Tab,
  Tabs,
  Typography
} from '@mui/material';
import { useParams } from 'react-router-dom';

import { getApiError, getOrder } from '../../services/orderBomMprService';
import StatusBadge from '../../components/StatusBadge';
import { normalizeBuyerKey } from 'utils/buyerContext';
import BomTab from './BomTab';
import MprTab from './MprTab';

export default function OrderDetailPage() {
  const { buyerKey: routeBuyerKey, orderId } = useParams();
  const buyerKey = normalizeBuyerKey(routeBuyerKey);

  const [order, setOrder] = useState(null);
  const [tab, setTab] = useState(0);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    const loadOrder = async () => {
      try {
        const data = await getOrder(orderId, buyerKey);
        if (alive) {
          setOrder(data);
          setError('');
        }
      } catch (requestError) {
        if (alive) setError(getApiError(requestError, 'Unable to load order.'));
      }
    };
    loadOrder();
    return () => { alive = false; };
  }, [buyerKey, orderId]);

  if (error) {
    return <Box sx={{ p: 1 }}><Alert severity="error">{error}</Alert></Box>;
  }

  if (!order) {
    return <Box sx={{ p: 3, display: 'flex', justifyContent: 'center' }}><CircularProgress size={28} /></Box>;
  }

  return (
    <Box sx={{ p: { xs: 0.55, sm: 0.7, md: 0.85 } }}>
      <Paper
        elevation={0}
        sx={{
          border: '1px solid #dfe6ee',
          borderRadius: 2,
          overflow: 'hidden',
          bgcolor: '#fff'
        }}
      >
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          alignItems={{ xs: 'stretch', sm: 'center' }}
          justifyContent="space-between"
          spacing={0.8}
          sx={{ px: 1.15, py: 0.75, borderBottom: '1px solid #e5e7eb', bgcolor: '#fbfcfe' }}
        >
          <Stack direction="row" spacing={0.8} alignItems="center" flexWrap="wrap" useFlexGap>
            <Typography sx={{ fontSize: '0.94rem', fontWeight: 800, color: '#173b63' }}>
              Order {order.orderNo}
            </Typography>
            <Typography sx={{ color: '#718096', fontSize: '0.8rem' }}>•</Typography>
            <Typography sx={{ color: '#4f647a', fontSize: '0.82rem', fontWeight: 600 }}>
              {[order.style, order.customer, order.season].filter(Boolean).join(' · ')}
            </Typography>
          </Stack>
          <StatusBadge status={order.status || 'DRAFT'} />
        </Stack>

        <Tabs
          value={tab}
          onChange={(_, nextTab) => setTab(nextTab)}
          sx={{
            px: 0.75,
            minHeight: 38,
            borderBottom: '1px solid #e5e7eb',
            '& .MuiTab-root': { minHeight: 38, py: 0.45, px: 1.5, fontSize: '0.8rem' }
          }}
        >
          <Tab label="BOM" sx={{ fontWeight: 750, textTransform: 'none' }} />
          <Tab label="Sales / MPR" sx={{ fontWeight: 750, textTransform: 'none' }} />
        </Tabs>

        <Box sx={{ p: 0 }}>
          {tab === 0 ? <BomTab order={order} buyerKey={buyerKey} /> : <MprTab order={order} buyerKey={buyerKey} />}
        </Box>
      </Paper>
    </Box>
  );
}
