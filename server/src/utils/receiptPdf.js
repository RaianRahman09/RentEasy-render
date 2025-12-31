const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');
const { monthLabel } = require('./months');
const { formatListingAddress } = require('./address');

const ensureDir = (dirPath) => {
  fs.mkdirSync(dirPath, { recursive: true });
};

const formatAmount = (value) => {
  if (!Number.isFinite(value)) return '0';
  return value.toLocaleString('en-US');
};

const buildReceiptPath = (paymentId) => {
  const receiptsDir = path.join(__dirname, '..', '..', 'storage', 'receipts');
  ensureDir(receiptsDir);
  const filename = `receipt-${paymentId}.pdf`;
  return {
    filePath: path.join(receiptsDir, filename),
    filename,
  };
};

const generateReceiptPdf = async ({ payment, tenant, listing }) => {
  const { filePath } = buildReceiptPath(payment._id.toString());
  const doc = new PDFDocument({ size: 'A4', margin: 50 });

  const writeStream = fs.createWriteStream(filePath);
  doc.pipe(writeStream);

  doc.fontSize(20).text('RentEasy Receipt', { align: 'center' });
  doc.moveDown(1.5);

  doc.fontSize(12).text(`Date: ${new Date(payment.createdAt).toLocaleString()}`);
  doc.text(`Payment Intent: ${payment.stripePaymentIntentId || 'N/A'}`);
  doc.moveDown();

  doc.fontSize(12).text(`Tenant: ${tenant?.name || 'Tenant'}`);
  doc.text(`Email: ${tenant?.email || 'N/A'}`);
  doc.moveDown();

  doc.text(`Listing: ${listing?.title || 'Listing'}`);
  doc.text(`Address: ${formatListingAddress(listing) || 'N/A'}`);
  doc.moveDown();

  const monthsLabel = (payment.monthsPaid || []).map((month) => monthLabel(month, 'en-US')).join(', ') || 'N/A';
  doc.text(`Months Paid: ${monthsLabel}`);
  doc.moveDown();

  doc.fontSize(13).text('Payment Breakdown', { underline: true });
  doc.moveDown(0.5);
  doc.fontSize(12).text(`Rent Subtotal: ${formatAmount(payment.rentSubtotal)} BDT`);
  doc.text(`Service Charge: ${formatAmount(payment.serviceCharge)} BDT`);
  if (payment.penaltyAmount) {
    doc.text(`Penalty: ${formatAmount(payment.penaltyAmount)} BDT`);
  }
  doc.text(`Tax (5%): ${formatAmount(payment.tax)} BDT`);
  doc.text(`Platform Fee (2%): ${formatAmount(payment.platformFee)} BDT`);
  doc.moveDown(0.5);
  doc.fontSize(13).text(`Total Paid: ${formatAmount(payment.total)} BDT`);

  doc.end();

  await new Promise((resolve, reject) => {
    writeStream.on('finish', resolve);
    writeStream.on('error', reject);
  });

  return filePath;
};

module.exports = { generateReceiptPdf, buildReceiptPath };
