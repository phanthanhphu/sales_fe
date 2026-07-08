import PropTypes from 'prop-types';
import { useMemo } from 'react';

import useMediaQuery from '@mui/material/useMediaQuery';
import Drawer from '@mui/material/Drawer';
import Box from '@mui/material/Box';

import DrawerHeader from './DrawerHeader';
import DrawerContent from './DrawerContent';
import MiniDrawerStyled from './MiniDrawerStyled';

import { handlerDrawerOpen, useGetMenuMaster } from 'api/menu';
import { DRAWER_WIDTH } from 'config';

// Place the image here:
// src/assets/images/background/background_layout_menu.png
import sidebarBackground from '../../../assets/images/background/background_layout_menu.png';

const SIDEBAR_SURFACE = '#FFFFFF';
const SIDEBAR_SOFT = '#FAFBFD';
const BORDER = '#E6EDF4';
const TEXT = '#2D4358';

export default function MainDrawer({ window }) {
  const downLG = useMediaQuery((theme) => theme.breakpoints.down('lg'));
  const { menuMaster } = useGetMenuMaster();
  const drawerOpen = Boolean(menuMaster?.isDashboardDrawerOpened);
  const container = window !== undefined ? () => window().document.body : undefined;

  const drawerContent = useMemo(() => <DrawerContent />, []);
  const drawerHeader = useMemo(() => <DrawerHeader open={drawerOpen} />, [drawerOpen]);

  // Show the decoration only on expanded desktop sidebar.
  // It is hidden when the sidebar is collapsed, on mobile, and on short screens.
  const showSidebarBackground = drawerOpen && !downLG;

  const paperBase = {
    borderRight: `1px solid ${BORDER}`,
    backgroundColor: SIDEBAR_SURFACE,
    backgroundImage: `linear-gradient(180deg, ${SIDEBAR_SURFACE} 0%, ${SIDEBAR_SOFT} 100%)`,
    overflow: 'hidden',
    color: TEXT,
    boxShadow: '8px 0 24px rgba(24, 54, 84, 0.025)'
  };

  const drawerBody = (
    <Box
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      {/* Small decorative BOM & Sales image in the lower empty sidebar area.
          It is absolute, so it does not change menu spacing or sidebar layout. */}
      {showSidebarBackground && (
        <Box
          aria-hidden="true"
          sx={{
            position: 'absolute',
            left: '50%',
            bottom: -8,
            width: 260,
            height: 260,
            transform: 'translateX(-50%)',
            pointerEvents: 'none',
            userSelect: 'none',
            opacity: 0.9,
            zIndex: 0,

            // Prevents the image from appearing on short windows where it may touch menu items.
            '@media (max-height: 760px)': {
              display: 'none'
            }
          }}
        >
          <Box
            component="img"
            src={sidebarBackground}
            alt=""
            sx={{
              display: 'block',
              width: '100%',
              height: '100%',
              objectFit: 'contain',
              objectPosition: 'center bottom',
              filter: 'saturate(0.9) contrast(0.97)'
            }}
          />
        </Box>
      )}

      <Box sx={{ flexShrink: 0, position: 'relative', zIndex: 1 }}>
        {drawerHeader}
      </Box>

      <Box
        sx={{
          flex: 1,
          px: 0.75,
          py: 1,
          overflow: 'hidden',
          position: 'relative',
          zIndex: 1
        }}
      >
        {drawerContent}
      </Box>
    </Box>
  );

  return (
    <Box component="nav" aria-label="application navigation" sx={{ flexShrink: { md: 0 }, zIndex: 1200 }}>
      {!downLG ? (
        <MiniDrawerStyled
          variant="permanent"
          open={drawerOpen}
          sx={{
            '& .MuiDrawer-paper': paperBase
          }}
        >
          {drawerBody}
        </MiniDrawerStyled>
      ) : (
        <Drawer
          container={container}
          variant="temporary"
          open={drawerOpen}
          onClose={() => handlerDrawerOpen(false)}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: drawerOpen ? 'block' : 'none', lg: 'none' },
            '& .MuiDrawer-paper': {
              ...paperBase,
              width: DRAWER_WIDTH,
              boxShadow: '12px 0 38px rgba(24, 54, 84, 0.16)',
              borderTopRightRadius: 18,
              borderBottomRightRadius: 18
            }
          }}
        >
          {drawerBody}
        </Drawer>
      )}
    </Box>
  );
}

MainDrawer.propTypes = { window: PropTypes.func };
