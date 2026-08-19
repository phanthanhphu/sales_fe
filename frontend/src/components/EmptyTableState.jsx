import PropTypes from 'prop-types';
import { Button, Stack, TableCell, TableRow, Typography } from '@mui/material';
import InboxRoundedIcon from '@mui/icons-material/InboxRounded';

export default function EmptyTableState({ colSpan, title = 'No data found', description = '', actionLabel = '', onAction, actionDisabled = false }) {
  return (
    <TableRow>
      <TableCell colSpan={colSpan} sx={{ py: { xs: 3.5, sm: 5 }, borderBottom: 0 }}>
        <Stack alignItems="center" spacing={0.65} sx={{ maxWidth: 520, mx: 'auto', textAlign: 'center' }}>
          <Stack
            alignItems="center"
            justifyContent="center"
            sx={{ width: 42, height: 42, borderRadius: '50%', bgcolor: '#f1f5f9', color: '#64748b', mb: 0.35 }}
          >
            <InboxRoundedIcon sx={{ fontSize: 22 }} />
          </Stack>
          <Typography sx={{ fontWeight: 700, color: '#334155', fontSize: '0.86rem' }}>{title}</Typography>
          {description && <Typography sx={{ color: 'text.secondary', fontSize: '0.76rem', lineHeight: 1.45 }}>{description}</Typography>}
          {actionLabel && onAction && (
            <Button size="small" variant="contained" onClick={onAction} disabled={actionDisabled} sx={{ mt: 0.6, textTransform: 'none' }}>
              {actionLabel}
            </Button>
          )}
        </Stack>
      </TableCell>
    </TableRow>
  );
}

EmptyTableState.propTypes = {
  colSpan: PropTypes.number.isRequired,
  title: PropTypes.string,
  description: PropTypes.string,
  actionLabel: PropTypes.string,
  onAction: PropTypes.func,
  actionDisabled: PropTypes.bool
};
