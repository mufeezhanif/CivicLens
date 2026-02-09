/**
 * Test Users Seeding Script
 * Creates one test user for each role in the CivicLens system
 *
 * Run: node scripts/seed-test-users.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../src/models/User');
const City = require('../src/models/City');
const Town = require('../src/models/Town');
const UC = require('../src/models/UC');

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/civiclens';

/**
 * Test user data for each role
 */
const testUsers = [
  {
    name: 'Test Citizen',
    email: 'citizen@test.com',
    password: 'TestPass123!',
    role: 'citizen',
    phone: '+923001234567',
    isVerified: true,
  },
  {
    name: 'Test UC Chairman',
    email: 'uc_chairman@test.com',
    password: 'TestPass123!',
    role: 'uc_chairman',
    phone: '+923001234568',
    nic: '42201-1234567-1', // Sample NIC
    isVerified: true,
  },
  {
    name: 'Test Town Chairman',
    email: 'town_chairman@test.com',
    password: 'TestPass123!',
    role: 'town_chairman',
    phone: '+923001234569',
    nic: '42201-1234567-2',
    isVerified: true,
  },
  {
    name: 'Test Mayor',
    email: 'mayor@test.com',
    password: 'TestPass123!',
    role: 'mayor',
    phone: '+923001234570',
    nic: '42201-1234567-3',
    isVerified: true,
  },
  {
    name: 'Test Website Admin',
    email: 'admin@test.com',
    password: 'TestPass123!',
    role: 'website_admin',
    phone: '+923001234571',
    isVerified: true,
  },
];

/**
 * Main seeding function
 */
async function seedTestUsers() {
  try {
    console.log('🚀 Starting Test Users Seeding...\n');
    console.log('=' .repeat(50));

    // Connect to MongoDB
    console.log('📡 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Get hierarchy references
    console.log('🔍 Fetching hierarchy references...');

    const city = await City.findOne({ code: 'KHI' });
    if (!city) {
      throw new Error('Karachi city not found. Please run seed-complete-hierarchy.js first.');
    }

    const town = await Town.findOne({ city: city._id });
    if (!town) {
      throw new Error('No town found for Karachi. Please run seed-complete-hierarchy.js first.');
    }

    const uc = await UC.findOne({ town: town._id });
    if (!uc) {
      throw new Error('No UC found for the town. Please run seed-complete-hierarchy.js first.');
    }

    console.log(`✅ Found City: ${city.name}`);
    console.log(`✅ Found Town: ${town.name}`);
    console.log(`✅ Found UC: ${uc.name}\n`);

    // Seed users
    console.log('👥 Creating test users...');
    console.log('=' .repeat(50));

    const createdUsers = [];

    for (const userData of testUsers) {
      try {
        // Check if user already exists
        let existingUser = await User.findOne({ email: userData.email }).select('+password');
        if (existingUser) {
          console.log(`⚠️  User ${userData.email} already exists, updating password...`);
          
          // Update password and ensure user is active and verified
          existingUser.password = userData.password;
          existingUser.isActive = true;
          existingUser.isVerified = true;
          existingUser.loginAttempts = 0;
          existingUser.lockUntil = undefined;
          
          // Update hierarchy references if needed
          if (userData.role === 'uc_chairman' && !existingUser.ucId) {
            existingUser.ucId = uc._id;
          } else if (userData.role === 'town_chairman' && !existingUser.townId) {
            existingUser.townId = town._id;
          } else if (userData.role === 'mayor' && !existingUser.cityId) {
            existingUser.cityId = city._id;
          }
          
          await existingUser.save();
          createdUsers.push(existingUser);
          console.log(`✅ Updated: ${existingUser.name} (${existingUser.role})`);
          console.log(`   📧 Email: ${existingUser.email}`);
          console.log(`   🔑 Password: ${userData.password}`);
          console.log('');
          continue;
        }

        // Prepare user data with hierarchy references
        const userDoc = { ...userData };

        if (userData.role === 'uc_chairman') {
          userDoc.ucId = uc._id;
        } else if (userData.role === 'town_chairman') {
          userDoc.townId = town._id;
        } else if (userData.role === 'mayor') {
          userDoc.cityId = city._id;
        }

        // Create user
        const user = await User.create(userDoc);
        createdUsers.push(user);

        console.log(`✅ Created: ${userData.name} (${userData.role})`);
        console.log(`   📧 Email: ${userData.email}`);
        console.log(`   🔑 Password: ${userData.password}`);
        console.log(`   📱 Phone: ${userData.phone}`);
        if (userData.nic) {
          console.log(`   🆔 NIC: ${userData.nic}`);
        }
        console.log('');

      } catch (err) {
        console.error(`❌ Error creating ${userData.name}: ${err.message}`);
      }
    }

    console.log('=' .repeat(50));
    console.log('🎉 SEEDING COMPLETED!');
    console.log('=' .repeat(50));
    console.log(`📊 Total users created: ${createdUsers.length}`);
    console.log('');
    console.log('🔐 TEST CREDENTIALS:');
    console.log('=' .repeat(50));

    createdUsers.forEach(user => {
      const userData = testUsers.find(u => u.email === user.email);
      console.log(`${user.role.toUpperCase()}:`);
      console.log(`  Email: ${user.email}`);
      console.log(`  Password: ${userData.password}`);
      console.log('');
    });

    console.log('✅ You can now login with these credentials!');
    console.log('💡 Use these for testing different role permissions.');

  } catch (error) {
    console.error('\n❌ SEEDING FAILED:', error);
    console.error('Stack:', error.stack);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('\n👋 Disconnected from MongoDB');
  }
}

// Run the seeder
if (require.main === module) {
  seedTestUsers();
}

module.exports = { seedTestUsers };