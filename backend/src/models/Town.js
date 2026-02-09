const mongoose = require('mongoose');

/**
 * Town Schema
 * Middle-level geographic entity managed by a Town Chairman
 * Belongs to a City, contains multiple UCs (Union Councils)
 */
const townSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Town name is required'],
    trim: true,
    maxlength: [100, 'Town name cannot exceed 100 characters'],
  },
  code: {
    type: String,
    required: [true, 'Town code is required'],
    unique: true,
    trim: true,
    uppercase: true,
    maxlength: [15, 'Town code cannot exceed 15 characters'],
  },
  // Reference to parent City
  city: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'City',
    required: [true, 'City reference is required'],
  },
  // Geographic center point for the town
  center: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point',
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      required: [true, 'Town center coordinates are required'],
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
  // Boundary of the town (GeoJSON Polygon)
  boundary: {
    type: {
      type: String,
      enum: ['Polygon'],
      default: 'Polygon',
    },
    coordinates: {
      type: [[[Number]]], // Array of linear rings
    },
  },
  // Reference to the Town Chairman managing this town
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
  isActive: {
    type: Boolean,
    default: true,
  },
  // Statistics
  stats: {
    totalUCs: { type: Number, default: 0 },
    totalComplaints: { type: Number, default: 0 },
    resolvedComplaints: { type: Number, default: 0 },
    avgResolutionTime: { type: Number, default: 0 }, // in hours
    slaComplianceRate: { type: Number, default: 100 }, // percentage
  },
  metadata: {
    district: {
      type: String,
      trim: true,
    },
    districtColor: {
      type: String,
      trim: true,
    },
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
townSchema.index({ name: 1, city: 1 });
townSchema.index({ chairman: 1 });
townSchema.index({ center: '2dsphere' });
townSchema.index({ boundary: '2dsphere' });
townSchema.index({ isActive: 1 });

// Virtual for UCs in this town
townSchema.virtual('ucs', {
  ref: 'UC',
  localField: '_id',
  foreignField: 'town',
});

// Virtual for city details
townSchema.virtual('cityDetails', {
  ref: 'City',
  localField: 'city',
  foreignField: '_id',
  justOne: true,
});

/**
 * Pre-save middleware to generate town code if not provided
 */
townSchema.pre('save', async function() {
  if (this.isNew && !this.code) {
    // Get city code
    const City = mongoose.model('City');
    const city = await City.findById(this.city);
    const cityCode = city?.code || 'XXX';
    
    // Generate code from city code + first 2 letters of town name + random suffix
    const prefix = this.name.substring(0, 2).toUpperCase().replace(/[^A-Z]/g, 'X');
    const suffix = Math.random().toString(36).substring(2, 4).toUpperCase();
    this.code = `${cityCode}-${prefix}${suffix}`;
  }
});

/**
 * Post-save middleware to update city statistics
 */
townSchema.post('save', async function(doc) {
  try {
    const City = mongoose.model('City');
    const city = await City.findById(doc.city);
    if (city && city.updateStats) {
      await city.updateStats();
    }
  } catch (error) {
    // Silently fail - UC model may not be loaded in seed scripts
  }
});

/**
 * Static method to find town by coordinates
 */
townSchema.statics.findByCoordinates = function(longitude, latitude) {
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
  });
};

/**
 * Static method to find nearest town
 */
townSchema.statics.findNearest = function(longitude, latitude, cityId = null) {
  const query = {
    center: {
      $near: {
        $geometry: {
          type: 'Point',
          coordinates: [longitude, latitude],
        },
      },
    },
    isActive: true,
  };

  if (cityId) {
    query.city = cityId;
  }

  return this.findOne(query);
};

/**
 * Static method to find all towns in a city
 */
townSchema.statics.findByCity = function(cityId) {
  return this.find({ city: cityId, isActive: true }).sort({ name: 1 });
};

/**
 * Instance method to update statistics
 */
townSchema.methods.updateStats = async function() {
  const UC = mongoose.model('UC');

  // Complaint/Category may not be registered in seed scripts
  let Complaint, Category;
  try {
    Complaint = mongoose.model('Complaint');
    Category = mongoose.model('Category');
  } catch {
    // Models not registered (e.g. running seed scripts) - just update UC count
    const ucCount = await UC.countDocuments({ town: this._id, isActive: true });
    this.stats.totalUCs = ucCount;
    return this.save();
  }

  const [ucCount, complaintStats, slaStats] = await Promise.all([
    UC.countDocuments({ town: this._id, isActive: true }),
    Complaint.aggregate([
      { $match: { townId: this._id } },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          resolved: {
            $sum: {
              $cond: [{ $in: ['$status.current', ['resolved', 'closed', 'citizen_feedback']] }, 1, 0],
            },
          },
          avgTime: {
            $avg: {
              $cond: [
                { $and: [
                  { $in: ['$status.current', ['resolved', 'closed', 'citizen_feedback']] },
                  { $ne: ['$resolution.resolvedAt', null] },
                ]},
                { $divide: [{ $subtract: ['$resolution.resolvedAt', '$createdAt'] }, 3600000] },
                null,
              ],
            },
          },
        },
      },
    ]),
    // SLA compliance calculation
    Complaint.aggregate([
      {
        $match: {
          townId: this._id,
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
          total: { $sum: 1 },
          compliant: {
            $sum: { $cond: [{ $lte: ['$resolutionHours', '$slaHours'] }, 1, 0] },
          },
        },
      },
    ]),
  ]);

  const slaCompliance = slaStats[0]?.total > 0
    ? Math.round((slaStats[0].compliant / slaStats[0].total) * 100)
    : 100;

  this.stats = {
    totalUCs: ucCount,
    totalComplaints: complaintStats[0]?.total || 0,
    resolvedComplaints: complaintStats[0]?.resolved || 0,
    avgResolutionTime: Math.round((complaintStats[0]?.avgTime || 0) * 10) / 10,
    slaComplianceRate: slaCompliance,
  };

  return this.save();
};

/**
 * Instance method to get all UC chairmen in this town
 */
townSchema.methods.getUCChairmen = async function() {
  const UC = mongoose.model('UC');
  const User = mongoose.model('User');
  
  const ucs = await UC.find({ town: this._id, isActive: true }).select('chairman');
  const chairmanIds = ucs.map(uc => uc.chairman).filter(Boolean);
  
  return User.find({ _id: { $in: chairmanIds }, isActive: true });
};

const Town = mongoose.model('Town', townSchema);

module.exports = Town;
