const MONTH_REGEX = /^\d{4}-(0[1-9]|1[0-2])$/;

export const parseMonth = (value) => {
  if (!value) return null;
  const normalized = String(value).trim();
  if (!MONTH_REGEX.test(normalized)) return null;
  const [yearText, monthText] = normalized.split('-');
  const year = Number(yearText);
  const monthIndex = Number(monthText) - 1;
  if (!Number.isFinite(year) || !Number.isFinite(monthIndex)) return null;
  return { year, monthIndex };
};

export const formatMonth = (year, monthIndex) => {
  if (!Number.isFinite(year) || !Number.isFinite(monthIndex)) return null;
  const safeYear = Math.floor(year);
  const safeMonth = Math.floor(monthIndex) + 1;
  if (safeMonth < 1 || safeMonth > 12) return null;
  return `${String(safeYear).padStart(4, '0')}-${String(safeMonth).padStart(2, '0')}`;
};

export const addMonths = (value, amount) => {
  const parsed = parseMonth(value);
  if (!parsed || !Number.isFinite(amount)) return null;
  const totalMonths = parsed.year * 12 + parsed.monthIndex + Math.trunc(amount);
  const year = Math.floor(totalMonths / 12);
  const monthIndex = totalMonths % 12;
  return formatMonth(year, monthIndex);
};

export const compareMonths = (a, b) => {
  if (a === b) return 0;
  if (!a) return -1;
  if (!b) return 1;
  return a < b ? -1 : 1;
};

export const monthLabel = (value, locale) => {
  const parsed = parseMonth(value);
  if (!parsed) return value;
  const date = new Date(parsed.year, parsed.monthIndex, 1);
  return date.toLocaleDateString(locale, { month: 'short', year: 'numeric' });
};

export const listMonths = (start, count) => {
  if (!start || !Number.isFinite(count)) return [];
  const result = [];
  for (let i = 0; i < count; i += 1) {
    const next = addMonths(start, i);
    if (!next) break;
    result.push(next);
  }
  return result;
};
