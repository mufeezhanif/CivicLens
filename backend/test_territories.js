/**
 * Test territory endpoints
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3000/api/v1';

async function testTerritories() {
  try {
    console.log('Testing UC boundaries endpoint...\n');
    const ucResponse = await axios.get(`${BASE_URL}/territories?level=UC&city=Karachi`);
    console.log('✓ UC Endpoint Success:', ucResponse.data.success);
    console.log('✓ UC Count:', ucResponse.data.count);
    console.log('✓ UC Level:', ucResponse.data.level);
    
    if (ucResponse.data.territories && ucResponse.data.territories.length > 0) {
      const firstUC = ucResponse.data.territories[0];
      console.log('\nFirst UC Details:');
      console.log('  Name:', firstUC.uc_name);
      console.log('  Code:', firstUC.code);
      console.log('  UC ID:', firstUC.uc_id);
      console.log('  Town:', firstUC.town);
      console.log('  City:', firstUC.city);
      console.log('  Population:', firstUC.population);
      console.log('  Area:', firstUC.area);
      console.log('  Has Geometry:', !!firstUC.geometry);
      console.log('  Has Center:', !!firstUC.center);
      console.log('  Has Stats:', !!firstUC.stats);
      if (firstUC.stats) {
        console.log('  Stats:', JSON.stringify(firstUC.stats, null, 2));
      }
    }

    console.log('\n\nTesting Town boundaries endpoint...\n');
    const townResponse = await axios.get(`${BASE_URL}/territories?level=Town&city=Karachi`);
    console.log('✓ Town Endpoint Success:', townResponse.data.success);
    console.log('✓ Town Count:', townResponse.data.count);
    console.log('✓ Town Level:', townResponse.data.level);
    
    if (townResponse.data.territories && townResponse.data.territories.length > 0) {
      const firstTown = townResponse.data.territories[0];
      console.log('\nFirst Town Details:');
      console.log('  Name:', firstTown.town_name);
      console.log('  Code:', firstTown.code);
      console.log('  Town ID:', firstTown.town_id);
      console.log('  City:', firstTown.city);
      console.log('  Population:', firstTown.population);
      console.log('  Has Geometry:', !!firstTown.geometry);
      console.log('  Has Center:', !!firstTown.center);
      console.log('  Has Stats:', !!firstTown.stats);
      console.log('  District:', firstTown.district);
      console.log('  District Color:', firstTown.districtColor);
      if (firstTown.stats) {
        console.log('  Stats:', JSON.stringify(firstTown.stats, null, 2));
      }
    }

  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

testTerritories();
