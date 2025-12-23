require('dotenv').config();
const mongoose = require('mongoose');
const app = require('./app');
const connectDB = require('./config/db');
const User = require('./models/User');
const Listing = require('./models/Listing');

const PORT = process.env.PORT || 5000;

const seedAdmin = async () => {
  const email = process.env.SEED_ADMIN_EMAIL;
  const password = process.env.SEED_ADMIN_PASSWORD;
  if (!email || !password) return;
  const existing = await User.findOne({ email });
  if (existing) return;
  await User.create({ name: 'Admin', email, password, role: 'admin' });
  console.log(`Seeded admin ${email}`);
};

const seedLandlordSample = async () => {
  const listingCount = await Listing.countDocuments();
  if (listingCount > 0) return;

  let landlord = await User.findOne({ email: 'landlord@example.com' });
  if (!landlord) {
    landlord = await User.create({
      name: 'Sample Landlord',
      email: 'landlord@example.com',
      password: 'Landlord@123',
      role: 'landlord',
      verificationStatus: 'verified',
    });
    console.log('Seeded sample landlord');
  }

  const demoListings = [
    {
      title: 'Modern Apartment in Downtown',
      description: 'Spacious 2 bed with skyline views.',
      rent: 1500,
      address: 'Manhattan, NY, USA',
      roomType: 'Entire Place',
      beds: 2,
      baths: 1,
      amenities: ['Wi-Fi', 'Air Conditioning', 'Gym', 'Parking'],
      photos: [],
      status: 'active',
      featured: true,
      location: {
        type: 'Point',
        coordinates: [-73.9712, 40.7831],
      },
    },
    {
      title: 'Cozy Studio Near Park',
      description: 'Bright studio close to transit and park.',
      rent: 1100,
      address: 'Brooklyn, NY, USA',
      roomType: 'Studio',
      beds: 1,
      baths: 1,
      amenities: ['Wi-Fi', 'Washer/Dryer'],
      photos: [],
      status: 'active',
      featured: true,
      location: {
        type: 'Point',
        coordinates: [-73.9442, 40.6782],
      },
    },
  ];
  await Listing.insertMany(demoListings.map((d) => ({ ...d, owner: landlord._id })));
  console.log('Seeded sample listings');
};

const start = async () => {
  await connectDB(process.env.MONGO_URI);
  await seedAdmin();
  await seedLandlordSample();
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
};

mongoose.set('strictQuery', false);
start();
