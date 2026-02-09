const { Complaint, Category } = require('../models');
const geoService = require('./geoService');
const cloudinaryService = require('./cloudinaryService');
const classificationService = require('./classificationService');
const duplicateService = require('./duplicateService');
const severityService = require('./severityService');
const ucAssignmentService = require('./ucAssignmentService');
const {
  buildComplaintQuery,
  buildSortObject,
  getPaginationMeta,
  toGeoJSON,
  getDateRange,
} = require('../utils/helpers');
const { PAGINATION, GEO, TIME } = require('../utils/constants');
const { AppError } = require('../middlewares/errorHandler');

/**
 * Complaint Service
 * Business logic for complaint operations
 */
class ComplaintService {
  /**
   * Create a new complaint
   * Full AI pipeline: Classification → Duplicate Detection → Severity Scoring
   */
  async createComplaint(data, files = []) {
    const {
      description,
      phone,
      name,
      email,
      latitude,
      longitude,
      address,
      source = 'web',
    } = data;

    console.log('[ComplaintService] Starting complaint creation (simplified)...');

    // Get location details via reverse geocoding if coordinates provided
    let location = null;
    if (latitude && longitude && !isNaN(latitude) && !isNaN(longitude)) {
      try {
        location = await geoService.reverseGeocode(latitude, longitude);
        // Override with provided address if available
        if (address) {
          location.address = address;
        }
      } catch (err) {
        console.warn('Geocoding failed:', err.message);
        location = address ? { address } : null;
      }
    } else if (address) {
      location = { address };
    }

    // Upload images to cloud storage
    const images = [];
    if (files && files.length > 0) {
      for (const file of files) {
        try {
          const uploadResult = await cloudinaryService.uploadImage(file.buffer, {
            folder: 'civiclens/complaints',
          });
          images.push({
            url: uploadResult.secure_url,
            publicId: uploadResult.public_id,
            analysis: {},
          });
        } catch (error) {
          console.error('Image upload failed:', error.message);
          // Continue without the failed image
        }
      }
    }

    // Step 1: AI Classification (GROQ + local fallback) - optional, wrapped in try-catch
    console.log('[AI Pipeline] Step 1: Classifying complaint...');
    let classification;
    try {
      classification = await classificationService.classifyComplaint(description);
      console.log(`[AI Pipeline] Classified as: ${classification.category} (${classification.confidence} confidence, source: ${classification.source})`);
    } catch (err) {
      console.error('Classification failed:', err.message);
      classification = {
        category: 'Others',
        confidence: 0,
        source: 'default',
        urgency: 'medium',
        needsReview: true,
      };
    }

    // Step 2: Duplicate Detection (geo + text similarity) - optional, only if location available
    let duplicateCheck = { isDuplicate: false, nearbyCount: 0 };
    if (latitude && longitude && !isNaN(latitude) && !isNaN(longitude)) {
      try {
        console.log('[AI Pipeline] Step 2: Checking for duplicates...');
        duplicateCheck = await duplicateService.checkForDuplicates({
          description,
          longitude,
          latitude,
          category: classification.category,
        });
        console.log(`[AI Pipeline] Duplicate check: ${duplicateCheck.isDuplicate ? 'DUPLICATE FOUND' : 'No duplicates'}, ${duplicateCheck.nearbyCount} nearby complaints`);
      } catch (err) {
        console.error('Duplicate check failed:', err.message);
      }
    }
    
    const complaint = new Complaint({
      citizenInfo: {
        name,
        phone,
        email,
      },
      // Link to citizen user if authenticated
      citizenUser: data.citizenUser,
      description,
      category: {
        primary: classification.category,
        confidence: classification.confidence,
        subcategory: classification.subcategory,
        urgency: classification.urgency,
        keywords: classification.keywords,
        classificationSource: classification.source,
        needsReview: classification.needsReview,
      },
      ...(location && { location }),
      // Hierarchy assignment from controller (optional)
      ...(data.ucId && { ucId: data.ucId }),
      ...(data.ucNumber && { ucNumber: data.ucNumber }),
      ...(data.townId && { townId: data.townId }),
      ...(data.cityId && { cityId: data.cityId }),
      images,
      source,
      ...(duplicateCheck.potentialDuplicate && { duplicateOf: duplicateCheck.potentialDuplicate }),
      metadata: {
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
        aiProcessing: {
          classificationTime: classification.processingTime,
          duplicateCheckDetails: duplicateCheck.checkDetails,
        },
        ...(data.ucAssignment && { ucAssignment: data.ucAssignment }),
      },
    });

    await complaint.save();

    // Link duplicates if found
    if (duplicateCheck.isDuplicate && duplicateCheck.potentialDuplicate) {
      await duplicateService.linkDuplicates(
        duplicateCheck.potentialDuplicate,
        complaint._id
      );
    }

    console.log(`[Complaint Service] Complete! Complaint ${complaint.complaintId} created.`);

    return {
      complaint,
      classification,
      duplicateCheck,
    };
  }

  /**
   * Get complaints with filters and pagination
   */
  async getComplaints(filters = {}) {
    const {
      page = PAGINATION.DEFAULT_PAGE,
      limit = PAGINATION.DEFAULT_LIMIT,
      lat,
      lng,
      radius = GEO.DEFAULT_RADIUS,
      sort_by,
      sort_order,
      // New hierarchy filters
      ucId,
      townId,
      cityId,
      citizenUser,
      slaBreach,
      ...otherFilters
    } = filters;

    // Build query
    let query = buildComplaintQuery(otherFilters);
    let complaints;
    let totalCount;

    // Add hierarchy filters
    if (ucId) query.ucId = ucId;
    if (townId) query.townId = townId;
    if (cityId) query.cityId = cityId;
    if (citizenUser) query.citizenUser = citizenUser;
    if (slaBreach) query.slaBreach = true;

    // Handle geo-queries
    if (lat && lng) {
      // For geo-queries, we need to use $nearSphere
      query.location = {
        $nearSphere: {
          $geometry: {
            type: 'Point',
            coordinates: [parseFloat(lng), parseFloat(lat)],
          },
          $maxDistance: radius,
        },
      };
    }

    // Build sort
    const sort = buildSortObject(sort_by, sort_order);

    // Execute query with pagination
    const skip = (page - 1) * limit;

    // Get total count (without geo-sort)
    const countQuery = { ...query };
    if (countQuery.location && countQuery.location.$nearSphere) {
      // Convert to $geoWithin for counting
      countQuery.location = {
        $geoWithin: {
          $centerSphere: [
            [parseFloat(lng), parseFloat(lat)],
            radius / 6371000, // Convert meters to radians
          ],
        },
      };
    }
    totalCount = await Complaint.countDocuments(countQuery);

    // Get complaints with hierarchy population
    complaints = await Complaint.find(query)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .populate('assignedTo', 'name department')
      .populate('ucId', 'name code')
      .populate('townId', 'name code')
      .populate('cityId', 'name code')
      .lean();

    // Generate pagination metadata
    const pagination = getPaginationMeta(page, limit, totalCount);

    return {
      complaints,
      pagination,
    };
  }

  /**
   * Get a single complaint by ID
   */
  async getComplaintById(id) {
    // Try to find by complaintId first, then by _id
    let complaint = await Complaint.findOne({ complaintId: id })
      .populate('assignedTo', 'name department')
      .populate('duplicateOf', 'complaintId description')
      .populate('linkedComplaints', 'complaintId description status.current')
      .populate('ucId', 'name code')
      .populate('townId', 'name code')
      .populate('cityId', 'name code')
      .populate('citizenUser', 'name email');

    if (!complaint) {
      // Try ObjectId
      complaint = await Complaint.findById(id)
        .populate('assignedTo', 'name department')
        .populate('duplicateOf', 'complaintId description')
        .populate('linkedComplaints', 'complaintId description status.current')
        .populate('ucId', 'name code')
        .populate('townId', 'name code')
        .populate('cityId', 'name code')
        .populate('citizenUser', 'name email');
    }

    if (!complaint) {
      throw new AppError('Complaint not found', 404);
    }

    return complaint;
  }

  /**
   * Update complaint status
   */
  async updateStatus(id, { status, remarks, updatedBy, updatedByRole, rating, feedback, citizenResolved }) {
    const complaint = await this.getComplaintById(id);
    
    // Use the model's updateStatus method (pass role for status history)
    await complaint.updateStatus(status, updatedBy, updatedByRole || 'system', remarks);

    // Handle citizen feedback for resolved complaints
    if (status === 'citizen_feedback' && rating) {
      complaint.resolution = complaint.resolution || {};
      complaint.resolution.feedback = {
        rating,
        comment: feedback,
        citizenResolved: citizenResolved !== false,
        submittedAt: new Date(),
      };
      await complaint.save();
    }

    // Check and mark SLA breach
    if (!complaint.slaBreach && complaint.slaDeadline && new Date() > complaint.slaDeadline) {
      complaint.slaBreach = true;
      await complaint.save();
    }

    return complaint;
  }

  /**
   * Get aggregated statistics
   */
  async getStats(filters = {}) {
    const stats = await Complaint.getStats(filters);

    // Process stats
    const processed = {
      totalComplaints: stats.total[0]?.count || 0,
      byCategory: {},
      byStatus: {},
      byArea: [],
      averageResolutionTime: stats.avgResolutionTime?.[0]?.avgTime || 0,
      averageFeedbackRating: stats.avgFeedbackRating?.[0]?.avgRating || 0,
      todayCount: 0,
      weeklyTrend: [],
    };

    // Convert arrays to objects for easier consumption
    stats.byCategory.forEach((item) => {
      processed.byCategory[item._id || 'Unknown'] = item.count;
    });

    stats.byStatus.forEach((item) => {
      processed.byStatus[item._id || 'Unknown'] = item.count;
    });

    processed.byArea = stats.byArea.map((item) => ({
      area: item._id || 'Unknown',
      count: item.count,
    }));

    // Get today's count
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    processed.todayCount = await Complaint.countDocuments({
      createdAt: { $gte: today },
    });

    // Get weekly trend
    processed.weeklyTrend = await this.getWeeklyTrend();

    return processed;
  }

  /**
   * Get weekly complaint trend
   */
  async getWeeklyTrend() {
    const { start } = getDateRange(7);

    const trend = await Complaint.aggregate([
      {
        $match: {
          createdAt: { $gte: start },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' },
          },
          count: { $sum: 1 },
        },
      },
      {
        $sort: { _id: 1 },
      },
    ]);

    return trend.map((item) => ({
      date: item._id,
      count: item.count,
    }));
  }

  /**
   * Get heatmap data
   */
  async getHeatmapData(filters = {}) {
    const { category, days = TIME.DEFAULT_REPORT_DAYS } = filters;
    const { start } = getDateRange(days);

    const matchStage = {
      createdAt: { $gte: start },
      // Only show active (unresolved) complaints on the heatmap
      'status.current': { $nin: ['resolved', 'closed', 'citizen_feedback'] },
    };

    if (category) {
      matchStage['category.primary'] = category;
    }

    // Aggregate complaints by location grid
    const clusters = await Complaint.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: {
            // Round to 3 decimal places (~111m precision)
            lat: {
              $round: [{ $arrayElemAt: ['$location.coordinates', 1] }, 3],
            },
            lng: {
              $round: [{ $arrayElemAt: ['$location.coordinates', 0] }, 3],
            },
          },
          count: { $sum: 1 },
          categories: { $push: '$category.primary' },
          avgSeverity: { $avg: '$severity.score' },
        },
      },
      {
        $project: {
          _id: 0,
          lat: '$_id.lat',
          lng: '$_id.lng',
          count: 1,
          category: { $arrayElemAt: ['$categories', 0] },
          intensity: {
            $min: [{ $multiply: [{ $divide: ['$count', 10] }, '$avgSeverity'] }, 1],
          },
        },
      },
    ]);

    return clusters;
  }

  /**
   * Get global heatmap data (all complaints with severity weighting)
   * For red/orange/green gradient showing problem density
   */
  async getGlobalHeatmap(filters = {}) {
    const { category, days = TIME.DEFAULT_REPORT_DAYS, precision = 3 } = filters;
    const { start } = getDateRange(days);

    const matchStage = {
      createdAt: { $gte: start },
      // Only show active (unresolved) complaints on the global heatmap
      'status.current': { $nin: ['resolved', 'closed', 'citizen_feedback'] },
    };

    if (category) {
      matchStage['category.primary'] = category;
    }

    // Aggregate complaints by location grid with severity weighting
    const clusters = await Complaint.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: {
            // Round to specified decimal places (3 = ~111m, 4 = ~11m)
            lat: {
              $round: [{ $arrayElemAt: ['$location.coordinates', 1] }, precision],
            },
            lng: {
              $round: [{ $arrayElemAt: ['$location.coordinates', 0] }, precision],
            },
          },
          count: { $sum: 1 },
          avgSeverity: { $avg: '$severity.score' },
          maxSeverity: { $max: '$severity.score' },
          categories: { $push: '$category.primary' },
        },
      },
      {
        $project: {
          _id: 0,
          lat: '$_id.lat',
          lng: '$_id.lng',
          count: 1,
          avgSeverity: { $round: ['$avgSeverity', 2] },
          maxSeverity: 1,
          primaryCategory: { $arrayElemAt: ['$categories', 0] },
          // Intensity: normalized weighted score (count × avgSeverity / 10)
          intensity: {
            $divide: [
              { $multiply: ['$count', '$avgSeverity'] },
              10,
            ],
          },
        },
      },
      { $sort: { intensity: -1 } },
    ]);

    return clusters;
  }

  /**
   * Get profile heatmap data (resolved complaints by specific entity)
   * For yellow/red gradient showing organizational/community impact
   */
  async getProfileHeatmap(entityId, filters = {}) {
    if (!entityId) {
      throw new Error('Entity ID is required for profile heatmap');
    }

    const { days = 365, precision = 3 } = filters; // Default to 1 year
    const { start } = getDateRange(days);

    const matchStage = {
      'status.current': 'resolved',
      'resolution.resolvedBy': entityId,
      createdAt: { $gte: start },
    };

    // Aggregate resolved complaints by location
    const clusters = await Complaint.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: {
            lat: {
              $round: [{ $arrayElemAt: ['$location.coordinates', 1] }, precision],
            },
            lng: {
              $round: [{ $arrayElemAt: ['$location.coordinates', 0] }, precision],
            },
          },
          count: { $sum: 1 },
          avgResolutionTime: {
            $avg: {
              $divide: [
                {
                  $subtract: ['$resolution.resolvedAt', '$createdAt'],
                },
                1000 * 60 * 60 * 24, // Convert to days
              ],
            },
          },
          categories: { $push: '$category.primary' },
        },
      },
      {
        $project: {
          _id: 0,
          lat: '$_id.lat',
          lng: '$_id.lng',
          count: 1,
          avgResolutionTime: { $round: ['$avgResolutionTime', 1] },
          primaryCategory: { $arrayElemAt: ['$categories', 0] },
          // Intensity: based on resolution count (higher = more impact)
          intensity: {
            $divide: ['$count', 5], // Normalize by dividing by 5
          },
        },
      },
      { $sort: { count: -1 } },
    ]);

    return {
      entityId,
      totalResolved: clusters.reduce((sum, c) => sum + c.count, 0),
      clusters,
    };
  }

  /**
   * Check for potential duplicate complaints
   * Uses the enhanced duplicate detection service
   */
  async checkDuplicates(longitude, latitude, description, category = null, radiusMeters = 500) {
    return duplicateService.checkForDuplicates(
      { description, longitude, latitude, category },
      { radius: radiusMeters }
    );
  }

  /**
   * Get AI processing statistics
   */
  async getAIStats() {
    const classificationStats = classificationService.getClassificationStats();
    const duplicateStats = await duplicateService.getDuplicateStats(30);
    const severityStats = await severityService.getSeverityStats(30);

    return {
      classification: classificationStats,
      duplicates: duplicateStats,
      severity: severityStats,
    };
  }

  /**
   * Recalculate severity for a complaint
   */
  async recalculateSeverity(complaintId) {
    return severityService.recalculateSeverity(complaintId);
  }

  /**
   * Reclassify a complaint
   */
  async reclassifyComplaint(complaintId) {
    const complaint = await this.getComplaintById(complaintId);
    
    const classification = await classificationService.classifyComplaint(complaint.description);
    
    complaint.category = {
      primary: classification.category,
      confidence: classification.confidence,
      subcategory: classification.subcategory,
      urgency: classification.urgency,
      keywords: classification.keywords,
      classificationSource: classification.source,
      needsReview: classification.needsReview,
    };
    
    await complaint.save();
    
    return { complaint, classification };
  }
}

module.exports = new ComplaintService();
