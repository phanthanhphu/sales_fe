import {
  AssignmentOutlined,
  BusinessOutlined,
  CategoryOutlined,
  CurrencyExchangeOutlined,
  GroupOutlined,
  Inventory2Outlined,
  LocalShippingOutlined,
  PercentOutlined,
  StoreOutlined
} from '@mui/icons-material';
import { isAdmin } from 'utils/accessControl';

/*
 * Visibility is intentionally broad for operational pages:
 * BOM, SALES and VIEW_SYSTEM users can all open these pages.
 * Create/edit/delete/upload controls are restricted inside each page.
 */
const getDashboardMenu = () => ({
  id: 'group-management',
  title: 'Management',
  type: 'group',
  children: [
    ...(isAdmin()
      ? [
          { id: 'users', title: 'Users', type: 'item', url: '/users', icon: GroupOutlined, breadcrumbs: false },
          { id: 'departments', title: 'Departments', type: 'item', url: '/departments', icon: BusinessOutlined, breadcrumbs: false }
        ]
      : []),
    {
      id: 'sales-bom',
      title: 'Sales & BOM',
      type: 'collapse',
      icon: StoreOutlined,
      children: [
        { id: 'orders', title: 'Orders', type: 'item', url: '/orders', icon: AssignmentOutlined, breadcrumbs: false },
        { id: 'vendor-codes', title: 'Vendor Code', type: 'item', url: '/vendor-codes', icon: StoreOutlined, breadcrumbs: false },
        { id: 'mat-info', title: 'MAT Info', type: 'item', url: '/mat-info', icon: Inventory2Outlined, breadcrumbs: false },
        { id: 'currencies', title: 'Currency', type: 'item', url: '/currencies', icon: CurrencyExchangeOutlined, breadcrumbs: false },
        { id: 'loss', title: 'Loss', type: 'item', url: '/loss', icon: PercentOutlined, breadcrumbs: false },
        { id: 'ship-tos', title: 'Ship To', type: 'item', url: '/ship-tos', icon: LocalShippingOutlined, breadcrumbs: false },
        { id: 'product-colors', title: 'Product Color', type: 'item', url: '/product-colors', icon: CategoryOutlined, breadcrumbs: false }
      ]
    }
  ]
});

const dashboard = getDashboardMenu();
export default dashboard;
export { getDashboardMenu };
