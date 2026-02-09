const { complaintService } = require('../services');
const { asyncHandler, AppError } = require('../middlewares/errorHandler');
const { SUCCESS_MESSAGES, HTTP_STATUS } = require('../utils/constants');
const ucAssignmentService = require('../services/ucAssignmentService');
const { AuditLog } = require('../models');

/**
 * Complaint Controller
 * Handles HTTP requests for complaint operations
 * Updated for UC → Town → City hierarchy
 */

/**
 * @desc    Submit a new complaint
 * @route   POST /api/v1/complaints
 * @access  Public (or authenticated citizen)
 */
const createComplaint = asyncHandler(async (req, res) => {
  const {
    description,
    phone,
    name,
    email,
    latitude,
    longitude,
    address,
    source,
    ucId, // Optional: manual UC selection
  } = req.body;

  // Validate description is provided
  if (!description || description.trim().length === 0) {
    throw new AppError('Complaint description is required', HTTP_STATUS.BAD_REQUEST);
  }

  const lat = latitude ? parseFloat(latitude) : null;
  const lng = longitude ? parseFloat(longitude) : null;

  // Automatically assign UC based on location (optional)
  let ucAssignment = null;
  if (lat && lng && !isNaN(lat) && !isNaN(lng)) {
    try {
      if (ucId) {
        // Manual UC selection - validate it
        ucAssignment = await ucAssignmentService.validateManualSelection(ucId, lng, lat);
        if (!ucAssignment.valid) {
          console.warn('Manual UC selection validation failed:', ucAssignment.error);
          ucAssignment = null;
        } else {
          ucAssignment.method = 'manual';
          ucAssignment.confidence = 'manual';
        }
      } else {
        // Auto-assign by location
        ucAssignment = await ucAssignmentService.assignByLocation(lng, lat);
        if (ucAssignment.error) {
          console.warn('Auto UC assignment failed:', ucAssignment.error);
          ucAssignment = null;
        }
      }
    } catch (err) {
      console.error('UC assignment error:', err);
      ucAssignment = null;
    }
  }

  // Add request metadata and hierarchy info
  const data = {
    description,
    phone,
    name,
    email,
    latitude: lat,
    longitude: lng,
    address,
    source: source || 'web',
    // Hierarchy assignment (optional)
    ucId: ucAssignment?.ucId,
    ucNumber: ucAssignment?.uc?.ucNumber || ucAssignment?.uc?.code,
    townId: ucAssignment?.townId,
    cityId: ucAssignment?.cityId,
    ucAssignment: ucAssignment ? {
      method: ucAssignment.method,
      confidence: ucAssignment.confidence,
      distance: ucAssignment.distance,
    } : null,
    // If authenticated user, link to their account
    citizenUser: req.user?._id,
    ipAddress: req.ip || req.connection.remoteAddress,
    userAgent: req.get('User-Agent'),
  };

  const result = await complaintService.createComplaint(data, req.files);

  // Audit log for complaint creation
  await AuditLog.logComplaint('COMPLAINT_CREATE', result.complaint, req.user, req, {
    context: {
      ucId: ucAssignment?.ucId?.toString(),
      ucNumber: result.complaint.ucNumber,
      source: data.source,
    },
  });

  res.status(HTTP_STATUS.CREATED).json({
    success: true,
    message: SUCCESS_MESSAGES.COMPLAINT_CREATED,
    data: {
      complaintId: result.complaint.complaintId,
      category: {
        primary: result.complaint.category.primary,
        subcategory: result.complaint.category.subcategory,
        urgency: result.complaint.category.urgency,
        keywords: result.complaint.category.keywords,
        source: result.complaint.category.classificationSource,
        needsReview: result.complaint.category.needsReview,
      },
      status: result.complaint.status.current,
      location: {
        address: result.complaint.location?.address,
        area: result.complaint.location?.area,
        uc: result.complaint.location?.uc,
      },
      // Include hierarchy info in response
      hierarchy: ucAssignment ? {
        uc: ucAssignment.uc?.name,
        ucNumber: result.complaint.ucNumber,
        town: ucAssignment.town?.name,
        city: ucAssignment.city?.name,
        assignmentMethod: ucAssignment.method,
        confidence: ucAssignment.confidence,
      } : null,
      duplicateInfo: result.duplicateCheck.isDuplicate
        ? {
            isDuplicate: true,
            similarTo: result.duplicateCheck.potentialDuplicate,
            similarity: result.duplicateCheck.similarity,
          }
        : { isDuplicate: false },
      aiProcessing: {
        processedAt: result.complaint.metadata?.aiProcessing?.processedAt,
        classificationTime: result.complaint.metadata?.aiProcessing?.classificationTime,
      },
    },
  });
});

/**
 * @desc    Get complaints with filters
 * @route   GET /api/v1/complaints
 * @access  Protected (role-based filtering via hierarchyAccess middleware)
 */
const getComplaints = asyncHandler(async (req, res) => {
  const filters = {
    page: parseInt(req.query.page, 10) || 1,
    limit: parseInt(req.query.limit, 10) || 20,
    category: req.query.category,
    status: req.query.status,
    area: req.query.area,
    ward: req.query.ward,
    severity_min: req.query.severity_min ? parseInt(req.query.severity_min, 10) : undefined,
    severity_max: req.query.severity_max ? parseInt(req.query.severity_max, 10) : undefined,
    date_from: req.query.date_from,
    date_to: req.query.date_to,
    lat: req.query.lat ? parseFloat(req.query.lat) : undefined,
    lng: req.query.lng ? parseFloat(req.query.lng) : undefined,
    radius: req.query.radius ? parseInt(req.query.radius, 10) : undefined,
    sort_by: req.query.sort_by,
    sort_order: req.query.sort_order,
    // New hierarchy filters
    ucId: req.query.ucId,
    townId: req.query.townId,
    cityId: req.query.cityId,
    slaBreach: req.query.slaBreach === 'true',
  };

  // Apply hierarchy filter from middleware (if authenticated)
  // This restricts results based on user's role and assigned area
  if (req.hierarchyFilter) {
    Object.assign(filters, req.hierarchyFilter);
  }

  // Remove undefined values
  Object.keys(filters).forEach((key) => {
    if (filters[key] === undefined) {
      delete filters[key];
    }
  });

  const result = await complaintService.getComplaints(filters);

  res.status(HTTP_STATUS.OK).json({
    success: true,
    data: {
      complaints: result.complaints.map(formatComplaintResponse),
      pagination: result.pagination,
    },
  });
});

/**
 * @desc    Get single complaint by ID
 * @route   GET /api/v1/complaints/:id
 * @access  Public
 */
const getComplaintById = asyncHandler(async (req, res) => {
  const complaint = await complaintService.getComplaintById(req.params.id);

  res.status(HTTP_STATUS.OK).json({
    success: true,
    data: formatComplaintResponse(complaint.toObject()),
  });
});

/**
 * @desc    Update complaint status
 * @route   PATCH /api/v1/complaints/:id/status
 * @access  Protected - UC Chairman, Town Chairman, Mayor, Website Admin
 */
const updateComplaintStatus = asyncHandler(async (req, res) => {
  const { status, remarks } = req.body;
  const complaintId = req.params.id;

  // Get complaint first to check permissions
  const complaint = await complaintService.getComplaintById(complaintId);
  
  // Verify user has access to this complaint's UC/Town/City
  const user = req.user;
  const canUpdate = await verifyComplaintAccess(user, complaint);
  
  if (!canUpdate) {
    throw new AppError(
      'You do not have permission to update this complaint',
      HTTP_STATUS.FORBIDDEN
    );
  }

  // Handle citizen feedback separately
  if (status === 'citizen_feedback') {
    // Only the original citizen can provide feedback
    if (!user || user.role !== 'citizen' || 
        user._id.toString() !== complaint.citizenUser?.toString()) {
      throw new AppError(
        'Only the original complainant can provide feedback',
        HTTP_STATUS.FORBIDDEN
      );
    }
    
    // Citizen feedback requires rating
    if (!req.body.rating) {
      throw new AppError(
        'Rating is required for citizen feedback',
        HTTP_STATUS.BAD_REQUEST
      );
    }
  }

  const updatedComplaint = await complaintService.updateStatus(complaintId, {
    status,
    remarks,
    updatedBy: user._id,
    updatedByRole: user.role,
    rating: req.body.rating,
    feedback: req.body.feedback,
  });

  // Audit log
  await AuditLog.logComplaint('COMPLAINT_STATUS_UPDATE', complaint, user, req, {
    statusTransition: {
      from: complaint.status.current,
      to: status,
    },
    context: {
      complaintId: complaint.complaintId,
      previousStatus: complaint.status.current,
      newStatus: status,
      remarks,
    },
  });

  res.status(HTTP_STATUS.OK).json({
    success: true,
    message: SUCCESS_MESSAGES.STATUS_UPDATED,
    data: {
      complaintId: updatedComplaint.complaintId,
      currentStatus: updatedComplaint.status.current,
      statusHistory: updatedComplaint.status.history,
      slaBreach: updatedComplaint.slaBreach,
    },
  });
});

/**
 * Verify user has access to update a complaint
 */
const verifyComplaintAccess = async (user, complaint) => {
  if (!user) return false;
  
  // Website admin has access to all
  if (user.role === 'website_admin') return true;

  // Helper to extract ObjectId string from a field that may be populated or raw
  const toIdString = (field) => {
    if (!field) return null;
    // If populated (document with _id), extract _id
    if (field._id) return field._id.toString();
    return field.toString();
  };
  
  // Mayor has access to their city
  if (user.role === 'mayor') {
    return toIdString(user.cityId) === toIdString(complaint.cityId);
  }
  
  // Town chairman has access to their town
  if (user.role === 'town_chairman') {
    return toIdString(user.townId) === toIdString(complaint.townId);
  }
  
  // UC chairman has access to their UC
  if (user.role === 'uc_chairman') {
    return toIdString(user.ucId) === toIdString(complaint.ucId);
  }
  
  // Citizens can only provide feedback on their own resolved complaints
  if (user.role === 'citizen') {
    return user._id.toString() === toIdString(complaint.citizenUser);
  }
  
  return false;
};

/**
 * @desc    Get complaint statistics
 * @route   GET /api/v1/complaints/stats
 * @access  Public
 */
const getStats = asyncHandler(async (req, res) => {
  const filters = {
    dateFrom: req.query.date_from,
    dateTo: req.query.date_to,
    area: req.query.area,
  };

  const stats = await complaintService.getStats(filters);

  res.status(HTTP_STATUS.OK).json({
    success: true,
    data: stats,
  });
});

/**
 * @desc    Get heatmap data
 * @route   GET /api/v1/complaints/heatmap
 * @access  Public
 */
const getHeatmap = asyncHandler(async (req, res) => {
  const filters = {
    category: req.query.category,
    days: req.query.days ? parseInt(req.query.days, 10) : 30,
  };

  const clusters = await complaintService.getHeatmapData(filters);

  res.status(HTTP_STATUS.OK).json({
    success: true,
    data: {
      clusters,
      count: clusters.length,
    },
  });
});

/**
 * @desc    Get global heatmap (all complaints, severity-weighted)
 * @route   GET /api/v1/complaints/heatmap/global
 * @access  Public
 */
const getGlobalHeatmap = asyncHandler(async (req, res) => {
  const filters = {
    category: req.query.category,
    days: req.query.days ? parseInt(req.query.days, 10) : 30,
    precision: req.query.precision ? parseInt(req.query.precision, 10) : 3,
  };

  const clusters = await complaintService.getGlobalHeatmap(filters);

  res.status(HTTP_STATUS.OK).json({
    success: true,
    message: 'Global heatmap data retrieved successfully',
    data: {
      type: 'global',
      filters: {
        category: filters.category || 'all',
        days: filters.days,
        precision: filters.precision,
      },
      clusters,
      count: clusters.length,
      totalIntensity: clusters.reduce((sum, c) => sum + c.intensity, 0),
    },
  });
});

/**
 * @desc    Get profile heatmap (resolved complaints by entity)
 * @route   GET /api/v1/complaints/heatmap/profile/:entityId
 * @access  Public
 */
const getProfileHeatmap = asyncHandler(async (req, res) => {
  const { entityId } = req.params;

  if (!entityId) {
    throw new AppError('Entity ID is required', HTTP_STATUS.BAD_REQUEST);
  }

  const filters = {
    days: req.query.days ? parseInt(req.query.days, 10) : 365,
    precision: req.query.precision ? parseInt(req.query.precision, 10) : 3,
  };

  const result = await complaintService.getProfileHeatmap(entityId, filters);

  res.status(HTTP_STATUS.OK).json({
    success: true,
    message: 'Profile heatmap data retrieved successfully',
    data: {
      type: 'profile',
      entityId: result.entityId,
      totalResolved: result.totalResolved,
      filters: {
        days: filters.days,
        precision: filters.precision,
      },
      clusters: result.clusters,
      count: result.clusters.length,
    },
  });
});

/**
 * @desc    Get AI classification statistics
 * @route   GET /api/v1/complaints/ai-stats
 * @access  Public
 */
const getAIStats = asyncHandler(async (req, res) => {
  const stats = await complaintService.getAIStats();

  res.status(HTTP_STATUS.OK).json({
    success: true,
    data: stats,
  });
});

/**
 * @desc    Submit citizen feedback for a resolved complaint
 * @route   POST /api/v1/complaints/:id/feedback
 * @access  Protected - Citizen (own complaints only)
 */
const submitCitizenFeedback = asyncHandler(async (req, res) => {
  const { rating, comment, resolved } = req.body;
  const complaintId = req.params.id;

  // Validate rating
  if (!rating || rating < 1 || rating > 5) {
    throw new AppError('Rating must be between 1 and 5', HTTP_STATUS.BAD_REQUEST);
  }

  const complaint = await complaintService.getComplaintById(complaintId);

  // Verify complaint belongs to this citizen
  if (!req.user || req.user._id.toString() !== complaint.citizenUser?.toString()) {
    throw new AppError(
      'You can only provide feedback on your own complaints',
      HTTP_STATUS.FORBIDDEN
    );
  }

  // Verify complaint is in resolved status
  if (complaint.status.current !== 'resolved') {
    throw new AppError(
      'Feedback can only be provided for resolved complaints',
      HTTP_STATUS.BAD_REQUEST
    );
  }

  // Update complaint with feedback
  const updatedComplaint = await complaintService.updateStatus(complaintId, {
    status: 'citizen_feedback',
    rating,
    feedback: comment,
    citizenResolved: resolved !== false, // Default true if not specified
    updatedBy: req.user._id,
  });

  // Audit log
  await AuditLog.logComplaint('CITIZEN_FEEDBACK', complaint, req.user, req, {
    context: {
      complaintId: complaint.complaintId,
      rating,
      citizenResolved: resolved !== false,
    },
  });

  res.status(HTTP_STATUS.OK).json({
    success: true,
    message: 'Thank you for your feedback!',
    data: {
      complaintId: updatedComplaint.complaintId,
      status: updatedComplaint.status.current,
      feedback: {
        rating,
        comment,
        citizenResolved: resolved !== false,
      },
    },
  });
});

/**
 * @desc    Get SLA breach summary
 * @route   GET /api/v1/complaints/sla-breaches
 * @access  Protected - UC Chairman+
 */
const getSLABreaches = asyncHandler(async (req, res) => {
  const filters = {
    slaBreach: true,
    status: { $nin: ['closed', 'citizen_feedback'] },
    ...req.hierarchyFilter, // Apply role-based filtering
  };

  if (req.query.category) filters.category = req.query.category;
  if (req.query.ucId) filters.ucId = req.query.ucId;
  if (req.query.townId) filters.townId = req.query.townId;

  const { Complaint } = require('../models');
  
  const breaches = await Complaint.find(filters)
    .populate('ucId', 'name code')
    .populate('townId', 'name code')
    .populate('cityId', 'name code')
    .sort({ slaDeadline: 1 })
    .limit(100);

  // Calculate overdue time for each
  const now = new Date();
  const formattedBreaches = breaches.map(complaint => ({
    complaintId: complaint.complaintId,
    category: complaint.category.primary,
    status: complaint.status.current,
    slaDeadline: complaint.slaDeadline,
    overdueHours: Math.round((now - complaint.slaDeadline) / (1000 * 60 * 60)),
    uc: complaint.ucId?.name,
    town: complaint.townId?.name,
    createdAt: complaint.createdAt,
  }));

  res.status(HTTP_STATUS.OK).json({
    success: true,
    data: {
      count: formattedBreaches.length,
      breaches: formattedBreaches,
    },
  });
});

/**
 * @desc    Get my complaints (for citizens)
 * @route   GET /api/v1/complaints/my
 * @access  Protected - Citizen
 */
const getMyComplaints = asyncHandler(async (req, res) => {
  if (!req.user) {
    throw new AppError('Authentication required', HTTP_STATUS.UNAUTHORIZED);
  }

  const filters = {
    citizenUser: req.user._id,
    page: parseInt(req.query.page, 10) || 1,
    limit: parseInt(req.query.limit, 10) || 20,
    status: req.query.status,
  };

  const result = await complaintService.getComplaints(filters);

  res.status(HTTP_STATUS.OK).json({
    success: true,
    data: {
      complaints: result.complaints.map(formatComplaintResponse),
      pagination: result.pagination,
    },
  });
});

/**
 * Format complaint for API response
 */
const formatComplaintResponse = (complaint) => {
  if (!complaint) return null;
  
  return {
    id: complaint._id,
    complaintId: complaint.complaintId,
    description: complaint.description,
    category: complaint.category ? {
      primary: complaint.category.primary || 'General',
      subcategory: complaint.category.subcategory,
      urgency: complaint.category.urgency || 'medium',
      keywords: complaint.category.keywords || [],
      source: complaint.category.classificationSource,
      needsReview: complaint.category.needsReview || false,
    } : { primary: 'General', urgency: 'medium', keywords: [], needsReview: false },
    status: complaint.status?.current || 'submitted',
    statusHistory: complaint.status?.history || [],
    severity: complaint.severity ? {
      score: complaint.severity.score || 50,
      priority: complaint.severity.priority || 'medium',
      factors: complaint.severity.factors || {},
    } : { score: 50, priority: 'medium', factors: {} },
    location: complaint.location ? {
      coordinates: Array.isArray(complaint.location.coordinates) ? complaint.location.coordinates : [],
      address: complaint.location.address || '',
      area: complaint.location.area || null,
      ward: complaint.location.ward || null,
      pincode: complaint.location.pincode || null,
    } : { coordinates: [], address: '' },
    // Hierarchy information (handle both ObjectId and populated objects)
    hierarchy: {
      ucId: typeof complaint.ucId === 'object' && complaint.ucId !== null ? complaint.ucId._id : complaint.ucId,
      townId: typeof complaint.townId === 'object' && complaint.townId !== null ? complaint.townId._id : complaint.townId,
      cityId: typeof complaint.cityId === 'object' && complaint.cityId !== null ? complaint.cityId._id : complaint.cityId,
      ucName: typeof complaint.ucId === 'object' && complaint.ucId !== null ? complaint.ucId.name : null,
      townName: typeof complaint.townId === 'object' && complaint.townId !== null ? complaint.townId.name : null,
      cityName: typeof complaint.cityId === 'object' && complaint.cityId !== null ? complaint.cityId.name : null,
    },
    // SLA tracking
    sla: {
      deadline: complaint.slaDeadline,
      targetHours: complaint.slaHours,
      breach: complaint.slaBreach || false,
    },
    citizenInfo: {
      name: complaint.citizenInfo?.name || 'Anonymous',
      phone: maskPhone(complaint.citizenInfo?.phone),
      email: complaint.citizenInfo?.email ? maskEmail(complaint.citizenInfo.email) : null,
    },
    images: complaint.images?.map((img) => ({
      url: img.url,
    })) || [],
    source: complaint.source || 'web',
    assignedTo: complaint.assignedTo,
    resolution: complaint.resolution,
    duplicateOf: complaint.duplicateOf,
    aiProcessing: complaint.metadata?.aiProcessing || null,
    createdAt: complaint.createdAt,
    updatedAt: complaint.updatedAt,
  };
};

/**
 * Mask phone number for privacy
 */
const maskPhone = (phone) => {
  if (!phone) return null;
  if (phone.length <= 4) return phone;
  return phone.slice(0, 2) + '*'.repeat(phone.length - 4) + phone.slice(-2);
};

/**
 * Mask email for privacy
 */
const maskEmail = (email) => {
  if (!email) return null;
  const [local, domain] = email.split('@');
  if (local.length <= 2) return email;
  return local[0] + '*'.repeat(local.length - 2) + local.slice(-1) + '@' + domain;
};

module.exports = {
  createComplaint,
  getComplaints,
  getComplaintById,
  updateComplaintStatus,
  getStats,
  getHeatmap,
  getGlobalHeatmap,
  getProfileHeatmap,
  getAIStats,
  submitCitizenFeedback,
  getSLABreaches,
  getMyComplaints,
};
