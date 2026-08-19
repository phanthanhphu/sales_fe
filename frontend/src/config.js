// ==============================|| THEME CONSTANT ||============================== //

export const APP_DEFAULT_PATH = '/dashboard';
export const HORIZONTAL_MAX_ITEM = 6;
export const DRAWER_WIDTH = 236;
export const MINI_DRAWER_WIDTH = 68;
export const HEADER_HEIGHT = 64;
export const GRID_COMMON_SPACING = { xs: 2, md: 2.5 };

// ==============================|| API CONFIG ||============================== //

export {
  APP_ENV,
  API_BASE_URL,
  API_ROOT,
  FILE_ROOT,
  WS_URL
} from './appEnv';

import { API_BASE_URL, API_ROOT, FILE_ROOT } from './appEnv';

export const API_ENDPOINTS = {
  users: `${API_ROOT}/users`,
  appLinks: `${API_ROOT}/app-links`,
  forms: `${API_ROOT}/forms`,
  documentTypes: `${API_ROOT}/document-types`,
  notices: `${API_ROOT}/notices`,
  departments: `${API_ROOT}/departments`,
  masterData: `${API_ROOT}/master-data`,
  vendorCodes: `${API_ROOT}/master-data/vendor-codes`,
  matInfos: `${API_ROOT}/master-data/mat-infos`,
  lossMaster: `${API_ROOT}/master-data/loss`,
  filesPreviewPdf: `${API_ROOT}/files/preview-pdf`
};

export const toApiUrl = (path = '') => {
  const cleanPath = String(path || '').replace(/^\/+/, '');
  return `${API_ROOT}/${cleanPath}`;
};

export const toFileUrl = (path = '') => {
  if (!path) return '';

  const raw = String(path).trim();

  if (raw.startsWith('data:')) return raw;

  if (raw.startsWith('http://') || raw.startsWith('https://')) {
    try {
      const url = new URL(raw);
      const cleanPath = url.pathname.replace(/^\/+/, '');

      const isInternalHost =
        url.hostname === 'homepage.youngone.com.vn' ||
        url.hostname === window.location.hostname ||
        url.hostname === new URL(API_BASE_URL).hostname;

      if (isInternalHost) {
        if (cleanPath.startsWith('uploads/') || cleanPath.startsWith('files/')) {
          return `${FILE_ROOT}/${cleanPath}${url.search}${url.hash}`;
        }

        return `${FILE_ROOT}/files/${cleanPath}${url.search}${url.hash}`;
      }

      return raw;
    } catch {
      return raw;
    }
  }

  const cleanPath = raw.replace(/^\/+/, '');

  if (cleanPath.startsWith('uploads/') || cleanPath.startsWith('files/')) {
    return `${FILE_ROOT}/${cleanPath}`;
  }

  return `${FILE_ROOT}/files/${cleanPath}`;
};

// ==============================|| THEME CONFIG ||============================== //

const config = {
  fontFamily: `Inter var`,
  i18n: 'en',
  menuOrientation: 'vertical',
  menuCaption: true,
  miniDrawer: false,
  container: true,
  mode: 'light',
  presetColor: 'default',
  themeDirection: 'ltr',
  themeContrast: false
};

export default config;