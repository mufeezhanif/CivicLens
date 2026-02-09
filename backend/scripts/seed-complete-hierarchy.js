/**
 * Complete Hierarchy Seeding Script
 * Seeds City (Karachi) → Towns (25) → UCs (200+) with GeoJSON boundaries
 * 
 * Run: node scripts/seed-complete-hierarchy.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const City = require('../src/models/City');
const Town = require('../src/models/Town');
const UC = require('../src/models/UC');

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/civiclens';

// Import geometry generation from generate_karachi_geo.js
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

/**
 * Generate complete hierarchy data using the geometry generator
 */
function generateHierarchyData() {
  console.log('🔧 Generating GeoJSON boundaries...');
  
  const scriptPath = path.join(__dirname, 'generate_karachi_geo.js');
  const output = execSync(`node ${scriptPath}`, { encoding: 'utf8' });
  
  return JSON.parse(output);
}

/**
 * Main seeding function
 */
async function seedCompleteHierarchy() {
  try {
    console.log('🚀 Starting Complete Karachi Hierarchy Seeding...\n');
    console.log('=' .repeat(60));
    
    // Connect to MongoDB
    console.log('📡 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Generate hierarchy data with boundaries
    const hierarchyData = generateHierarchyData();
    console.log('✅ Generated GeoJSON boundaries\n');

    // Step 1: Seed City
    console.log('=' .repeat(60));
    console.log('📍 STEP 1: Seeding Karachi City');
    console.log('=' .repeat(60));
    
    let city = await City.findOne({ code: hierarchyData.city.code });
    
    if (!city) {
      city = await City.create(hierarchyData.city);
      console.log(`✨ Created: ${hierarchyData.city.name}`);
    } else {
      Object.assign(city, hierarchyData.city);
      await city.save();
      console.log(`♻️  Updated: ${hierarchyData.city.name}`);
    }
    
    console.log(`   📌 City ID: ${city._id}`);
    console.log(`   📊 Total Towns: ${hierarchyData.city.totalTowns}`);
    console.log(`   📊 Total UCs: ${hierarchyData.city.totalUCs}\n`);

    // Step 2: Seed Towns
    console.log('=' .repeat(60));
    console.log('🏘️  STEP 2: Seeding Towns');
    console.log('=' .repeat(60));
    
    let townsCreated = 0;
    let townsUpdated = 0;
    const townMap = new Map(); // code -> _id mapping

    for (const townData of hierarchyData.towns) {
      try {
        let town = await Town.findOne({ code: townData.code });
        
        const townDoc = {
          ...townData,
          city: city._id, // Link to city
        };

        if (!town) {
          town = await Town.create(townDoc);
          console.log(`  ✅ Created: ${townData.name} (${townData.totalUCs} UCs)`);
          townsCreated++;
        } else {
          Object.assign(town, townDoc);
          await town.save();
          console.log(`  ♻️  Updated: ${townData.name} (${townData.totalUCs} UCs)`);
          townsUpdated++;
        }

        townMap.set(townData.code, town._id);
      } catch (err) {
        console.error(`  ❌ Error with ${townData.name}: ${err.message}`);
      }
    }

    console.log(`\n📊 Towns Summary: ${townsCreated} created, ${townsUpdated} updated\n`);

    // Step 3: Seed UCs
    console.log('=' .repeat(60));
    console.log('🏛️  STEP 3: Seeding Union Councils (UCs)');
    console.log('=' .repeat(60));
    
    let ucsCreated = 0;
    let ucsUpdated = 0;
    let ucErrors = 0;

    for (const ucData of hierarchyData.ucs) {
      try {
        let uc = await UC.findOne({ code: ucData.code });
        
        const ucDoc = {
          ...ucData,
          town: ucData.town, // Already has ObjectId from generator
          city: city._id,
        };

        if (!uc) {
          uc = await UC.create(ucDoc);
          if (ucsCreated % 20 === 0) {
            console.log(`  ✅ Progress: ${ucsCreated} UCs created...`);
          }
          ucsCreated++;
        } else {
          Object.assign(uc, ucDoc);
          await uc.save();
          ucsUpdated++;
        }
      } catch (err) {
        console.error(`  ❌ Error with ${ucData.name}: ${err.message}`);
        ucErrors++;
      }
    }

    console.log(`\n📊 UCs Summary: ${ucsCreated} created, ${ucsUpdated} updated, ${ucErrors} errors\n`);

    // Step 4: Verify and Update Stats
    console.log('=' .repeat(60));
    console.log('📊 STEP 4: Verification & Statistics');
    console.log('=' .repeat(60));
    
    const [actualTownCount, actualUCCount] = await Promise.all([
      Town.countDocuments({ city: city._id, isActive: true }),
      UC.countDocuments({ city: city._id, isActive: true }),
    ]);

    console.log(`\n✅ Database Verification:`);
    console.log(`   🏘️  Towns: ${actualTownCount} (Expected: ${hierarchyData.city.totalTowns})`);
    console.log(`   🏛️  UCs: ${actualUCCount} (Expected: ${hierarchyData.city.totalUCs})`);

    // Update city stats
    city.stats.totalTowns = actualTownCount;
    city.stats.totalUCs = actualUCCount;
    await city.save();
    console.log(`   ✅ City statistics updated\n`);

    // Town-wise breakdown
    console.log('📋 Town-wise UC Distribution:');
    const townStats = await UC.aggregate([
      { $match: { city: city._id, isActive: true } },
      { $group: { _id: '$town', count: { $sum: 1 } } },
      { $lookup: { from: 'towns', localField: '_id', foreignField: '_id', as: 'townInfo' } },
      { $project: { townName: { $arrayElemAt: ['$townInfo.name', 0] }, count: 1 } },
      { $sort: { count: -1 } },
    ]);

    townStats.slice(0, 10).forEach((stat, idx) => {
      console.log(`   ${idx + 1}. ${stat.townName}: ${stat.count} UCs`);
    });
    console.log(`   ... and ${townStats.length - 10} more towns\n`);

    // Final Summary
    console.log('=' .repeat(60));
    console.log('🎉 SEEDING COMPLETED SUCCESSFULLY!');
    console.log('=' .repeat(60));
    console.log(`📍 City: ${city.name} (${city.code})`);
    console.log(`🏘️  Towns: ${actualTownCount}`);
    console.log(`🏛️  UCs: ${actualUCCount}`);
    console.log(`📊 Total Entities: ${1 + actualTownCount + actualUCCount}`);
    console.log('=' .repeat(60) + '\n');

    console.log('✅ You can now:');
    console.log('   1. Start the backend server: npm run dev');
    console.log('   2. Test hierarchy endpoints: /api/v1/hierarchy/*');
    console.log('   3. Create complaints with geo-location');
    console.log('   4. Assign UC Chairmen to manage UCs\n');

  } catch (error) {
    console.error('\n❌ SEEDING FAILED:', error);
    console.error('Stack:', error.stack);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('👋 Disconnected from MongoDB');
  }
}

// Run the seeder
if (require.main === module) {
  seedCompleteHierarchy();
}

module.exports = { seedCompleteHierarchy };
