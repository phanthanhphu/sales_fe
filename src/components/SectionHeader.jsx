import PropTypes from 'prop-types';
import { Box, Stack, Typography } from '@mui/material';

export default function SectionHeader({ title, meta, actions, compact = false }) {
  return (
    <Stack
      direction={{ xs: 'column', sm: 'row' }}
      justifyContent="space-between"
      alignItems={{ xs: 'stretch', sm: 'center' }}
      spacing={0.6}
      sx={{ px: compact ? 1 : 1.15, py: compact ? 0.55 : 0.7, borderBottom: '1px solid #e5e7eb', bgcolor: '#fff' }}
    >
      <Stack direction="row" spacing={0.65} alignItems="center" flexWrap="wrap" useFlexGap sx={{ minWidth: 0 }}>
        <Box sx={{ width: 3, height: 15, borderRadius: 99, bgcolor: '#2563eb', flex: '0 0 auto' }} />
        <Typography sx={{ fontWeight: 700, color: '#102a43', fontSize: compact ? '.82rem' : '.87rem', letterSpacing: '-0.005em' }}>{title}</Typography>
        {meta}
      </Stack>
      {actions && <Box sx={{ flex: '0 0 auto' }}>{actions}</Box>}
    </Stack>
  );
}

SectionHeader.propTypes = {
  title: PropTypes.node,
  subtitle: PropTypes.node,
  meta: PropTypes.node,
  actions: PropTypes.node,
  compact: PropTypes.bool
};
