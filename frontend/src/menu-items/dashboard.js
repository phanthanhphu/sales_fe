import {
  AssignmentOutlined,
  BusinessOutlined,
  CategoryOutlined,
  CurrencyExchangeOutlined,
  GroupOutlined,
  Inventory2Outlined,
  LocalShippingOutlined,
  PercentOutlined,
  StoreOutlined,
  ManageAccountsOutlined,
  HistoryOutlined,
  SettingsOutlined,
  DashboardOutlined
} from '@mui/icons-material';
import { isAdmin } from 'utils/accessControl';
import { buyerPath, getAccessibleBuyers } from 'utils/buyerContext';

const buyerMenu = (buyer) => ({
  id: `buyer-${buyer.buyerKey}`,
  title: buyer.buyerName,
  type: 'collapse',
  icon: StoreOutlined,
  children: [
    {
      id: `${buyer.buyerKey}-orders`,
      title: 'Orders',
      type: 'item',
      url: buyerPath(buyer.buyerKey, 'orders'),
      icon: AssignmentOutlined,
      breadcrumbs: false
    },
    {
      id: `${buyer.buyerKey}-mat-info`,
      title: 'MAT Info',
      type: 'item',
      url: buyerPath(buyer.buyerKey, 'mat-info'),
      icon: Inventory2Outlined,
      breadcrumbs: false
    },
    {
      id: `${buyer.buyerKey}-loss`,
      title: 'Loss',
      type: 'item',
      url: buyerPath(buyer.buyerKey, 'loss'),
      icon: PercentOutlined,
      breadcrumbs: false
    },
    {
      id: `${buyer.buyerKey}-product-colors`,
      title: 'Product Color',
      type: 'item',
      url: buyerPath(buyer.buyerKey, 'product-colors'),
      icon: CategoryOutlined,
      breadcrumbs: false
    },
    {
      id: `${buyer.buyerKey}-material-ship-to`,
      title: 'Material Ship To',
      type: 'item',
      url: buyerPath(buyer.buyerKey, 'material-ship-to'),
      icon: LocalShippingOutlined,
      breadcrumbs: false
    }
  ]
});

const getDashboardMenu = (buyers = getAccessibleBuyers()) => ({
  items: [
    {
      id: 'group-overview',
      title: 'Overview',
      type: 'group',
      children: [
        { id: 'dashboard', title: 'Dashboard', type: 'item', url: '/dashboard', icon: DashboardOutlined, breadcrumbs: false, exact: true }
      ]
    },
    {
      id: 'group-management',
      title: 'Management',
      type: 'group',
      children: [
        ...(isAdmin()
          ? [
              { id: 'users', title: 'Users', type: 'item', url: '/users', icon: GroupOutlined, breadcrumbs: false, exact: true },
              { id: 'departments', title: 'Departments', type: 'item', url: '/departments', icon: BusinessOutlined, breadcrumbs: false, exact: true },
              { id: 'buyers', title: 'Buyers', type: 'item', url: '/buyers', icon: ManageAccountsOutlined, breadcrumbs: false, exact: true },
              { id: 'audit-logs', title: 'Audit Logs', type: 'item', url: '/audit-logs', icon: HistoryOutlined, breadcrumbs: false, exact: true },
              { id: 'settings', title: 'Settings', type: 'item', url: '/settings/general', icon: SettingsOutlined, breadcrumbs: false, exact: true }
            ]
          : [])
      ]
    },
    {
      id: 'group-master-data',
      title: 'Master Data',
      type: 'group',
      children: [
        { id: 'currencies', title: 'Currency', type: 'item', url: '/currencies', icon: CurrencyExchangeOutlined, breadcrumbs: false, exact: true },
        { id: 'vendor-codes', title: 'Vendor Code', type: 'item', url: '/vendor-codes', icon: StoreOutlined, breadcrumbs: false, exact: true },
        { id: 'ship-tos', title: 'Ship To', type: 'item', url: '/ship-tos', icon: LocalShippingOutlined, breadcrumbs: false, exact: true }
      ]
    },
    {
      id: 'group-buyers',
      title: 'Buyers',
      type: 'group',
      children: (Array.isArray(buyers) ? buyers : getAccessibleBuyers()).map(buyerMenu)
    }
  ]
});

const dashboard = getDashboardMenu();
export default dashboard;
export { getDashboardMenu };
