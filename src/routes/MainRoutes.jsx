import { lazy, useEffect } from 'react';
import { Navigate, Outlet, useLocation, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';

import Loadable from 'components/Loadable';
import DashboardLayout from 'layout/Dashboard';
import LoginPage from './LoginPage';
import {
  buyerPath,
  defaultAuthorizedPath,
  getDefaultBuyerKey,
  hasBuyerAccess,
  normalizeBuyerKey
} from 'utils/buyerContext';

const UserManagementPage = Loadable(lazy(() => import('pages/users/UserManagementPage')));
const DepartmentPage = Loadable(lazy(() => import('pages/department/DepartmentManagement')));
const BuyerManagementPage = Loadable(lazy(() => import('pages/buyers/BuyerManagementPage')));
const BuyerAccessUnavailablePage = Loadable(lazy(() => import('pages/buyers/BuyerAccessUnavailablePage')));
const CurrencyPage = Loadable(lazy(() => import('pages/currency/CurrencyPage')));
const VendorCodePage = Loadable(lazy(() => import('pages/vendor-code/VendorCodePage')));
const MatInfoPage = Loadable(lazy(() => import('pages/mat-info/MatInfoPage')));
const LossPage = Loadable(lazy(() => import('pages/loss/LossPage')));
const ShipToPage = Loadable(lazy(() => import('pages/ship-to/ShipToPage')));
const ProductColorPage = Loadable(lazy(() => import('pages/product-color/ProductColorPage')));
const OrdersPage = Loadable(lazy(() => import('pages/orders/OrdersPage')));
const OrderDetailPage = Loadable(lazy(() => import('pages/order-detail/OrderDetailPage')));
const BomDetailPage = Loadable(lazy(() => import('pages/bom/BomDetailPage')));
const AuditLogPage = Loadable(lazy(() => import('pages/audit/AuditLogPage')));

const LOGIN_PATH = '/login';

const decodeJwtPayload = (token) => {
  try {
    if (!token) return null;
    const base64Url = token.split('.')[1];
    if (!base64Url) return null;
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(window.atob(base64).split('').map((char) => `%${`00${char.charCodeAt(0).toString(16)}`.slice(-2)}`).join(''));
    return JSON.parse(jsonPayload);
  } catch { return null; }
};
const isTokenExpired = (token) => Boolean(decodeJwtPayload(token)?.exp && decodeJwtPayload(token).exp * 1000 <= Date.now());
const clearAuthSession = () => ['token','accessToken','user','userId','isAuthenticated','role','accessPermissions','buyerKeys','accessibleBuyers','approvePermission','canApproveNotice','canApproveDocument','bookingPermission','canManageBooking','departmentId','departmentName','division','loginAt'].forEach((key) => localStorage.removeItem(key));
const getStoredRole = () => { try { const user = JSON.parse(localStorage.getItem('user') || '{}'); return String(user?.role || localStorage.getItem('role') || '').trim().toUpperCase(); } catch { return String(localStorage.getItem('role') || '').trim().toUpperCase(); } };
const isAdminRole = (role) => role === 'ADMIN' || role === 'ROLE_ADMIN';

function ProtectedRoute() {
  const location = useLocation();
  const token = localStorage.getItem('token');
  const expired = token ? isTokenExpired(token) : false;
  useEffect(() => { if (expired) { clearAuthSession(); toast.error('Session expired. Please login again.'); } }, [expired]);
  if (!token || expired) return <Navigate to={LOGIN_PATH} replace state={{ from: location }} />;
  return <Outlet />;
}

function AdminRoute({ children }) {
  const allowed = isAdminRole(getStoredRole());
  useEffect(() => { if (!allowed) toast.error('Access denied. Admin only.'); }, [allowed]);
  return allowed ? children : <Navigate to={defaultAuthorizedPath()} replace />;
}

function BuyerRoute({ children }) {
  const { buyerKey } = useParams();
  const normalized = normalizeBuyerKey(buyerKey);
  const allowed = hasBuyerAccess(normalized);
  useEffect(() => {
    if (!allowed) toast.error(`You do not have access to Buyer ${normalized}.`);
  }, [allowed, normalized]);
  return allowed ? children : <Navigate to={defaultAuthorizedPath()} replace />;
}

function DefaultAuthorizedRoute() {
  return <Navigate to={defaultAuthorizedPath()} replace />;
}

function LegacyBuyerRedirect({ child }) {
  return <Navigate to={buyerPath(getDefaultBuyerKey(), child)} replace />;
}

const MainRoutes = {
  path: '/',
  children: [
    { path: 'login', element: <LoginPage /> },
    {
      element: <ProtectedRoute />,
      children: [
        {
          element: <DashboardLayout />,
          children: [
            { index: true, element: <DefaultAuthorizedRoute /> },
            { path: 'users', element: <AdminRoute><UserManagementPage /></AdminRoute> },
            { path: 'user-management', element: <Navigate to="/users" replace /> },
            { path: 'departments', element: <AdminRoute><DepartmentPage /></AdminRoute> },
            { path: 'department-management', element: <Navigate to="/departments" replace /> },
            { path: 'buyers', element: <AdminRoute><BuyerManagementPage /></AdminRoute> },
            { path: 'audit-logs', element: <AdminRoute><AuditLogPage /></AdminRoute> },
            { path: 'buyer-access-unavailable', element: <BuyerAccessUnavailablePage /> },

            { path: 'currencies', element: <CurrencyPage /> },
            { path: 'vendor-codes', element: <VendorCodePage /> },
            { path: 'vender-codes', element: <Navigate to="/vendor-codes" replace /> },
            { path: 'loss', element: <LossPage /> },
            { path: 'ship-tos', element: <ShipToPage /> },

            { path: 'buyers/:buyerKey/orders', element: <BuyerRoute><OrdersPage /></BuyerRoute> },
            { path: 'buyers/:buyerKey/orders/:orderId', element: <BuyerRoute><OrderDetailPage /></BuyerRoute> },
            { path: 'buyers/:buyerKey/orders/:orderId/boms/:bomId', element: <BuyerRoute><BomDetailPage /></BuyerRoute> },
            { path: 'buyers/:buyerKey/mat-info', element: <BuyerRoute><MatInfoPage /></BuyerRoute> },
            { path: 'buyers/:buyerKey/product-colors', element: <BuyerRoute><ProductColorPage /></BuyerRoute> },

            { path: 'orders', element: <LegacyBuyerRedirect child="orders" /> },
            { path: 'orders/:orderId', element: <LegacyBuyerRedirect child="orders" /> },
            { path: 'mat-info', element: <LegacyBuyerRedirect child="mat-info" /> },
            { path: 'product-colors', element: <LegacyBuyerRedirect child="product-colors" /> },

            { path: 'suppliers', element: <Navigate to="/vendor-codes" replace /> },
            { path: 'vendor-code', element: <Navigate to="/vendor-codes" replace /> },
            { path: 'master-data', element: <LegacyBuyerRedirect child="mat-info" /> },
            { path: 'master-data/currencies', element: <Navigate to="/currencies" replace /> },
            { path: 'master-data/suppliers', element: <Navigate to="/vendor-codes" replace /> },
            { path: 'master-data/vendor-codes', element: <Navigate to="/vendor-codes" replace /> },
            { path: 'master-data/mat-infos', element: <LegacyBuyerRedirect child="mat-info" /> },
            { path: 'master-data/loss', element: <Navigate to="/loss" replace /> },
            { path: 'master-data/ship-tos', element: <Navigate to="/ship-tos" replace /> },
            { path: 'master-data/product-colors', element: <LegacyBuyerRedirect child="product-colors" /> },
            { path: '*', element: <DefaultAuthorizedRoute /> }
          ]
        }
      ]
    },
    { path: '*', element: <Navigate to={LOGIN_PATH} replace /> }
  ]
};
export default MainRoutes;
