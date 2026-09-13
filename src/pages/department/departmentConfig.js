const normalizeText = (value) => String(value || '')
  .trim()
  .toUpperCase()
  .replace(/[_-]+/g, ' ')
  .replace(/\s+/g, ' ');

const isAdminRole = (role) => Array.isArray(role)
  ? role.some(isAdminRole)
  : ['ADMIN', 'ROLE ADMIN', 'ROLE_ADMIN'].includes(normalizeText(role));

export const departmentConfig = {
  type: 'department',
  menuTitle: 'Departments',
  pageTitle: 'Department Management',
  singular: 'Department',
  manageMessage: 'Only Admin users can add, edit, or delete departments.',
  defaultRowsPerPage: 25,
  defaultFilters: { division: '', departmentName: '' },
  defaultSort: { key: 'createdAt', direction: 'desc' },
  defaultValues: { division: '', departmentName: '' },
  searchFields: [
    { name: 'division', label: 'Division', placeholder: 'Division' },
    { name: 'departmentName', label: 'Department Name', placeholder: 'Department Name' }
  ],
  formFields: [
    { name: 'division', label: 'Division', required: true },
    { name: 'departmentName', label: 'Department Name', required: true }
  ],
  columns: [
    { label: 'Division', key: 'division', minWidth: 190 },
    { label: 'Department Name', key: 'departmentName', minWidth: 250 },
    { label: 'Created At', key: 'createdAt', minWidth: 190 }
  ]
};

export const canUseDepartmentAdmin = (user = {}) => isAdminRole(user.role || user.roles);

export const getDepartmentList = (data) => Array.isArray(data?.departments)
  ? data.departments
  : Array.isArray(data)
    ? data
    : Array.isArray(data?.content)
      ? data.content
      : [];

export const mapDepartmentRecord = (item = {}) => ({
  id: item.id,
  division: item.division || '',
  departmentName: item.departmentName || item.name || '',
  createdAt: item.createdAt || item.createdDate || '',
  updatedAt: item.updatedAt || item.updatedDate || ''
});

export const validateDepartmentForm = ({ division = '', departmentName = '' } = {}) => {
  const next = {};
  if (!division.trim()) next.division = 'Division is required.';
  if (!departmentName.trim()) next.departmentName = 'Department name is required.';
  return next;
};

export const toDepartmentParams = ({ division = '', departmentName = '' } = {}) => new URLSearchParams({
  division: division.trim(),
  departmentName: departmentName.trim()
});
