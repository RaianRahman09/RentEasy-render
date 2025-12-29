const Listing = require('../models/Listing');
const Payment = require('../models/Payment');
const User = require('../models/User');

const normalizeAmount = (value) => (Number.isFinite(value) ? value : 0);

exports.getAdminDashboardMetrics = async (_req, res) => {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      activeListings,
      archivedListings,
      totalUsers,
      tenantCount,
      landlordCount,
      revenueBuckets,
    ] = await Promise.all([
      Listing.countDocuments({ status: 'active' }),
      Listing.countDocuments({ status: 'archived' }),
      User.countDocuments({ role: { $in: ['tenant', 'landlord'] } }),
      User.countDocuments({ role: 'tenant' }),
      User.countDocuments({ role: 'landlord' }),
      Payment.aggregate([
        { $match: { status: 'succeeded' } },
        { $addFields: { revenueDate: { $ifNull: ['$paidAt', '$createdAt'] } } },
        {
          $facet: {
            total: [{ $group: { _id: null, amount: { $sum: '$platformFee' } } }],
            thisMonth: [
              { $match: { revenueDate: { $gte: startOfMonth, $lte: now } } },
              { $group: { _id: null, amount: { $sum: '$platformFee' } } },
            ],
          },
        },
      ]),
    ]);

    const revenueSummary = revenueBuckets?.[0] || {};
    const totalRevenue = normalizeAmount(revenueSummary.total?.[0]?.amount);
    const revenueThisMonth = normalizeAmount(revenueSummary.thisMonth?.[0]?.amount);

    return res.json({
      listings: {
        active: activeListings,
        archived: archivedListings,
        total: activeListings + archivedListings,
      },
      users: {
        total: totalUsers,
        tenants: tenantCount,
        landlords: landlordCount,
      },
      revenue: {
        total: totalRevenue,
        thisMonth: revenueThisMonth,
        currency: 'BDT',
      },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Failed to load admin metrics' });
  }
};
