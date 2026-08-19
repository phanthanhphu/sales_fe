import { useState } from 'react';
import { Alert, Box, Button, Chip, Paper, Snackbar, Stack, Typography } from '@mui/material';
import { CheckRounded, PaletteOutlined, RestartAltRounded, SaveOutlined } from '@mui/icons-material';
import { alpha } from '@mui/material/styles';
import {
  DEFAULT_LAYOUT_COLOR_ID,
  getLayoutColorPreset,
  getSavedLayoutColorId,
  LAYOUT_COLOR_PRESETS,
  saveLayoutColorId
} from 'utils/layoutColor';

export default function GeneralSettingsPage() {
  const [selected, setSelected] = useState(getSavedLayoutColorId);
  const [saved, setSaved] = useState(getSavedLayoutColorId);
  const [notice, setNotice] = useState({ open: false, severity: 'success', message: '' });

  const save = () => {
    const id = saveLayoutColorId(selected);
    setSaved(id);
    setSelected(id);
    setNotice({ open: true, severity: 'success', message: 'Layout color updated.' });
  };

  const resetDefault = () => {
    const id = saveLayoutColorId(DEFAULT_LAYOUT_COLOR_ID);
    setSaved(id);
    setSelected(id);
    setNotice({ open: true, severity: 'success', message: 'Default color restored.' });
  };

  const preview = getLayoutColorPreset(selected);

  return (
    <Box sx={{ p: { xs: 0.75, sm: 1, md: 1.25 }, maxWidth: 980, mx: 'auto' }}>
      <Paper variant="outlined" sx={{ borderColor: '#DCE5EE', overflow: 'hidden' }}>
        <Box sx={{ px: 1.5, py: 1.1, borderBottom: '1px solid #E7EDF4', bgcolor: '#FBFCFE' }}>
          <Stack direction="row" alignItems="center" spacing={0.9}>
            <PaletteOutlined sx={{ fontSize: 20, color: preview.accent }} />
            <Typography sx={{ fontWeight: 750, color: '#183658' }}>Layout Color</Typography>
          </Stack>
        </Box>

        <Box sx={{ p: { xs: 1.25, md: 1.75 } }}>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr 1fr', sm: 'repeat(3, 1fr)' },
              gap: 1
            }}
          >
            {LAYOUT_COLOR_PRESETS.map((item) => {
              const active = selected === item.id;
              return (
                <Paper
                  key={item.id}
                  component="button"
                  type="button"
                  onClick={() => setSelected(item.id)}
                  variant="outlined"
                  sx={{
                    appearance: 'none',
                    textAlign: 'left',
                    p: 1.15,
                    minHeight: 78,
                    cursor: 'pointer',
                    bgcolor: active ? item.selected : '#FFFFFF',
                    borderColor: active ? item.accent : '#DCE5EE',
                    boxShadow: active ? `0 0 0 1px ${alpha(item.accent, 0.12)}` : 'none',
                    transition: 'border-color .15s ease, background-color .15s ease, box-shadow .15s ease',
                    '&:hover': { borderColor: item.accent, bgcolor: active ? item.selected : item.soft }
                  }}
                >
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Box
                      sx={{
                        width: 34,
                        height: 34,
                        borderRadius: 1.5,
                        bgcolor: item.swatch,
                        display: 'grid',
                        placeItems: 'center',
                        flexShrink: 0,
                        boxShadow: `inset 0 0 0 1px ${alpha('#000', 0.05)}`
                      }}
                    >
                      {active ? <CheckRounded sx={{ color: '#fff', fontSize: 20 }} /> : null}
                    </Box>
                    <Box sx={{ minWidth: 0 }}>
                      <Stack direction="row" spacing={0.6} alignItems="center" flexWrap="wrap" useFlexGap>
                        <Typography sx={{ fontSize: '0.84rem', fontWeight: 700, color: '#253B52' }}>{item.label}</Typography>
                        {item.id === DEFAULT_LAYOUT_COLOR_ID ? (
                          <Chip label="Default" size="small" sx={{ height: 20, fontSize: '0.64rem', fontWeight: 700 }} />
                        ) : null}
                      </Stack>
                      {saved === item.id ? (
                        <Typography sx={{ mt: 0.35, fontSize: '0.7rem', color: item.dark, fontWeight: 650 }}>Current</Typography>
                      ) : null}
                    </Box>
                  </Stack>
                </Paper>
              );
            })}
          </Box>

          <Paper
            variant="outlined"
            sx={{
              mt: 1.5,
              overflow: 'hidden',
              borderColor: '#DCE5EE',
              bgcolor: '#F8FAFC'
            }}
          >
            <Box sx={{ height: 42, bgcolor: '#FFFFFF', borderBottom: '1px solid #E7EDF4', display: 'flex', alignItems: 'center', px: 1.25, gap: 1 }}>
              <Box sx={{ width: 26, height: 26, borderRadius: 1.2, bgcolor: preview.soft, border: `1px solid ${preview.selectedBorder}`, display: 'grid', placeItems: 'center' }}>
                <Box sx={{ width: 13, height: 2, borderRadius: 2, bgcolor: preview.accent, boxShadow: `0 4px 0 ${preview.accent}, 0 -4px 0 ${preview.accent}` }} />
              </Box>
              <Box sx={{ width: 76, height: 7, borderRadius: 5, bgcolor: '#DDE5ED' }} />
            </Box>
            <Stack direction="row" sx={{ height: 112 }}>
              <Box sx={{ width: 92, bgcolor: '#FFFFFF', borderRight: '1px solid #E7EDF4', p: 0.8 }}>
                {[0, 1, 2].map((index) => (
                  <Box key={index} sx={{ height: 24, mb: 0.55, borderRadius: 1, bgcolor: index === 0 ? preview.selected : 'transparent', borderLeft: index === 0 ? `3px solid ${preview.accent}` : '3px solid transparent' }} />
                ))}
              </Box>
              <Box sx={{ flex: 1, p: 1.2 }}>
                <Box sx={{ width: '32%', height: 9, bgcolor: '#CBD6E2', borderRadius: 4, mb: 1 }} />
                <Box sx={{ width: '100%', height: 42, bgcolor: '#FFFFFF', border: '1px solid #E0E7EF', borderRadius: 1.2, mb: 1 }} />
                <Stack direction="row" spacing={0.8}>
                  <Box sx={{ width: 66, height: 22, borderRadius: 1, bgcolor: preview.primaryMain }} />
                  <Box sx={{ width: 66, height: 22, borderRadius: 1, bgcolor: preview.selected, border: `1px solid ${preview.selectedBorder}` }} />
                </Stack>
              </Box>
            </Stack>
          </Paper>

          <Stack direction="row" justifyContent="flex-end" spacing={1} sx={{ mt: 1.5 }}>
            <Button variant="outlined" startIcon={<RestartAltRounded />} onClick={resetDefault} sx={{ textTransform: 'none' }}>
              Reset Default
            </Button>
            <Button variant="contained" startIcon={<SaveOutlined />} onClick={save} disabled={selected === saved} sx={{ textTransform: 'none', minWidth: 120 }}>
              Save
            </Button>
          </Stack>
        </Box>
      </Paper>

      <Snackbar open={notice.open} autoHideDuration={3000} onClose={() => setNotice((current) => ({ ...current, open: false }))} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
        <Alert severity={notice.severity} variant="filled" onClose={() => setNotice((current) => ({ ...current, open: false }))}>{notice.message}</Alert>
      </Snackbar>
    </Box>
  );
}
