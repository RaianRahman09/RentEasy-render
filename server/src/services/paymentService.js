const stripeSdk = require('stripe');
const Listing = require('../models/Listing');
const Rental = require('../models/Rental');
const { createNotification } = require('../services/notificationService');

const stripe = stripeSdk(process.env.STRIPE_SECRET_KEY || 'sk_test_missing');

const extractReceiptUrl = async (paymentIntent) => {
  const charge = paymentIntent?.charges?.data?.[0];
  if (charge?.receipt_url) return charge.receipt_url;
  if (charge?.id) {
    const retrieved = await stripe.charges.retrieve(charge.id);
    return retrieved?.receipt_url || null;
  }
  return null;
};

const finalizeSucceededPayment = async (payment, paymentIntent) => {
  if (payment.status === 'succeeded') return payment;
  payment.status = 'succeeded';
  payment.paidAt = new Date();
  payment.stripeChargeId = paymentIntent.charges?.data?.[0]?.id || payment.stripeChargeId;
  const receiptUrl = await extractReceiptUrl(paymentIntent);
  if (receiptUrl) {
    payment.receiptUrl = receiptUrl;
  }

  const [listing, rental] = await Promise.all([
    Listing.findById(payment.listingId),
    Rental.findById(payment.rentalId),
  ]);

  await payment.save();

  if (rental?.status === 'active' && listing && listing.status !== 'archived') {
    listing.status = 'archived';
    await listing.save();
  }

  try {
    const listingTitle = listing?.title || 'listing';
    await createNotification({
      userId: payment.tenantId,
      type: 'PAYMENT',
      title: 'Payment successful',
      body: `Your rent payment for ${listingTitle} was successful.`,
      link: '/dashboard/tenant',
      metadata: { paymentId: payment._id },
    });
    await createNotification({
      userId: payment.landlordId,
      type: 'PAYMENT',
      title: 'Rent payment received',
      body: `A tenant paid rent for ${listingTitle}.`,
      link: '/dashboard/landlord/payments',
      metadata: { paymentId: payment._id },
    });
  } catch (notifyErr) {
    console.error('Failed to send payment notifications', notifyErr);
  }

  return payment;
};

const finalizeFailedPayment = async (payment, paymentIntent) => {
  if (payment.status === 'failed') return payment;
  payment.status = 'failed';
  payment.failureReason = paymentIntent?.last_payment_error?.message || payment.failureReason;
  await payment.save();
  try {
    await createNotification({
      userId: payment.tenantId,
      type: 'PAYMENT',
      title: 'Payment failed',
      body: 'Your payment could not be completed. Please try again.',
      link: '/dashboard/tenant',
      metadata: { paymentId: payment._id },
    });
  } catch (notifyErr) {
    console.error('Failed to send payment failure notification', notifyErr);
  }
  return payment;
};

const reconcilePayment = async (payment) => {
  if (!payment?.stripePaymentIntentId || payment.status !== 'processing') return payment;
  const paymentIntent = await stripe.paymentIntents.retrieve(payment.stripePaymentIntentId, {
    expand: ['charges.data'],
  });
  if (paymentIntent.status === 'succeeded') {
    return finalizeSucceededPayment(payment, paymentIntent);
  }
  if (['requires_payment_method', 'canceled'].includes(paymentIntent.status)) {
    return finalizeFailedPayment(payment, paymentIntent);
  }
  return payment;
};

const reconcileProcessingPayments = async (payments = []) => {
  const processing = payments.filter((payment) => payment.status === 'processing' && payment.stripePaymentIntentId);
  if (!processing.length) return payments;
  await Promise.all(
    processing.map((payment) =>
      reconcilePayment(payment).catch((err) => {
        console.error('Failed to reconcile payment', payment._id, err.message || err);
        return payment;
      })
    )
  );
  return payments;
};

module.exports = {
  finalizeSucceededPayment,
  finalizeFailedPayment,
  reconcilePayment,
  reconcileProcessingPayments,
};
