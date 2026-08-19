import { useId } from 'react';
import {
  Box,
  Chip,
  Stack,
  Typography
} from '@mui/material';
import {
  CheckCircleRounded,
  DescriptionRounded,
  ErrorRounded,
  Inventory2Rounded,
  LayersRounded,
  PaletteRounded,
  UploadFileRounded
} from '@mui/icons-material';

const clamp = (value, min, max) => Math.max(min, Math.min(max, Number(value || 0)));

const formatFileSize = (size = 0) => {
  const value = Number(size || 0);
  if (!value) return '0 KB';
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / 1024 / 1024).toFixed(2)} MB`;
};

const STEPS = [
  { key: 'upload', label: 'Upload', shortLabel: 'Upload', min: 0, icon: UploadFileRounded },
  { key: 'read', label: 'Read Excel', shortLabel: 'Read', min: 36, icon: DescriptionRounded },
  { key: 'validate', label: 'Validate', shortLabel: 'Validate', min: 58, icon: Inventory2Rounded },
  { key: 'save', label: 'Save data', shortLabel: 'Save', min: 76, icon: LayersRounded },
  { key: 'complete', label: 'Complete', shortLabel: 'Done', min: 100, icon: CheckCircleRounded }
];

const stateTheme = (state) => {
  if (state === 'error') {
    return {
      accentStart: '#ef4444',
      accentEnd: '#b91c1c',
      dark: '#991b1b',
      soft: '#fef2f2',
      border: '#fecaca',
      label: 'IMPORT FAILED',
      StateIcon: ErrorRounded
    };
  }

  if (state === 'success') {
    return {
      accentStart: '#34d399',
      accentEnd: '#15803d',
      dark: '#166534',
      soft: '#f0fdf4',
      border: '#bbf7d0',
      label: 'COMPLETED',
      StateIcon: CheckCircleRounded
    };
  }

  return {
    accentStart: '#22d3ee',
    accentEnd: '#1456d8',
    dark: '#103b5c',
    soft: '#f5faff',
    border: '#cfe7fb',
    label: 'PROCESSING',
    StateIcon: LayersRounded
  };
};

function ProgressRing({ progress, state, size }) {
  const safeProgress = clamp(progress, 0, 100);
  const theme = stateTheme(state);
  const gradientId = `sales-bom-progress-${useId().replace(/:/g, '')}`;
  const radius = 68;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference - (safeProgress / 100) * circumference;

  return (
    <Box
      sx={{
        position: 'relative',
        width: size,
        height: size,
        flex: '0 0 auto',
        '&::before': {
          content: '""',
          position: 'absolute',
          inset: 4,
          borderRadius: '50%',
          background: 'repeating-conic-gradient(from -90deg, rgba(38,116,191,.17) 0deg 1.4deg, transparent 1.4deg 7.5deg)',
          mask: 'radial-gradient(circle, transparent 68%, #000 69%, #000 72%, transparent 73%)',
          WebkitMask: 'radial-gradient(circle, transparent 68%, #000 69%, #000 72%, transparent 73%)'
        }
      }}
    >
      <Box component="svg" viewBox="0 0 160 160" sx={{ width: '100%', height: '100%', transform: 'rotate(-90deg)', filter: 'drop-shadow(0 10px 17px rgba(20,86,216,.18))' }}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={theme.accentStart} />
            <stop offset="100%" stopColor={theme.accentEnd} />
          </linearGradient>
        </defs>
        <circle cx="80" cy="80" r={radius} fill="none" stroke="#e8f0f8" strokeWidth="13" />
        <circle
          cx="80"
          cy="80"
          r={radius}
          fill="none"
          stroke={`url(#${gradientId})`}
          strokeWidth="13"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          sx={{ transition: 'stroke-dashoffset 500ms ease' }}
        />
      </Box>

      <Stack
        alignItems="center"
        justifyContent="center"
        sx={{
          position: 'absolute',
          inset: '17%',
          borderRadius: '50%',
          background: 'radial-gradient(circle at 45% 35%, #ffffff 0%, #fbfdff 68%, #edf5fc 100%)',
          boxShadow: 'inset 0 0 0 1px rgba(16,59,92,.05), 0 10px 32px rgba(16,59,92,.11)'
        }}
      >
        <Typography
          component="div"
          sx={{
            color: theme.dark,
            fontWeight: 750,
            fontSize: size > 180 ? '3.35rem' : '2.35rem',
            letterSpacing: '-0.07em',
            lineHeight: 1
          }}
        >
          {Math.round(safeProgress)}
          <Box component="span" sx={{ fontSize: '0.48em', ml: 0.25, letterSpacing: 0 }}>%</Box>
        </Typography>
        <LayersRounded sx={{ color: state === 'error' ? '#ef4444' : state === 'success' ? '#16a34a' : '#f59e0b', fontSize: size > 180 ? 34 : 27, mt: 0.7 }} />
      </Stack>
    </Box>
  );
}

function StepRail({ progress, state, compact = false }) {
  const safeProgress = clamp(progress, 0, 100);
  const activeIndex = state === 'success'
    ? STEPS.length - 1
    : Math.max(0, STEPS.reduce((result, step, index) => (safeProgress >= step.min ? index : result), 0));

  return (
    <Box sx={{ width: '100%', px: compact ? 0 : 0.5 }}>
      <Stack direction="row" alignItems="flex-start" justifyContent="space-between" spacing={0.25}>
        {STEPS.map((step, index) => {
          const StepIcon = step.icon;
          const completed = index < activeIndex || state === 'success';
          const active = index === activeIndex && state !== 'error';
          const failed = state === 'error' && index === activeIndex;
          const iconColor = failed ? '#dc2626' : completed ? '#15803d' : active ? '#1456d8' : '#9fb2c3';
          const background = failed ? '#fef2f2' : completed ? '#f0fdf4' : active ? '#eff6ff' : '#f8fafc';

          return (
            <Box key={step.key} sx={{ flex: 1, minWidth: 0, position: 'relative', textAlign: 'center' }}>
              {index < STEPS.length - 1 && (
                <Box
                  sx={{
                    position: 'absolute',
                    height: 2,
                    top: 17,
                    left: '58%',
                    right: '-42%',
                    background: completed ? 'linear-gradient(90deg, #22c55e, #5eead4)' : '#dbe7f1',
                    transition: 'background 300ms ease'
                  }}
                />
              )}
              <Box
                sx={{
                  width: 35,
                  height: 35,
                  mx: 'auto',
                  position: 'relative',
                  zIndex: 1,
                  borderRadius: '50%',
                  display: 'grid',
                  placeItems: 'center',
                  color: iconColor,
                  background,
                  border: `1px solid ${failed ? '#fecaca' : completed ? '#bbf7d0' : active ? '#bfdbfe' : '#e2e8f0'}`,
                  boxShadow: active ? '0 0 0 5px rgba(37,99,235,.08)' : 'none'
                }}
              >
                {completed ? <CheckCircleRounded sx={{ fontSize: 20 }} /> : failed ? <ErrorRounded sx={{ fontSize: 20 }} /> : <StepIcon sx={{ fontSize: 18 }} />}
              </Box>
              <Typography
                sx={{
                  mt: 0.65,
                  px: 0.15,
                  fontSize: compact ? '0.61rem' : '0.67rem',
                  lineHeight: 1.15,
                  fontWeight: active || completed || failed ? 800 : 650,
                  color: failed ? '#b91c1c' : active ? '#103b5c' : completed ? '#166534' : '#71869a'
                }}
              >
                {compact ? step.shortLabel : step.label}
              </Typography>
            </Box>
          );
        })}
      </Stack>
    </Box>
  );
}

export default function SalesBomLoadingPanel({
  progress = 0,
  status = 'Preparing Excel upload...',
  detail = '',
  state = 'processing',
  file = null,
  compact = false,
  showFile = true
}) {
  const safeProgress = clamp(progress, 0, 100);
  const theme = stateTheme(state);
  const { StateIcon } = theme;

  return (
    <Box
      sx={{
        position: 'relative',
        overflow: 'hidden',
        borderRadius: compact ? 2 : 3,
        border: `1px solid ${theme.border}`,
        background: 'linear-gradient(145deg, rgba(255,255,255,.98), rgba(246,251,255,.98))',
        boxShadow: compact ? '0 8px 24px rgba(16,59,92,.07)' : '0 22px 60px rgba(16,59,92,.13)',
        p: compact ? 2 : { xs: 2.25, sm: 3 },
        '&::before': {
          content: '""',
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          opacity: 0.42,
          backgroundImage: [
            'linear-gradient(rgba(45,111,168,.07) 1px, transparent 1px)',
            'linear-gradient(90deg, rgba(45,111,168,.07) 1px, transparent 1px)',
            'radial-gradient(circle at 82% 18%, rgba(34,211,238,.16), transparent 30%)',
            'radial-gradient(circle at 12% 85%, rgba(245,158,11,.10), transparent 27%)'
          ].join(','),
          backgroundSize: '30px 30px, 30px 30px, auto, auto'
        }
      }}
    >
      <Stack alignItems="center" spacing={compact ? 1.35 : 1.7} sx={{ position: 'relative', zIndex: 1 }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ width: '100%' }}>
          <Stack direction="row" spacing={0.85} alignItems="center">
            <Box
              sx={{
                width: 30,
                height: 30,
                borderRadius: 1.1,
                display: 'grid',
                placeItems: 'center',
                background: 'linear-gradient(145deg, #103b5c, #168ec4)',
                color: '#fff',
                boxShadow: '0 6px 14px rgba(16,59,92,.22)'
              }}
            >
              <LayersRounded sx={{ fontSize: 19 }} />
            </Box>
            <Typography sx={{ fontWeight: 750, letterSpacing: '0.035em', color: '#103b5c', fontSize: compact ? '0.92rem' : '1rem' }}>
              SALES <Box component="span" sx={{ color: '#1595c8' }}>BOM</Box>
            </Typography>
          </Stack>
          <Chip
            size="small"
            icon={<StateIcon sx={{ fontSize: '16px !important' }} />}
            label={theme.label}
            sx={{
              height: 26,
              px: 0.25,
              fontWeight: 750,
              fontSize: '0.64rem',
              letterSpacing: '0.045em',
              color: theme.dark,
              backgroundColor: theme.soft,
              border: `1px solid ${theme.border}`,
              '& .MuiChip-icon': { color: theme.accentEnd }
            }}
          />
        </Stack>

        <ProgressRing progress={safeProgress} state={state} size={compact ? 156 : 206} />

        <Box sx={{ textAlign: 'center', width: '100%', maxWidth: 460 }}>
          <Typography
            sx={{
              color: state === 'error' ? '#b91c1c' : theme.dark,
              fontSize: compact ? '0.91rem' : '1.02rem',
              fontWeight: 750,
              lineHeight: 1.35
            }}
          >
            {status}
          </Typography>
          {detail && (
            <Typography
              sx={{
                mt: 0.6,
                color: state === 'error' ? '#b91c1c' : state === 'success' ? '#166534' : '#5f7284',
                fontSize: compact ? '0.74rem' : '0.78rem',
                lineHeight: 1.45,
                overflowWrap: 'anywhere'
              }}
            >
              {detail}
            </Typography>
          )}
        </Box>

        {showFile && file && (
          <Stack
            direction="row"
            spacing={1.05}
            alignItems="center"
            sx={{
              width: '100%',
              maxWidth: 460,
              px: 1.35,
              py: 1.05,
              borderRadius: 1.6,
              border: '1px solid #dce9f3',
              backgroundColor: 'rgba(255,255,255,.78)',
              boxShadow: '0 5px 18px rgba(16,59,92,.06)'
            }}
          >
            <DescriptionRounded sx={{ color: '#168ec4', fontSize: 24 }} />
            <Box sx={{ minWidth: 0, flex: 1 }}>
              <Typography noWrap sx={{ color: '#103b5c', fontWeight: 700, fontSize: '0.81rem' }}>
                {file?.name || 'Excel file'}
              </Typography>
              <Typography sx={{ color: '#778a9b', fontSize: '0.68rem' }}>
                {formatFileSize(file?.size)}
              </Typography>
            </Box>
            <PaletteRounded sx={{ color: '#f59e0b', fontSize: 20 }} />
          </Stack>
        )}

        <StepRail progress={safeProgress} state={state} compact={compact} />
      </Stack>
    </Box>
  );
}
