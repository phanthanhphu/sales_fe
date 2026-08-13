import { useMemo } from 'react';

import { alpha } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Box from '@mui/material/Box';

import AppBarStyled from './AppBarStyled';
import HeaderContent from './HeaderContent';
import IconButton from 'components/@extended/IconButton';

import { handlerDrawerOpen, useGetMenuMaster } from 'api/menu';
import { HEADER_HEIGHT } from 'config';
import { HamburgerMenu } from 'iconsax-reactjs';

export default function Header() {
  const downLG = useMediaQuery((theme) => theme.breakpoints.down('lg'));
  const { menuMaster } = useGetMenuMaster();
  const drawerOpen = Boolean(menuMaster?.isDashboardDrawerOpened);
  const headerContent = useMemo(() => <HeaderContent />, []);

  const mainHeader = (
    <Toolbar
      sx={{
        minHeight: HEADER_HEIGHT,
        px: { xs: 1, sm: 1.5, lg: 2 },
        gap: 0.75,
        width: '100%',
        alignItems: 'center'
      }}
    >
      <IconButton
        aria-label={drawerOpen ? 'Collapse sidebar' : 'Expand sidebar'}
        onClick={() => handlerDrawerOpen(!drawerOpen)}
        edge="start"
        color="secondary"
        variant="light"
        size="large"
        sx={{
          width: 36,
          height: 36,
          p: 0,
          borderRadius: 2.5,
          color: '#2E5F97',
          bgcolor: '#F2F6FB',
          border: `1px solid ${alpha('#3B82F6', 0.12)}`,
          '&:hover': {
            color: '#2563EB',
            bgcolor: '#EAF2FF',
            transform: 'none'
          }
        }}
      >
        <HamburgerMenu size={20} />
      </IconButton>

      <Box sx={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center' }}>{headerContent}</Box>
    </Toolbar>
  );

  const appBarSx = {
    bgcolor: alpha('#FFFFFF', 0.96),
    color: '#2D4358',
    boxShadow: 'none',
    backdropFilter: 'blur(10px)',
    WebkitBackdropFilter: 'blur(10px)',
    borderBottom: '1px solid #E8EEF5'
  };

  return !downLG ? (
    <AppBarStyled open={drawerOpen} position="fixed" elevation={0} sx={appBarSx}>
      {mainHeader}
    </AppBarStyled>
  ) : (
    <AppBar
      position="fixed"
      elevation={0}
      sx={{
        ...appBarSx,
        marginLeft: 0,
        width: '100%'
      }}
    >
      {mainHeader}
    </AppBar>
  );
}
