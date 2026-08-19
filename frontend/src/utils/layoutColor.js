export const DEFAULT_LAYOUT_COLOR_ID = 'current-blue';

export const LAYOUT_COLOR_PRESETS = [
  {
    id: 'current-blue',
    label: 'Current Blue',
    swatch: '#0A6ED1',
    primaryMain: '#4680FF',
    profileAccent: '#3B82F6',
    chipAccent: '#3B82F6',
    chipText: '#2563EB',
    accent: '#0A6ED1',
    dark: '#0B4F8A',
    headerIcon: '#2E5F97',
    headerHover: '#2563EB',
    selected: '#EBF4FD',
    selectedHover: '#E5F0FB',
    selectedBorder: '#CFE2F8',
    soft: '#F2F6FB',
    softHover: '#EAF2FF',
    textStrong: '#173B63'
  },
  {
    id: 'navy',
    label: 'Navy',
    swatch: '#1D4ED8',
    primaryMain: '#2563EB',
    profileAccent: '#2563EB',
    chipAccent: '#2563EB',
    chipText: '#1D4ED8',
    accent: '#1D4ED8',
    dark: '#1E3A8A',
    headerIcon: '#1E40AF',
    headerHover: '#1D4ED8',
    selected: '#EEF4FF',
    selectedHover: '#E6EFFF',
    selectedBorder: '#C7D7FE',
    soft: '#F2F6FF',
    softHover: '#EAF1FF',
    textStrong: '#17325F'
  },
  {
    id: 'teal',
    label: 'Teal',
    swatch: '#0F8B8D',
    primaryMain: '#0F8B8D',
    profileAccent: '#0F8B8D',
    chipAccent: '#0F8B8D',
    chipText: '#0F6D70',
    accent: '#0F8B8D',
    dark: '#0F6D70',
    headerIcon: '#147C7E',
    headerHover: '#0F8B8D',
    selected: '#EAF8F7',
    selectedHover: '#E1F4F3',
    selectedBorder: '#BDE7E5',
    soft: '#F1F8F8',
    softHover: '#E7F4F3',
    textStrong: '#165255'
  },
  {
    id: 'green',
    label: 'Green',
    swatch: '#168A4A',
    primaryMain: '#168A4A',
    profileAccent: '#168A4A',
    chipAccent: '#168A4A',
    chipText: '#116B3A',
    accent: '#168A4A',
    dark: '#116B3A',
    headerIcon: '#197444',
    headerHover: '#168A4A',
    selected: '#ECF8F0',
    selectedHover: '#E3F4E9',
    selectedBorder: '#C4E7D0',
    soft: '#F2F8F4',
    softHover: '#E8F4EC',
    textStrong: '#20533A'
  },
  {
    id: 'purple',
    label: 'Purple',
    swatch: '#7C3AED',
    primaryMain: '#7C3AED',
    profileAccent: '#7C3AED',
    chipAccent: '#7C3AED',
    chipText: '#5B21B6',
    accent: '#7C3AED',
    dark: '#5B21B6',
    headerIcon: '#6D36C7',
    headerHover: '#7C3AED',
    selected: '#F3EEFE',
    selectedHover: '#EDE5FD',
    selectedBorder: '#D8C8FA',
    soft: '#F6F2FC',
    softHover: '#EFE8FB',
    textStrong: '#4D2B78'
  },
  {
    id: 'orange',
    label: 'Orange',
    swatch: '#D97706',
    primaryMain: '#D97706',
    profileAccent: '#D97706',
    chipAccent: '#D97706',
    chipText: '#A65305',
    accent: '#D97706',
    dark: '#A65305',
    headerIcon: '#B96309',
    headerHover: '#D97706',
    selected: '#FFF4E8',
    selectedHover: '#FDEBD6',
    selectedBorder: '#F2D1A9',
    soft: '#FFF8F0',
    softHover: '#FCEEDD',
    textStrong: '#6F4214'
  }
];

export const getLayoutColorPreset = (id) =>
  LAYOUT_COLOR_PRESETS.find((item) => item.id === id) || LAYOUT_COLOR_PRESETS[0];

export const getSavedLayoutColorId = () => {
  if (typeof window === 'undefined') return DEFAULT_LAYOUT_COLOR_ID;
  const saved = window.localStorage.getItem('layoutColorPreset');
  return LAYOUT_COLOR_PRESETS.some((item) => item.id === saved) ? saved : DEFAULT_LAYOUT_COLOR_ID;
};

export const saveLayoutColorId = (id) => {
  if (typeof window === 'undefined') return DEFAULT_LAYOUT_COLOR_ID;
  const safeId = LAYOUT_COLOR_PRESETS.some((item) => item.id === id) ? id : DEFAULT_LAYOUT_COLOR_ID;
  window.localStorage.setItem('layoutColorPreset', safeId);
  window.dispatchEvent(new CustomEvent('layout-color:changed', { detail: { id: safeId } }));
  return safeId;
};
