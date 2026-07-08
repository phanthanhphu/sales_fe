import { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Breadcrumbs,
  Chip,
  CircularProgress,
  Link,
  Paper,
  Tab,
  Tabs,
  Typography
} from '@mui/material';
import { Link as RouterLink, useParams } from 'react-router-dom';

import { getApiError, getOrder } from '../../services/orderBomMprService';
import { statusSx } from '../orders/orderUi';
import BomTab from './BomTab';
import MprTab from './MprTab';

export default function OrderDetailPage() {
  const { orderId } = useParams();

  const [order, setOrder] = useState(null);
  const [tab, setTab] = useState(0);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;

    const loadOrder = async () => {
      try {
        const data = await getOrder(orderId);

        if (alive) {
          setOrder(data);
          setError('');
        }
      } catch (requestError) {
        if (alive) {
          setError(getApiError(requestError, 'Unable to load order.'));
        }
      }
    };

    loadOrder();

    return () => {
      alive = false;
    };
  }, [orderId]);

  if (error) {
    return (
      <Box sx={{ p: 2.5 }}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  if (!order) {
    return (
      <Box
        sx={{
          p: 4,
          display: 'flex',
          justifyContent: 'center'
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 1.5, md: 2.5 } }}>
      {/* Keep breadcrumb only. No large order title is rendered below. */}
      <Breadcrumbs
        aria-label="breadcrumb"
        sx={{
          mb: 1.5,
          fontSize: '.85rem'
        }}
      >
        <Link
          component={RouterLink}
          to="/orders"
          underline="hover"
          color="inherit"
        >
          Orders
        </Link>

        <Typography color="text.primary" sx={{ fontSize: '.85rem' }}>
          {order.orderNo}
        </Typography>
      </Breadcrumbs>

      {/* Order summary without the large Order No heading */}
      <Paper
        elevation={0}
        sx={{
          p: 2,
          mb: 2,
          border: '1px solid #e5e7eb',
          borderRadius: 2
        }}
      >
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 1.5,
            flexWrap: 'wrap'
          }}
        >
          <Typography sx={{ color: 'text.secondary', fontSize: '.9rem' }}>
            {[order.style, order.customer, order.season]
              .filter(Boolean)
              .join(' · ')}
          </Typography>

          <Chip
            label={String(order.status || 'DRAFT').replaceAll('_', ' ')}
            sx={statusSx(order.status)}
          />
        </Box>
      </Paper>

      <Paper
        elevation={0}
        sx={{
          border: '1px solid #e5e7eb',
          borderRadius: 2,
          overflow: 'hidden'
        }}
      >
        <Tabs
          value={tab}
          onChange={(_, nextTab) => setTab(nextTab)}
          sx={{
            px: 1,
            borderBottom: '1px solid #e5e7eb'
          }}
        >
          <Tab
            label="BOM"
            sx={{
              fontWeight: 900,
              textTransform: 'none'
            }}
          />

          <Tab
            label="Sales / MPR"
            sx={{
              fontWeight: 900,
              textTransform: 'none'
            }}
          />
        </Tabs>

        <Box sx={{ p: { xs: 1.25, md: 2 } }}>
          {tab === 0 ? <BomTab order={order} /> : <MprTab order={order} />}
        </Box>
      </Paper>
    </Box>
  );
}
