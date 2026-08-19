import PropTypes from 'prop-types';

import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { useTheme } from '@mui/material/styles';

import DrawerHeaderStyled from './DrawerHeaderStyled';
import Logo from 'components/logo';
import { HEADER_HEIGHT } from 'config';

const SYSTEM_NAME = 'Youngone MPR System';

export default function DrawerHeader({ open }) {
  const theme = useTheme();
  const layoutColor = theme.layoutColor;

  return (
    <DrawerHeaderStyled
      open={open}
      sx={{
        minHeight: HEADER_HEIGHT,
        width: 'initial'
      }}
    >
      <Box
        sx={{
          width: open ? '100%' : 44,
          minHeight: 44,
          display: 'flex',
          alignItems: 'center',
          justifyContent: open ? 'flex-start' : 'center',
          gap: open ? 0.9 : 0,
          px: open ? 0.55 : 0,
          minWidth: 0,
          '& a': {
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            minWidth: 0,
            lineHeight: 0
          }
        }}
      >
        <Logo isIcon={!open} sx={{ width: open ? 92 : 30, height: 'auto', display: 'block', flexShrink: 0 }} />

        {open ? (
          <Typography
            title={SYSTEM_NAME}
            sx={{
              minWidth: 0,
              maxWidth: 96,
              color: layoutColor.textStrong,
              fontSize: '0.72rem',
              lineHeight: 1.15,
              fontWeight: 700,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical'
            }}
          >
            {SYSTEM_NAME}
          </Typography>
        ) : null}
      </Box>
    </DrawerHeaderStyled>
  );
}

DrawerHeader.propTypes = { open: PropTypes.bool };
