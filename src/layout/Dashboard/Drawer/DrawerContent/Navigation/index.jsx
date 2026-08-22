import { Fragment, useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import Divider from '@mui/material/Divider';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import NavGroup from './NavGroup';
import NavItem from './NavItem';
import { useGetMenuMaster } from 'api/menu';
import { getDashboardMenu } from 'menu-items/dashboard';
import { listAccessibleBuyers } from 'services/buyerService';
import { getAccessibleBuyers, getSelectedBuyerKey, normalizeBuyerKey } from 'utils/buyerContext';

export default function Navigation() {
  const { pathname } = useLocation();
  const { menuMaster } = useGetMenuMaster();
  const drawerOpen = Boolean(menuMaster?.isDashboardDrawerOpened);

  const [selectedID, setSelectedID] = useState('');
  const [selectedItems, setSelectedItems] = useState('');
  const [selectedLevel, setSelectedLevel] = useState(0);
  const [buyers, setBuyers] = useState(() => getAccessibleBuyers());
  const [selectedBuyerKey, setSelectedBuyerKeyState] = useState(() => getSelectedBuyerKey());

  useEffect(() => {
    let active = true;
    const loadBuyers = async () => {
      try {
        const data = await listAccessibleBuyers();
        if (!active || !Array.isArray(data)) return;
        const normalized = data
          .filter((item) => item?.active !== false)
          .map((item) => ({
            buyerKey: normalizeBuyerKey(item.buyerKey),
            buyerName: item.buyerName || item.buyerKey,
            sequence: Number(item.sequence || 0)
          }));
        setBuyers(normalized);
        localStorage.setItem('accessibleBuyers', JSON.stringify(normalized));
        setSelectedBuyerKeyState(getSelectedBuyerKey());
      } catch {
        // Keep the permissions embedded in the current login response as fallback.
      }
    };
    loadBuyers();
    const refresh = () => loadBuyers();
    const handleBuyerChanged = (event) => {
      const nextBuyerKey = normalizeBuyerKey(event?.detail?.buyerKey || getSelectedBuyerKey());
      setSelectedBuyerKeyState(nextBuyerKey);
    };
    window.addEventListener('buyers:changed', refresh);
    window.addEventListener('buyer:changed', handleBuyerChanged);
    return () => {
      active = false;
      window.removeEventListener('buyers:changed', refresh);
      window.removeEventListener('buyer:changed', handleBuyerChanged);
    };
  }, []);

  const menuItems = useMemo(() => getDashboardMenu(buyers, selectedBuyerKey), [buyers, selectedBuyerKey]);
  const lastItem = null;
  let lastItemIndex = menuItems.items.length - 1;
  let remItems = [];
  let lastItemId;

  if (lastItem && lastItem < menuItems.items.length) {
    lastItemId = menuItems.items[lastItem - 1].id;
    lastItemIndex = lastItem - 1;
    remItems = menuItems.items.slice(lastItem - 1, menuItems.items.length).map((item) => ({
      title: item.title,
      elements: item.children,
      icon: item.icon,
      ...(item.url && {
        url: item.url
      })
    }));
  }

  const navGroups = menuItems.items.slice(0, lastItemIndex + 1).map((item) => {
    switch (item.type) {
      case 'group':
        if (item.url && item.id !== lastItemId) {
          return (
            <Fragment key={item.id}>
              <Divider sx={{ my: 0.75, borderColor: '#E8EEF5' }} />
              <NavItem item={item} level={1} isParents setSelectedID={setSelectedID} pathname={pathname} />
            </Fragment>
          );
        }
        return (
          <NavGroup
            key={item.id}
            selectedID={selectedID}
            setSelectedID={setSelectedID}
            setSelectedItems={setSelectedItems}
            setSelectedLevel={setSelectedLevel}
            selectedLevel={selectedLevel}
            selectedItems={selectedItems}
            lastItem={lastItem}
            remItems={remItems}
            lastItemId={lastItemId}
            item={item}
            pathname={pathname}
          />
        );
      default:
        return (
          <Typography key={item.id} variant="h6" color="error" align="center">
            Fix - Navigation Group
          </Typography>
        );
    }
  });

  return (
    <Box
      sx={{
        pt: drawerOpen ? 1.1 : 0,
        '& > ul:first-of-type': { mt: 0 },
        display: 'block',
        alignItems: 'center'
      }}
    >
      {navGroups}
    </Box>
  );
}
