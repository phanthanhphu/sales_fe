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
  Tooltip,
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
  listActiveShipTos,
  searchVendorCodeOptions,
  updateMasterData
} from '../../services/masterDataService';

const textValue = (value) => (value === null || value === undefined ? '' : String(value));

const createFormValues = (config, record) => {
  const defaults = { ...(config.defaultValues || {}) };
  const fromConfig = config.toFormValues ? config.toFormValues(record || {}, defaults) : (record || {});

  (config.formFields || []).forEach((field) => {
    const value = fromConfig?.[field.name];
    if (field.multiple === true) {
      const source = value ?? defaults[field.name];
      defaults[field.name] = Array.isArray(source) ? source : (source ? [source] : []);
    } else {
      defaults[field.name] = field.type === 'number' ? textValue(value) : (value ?? defaults[field.name] ?? '');
    }
  });

  return defaults;
};

const validate = (config, values) => {
  const errors = {};

  (config.formFields || []).forEach((field) => {
    const rawValue = values?.[field.name];
    const value = typeof rawValue === 'string' ? rawValue.trim() : rawValue;

    if (field.required && (value === '' || value === null || value === undefined || (Array.isArray(value) && value.length === 0))) {
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

  return new Intl.NumberFormat('vi-VN', {
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
  onSaved,
  scopeParams = {}
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
  const [shipToOptions, setShipToOptions] = useState([]);
  // Keep the text typed in Short Name Supplier separate from the selected
  // master-data value. This prevents MUI Autocomplete from resetting the
  // user's text while the remote Vendor Code search is refreshing options.
  const [supplierInput, setSupplierInput] = useState('');
  const [supplierSearch, setSupplierSearch] = useState('');
  const [optionLoading, setOptionLoading] = useState({ currency: false, supplier: false, shipTo: false });
  const [optionError, setOptionError] = useState('');
  const [snack, setSnack] = useState({ open: false, severity: 'error', message: '' });

  const isEditing = mode === 'edit';
  const legacyRecordLocked = Boolean(
    isEditing && typeof config.isRecordLocked === 'function' && config.isRecordLocked(record)
  );
  const editRecordLocked = Boolean(
    isEditing && typeof config.isEditLocked === 'function' && config.isEditLocked(record)
  );
  const recordLocked = legacyRecordLocked || editRecordLocked;
  const recordLockMessage = editRecordLocked && typeof config.editLockMessage === 'function'
    ? config.editLockMessage(record)
    : legacyRecordLocked && typeof config.recordLockMessage === 'function'
      ? config.recordLockMessage(record)
      : '';
  const restrictedEditMessage = Boolean(isEditing && !recordLocked && typeof config.restrictedEditMessage === 'function')
    ? config.restrictedEditMessage(record)
    : '';
  const title = `${isEditing ? 'Edit' : 'Add'} ${config.menuTitle}`;
  const formFields = config.formFields || [];
  const usesCurrencyOptions = Boolean(config.needsCurrencyOptions || formFields.some((field) => field.optionSource === 'currency'));
  const usesSupplierOptions = Boolean(config.needsSupplierOptions || formFields.some((field) => field.optionSource === 'supplier'));
  const usesShipToOptions = Boolean(formFields.some((field) => field.optionSource === 'shipTo'));

  useEffect(() => {
    if (!open) return;

    const initialValues = createFormValues(config, record);
    setValues(initialValues);
    const initialSupplier = String(initialValues?.shortNameSupplier || '');
    setSupplierInput(initialSupplier);
    setSupplierSearch(initialSupplier);
    setErrors({});
    setServerError('');
    setSaving(false);
    setConfirmOpen(false);
  }, [config, open, record]);

  useEffect(() => {
    if (!open) {
      setCurrencyOptions([]);
      setSupplierOptions([]);
      setShipToOptions([]);
      setOptionLoading({ currency: false, supplier: false, shipTo: false });
      setOptionError('');
      return undefined;
    }

    if (!usesCurrencyOptions) return undefined;
    let alive = true;
    setOptionLoading((current) => ({ ...current, currency: true }));

    listCurrentCurrencies()
      .then((items) => {
        if (alive) setCurrencyOptions(items);
      })
      .catch(() => {
        if (alive) {
          setCurrencyOptions([]);
          setOptionError('Unable to load Currency Master. Please reload the dialog.');
        }
      })
      .finally(() => {
        if (alive) setOptionLoading((current) => ({ ...current, currency: false }));
      });

    return () => {
      alive = false;
    };
  }, [open, usesCurrencyOptions]);

  useEffect(() => {
    if (!open || !usesShipToOptions) return undefined;

    let alive = true;
    setOptionLoading((current) => ({ ...current, shipTo: true }));
    listActiveShipTos(scopeParams?.buyerKey)
      .then((items) => {
        if (alive) setShipToOptions(Array.isArray(items) ? items : []);
      })
      .catch(() => {
        if (alive) {
          setShipToOptions([]);
          setOptionError('Unable to load Ship To Master. Please reload the dialog.');
        }
      })
      .finally(() => {
        if (alive) setOptionLoading((current) => ({ ...current, shipTo: false }));
      });

    return () => { alive = false; };
  }, [open, scopeParams?.buyerKey, usesShipToOptions]);

  useEffect(() => {
    if (!open || !usesSupplierOptions) return undefined;

    let alive = true;
    const timer = window.setTimeout(() => {
      setOptionLoading((current) => ({ ...current, supplier: true }));
      searchVendorCodeOptions(supplierSearch, 50, scopeParams?.buyerKey)
        .then((items) => {
          if (alive) setSupplierOptions(Array.isArray(items) ? items : []);
        })
        .catch((error) => {
          console.error('Unable to search Vendor Code Master:', error);
          if (alive) {
            setSupplierOptions([]);
            setOptionError('Unable to search Vendor Code Master. Short Name Supplier must be selected from Vendor Code.');
          }
        })
        .finally(() => {
          if (alive) setOptionLoading((current) => ({ ...current, supplier: false }));
        });
    }, 250);

    return () => {
      alive = false;
      window.clearTimeout(timer);
    };
  }, [open, scopeParams?.buyerKey, supplierSearch, usesSupplierOptions]);

  const getOptions = (field) => {
    if (field.optionSource === 'currency') return currencyOptions;
    if (field.optionSource === 'supplier') return supplierOptions;
    if (field.optionSource === 'shipTo') return shipToOptions;
    return field.options || [];
  };

  const isLoadingOptions = (field) => Boolean(field.optionSource && optionLoading[field.optionSource]);

  const selectedAutocompleteOption = (field, rawValue, options) => {
    const value = String(rawValue || '').trim();
    if (!value) return null;

    return options.find((item) => optionValue(field, item).toLowerCase() === value.toLowerCase())
      || { [field.optionValue || 'value']: value };
  };

  const selectedAutocompleteOptions = (field, rawValues, options) => {
    const values = Array.isArray(rawValues) ? rawValues : (rawValues ? [rawValues] : []);
    return values
      .map((value) => selectedAutocompleteOption(field, value, options))
      .filter(Boolean);
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

    // Remote Supplier search must remain editable while its options are loading.
    // Disabling the Autocomplete on every request makes the field lose focus
    // and causes the typed character to appear to disappear.
    const blockWhileLoading = loadingOptions && field.optionSource !== 'supplier';
    return saving || recordLocked || blockWhileLoading || disabledByConfig;
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
        ? await updateMasterData(config.type, record?.id, payload, scopeParams)
        : await createMasterData(config.type, payload, scopeParams);

      onSaved?.(response, `${config.singular} ${isEditing ? 'updated' : 'created'} successfully.`, { mode: isEditing ? 'update' : 'create' });
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
            fontWeight: 750,
            color: '#103B5C'
          }}
        >
          <Typography component="div" sx={{ fontSize: '1.15rem', fontWeight: 750, lineHeight: 1.25 }}>
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

        <DialogContent dividers sx={{ p: { xs: 1.5, sm: 2 } }}>
          {recordLocked && <Alert severity="warning" sx={{ mb: 2, borderRadius: 2 }}>{recordLockMessage || 'This record is used and locked.'}</Alert>}
          {restrictedEditMessage && <Alert severity="warning" sx={{ mb: 2, borderRadius: 2 }}>{restrictedEditMessage}</Alert>}
          {serverError && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{serverError}</Alert>}
          {optionError && <Alert severity="warning" sx={{ mb: 2, borderRadius: 2 }}>{optionError}</Alert>}
          {config.formHint && <Alert severity="info" sx={{ mb: 2, borderRadius: 2 }}>{config.formHint}</Alert>}

          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(12, minmax(0, 1fr))' }, gap: 1.25 }}>
            {formFields.map((field) => {
              const value = values?.[field.name] ?? (field.multiple === true ? [] : '');
              const error = errors?.[field.name];
              const grid = field.grid || 6;
              const options = getOptions(field);
              const loadingOptions = isLoadingOptions(field);
              const disabled = isFieldDisabled(field, loadingOptions);
              const isDynamicSelect = field.type === 'select' && Boolean(field.optionSource);
              const fieldHelper = helperText(field, error, loadingOptions);

              if (field.type === 'autocomplete') {
                const multiple = field.multiple === true;
                const selectedOption = multiple
                  ? selectedAutocompleteOptions(field, value, options)
                  : selectedAutocompleteOption(field, value, options);
                const lockedMultiValues = multiple && typeof config.getLockedMultiValues === 'function'
                  ? new Set((config.getLockedMultiValues({ field, values, record, mode }) || [])
                    .map((item) => String(item || '').trim())
                    .filter(Boolean))
                  : new Set();

                return (
                  <Box key={field.name} sx={{ gridColumn: { xs: 'span 1', sm: `span ${grid}` } }}>
                    <Autocomplete
                      multiple={multiple}
                      filterSelectedOptions={multiple}
                      size="small"
                      freeSolo={field.freeSolo === true}
                      fullWidth
                      options={options}
                      loading={loadingOptions}
                      value={selectedOption}
                      inputValue={field.optionSource === 'supplier' ? supplierInput : undefined}
                      disabled={disabled}
                      noOptionsText={loadingOptions ? 'Loading options…' : 'No matching master-data record'}
                      isOptionEqualToValue={(option, selected) => optionValue(field, option) === optionValue(field, selected)}
                      getOptionLabel={(option) => optionLabel(field, option)}
                      // Supplier uses both MUI's immediate local filtering and the
                      // debounced server lookup. Local filtering keeps the dropdown
                      // responsive while the newest Vendor Code results are loading.
                      filterOptions={(field.optionSource === 'supplier' || field.optionSource === 'shipTo')
                        ? undefined
                        : ((items) => items)}
                      onChange={(_, nextOption) => {
                        let nextValue = multiple
                          ? (nextOption || []).map((item) => optionValue(field, item)).filter(Boolean)
                          : (nextOption ? optionValue(field, nextOption) : '');
                        if (multiple && lockedMultiValues.size > 0) {
                          const nextSet = new Set(nextValue.map((item) => String(item)));
                          let restored = false;
                          lockedMultiValues.forEach((lockedValue) => {
                            if (!nextSet.has(lockedValue)) {
                              nextValue.push(lockedValue);
                              nextSet.add(lockedValue);
                              restored = true;
                            }
                          });
                          if (restored) {
                            setSnack({
                              open: true,
                              severity: 'warning',
                              message: 'A Ship To already used by MPR cannot be removed from this mapping.'
                            });
                          }
                        }
                        if (field.optionSource === 'supplier') {
                          const selectedSupplier = String(nextValue || '');
                          setSupplierInput(selectedSupplier);
                          setSupplierSearch(selectedSupplier);
                        }
                        handleChange(field, nextValue);
                      }}
                      renderTags={multiple && lockedMultiValues.size > 0 ? ((tagValue, getTagProps) =>
                        tagValue.map((option, index) => {
                          const valueKey = optionValue(field, option);
                          const lockedTag = lockedMultiValues.has(String(valueKey));
                          const tagProps = getTagProps({ index });
                          const { key, onDelete, ...chipProps } = tagProps;
                          const chip = (
                            <Chip
                              key={key}
                              {...chipProps}
                              onDelete={lockedTag ? undefined : onDelete}
                              label={`${optionLabel(field, option)}${lockedTag ? ' · Used by MPR' : ''}`}
                              size="small"
                            />
                          );
                          return lockedTag ? (
                            <Tooltip
                              key={key}
                              title="Cannot remove because this Ship To is referenced by an existing MPR."
                              arrow
                            >
                              <span>{chip}</span>
                            </Tooltip>
                          ) : chip;
                        })) : undefined}
                      onInputChange={(_, nextInput, reason) => {
                        if (field.optionSource === 'supplier') {
                          if (reason === 'input' || reason === 'clear') {
                            // Control the visible search text ourselves so async option
                            // refreshes can never erase what the user is typing.
                            setSupplierInput(nextInput);
                            setSupplierSearch(nextInput);

                            if (reason === 'clear') {
                              handleChange(field, '');
                            } else if (field.requireSelection === true && !multiple) {
                              const selectedValue = String(values?.[field.name] || '').trim();
                              if (selectedValue && selectedValue.toLowerCase() !== String(nextInput || '').trim().toLowerCase()) {
                                // Typing after a valid selection makes it pending again.
                                // Save remains blocked until an option is selected.
                                handleChange(field, '');
                              }
                            }
                          }
                          // Ignore MUI's `reset` event. onChange above decides what text
                          // to display after a supplier is actually selected.
                          return;
                        }

                        if (field.freeSolo === true && (reason === 'input' || reason === 'clear')) {
                          handleChange(field, nextInput);
                        } else if (field.requireSelection === true && !multiple && reason === 'input') {
                          handleChange(field, '');
                        }
                      }}
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          size="small"
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
                    size="small"
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
                      step: field.step,
                      inputMode: field.inputMode,
                      pattern: field.pattern
                    }}
                    sx={{
                      '& .MuiOutlinedInput-root': { borderRadius: 1.25 },
                      '& .MuiInputLabel-root': { fontWeight: 700 }
                    }}
                  >
                    {field.type === 'select' && displayedOptions.map((option) => {
                      const valueKey = optionValue(field, option);
                      const optionDisabled = typeof config.isOptionDisabled === 'function'
                        ? Boolean(config.isOptionDisabled({ field, option, values, record, mode }))
                        : Boolean(option?.disabled);
                      return (
                        <MenuItem key={valueKey || String(option)} value={valueKey} disabled={optionDisabled}>
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
                        <Typography sx={{ fontSize: '0.85rem', fontWeight: 700, color: '#0f3d5e' }}>
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
                      ? `${formatVnd(materialPrice, 6)} ${String(values?.currency || '').trim().toUpperCase()} × ${formatVnd(selectedRateToVnd, 6)} = ${formatVnd(conversionToVnd, 0)} VND`
                      : 'Enter MAT PRICE (W/O TAX) and select a currency to preview the VND value.'}
                  </Typography>
                </Box>
              </Box>
            )}
          </Box>
        </DialogContent>

        <DialogActions sx={{ px: 2, py: 1.25 }}>
          <Button onClick={onClose} disabled={locked} sx={{ textTransform: 'none', color: '#4b5563' }}>
            Cancel
          </Button>
          <Button
            onClick={handleAttemptSave}
            disabled={locked || recordLocked}
            variant="contained"
            sx={{ textTransform: 'none', fontWeight: 700, backgroundColor: '#103B5C', '&:hover': { backgroundColor: '#0b2e49' } }}
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
        <DialogTitle sx={{ pr: 6, fontWeight: 750, color: '#103B5C' }}>
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
            sx={{ textTransform: 'none', fontWeight: 700, backgroundColor: '#103B5C', '&:hover': { backgroundColor: '#0b2e49' } }}
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
