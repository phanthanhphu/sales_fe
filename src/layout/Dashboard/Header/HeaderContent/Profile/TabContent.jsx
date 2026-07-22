import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { alpha, useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';

import {
  Alert,
  Avatar,
  Box,
  Chip,
  Divider,
  ListItemIcon,
  ListItemText,
  MenuItem,
  Portal,
  Snackbar,
  Stack,
  Typography
} from '@mui/material';

import { Edit2, Lock, Logout, User } from 'iconsax-react';

import { useUser } from './useUser';
import ProfileEditDialog from '../../../../../pages/users/ProfileEditDialog';
import ChangePasswordDialog from '../../../../../pages/users/ChangePasswordDialog';
import ViewUserDialog from '../../../../../pages/users/ViewUserDialog';
import { API_BASE_URL } from '../../../../../config';

export default function TabContent({ onRequestClose }) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const imageCacheRef = useRef(new Map());
  const [imageErrors, setImageErrors] = useState({});

  const [openViewDialog, setOpenViewDialog] = useState(false);
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [openChangePassDialog, setOpenChangePassDialog] = useState(false);
  const [snackbarOpen, setSnackbarOpen] = useState(false);

  const {
    username,
    email,
    address,
    phone,
    role,
    profileImage,
    userId,
    createdAt,
    enabled,
    accessPermissions,
    buyerKeys,
    departmentId,
    departmentName,
    division,
    department,
    error,
    success,
    firstLetter,
    fetchUser,
    handleUpdateUser,
    handleUpdatePassword
  } = useUser();

  useEffect(() => {
    if (error || success) {
      setSnackbarOpen(true);
    }
  }, [error, success]);

  const normalizeImageUrl = useCallback((url) => {
    if (!url) {
      return null;
    }

    const cacheKey = `url_${url}`;

    if (imageCacheRef.current.has(cacheKey)) {
      return imageCacheRef.current.get(cacheKey);
    }

    const normalized = url.replace(/\\/g, '/').split('?')[0];
    let finalUrl = '';

    if (normalized.startsWith('http://') || normalized.startsWith('https://')) {
      finalUrl = normalized.replace(/^https?:\/\/[^/]+/, '');
    } else if (normalized.startsWith('/uploads/users/') || normalized.startsWith('/Uploads/users/')) {
      finalUrl = normalized;
    } else {
      const cleanPath = normalized.replace(/^\/?uploads\/users\//i, '');
      finalUrl = `/Uploads/users/${cleanPath}`;
    }

    imageCacheRef.current.set(cacheKey, finalUrl);
    return finalUrl;
  }, []);

  const processedUser = useMemo(() => {
    const imageUrl = normalizeImageUrl(profileImage);

    return {
      id: userId || username || 'current-user',
      username,
      displayImageUrl: imageUrl || '/Uploads/users/default-user.png'
    };
  }, [profileImage, userId, username, normalizeImageUrl]);

  const handleImageError = useCallback((id) => {
    if (!id) {
      return;
    }

    setImageErrors((previous) => {
      if (previous[id]) {
        return previous;
      }

      return { ...previous, [id]: true };
    });
  }, []);

  const handleLogout = async () => {
    try {
      const token = localStorage.getItem('token');

      await fetch(`${API_BASE_URL}/api/users/logout`, {
        method: 'DELETE',
        headers: {
          accept: '*/*',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        }
      });

      localStorage.removeItem('token');
      localStorage.removeItem('accessToken');
      localStorage.removeItem('user');
      localStorage.removeItem('userId');
      localStorage.removeItem('role');
      localStorage.removeItem('isAuthenticated');

      setSnackbarOpen(true);

      if (onRequestClose) {
        onRequestClose();
      }

      window.setTimeout(() => {
        window.location.assign('/login');
      }, 700);
    } catch (logoutError) {
      console.error('Logout failed:', logoutError);
      setSnackbarOpen(true);

      if (onRequestClose) {
        onRequestClose();
      }
    }
  };

  const handleView = () => {
    if (onRequestClose) {
      onRequestClose();
    }

    setOpenViewDialog(true);
    setOpenEditDialog(false);
    setOpenChangePassDialog(false);

    if (userId) {
      fetchUser(userId);
    }
  };

  const handleEdit = () => {
    if (onRequestClose) {
      onRequestClose();
    }

    setOpenViewDialog(false);
    setOpenEditDialog(true);
    setOpenChangePassDialog(false);
  };

  const handleChangePassword = () => {
    if (onRequestClose) {
      onRequestClose();
    }

    setOpenViewDialog(false);
    setOpenEditDialog(false);
    setOpenChangePassDialog(true);
  };

  const cardSx = {
    width: isMobile ? 'calc(100vw - 24px)' : 320,
    maxWidth: 320,
    overflow: 'hidden',
    borderRadius: 3,
    border: '1px solid #DCE6F2',
    backgroundColor: '#FFFFFF',
    boxShadow: '0 18px 45px rgba(18, 55, 89, 0.18)',
    position: 'fixed',
    top: isMobile ? 64 : 70,
    right: isMobile ? 12 : 18,
    zIndex: theme.zIndex.modal + 4000
  };

  const headerSx = {
    px: 1.5,
    py: 1.35,
    backgroundColor: '#F8FBFE',
    borderBottom: '1px solid #E4ECF4'
  };

  const roleChipSx = {
    mt: 0.65,
    height: 22,
    borderRadius: 999,
    fontSize: '0.66rem',
    fontWeight: 900,
    letterSpacing: 0.35,
    color: '#2466C8',
    backgroundColor: '#EAF3FF',
    border: '1px solid #CFE2FF',
    '& .MuiChip-label': {
      px: 1
    }
  };

  const menuItemSx = (type = 'default') => {
    const isLogout = type === 'logout';

    return {
      minHeight: 44,
      mx: 0.7,
      my: 0.2,
      px: 1.05,
      borderRadius: 2,
      color: isLogout ? '#D92D20' : '#173B63',
      transition: 'background-color .16s ease, transform .16s ease',
      '&:hover': {
        transform: 'translateX(2px)',
        backgroundColor: isLogout ? '#FFF1F0' : '#EEF5FF'
      },
      '& .MuiListItemText-primary': {
        fontSize: '0.9rem',
        fontWeight: 800
      }
    };
  };

  const { id: avatarId, displayImageUrl } = processedUser;
  const avatarHasError = Boolean(imageErrors[avatarId]);
  const avatarSrc = `${API_BASE_URL}${displayImageUrl}`;

  const avatarNode = avatarHasError ? (
    <Avatar
      sx={{
        width: 46,
        height: 46,
        fontSize: '1rem',
        fontWeight: 900,
        color: '#184A7A',
        backgroundColor: '#E8F2FF',
        border: '1px solid #CFE2FF'
      }}
    >
      {(firstLetter || 'U').toUpperCase()}
    </Avatar>
  ) : (
    <Avatar
      src={avatarSrc}
      alt={username || 'User'}
      imgProps={{ loading: 'lazy' }}
      onError={() => handleImageError(avatarId)}
      sx={{
        width: 46,
        height: 46,
        fontSize: '1rem',
        fontWeight: 900,
        color: '#184A7A',
        backgroundColor: '#E8F2FF',
        border: '1px solid #CFE2FF'
      }}
    >
      {(firstLetter || 'U').toUpperCase()}
    </Avatar>
  );

  const cardNode = (
    <Box sx={cardSx}>
      <Box sx={headerSx}>
        <Stack direction="row" alignItems="center" spacing={1.2}>
          {avatarNode}

          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography
              noWrap
              sx={{
                color: '#12385D',
                fontSize: '0.94rem',
                fontWeight: 900,
                lineHeight: 1.25
              }}
            >
              {username || 'User'}
            </Typography>

            <Typography
              noWrap
              sx={{
                mt: 0.25,
                color: '#6B8098',
                fontSize: '0.74rem',
                lineHeight: 1.3
              }}
            >
              {email || 'Company account'}
            </Typography>

            <Chip label={(role || 'USER').toUpperCase()} size="small" sx={roleChipSx} />
          </Box>
        </Stack>
      </Box>

      <Box sx={{ py: 0.7 }}>
        <MenuItem onClick={handleView} sx={menuItemSx()}>
          <ListItemIcon sx={{ minWidth: 34 }}>
            <User size={18} color="#2F80ED" variant="Linear" />
          </ListItemIcon>
          <ListItemText primary="View profile" />
        </MenuItem>

        <MenuItem onClick={handleEdit} sx={menuItemSx()}>
          <ListItemIcon sx={{ minWidth: 34 }}>
            <Edit2 size={18} color="#2F80ED" variant="Linear" />
          </ListItemIcon>
          <ListItemText primary="Edit profile" />
        </MenuItem>

        <MenuItem onClick={handleChangePassword} sx={menuItemSx()}>
          <ListItemIcon sx={{ minWidth: 34 }}>
            <Lock size={18} color="#0F8B8D" variant="Linear" />
          </ListItemIcon>
          <ListItemText primary="Change password" />
        </MenuItem>

        <Divider sx={{ mx: 1.35, my: 0.75, borderColor: '#E4ECF4' }} />

        <MenuItem onClick={handleLogout} sx={menuItemSx('logout')}>
          <ListItemIcon sx={{ minWidth: 34 }}>
            <Logout size={18} color="#D92D20" variant="Linear" />
          </ListItemIcon>
          <ListItemText primary="Logout" />
        </MenuItem>
      </Box>
    </Box>
  );

  return (
    <>
      <Portal>{cardNode}</Portal>

      <ViewUserDialog
        open={openViewDialog}
        onClose={() => setOpenViewDialog(false)}
        user={{
          username,
          email,
          address,
          phone,
          role,
          profileImageUrl: profileImage,
          createdAt,
          enabled,
          isEnabled: enabled,
          accessPermissions,
          buyerKeys,
          departmentId,
          departmentName,
          division,
          department
        }}
      />

      <ProfileEditDialog
        open={openEditDialog}
        onClose={() => setOpenEditDialog(false)}
        onUpdate={handleUpdateUser}
        user={{
          id: userId,
          username,
          email,
          address,
          phone,
          role,
          profileImageUrl: profileImage
        }}
      />

      <ChangePasswordDialog
        open={openChangePassDialog}
        onClose={() => setOpenChangePassDialog(false)}
        onUpdate={handleUpdatePassword}
        user={{ email }}
      />

      <Portal>
        <Snackbar
          open={snackbarOpen}
          autoHideDuration={4000}
          onClose={() => setSnackbarOpen(false)}
          anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
          sx={{ zIndex: theme.zIndex.modal + 5000 }}
        >
          <Alert
            onClose={() => setSnackbarOpen(false)}
            severity={error ? 'error' : 'success'}
            sx={{
              width: '100%',
              borderRadius: 2,
              fontSize: '0.9rem',
              boxShadow: `0 18px 50px ${alpha('#000000', 0.2)}`
            }}
          >
            {error || success || 'Logged out successfully'}
          </Alert>
        </Snackbar>
      </Portal>
    </>
  );
}
