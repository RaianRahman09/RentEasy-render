export const formatRentStartMonth = (value) => {
  if (!value) return '';
  const [yearText, monthText] = String(value).split('-');
  const year = Number(yearText);
  const monthIndex = Number(monthText) - 1;
  if (!Number.isFinite(year) || !Number.isFinite(monthIndex) || monthIndex < 0 || monthIndex > 11) {
    return value;
  }
  const date = new Date(Date.UTC(year, monthIndex, 1));
  return date.toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
};
