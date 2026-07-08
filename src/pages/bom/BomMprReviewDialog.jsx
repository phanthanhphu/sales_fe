import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography
} from '@mui/material';

const statusMeta = (status) => {
  switch (String(status || '').toUpperCase()) {
    case 'PENDING_BOM_REVIEW': return { label: 'Pending BOM Review', color: 'warning' };
    case 'APPLIED_TO_BOM': return { label: 'Applied To BOM', color: 'success' };
    case 'RECHECK_SALES': return { label: 'Recheck Sales', color: 'error' };
    case 'CANCELLED': return { label: 'Cancelled', color: 'default' };
    default: return { label: status || 'Unknown', color: 'default' };
  }
};

const formatDate = (value) => {
  if (!value) return '';
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? String(value) : parsed.toLocaleString();
};

export default function BomMprReviewDialog({
  open,
  reviews = [],
  savingReviewId = '',
  onClose,
  onApply,
  onRecheck,
  actionsDisabled = false
}) {
  const [comments, setComments] = useState({});

  useEffect(() => {
    if (open) {
      setComments(Object.fromEntries((reviews || []).map((review) => [review.id, review.reviewComment || ''])));
    }
  }, [open, reviews]);

  const pendingCount = useMemo(
    () => (reviews || []).filter((review) => review?.status === 'PENDING_BOM_REVIEW').length,
    [reviews]
  );

  return (
    <Dialog open={open} onClose={savingReviewId ? undefined : onClose} fullWidth maxWidth="lg">
      <DialogTitle sx={{ fontWeight: 900, color: '#103B5C' }}>
        Review Sales MPR Changes
        <Typography sx={{ mt: 0.35, fontSize: '.78rem', color: 'text.secondary', fontWeight: 400 }}>
          Sales changes are not written into BOM automatically. Apply updates only the selected source BOM line; Recheck sends it back to Sales with your note.
        </Typography>
      </DialogTitle>
      <DialogContent dividers>
        {pendingCount > 0 && (
          <Alert severity="warning" sx={{ mb: 1.5 }}>
            {pendingCount} pending MPR change{pendingCount === 1 ? '' : 's'} need BOM review.
          </Alert>
        )}

        {!reviews.length ? (
          <Alert severity="info">No Sales MPR changes are waiting for this BOM.</Alert>
        ) : (
          <Stack spacing={1.25}>
            {reviews.map((review) => {
              const meta = statusMeta(review.status);
              const pending = review.status === 'PENDING_BOM_REVIEW';
              const busy = savingReviewId === review.id;
              return (
                <Paper key={review.id} elevation={0} sx={{ p: 1.35, border: '1px solid #dbe3ef', borderRadius: 1.5 }}>
                  <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" spacing={1}>
                    <Box>
                      <Stack direction="row" spacing={0.75} alignItems="center" flexWrap="wrap">
                        <Typography sx={{ fontWeight: 900, color: '#103B5C' }}>
                          {review.materialLabel || 'BOM Material Line'}
                        </Typography>
                        <Chip size="small" color={meta.color} label={meta.label} />
                      </Stack>
                      <Typography sx={{ mt: 0.35, fontSize: '.76rem', color: 'text.secondary' }}>
                        Style Color: {review.styleColor || '-'} · {review.packingName || 'Core BOM (No Packing)'}
                      </Typography>
                      <Typography sx={{ mt: 0.2, fontSize: '.74rem', color: 'text.secondary' }}>
                        Requested {formatDate(review.requestedAt)}{review.requestedBy ? ` · ${review.requestedBy}` : ''}
                      </Typography>
                    </Box>
                    {!pending && (
                      <Typography sx={{ maxWidth: 340, fontSize: '.76rem', color: 'text.secondary' }}>
                        {review.reviewedAt ? `Reviewed ${formatDate(review.reviewedAt)}` : ''}
                        {review.reviewedBy ? ` · ${review.reviewedBy}` : ''}
                        {review.reviewComment ? ` — ${review.reviewComment}` : ''}
                      </Typography>
                    )}
                  </Stack>

                  <TableContainer sx={{ mt: 1.15, border: '1px solid #eef2f7', borderRadius: 1 }}>
                    <Table size="small">
                      <TableHead>
                        <TableRow sx={{ backgroundColor: '#f8fafc' }}>
                          <TableCell sx={{ fontWeight: 900 }}>Field</TableCell>
                          <TableCell sx={{ fontWeight: 900 }}>Current BOM</TableCell>
                          <TableCell sx={{ fontWeight: 900 }}>Sales Proposal</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {(review.changes || []).map((change) => (
                          <TableRow key={`${review.id}-${change.field}`}>
                            <TableCell sx={{ whiteSpace: 'nowrap', fontWeight: 700 }}>{change.label || change.field}</TableCell>
                            <TableCell>{change.bomValue || <em>Blank</em>}</TableCell>
                            <TableCell sx={{ fontWeight: 700, color: '#103B5C' }}>{change.salesValue || <em>Blank</em>}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>

                  {pending && (
                    <>
                      <Divider sx={{ my: 1.2 }} />
                      <TextField
                        fullWidth
                        size="small"
                        label="BOM Review Note"
                        placeholder="Optional when applying; explain clearly when returning to Sales."
                        value={comments[review.id] ?? ''}
                        onChange={(event) => setComments((current) => ({ ...current, [review.id]: event.target.value }))}
                        multiline
                        minRows={2}
                        disabled={actionsDisabled}
                      />
                      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="flex-end" spacing={1} sx={{ mt: 1.1 }}>
                        <Button
                          color="warning"
                          variant="outlined"
                          disabled={actionsDisabled || busy || Boolean(savingReviewId)}
                          onClick={() => onRecheck?.(review.id, comments[review.id] || '')}
                          sx={{ textTransform: 'none' }}
                        >
                          {busy ? 'Saving...' : 'Recheck Sales'}
                        </Button>
                        <Button
                          variant="contained"
                          disabled={actionsDisabled || busy || Boolean(savingReviewId)}
                          onClick={() => onApply?.(review.id, comments[review.id] || '')}
                          sx={{ textTransform: 'none', backgroundColor: '#103B5C' }}
                        >
                          {busy ? 'Applying...' : 'Apply To BOM'}
                        </Button>
                      </Stack>
                    </>
                  )}
                </Paper>
              );
            })}
          </Stack>
        )}
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button disabled={Boolean(savingReviewId)} onClick={onClose} sx={{ textTransform: 'none' }}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}
