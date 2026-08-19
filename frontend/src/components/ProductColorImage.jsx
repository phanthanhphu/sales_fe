import { useEffect, useState } from 'react';
import { Box, Dialog, DialogContent, DialogTitle, IconButton, Stack, Tooltip, Typography } from '@mui/material';
import { Image as ImageIcon } from '@mui/icons-material';
import { getProductColorImageObjectUrl } from '../services/masterDataService';

const hasStoredImage = (record = {}) => Boolean(
  record?.hasImage
  || record?.imageAvailable
  || record?.imageFileName
  || record?.imageStorageKey
  || record?.imageUpdatedAt
);

/**
 * Secure image preview for Product Color Master.
 * Images are requested as authenticated blobs so the browser never needs a public file URL.
 */
export default function ProductColorImage({
  productColor,
  height = 96,
  emptyText = 'No product image',
  onOpen
}) {
  const [previewUrl, setPreviewUrl] = useState('');
  const [status, setStatus] = useState('idle');
  const [previewOpen, setPreviewOpen] = useState(false);

  const id = String(productColor?.id || '').trim();
  const version = [
    productColor?.hasImage,
    productColor?.imageAvailable,
    productColor?.imageFileName,
    productColor?.imageStorageKey,
    productColor?.imageUpdatedAt,
    productColor?.updatedAt
  ].join('|');
  const imageExists = hasStoredImage(productColor);

  useEffect(() => {
    let active = true;
    let objectUrl = '';
    const controller = new AbortController();

    setPreviewUrl('');
    setStatus(imageExists && id ? 'loading' : 'empty');

    if (!imageExists || !id) {
      return () => {};
    }

    getProductColorImageObjectUrl(id, controller.signal)
      .then((url) => {
        objectUrl = url;
        if (!active) {
          URL.revokeObjectURL(url);
          return;
        }
        setPreviewUrl(url);
        setStatus('ready');
      })
      .catch((error) => {
        const cancelled = error?.name === 'CanceledError' || error?.code === 'ERR_CANCELED';
        if (cancelled) {
          return;
        }
        if (active) setStatus('error');
      });

    return () => {
      active = false;
      controller.abort();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [id, imageExists, version]);

  if (previewUrl) {
    const title = productColor?.productColor || productColor?.colorName || 'Product Color Image';
    const openPreview = () => {
      if (onOpen) {
        onOpen(productColor);
        return;
      }
      setPreviewOpen(true);
    };

    return (
      <>
        <Tooltip title="Click to preview image" arrow>
          <Box
            component="img"
            src={previewUrl}
            alt={title}
            onClick={openPreview}
            sx={{
              display: 'block',
              width: 1,
              height,
              objectFit: 'contain',
              cursor: 'zoom-in',
              backgroundColor: '#f8fafc',
              borderRadius: 1
            }}
          />
        </Tooltip>

        {!onOpen && (
          <Dialog open={previewOpen} onClose={() => setPreviewOpen(false)} maxWidth="md" fullWidth>
            <DialogTitle sx={{ pr: 6, fontWeight: 750, color: '#103B5C' }}>
              {title}
              <IconButton onClick={() => setPreviewOpen(false)} sx={{ position: 'absolute', right: 14, top: 14 }}>×</IconButton>
            </DialogTitle>
            <DialogContent dividers sx={{ bgcolor: '#f8fafc' }}>
              <Box
                component="img"
                src={previewUrl}
                alt={title}
                sx={{ width: 1, maxHeight: '72vh', objectFit: 'contain', display: 'block', mx: 'auto' }}
              />
            </DialogContent>
          </Dialog>
        )}
      </>
    );
  }

  const label = status === 'loading'
    ? 'Loading image...'
    : status === 'error'
      ? 'Image unavailable'
      : emptyText;

  return (
    <Stack
      alignItems="center"
      justifyContent="center"
      spacing={0.5}
      sx={{ height, px: 1, backgroundColor: '#f8fafc', borderRadius: 1 }}
    >
      <ImageIcon color={status === 'error' ? 'disabled' : 'action'} fontSize="small" />
      <Typography sx={{ fontSize: '0.67rem', color: 'text.secondary', textAlign: 'center' }}>
        {label}
      </Typography>
    </Stack>
  );
}
