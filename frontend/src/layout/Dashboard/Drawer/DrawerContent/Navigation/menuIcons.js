import {
  ApartmentOutlined,
  BusinessCenterOutlined,
  CurrencyExchangeOutlined,
  GroupOutlined,
  HistoryOutlined,
  Inventory2Outlined,
  LocalShippingOutlined,
  ManageAccountsOutlined,
  PaletteOutlined,
  PercentOutlined,
  SettingsOutlined,
  ShoppingCartOutlined,
  StorefrontOutlined
} from '@mui/icons-material';

/** Consistent outlined icon set for the entire application navigation. */
export const getNavigationIcon = (item = {}) => {
  const value = `${item.id || ''} ${item.title || ''}`.toLowerCase();

  if (value.includes('audit')) return HistoryOutlined;
  if (value.includes('setting')) return SettingsOutlined;
  if (item.type === 'collapse' && String(item.id || '').toLowerCase().startsWith('buyer-')) return StorefrontOutlined;
  if (value.includes('buyer') && !value.includes('order')) return ManageAccountsOutlined;
  if (value.includes('user')) return GroupOutlined;
  if (value.includes('department')) return ApartmentOutlined;
  if (value.includes('order')) return ShoppingCartOutlined;
  if (value.includes('currency')) return CurrencyExchangeOutlined;
  if (value.includes('vendor')) return BusinessCenterOutlined;
  if (value.includes('mat info') || value.includes('mat-info') || value.includes('material')) return Inventory2Outlined;
  if (value.includes('loss')) return PercentOutlined;
  if (value.includes('ship')) return LocalShippingOutlined;
  if (value.includes('product color') || value.includes('color')) return PaletteOutlined;
  if (value.includes('workspace') || value.includes('store')) return StorefrontOutlined;

  return null;
};
