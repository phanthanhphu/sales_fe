import { useMemo } from 'react';

import { alpha, useTheme } from '@mui/material/styles';
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
  const theme = useTheme();
  const layoutColor = theme.layoutColor;
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
          color: layoutColor.headerIcon,
          bgcolor: layoutColor.soft,
          border: `1px solid ${alpha(layoutColor.accent, 0.12)}`,
          '&:hover': {
            color: layoutColor.headerHover,
            bgcolor: layoutColor.softHover,
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
    bgcolor: alpha('#FFFFFF', 0.98),
    color: '#2D4358',
    backdropFilter: 'blur(10px)',
    WebkitBackdropFilter: 'blur(10px)',
    borderBottom: '1px solid #E8EEF5',
    boxShadow: '0 1px 0 rgba(15, 23, 42, 0.03)'
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
