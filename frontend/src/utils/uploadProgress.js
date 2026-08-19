export const initialUploadProgress = (file = null, status = 'Preparing Excel upload...') => ({
  open: Boolean(file),
  file,
  progress: 3,
  status,
  detail: '',
  state: 'processing'
});

export const uploadStage = (progress) => {
  const value = Number(progress || 0);
  if (value < 36) return 'Uploading Excel file to server...';
  if (value < 58) return 'Reading workbook and worksheet structure...';
  if (value < 76) return 'Validating Excel rows and linked master data...';
  if (value < 92) return 'Creating records and saving data...';
  if (value < 100) return 'Finalizing imported data...';
  return 'Excel import completed.';
};

export const startProcessingTicker = (setProgress) => {
  return window.setInterval(() => {
    setProgress((current) => {
      if (!current?.open || current.state !== 'processing') return current;
      const nextValue = Math.min(92, Math.max(36, Number(current.progress || 0) + (current.progress < 65 ? 3 : 1)));
      return { ...current, progress: nextValue, status: uploadStage(nextValue) };
    });
  }, 650);
};

export const uploadProgressFromEvent = (event) => {
  const loaded = Number(event?.loaded || 0);
  const total = Number(event?.total || 0);
  if (total <= 0) return 18;
  return Math.max(5, Math.min(35, Math.round((loaded / total) * 35)));
};
