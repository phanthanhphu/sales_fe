import Box from '@mui/material/Box';

import Profile from './Profile';

export default function HeaderContent() {
  return (
    <Box
      sx={{
        width: 1,
        display: 'flex',
        alignItems: 'center',
        minWidth: 0
      }}
    >
      <Box sx={{ flex: 1 }} />
      <Profile />
    </Box>
  );
}
