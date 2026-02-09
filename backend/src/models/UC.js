const mongoose = require('mongoose');

/**
 * UC (Union Council) Schema
 * Base-level geographic entity managed by a UC Chairman
 * Belongs to a Town, receives complaints via geo-fencing
 */
const ucSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'UC name is required'],
    trim: true,
    maxlength: [100, 'UC name cannot exceed 100 characters'],
  },
  code: {
    type: String,
    required: [true, 'UC code is required'],
    unique: true,
    trim: true,
    uppercase: true,
    maxlength: [20, 'UC code cannot exceed 20 characters'],
  },
  // UC number (official designation)
  ucNumber: {
    type: Number,
    required: [true, 'UC number is required'],
  },
  // Reference to parent Town
  town: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Town',
    required: [true, 'Town reference is required'],
  },
  // Reference to parent City (denormalized for faster queries)
  city: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'City',
    required: [true, 'City reference is required'],
  },
  // Geographic center point for the UC
  center: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point',
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      required: [true, 'UC center coordinates are required'],
      validate: {
        validator: function(coords) {
          if (!coords || coords.length !== 2) return false;
          const [lng, lat] = coords;
          return lng >= -180 && lng <= 180 && lat >= -90 && lat <= 90;
        },
        message: 'Invalid coordinates. Longitude must be -180 to 180, Latitude must be -90 to 90',
      },
    },
  },
  // Boundary of the UC (GeoJSON Polygon) - Used for geo-fencing
  boundary: {
    type: {
      type: String,
      enum: ['Polygon'],
      required: true,
    },
    coordinates: {
      type: [[[Number]]], // Array of linear rings
      required: [true, 'UC boundary coordinates are required'],
      validate: {
        validator: function(coords) {
          // Must have at least one ring with at least 4 points (first and last same)
          return coords && coords.length >= 1 && coords[0].length >= 4;
        },
        message: 'UC boundary must be a valid polygon with at least 4 points',
      },
    },
  },
  // Reference to the UC Chairman managing this UC
  chairman: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
  // Population (for priority calculations)
  population: {
    type: Number,
    default: 0,
  },
  // Area in square kilometers
  area: {
    type: Number,
    default: 0,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  // Contact information
  contact: {
    phone: {
      type: String,
      trim: true,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
    },
    address: {
      type: String,
      trim: true,
    },
  },
  // Statistics
  stats: {
    totalComplaints: { type: Number, default: 0 },
    pendingComplaints: { type: Number, default: 0 },
    inProgressComplaints: { type: Number, default: 0 },
    resolvedComplaints: { type: Number, default: 0 },
    avgResolutionTime: { type: Number, default: 0 }, // in hours
    slaComplianceRate: { type: Number, default: 100 }, // percentage
    avgFeedbackRating: { type: Number, default: 0 }, // 1-5 scale
  },
  metadata: {
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    lastModifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// Indexes
ucSchema.index({ name: 1, town: 1 });
ucSchema.index({ ucNumber: 1, town: 1 }, { unique: true });
ucSchema.index({ chairman: 1 });
ucSchema.index({ center: '2dsphere' });
ucSchema.index({ boundary: '2dsphere' });
ucSchema.index({ isActive: 1 });

// Virtual for town details
ucSchema.virtual('townDetails', {
  ref: 'Town',
  localField: 'town',
  foreignField: '_id',
  justOne: true,
});

// Virtual for city details
ucSchema.virtual('cityDetails', {
  ref: 'City',
  localField: 'city',
  foreignField: '_id',
  justOne: true,
});

/**
 * Pre-save middleware to generate UC code if not provided
 */
ucSchema.pre('save', async function() {
  if (this.isNew) {
    if (!this.code) {
      // Get town code
      const Town = mongoose.model('Town');
      const town = await Town.findById(this.town);
      const townCode = town?.code || 'XXX-XX';
      
      // Generate code from town code + UC number
      this.code = `${townCode}-UC${this.ucNumber.toString().padStart(3, '0')}`;
    }

    // Ensure city is set from town if not provided
    if (!this.city && this.town) {
      const Town = mongoose.model('Town');
      const town = await Town.findById(this.town);
      if (town) {
        this.city = town.city;
      }
    }
  }
});

/**
 * Post-save middleware to update parent statistics
 */
ucSchema.post('save', async function(doc) {
  try {
    const Town = mongoose.model('Town');
    const town = await Town.findById(doc.town);
    if (town) {
      await town.updateStats();
    }
  } catch (error) {
    console.error('Error updating town stats:', error);
  }
});

/**
 * Static method to find UC by coordinates (geo-fencing)
 * Primary method for complaint assignment
 */
ucSchema.statics.findByCoordinates = function(longitude, latitude) {
  return this.findOne({
    boundary: {
      $geoIntersects: {
        $geometry: {
          type: 'Point',
          coordinates: [longitude, latitude],
        },
      },
    },
    isActive: true,
  }).populate('town', 'name code').populate('city', 'name code');
};

/**
 * Static method to find nearest UC (fallback when geo-fence doesn't match)
 */
ucSchema.statics.findNearest = function(longitude, latitude, options = {}) {
  const query = {
    center: {
      $near: {
        $geometry: {
          type: 'Point',
          coordinates: [longitude, latitude],
        },
        $maxDistance: options.maxDistance || 10000, // 10km default
      },
    },
    isActive: true,
  };

  if (options.townId) {
    query.town = options.townId;
  }

  if (options.cityId) {
    query.city = options.cityId;
  }

  return this.findOne(query).populate('town', 'name code').populate('city', 'name code');
};

/**
 * Static method to find all UCs within a distance
 */
ucSchema.statics.findNearby = function(longitude, latitude, maxDistance = 5000) {
  return this.find({
    center: {
      $near: {
        $geometry: {
          type: 'Point',
          coordinates: [longitude, latitude],
        },
        $maxDistance: maxDistance,
      },
    },
    isActive: true,
  }).populate('town', 'name code').populate('city', 'name code');
};

/**
 * Static method to find all UCs in a town
 */
ucSchema.statics.findByTown = function(townId) {
  return this.find({ town: townId, isActive: true }).sort({ ucNumber: 1 });
};

/**
 * Static method to find all UCs in a city
 */
ucSchema.statics.findByCity = function(cityId) {
  return this.find({ city: cityId, isActive: true })
    .populate('town', 'name code')
    .sort({ 'town.name': 1, ucNumber: 1 });
};

/**
 * Static method to assign complaint to UC based on location
 * Returns: { uc, assignmentMethod, distance? }
 */
ucSchema.statics.assignByLocation = async function(longitude, latitude) {
  // Try geo-fence first
  let uc = await this.findByCoordinates(longitude, latitude);
  
  if (uc) {
    return {
      uc,
      assignmentMethod: 'geo_fence',
      confidence: 'exact',
    };
  }

  // Fallback to nearest UC
  uc = await this.findNearest(longitude, latitude);
  
  if (uc) {
    // Calculate distance for reporting
    const distance = this.calculateDistance(
      longitude, latitude,
      uc.center.coordinates[0], uc.center.coordinates[1]
    );

    return {
      uc,
      assignmentMethod: 'nearest',
      confidence: distance < 2000 ? 'high' : distance < 5000 ? 'medium' : 'low',
      distance: Math.round(distance),
    };
  }

  return {
    uc: null,
    assignmentMethod: 'none',
    confidence: 'none',
    error: 'No UC found for location',
  };
};

/**
 * Static method to calculate distance between two points (Haversine)
 */
ucSchema.statics.calculateDistance = function(lon1, lat1, lon2, lat2) {
  const R = 6371000; // Earth's radius in meters
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  
  return R * c;
};

/**
 * Instance method to update statistics
 */
ucSchema.methods.updateStats = async function() {
  let Complaint;
  try {
    Complaint = mongoose.model('Complaint');
  } catch {
    // Complaint model not registered (seed scripts) - skip stats
    return this;
  }

  const [statusStats, resolutionStats, feedbackStats] = await Promise.all([
    // Status distribution
    Complaint.aggregate([
      { $match: { ucId: this._id } },
      {
        $group: {
          _id: '$status.current',
          count: { $sum: 1 },
        },
      },
    ]),
    // Resolution time stats
    Complaint.aggregate([
      {
        $match: {
          ucId: this._id,
          'status.current': { $in: ['resolved', 'closed', 'citizen_feedback'] },
          'resolution.resolvedAt': { $ne: null },
        },
      },
      {
        $lookup: {
          from: 'categories',
          localField: 'category.primary',
          foreignField: 'name',
          as: 'categoryInfo',
        },
      },
      {
        $addFields: {
          slaHours: { $ifNull: [{ $arrayElemAt: ['$categoryInfo.slaHours', 0] }, 72] },
          resolutionHours: {
            $divide: [{ $subtract: ['$resolution.resolvedAt', '$createdAt'] }, 3600000],
          },
        },
      },
      {
        $group: {
          _id: null,
          avgTime: { $avg: '$resolutionHours' },
          total: { $sum: 1 },
          compliant: {
            $sum: { $cond: [{ $lte: ['$resolutionHours', '$slaHours'] }, 1, 0] },
          },
        },
      },
    ]),
    // Feedback rating stats
    Complaint.aggregate([
      {
        $match: {
          ucId: this._id,
          'resolution.citizenFeedback.rating': { $exists: true, $ne: null },
        },
      },
      {
        $group: {
          _id: null,
          avgRating: { $avg: '$resolution.citizenFeedback.rating' },
        },
      },
    ]),
  ]);

  // Process status distribution
  const statusMap = {};
  statusStats.forEach(s => {
    statusMap[s._id] = s.count;
  });

  const total = Object.values(statusMap).reduce((a, b) => a + b, 0);
  const pending = (statusMap.submitted || 0) + (statusMap.acknowledged || 0);
  const inProgress = statusMap.in_progress || 0;
  const resolved = (statusMap.resolved || 0) + (statusMap.closed || 0) + (statusMap.citizen_feedback || 0);

  const slaCompliance = resolutionStats[0]?.total > 0
    ? Math.round((resolutionStats[0].compliant / resolutionStats[0].total) * 100)
    : 100;

  this.stats = {
    totalComplaints: total,
    pendingComplaints: pending,
    inProgressComplaints: inProgress,
    resolvedComplaints: resolved,
    avgResolutionTime: Math.round((resolutionStats[0]?.avgTime || 0) * 10) / 10,
    slaComplianceRate: slaCompliance,
    avgFeedbackRating: Math.round((feedbackStats[0]?.avgRating || 0) * 10) / 10,
  };

  return this.save();
};

/**
 * Instance method to check if a point is within this UC's boundary
 */
ucSchema.methods.containsPoint = function(longitude, latitude) {
  // Use MongoDB's geoWithin query
  return mongoose.model('UC').findOne({
    _id: this._id,
    boundary: {
      $geoIntersects: {
        $geometry: {
          type: 'Point',
          coordinates: [longitude, latitude],
        },
      },
    },
  }).then(result => !!result);
};

const UC = mongoose.model('UC', ucSchema);

module.exports = UC;
