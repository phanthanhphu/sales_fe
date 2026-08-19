import { useEffect } from 'react';
import { Outlet } from 'react-router-dom';

import useMediaQuery from '@mui/material/useMediaQuery';
import Toolbar from '@mui/material/Toolbar';
import Box from '@mui/material/Box';

import Drawer from './Drawer';
import Header from './Header';
import Footer from './Footer';
import Loader from 'components/Loader';

import { handlerDrawerOpen, useGetMenuMaster } from 'api/menu';
import { DRAWER_WIDTH, MINI_DRAWER_WIDTH } from 'config';

export default function MainLayout() {
  const { menuMaster, menuMasterLoading } = useGetMenuMaster();
  const downXL = useMediaQuery((theme) => theme.breakpoints.down('xl'));
  useEffect(() => {
    handlerDrawerOpen(!downXL);
  }, [downXL]);

  // SWR returns `undefined` on its first render. Do not render the dashboard until the menu state is ready.
  if (menuMasterLoading || !menuMaster) return <Loader />;

  const drawerOpen = Boolean(menuMaster.isDashboardDrawerOpened);

  return (
    <Box sx={{ display: 'flex', width: '100%', minHeight: '100vh', bgcolor: '#F4F7FB' }}>
      <Header />
      <Drawer />

      <Box
        component="main"
        sx={{
          width: `calc(100% - ${drawerOpen ? DRAWER_WIDTH : MINI_DRAWER_WIDTH}px)`,
          flexGrow: 1,
          p: { xs: 0.4, sm: 0.65, md: 0.8 },
          bgcolor: '#F4F7FB',
          transition: 'width .2s ease'
        }}
      >
        <Toolbar sx={{ minHeight: '64px !important', p: 0 }} />
        <Box
          sx={{
            px: 0,
            position: 'relative',
            minHeight: 'calc(100vh - 72px)',
            display: 'flex',
            flexDirection: 'column'
          }}
        >
          <Outlet />
          <Footer />
        </Box>
      </Box>
    </Box>
  );
}
