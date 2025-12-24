const clientBaseUrl = process.env.CLIENT_URL || 'http://localhost:5173';

const formatAppointmentWindow = (startTime, endTime) => {
  const start = new Date(startTime);
  const end = new Date(endTime);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return '';
  const dateText = start.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  const startText = start.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });
  const endText = end.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });
  return `${dateText} ${startText} - ${endText}`;
};

const buildAppointmentEmail = ({
  recipientName,
  heading,
  listingTitle,
  windowText,
  otherPartyLabel,
  otherPartyName,
  linkPath,
  note,
}) => {
  const link = `${clientBaseUrl}${linkPath || ''}`;
  return `
    <div style="font-family: Arial, sans-serif; line-height: 1.5;">
      <p>Hello ${recipientName || 'there'},</p>
      <p>${heading}</p>
      <p><strong>${listingTitle}</strong></p>
      <p>${windowText}</p>
      <p>${otherPartyLabel}: ${otherPartyName}</p>
      ${note ? `<p>${note}</p>` : ''}
      <p><a href="${link}">View in RentEasy</a></p>
      <p>- RentEasy</p>
    </div>
  `;
};

module.exports = { formatAppointmentWindow, buildAppointmentEmail };
