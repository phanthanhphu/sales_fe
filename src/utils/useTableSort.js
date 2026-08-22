import { useCallback, useMemo, useState } from 'react';

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}(?:[T\s].*)?$/;
const NUMERIC_PATTERN = /^[-+]?\d+(?:[.,]\d+)?$/;

const normalizeComparable = (value) => {
  if (value === null || value === undefined) return { empty: true, type: 'text', value: '' };
  if (value instanceof Date) return { empty: false, type: 'number', value: value.getTime() };
  if (typeof value === 'boolean') return { empty: false, type: 'number', value: value ? 1 : 0 };
  if (typeof value === 'number') return { empty: Number.isNaN(value), type: 'number', value: Number.isNaN(value) ? 0 : value };
  if (Array.isArray(value)) return normalizeComparable(value.join(' '));

  const text = String(value).trim();
  if (!text) return { empty: true, type: 'text', value: '' };

  if (NUMERIC_PATTERN.test(text.replace(/,/g, ''))) {
    const numeric = Number(text.replace(/,/g, ''));
    if (!Number.isNaN(numeric)) return { empty: false, type: 'number', value: numeric };
  }

  if (ISO_DATE_PATTERN.test(text)) {
    const timestamp = Date.parse(text);
    if (!Number.isNaN(timestamp)) return { empty: false, type: 'number', value: timestamp };
  }

  return { empty: false, type: 'text', value: text.toLocaleLowerCase() };
};

export const compareTableValues = (leftValue, rightValue) => {
  const left = normalizeComparable(leftValue);
  const right = normalizeComparable(rightValue);

  if (left.empty && right.empty) return 0;
  if (left.empty) return 1;
  if (right.empty) return -1;

  if (left.type === 'number' && right.type === 'number') return left.value - right.value;
  return String(left.value).localeCompare(String(right.value), undefined, { numeric: true, sensitivity: 'base' });
};

export default function useTableSort(rows = [], options = {}) {
  const { initialKey = '', initialDirection = 'asc', getValue } = options;
  const [sort, setSort] = useState({ key: initialKey, direction: initialDirection });

  const requestSort = useCallback((key) => {
    if (!key) return;
    setSort((current) => ({
      key,
      direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc'
    }));
  }, []);

  const sortedRows = useMemo(() => {
    const source = Array.isArray(rows) ? rows : [];
    if (!sort.key) return source;
    const readValue = typeof getValue === 'function' ? getValue : (row, key) => row?.[key];
    const direction = sort.direction === 'desc' ? -1 : 1;

    return source
      .map((row, index) => ({ row, index }))
      .sort((left, right) => {
        const compared = compareTableValues(readValue(left.row, sort.key), readValue(right.row, sort.key));
        return compared === 0 ? left.index - right.index : compared * direction;
      })
      .map((item) => item.row);
  }, [getValue, rows, sort]);

  return {
    sortedRows,
    sortKey: sort.key,
    sortDirection: sort.direction,
    requestSort,
    setSort
  };
}
