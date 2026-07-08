/**
 * Shared dialog/form styling aligned with the MAT INFO add/edit dialogs.
 * Keep this file UI-only so existing API behaviour remains unchanged.
 */

export const STABLE_FORM_COLORS = {
  navy: '#103B5C',
  navyHover: '#0B2E49',
  text: '#17324D',
  muted: '#64748B',
  border: '#D8E0E8',
  fieldBorder: '#C3CFDB',
  fieldHover: '#93A8BA',
  focus: '#5B8CFF',
  fieldBg: '#FFFFFF',
  disabledBg: '#F7F9FB'
};

export const stableDialogPaperSx = (fullScreen = false) => ({
  borderRadius: fullScreen ? 0 : 2,
  overflow: 'hidden',
  backgroundColor: '#FFFFFF',
  boxShadow: '0 16px 44px rgba(0, 0, 0, 0.18)'
});

export const stableDialogTitleSx = {
  position: 'relative',
  px: { xs: 2, sm: 3 },
  py: 1.7,
  pr: 7,
  minHeight: 56,
  display: 'flex',
  alignItems: 'center',
  backgroundColor: '#FFFFFF',
  color: STABLE_FORM_COLORS.navy
};

export const stableDialogContentSx = {
  p: { xs: 2, sm: 3 },
  backgroundColor: '#FFFFFF'
};

export const stableDialogActionsSx = {
  px: { xs: 2, sm: 3 },
  py: 1.5,
  gap: 1.1,
  backgroundColor: '#FFFFFF'
};

export const stableFormGridSx = {
  display: 'grid',
  gridTemplateColumns: { xs: '1fr', sm: 'repeat(12, minmax(0, 1fr))' },
  gap: 2
};

export const stableFieldSx = {
  '& .MuiInputLabel-root': {
    fontSize: '0.8rem',
    fontWeight: 700,
    color: '#5B6D7F'
  },
  '& .MuiInputLabel-root.Mui-focused': {
    color: STABLE_FORM_COLORS.navy
  },
  '& .MuiOutlinedInput-root': {
    minHeight: 48,
    borderRadius: 1.25,
    backgroundColor: STABLE_FORM_COLORS.fieldBg,
    color: '#273B4D',
    '& fieldset': {
      borderColor: STABLE_FORM_COLORS.fieldBorder
    },
    '&:hover fieldset': {
      borderColor: STABLE_FORM_COLORS.fieldHover
    },
    '&.Mui-focused fieldset': {
      borderColor: STABLE_FORM_COLORS.focus,
      borderWidth: 1.5
    },
    '&.Mui-disabled': {
      backgroundColor: STABLE_FORM_COLORS.disabledBg
    }
  },
  '& .MuiInputBase-input': {
    fontSize: '0.91rem'
  },
  '& .MuiFormHelperText-root': {
    marginLeft: 0,
    marginTop: 0.65,
    fontSize: '0.75rem'
  }
};

export const stableSelectFieldSx = {
  ...stableFieldSx,
  '& .MuiSelect-select': {
    display: 'flex',
    alignItems: 'center',
    minHeight: 'unset',
    fontSize: '0.91rem'
  }
};

export const stableCloseButtonSx = {
  position: 'absolute',
  right: 13,
  top: '50%',
  transform: 'translateY(-50%)',
  width: 36,
  height: 36,
  borderRadius: 1.2,
  color: '#334155',
  '&:hover': {
    color: STABLE_FORM_COLORS.navy,
    backgroundColor: '#F1F5F9'
  }
};

export const stablePrimaryButtonSx = {
  minHeight: 38,
  px: 2,
  borderRadius: 1.25,
  textTransform: 'none',
  fontWeight: 800,
  fontSize: '0.86rem',
  color: '#FFFFFF',
  backgroundColor: STABLE_FORM_COLORS.navy,
  boxShadow: 'none',
  '&:hover': {
    backgroundColor: STABLE_FORM_COLORS.navyHover,
    boxShadow: 'none'
  },
  '&.Mui-disabled': {
    color: '#94A3B8',
    backgroundColor: '#E2E8F0'
  }
};

export const stableTextButtonSx = {
  minHeight: 38,
  px: 1.35,
  borderRadius: 1.25,
  textTransform: 'none',
  fontWeight: 600,
  fontSize: '0.86rem',
  color: '#5B6471',
  '&:hover': {
    color: STABLE_FORM_COLORS.navy,
    backgroundColor: '#F5F7FA'
  }
};

export const stableOutlineButtonSx = {
  minHeight: 38,
  px: 1.55,
  borderRadius: 1.25,
  textTransform: 'none',
  fontWeight: 700,
  fontSize: '0.82rem',
  color: STABLE_FORM_COLORS.navy,
  borderColor: '#C4D0DB',
  backgroundColor: '#FFFFFF',
  '&:hover': {
    borderColor: '#98AABB',
    backgroundColor: '#F7FAFC'
  }
};

export const stableImageFieldSx = {
  position: 'relative',
  minHeight: 58,
  display: 'flex',
  alignItems: 'center',
  gap: 1.15,
  px: 1.25,
  py: 0.75,
  borderRadius: 1.25,
  border: `1px solid ${STABLE_FORM_COLORS.fieldBorder}`,
  backgroundColor: '#FFFFFF'
};

export const stableFloatingLabelSx = {
  position: 'absolute',
  top: -9,
  left: 10,
  px: 0.55,
  lineHeight: 1,
  fontSize: '0.74rem',
  fontWeight: 700,
  color: '#5B6D7F',
  backgroundColor: '#FFFFFF'
};

export const stableStatusFieldSx = {
  ...stableFieldSx,
  '& .MuiSelect-select': {
    fontSize: '0.91rem'
  }
};
