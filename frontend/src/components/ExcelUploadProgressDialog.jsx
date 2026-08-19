import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Typography
} from '@mui/material';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import SalesBomLoadingPanel from './SalesBomLoadingPanel';

export default function ExcelUploadProgressDialog({
  open,
  title = 'Uploading Excel file',
  file,
  progress = 0,
  status = 'Preparing Excel upload...',
  detail = '',
  state = 'processing',
  onClose,
  onRetry
}) {
  const processing = state === 'processing';
  const success = state === 'success';
  const failed = state === 'error';

  return (
    <Dialog
      open={Boolean(open)}
      onClose={processing ? undefined : onClose}
      fullWidth
      maxWidth="sm"
      PaperProps={{
        sx: {
          overflow: 'hidden',
          borderRadius: 3,
          backgroundColor: '#f8fbff',
          boxShadow: '0 30px 85px rgba(15,56,88,.24)'
        }
      }}
    >
      <DialogTitle sx={{ px: 2.5, py: 1.7, pr: 6, borderBottom: '1px solid #e4edf5', backgroundColor: 'rgba(255,255,255,.94)' }}>
        <Typography sx={{ fontWeight: 750, color: '#103B5C', fontSize: '1.02rem' }}>{title}</Typography>
        <Typography sx={{ mt: 0.2, color: 'text.secondary', fontSize: '0.72rem' }}>
          Live import status and processing progress
        </Typography>
        {!processing && (
          <IconButton aria-label="Close" onClick={onClose} sx={{ position: 'absolute', right: 12, top: 12 }}>
            <CloseRoundedIcon />
          </IconButton>
        )}
      </DialogTitle>

      <DialogContent sx={{ p: { xs: 1.5, sm: 2.1 }, background: 'linear-gradient(180deg, #f8fbff 0%, #eef6fc 100%)' }}>
        <SalesBomLoadingPanel
          file={file}
          progress={progress}
          status={status}
          detail={detail}
          state={state}
        />
      </DialogContent>

      <DialogActions sx={{ px: 2.4, py: 1.55, gap: 0.7, borderTop: '1px solid #e4edf5', backgroundColor: '#fff' }}>
        {failed && onRetry && (
          <Button onClick={onRetry} variant="outlined" sx={{ textTransform: 'none', fontWeight: 700 }}>
            Retry
          </Button>
        )}
        <Button
          onClick={onClose}
          disabled={processing}
          variant={success ? 'contained' : 'text'}
          sx={{ textTransform: 'none', fontWeight: 700 }}
        >
          {success ? 'Done' : 'Close'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
