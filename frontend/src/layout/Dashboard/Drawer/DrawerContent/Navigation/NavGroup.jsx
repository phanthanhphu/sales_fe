import PropTypes from 'prop-types';
import { useEffect, useState } from 'react';
import { matchPath } from 'react-router-dom';

import useMediaQuery from '@mui/material/useMediaQuery';
import Divider from '@mui/material/Divider';
import List from '@mui/material/List';
import Collapse from '@mui/material/Collapse';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import ExpandLess from '@mui/icons-material/ExpandLess';
import ExpandMore from '@mui/icons-material/ExpandMore';
import { alpha, useTheme } from '@mui/material/styles';

import NavItem from './NavItem';
import { getNavigationIcon } from './menuIcons';
import { handlerDrawerOpen, useGetMenuMaster } from 'api/menu';

const TEXT = '#263B52';
const TEXT_MUTED = '#61758B';
const HOVER = '#F4F7FA';

const isItemSelected = (menuItem, pathname) => {
  if (!menuItem) return false;

  if (menuItem.url) {
    return Boolean(
      matchPath(
        {
          path: menuItem?.link || menuItem.url,
          end: Boolean(menuItem.exact)
        },
        pathname
      )
    );
  }

  return Array.isArray(menuItem.children) && menuItem.children.some((child) => isItemSelected(child, pathname));
};

function NavCollapse({ item, level = 1, pathname }) {
  const theme = useTheme();
  const layoutColor = theme.layoutColor;
  const { menuMaster } = useGetMenuMaster();
  const drawerOpen = Boolean(menuMaster?.isDashboardDrawerOpened);
  const [open, setOpen] = useState(false);

  const selected = isItemSelected(item, pathname);
  const ConfiguredIcon = item.icon;
  const SemanticIcon = getNavigationIcon(item);
  const itemIcon = SemanticIcon ? (
    <SemanticIcon sx={{ fontSize: drawerOpen ? 19 : 21 }} />
  ) : ConfiguredIcon ? (
    <ConfiguredIcon variant="Bulk" size={drawerOpen ? 18 : 20} />
  ) : null;

  useEffect(() => {
    if (selected) setOpen(true);
  }, [selected]);

  const compactPl = () => {
    if (!drawerOpen) return 0.75;
    if (level <= 1) return 1.45;
    if (level === 2) return 2.85;
    return 3.55;
  };

  const handleCollapseClick = () => {
    // In icon-only mode, open the sidebar first so child items are immediately available.
    if (!drawerOpen) {
      handlerDrawerOpen(true);
      setOpen(true);
      return;
    }

    setOpen((previous) => !previous);
  };

  return (
    <>
      <ListItemButton
        selected={selected}
        onClick={handleCollapseClick}
        aria-label={!drawerOpen ? item.title : undefined}
        title={!drawerOpen ? item.title : undefined}
        sx={{
          position: 'relative',
          minHeight: drawerOpen ? 40 : 44,
          pl: drawerOpen ? (level <= 1 ? 1.2 : 3.35) : 0.5,
          pr: drawerOpen ? 1.15 : 0.5,
          py: 0.35,
          mx: drawerOpen ? 0.55 : 0.25,
          my: 0.12,
          border: '1px solid transparent',
          borderRadius: drawerOpen ? 1.4 : 2,
          justifyContent: drawerOpen ? 'flex-start' : 'center',
          transition: 'background-color .18s ease, border-color .18s ease, color .18s ease',
          '&:hover': {
            bgcolor: HOVER,
            '& .MuiListItemIcon-root': { color: layoutColor.dark }
          },
          '&.Mui-selected': {
            bgcolor: 'transparent',
            borderColor: 'transparent',
            boxShadow: 'none',
            '&:hover': { bgcolor: HOVER }
          }
        }}
      >
        {itemIcon && (
          <ListItemIcon
            sx={{
              minWidth: drawerOpen ? 31 : 0,
              color: selected ? layoutColor.dark : TEXT_MUTED,
              transition: 'color .18s ease',
              ...(!drawerOpen && {
                width: 36,
                height: 36,
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: drawerOpen ? 1.4 : 2,
                bgcolor: selected ? layoutColor.selected : 'transparent',
                border: selected ? `1px solid ${layoutColor.selectedBorder}` : '1px solid transparent'
              })
            }}
          >
            {itemIcon}
          </ListItemIcon>
        )}

        {drawerOpen && (
          <>
            <ListItemText
              primaryTypographyProps={{ noWrap: true }}
              primary={
                <Typography
                  sx={{
                    color: selected ? TEXT : TEXT_MUTED,
                    fontWeight: selected ? 700 : 650,
                    fontSize: '0.82rem',
                    lineHeight: 1.1
                  }}
                >
                  {item.title}
                </Typography>
              }
            />
            {open ? (
              <ExpandLess sx={{ fontSize: 17, color: selected ? '#54708B' : TEXT_MUTED }} />
            ) : (
              <ExpandMore sx={{ fontSize: 17, color: selected ? '#54708B' : TEXT_MUTED }} />
            )}
          </>
        )}
      </ListItemButton>

      <Collapse in={open && drawerOpen} timeout="auto" unmountOnExit>
        <List component="div" disablePadding sx={{ py: 0.05 }}>
          {(item.children || []).map((child) => {
            if (child.type === 'collapse') {
              return <NavCollapse key={child.id} item={child} level={level + 1} pathname={pathname} />;
            }

            if (child.type === 'item') {
              return <NavItem key={child.id} item={child} level={level + 1} pathname={pathname} />;
            }

            return (
              <Typography key={child.id || child.title} variant="h6" color="error" align="center">
                Fix - Group Collapse or Items
              </Typography>
            );
          })}
        </List>
      </Collapse>
    </>
  );
}

NavCollapse.propTypes = {
  item: PropTypes.any,
  level: PropTypes.number,
  pathname: PropTypes.string
};

export default function NavGroup({ item, lastItem, remItems, lastItemId, setSelectedID, pathname }) {
  const { menuMaster } = useGetMenuMaster();
  const drawerOpen = Boolean(menuMaster?.isDashboardDrawerOpened);
  const downLG = useMediaQuery((theme) => theme.breakpoints.down('lg'));

  const [anchorEl, setAnchorEl] = useState(null);
  const [currentItem, setCurrentItem] = useState(item);
  const openMini = Boolean(anchorEl);

  useEffect(() => {
    if (lastItem && item.id === lastItemId) {
      const localItem = { ...item };
      localItem.children = remItems.map((element) => element.elements).flat(1);
      setCurrentItem(localItem);
      return;
    }

    setCurrentItem(item);
  }, [item, lastItem, lastItemId, remItems, downLG]);

  const checkOpenForParent = (children, id) => {
    children.forEach((element) => {
      if (element.children?.length) checkOpenForParent(element.children, id);

      if (element.url && matchPath({ path: element?.link || element.url, end: Boolean(element.exact) }, pathname)) {
        setSelectedID(id);
      }
    });
  };

  const checkSelectedOnload = (data) => {
    (data.children || []).forEach((menuItem) => {
      if (menuItem?.children?.length) checkOpenForParent(menuItem.children, currentItem.id);

      if (menuItem.url && matchPath({ path: menuItem?.link || menuItem.url, end: Boolean(menuItem.exact) }, pathname)) {
        setSelectedID(currentItem.id);
      }
    });
  };

  useEffect(() => {
    checkSelectedOnload(currentItem);
    if (openMini) setAnchorEl(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, currentItem]);

  const navCollapse = currentItem.children?.map((menuItem, index) => {
    if (menuItem.type === 'collapse') {
      return <NavCollapse key={menuItem.id} item={menuItem} level={1} pathname={pathname} />;
    }

    if (menuItem.type === 'item') {
      return <NavItem key={menuItem.id} item={menuItem} level={1} pathname={pathname} />;
    }

    return (
      <Typography key={index} variant="h6" color="error" align="center">
        Fix - Group Collapse or Items
      </Typography>
    );
  });

  return (
    <List
      subheader={
        currentItem.title ? (
          drawerOpen ? (
            <Box sx={{ px: 1.65, pt: 1.15, pb: 0.45 }}>
              <Typography
                sx={{
                  textTransform: 'uppercase',
                  fontSize: '0.63rem',
                  lineHeight: 1,
                  letterSpacing: 0.7,
                  fontWeight: 700,
                  color: '#8A9AAE'
                }}
              >
                {currentItem.title}
              </Typography>
              {currentItem.caption && (
                <Typography sx={{ mt: 0.55, fontSize: '0.72rem', color: '#97A6B5' }}>
                  {currentItem.caption}
                </Typography>
              )}
            </Box>
          ) : (
            <Divider sx={{ mx: 1.25, my: 0.7, borderColor: alpha('#8FA2B8', 0.18) }} />
          )
        ) : (
          <Divider sx={{ my: 1, borderColor: alpha('#8FA2B8', 0.18) }} />
        )
      }
      sx={{ mt: 0, py: 0 }}
    >
      {navCollapse}
    </List>
  );
}

NavGroup.propTypes = {
  item: PropTypes.any,
  lastItem: PropTypes.number,
  remItems: PropTypes.array,
  lastItemId: PropTypes.string,
  selectedID: PropTypes.oneOfType([PropTypes.string, PropTypes.any]),
  setSelectedID: PropTypes.oneOfType([PropTypes.any, PropTypes.func]),
  setSelectedItems: PropTypes.oneOfType([PropTypes.string, PropTypes.any]),
  selectedItems: PropTypes.oneOfType([PropTypes.string, PropTypes.any]),
  setSelectedLevel: PropTypes.object,
  selectedLevel: PropTypes.number,
  pathname: PropTypes.string
};
