const mongoose = require('mongoose');

/**
 * City Schema
 * Top-level geographic entity managed by a Mayor
 * Contains multiple Towns
 */
const citySchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'City name is required'],
    trim: true,
    maxlength: [100, 'City name cannot exceed 100 characters'],
  },
  code: {
    type: String,
    required: [true, 'City code is required'],
    unique: true,
    trim: true,
    uppercase: true,
    maxlength: [10, 'City code cannot exceed 10 characters'],
  },
  province: {
    type: String,
    trim: true,
    maxlength: [100, 'Province name cannot exceed 100 characters'],
  },
  country: {
    type: String,
    default: 'Pakistan',
    trim: true,
  },
  // Geographic center point for the city
  center: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point',
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      required: [true, 'City center coordinates are required'],
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
  // Approximate boundary of the city (GeoJSON Polygon)
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
  // Reference to the Mayor managing this city
  mayor: {
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
    totalTowns: { type: Number, default: 0 },
    totalUCs: { type: Number, default: 0 },
    totalComplaints: { type: Number, default: 0 },
    resolvedComplaints: { type: Number, default: 0 },
    avgResolutionTime: { type: Number, default: 0 }, // in hours
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
citySchema.index({ name: 1 });
citySchema.index({ mayor: 1 });
citySchema.index({ center: '2dsphere' });
citySchema.index({ boundary: '2dsphere' });
citySchema.index({ isActive: 1 });

// Virtual for towns in this city
citySchema.virtual('towns', {
  ref: 'Town',
  localField: '_id',
  foreignField: 'city',
});

/**
 * Pre-save middleware to generate city code if not provided
 */
citySchema.pre('save', async function() {
  if (this.isNew && !this.code) {
    // Generate code from first 3 letters of city name + random suffix
    const prefix = this.name.substring(0, 3).toUpperCase().replace(/[^A-Z]/g, 'X');
    const suffix = Math.random().toString(36).substring(2, 5).toUpperCase();
    this.code = `${prefix}${suffix}`;
  }
});

/**
 * Static method to find city by coordinates
 */
citySchema.statics.findByCoordinates = function(longitude, latitude) {
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
 * Static method to find nearest city
 */
citySchema.statics.findNearest = function(longitude, latitude) {
  return this.findOne({
    center: {
      $near: {
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
 * Instance method to update statistics
 */
citySchema.methods.updateStats = async function() {
  const Town = mongoose.model('Town');
  const UC = mongoose.model('UC');

  // Complaint may not be registered in seed scripts
  let Complaint;
  try {
    Complaint = mongoose.model('Complaint');
  } catch {
    // Models not registered - just update counts
    const [townCount, ucCount] = await Promise.all([
      Town.countDocuments({ city: this._id, isActive: true }),
      UC.countDocuments({ city: this._id, isActive: true }),
    ]);
    this.stats.totalTowns = townCount;
    this.stats.totalUCs = ucCount;
    return this.save();
  }

  const [townCount, ucCount, complaintStats] = await Promise.all([
    Town.countDocuments({ city: this._id, isActive: true }),
    UC.countDocuments({ city: this._id, isActive: true }),
    Complaint.aggregate([
      { $match: { cityId: this._id } },
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
  ]);

  this.stats = {
    totalTowns: townCount,
    totalUCs: ucCount,
    totalComplaints: complaintStats[0]?.total || 0,
    resolvedComplaints: complaintStats[0]?.resolved || 0,
    avgResolutionTime: Math.round((complaintStats[0]?.avgTime || 0) * 10) / 10,
  };

  return this.save();
};

const City = mongoose.model('City', citySchema);

module.exports = City;
