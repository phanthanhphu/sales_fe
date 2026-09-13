import { normalizeBuyerKey } from '../../utils/buyerContext';

export const buyerConfig = {
  type: 'buyer',
  menuTitle: 'Buyers',
  pageTitle: 'Buyer Management',
  singular: 'Buyer',
  defaultRowsPerPage: 25,
  defaultSort: { key: 'createdAt', direction: 'desc' },
  defaultFilters: { keyword: '', active: '' },
  defaultValues: {
    buyerKey: '',
    buyerName: '',
    active: true,
    description: ''
  },
  statusOptions: [
    { value: '', label: 'All' },
    { value: 'true', label: 'Active' },
    { value: 'false', label: 'Inactive' }
  ],
  searchFields: [
    { name: 'keyword', label: 'Search Buyer' },
    { name: 'active', label: 'Status', type: 'select' }
  ],
  formFields: [
    { name: 'buyerKey', label: 'Buyer Key', required: true, immutableOnEdit: true },
    { name: 'buyerName', label: 'Buyer Name', required: true },
    { name: 'active', label: 'Status', type: 'select' },
    { name: 'description', label: 'Description', multiline: true }
  ],
  columns: [
    { label: 'No.', sortable: false },
    { label: 'Buyer Key', key: 'buyerKey' },
    { label: 'Buyer Name', key: 'buyerName' },
    { label: 'Status', key: 'active' },
    { label: 'Description', key: 'description' },
    { label: 'Actions', sortable: false }
  ]
};

export const toBuyerFormValues = (record) => record ? {
  buyerKey: record.buyerKey || '',
  buyerName: record.buyerName || '',
  active: record.active ?? true,
  description: record.description || ''
} : buyerConfig.defaultValues;

export const validateBuyerForm = (form = {}) => {
  const next = {};
  if (!form.buyerKey.trim()) next.buyerKey = 'Buyer Key is required.';
  if (!form.buyerName.trim()) next.buyerName = 'Buyer Name is required.';
  return next;
};

export const toBuyerPayload = (form = {}) => ({
  buyerKey: normalizeBuyerKey(form.buyerKey),
  buyerName: form.buyerName.trim(),
  active: Boolean(form.active),
  description: form.description.trim()
});
