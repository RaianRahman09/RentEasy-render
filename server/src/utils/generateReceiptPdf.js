const path = require('path');
const PDFDocument = require('pdfkit');
const { monthLabel } = require('./months');
const { formatListingAddress } = require('./address');

const CURRENCY = '৳';
const FONT_BODY = 'Helvetica';
const FONT_BODY_BOLD = 'Helvetica-Bold';
const FONT_CURRENCY = 'NotoSansBengali';
const FONT_CURRENCY_BOLD = 'NotoSansBengaliBold';
const FONT_DIR = path.join(__dirname, '..', '..', 'assets', 'fonts');
const FONT_CURRENCY_PATH = path.join(FONT_DIR, 'NotoSansBengali-Regular.ttf');
const FONT_CURRENCY_BOLD_PATH = path.join(FONT_DIR, 'NotoSansBengali-Bold.ttf');
const LOGO_PATH = path.join(__dirname, '..', '..', 'public', 'brand', 'renteasy-logo.png');

const safeNumber = (value) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
};

const safeText = (value, fallback = 'N/A') => {
  const text = value === null || typeof value === 'undefined' ? '' : String(value).trim();
  return text ? text : fallback;
};

const formatAmount = (value) => `${CURRENCY}${safeNumber(value).toLocaleString('en-US')}`;
const formatNumber = (value) => safeNumber(value).toLocaleString('en-US');

const formatDateTime = (value) => {
  if (!value) return 'N/A';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return 'N/A';
  return date.toLocaleString('en-US');
};

const formatMonths = (months = []) => {
  return (months || [])
    .map((month) => monthLabel(month, 'en-US'))
    .filter(Boolean);
};

const statusLabel = (status) => {
  if (status === 'succeeded') return 'SUCCEEDED';
  if (status === 'failed') return 'FAILED';
  return 'PROCESSING';
};

const drawRule = (doc, color = '#e2e8f0') => {
  const left = doc.page.margins.left;
  const width = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const y = doc.y + 6;
  doc.save();
  doc.strokeColor(color).lineWidth(1);
  doc.moveTo(left, y).lineTo(left + width, y).stroke();
  doc.restore();
  doc.y = y + 8;
};

const drawStripeBadge = (doc, { x, y, width, paymentIntentId }) => {
  const badgePaddingX = 8;
  const badgePaddingY = 6;
  const label = 'PAID VIA STRIPE';
  const ref = `Ref: ${paymentIntentId || 'N/A'}`;

  doc.font(FONT_BODY_BOLD).fontSize(9);
  const labelWidth = doc.widthOfString(label);
  doc.font(FONT_BODY).fontSize(9);
  const refWidth = doc.widthOfString(ref);
  const contentWidth = Math.max(labelWidth, refWidth);
  const badgeWidth = Math.min(width, contentWidth + badgePaddingX * 2);
  const lineHeight = doc.currentLineHeight(true);
  const badgeHeight = lineHeight * 2 + badgePaddingY * 2;

  const badgeX = x + width - badgeWidth;
  const badgeY = y;

  doc.save();
  doc.roundedRect(badgeX, badgeY, badgeWidth, badgeHeight, 4).fillAndStroke('#f1f5f9', '#cbd5f5');
  doc.fillColor('#0f172a');
  doc.font(FONT_BODY_BOLD).fontSize(9).text(label, badgeX + badgePaddingX, badgeY + badgePaddingY, {
    width: badgeWidth - badgePaddingX * 2,
    align: 'center',
  });
  doc.font(FONT_BODY).fontSize(9).text(ref, badgeX + badgePaddingX, badgeY + badgePaddingY + lineHeight, {
    width: badgeWidth - badgePaddingX * 2,
    align: 'center',
  });
  doc.restore();

  return badgeHeight;
};

const drawColumnBlock = (doc, { x, y, width, title, lines }) => {
  doc.font(FONT_BODY_BOLD).fontSize(11).fillColor('#0f172a');
  doc.text(title, x, y, { width });
  const titleHeight = doc.heightOfString(title, { width });

  const bodyText = lines.filter(Boolean).join('\n') || 'N/A';
  doc.font(FONT_BODY).fontSize(11).fillColor('#0f172a');
  doc.text(bodyText, x, y + titleHeight + 2, { width });
  const bodyHeight = doc.heightOfString(bodyText, { width });

  return titleHeight + 2 + bodyHeight;
};

const drawTableRow = (doc, description, amount, options = {}) => {
  const {
    bold = false,
    descWidth,
    amountWidth,
    descFont = FONT_BODY,
    descFontBold = FONT_BODY_BOLD,
    amountFont = FONT_CURRENCY,
    amountFontBold = FONT_CURRENCY_BOLD,
  } = options;
  const rowY = doc.y;

  const descTypeface = bold ? descFontBold : descFont;
  const amountTypeface = bold ? amountFontBold : amountFont;

  doc.font(descTypeface).fontSize(11).fillColor('#0f172a');
  const descHeight = doc.heightOfString(description, { width: descWidth });
  doc.font(amountTypeface).fontSize(11);
  const amountHeight = doc.heightOfString(amount, { width: amountWidth });
  const rowHeight = Math.max(descHeight, amountHeight);

  doc.font(descTypeface).fontSize(11).fillColor('#0f172a');
  doc.text(description, doc.page.margins.left, rowY, { width: descWidth, align: 'left' });
  doc.font(amountTypeface).fontSize(11).fillColor('#0f172a');
  doc.text(amount, doc.page.margins.left + descWidth, rowY, {
    width: amountWidth,
    align: 'right',
  });
  doc.y = rowY + rowHeight + 4;
};

const drawTableHeader = (doc, descWidth, amountWidth) => {
  const rowY = doc.y;
  const leftX = doc.page.margins.left;
  const amountX = leftX + descWidth;
  const label = 'Description';
  const prefix = 'Amount (';
  const suffix = ')';

  doc.font(FONT_BODY_BOLD).fontSize(11).fillColor('#0f172a');
  const descHeight = doc.heightOfString(label, { width: descWidth });
  doc.text(label, leftX, rowY, { width: descWidth, align: 'left' });

  doc.font(FONT_BODY_BOLD).fontSize(11);
  const prefixWidth = doc.widthOfString(prefix);
  doc.font(FONT_CURRENCY_BOLD).fontSize(11);
  const symbolWidth = doc.widthOfString(CURRENCY);
  doc.font(FONT_BODY_BOLD).fontSize(11);
  const suffixWidth = doc.widthOfString(suffix);
  const totalWidth = prefixWidth + symbolWidth + suffixWidth;
  const startX = amountX + amountWidth - totalWidth;

  const bodyHeight = doc.heightOfString(`${prefix}${suffix}`, { width: amountWidth });
  doc.font(FONT_CURRENCY_BOLD).fontSize(11);
  const currencyHeight = doc.heightOfString(CURRENCY, { width: amountWidth });
  const rowHeight = Math.max(descHeight, bodyHeight, currencyHeight);

  doc.font(FONT_BODY_BOLD).fontSize(11).fillColor('#0f172a');
  doc.text(prefix, startX, rowY, { continued: true });
  doc.font(FONT_CURRENCY_BOLD).fontSize(11).fillColor('#0f172a');
  doc.text(CURRENCY, { continued: true });
  doc.font(FONT_BODY_BOLD).fontSize(11).fillColor('#0f172a');
  doc.text(suffix);

  doc.y = rowY + rowHeight + 4;
};

const generateReceiptPdf = ({ payment, tenant, landlord, listing, stream }) => {
  const doc = new PDFDocument({ size: 'A4', margin: 50 });
  if (stream) {
    doc.pipe(stream);
  }
  doc.registerFont(FONT_CURRENCY, FONT_CURRENCY_PATH);
  doc.registerFont(FONT_CURRENCY_BOLD, FONT_CURRENCY_BOLD_PATH);

  const contentWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const leftX = doc.page.margins.left;

  const headerY = doc.y;
  const logoWidth = 120;
  let logoHeight = 0;
  try {
    const logo = doc.openImage(LOGO_PATH);
    logoHeight = (logo.height / logo.width) * logoWidth;
    doc.image(logo, leftX, headerY, { width: logoWidth });
  } catch (err) {
    logoHeight = 0;
  }

  const headerGap = 16;
  const headerTextX = leftX + (logoHeight ? logoWidth + headerGap : 0);
  const headerTextWidth = contentWidth - (logoHeight ? logoWidth + headerGap : 0);

  doc.font(FONT_BODY_BOLD).fontSize(20).fillColor('#0f172a');
  doc.text('Rent Payment Receipt', headerTextX, headerY, { width: headerTextWidth, align: 'right' });
  const titleHeight = doc.heightOfString('Rent Payment Receipt', { width: headerTextWidth, align: 'right' });
  const badgeHeight = drawStripeBadge(doc, {
    x: headerTextX,
    y: headerY + titleHeight + 4,
    width: headerTextWidth,
    paymentIntentId: payment?.stripePaymentIntentId,
  });

  doc.y = headerY + Math.max(logoHeight, titleHeight + badgeHeight) + 12;

  doc.font(FONT_BODY).fontSize(11).fillColor('#0f172a');
  const receiptInfo = `Receipt ID: ${safeText(payment?._id)}\nPayment date: ${formatDateTime(
    payment?.paidAt || payment?.createdAt
  )}`;

  const infoY = doc.y;
  doc.text(receiptInfo, leftX, infoY, { width: contentWidth, align: 'left' });
  const infoHeight = doc.heightOfString(receiptInfo, { width: contentWidth });

  doc.y = infoY + infoHeight + 8;
  drawRule(doc);

  doc.font(FONT_BODY_BOLD).fontSize(13).fillColor('#0f172a');
  doc.text('Parties');
  doc.moveDown(0.3);

  const columnGap = 20;
  const columnWidth = (contentWidth - columnGap) / 2;
  const partiesY = doc.y;

  const leftHeight = drawColumnBlock(doc, {
    x: leftX,
    y: partiesY,
    width: columnWidth,
    title: 'Billed To',
    lines: [safeText(tenant?.name), safeText(tenant?.email)],
  });

  const rightHeight = drawColumnBlock(doc, {
    x: leftX + columnWidth + columnGap,
    y: partiesY,
    width: columnWidth,
    title: 'Paid To',
    lines: [safeText(landlord?.name), safeText(landlord?.email)],
  });

  doc.y = partiesY + Math.max(leftHeight, rightHeight) + 8;
  drawRule(doc);

  doc.font(FONT_BODY_BOLD).fontSize(13).fillColor('#0f172a');
  doc.text('Property');
  doc.moveDown(0.3);

  doc.font(FONT_BODY).fontSize(11).fillColor('#0f172a');
  doc.text(`Title: ${safeText(listing?.title)}`);
  doc.text(`Address: ${safeText(formatListingAddress(listing) || 'N/A')}`);
  doc.moveDown(0.6);

  doc.font(FONT_BODY_BOLD).fontSize(13).fillColor('#0f172a');
  doc.text('Payment Details');
  doc.moveDown(0.3);

  doc.font(FONT_BODY).fontSize(11).fillColor('#0f172a');
  doc.text('Months Paid:');
  const months = formatMonths(payment?.monthsPaid);
  if (months.length) {
    months.forEach((month) => doc.text(`• ${month}`));
  } else {
    doc.text('• N/A');
  }
  doc.moveDown(0.2);

  doc.font(FONT_BODY).fontSize(11).fillColor('#0f172a').text('Payment Status: ', { continued: true });
  const status = statusLabel(payment?.status);
  const statusColor = payment?.status === 'succeeded' ? '#16a34a' : payment?.status === 'failed' ? '#dc2626' : '#f59e0b';
  doc.font(FONT_BODY_BOLD).fontSize(11).fillColor(statusColor).text(status);
  doc.fillColor('#0f172a');
  doc.moveDown(0.6);

  doc.font(FONT_BODY_BOLD).fontSize(13).fillColor('#0f172a');
  doc.text('Breakdown');
  doc.moveDown(0.3);

  const descWidth = Math.floor(contentWidth * 0.68);
  const amountWidth = contentWidth - descWidth;

  drawTableHeader(doc, descWidth, amountWidth);
  drawRule(doc, '#cbd5f5');

  const monthsCount = Array.isArray(payment?.monthsPaid) ? payment.monthsPaid.length : 0;
  const rentSubtotal = safeNumber(payment?.rentSubtotal);
  const rentPerMonth = monthsCount ? rentSubtotal / monthsCount : 0;
  const rentLabel = monthsCount
    ? `Rent subtotal (${formatNumber(rentPerMonth)} × ${monthsCount} months)`
    : 'Rent subtotal';
  drawTableRow(doc, rentLabel, formatAmount(rentSubtotal), { descWidth, amountWidth });

  const serviceCharge = safeNumber(payment?.serviceCharge);
  const serviceChargePerMonth = safeNumber(payment?.serviceChargePerMonth);
  const serviceLabel = monthsCount
    ? `Service charge (${formatNumber(serviceChargePerMonth)} × ${monthsCount} months)`
    : 'Service charge';
  drawTableRow(doc, serviceLabel, formatAmount(serviceCharge), { descWidth, amountWidth });

  if (safeNumber(payment?.penaltyAmount) > 0) {
    drawTableRow(doc, 'Penalty', formatAmount(payment?.penaltyAmount), { descWidth, amountWidth });
  }

  drawTableRow(doc, 'Tax (5%)', formatAmount(payment?.tax), { descWidth, amountWidth });
  drawTableRow(doc, 'Platform fee (2%)', formatAmount(payment?.platformFee), { descWidth, amountWidth });

  drawRule(doc, '#cbd5f5');
  drawTableRow(doc, 'TOTAL PAID', formatAmount(payment?.total), { bold: true, descWidth, amountWidth });

  drawRule(doc);
  doc.font(FONT_BODY).fontSize(10).fillColor('#475569');
  doc.text(`Generated on: ${formatDateTime(new Date())}`, { align: 'center' });
  doc.text('This is a system-generated receipt.', { align: 'center' });
  drawRule(doc);

  doc.end();
  return doc;
};

module.exports = { generateReceiptPdf };
