const normalizeModule = (value) => String(value || '').trim().toUpperCase();
const normalizeBuyerKey = (value) => String(value || '').trim().toUpperCase();

const MASTER_MODULES = {
  vendor: 'VENDOR_CODE',
  supplier: 'VENDOR_CODE',
  matInfo: 'MAT_INFO',
  loss: 'LOSS',
  shipTo: 'SHIP_TO',
  materialShipTo: 'MATERIAL_SHIP_TO',
  currency: 'CURRENCY'
};

const entries = new Map();
let tokenSequence = 0;

const entryKey = (module, buyerKey) => `${normalizeModule(module)}|${normalizeBuyerKey(buyerKey) || '*'}`;

const cleanupEntry = (key, entry, now = Date.now()) => {
  if (!entry) return null;
  if ((entry.pending || 0) <= 0 && Number(entry.until || 0) < now) {
    entries.delete(key);
    return null;
  }
  return entry;
};

export const masterDataRealtimeModule = (type) => MASTER_MODULES[type] || normalizeModule(type);

/**
 * Marks a REST mutation made by this browser tab. While the mutation is in
 * flight (and for a short cooldown after it completes), matching socket
 * invalidation events are ignored by this tab. Other users/tabs still receive
 * and process the event normally.
 */
export const beginLocalRealtimeMutation = (module, buyerKey = '') => {
  const normalizedModule = normalizeModule(module);
  if (!normalizedModule) return null;

  const key = entryKey(normalizedModule, buyerKey);
  const entry = cleanupEntry(key, entries.get(key)) || { pending: 0, until: 0, tokens: new Set() };
  const token = `${Date.now()}-${++tokenSequence}`;
  entry.pending += 1;
  entry.tokens.add(token);
  entries.set(key, entry);
  return { key, token };
};

export const endLocalRealtimeMutation = (handle, cooldownMs = 1400) => {
  if (!handle?.key || !handle?.token) return;
  const entry = entries.get(handle.key);
  if (!entry || !entry.tokens?.has(handle.token)) return;

  entry.tokens.delete(handle.token);
  entry.pending = Math.max(0, Number(entry.pending || 0) - 1);
  entry.until = Math.max(Number(entry.until || 0), Date.now() + Math.max(0, Number(cooldownMs || 0)));
  entries.set(handle.key, entry);
};

export const shouldSuppressLocalRealtimeEvent = (event) => {
  const module = normalizeModule(event?.module);
  if (!module) return false;

  const eventBuyer = normalizeBuyerKey(event?.buyerKey);
  const now = Date.now();
  const keys = eventBuyer
    ? [entryKey(module, eventBuyer), entryKey(module, '')]
    : [entryKey(module, '')];

  for (const key of keys) {
    const entry = cleanupEntry(key, entries.get(key), now);
    if (entry && ((entry.pending || 0) > 0 || Number(entry.until || 0) >= now)) return true;
  }
  return false;
};
