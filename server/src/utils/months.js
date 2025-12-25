const MONTH_REGEX = /^\d{4}-(0[1-9]|1[0-2])$/;

const parseMonth = (value) => {
  if (!value) return null;
  const normalized = String(value).trim();
  if (!MONTH_REGEX.test(normalized)) return null;
  const [yearText, monthText] = normalized.split('-');
  const year = Number(yearText);
  const monthIndex = Number(monthText) - 1;
  if (!Number.isFinite(year) || !Number.isFinite(monthIndex)) return null;
  return { year, monthIndex };
};

const formatMonth = (year, monthIndex) => {
  if (!Number.isFinite(year) || !Number.isFinite(monthIndex)) return null;
  const safeYear = Math.floor(year);
  const safeMonth = Math.floor(monthIndex) + 1;
  if (safeMonth < 1 || safeMonth > 12) return null;
  return `${String(safeYear).padStart(4, '0')}-${String(safeMonth).padStart(2, '0')}`;
};

const addMonths = (value, amount) => {
  const parsed = parseMonth(value);
  if (!parsed || !Number.isFinite(amount)) return null;
  const totalMonths = parsed.year * 12 + parsed.monthIndex + Math.trunc(amount);
  const year = Math.floor(totalMonths / 12);
  const monthIndex = totalMonths % 12;
  return formatMonth(year, monthIndex);
};

const compareMonths = (a, b) => {
  if (a === b) return 0;
  if (!a) return -1;
  if (!b) return 1;
  return a < b ? -1 : 1;
};

const listMonths = (start, end) => {
  if (!start || !end) return [];
  if (compareMonths(start, end) > 0) return [];
  const months = [];
  let current = start;
  let guard = 0;
  while (current && compareMonths(current, end) <= 0 && guard < 240) {
    months.push(current);
    current = addMonths(current, 1);
    guard += 1;
  }
  return months;
};

const monthLabel = (value, locale) => {
  const parsed = parseMonth(value);
  if (!parsed) return value;
  const date = new Date(parsed.year, parsed.monthIndex, 1);
  return date.toLocaleDateString(locale, { month: 'short', year: 'numeric' });
};

const currentMonth = (date = new Date()) => {
  return formatMonth(date.getFullYear(), date.getMonth());
};

const nextUnpaidMonth = (startMonth, paidSet) => {
  if (!startMonth) return null;
  let current = startMonth;
  let guard = 0;
  while (current && guard < 240) {
    if (!paidSet?.has(current)) return current;
    current = addMonths(current, 1);
    guard += 1;
  }
  return null;
};

module.exports = {
  MONTH_REGEX,
  parseMonth,
  formatMonth,
  addMonths,
  compareMonths,
  listMonths,
  monthLabel,
  currentMonth,
  nextUnpaidMonth,
};
