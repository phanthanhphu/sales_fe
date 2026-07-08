import {
  formatCurrency,
  formatDateTime,
  formatNumber,
  toDateInput,
  trimText
} from '../shared/masterDataUtils';
import { getCurrentRateToVnd } from '../currency/currencyConfig';

const normalizeCurrency = (value) => trimText(value).toUpperCase();

const currencyOptionLabel = (item) => {
  const code = normalizeCurrency(item?.currencyCode);
  const name = trimText(item?.currencyName);
  const rate = getCurrentRateToVnd(item);

  const rateText = Number.isFinite(rate)
    ? `1 ${code || 'CUR'} = ${formatNumber(rate, 6)} VND`
    : 'Current Rate Unavailable';

  return [code, name, rateText].filter(Boolean).join(' — ');
};

export const matInfoConfig = {
  type: 'matInfo',
  menuTitle: 'Mat Info',
  pageTitle: 'Mat Info Master',
  singular: 'Mat Info Record',
  primaryField: 'matFullDescription',
  minTableWidth: 2270,
  allowEditWorkbook: true,
  excelSheetName: 'MAT_INFO',
  needsCurrencyOptions: true,
  needsSupplierOptions: true,
  // Keep the MAT_INFO dialog compact in both Add and Edit modes.
  hideFormSubtitle: true,

  importHint:
    'System Key is auto-generated when creating/importing, starting from MI000001. Expected columns: Flex ID, Material Type, Mat Full Description, Mat Color, Mat Unit, Cur, Mat Price (W/O Tax), Short Name Supplier, Remark, Updated Date, Updated Pic and Style Desc. The importer stops at the first row where all required fields are blank.',

  defaultValues: {
    flexId: '',
    materialType: '',
    matFullDescription: '',
    matColor: '',
    matUnit: '',
    currency: 'USD',
    matPriceWithoutTax: '',
    shortNameSupplier: '',
    remark: '',
    updatedDate: '',
    updatedPic: '',
    styleDesc: ''
  },

  /*
   * Field-specific filters only. This avoids one broad keyword search over
   * the entire MAT_INFO collection.
   */
  searchFields: [
    {
      name: 'masterKey',
      label: 'Key',
      placeholder: 'MI000001',
      sx: { flex: '0.55 1 135px' }
    },
    {
      name: 'flexId',
      label: 'Flex ID',
      placeholder: 'Flex ID',
      sx: { flex: '0.65 1 155px' }
    },
    {
      name: 'materialType',
      label: 'Material Type',
      placeholder: 'Fabric, Zipper, Label…',
      sx: { flex: '0.75 1 180px' }
    },
    {
      name: 'matFullDescription',
      label: 'Mat Full Description',
      placeholder: 'Material Description',
      sx: { flex: '1.25 1 260px' }
    },
    {
      name: 'matColor',
      label: 'Mat Color',
      placeholder: 'Color Or Color Code',
      sx: { flex: '0.75 1 180px' }
    },
    {
      name: 'shortNameSupplier',
      label: 'Short Name Supplier',
      placeholder: 'Vendor Short Name',
      sx: { flex: '0.75 1 180px' }
    }
  ],


  formFields: [
    {
      name: 'flexId',
      label: 'Flex ID',
      maxLength: 100,
      grid: 3
    },
    {
      name: 'materialType',
      label: 'Material Type',
      required: true,
      maxLength: 100,
      grid: 3,
      placeholder: 'Fabric, Zipper, Label…'
    },
    {
      name: 'matUnit',
      label: 'Mat Unit',
      required: true,
      maxLength: 20,
      grid: 3,
      placeholder: 'PC / YD / M'
    },
    {
      name: 'currency',
      label: 'Cur',
      required: true,
      type: 'select',
      optionSource: 'currency',
      optionValue: 'currencyCode',
      optionLabel: currencyOptionLabel,
      grid: 3
    },
    {
      name: 'matPriceWithoutTax',
      label: 'Mat Price (W/O Tax)',
      type: 'number',
      min: 0,
      step: '0.0001',
      grid: 3,
      placeholder: '0'
    },
    {
      name: 'shortNameSupplier',
      label: 'Short Name Supplier',
      required: true,
      type: 'autocomplete',
      freeSolo: true,
      optionSource: 'supplier',
      optionValue: 'shortNameSupplier',
      optionLabel: (item) => {
        const shortName = trimText(item?.shortNameSupplier);
        const vendorName = trimText(item?.vendorName);
        const vendorCode = trimText(item?.vendorCode);

        return [
          shortName,
          vendorName,
          vendorCode ? `Code: ${vendorCode}` : ''
        ]
          .filter(Boolean)
          .join(' — ');
      },
      maxLength: 100,
      grid: 5,
      placeholder: 'Search Or Enter Vendor Code'
    },
    {
      name: 'updatedDate',
      label: 'Updated Date',
      type: 'date',
      grid: 2
    },
    {
      name: 'updatedPic',
      label: 'Updated Pic',
      required: true,
      maxLength: 100,
      grid: 2,
      placeholder: 'Person In Charge'
    },
    {
      name: 'matFullDescription',
      label: 'Mat Full Description',
      required: true,
      maxLength: 1500,
      grid: 12,
      multiline: true,
      minRows: 2
    },
    {
      name: 'matColor',
      label: 'Mat Color',
      required: true,
      maxLength: 500,
      grid: 6
    },
    {
      name: 'styleDesc',
      label: 'Style Desc',
      maxLength: 500,
      grid: 6
    },
    {
      name: 'remark',
      label: 'Remark',
      maxLength: 2000,
      grid: 12,
      multiline: true,
      minRows: 3
    }
  ],

  columns: [
    { label: 'Key', key: 'masterKey', minWidth: 115 },
    { label: 'Flex ID', key: 'flexId', minWidth: 120 },
    { label: 'Material Type', key: 'materialType', minWidth: 140 },
    {
      label: 'Mat Full Description',
      key: 'matFullDescription',
      minWidth: 300,
      maxWidth: 390
    },
    { label: 'Mat Color', key: 'matColor', minWidth: 165 },
    { label: 'Mat Unit', key: 'matUnit', minWidth: 90, align: 'center' },
    { label: 'Cur', key: 'currency', minWidth: 75, align: 'center' },
    {
      label: 'Mat Price (W/O Tax)',
      key: 'matPriceWithoutTax',
      minWidth: 160,
      align: 'right',
      sortValue: (row) => Number(row.matPriceWithoutTax || 0),
      render: (row) => formatCurrency(row.matPriceWithoutTax, row.currency)
    },
    {
      label: 'Short Name Supplier',
      key: 'shortNameSupplier',
      minWidth: 185
    },
    {
      label: 'Remark',
      key: 'remark',
      minWidth: 220,
      maxWidth: 300
    },
    {
      label: 'Updated Date',
      key: 'updatedDate',
      minWidth: 125,
      hideOnSmall: true
    },
    {
      label: 'Updated Pic',
      key: 'updatedPic',
      minWidth: 130,
      hideOnSmall: true
    },
    {
      label: 'Style Desc',
      key: 'styleDesc',
      minWidth: 180,
      maxWidth: 260
    },
    {
      label: 'Updated At',
      key: 'updatedAt',
      minWidth: 150,
      hideOnSmall: true,
      isDate: true,
      render: (row) => formatDateTime(row.updatedAt)
    }
  ],

  toFormValues: (record, defaults) => ({
    ...defaults,
    ...record,
    currency: normalizeCurrency(record?.currency) || 'USD',
    updatedDate: toDateInput(record?.updatedDate)
  }),

  validate: (values) => {
    const errors = {};
    const unit = trimText(values.matUnit).toUpperCase();
    const currency = normalizeCurrency(values.currency);
    const price = values.matPriceWithoutTax;

    if (unit && !/^[A-Z0-9._/\-]{1,20}$/.test(unit)) {
      errors.matUnit = 'Mat Unit Contains Invalid Characters.';
    }

    if (currency && !/^[A-Z]{3}$/.test(currency)) {
      errors.currency =
        'Cur Must Be A Three-Letter Code From Currency Master.';
    }

    if (
      price !== '' &&
      price !== null &&
      price !== undefined &&
      (!Number.isFinite(Number(price)) || Number(price) < 0)
    ) {
      errors.matPriceWithoutTax =
        'Mat Price (W/O Tax) Must Be Zero Or Greater.';
    }

    return errors;
  },

  toPayload: (values) => ({
    flexId: trimText(values.flexId),
    materialType: trimText(values.materialType),
    matFullDescription: trimText(values.matFullDescription),
    matColor: trimText(values.matColor),
    matUnit: trimText(values.matUnit).toUpperCase(),
    currency: normalizeCurrency(values.currency),
    matPriceWithoutTax:
      values.matPriceWithoutTax === '' ||
      values.matPriceWithoutTax === null ||
      values.matPriceWithoutTax === undefined
        ? null
        : Number(values.matPriceWithoutTax),
    shortNameSupplier: trimText(values.shortNameSupplier),
    remark: trimText(values.remark),
    updatedDate: values.updatedDate || null,
    updatedPic: trimText(values.updatedPic),
    styleDesc: trimText(values.styleDesc)
  })
};
