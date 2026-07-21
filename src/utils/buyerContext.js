export const DEFAULT_BUYERS = Object.freeze([
  { buyerKey: 'LLBEAN', buyerName: 'L.L.BEAN', sequence: 1 },
  { buyerKey: 'TNF', buyerName: 'TNF', sequence: 2 },
  { buyerKey: 'PATAGONIA', buyerName: 'PATAGONIA', sequence: 3 },
  { buyerKey: 'LULULEMON', buyerName: 'LULULEMON', sequence: 4 },
  { buyerKey: 'FILSON', buyerName: 'FILSON', sequence: 5 },
  { buyerKey: 'ENGELBERT_STRAUSS', buyerName: 'ENGELBERT STRAUSS', sequence: 6 }
]);

export const normalizeBuyerKey = (value) => {
  const normalized = String(value || '')
    .trim()
    .toUpperCase()
    .replace(/\./g, '')
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
  return normalized || 'LLBEAN';
};


const readStoredBuyerDefinitions = () => {
  try {
    const parsed = JSON.parse(localStorage.getItem('accessibleBuyers') || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const allKnownBuyers = () => {
  const merged = new Map(DEFAULT_BUYERS.map((item) => [item.buyerKey, item]));
  readStoredBuyerDefinitions().forEach((item) => {
    const buyerKey = normalizeBuyerKey(item?.buyerKey);
    if (!buyerKey) return;
    merged.set(buyerKey, {
      buyerKey,
      buyerName: item?.buyerName || buyerKey.replace(/_/g, ' '),
      sequence: Number(item?.sequence || merged.get(buyerKey)?.sequence || 999)
    });
  });
  return [...merged.values()];
};

export const readStoredUser = () => {
  try {
    return JSON.parse(localStorage.getItem('user') || '{}') || {};
  } catch {
    return {};
  }
};

export const isAdminUser = (user = readStoredUser()) => {
  const role = String(user?.role || localStorage.getItem('role') || '').trim().toUpperCase();
  return role === 'ADMIN' || role === 'ROLE_ADMIN';
};

const parseBuyerKeys = (value) => {
  let source = value;
  if (typeof source === 'string') {
    try {
      const parsed = JSON.parse(source);
      source = Array.isArray(parsed) ? parsed : source.split(/[,;|]/);
    } catch {
      source = source.split(/[,;|]/);
    }
  }
  return [...new Set((Array.isArray(source) ? source : [])
    .map(normalizeBuyerKey)
    .filter(Boolean))];
};

export const getAccessibleBuyerKeys = (user = readStoredUser()) => {
  if (isAdminUser(user)) return DEFAULT_BUYERS.map((item) => item.buyerKey);
  return parseBuyerKeys(user?.buyerKeys ?? localStorage.getItem('buyerKeys'));
};

export const hasBuyerAccess = (buyerKey, user = readStoredUser()) => (
  isAdminUser(user) || getAccessibleBuyerKeys(user).includes(normalizeBuyerKey(buyerKey))
);

export const getBuyerDefinition = (buyerKey) => {
  const key = normalizeBuyerKey(buyerKey);
  return allKnownBuyers().find((item) => item.buyerKey === key) || {
    buyerKey: key,
    buyerName: key.replace(/_/g, ' '),
    sequence: 999
  };
};

export const getAccessibleBuyers = (user = readStoredUser()) => {
  const keys = getAccessibleBuyerKeys(user);
  return keys
    .map(getBuyerDefinition)
    .sort((left, right) => Number(left.sequence || 0) - Number(right.sequence || 0));
};

export const getDefaultBuyerKey = (user = readStoredUser()) => (
  getAccessibleBuyerKeys(user)[0] || ''
);

export const buyerPath = (buyerKey, child = 'orders') => (
  `/buyers/${encodeURIComponent(normalizeBuyerKey(buyerKey))}/${String(child || 'orders').replace(/^\/+/, '')}`
);

export const defaultAuthorizedPath = (user = readStoredUser()) => {
  if (isAdminUser(user)) return '/users';
  const buyerKey = getDefaultBuyerKey(user);
  return buyerKey ? buyerPath(buyerKey, 'orders') : '/buyer-access-unavailable';
};
