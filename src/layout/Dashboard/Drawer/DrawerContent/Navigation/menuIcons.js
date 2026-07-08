import {
  ApartmentOutlined,
  BusinessCenterOutlined,
  CurrencyExchangeOutlined,
  GroupOutlined,
  Inventory2Outlined,
  LocalShippingOutlined,
  PaletteOutlined,
  ReportProblemOutlined,
  ShoppingCartOutlined,
  StorefrontOutlined
} from '@mui/icons-material';

/**
 * Uses consistent Material icons for the Sales BOM master-data menu.
 * When a menu is not included below, the icon configured in menu-items is used.
 */
export const getNavigationIcon = (item = {}) => {
  const value = `${item.id || ''} ${item.title || ''}`.toLowerCase();

  if (value.includes('user')) return GroupOutlined;
  if (value.includes('department')) return ApartmentOutlined;
  if (value.includes('lululemon')) return StorefrontOutlined;
  if (value.includes('order')) return ShoppingCartOutlined;
  if (value.includes('currency')) return CurrencyExchangeOutlined;
  if (value.includes('vendor')) return BusinessCenterOutlined;
  if (value.includes('mat info') || value.includes('mat-info') || value.includes('material')) return Inventory2Outlined;
  if (value.includes('loss')) return ReportProblemOutlined;
  if (value.includes('ship')) return LocalShippingOutlined;
  if (value.includes('product color') || value.includes('color')) return PaletteOutlined;

  return null;
};
