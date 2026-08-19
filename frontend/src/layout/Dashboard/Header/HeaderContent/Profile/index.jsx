import PropTypes from 'prop-types';
import { useRef, useState, useMemo, useCallback } from 'react';

import { alpha, useTheme } from '@mui/material/styles';
import ButtonBase from '@mui/material/ButtonBase';
import Paper from '@mui/material/Paper';
import Popper from '@mui/material/Popper';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Box from '@mui/material/Box';
import ClickAwayListener from '@mui/material/ClickAwayListener';

import Transitions from 'components/@extended/Transitions';
import MainCard from 'components/MainCard';
import { useUser } from './useUser';
import { User } from 'iconsax-react';
import TabContent from './TabContent';
import { API_BASE_URL } from '../../../../../config';

function a11yProps(index) {
  return { id: `tab-${index}`, 'aria-controls': `tabpanel-${index}` };
}

export default function UserPage() {
  const theme = useTheme();
  const layoutColor = theme.layoutColor;
  const anchorRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(0);
  const [imageError, setImageError] = useState(false);

  const { profileImage, username, firstLetter, userId } = useUser();

  const handleToggle = () => setOpen((p) => !p);

  const handleClose = (event) => {
    if (anchorRef.current && anchorRef.current.contains(event.target)) return;
    setOpen(false);
  };

  const handleChange = (event, newValue) => setValue(newValue);

  const normalizeImageUrl = useCallback((url) => {
    if (!url) return null;
    let normalized = url.replace(/\\/g, '/').split('?')[0];

    if (normalized.startsWith('http://') || normalized.startsWith('https://')) {
      return normalized.replace(/^https?:\/\/[^\/]+/, '');
    }
    if (normalized.startsWith('/uploads/users/') || normalized.startsWith('/Uploads/users/')) return normalized;

    const clean = normalized.replace(/^\/?uploads\/users\//i, '');
    return `/uploads/users/${clean}`;
  }, []);

  const processedUser = useMemo(() => {
    const imageUrl = normalizeImageUrl(profileImage);
    return { id: userId, username, displayImageUrl: imageUrl || '/uploads/users/default-user.png' };
  }, [profileImage, userId, username, normalizeImageUrl]);

  const UserAvatar = () => {
    const { displayImageUrl } = processedUser;

    const avatarSx = {
      width: 38,
      height: 38,
      minWidth: 38,
      minHeight: 38,
      borderRadius: '50%',
      overflow: 'hidden',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
      border: `2px solid ${alpha(layoutColor.profileAccent, 0.78)}`,
      boxShadow: `0 0 0 3px ${alpha(layoutColor.profileAccent, 0.10)}`,
      backgroundColor: alpha(layoutColor.profileAccent, 0.08)
    };

    if (displayImageUrl && !imageError) {
      return (
        <Box sx={avatarSx}>
          <Box
            component="img"
            src={`${API_BASE_URL}${displayImageUrl}`}
            alt={username || 'User'}
            loading="lazy"
            onError={() => setImageError(true)}
            sx={{
              width: '100%',
              height: '100%',
              display: 'block',
              objectFit: 'cover',
              objectPosition: 'center',
              borderRadius: '50%'
            }}
          />
        </Box>
      );
    }

    return (
      <Box
        sx={{
          ...avatarSx,
          fontSize: '1.05rem',
          fontWeight: 750,
          color: layoutColor.dark
        }}
      >
        {firstLetter || 'Y'}
      </Box>
    );
  };

  return (
    <Box sx={{ flexShrink: 0, ml: 0.75 }}>
      <ButtonBase
        ref={anchorRef}
        aria-label="open user"
        aria-controls={open ? 'user-grow' : undefined}
        aria-haspopup="true"
        onClick={handleToggle}
        sx={{
          width: 46,
          height: 46,
          p: 0.4,
          borderRadius: '50%',
          overflow: 'hidden',
          transition: 'background-color .18s ease, transform .18s ease',
          '&:hover': { bgcolor: alpha(layoutColor.profileAccent, 0.07), transform: 'translateY(-1px)' },
          '&:focus-visible': {
            outline: `2px solid ${alpha(layoutColor.profileAccent, 0.55)}`,
            outlineOffset: 2
          }
        }}
      >
        <UserAvatar />
      </ButtonBase>

      <Popper
        placement="bottom-end"
        open={open}
        anchorEl={anchorRef.current}
        transition
        disablePortal={false}
        popperOptions={{ modifiers: [{ name: 'offset', options: { offset: [0, 10] } }] }}
      >
        {({ TransitionProps }) => (
          <Transitions type="grow" position="top-right" in={open} {...TransitionProps}>
            <Paper
              sx={{
                width: 260,
                minWidth: 220,
                borderRadius: 2.5,
                overflow: 'hidden',
                boxShadow: '0 18px 60px rgba(24, 54, 84, 0.14)',
                border: '1px solid #E8EEF5',
                backgroundColor: '#FFFFFF'
              }}
            >
              <ClickAwayListener onClickAway={handleClose}>
                <MainCard border={false} content={false}>
                  <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                    <Tabs variant="fullWidth" value={value} onChange={handleChange} aria-label="user tabs">
                      <Tab
                        sx={{ textTransform: 'capitalize', fontWeight: 700, minHeight: 44 }}
                        icon={<User size={18} />}
                        label="User"
                        {...a11yProps(0)}
                      />
                    </Tabs>
                  </Box>
                  <Box sx={{ p: 1 }}>
                    <TabContent />
                  </Box>
                </MainCard>
              </ClickAwayListener>
            </Paper>
          </Transitions>
        )}
      </Popper>
    </Box>
  );
}

UserPage.propTypes = { children: PropTypes.node };
