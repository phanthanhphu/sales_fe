import { formatDateTime, trimText } from '../shared/masterDataUtils';

const vendorCodeText = (value) => {
  const text = trimText(value);
  return /^[0-9,]+$/.test(text) ? text.replace(/,/g, '') : text;
};

export const vendorCodeConfig = {
  type: 'vendor',
  menuTitle: 'Vendor Code',
  pageTitle: 'Vendor Code Master',
  singular: 'Vendor Code',
  primaryField: 'shortNameSupplier',
  minTableWidth: 1220,
  allowEditWorkbook: true,
  excelSheetName: 'VENDER CODE',
  importHint: 'Upload New skips any row whose Short Name Supplier already exists and never updates existing records. Exact duplicate rows in the Excel file are also skipped. The legacy VENDER CODE Excel sheet name is still accepted.',

  defaultValues: {
    shortNameSupplier: '',
    vendorCode: '',
    vendorName: '',
    matCharger: '',
    remark: ''
  },

  // Direct column filters only — no broad keyword scan.
  searchFields: [
    {
      name: 'masterKey',
      label: 'Key',
      placeholder: 'VC000001',
      sx: { flex: '0.55 1 135px' }
    },
    {
      name: 'shortNameSupplier',
      label: 'Short Name Supplier',
      placeholder: 'Short Name Supplier',
      sx: { flex: '0.85 1 205px' }
    },
    {
      name: 'vendorCode',
      label: 'Vendor Code',
      placeholder: 'ERP / SAP Code',
      sx: { flex: '0.7 1 170px' }
    },
    {
      name: 'vendorName',
      label: 'Vendor Name',
      placeholder: 'Vendor Name',
      sx: { flex: '1 1 230px' }
    },
    {
      name: 'matCharger',
      label: 'Mat Charger',
      placeholder: 'Person In Charge',
      sx: { flex: '0.7 1 170px' }
    }
  ],

  formHint:
    'Key is auto-generated from VC000001. MAT Info may create a supplier automatically; those rows are marked Pending until Vendor Code, Vendor Name and Mat Charger are completed.',

  formFields: [
    {
      name: 'shortNameSupplier',
      label: 'Short Name Supplier',
      required: true,
      maxLength: 100,
      grid: 6,
      placeholder: 'Example: ABC'
    },
    {
      name: 'vendorCode',
      label: 'Vendor Code',
      maxLength: 100,
      grid: 6,
      placeholder: 'ERP / SAP Vendor Code Or NOT REQUIRED'
    },
    {
      name: 'vendorName',
      label: 'Vendor Name',
      maxLength: 200,
      grid: 12,
      placeholder: 'Full Supplier Name'
    },
    {
      name: 'matCharger',
      label: 'Mat Charger',
      maxLength: 100,
      grid: 6,
      placeholder: 'Example: BAO'
    },
    {
      name: 'remark',
      label: 'Remark',
      maxLength: 1000,
      grid: 12,
      multiline: true,
      minRows: 3,
      placeholder: 'Optional Note'
    }
  ],

  columns: [
    { label: 'Key', key: 'masterKey', minWidth: 115 },
    { label: 'Short Name Supplier', key: 'shortNameSupplier', minWidth: 180 },
    { label: 'Vendor Code', key: 'vendorCode', minWidth: 130, render: (row) => vendorCodeText(row.vendorCode) || '-' },
    { label: 'Vendor Name', key: 'vendorName', minWidth: 230 },
    { label: 'Mat Charger', key: 'matCharger', minWidth: 130 },
    {
      label: 'Profile Status',
      key: 'pendingCompletion',
      minWidth: 135,
      render: (row) => (row.pendingCompletion ? 'Pending completion' : 'Complete')
    },
    { label: 'Remark', key: 'remark', minWidth: 220, hideOnSmall: true },
    {
      label: 'Updated At',
      key: 'updatedAt',
      minWidth: 145,
      hideOnSmall: true,
      isDate: true,
      render: (row) => formatDateTime(row.updatedAt)
    }
  ],

  toPayload: (values) => ({
    shortNameSupplier: trimText(values.shortNameSupplier),
    vendorCode: vendorCodeText(values.vendorCode),
    vendorName: trimText(values.vendorName),
    matCharger: trimText(values.matCharger),
    remark: trimText(values.remark)
  })
};
