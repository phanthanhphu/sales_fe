import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormHelperText,
  IconButton,
  MenuItem,
  Snackbar,
  Stack,
  TextField,
  Typography,
  useMediaQuery
} from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import CloseIcon from '@mui/icons-material/Close';
import CurrencyExchangeRoundedIcon from '@mui/icons-material/CurrencyExchangeRounded';
import {
  createMasterData,
  getMasterDataErrorMessage,
  listCurrentCurrencies,
  listMasterData,
  updateMasterData
} from '../../services/masterDataService';

const textValue = (value) => (value === null || value === undefined ? '' : String(value));

const pageContent = (response) => {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.content)) return response.content;
  if (Array.isArray(response?.items)) return response.items;
  if (Array.isArray(response?.data)) return response.data;
  return [];
};

/* The backend limits one page to 200 rows. Read all option pages so MAT_INFO
 * can link to the complete Vendor Code master, not only the first 200 rows. */
const loadAllMasterDataOptions = async (type, params = {}) => {
  const first = await listMasterData(type, { ...params, page: 0, size: 200 });
  const firstContent = pageContent(first);

  if (Array.isArray(first)) return firstContent;

  const totalPages = Math.max(1, Number(first?.totalPages || 1));
  const maxPages = Math.min(totalPages, 25);

  if (maxPages <= 1) return firstContent;

  const remaining = await Promise.all(
    Array.from({ length: maxPages - 1 }, (_, index) =>
      listMasterData(type, { ...params, page: index + 1, size: 200 })
    )
  );

  return [
    ...firstContent,
    ...remaining.flatMap((response) => pageContent(response))
  ];
};

const createFormValues = (config, record) => {
  const defaults = { ...(config.defaultValues || {}) };
  const fromConfig = config.toFormValues ? config.toFormValues(record || {}, defaults) : (record || {});

  (config.formFields || []).forEach((field) => {
    const value = fromConfig?.[field.name];
    defaults[field.name] = field.type === 'number' ? textValue(value) : (value ?? defaults[field.name] ?? '');
  });

  return defaults;
};

const validate = (config, values) => {
  const errors = {};

  (config.formFields || []).forEach((field) => {
    const rawValue = values?.[field.name];
    const value = typeof rawValue === 'string' ? rawValue.trim() : rawValue;

    if (field.required && (value === '' || value === null || value === undefined)) {
      errors[field.name] = `${field.label} is required.`;
      return;
    }

    if (field.maxLength && value && String(value).length > field.maxLength) {
      errors[field.name] = `${field.label} must not exceed ${field.maxLength} characters.`;
      return;
    }

    if (field.type === 'number' && value !== '' && value !== null && value !== undefined) {
      const number = Number(value);

      if (!Number.isFinite(number)) {
        errors[field.name] = `${field.label} must be a valid number.`;
        return;
      }

      if (field.min !== undefined && number < field.min) {
        errors[field.name] = `${field.label} must be at least ${field.min}.`;
        return;
      }

      if (field.max !== undefined && number > field.max) {
        errors[field.name] = `${field.label} must not exceed ${field.max}.`;
      }
    }
  });

  return { ...errors, ...(config.validate ? config.validate(values) : {}) };
};

const optionValue = (field, option) => {
  if (option === null || option === undefined) return '';
  if (typeof option !== 'object') return String(option);

  const key = field.optionValue || 'value';
  const value = option?.[key] ?? option?.value ?? option?.id ?? '';
  return value === null || value === undefined ? '' : String(value);
};

const optionLabel = (field, option) => {
  if (option === null || option === undefined) return '';

  if (typeof field.optionLabel === 'function') {
    const result = field.optionLabel(option);
    if (result !== null && result !== undefined && String(result).trim()) return String(result);
  }

  if (typeof option !== 'object') return String(option);

  return String(option.label || option[field.optionValue || 'value'] || option.value || option.id || '');
};

const includesValue = (options, field, value) =>
  options.some((item) => optionValue(field, item).toLowerCase() === String(value || '').toLowerCase());

const resolveRateToVnd = (currency = {}) => {
  const candidates = [
    currency?.rateToVnd,
    currency?.currentRateToVnd,
    currency?.latestRateToVnd,
    currency?.exchangeRateToVnd
  ];

  for (const candidate of candidates) {
    if (candidate === '' || candidate === null || candidate === undefined) continue;

    const parsed = Number(candidate);
    if (Number.isFinite(parsed) && parsed > 0) return parsed;
  }

  return null;
};

const formatVnd = (value, maxDigits = 2) => {
  const number = Number(value);
  if (!Number.isFinite(number)) return '-';

  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits: maxDigits,
    minimumFractionDigits: 0
  }).format(number);
};

export default function MasterDataFormDialog({
  config,
  mode,
  open,
  record = null,
  onClose,
  onSaved
}) {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));
  const [values, setValues] = useState(() => createFormValues(config, record));
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [serverError, setServerError] = useState('');
  const [currencyOptions, setCurrencyOptions] = useState([]);
  const [supplierOptions, setSupplierOptions] = useState([]);
  const [optionLoading, setOptionLoading] = useState({ currency: false, supplier: false });
  const [optionError, setOptionError] = useState('');
  const [snack, setSnack] = useState({ open: false, severity: 'error', message: '' });

  const isEditing = mode === 'edit';
  const recordLocked = Boolean(
    isEditing && typeof config.isRecordLocked === 'function' && config.isRecordLocked(record)
  );
  const recordLockMessage = recordLocked && typeof config.recordLockMessage === 'function'
    ? config.recordLockMessage(record)
    : '';
  const title = `${isEditing ? 'Edit' : 'Add'} ${config.menuTitle}`;
  const formFields = config.formFields || [];
  const usesCurrencyOptions = Boolean(config.needsCurrencyOptions || formFields.some((field) => field.optionSource === 'currency'));
  const usesSupplierOptions = Boolean(config.needsSupplierOptions || formFields.some((field) => field.optionSource === 'supplier'));

  useEffect(() => {
    if (!open) return;

    setValues(createFormValues(config, record));
    setErrors({});
    setServerError('');
    setSaving(false);
    setConfirmOpen(false);
  }, [config, open, record]);

  useEffect(() => {
    if (!open) {
      setCurrencyOptions([]);
      setSupplierOptions([]);
      setOptionLoading({ currency: false, supplier: false });
      setOptionError('');
      return undefined;
    }

    let alive = true;
    setOptionError('');

    const loadCurrencyOptions = async () => {
      if (!usesCurrencyOptions) return;
      setOptionLoading((current) => ({ ...current, currency: true }));

      try {
        // Currency Master can contain historical rows. MAT_INFO must receive
        // only the newest row for each Currency Code.
        const items = await listCurrentCurrencies();
        if (alive) setCurrencyOptions(items);
      } catch {
        if (alive) {
          setCurrencyOptions([]);
          setOptionError('Unable to load Currency Master. Please reload the dialog.');
        }
      } finally {
        if (alive) setOptionLoading((current) => ({ ...current, currency: false }));
      }
    };

    const loadSupplierOptions = async () => {
      if (!usesSupplierOptions) return;
      setOptionLoading((current) => ({ ...current, supplier: true }));

      try {
        // UI field key remains "supplier", but the Master Data service type is
        // "vendor" so it maps to /api/master-data/vendor-codes.
        const items = await loadAllMasterDataOptions('vendor');
        if (alive) setSupplierOptions(items);
      } catch (error) {
        console.error('Unable to load Vendor Code Master:', error);
        if (alive) {
          setSupplierOptions([]);
          setOptionError('Unable to load Vendor Code Master. Please reload the dialog.');
        }
      } finally {
        if (alive) setOptionLoading((current) => ({ ...current, supplier: false }));
      }
    };

    loadCurrencyOptions();
    loadSupplierOptions();

    return () => {
      alive = false;
    };
  }, [open, usesCurrencyOptions, usesSupplierOptions]);

  const getOptions = (field) => {
    if (field.optionSource === 'currency') return currencyOptions;
    if (field.optionSource === 'supplier') return supplierOptions;
    return field.options || [];
  };

  const isLoadingOptions = (field) => Boolean(field.optionSource && optionLoading[field.optionSource]);

  const selectedAutocompleteOption = (field, rawValue, options) => {
    const value = String(rawValue || '').trim();
    if (!value) return null;

    return options.find((item) => optionValue(field, item).toLowerCase() === value.toLowerCase())
      || { [field.optionValue || 'value']: value };
  };

  const selectedCurrency = useMemo(() => {
    const code = String(values?.currency || '').trim().toUpperCase();
    if (!code) return null;

    return currencyOptions.find((item) => String(item?.currencyCode || '').trim().toUpperCase() === code) || null;
  }, [currencyOptions, values?.currency]);

  const selectedRateToVnd = resolveRateToVnd(selectedCurrency);
  const materialPrice = values?.matPriceWithoutTax === '' || values?.matPriceWithoutTax === null || values?.matPriceWithoutTax === undefined
    ? null
    : Number(values.matPriceWithoutTax);
  const canCalculateVnd = Number.isFinite(selectedRateToVnd) && Number.isFinite(materialPrice);
  const conversionToVnd = canCalculateVnd ? materialPrice * selectedRateToVnd : null;

  const handleChange = (field, nextValue) => {
    setValues((current) => {
      const nextValues = { ...current, [field.name]: nextValue };

      if (typeof config.transformFieldChange === 'function') {
        const transformed = config.transformFieldChange({
          field,
          value: nextValue,
          previousValues: current,
          nextValues,
          record,
          mode
        });

        return transformed && typeof transformed === 'object' ? transformed : nextValues;
      }

      return nextValues;
    });

    setErrors((current) => ({ ...current, [field.name]: '' }));
    setServerError('');
  };

  const isFieldDisabled = (field, loadingOptions) => {
    const disabledByConfig = typeof config.isFieldDisabled === 'function'
      ? Boolean(config.isFieldDisabled({ field, values, record, mode }))
      : Boolean(field.disabled);

    return saving || recordLocked || loadingOptions || disabledByConfig;
  };

  const helperText = (field, error, loadingOptions) => {
    if (error) return error;

    const dynamicHelper = typeof config.getFieldHelperText === 'function'
      ? config.getFieldHelperText({ field, values, record, mode })
      : '';

    return dynamicHelper || field.helperText || (loadingOptions ? 'Loading master data…' : '');
  };

  const handleAttemptSave = () => {
    if (recordLocked) {
      setSnack({ open: true, severity: 'error', message: recordLockMessage || 'This record is locked and cannot be changed.' });
      return;
    }
    const nextErrors = validate(config, values);
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      setSnack({ open: true, severity: 'error', message: 'Please correct the highlighted fields.' });
      return;
    }

    setConfirmOpen(true);
  };

  const handleConfirm = async () => {
    setConfirmOpen(false);
    setSaving(true);
    setServerError('');

    try {
      const payload = config.toPayload ? config.toPayload(values) : values;
      const response = isEditing
        ? await updateMasterData(config.type, record?.id, payload)
        : await createMasterData(config.type, payload);

      onSaved?.(response, `${config.singular} ${isEditing ? 'updated' : 'created'} successfully.`);
    } catch (error) {
      const message = getMasterDataErrorMessage(error, `Unable to ${isEditing ? 'update' : 'create'} ${config.singular}.`);
      setServerError(message);
      setSnack({ open: true, severity: 'error', message });
    } finally {
      setSaving(false);
    }
  };

  const locked = saving;
  const formSubtitle = recordLocked
    ? (recordLockMessage || `This ${config.singular} record is used and cannot be changed.`)
    : isEditing
      ? `Update ${config.singular} information. Changes are validated before saving.`
      : `Create a new ${config.singular} record. Fields marked with * are required.`;

  return (
    <>
      <Dialog
        open={open}
        onClose={locked ? undefined : onClose}
        fullScreen={fullScreen}
        maxWidth={config.type === 'matInfo' ? 'md' : 'sm'}
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: fullScreen ? 0 : 2,
            boxShadow: `0 16px 44px ${alpha('#000', 0.18)}`
          }
        }}
      >
        <DialogTitle
          sx={{
            pr: 6,
            px: 3,
            pt: 2.35,
            pb: config.hideFormSubtitle ? 1.35 : 1.75,
            fontWeight: 900,
            color: '#103B5C'
          }}
        >
          <Typography component="div" sx={{ fontSize: '1.15rem', fontWeight: 900, lineHeight: 1.25 }}>
            {title}
          </Typography>
          {!config.hideFormSubtitle && (
            <Typography sx={{ mt: 0.35, fontSize: '0.8rem', color: 'text.secondary', fontWeight: 400, lineHeight: 1.45 }}>
              {formSubtitle}
            </Typography>
          )}
          <IconButton
            onClick={onClose}
            disabled={locked}
            aria-label="Close"
            sx={{ position: 'absolute', right: 14, top: 14, color: '#374151' }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>

        <DialogContent dividers sx={{ p: { xs: 2, sm: 3 } }}>
          {recordLocked && <Alert severity="warning" sx={{ mb: 2, borderRadius: 2 }}>{recordLockMessage || 'This record is used and locked.'}</Alert>}
          {serverError && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{serverError}</Alert>}
          {optionError && <Alert severity="warning" sx={{ mb: 2, borderRadius: 2 }}>{optionError}</Alert>}
          {config.formHint && <Alert severity="info" sx={{ mb: 2, borderRadius: 2 }}>{config.formHint}</Alert>}

          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(12, minmax(0, 1fr))' }, gap: 2 }}>
            {formFields.map((field) => {
              const value = values?.[field.name] ?? '';
              const error = errors?.[field.name];
              const grid = field.grid || 6;
              const options = getOptions(field);
              const loadingOptions = isLoadingOptions(field);
              const disabled = isFieldDisabled(field, loadingOptions);
              const isDynamicSelect = field.type === 'select' && Boolean(field.optionSource);
              const fieldHelper = helperText(field, error, loadingOptions);

              if (field.type === 'autocomplete') {
                const selectedOption = selectedAutocompleteOption(field, value, options);

                return (
                  <Box key={field.name} sx={{ gridColumn: { xs: 'span 1', sm: `span ${grid}` } }}>
                    <Autocomplete
                      freeSolo={field.freeSolo === true}
                      fullWidth
                      options={options}
                      loading={loadingOptions}
                      value={selectedOption}
                      disabled={disabled}
                      noOptionsText={loadingOptions ? 'Loading options…' : 'No matching master-data record'}
                      isOptionEqualToValue={(option, selected) => optionValue(field, option) === optionValue(field, selected)}
                      getOptionLabel={(option) => optionLabel(field, option)}
                      onChange={(_, nextOption) => handleChange(field, nextOption ? optionValue(field, nextOption) : '')}
                      onInputChange={(_, nextInput, reason) => {
                        if (field.freeSolo === true && (reason === 'input' || reason === 'clear')) {
                          handleChange(field, nextInput);
                        }
                      }}
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          label={field.label}
                          required={field.required}
                          placeholder={field.placeholder}
                          error={Boolean(error)}
                          InputLabelProps={{ sx: { fontWeight: 700 } }}
                          inputProps={{
                            ...params.inputProps,
                            maxLength: field.maxLength
                          }}
                          sx={{
                            '& .MuiOutlinedInput-root': { borderRadius: 1.25 },
                            '& .MuiInputLabel-root': { fontWeight: 700 }
                          }}
                        />
                      )}
                    />
                    {fieldHelper && (
                      <FormHelperText error={Boolean(error)} sx={{ ml: 1.75 }}>
                        {fieldHelper}
                      </FormHelperText>
                    )}
                  </Box>
                );
              }

              const displayedOptions = isDynamicSelect && value && !includesValue(options, field, value)
                ? [{ [field.optionValue || 'value']: value, label: `${value} (current value)` }, ...options]
                : options;

              return (
                <Box key={field.name} sx={{ gridColumn: { xs: 'span 1', sm: `span ${grid}` } }}>
                  <TextField
                    select={field.type === 'select'}
                    fullWidth
                    label={field.label}
                    required={field.required}
                    value={value}
                    type={field.type === 'date' ? 'date' : field.type === 'number' ? 'number' : 'text'}
                    multiline={Boolean(field.multiline)}
                    minRows={field.minRows}
                    placeholder={field.placeholder}
                    disabled={disabled}
                    error={Boolean(error)}
                    helperText={fieldHelper}
                    onChange={(event) => handleChange(field, event.target.value)}
                    InputLabelProps={field.type === 'date' ? { shrink: true } : undefined}
                    inputProps={{
                      maxLength: field.maxLength,
                      min: field.min,
                      max: field.max,
                      step: field.step
                    }}
                    sx={{
                      '& .MuiOutlinedInput-root': { borderRadius: 1.25 },
                      '& .MuiInputLabel-root': { fontWeight: 700 }
                    }}
                  >
                    {field.type === 'select' && displayedOptions.map((option) => {
                      const valueKey = optionValue(field, option);
                      return (
                        <MenuItem key={valueKey || String(option)} value={valueKey}>
                          {optionLabel(field, option)}
                        </MenuItem>
                      );
                    })}
                  </TextField>
                </Box>
              );
            })}

            {config.showCurrencyConversionPreview && (
              <Box sx={{ gridColumn: { xs: 'span 1', sm: 'span 12' } }}>
                <Box
                  sx={{
                    p: 1.6,
                    borderRadius: 2.5,
                    border: `1px solid ${alpha(theme.palette.info.main, 0.24)}`,
                    backgroundColor: alpha(theme.palette.info.main, 0.055)
                  }}
                >
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.2} alignItems={{ xs: 'flex-start', sm: 'center' }} justifyContent="space-between">
                    <Stack direction="row" spacing={1} alignItems="center">
                      <CurrencyExchangeRoundedIcon color="info" fontSize="small" />
                      <Box>
                        <Typography sx={{ fontSize: '0.85rem', fontWeight: 800, color: '#0f3d5e' }}>
                          Current conversion to VND
                        </Typography>
                        <Typography sx={{ mt: 0.15, fontSize: '0.78rem', color: alpha('#0f3d5e', 0.75) }}>
                          The rate is loaded from the latest added Currency Master record.
                        </Typography>
                      </Box>
                    </Stack>

                    {selectedCurrency && Number.isFinite(selectedRateToVnd) ? (
                      <Chip
                        size="small"
                        color="info"
                        variant="outlined"
                        label={`1 ${String(values?.currency || '').trim().toUpperCase()} = ${formatVnd(selectedRateToVnd, 6)} VND`}
                        sx={{ fontWeight: 700 }}
                      />
                    ) : (
                      <Chip size="small" variant="outlined" label="Select a currency to load rate" />
                    )}
                  </Stack>

                  <Typography sx={{ mt: 1.15, fontSize: '0.88rem', fontWeight: 700, color: '#111827' }}>
                    {canCalculateVnd
                      ? `${formatVnd(materialPrice, 6)} ${String(values?.currency || '').trim().toUpperCase()} × ${formatVnd(selectedRateToVnd, 6)} = ${formatVnd(conversionToVnd, 2)} VND`
                      : 'Enter MAT PRICE (W/O TAX) and select a currency to preview the VND value.'}
                  </Typography>
                </Box>
              </Box>
            )}
          </Box>
        </DialogContent>

        <DialogActions sx={{ p: 2 }}>
          <Button onClick={onClose} disabled={locked} sx={{ textTransform: 'none', color: '#4b5563' }}>
            Cancel
          </Button>
          <Button
            onClick={handleAttemptSave}
            disabled={locked || recordLocked}
            variant="contained"
            sx={{ textTransform: 'none', fontWeight: 800, backgroundColor: '#103B5C', '&:hover': { backgroundColor: '#0b2e49' } }}
          >
            {saving ? <CircularProgress size={20} color="inherit" /> : isEditing ? 'Save changes' : `Create ${config.singular}`}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={confirmOpen}
        onClose={saving ? undefined : () => setConfirmOpen(false)}
        maxWidth="xs"
        fullWidth
        PaperProps={{ sx: { borderRadius: 2 } }}
      >
        <DialogTitle sx={{ pr: 6, fontWeight: 900, color: '#103B5C' }}>
          {isEditing ? `Save ${config.singular}` : `Create ${config.singular}`}
          <Typography sx={{ mt: 0.25, fontSize: '0.8rem', color: 'text.secondary', fontWeight: 400 }}>
            Please confirm the information before continuing.
          </Typography>
          <IconButton
            onClick={() => setConfirmOpen(false)}
            disabled={saving}
            aria-label="Close confirmation"
            sx={{ position: 'absolute', right: 14, top: 14 }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          <Typography>
            {isEditing ? `Save changes to this ${config.singular}?` : `Create this ${config.singular}?`}
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setConfirmOpen(false)} disabled={saving} sx={{ textTransform: 'none', color: '#4b5563' }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleConfirm}
            disabled={saving}
            sx={{ textTransform: 'none', fontWeight: 800, backgroundColor: '#103B5C', '&:hover': { backgroundColor: '#0b2e49' } }}
          >
            {saving ? 'Saving...' : 'Confirm'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={snack.open} autoHideDuration={4500} onClose={() => setSnack((current) => ({ ...current, open: false }))} anchorOrigin={{ vertical: 'top', horizontal: 'center' }}>
        <Alert severity={snack.severity} onClose={() => setSnack((current) => ({ ...current, open: false }))}>{snack.message}</Alert>
      </Snackbar>
    </>
  );
}
