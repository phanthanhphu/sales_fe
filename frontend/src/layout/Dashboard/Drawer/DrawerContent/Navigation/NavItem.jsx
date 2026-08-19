import PropTypes from 'prop-types';
import { matchPath, Link } from 'react-router-dom';
import useMediaQuery from '@mui/material/useMediaQuery';
import Avatar from '@mui/material/Avatar';
import Chip from '@mui/material/Chip';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import { alpha, useTheme } from '@mui/material/styles';

import Dot from 'components/@extended/Dot';
import IconButton from 'components/@extended/IconButton';
import { handlerDrawerOpen, useGetMenuMaster } from 'api/menu';
import { getNavigationIcon } from './menuIcons';

const TEXT = '#263B52';
const TEXT_MUTED = '#61758B';
const HOVER = '#F4F7FA';

export default function NavItem({ item, level, isParents = false, setSelectedID, pathname }) {
  const theme = useTheme();
  const layoutColor = theme.layoutColor;
  const downLG = useMediaQuery((themeValue) => themeValue.breakpoints.down('lg'));
  const { menuMaster } = useGetMenuMaster();
  const drawerOpen = Boolean(menuMaster?.isDashboardDrawerOpened);

  const itemTarget = item.target ? '_blank' : '_self';
  const ConfiguredIcon = item.icon;
  const SemanticIcon = getNavigationIcon(item);
  const itemIcon = SemanticIcon ? (
    <SemanticIcon sx={{ fontSize: drawerOpen ? 18 : 20 }} />
  ) : ConfiguredIcon ? (
    <ConfiguredIcon variant="Linear" size={drawerOpen ? 18 : 20} />
  ) : null;
  const itemPath = item?.link || item.url;
  const isExactItem = Boolean(item?.exact);

  const isSelected = Boolean(matchPath({ path: itemPath, end: isExactItem }, pathname));

  const itemHandler = () => {
    if (downLG) handlerDrawerOpen(false);
    if (isParents && setSelectedID) setSelectedID();
  };

  const leftPadding = () => {
    if (!drawerOpen) return 0.5;
    if (level <= 1) return 1.2;
    if (level === 2) return 3.35;
    return 4;
  };

  return (
    <Box sx={{ position: 'relative' }}>
      <ListItemButton
        component={Link}
        to={item.url}
        target={itemTarget}
        disabled={item.disabled}
        selected={isSelected}
        onClick={itemHandler}
        aria-label={!drawerOpen ? item.title : undefined}
        title={!drawerOpen ? item.title : undefined}
        sx={{
          position: 'relative',
          minHeight: drawerOpen ? 40 : 44,
          pl: leftPadding(),
          pr: drawerOpen ? 1.15 : 0.5,
          py: 0.35,
          mx: drawerOpen ? 0.55 : 0.25,
          my: 0.12,
          borderRadius: drawerOpen ? 1.4 : 2,
          justifyContent: drawerOpen ? 'flex-start' : 'center',
          color: isSelected ? layoutColor.dark : TEXT_MUTED,
          transition: 'background-color .15s ease, color .15s ease',
          '&::before': {
            content: '""',
            position: 'absolute',
            top: drawerOpen ? 7 : 9,
            bottom: drawerOpen ? 7 : 9,
            left: 0,
            width: 3,
            borderRadius: '0 3px 3px 0',
            bgcolor: layoutColor.accent,
            opacity: isSelected ? 1 : 0
          },
          '&:hover': { bgcolor: HOVER, color: '#35536F' },
          '&.Mui-selected': {
            bgcolor: layoutColor.selected,
            color: layoutColor.dark,
            '&:hover': { bgcolor: layoutColor.selectedHover }
          }
        }}
      >
        {itemIcon && (
          <ListItemIcon
            sx={{
              minWidth: drawerOpen ? 31 : 0,
              color: 'inherit',
              justifyContent: 'center',
              transition: 'color .15s ease'
            }}
          >
            {itemIcon}
          </ListItemIcon>
        )}

        {!itemIcon && drawerOpen && (
          <ListItemIcon sx={{ minWidth: 22 }}>
            <Dot size={isSelected ? 6 : 5} color={isSelected ? 'primary' : 'secondary'} />
          </ListItemIcon>
        )}

        {drawerOpen && (
          <ListItemText
            primaryTypographyProps={{ noWrap: true }}
            primary={
              <Typography
                sx={{
                  color: 'inherit',
                  fontWeight: isSelected ? 700 : 600,
                  fontSize: '0.82rem',
                  lineHeight: 1.2,
                  letterSpacing: 0
                }}
              >
                {item.title}
              </Typography>
            }
          />
        )}

        {(drawerOpen || (!drawerOpen && level !== 1)) && item.chip && (
          <Chip
            color={item.chip.color}
            variant={item.chip.variant}
            size={item.chip.size}
            label={item.chip.label}
            avatar={item.chip.avatar && <Avatar>{item.chip.avatar}</Avatar>}
            sx={{ ml: 1, bgcolor: alpha(layoutColor.accent, 0.06), color: layoutColor.accent, border: `1px solid ${alpha(layoutColor.accent, 0.12)}` }}
          />
        )}
      </ListItemButton>

      {drawerOpen &&
        item?.actions?.map((action, index) => {
          const ActionIcon = action?.icon;
          const callAction = action?.function;
          return (
            <IconButton
              key={index}
              {...(action.type === 'function' && {
                onClick: (event) => { event.stopPropagation(); callAction(); }
              })}
              {...(action.type === 'link' && { component: Link, to: action.url, target: action.target ? '_blank' : '_self' })}
              color="secondary"
              variant="outlined"
              sx={{ position: 'absolute', top: 10, right: 8, zIndex: 2, width: 18, height: 18, p: 0.25 }}
            >
              <ActionIcon size={11} />
            </IconButton>
          );
        })}
    </Box>
  );
}

NavItem.propTypes = {
  item: PropTypes.any,
  level: PropTypes.number,
  isParents: PropTypes.bool,
  setSelectedID: PropTypes.any,
  pathname: PropTypes.string
};
