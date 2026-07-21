import { Alert, Box, Paper, Typography } from '@mui/material';

export default function BuyerAccessUnavailablePage() {
  return (
    <Box sx={{ p: { xs: 1, md: 2 } }}>
      <Paper elevation={0} sx={{ p: 3, border: '1px solid #e5e7eb', borderRadius: 2 }}>
        <Typography sx={{ mb: 1, fontWeight: 900, color: '#103B5C' }}>Buyer Access</Typography>
        <Alert severity="warning">
          Your account has not been assigned to any Buyer. Please contact an administrator to grant Buyer access.
        </Alert>
      </Paper>
    </Box>
  );
}
