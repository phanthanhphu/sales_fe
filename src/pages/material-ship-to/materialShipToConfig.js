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
  importHint: 'Download the template first. Dedicated Ship To contains only active records for the current Buyer. Repeating the same material on multiple rows is allowed: Ship To values are merged into one Dedicated Ship To list. You can also separate several Ship To names with ; (example: US; JAPAN). If the material already exists, newly imported Ship To values are appended without duplicating existing values.',

  defaultValues: {
    sapCode: '',
    materialType: '',
    matFullDescription: '',
    matColor: '',
    matUnit: '',
    shipToIds: [],
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

  formHint: 'This Buyer-specific list is checked when MPR is previewed/generated. A mapped material uses only the intersection between selected Ship To and Dedicated Ship To, with the matching PO Qty values added together.',

  formFields: [
    { name: 'sapCode', label: 'SAP Code', grid: 6, maxLength: 120, placeholder: 'Preferred material identity when available' },
    { name: 'materialType', label: 'Material Type', grid: 6, maxLength: 160, placeholder: 'Required when SAP Code is blank' },
    { name: 'matFullDescription', label: 'MAT Full Description', grid: 12, maxLength: 1000, placeholder: 'Required when SAP Code is blank' },
    { name: 'matColor', label: 'MAT Color', grid: 6, maxLength: 200 },
    { name: 'matUnit', label: 'MAT Unit', grid: 6, required: true, maxLength: 80 },
    {
      name: 'shipToIds', label: 'Dedicated Ship To', type: 'autocomplete', optionSource: 'shipTo', multiple: true,
      optionValue: 'id', optionLabel: (item) => [item?.shipToCode, item?.shipToName].filter(Boolean).join(' · '),
      required: true, grid: 8, placeholder: 'Select one or more Ship To'
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
      label: 'Dedicated Ship To', key: 'shipToNames', minWidth: 260,
      render: (row) => {
        const ids = Array.isArray(row?.shipToIds) && row.shipToIds.length ? row.shipToIds : [row?.shipToId].filter(Boolean);
        const codes = Array.isArray(row?.shipToCodes) ? row.shipToCodes : [];
        const names = Array.isArray(row?.shipToNames) && row.shipToNames.length ? row.shipToNames : [row?.shipToName].filter(Boolean);
        return ids.map((_, index) => [codes[index], names[index]].filter(Boolean).join(' · '))
          .filter(Boolean)
          .join(' + ') || '-';
      }
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
    if (!Array.isArray(values.shipToIds) || values.shipToIds.filter(Boolean).length === 0) {
      errors.shipToIds = 'Select at least one Dedicated Ship To.';
    }
    return errors;
  },

  toFormValues: (record, defaults) => ({
    ...defaults,
    ...record,
    shipToIds: Array.isArray(record?.shipToIds) && record.shipToIds.length
      ? record.shipToIds
      : [record?.shipToId].filter(Boolean),
    active: record?.active === false ? 'false' : 'true'
  }),

  toPayload: (values) => ({
    sapCode: trimText(values.sapCode),
    materialType: trimText(values.materialType),
    matFullDescription: trimText(values.matFullDescription),
    matColor: trimText(values.matColor),
    matUnit: trimText(values.matUnit),
    shipToIds: Array.from(new Set((values.shipToIds || []).map(trimText).filter(Boolean))),
    active: String(values.active) !== 'false',
    remark: trimText(values.remark)
  })
};
