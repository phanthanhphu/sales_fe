import { formatDateTime, trimText } from '../shared/masterDataUtils';

export const materialShipToConfig = {
  type: 'materialShipTo',
  menuTitle: 'Material Ship To',
  pageTitle: 'Material Ship To Mapping',
  singular: 'Material Ship To mapping',
  primaryField: 'matFullDescription',
  minTableWidth: 1420,
  allowUpload: true,
  allowTemplate: true,
  allowEditWorkbook: true,
  excelSheetName: 'MATERIAL SHIP TO',
  importHint: 'Download the template first. Ship To, Active and Action must be selected from the Excel drop-down lists. Ship To options contain only active records for the current Buyer; add new values in Ship To Master first. One material identity may have only one dedicated Ship To per Buyer.',

  defaultValues: {
    sapCode: '',
    materialType: '',
    matFullDescription: '',
    matColor: '',
    matUnit: '',
    shipToId: '',
    active: 'true',
    remark: ''
  },

  searchFields: [
    { name: 'sapCode', label: 'SAP Code', placeholder: 'SAP code', sx: { flex: '0.8 1 150px' } },
    { name: 'materialType', label: 'Material Type', placeholder: 'Material type', sx: { flex: '0.9 1 170px' } },
    { name: 'matFullDescription', label: 'MAT Description', placeholder: 'Material description', sx: { flex: '1.3 1 240px' } },
    { name: 'shipTo', label: 'Ship To', placeholder: 'Code or name', sx: { flex: '0.9 1 180px' } },
    {
      name: 'active', label: 'Status', type: 'select', sx: { flex: '0 1 145px' },
      options: [
        { value: '', label: 'All Status' },
        { value: 'true', label: 'Active' },
        { value: 'false', label: 'Inactive' }
      ]
    }
  ],

  formHint: 'This Buyer-specific rule is checked when MPR is previewed/generated. If a material is mapped, its MPR line uses only the mapped Ship To and only that Ship To quantity.',

  formFields: [
    { name: 'sapCode', label: 'SAP Code', grid: 6, maxLength: 120, placeholder: 'Preferred material identity when available' },
    { name: 'materialType', label: 'Material Type', grid: 6, maxLength: 160, placeholder: 'Required when SAP Code is blank' },
    { name: 'matFullDescription', label: 'MAT Full Description', grid: 12, maxLength: 1000, placeholder: 'Required when SAP Code is blank' },
    { name: 'matColor', label: 'MAT Color', grid: 6, maxLength: 200 },
    { name: 'matUnit', label: 'MAT Unit', grid: 6, required: true, maxLength: 80 },
    {
      name: 'shipToId', label: 'Dedicated Ship To', type: 'autocomplete', optionSource: 'shipTo',
      optionValue: 'id', optionLabel: (item) => [item?.shipToCode, item?.shipToName].filter(Boolean).join(' · '),
      required: true, grid: 8, placeholder: 'Select one Ship To'
    },
    {
      name: 'active', label: 'Status', type: 'select', required: true, grid: 4,
      options: [
        { value: 'true', label: 'Active' },
        { value: 'false', label: 'Inactive' }
      ]
    },
    { name: 'remark', label: 'Remark', maxLength: 1000, grid: 12, multiline: true, minRows: 2, placeholder: 'Optional business note' }
  ],

  columns: [
    { label: 'Key', key: 'masterKey', minWidth: 110 },
    { label: 'SAP Code', key: 'sapCode', minWidth: 130 },
    { label: 'Material Type', key: 'materialType', minWidth: 150 },
    { label: 'MAT Full Description', key: 'matFullDescription', minWidth: 270 },
    { label: 'MAT Color', key: 'matColor', minWidth: 130 },
    { label: 'Unit', key: 'matUnit', minWidth: 90 },
    {
      label: 'Dedicated Ship To', key: 'shipToName', minWidth: 220,
      render: (row) => [row.shipToCode, row.shipToName].filter(Boolean).join(' · ') || '-'
    },
    { label: 'Status', key: 'active', minWidth: 95, render: (row) => row.active === false ? 'Inactive' : 'Active' },
    { label: 'Remark', key: 'remark', minWidth: 220, hideOnSmall: true },
    { label: 'Updated At', key: 'updatedAt', minWidth: 155, hideOnSmall: true, isDate: true, render: (row) => formatDateTime(row.updatedAt) }
  ],

  validate: (values) => {
    const errors = {};
    const sapCode = trimText(values.sapCode);
    if (!sapCode && !trimText(values.materialType)) errors.materialType = 'Material Type is required when SAP Code is blank.';
    if (!sapCode && !trimText(values.matFullDescription)) errors.matFullDescription = 'MAT Full Description is required when SAP Code is blank.';
    return errors;
  },

  toFormValues: (record, defaults) => ({
    ...defaults,
    ...record,
    shipToId: record?.shipToId || '',
    active: record?.active === false ? 'false' : 'true'
  }),

  toPayload: (values) => ({
    sapCode: trimText(values.sapCode),
    materialType: trimText(values.materialType),
    matFullDescription: trimText(values.matFullDescription),
    matColor: trimText(values.matColor),
    matUnit: trimText(values.matUnit),
    shipToId: trimText(values.shipToId),
    active: String(values.active) !== 'false',
    remark: trimText(values.remark)
  })
};
