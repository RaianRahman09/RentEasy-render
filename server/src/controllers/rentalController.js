const Listing = require('../models/Listing');
const Rental = require('../models/Rental');
const Payment = require('../models/Payment');
const User = require('../models/User');
const {
  MONTH_REGEX,
  addMonths,
  currentMonth,
  listMonths,
  compareMonths,
  nextUnpaidMonth,
  monthLabel,
} = require('../utils/months');
const { createNotification } = require('../services/notificationService');
const { reconcileProcessingPayments } = require('../services/paymentService');
const { sendMail } = require('../utils/mailer');
const { buildMoveOutNoticeEmail } = require('../utils/rentalEmail');

const collectPaymentMonths = (payments = []) => {
  const paidMonths = new Set();
  const blockedMonths = new Set();
  const processingMonths = new Set();
  payments.forEach((payment) => {
    (payment.monthsPaid || []).forEach((month) => {
      blockedMonths.add(month);
      if (payment.status === 'succeeded') {
        paidMonths.add(month);
      }
      if (payment.status === 'processing') {
        processingMonths.add(month);
      }
    });
  });
  return { paidMonths, blockedMonths, processingMonths };
};

const resolveListingImages = (listing) => {
  if (Array.isArray(listing.images) && listing.images.length) return listing.images;
  if (Array.isArray(listing.imageUrls) && listing.imageUrls.length) return listing.imageUrls;
  if (Array.isArray(listing.photos) && listing.photos.length) return listing.photos;
  return [];
};

const buildListingSummary = (listing) => {
  const images = resolveListingImages(listing);
  return {
    _id: listing._id,
    title: listing.title,
    address: listing.address,
    location: listing.location,
    rent: listing.rent,
    rentPrice: listing.rent,
    serviceCharge: Number(listing.serviceCharge || 0),
    rentStartMonth: listing.rentStartMonth,
    photos: listing.photos || [],
    images,
    listingThumbnail: images[0] || null,
    roomType: listing.roomType,
  };
};

const calculateTotals = ({ rentPrice, serviceChargePerMonth, monthsCount, fineAmount }) => {
  const normalizedServiceCharge = Number(serviceChargePerMonth || 0);
  const rentSubtotal = rentPrice * monthsCount;
  const serviceChargeTotal = normalizedServiceCharge * monthsCount;
  const base = rentSubtotal + serviceChargeTotal + fineAmount;
  const tax = Math.round(base * 0.05);
  const platformFee = Math.round(base * 0.02);
  const total = base + tax + platformFee;
  return {
    rentSubtotal,
    serviceCharge: serviceChargeTotal,
    serviceChargeTotal,
    serviceChargePerMonth: normalizedServiceCharge,
    tax,
    platformFee,
    total,
  };
};

const computeMoveOutDue = async (rental, listing) => {
  const moveOutMonth = rental.moveOutNoticeMonth;
  const nowMonth = currentMonth();
  const noticeMonth = rental.moveOutNoticeGivenAt ? currentMonth(rental.moveOutNoticeGivenAt) : nowMonth;
  const noticeValidMonth = addMonths(noticeMonth, 1);
  const fineAmount = compareMonths(moveOutMonth, noticeValidMonth) < 0 ? listing.rent : 0;
  const overstay = compareMonths(nowMonth, moveOutMonth) > 0;
  const requiredPaidUntil = overstay ? nowMonth : moveOutMonth;

  const payments = await Payment.find({
    rentalId: rental._id,
    status: { $in: ['succeeded', 'processing'] },
  });
  await reconcileProcessingPayments(payments);
  const activePayments = payments.filter((payment) => ['succeeded', 'processing'].includes(payment.status));
  const { paidMonths, blockedMonths, processingMonths } = collectPaymentMonths(activePayments);

  const nextMonth = nextUnpaidMonth(rental.startMonth, paidMonths);
  const dueRange =
    nextMonth && compareMonths(nextMonth, requiredPaidUntil) <= 0 ? listMonths(nextMonth, requiredPaidUntil) : [];
  const dueMonths = dueRange.filter((month) => !paidMonths.has(month));
  const processingOverlap = dueMonths.some((month) => processingMonths.has(month));

  return {
    dueMonths,
    fineAmount,
    overstay,
    requiredPaidUntil,
    paidMonths,
    blockedMonths,
    processingMonths,
    processingOverlap,
  };
};

exports.startRental = async (req, res) => {
  try {
    const listing = await Listing.findById(req.params.listingId);
    if (!listing) return res.status(404).json({ message: 'Listing not found.' });
    if (listing.status !== 'active') {
      return res.status(400).json({ message: 'This listing is not available for rent.' });
    }

    let rental = await Rental.findOne({
      tenantId: req.user.id,
      listingId: listing._id,
      status: 'active',
    });

    if (!rental) {
      rental = await Rental.create({
        tenantId: req.user.id,
        landlordId: listing.owner,
        listingId: listing._id,
        startMonth: listing.rentStartMonth,
        status: 'active',
      });
    }

    const payments = await Payment.find({
      rentalId: rental._id,
      status: { $in: ['succeeded', 'processing'] },
    });
    await reconcileProcessingPayments(payments);
    const activePayments = payments.filter((payment) => ['succeeded', 'processing'].includes(payment.status));
    const { paidMonths, blockedMonths } = collectPaymentMonths(activePayments);
    const nextMonth = nextUnpaidMonth(rental.startMonth, blockedMonths);
    const startMonthPaid = paidMonths.has(listing.rentStartMonth);
    const shouldLockStart = !startMonthPaid && !blockedMonths.has(listing.rentStartMonth);

    return res.json({
      rentalId: rental._id,
      rental,
      listing: buildListingSummary(listing),
      paidMonths: Array.from(paidMonths),
      blockedMonths: Array.from(blockedMonths),
      recommendedMonths: nextMonth ? [nextMonth] : [],
      lockedMonths: shouldLockStart ? [listing.rentStartMonth] : [],
      nextUnpaidMonth: nextMonth,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Failed to start rental.' });
  }
};

exports.getRentalById = async (req, res) => {
  try {
    const rental = await Rental.findOne({ _id: req.params.id, tenantId: req.user.id }).populate(
      'listingId'
    );
    if (!rental) return res.status(404).json({ message: 'Rental not found.' });

    const payments = await Payment.find({
      rentalId: rental._id,
      status: { $in: ['succeeded', 'processing'] },
    });
    await reconcileProcessingPayments(payments);
    const activePayments = payments.filter((payment) => ['succeeded', 'processing'].includes(payment.status));
    const { paidMonths, blockedMonths } = collectPaymentMonths(activePayments);
    const nextMonth = nextUnpaidMonth(rental.startMonth, blockedMonths);
    const startMonthPaid = paidMonths.has(rental.listingId?.rentStartMonth);
    const shouldLockStart = !startMonthPaid && !blockedMonths.has(rental.listingId?.rentStartMonth);

    return res.json({
      rental,
      listing: buildListingSummary(rental.listingId),
      paidMonths: Array.from(paidMonths),
      blockedMonths: Array.from(blockedMonths),
      nextUnpaidMonth: nextMonth,
      lockedMonths: shouldLockStart && rental.listingId?.rentStartMonth ? [rental.listingId.rentStartMonth] : [],
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Failed to load rental.' });
  }
};

exports.getTenantRentals = async (req, res) => {
  try {
    const rentals = await Rental.find({ tenantId: req.user.id, status: 'active' }).populate('listingId');
    const results = [];

    for (const rental of rentals) {
      const payments = await Payment.find({
        rentalId: rental._id,
        status: 'succeeded',
      }).select('monthsPaid');
      const { paidMonths } = collectPaymentMonths(
        payments.map((p) => ({ ...p.toObject(), status: 'succeeded' }))
      );
      const nextMonth = nextUnpaidMonth(rental.startMonth, paidMonths);
      results.push({
        rentalId: rental._id,
        startMonth: rental.startMonth,
        moveOutNoticeMonth: rental.moveOutNoticeMonth || null,
        moveOutNoticeGivenAt: rental.moveOutNoticeGivenAt || null,
        listing: buildListingSummary(rental.listingId),
        nextPaymentMonth: nextMonth,
        nextPaymentDate: nextMonth ? `${nextMonth}-01` : null,
      });
    }

    return res.json({ rentals: results });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Failed to load rentals.' });
  }
};

exports.giveMoveOutNotice = async (req, res) => {
  try {
    const { moveOutMonth } = req.body || {};
    if (!MONTH_REGEX.test(moveOutMonth || '')) {
      return res.status(400).json({ message: 'Move-out month must be in YYYY-MM format.' });
    }

    const rental = await Rental.findOne({
      _id: req.params.rentalId,
      tenantId: req.user.id,
      status: 'active',
    }).populate('listingId');
    if (!rental) return res.status(404).json({ message: 'Rental not found.' });
    if (rental.moveOutNoticeMonth) {
      return res.status(400).json({ message: 'Move-out notice already given.' });
    }
    if (compareMonths(moveOutMonth, rental.startMonth) < 0) {
      return res.status(400).json({ message: 'Move-out month cannot be before the rental start month.' });
    }
    if (compareMonths(moveOutMonth, currentMonth()) < 0) {
      return res.status(400).json({ message: 'Move-out month cannot be in the past.' });
    }

    rental.moveOutNoticeMonth = moveOutMonth;
    rental.moveOutNoticeGivenAt = new Date();
    await rental.save();

    const listingTitle = rental.listingId?.title || 'listing';
    const moveOutLabel = monthLabel(moveOutMonth);
    const [tenant, landlord] = await Promise.all([
      User.findById(rental.tenantId).select('name email'),
      User.findById(rental.landlordId).select('name email'),
    ]);

    try {
      await createNotification({
        userId: rental.landlordId,
        actorId: rental.tenantId,
        type: 'RENTAL',
        title: 'Move-out notice received',
        body: `${tenant?.name || 'A tenant'} will leave ${listingTitle} in ${moveOutLabel}.`,
        link: '/landlord/listings',
        metadata: { rentalId: rental._id, listingId: rental.listingId?._id, moveOutMonth },
      });
    } catch (notifyErr) {
      console.error('Failed to notify landlord for move-out notice', notifyErr);
    }

    if (landlord?.email) {
      await sendMail({
        to: landlord.email,
        subject: `Move-out notice: ${listingTitle}`,
        html: buildMoveOutNoticeEmail({
          recipientName: landlord.name,
          tenantName: tenant?.name,
          listingTitle,
          moveOutLabel,
        }),
      });
    }

    return res.json({ rental });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Failed to submit move-out notice.' });
  }
};

exports.getMoveOutDue = async (req, res) => {
  try {
    const rental = await Rental.findOne({
      _id: req.params.rentalId,
      tenantId: req.user.id,
      status: 'active',
    }).populate('listingId');
    if (!rental) return res.status(404).json({ message: 'Rental not found.' });
    if (!rental.moveOutNoticeMonth) {
      return res.status(400).json({ message: 'Give move-out notice first.' });
    }

    const listing = rental.listingId;
    if (!listing) return res.status(404).json({ message: 'Listing not found.' });

    const due = await computeMoveOutDue(rental, listing);
    if (due.processingOverlap) {
      return res
        .status(409)
        .json({ message: 'A payment is still processing. Please wait for confirmation.' });
    }

    const breakdown = calculateTotals({
      rentPrice: listing.rent,
      serviceChargePerMonth: listing.serviceCharge,
      monthsCount: due.dueMonths.length,
      fineAmount: due.fineAmount,
    });

    const response = {
      dueMonths: due.dueMonths,
      fineAmount: due.fineAmount,
      breakdown,
      moveOutMonth: rental.moveOutNoticeMonth,
    };
    if (due.overstay) {
      response.overstay = true;
      response.message = `Move-out month has passed. Please settle rent through ${monthLabel(
        due.requiredPaidUntil
      )}.`;
    }

    return res.json(response);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Failed to calculate move-out due.' });
  }
};

exports.leaveRental = async (req, res) => {
  try {
    const rental = await Rental.findOne({
      _id: req.params.rentalId,
      tenantId: req.user.id,
      status: 'active',
    }).populate('listingId');
    if (!rental) return res.status(404).json({ message: 'Rental not found.' });
    if (!rental.moveOutNoticeMonth) {
      return res.status(400).json({ message: 'Give move-out notice first.' });
    }

    const listing = rental.listingId;
    if (!listing) return res.status(404).json({ message: 'Listing not found.' });

    const due = await computeMoveOutDue(rental, listing);
    if (due.processingOverlap) {
      return res
        .status(409)
        .json({ message: 'A payment is still processing. Please wait for confirmation.' });
    }
    if (due.dueMonths.length) {
      return res.status(400).json({
        message: `Please clear due rent for ${due.dueMonths.join(', ')} before leaving.`,
        dueMonths: due.dueMonths,
      });
    }
    if (due.fineAmount > 0) {
      const penaltyPayment = await Payment.findOne({
        rentalId: rental._id,
        status: 'succeeded',
        penaltyAmount: { $gte: due.fineAmount },
      }).sort({ createdAt: -1 });
      if (!penaltyPayment) {
        return res.status(400).json({ message: 'Please pay the move-out notice fine before leaving.' });
      }
    }

    rental.status = 'ended';
    rental.endedAt = new Date();
    rental.endMonth = due.requiredPaidUntil || rental.moveOutNoticeMonth;
    await rental.save();

    await Listing.findByIdAndUpdate(listing._id, { status: 'active' });

    try {
      const tenant = await User.findById(rental.tenantId).select('name');
      await createNotification({
        userId: rental.landlordId,
        actorId: rental.tenantId,
        type: 'RENTAL',
        title: 'Tenant left property',
        body: `${tenant?.name || 'A tenant'} has left ${listing.title || 'your listing'}.`,
        link: '/landlord/listings',
        metadata: { rentalId: rental._id, listingId: listing._id },
      });
    } catch (notifyErr) {
      console.error('Failed to notify landlord for move-out completion', notifyErr);
    }

    return res.json({ ended: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Failed to leave rental.' });
  }
};

exports.stopRental = async (req, res) => {
  try {
    const { moveOutMonth } = req.body;
    if (!MONTH_REGEX.test(moveOutMonth || '')) {
      return res.status(400).json({ message: 'Move-out month must be in YYYY-MM format.' });
    }

    const rental = await Rental.findOne({ _id: req.params.id, tenantId: req.user.id, status: 'active' }).populate(
      'listingId'
    );
    if (!rental) return res.status(404).json({ message: 'Rental not found.' });

    const payments = await Payment.find({
      rentalId: rental._id,
      status: 'succeeded',
    }).select('monthsPaid');
    const { paidMonths } = collectPaymentMonths(
      payments.map((p) => ({ ...p.toObject(), status: 'succeeded' }))
    );

    const current = currentMonth();
    const dueMonths = listMonths(rental.startMonth, current).filter((month) => !paidMonths.has(month));
    if (dueMonths.length) {
      try {
        await createNotification({
          userId: req.user.id,
          type: 'PAYMENT',
          title: 'Rent due before move-out',
          body: `Please clear due rent for ${dueMonths.join(', ')} before leaving.`,
          link: '/dashboard/tenant',
        });
      } catch (notifyErr) {
        console.error('Failed to notify tenant for due rent', notifyErr);
      }
      return res.status(400).json({
        message: `Please clear due rent for ${dueMonths.join(', ')} before leaving.`,
        dueMonths,
      });
    }

    const noticeCutoff = addMonths(current, 1);
    const penaltyAmount = compareMonths(moveOutMonth, noticeCutoff) < 0 ? rental.listingId.rent : 0;

    const nextRequired = nextUnpaidMonth(rental.startMonth, paidMonths);
    const requiredMonths =
      nextRequired && compareMonths(moveOutMonth, nextRequired) >= 0
        ? listMonths(nextRequired, moveOutMonth)
        : [];

    if (!requiredMonths.length && !penaltyAmount) {
      rental.status = 'ended';
      rental.endedAt = new Date();
      rental.endMonth = moveOutMonth;
      await rental.save();

      try {
        await createNotification({
          userId: req.user.id,
          type: 'PAYMENT',
          title: 'Move-out confirmed',
          body: `Your rental has been ended for ${moveOutMonth}.`,
          link: '/dashboard/tenant',
        });
      } catch (notifyErr) {
        console.error('Failed to notify tenant for move-out', notifyErr);
      }

      return res.json({ ended: true });
    }

    return res.json({
      ended: false,
      rentalId: rental._id,
      moveOutMonth,
      requiredMonths,
      penaltyAmount,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Failed to stop rental.' });
  }
};
