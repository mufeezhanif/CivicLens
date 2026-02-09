const mongoose = require('mongoose');
const { generateComplaintId } = require('../utils/helpers');

/**
 * Status history sub-schema
 * Updated with new lifecycle: submitted → acknowledged → in_progress → resolved → closed → citizen_feedback
 */
const statusHistorySchema = new mongoose.Schema({
  status: {
    type: String,
    enum: ['submitted', 'acknowledged', 'in_progress', 'resolved', 'closed', 'citizen_feedback', 'rejected'],
    required: true,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  updatedByRole: {
    type: String,
    enum: ['citizen', 'uc_chairman', 'town_chairman', 'mayor', 'website_admin', 'system'],
    default: 'system',
  },
  remarks: String,
}, { _id: false });

/**
 * Citizen info sub-schema
 */
const citizenInfoSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  name: {
    type: String,
    trim: true,
    maxlength: [100, 'Name cannot exceed 100 characters'],
  },
  phone: {
    type: String,
    required: [true, 'Phone number is required'],
    trim: true,
    match: [/^[+]?[\d\s-]{10,15}$/, 'Please provide a valid phone number'],
  },
  email: {
    type: String,
    trim: true,
    lowercase: true,
    match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address'],
  },
}, { _id: false });

/**
 * Image sub-schema
 */
const imageSchema = new mongoose.Schema({
  url: {
    type: String,
    required: true,
  },
  publicId: String,
  analysis: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },
  uploadedAt: {
    type: Date,
    default: Date.now,
  },
}, { _id: false });

/**
 * Citizen feedback sub-schema (after closure)
 */
const citizenFeedbackSchema = new mongoose.Schema({
  rating: {
    type: Number,
    min: 1,
    max: 5,
    required: true,
  },
  comment: {
    type: String,
    maxlength: [1000, 'Feedback comment cannot exceed 1000 characters'],
  },
  feedbackAt: {
    type: Date,
    default: Date.now,
  },
  satisfactionLevel: {
    type: String,
    enum: ['very_dissatisfied', 'dissatisfied', 'neutral', 'satisfied', 'very_satisfied'],
  },
}, { _id: false });

/**
 * Resolution sub-schema - REMOVED
 * Severity sub-schema - REMOVED
 * SLA tracking sub-schema - REMOVED
 */

/**
 * UC Assignment sub-schema
 */
const ucAssignmentSchema = new mongoose.Schema({
  method: {
    type: String,
    enum: ['geo_fence', 'nearest', 'manual'],
    required: true,
  },
  confidence: {
    type: String,
    enum: ['exact', 'high', 'medium', 'low'],
  },
  distance: {
    type: Number, // Distance in meters (for nearest assignment)
  },
  assignedAt: {
    type: Date,
    default: Date.now,
  },
  // In case of reassignment
  previousUCId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'UC',
  },
  reassignedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  reassignReason: String,
}, { _id: false });

/**
 * Main Complaint Schema
 * Updated with UC/Town/City hierarchy and immutable fields
 */
const complaintSchema = new mongoose.Schema({
  complaintId: {
    type: String,
    unique: true,
    index: true,
  },
  citizenInfo: {
    type: citizenInfoSchema,
    required: true,
  },
  description: {
    type: String,
    required: [true, 'Description is required'],
    trim: true,
    maxlength: [2000, 'Description cannot exceed 2000 characters'],
  },
  category: {
    primary: {
      type: String,
      enum: ['Roads', 'Water', 'Garbage', 'Electricity', 'Others'],
      default: 'Others',
    },
    confidence: {
      type: Number,
      min: 0,
      max: 1,
      default: 0,
    },
    subcategory: {
      type: String,
      trim: true,
    },
    urgency: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'medium',
    },
    keywords: [{
      type: String,
      trim: true,
    }],
    classificationSource: {
      type: String,
      enum: ['groq', 'local', 'manual', 'default'],
      default: 'local',
    },
    needsReview: {
      type: Boolean,
      default: false,
    },
  },
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point',
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      validate: {
        validator: function(coords) {
          if (!coords || coords.length !== 2) return false;
          const [lng, lat] = coords;
          return lng >= -180 && lng <= 180 && lat >= -90 && lat <= 90;
        },
        message: 'Invalid coordinates. Longitude must be -180 to 180, Latitude must be -90 to 90',
      },
    },
    address: {
      type: String,
      trim: true,
    },
    area: {
      type: String,
      trim: true,
    },
    uc: {
      type: String,
      trim: true,
      description: 'UC name or code, can be entered by user or auto-detected',
    },
    pincode: {
      type: String,
      trim: true,
    },
  },
  images: {
    type: [imageSchema],
    validate: {
      validator: function(images) {
        return images.length <= 5;
      },
      message: 'Maximum 5 images allowed per complaint',
    },
  },
  source: {
    type: String,
    enum: ['web', 'mobile', 'whatsapp', 'voice'],
    default: 'web',
  },

  // Link to authenticated citizen user (if logged in when creating complaint)
  citizenUser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    index: true,
  },

  // UC/Town/City hierarchy references (optional, auto-detected from location)
  ucId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'UC',
    index: true,
  },
  ucNumber: {
    type: String,
    trim: true,
    index: true,
  },
  townId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Town',
    index: true,
  },
  cityId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'City',
    index: true,
  },

  // UC assignment details
  ucAssignment: {
    type: ucAssignmentSchema,
  },

  // Assigned officer/user (for tracking who is handling the complaint)
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },

  // Updated status lifecycle
  status: {
    current: {
      type: String,
      enum: ['submitted', 'acknowledged', 'in_progress', 'resolved', 'closed', 'citizen_feedback', 'rejected'],
      default: 'submitted',
    },
    history: [statusHistorySchema],
  },

  duplicateOf: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Complaint',
  },

  // Citizen feedback (after closure)
  citizenFeedback: {
    type: citizenFeedbackSchema,
  },

  // Resolution details
  resolution: {
    resolvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    resolvedAt: Date,
    remarks: String,
    feedback: {
      rating: Number,
      comment: String,
      citizenResolved: Boolean,
      submittedAt: Date,
    },
  },

  // For tracking duplicate complaints
  linkedComplaints: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Complaint',
  }],

  // Severity score for prioritization
  severity: {
    score: {
      type: Number,
      default: 50,
      min: 0,
      max: 100,
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'medium',
    },
    factors: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },

  // SLA tracking
  slaDeadline: Date,
  slaHours: {
    type: Number,
    default: 48,
  },
  slaBreach: {
    type: Boolean,
    default: false,
  },

  // Immutability tracking
  immutableFieldsLockedAt: {
    type: Date,
  },

  metadata: {
    ipAddress: String,
    userAgent: String,
    voiceTranscript: String,
    aiProcessing: {
      classificationTime: Number,
      duplicateCheckDetails: mongoose.Schema.Types.Mixed,
      severityDetails: mongoose.Schema.Types.Mixed,
      processedAt: Date,
    },
  },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

/**
 * Indexes for optimized queries
 */
// Geospatial index for location-based queries
complaintSchema.index({ 'location': '2dsphere' });
// Category index for filtering
complaintSchema.index({ 'category.primary': 1 });
// Status index for filtering
complaintSchema.index({ 'status.current': 1 });
// Created date for sorting (descending for recent first)
complaintSchema.index({ createdAt: -1 });
// Compound index for UC-status queries
complaintSchema.index({ ucId: 1, 'status.current': 1 });
// Compound index for Town-status queries
complaintSchema.index({ townId: 1, 'status.current': 1 });
// Compound index for City-status queries
complaintSchema.index({ cityId: 1, 'status.current': 1 });
// Compound index for area-category queries
complaintSchema.index({ 'location.area': 1, 'category.primary': 1 });
// Text index for search
complaintSchema.index({ description: 'text', 'location.address': 'text' });
// Index for citizen complaints
complaintSchema.index({ 'citizenInfo.userId': 1 });

// Immutable fields list (only critical citizen info and location)
const IMMUTABLE_FIELDS = [
  'citizenInfo',
  'location.coordinates',
];

/**
 * Pre-save middleware to generate complaintId and lock immutable fields
 */
complaintSchema.pre('save', async function() {
  if (this.isNew) {
    // Generate complaint ID
    if (!this.complaintId) {
      this.complaintId = await generateComplaintId();
    }
    
    // Initialize status history with 'submitted' status
    if (!this.status.history || this.status.history.length === 0) {
      this.status.history = [{
        status: 'submitted',
        timestamp: new Date(),
        updatedByRole: 'system',
        remarks: 'Complaint submitted',
      }];
    }

    // Lock immutable fields
    this.immutableFieldsLockedAt = new Date();
  }
});

/**
 * Pre-update middleware to prevent modification of immutable fields
 */
complaintSchema.pre(['updateOne', 'findOneAndUpdate', 'updateMany'], function() {
  const update = this.getUpdate();
  
  // Check for attempts to modify immutable fields
  const modifyingImmutable = IMMUTABLE_FIELDS.some(field => {
    // Check $set
    if (update.$set && (update.$set[field] !== undefined || 
        Object.keys(update.$set).some(k => k.startsWith(field + '.')))) {
      return true;
    }
    // Check direct field updates
    if (update[field] !== undefined) {
      return true;
    }
    return false;
  });

  if (modifyingImmutable) {
    const error = new Error('Cannot modify immutable complaint fields: ' + IMMUTABLE_FIELDS.join(', '));
    error.code = 'IMMUTABLE_FIELD_VIOLATION';
    throw error;
  }
});

/**
 * Instance method to update status
 * Only UC Chairman can update status (validated at controller/middleware level)
 */
complaintSchema.methods.updateStatus = async function(newStatus, updatedBy, updatedByRole, remarks = '') {
  // Valid status transitions for new lifecycle
  const validTransitions = {
    submitted: ['acknowledged', 'rejected'],
    acknowledged: ['in_progress', 'rejected'],
    in_progress: ['resolved', 'rejected'],
    resolved: ['closed'],
    closed: ['citizen_feedback'],
    citizen_feedback: [], // Terminal state
    rejected: [], // Terminal state
  };

  const currentStatus = this.status.current;
  
  if (!validTransitions[currentStatus]?.includes(newStatus)) {
    throw new Error(`Invalid status transition from ${currentStatus} to ${newStatus}`);
  }

  this.status.current = newStatus;
  this.status.history.push({
    status: newStatus,
    timestamp: new Date(),
    updatedBy,
    updatedByRole,
    remarks,
  });

  return this.save();
};

/**
 * Instance method to add citizen feedback
 * Only the citizen who submitted can provide feedback (validated at controller level)
 */
complaintSchema.methods.addFeedback = async function(rating, comment, satisfactionLevel) {
  if (this.status.current !== 'closed') {
    throw new Error('Feedback can only be provided after complaint is closed');
  }

  if (this.citizenFeedback?.rating) {
    throw new Error('Feedback has already been provided');
  }

  this.citizenFeedback = {
    rating,
    comment,
    satisfactionLevel,
    feedbackAt: new Date(),
  };

  this.status.current = 'citizen_feedback';
  this.status.history.push({
    status: 'citizen_feedback',
    timestamp: new Date(),
    updatedByRole: 'citizen',
    remarks: `Citizen provided feedback: ${rating}/5`,
  });

  return this.save();
};

/**
 * Instance method to reassign to different UC
 * Only Mayor can reassign (validated at controller level)
 */
complaintSchema.methods.reassignUC = async function(newUCId, reassignedBy, reason) {
  const UC = mongoose.model('UC');
  const newUC = await UC.findById(newUCId).populate('town');
  
  if (!newUC) {
    throw new Error('Target UC not found');
  }

  // Store previous assignment
  this.ucAssignment = {
    method: 'manual',
    confidence: 'exact',
    assignedAt: new Date(),
    previousUCId: this.ucId,
    reassignedBy,
    reassignReason: reason,
  };

  this.ucId = newUCId;
  this.townId = newUC.town._id;
  this.cityId = newUC.town.city;

  return this.save();
};

/**
 * Static method to find complaints by UC
 */
complaintSchema.statics.findByUC = function(ucId, options = {}) {
  const query = { ucId };
  if (options.status) {
    query['status.current'] = options.status;
  }
  return this.find(query).sort({ createdAt: -1 });
};

/**
 * Static method to find complaints by Town
 */
complaintSchema.statics.findByTown = function(townId, options = {}) {
  const query = { townId };
  if (options.status) {
    query['status.current'] = options.status;
  }
  return this.find(query).sort({ createdAt: -1 });
};

/**
 * Static method to find complaints by City
 */
complaintSchema.statics.findByCity = function(cityId, options = {}) {
  const query = { cityId };
  if (options.status) {
    query['status.current'] = options.status;
  }
  return this.find(query).sort({ createdAt: -1 });
};

/**
 * Static method to find complaints near a location
 */
complaintSchema.statics.findNearby = function(longitude, latitude, maxDistance = 1000) {
  return this.find({
    location: {
      $near: {
        $geometry: {
          type: 'Point',
          coordinates: [longitude, latitude],
        },
        $maxDistance: maxDistance,
      },
    },
  });
};

/**
 * Static method to get statistics
 */
complaintSchema.statics.getStats = async function(filters = {}) {
  const matchStage = {};
  
  if (filters.dateFrom) {
    matchStage.createdAt = { $gte: new Date(filters.dateFrom) };
  }
  if (filters.dateTo) {
    matchStage.createdAt = { ...matchStage.createdAt, $lte: new Date(filters.dateTo) };
  }
  if (filters.ucId) {
    matchStage.ucId = new mongoose.Types.ObjectId(filters.ucId);
  }
  if (filters.townId) {
    matchStage.townId = new mongoose.Types.ObjectId(filters.townId);
  }
  if (filters.cityId) {
    matchStage.cityId = new mongoose.Types.ObjectId(filters.cityId);
  }
  if (filters.area) {
    matchStage['location.area'] = filters.area;
  }

  const stats = await this.aggregate([
    { $match: matchStage },
    {
      $facet: {
        total: [{ $count: 'count' }],
        byCategory: [
          { $group: { _id: '$category.primary', count: { $sum: 1 } } },
        ],
        byStatus: [
          { $group: { _id: '$status.current', count: { $sum: 1 } } },
        ],
        byArea: [
          { $group: { _id: '$location.area', count: { $sum: 1 } } },
          { $sort: { count: -1 } },
          { $limit: 10 },
        ],
        avgFeedbackRating: [
          {
            $match: {
              'citizenFeedback.rating': { $exists: true },
            },
          },
          { $group: { _id: null, avgRating: { $avg: '$citizenFeedback.rating' } } },
        ],
      },
    },
  ]);

  return stats[0];
};

const Complaint = mongoose.model('Complaint', complaintSchema);

module.exports = Complaint;
