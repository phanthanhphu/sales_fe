import {
  formatDateTime,
  formatNumber,
  formatVnd,
  normalizeText,
  trimText
} from '../shared/masterDataUtils';

const toNullableNumber = (value) => {
  if (value === '' || value === null || value === undefined) return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
};

export const getCurrentRateToVnd = (record = {}) => {
  const value = record?.rateToVnd;
  const rate = Number(value);
  return Number.isFinite(rate) && rate > 0 ? rate : null;
};

const rateLabel = (record = {}) => {
  const code = normalizeText(record?.currencyCode) || 'CUR';
  const rate = getCurrentRateToVnd(record);
  return Number.isFinite(rate) ? `1 ${code} = ${formatVnd(rate)} VND` : '-';
};

export const currencyConfig = {
  type: 'currency',
  menuTitle: 'Currency',
  pageTitle: 'Currency Master',
  singular: 'Currency',
  allowUpload: false,
  primaryField: 'currencyCode',
  minTableWidth: 1080,
  excelSheetName: 'CURRENCY',
  importHint: 'Expected columns: Currency Code | Currency Name | Rate To VND. A different Rate To VND creates a new Currency row. Exact Code + Rate duplicates are skipped by UPSERT. VND is fixed at 1.',
  defaultValues: {
    currencyCode: '',
    currencyName: '',
    rateToVnd: ''
  },
  searchFields: [
    {
      name: 'keyword',
      label: 'Keyword',
      placeholder: 'Currency Code Or Currency Name'
    }
  ],
  formHint: 'Each Currency row is one rate record. To change USD from 23,000 to 24,000, use Add Currency and enter USD with 24,000. MAT_INFO and MPR always use the most recently added row for each Currency Code. A Currency row used by MAT_INFO or MPR cannot be edited or deleted.',
  formFields: [
    {
      name: 'currencyCode',
      label: 'Currency Code',
      required: true,
      maxLength: 3,
      grid: 4,
      placeholder: 'USD / VND / EUR',
      helperText: 'Three-Letter Currency Code.'
    },
    {
      name: 'currencyName',
      label: 'Currency Name',
      required: true,
      maxLength: 100,
      grid: 8,
      placeholder: 'US Dollar / Vietnamese Dong'
    },
    {
      name: 'rateToVnd',
      label: 'Rate To VND',
      required: true,
      type: 'number',
      min: 0.00000001,
      step: '0.0001',
      grid: 12,
      placeholder: 'Example: 24000 Means 1 USD = 24,000 VND'
    }
  ],
  columns: [
    { label: 'Currency Code', key: 'currencyCode', minWidth: 145 },
    { label: 'Currency Name', key: 'currencyName', minWidth: 250 },
    {
      label: 'Rate To VND',
      key: 'rateToVnd',
      minWidth: 230,
      align: 'right',
      sortValue: (row) => Number(getCurrentRateToVnd(row) || 0),
      render: (row) => rateLabel(row)
    },
    {
      label: 'Usage',
      key: 'locked',
      minWidth: 170,
      sortable: false,
      render: (row) => row?.locked ? (row.lockMessage || 'Used - Locked') : 'Available'
    },
    {
      label: 'Created At',
      key: 'createdAt',
      minWidth: 145,
      hideOnSmall: true,
      isDate: true,
      render: (row) => formatDateTime(row.createdAt)
    },
    {
      label: 'Updated At',
      key: 'updatedAt',
      minWidth: 145,
      hideOnSmall: true,
      isDate: true,
      render: (row) => formatDateTime(row.updatedAt)
    }
  ],
  isRecordLocked: (record) => Boolean(record?.locked),
  recordLockMessage: (record) => record?.lockMessage || 'This Currency row is already used and cannot be edited or deleted.',
  toFormValues: (record, defaults) => {
    const currencyCode = normalizeText(record?.currencyCode);
    return {
      ...defaults,
      ...record,
      currencyCode,
      currencyName: trimText(record?.currencyName),
      rateToVnd: currencyCode === 'VND' ? '1' : (getCurrentRateToVnd(record) ?? '')
    };
  },
  transformFieldChange: ({ field, value, nextValues }) => {
    const next = { ...nextValues };
    if (field.name === 'currencyCode') {
      next.currencyCode = normalizeText(value);
      if (next.currencyCode === 'VND') next.rateToVnd = '1';
    }
    return next;
  },
  isFieldDisabled: ({ field, values, mode, record }) => {
    const code = normalizeText(values?.currencyCode);
    if (mode === 'edit' && record?.locked) return true;
    if (field.name === 'currencyCode' && mode === 'edit') return true;
    if (field.name === 'rateToVnd' && code === 'VND') return true;
    return false;
  },
  getFieldHelperText: ({ field, values, record, mode }) => {
    if (mode === 'edit' && record?.locked) return record.lockMessage || 'This Currency row is used and locked.';
    const code = normalizeText(values?.currencyCode);
    if (field.name === 'rateToVnd' && code === 'VND') return 'VND Is The Base Currency, So 1 VND = 1 VND.';
    return field.helperText || '';
  },
  validate: (values) => {
    const errors = {};
    const code = normalizeText(values.currencyCode);
    const rate = Number(values.rateToVnd);
    if (!/^[A-Z]{3}$/.test(code)) errors.currencyCode = 'Currency Code Must Contain Exactly Three Letters.';
    if (!Number.isFinite(rate) || rate <= 0) errors.rateToVnd = 'Rate To VND Must Be Greater Than Zero.';
    if (code === 'VND' && Number.isFinite(rate) && rate !== 1) errors.rateToVnd = 'VND Rate To VND Must Be Exactly 1.';
    return errors;
  },
  toPayload: (values) => ({
    currencyCode: normalizeText(values.currencyCode),
    currencyName: trimText(values.currencyName),
    rateToVnd: normalizeText(values.currencyCode) === 'VND' ? 1 : toNullableNumber(values.rateToVnd)
  })
};
