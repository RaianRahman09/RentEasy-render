export const formatAppointmentWindow = (startTime, endTime) => {
  const start = new Date(startTime);
  const end = new Date(endTime);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return '';
  const dateText = start.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  const startText = start.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  const endText = end.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  return `${dateText} ${startText} - ${endText}`;
};
