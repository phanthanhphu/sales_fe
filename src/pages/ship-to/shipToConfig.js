import { formatDateTime, trimText } from '../shared/masterDataUtils';

export const shipToConfig = {
  type: 'shipTo',
  menuTitle: 'Ship To',
  pageTitle: 'Ship To Master',
  singular: 'Ship To',
  primaryField: 'shipToName',
  minTableWidth: 980,
  allowUpload: false,

  defaultValues: {
    shipToName: '',
    shipToCode: '',
    active: 'true',
    remark: ''
  },

  searchFields: [
    { name: 'shipToName', label: 'Ship To Name', placeholder: 'Customer / destination name', sx: { flex: '1 1 240px' } },
    { name: 'shipToCode', label: 'Ship To Code', placeholder: 'Optional code', sx: { flex: '0.75 1 180px' } },
    {
      name: 'active', label: 'Status', type: 'select', sx: { flex: '0 1 150px' },
      options: [
        { value: '', label: 'All Status' },
        { value: 'true', label: 'Active' },
        { value: 'false', label: 'Inactive' }
      ]
    }
  ],

  formHint: 'Ship To records are selected per Product Color when creating or updating an MPR batch. Multiple Ship To values are exported with a + separator.',

  formFields: [
    { name: 'shipToName', label: 'Ship To Name', required: true, maxLength: 200, grid: 12, placeholder: 'Example: LULULEMON USA DC' },
    { name: 'shipToCode', label: 'Ship To Code', maxLength: 100, grid: 6, placeholder: 'Optional destination code' },
    {
      name: 'active', label: 'Status', type: 'select', required: true, grid: 6,
      options: [
        { value: 'true', label: 'Active' },
        { value: 'false', label: 'Inactive' }
      ]
    },
    { name: 'remark', label: 'Remark', maxLength: 1000, grid: 12, multiline: true, minRows: 3, placeholder: 'Optional note' }
  ],

  columns: [
    { label: 'Ship To Name', key: 'shipToName', minWidth: 250 },
    { label: 'Ship To Code', key: 'shipToCode', minWidth: 170 },
    {
      label: 'Status', key: 'active', minWidth: 100,
      render: (row) => row.active === false ? 'Inactive' : 'Active'
    },
    { label: 'Remark', key: 'remark', minWidth: 260, hideOnSmall: true },
    { label: 'Updated At', key: 'updatedAt', minWidth: 150, hideOnSmall: true, isDate: true, render: (row) => formatDateTime(row.updatedAt) }
  ],

  toFormValues: (record, defaults) => ({
    ...defaults,
    ...record,
    active: record?.active === false ? 'false' : 'true'
  }),

  toPayload: (values) => ({
    shipToName: trimText(values.shipToName),
    shipToCode: trimText(values.shipToCode),
    active: String(values.active) !== 'false',
    remark: trimText(values.remark)
  })
};
