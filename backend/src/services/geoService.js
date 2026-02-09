const turf = require('@turf/turf');
const redisService = require('./redisService');

/**
 * Geo Service
 * Handles reverse geocoding and location-based operations
 * Uses FREE services only (no credit card required):
 * - Nominatim (OpenStreetMap) for geocoding
 * - Turf.js for spatial operations (UC/Town boundary matching)
 */
class GeoService {
  constructor() {
    // Rate limiting for Nominatim (max 1 request/second as per their policy)
    this.lastNominatimRequest = 0;
    this.nominatimRateLimit = 1000; // 1 second between requests
    
    // Cache TTL for geocoding results
    this.geocodeCacheTTL = 86400; // 24 hours
    
    console.log('✅ GeoService initialized (Nominatim + Turf.js - 100% FREE)');
  }

  /**
   * Respect Nominatim rate limiting
   */
  async waitForRateLimit() {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastNominatimRequest;
    
    if (timeSinceLastRequest < this.nominatimRateLimit) {
      await new Promise(resolve => 
        setTimeout(resolve, this.nominatimRateLimit - timeSinceLastRequest)
      );
    }
    
    this.lastNominatimRequest = Date.now();
  }

  /**
   * Reverse geocode coordinates to get address details
   * @param {number} latitude - Latitude
   * @param {number} longitude - Longitude
   * @returns {Object} - Location details
   */
  async reverseGeocode(latitude, longitude) {
    // Check cache first
    const cacheKey = `geocode:reverse:${latitude.toFixed(6)}:${longitude.toFixed(6)}`;
    const cached = await redisService.get(cacheKey);
    if (cached) {
      return cached;
    }

    const result = await this.reverseGeocodeNominatim(latitude, longitude);
    
    // Cache the result
    if (result && result.address !== `Location: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`) {
      await redisService.set(cacheKey, result, this.geocodeCacheTTL);
    }
    
    return result;
  }

  /**
   * Reverse geocode using Nominatim (OpenStreetMap) - FREE, no API key needed
   * Respects rate limiting as per Nominatim usage policy
   */
  async reverseGeocodeNominatim(latitude, longitude) {
    try {
      await this.waitForRateLimit();
      
      const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`;
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'CivicLens/1.0 (civic-complaint-system@email.com)',
          'Accept-Language': 'en',
          'Accept': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`Nominatim returned ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data && data.address) {
        return {
          type: 'Point',
          coordinates: [longitude, latitude],
          address: data.display_name || `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`,
          area: this.extractArea(data.address),
          ward: data.address.quarter || data.address.suburb || '',
          pincode: data.address.postcode || '',
          city: data.address.city || data.address.town || data.address.municipality || 'Karachi',
          country: data.address.country || 'Pakistan',
          raw: data.address, // Keep raw data for UC/Town matching
        };
      }
      
      return this.getPlaceholderLocation(latitude, longitude);
    } catch (error) {
      console.error('Nominatim geocoding error:', error.message);
      return this.getPlaceholderLocation(latitude, longitude);
    }
  }

  /**
   * Extract area name from Nominatim address components
   */
  extractArea(address) {
    // Priority order for Karachi area names
    return address.suburb ||
           address.neighbourhood ||
           address.district ||
           address.city_district ||
           address.quarter ||
           address.residential ||
           address.town ||
           '';
  }

  /**
   * Forward geocode address to coordinates using Nominatim
   */
  async geocode(address) {
    // Check cache first
    const cacheKey = `geocode:forward:${Buffer.from(address).toString('base64').substring(0, 50)}`;
    const cached = await redisService.get(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      await this.waitForRateLimit();
      
      // Add Karachi, Pakistan to improve accuracy
      const searchQuery = address.toLowerCase().includes('karachi') 
        ? address 
        : `${address}, Karachi, Pakistan`;
      
      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=1&addressdetails=1`;
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'CivicLens/1.0 (civic-complaint-system@email.com)',
          'Accept-Language': 'en',
          'Accept': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`Nominatim returned ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data && data.length > 0) {
        const result = data[0];
        const geocoded = {
          latitude: parseFloat(result.lat),
          longitude: parseFloat(result.lon),
          address: result.display_name,
          area: result.address?.suburb || result.address?.neighbourhood || '',
          boundingBox: result.boundingbox ? {
            minLat: parseFloat(result.boundingbox[0]),
            maxLat: parseFloat(result.boundingbox[1]),
            minLon: parseFloat(result.boundingbox[2]),
            maxLon: parseFloat(result.boundingbox[3]),
          } : null,
        };
        
        // Cache result
        await redisService.set(cacheKey, geocoded, this.geocodeCacheTTL);
        return geocoded;
      }
      
      return null;
    } catch (error) {
      console.error('Geocoding error:', error.message);
      return null;
    }
  }

  /**
   * Search for places using Nominatim
   * @param {string} query - Search query
   * @param {Object} options - Search options
   */
  async searchPlaces(query, options = {}) {
    const { limit = 5, bounded = true, viewbox = null } = options;
    
    try {
      await this.waitForRateLimit();
      
      let url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=${limit}&addressdetails=1`;
      
      // Add Karachi bounding box for better results
      if (bounded) {
        // Karachi bounding box
        const karachiBounds = '66.7,24.5,67.5,25.2';
        url += `&bounded=1&viewbox=${viewbox || karachiBounds}`;
      }
      
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'CivicLens/1.0 (civic-complaint-system@email.com)',
          'Accept-Language': 'en',
          'Accept': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`Nominatim returned ${response.status}`);
      }
      
      const data = await response.json();
      
      return data.map(place => ({
        name: place.display_name,
        latitude: parseFloat(place.lat),
        longitude: parseFloat(place.lon),
        type: place.type,
        importance: place.importance,
        address: place.address,
      }));
    } catch (error) {
      console.error('Place search error:', error.message);
      return [];
    }
  }

  /**
   * Generate placeholder location data when geocoding is unavailable
   */
  getPlaceholderLocation(latitude, longitude) {
    return {
      type: 'Point',
      coordinates: [longitude, latitude],
      address: `Location: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`,
      area: 'Unknown Area',
      ward: '',
      pincode: '',
      city: 'Karachi',
    };
  }

  // ==========================================
  // TURF.JS SPATIAL OPERATIONS
  // ==========================================

  /**
   * Check if a point is inside a polygon (UC/Town boundary)
   * @param {number} lat - Latitude
   * @param {number} lng - Longitude
   * @param {Object} boundary - GeoJSON polygon or multipolygon
   */
  isPointInBoundary(lat, lng, boundary) {
    try {
      const point = turf.point([lng, lat]);
      
      // Handle different GeoJSON formats
      let polygon;
      if (boundary.type === 'Feature') {
        polygon = boundary;
      } else if (boundary.type === 'Polygon' || boundary.type === 'MultiPolygon') {
        polygon = turf.feature(boundary);
      } else if (boundary.geometry) {
        polygon = turf.feature(boundary.geometry);
      } else {
        return false;
      }
      
      return turf.booleanPointInPolygon(point, polygon);
    } catch (error) {
      console.error('Point in boundary check error:', error.message);
      return false;
    }
  }

  /**
   * Find which UC a point belongs to
   * @param {number} lat - Latitude
   * @param {number} lng - Longitude
   * @param {Array} ucBoundaries - Array of UC boundary objects with geometry
   */
  findUCForPoint(lat, lng, ucBoundaries) {
    for (const uc of ucBoundaries) {
      if (uc.boundary && this.isPointInBoundary(lat, lng, uc.boundary)) {
        return uc;
      }
    }
    return null;
  }

  /**
   * Find which Town a point belongs to
   * @param {number} lat - Latitude
   * @param {number} lng - Longitude
   * @param {Array} townBoundaries - Array of Town boundary objects with geometry
   */
  findTownForPoint(lat, lng, townBoundaries) {
    for (const town of townBoundaries) {
      if (town.boundary && this.isPointInBoundary(lat, lng, town.boundary)) {
        return town;
      }
    }
    return null;
  }

  /**
   * Group complaints by UC based on their coordinates
   * @param {Array} complaints - Array of complaints with location
   * @param {Array} ucBoundaries - Array of UC boundaries
   */
  groupComplaintsByUC(complaints, ucBoundaries) {
    const grouped = new Map();
    const unassigned = [];
    
    for (const complaint of complaints) {
      if (!complaint.location?.coordinates) {
        unassigned.push(complaint);
        continue;
      }
      
      const [lng, lat] = complaint.location.coordinates;
      const uc = this.findUCForPoint(lat, lng, ucBoundaries);
      
      if (uc) {
        const ucId = uc._id?.toString() || uc.id;
        if (!grouped.has(ucId)) {
          grouped.set(ucId, {
            uc: uc,
            complaints: [],
            count: 0,
          });
        }
        grouped.get(ucId).complaints.push(complaint);
        grouped.get(ucId).count++;
      } else {
        unassigned.push(complaint);
      }
    }
    
    return {
      byUC: Array.from(grouped.values()),
      unassigned,
    };
  }

  /**
   * Group complaints by Town based on their coordinates
   * @param {Array} complaints - Array of complaints with location
   * @param {Array} townBoundaries - Array of Town boundaries
   */
  groupComplaintsByTown(complaints, townBoundaries) {
    const grouped = new Map();
    const unassigned = [];
    
    for (const complaint of complaints) {
      if (!complaint.location?.coordinates) {
        unassigned.push(complaint);
        continue;
      }
      
      const [lng, lat] = complaint.location.coordinates;
      const town = this.findTownForPoint(lat, lng, townBoundaries);
      
      if (town) {
        const townId = town._id?.toString() || town.id;
        if (!grouped.has(townId)) {
          grouped.set(townId, {
            town: town,
            complaints: [],
            count: 0,
          });
        }
        grouped.get(townId).complaints.push(complaint);
        grouped.get(townId).count++;
      } else {
        unassigned.push(complaint);
      }
    }
    
    return {
      byTown: Array.from(grouped.values()),
      unassigned,
    };
  }

  /**
   * Calculate centroid of a boundary
   */
  getBoundaryCentroid(boundary) {
    try {
      let feature;
      if (boundary.type === 'Feature') {
        feature = boundary;
      } else {
        feature = turf.feature(boundary);
      }
      
      const centroid = turf.centroid(feature);
      return {
        lat: centroid.geometry.coordinates[1],
        lng: centroid.geometry.coordinates[0],
      };
    } catch (error) {
      console.error('Centroid calculation error:', error.message);
      return null;
    }
  }

  /**
   * Get bounding box of a boundary
   */
  getBoundaryBBox(boundary) {
    try {
      let feature;
      if (boundary.type === 'Feature') {
        feature = boundary;
      } else {
        feature = turf.feature(boundary);
      }
      
      const bbox = turf.bbox(feature);
      return {
        minLng: bbox[0],
        minLat: bbox[1],
        maxLng: bbox[2],
        maxLat: bbox[3],
      };
    } catch (error) {
      console.error('BBox calculation error:', error.message);
      return null;
    }
  }

  /**
   * Calculate area of a boundary in square kilometers
   */
  getBoundaryArea(boundary) {
    try {
      let feature;
      if (boundary.type === 'Feature') {
        feature = boundary;
      } else {
        feature = turf.feature(boundary);
      }
      
      const area = turf.area(feature);
      return area / 1000000; // Convert to km²
    } catch (error) {
      console.error('Area calculation error:', error.message);
      return null;
    }
  }

  // ==========================================
  // DISTANCE & GEOMETRY CALCULATIONS
  // ==========================================

  /**
   * Calculate distance between two points using Turf.js
   * @param {number} lat1 - Latitude of first point
   * @param {number} lon1 - Longitude of first point
   * @param {number} lat2 - Latitude of second point
   * @param {number} lon2 - Longitude of second point
   * @returns {number} - Distance in meters
   */
  calculateDistance(lat1, lon1, lat2, lon2) {
    const from = turf.point([lon1, lat1]);
    const to = turf.point([lon2, lat2]);
    return turf.distance(from, to, { units: 'meters' });
  }

  /**
   * Convert degrees to radians
   */
  toRadians(degrees) {
    return degrees * (Math.PI / 180);
  }

  /**
   * Check if a point is within a radius of another point
   */
  isWithinRadius(centerLat, centerLon, pointLat, pointLon, radiusMeters) {
    const distance = this.calculateDistance(centerLat, centerLon, pointLat, pointLon);
    return distance <= radiusMeters;
  }

  /**
   * Get bounding box for a center point and radius
   * Useful for initial filtering before precise distance calculation
   */
  getBoundingBox(latitude, longitude, radiusMeters) {
    const center = turf.point([longitude, latitude]);
    const buffer = turf.buffer(center, radiusMeters, { units: 'meters' });
    const bbox = turf.bbox(buffer);
    
    return {
      minLat: bbox[1],
      maxLat: bbox[3],
      minLon: bbox[0],
      maxLon: bbox[2],
    };
  }

  /**
   * Create a circle buffer around a point
   * @param {number} lat - Center latitude
   * @param {number} lng - Center longitude
   * @param {number} radiusKm - Radius in kilometers
   */
  createCircleBuffer(lat, lng, radiusKm) {
    const center = turf.point([lng, lat]);
    return turf.buffer(center, radiusKm, { units: 'kilometers' });
  }

  /**
   * Generate grid points for heatmap clustering
   */
  generateGridCenters(bounds, gridSize = 10) {
    const { minLat, maxLat, minLon, maxLon } = bounds;
    const latStep = (maxLat - minLat) / gridSize;
    const lonStep = (maxLon - minLon) / gridSize;
    
    const centers = [];
    
    for (let i = 0; i < gridSize; i++) {
      for (let j = 0; j < gridSize; j++) {
        centers.push({
          lat: minLat + (i + 0.5) * latStep,
          lng: minLon + (j + 0.5) * lonStep,
        });
      }
    }
    
    return centers;
  }

  /**
   * Generate hexagonal grid for better heatmap visualization
   * @param {Object} bounds - Bounding box
   * @param {number} cellSide - Side length of hexagons in km
   */
  generateHexGrid(bounds, cellSide = 0.5) {
    const bbox = [bounds.minLon, bounds.minLat, bounds.maxLon, bounds.maxLat];
    return turf.hexGrid(bbox, cellSide, { units: 'kilometers' });
  }

  /**
   * Count points in each cell of a grid
   * @param {Array} points - Array of points [{lat, lng}, ...]
   * @param {Object} grid - Turf.js feature collection grid
   */
  countPointsInGrid(points, grid) {
    const pointsFC = turf.featureCollection(
      points.map(p => turf.point([p.lng || p.longitude, p.lat || p.latitude]))
    );
    
    return turf.collect(grid, pointsFC, 'id', 'pointCount');
  }

  // ==========================================
  // UTILITY METHODS
  // ==========================================

  /**
   * Validate coordinates
   */
  isValidCoords(lat, lng) {
    return (
      typeof lat === 'number' &&
      typeof lng === 'number' &&
      lat >= -90 && lat <= 90 &&
      lng >= -180 && lng <= 180
    );
  }

  /**
   * Check if coordinates are within Karachi bounds
   */
  isInKarachi(lat, lng) {
    // Approximate Karachi bounding box
    return (
      lat >= 24.7 && lat <= 25.6 &&
      lng >= 66.7 && lng <= 67.6
    );
  }

  /**
   * Format coordinates for display
   */
  formatCoords(lat, lng, precision = 6) {
    return `${lat.toFixed(precision)}, ${lng.toFixed(precision)}`;
  }

  /**
   * Convert GeoJSON to simple coordinate array
   */
  geoJSONToCoords(geojson) {
    if (!geojson || !geojson.coordinates) return null;
    
    // Point: [lng, lat] -> {lat, lng}
    if (geojson.type === 'Point') {
      return {
        lat: geojson.coordinates[1],
        lng: geojson.coordinates[0],
      };
    }
    
    return geojson.coordinates;
  }

  /**
   * Convert simple coordinates to GeoJSON Point
   */
  coordsToGeoJSON(lat, lng) {
    return {
      type: 'Point',
      coordinates: [lng, lat],
    };
  }
}

// Export singleton instance
module.exports = new GeoService();
