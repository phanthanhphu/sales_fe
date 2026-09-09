import {
  formatDateTime,
  normalizeText,
  trimText
} from '../shared/masterDataUtils';

/**
 * Parses a Rate To VND value entered in either Vietnamese or international format.
 * Examples:
 * - 25.500   -> 25500
 * - 25,500   -> 25500
 * - 25.500,5 -> 25500.5
 * - 25,500.5 -> 25500.5
 * - 0,85     -> 0.85
 */
export const parseRateToVnd = (value) => {
  if (value === '' || value === null || value === undefined) return null;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;

  const raw = String(value).trim().replace(/\s+/g, '');
  if (!raw || !/^[+-]?\d[\d.,]*$/.test(raw)) return null;

  const sign = raw.startsWith('-') ? '-' : '';
  const unsigned = raw.replace(/^[+-]/, '');
  const dotIndex = unsigned.lastIndexOf('.');
  const commaIndex = unsigned.lastIndexOf(',');

  let normalized = unsigned;

  if (dotIndex >= 0 && commaIndex >= 0) {
    // When both separators exist, the last one is the decimal separator.
    const decimalSeparator = dotIndex > commaIndex ? '.' : ',';
    const groupingSeparator = decimalSeparator === '.' ? ',' : '.';
    const decimalIndex = unsigned.lastIndexOf(decimalSeparator);
    const integerPart = unsigned.slice(0, decimalIndex).split(groupingSeparator).join('');
    const fractionPart = unsigned.slice(decimalIndex + 1);

    if (!/^\d+$/.test(integerPart) || !/^\d+$/.test(fractionPart)) return null;
    normalized = `${integerPart}.${fractionPart}`;
  } else {
    const separator = dotIndex >= 0 ? '.' : (commaIndex >= 0 ? ',' : null);

    if (separator) {
      const parts = unsigned.split(separator);
      if (parts.some((part) => !/^\d+$/.test(part))) return null;

      if (parts.length > 2) {
        // Multiple separators are valid only as thousands grouping: 25.500.000.
        if (!parts.slice(1).every((part) => part.length === 3)) return null;
        normalized = parts.join('');
      } else {
        const [integerPart, fractionPart] = parts;
        const looksLikeThousandsGrouping =
          integerPart !== '0' && integerPart.length >= 1 && integerPart.length <= 3 && fractionPart.length === 3;

        normalized = looksLikeThousandsGrouping
          ? `${integerPart}${fractionPart}`
          : `${integerPart}.${fractionPart}`;
      }
    }
  }

  const number = Number(`${sign}${normalized}`);
  return Number.isFinite(number) ? number : null;
};

const formatRateToVnd = (value) => {
  const number = Number(value);
  if (!Number.isFinite(number)) return String(value ?? '');

  return new Intl.NumberFormat('vi-VN', {
    maximumFractionDigits: 6,
    minimumFractionDigits: 0
  }).format(number);
};

export const getCurrentRateToVnd = (record = {}) => {
  const value = record?.rateToVnd;
  const rate = Number(value);
  return Number.isFinite(rate) && rate > 0 ? rate : null;
};

const rateLabel = (record = {}) => {
  const code = normalizeText(record?.currencyCode) || 'CUR';
  const rate = getCurrentRateToVnd(record);
  return Number.isFinite(rate) ? `1 ${code} = ${formatRateToVnd(rate)} VND` : '-';
};

export const currencyConfig = {
  type: 'currency',
  menuTitle: 'Currency',
  pageTitle: 'Currency Master',
  singular: 'Currency',
  writePermissionMessage: 'Currency Action or Sales permission is required to modify Currency.',
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
      type: 'text',
      inputMode: 'decimal',
      grid: 12,
      placeholder: 'Example: 25.500 Means 1 USD = 25,500 VND',
      helperText: 'You Can Enter 25500, 25.500, Or 25,500.'
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
      rateToVnd: currencyCode === 'VND' ? '1' : (getCurrentRateToVnd(record) == null ? '' : formatRateToVnd(getCurrentRateToVnd(record)))
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
    const rate = parseRateToVnd(values.rateToVnd);
    if (!/^[A-Z]{3}$/.test(code)) errors.currencyCode = 'Currency Code Must Contain Exactly Three Letters.';
    if (!Number.isFinite(rate) || rate <= 0) errors.rateToVnd = 'Rate To VND Must Be Greater Than Zero.';
    if (code === 'VND' && Number.isFinite(rate) && rate !== 1) errors.rateToVnd = 'VND Rate To VND Must Be Exactly 1.';
    return errors;
  },
  toPayload: (values) => ({
    currencyCode: normalizeText(values.currencyCode),
    currencyName: trimText(values.currencyName),
    rateToVnd: normalizeText(values.currencyCode) === 'VND' ? 1 : parseRateToVnd(values.rateToVnd)
  })
};
