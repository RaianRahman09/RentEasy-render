const clientBaseUrl = process.env.CLIENT_URL || 'http://localhost:5173';

const buildMoveOutNoticeEmail = ({ recipientName, tenantName, listingTitle, moveOutLabel }) => {
  const link = `${clientBaseUrl}/landlord/listings`;
  return `
    <div style="font-family: Arial, sans-serif; line-height: 1.5;">
      <p>Hello ${recipientName || 'there'},</p>
      <p>${tenantName || 'A tenant'} has sent a move-out notice.</p>
      <p><strong>${listingTitle}</strong></p>
      <p>Move-out month: ${moveOutLabel}</p>
      <p><a href="${link}">Manage listings in RentEasy</a></p>
      <p>- RentEasy</p>
    </div>
  `;
};

module.exports = { buildMoveOutNoticeEmail };
