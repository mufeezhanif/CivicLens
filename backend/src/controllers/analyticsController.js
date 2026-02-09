/**
 * Analytics Controller
 * Provides comprehensive analytics for hierarchy-based reporting
 */

const { Complaint, UC, Town, City, User, AuditLog } = require('../models');
const asyncHandler = require('../utils/asyncHandler');
const ErrorResponse = require('../utils/errorResponse');

/**
 * @desc    Get UC-level analytics
 * @route   GET /api/v1/analytics/uc/:ucId
 * @access  Protected - UC Chairman (own UC), Town Chairman+
 */
exports.getUCAnalytics = asyncHandler(async (req, res, next) => {
  const { ucId } = req.params;
  const { days = 30 } = req.query;
  
  const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  // Verify access
  if (req.user.role === 'uc_chairman' && req.user.uc?.toString() !== ucId) {
    return next(new ErrorResponse('Not authorized to view this UC analytics', 403));
  }

  const uc = await UC.findById(ucId);
  if (!uc) {
    return next(new ErrorResponse('UC not found', 404));
  }

  // Aggregation pipeline for UC statistics
  const stats = await Complaint.aggregate([
    {
      $match: {
        ucId: uc._id,
        createdAt: { $gte: startDate },
      },
    },
    {
      $facet: {
        totalCount: [{ $count: 'count' }],
        byStatus: [
          { $group: { _id: '$status.current', count: { $sum: 1 } } },
        ],
        byCategory: [
          { $group: { _id: '$category.primary', count: { $sum: 1 } } },
        ],
        slaBreach: [
          { $match: { slaBreach: true } },
          { $count: 'count' },
        ],
        avgResolutionTime: [
          {
            $match: {
              'status.current': { $in: ['resolved', 'closed', 'citizen_feedback'] },
              'resolution.resolvedAt': { $exists: true },
            },
          },
          {
            $project: {
              resolutionTime: {
                $divide: [
                  { $subtract: ['$resolution.resolvedAt', '$createdAt'] },
                  1000 * 60 * 60, // Convert to hours
                ],
              },
            },
          },
          {
            $group: {
              _id: null,
              avgTime: { $avg: '$resolutionTime' },
            },
          },
        ],
        dailyTrend: [
          {
            $group: {
              _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
              count: { $sum: 1 },
            },
          },
          { $sort: { _id: 1 } },
        ],
        citizenFeedback: [
          {
            $match: {
              'resolution.feedback.rating': { $exists: true },
            },
          },
          {
            $group: {
              _id: null,
              avgRating: { $avg: '$resolution.feedback.rating' },
              totalFeedback: { $sum: 1 },
            },
          },
        ],
      },
    },
  ]);

  const result = stats[0];

  res.status(200).json({
    success: true,
    data: {
      uc: {
        id: uc._id,
        name: uc.name,
        code: uc.code,
      },
      period: { days, startDate },
      summary: {
        totalComplaints: result.totalCount[0]?.count || 0,
        slaBreaches: result.slaBreach[0]?.count || 0,
        avgResolutionHours: Math.round(result.avgResolutionTime[0]?.avgTime || 0),
        avgCitizenRating: result.citizenFeedback[0]?.avgRating?.toFixed(1) || 'N/A',
        totalFeedback: result.citizenFeedback[0]?.totalFeedback || 0,
      },
      byStatus: result.byStatus.reduce((acc, s) => {
        acc[s._id] = s.count;
        return acc;
      }, {}),
      byCategory: result.byCategory.reduce((acc, c) => {
        acc[c._id] = c.count;
        return acc;
      }, {}),
      dailyTrend: result.dailyTrend,
    },
  });
});

/**
 * @desc    Get Town-level analytics (aggregated from UCs)
 * @route   GET /api/v1/analytics/town/:townId
 * @access  Protected - Town Chairman (own town), Mayor+
 */
exports.getTownAnalytics = asyncHandler(async (req, res, next) => {
  const { townId } = req.params;
  const { days = 30 } = req.query;
  
  const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  // Verify access
  if (req.user.role === 'town_chairman' && req.user.town?.toString() !== townId) {
    return next(new ErrorResponse('Not authorized to view this town analytics', 403));
  }

  const town = await Town.findById(townId);
  if (!town) {
    return next(new ErrorResponse('Town not found', 404));
  }

  // Get UC-wise breakdown
  const ucStats = await Complaint.aggregate([
    {
      $match: {
        townId: town._id,
        createdAt: { $gte: startDate },
      },
    },
    {
      $group: {
        _id: '$ucId',
        totalComplaints: { $sum: 1 },
        slaBreaches: {
          $sum: { $cond: ['$slaBreach', 1, 0] },
        },
        resolved: {
          $sum: {
            $cond: [
              { $in: ['$status.current', ['resolved', 'closed', 'citizen_feedback']] },
              1,
              0,
            ],
          },
        },
      },
    },
    {
      $lookup: {
        from: 'ucs',
        localField: '_id',
        foreignField: '_id',
        as: 'ucInfo',
      },
    },
    {
      $unwind: '$ucInfo',
    },
    {
      $project: {
        ucId: '$_id',
        ucName: '$ucInfo.name',
        ucCode: '$ucInfo.code',
        totalComplaints: 1,
        slaBreaches: 1,
        resolved: 1,
        resolutionRate: {
          $cond: [
            { $gt: ['$totalComplaints', 0] },
            { $multiply: [{ $divide: ['$resolved', '$totalComplaints'] }, 100] },
            0,
          ],
        },
      },
    },
    { $sort: { totalComplaints: -1 } },
  ]);

  // Overall town stats
  const townStats = await Complaint.aggregate([
    {
      $match: {
        townId: town._id,
        createdAt: { $gte: startDate },
      },
    },
    {
      $facet: {
        totalCount: [{ $count: 'count' }],
        byStatus: [
          { $group: { _id: '$status.current', count: { $sum: 1 } } },
        ],
        byCategory: [
          { $group: { _id: '$category.primary', count: { $sum: 1 } } },
        ],
        slaBreach: [
          { $match: { slaBreach: true } },
          { $count: 'count' },
        ],
        avgRating: [
          { $match: { 'resolution.feedback.rating': { $exists: true } } },
          { $group: { _id: null, avg: { $avg: '$resolution.feedback.rating' } } },
        ],
      },
    },
  ]);

  const result = townStats[0];

  res.status(200).json({
    success: true,
    data: {
      town: {
        id: town._id,
        name: town.name,
        code: town.code,
      },
      period: { days, startDate },
      summary: {
        totalComplaints: result.totalCount[0]?.count || 0,
        slaBreaches: result.slaBreach[0]?.count || 0,
        avgCitizenRating: result.avgRating[0]?.avg?.toFixed(1) || 'N/A',
        ucCount: ucStats.length,
      },
      byStatus: result.byStatus.reduce((acc, s) => {
        acc[s._id] = s.count;
        return acc;
      }, {}),
      byCategory: result.byCategory.reduce((acc, c) => {
        acc[c._id] = c.count;
        return acc;
      }, {}),
      ucBreakdown: ucStats,
    },
  });
});

/**
 * @desc    Get City-level analytics (aggregated from Towns)
 * @route   GET /api/v1/analytics/city/:cityId
 * @access  Protected - Mayor (own city), Website Admin
 */
exports.getCityAnalytics = asyncHandler(async (req, res, next) => {
  const { cityId } = req.params;
  const { days = 30 } = req.query;
  
  const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  // Verify access
  if (req.user.role === 'mayor' && req.user.city?.toString() !== cityId) {
    return next(new ErrorResponse('Not authorized to view this city analytics', 403));
  }

  const city = await City.findById(cityId);
  if (!city) {
    return next(new ErrorResponse('City not found', 404));
  }

  // Get Town-wise breakdown
  const townStats = await Complaint.aggregate([
    {
      $match: {
        cityId: city._id,
        createdAt: { $gte: startDate },
      },
    },
    {
      $group: {
        _id: '$townId',
        totalComplaints: { $sum: 1 },
        slaBreaches: {
          $sum: { $cond: ['$slaBreach', 1, 0] },
        },
        resolved: {
          $sum: {
            $cond: [
              { $in: ['$status.current', ['resolved', 'closed', 'citizen_feedback']] },
              1,
              0,
            ],
          },
        },
      },
    },
    {
      $lookup: {
        from: 'towns',
        localField: '_id',
        foreignField: '_id',
        as: 'townInfo',
      },
    },
    {
      $unwind: '$townInfo',
    },
    {
      $project: {
        townId: '$_id',
        townName: '$townInfo.name',
        townCode: '$townInfo.code',
        totalComplaints: 1,
        slaBreaches: 1,
        resolved: 1,
        resolutionRate: {
          $cond: [
            { $gt: ['$totalComplaints', 0] },
            { $multiply: [{ $divide: ['$resolved', '$totalComplaints'] }, 100] },
            0,
          ],
        },
      },
    },
    { $sort: { totalComplaints: -1 } },
  ]);

  // Overall city stats
  const cityStats = await Complaint.aggregate([
    {
      $match: {
        cityId: city._id,
        createdAt: { $gte: startDate },
      },
    },
    {
      $facet: {
        totalCount: [{ $count: 'count' }],
        byStatus: [
          { $group: { _id: '$status.current', count: { $sum: 1 } } },
        ],
        byCategory: [
          { $group: { _id: '$category.primary', count: { $sum: 1 } } },
        ],
        slaBreach: [
          { $match: { slaBreach: true } },
          { $count: 'count' },
        ],
        avgRating: [
          { $match: { 'resolution.feedback.rating': { $exists: true } } },
          { $group: { _id: null, avg: { $avg: '$resolution.feedback.rating' } } },
        ],
        weeklyTrend: [
          {
            $group: {
              _id: {
                $dateToString: { format: '%Y-%U', date: '$createdAt' },
              },
              count: { $sum: 1 },
            },
          },
          { $sort: { _id: 1 } },
          { $limit: 12 },
        ],
      },
    },
  ]);

  const result = cityStats[0];

  res.status(200).json({
    success: true,
    data: {
      city: {
        id: city._id,
        name: city.name,
        code: city.code,
      },
      period: { days, startDate },
      summary: {
        totalComplaints: result.totalCount[0]?.count || 0,
        slaBreaches: result.slaBreach[0]?.count || 0,
        avgCitizenRating: result.avgRating[0]?.avg?.toFixed(1) || 'N/A',
        townCount: townStats.length,
      },
      byStatus: result.byStatus.reduce((acc, s) => {
        acc[s._id] = s.count;
        return acc;
      }, {}),
      byCategory: result.byCategory.reduce((acc, c) => {
        acc[c._id] = c.count;
        return acc;
      }, {}),
      weeklyTrend: result.weeklyTrend,
      townBreakdown: townStats,
    },
  });
});

/**
 * @desc    Get system-wide analytics
 * @route   GET /api/v1/analytics/system
 * @access  Protected - Website Admin only
 */
exports.getSystemAnalytics = asyncHandler(async (req, res, next) => {
  const { days = 30 } = req.query;
  const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  // Overall system stats
  const systemStats = await Complaint.aggregate([
    {
      $match: {
        createdAt: { $gte: startDate },
      },
    },
    {
      $facet: {
        totalCount: [{ $count: 'count' }],
        byStatus: [
          { $group: { _id: '$status.current', count: { $sum: 1 } } },
        ],
        byCategory: [
          { $group: { _id: '$category.primary', count: { $sum: 1 } } },
        ],
        bySource: [
          { $group: { _id: '$source', count: { $sum: 1 } } },
        ],
        slaBreach: [
          { $match: { slaBreach: true } },
          { $count: 'count' },
        ],
        avgResolutionTime: [
          {
            $match: {
              'status.current': { $in: ['resolved', 'closed', 'citizen_feedback'] },
              'resolution.resolvedAt': { $exists: true },
            },
          },
          {
            $project: {
              resolutionTime: {
                $divide: [
                  { $subtract: ['$resolution.resolvedAt', '$createdAt'] },
                  1000 * 60 * 60,
                ],
              },
            },
          },
          {
            $group: {
              _id: null,
              avgTime: { $avg: '$resolutionTime' },
            },
          },
        ],
        dailyTrend: [
          {
            $group: {
              _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
              count: { $sum: 1 },
            },
          },
          { $sort: { _id: 1 } },
        ],
        byCity: [
          {
            $group: {
              _id: '$cityId',
              count: { $sum: 1 },
            },
          },
          {
            $lookup: {
              from: 'cities',
              localField: '_id',
              foreignField: '_id',
              as: 'cityInfo',
            },
          },
          { $unwind: { path: '$cityInfo', preserveNullAndEmptyArrays: true } },
          {
            $project: {
              cityName: { $ifNull: ['$cityInfo.name', 'Unknown'] },
              count: 1,
            },
          },
          { $sort: { count: -1 } },
        ],
      },
    },
  ]);

  // Entity counts
  const entityCounts = {
    cities: await City.countDocuments({ isActive: true }),
    towns: await Town.countDocuments({ isActive: true }),
    ucs: await UC.countDocuments({ isActive: true }),
    users: await User.countDocuments({ isActive: true }),
    admins: await User.countDocuments({ 
      role: { $in: ['uc_chairman', 'town_chairman', 'mayor', 'website_admin'] },
      isActive: true,
    }),
  };

  // Recent audit logs
  const recentActivity = await AuditLog.find()
    .sort({ createdAt: -1 })
    .limit(20)
    .populate('userId', 'name email role')
    .lean();

  const result = systemStats[0];

  res.status(200).json({
    success: true,
    data: {
      period: { days, startDate },
      summary: {
        totalComplaints: result.totalCount[0]?.count || 0,
        slaBreaches: result.slaBreach[0]?.count || 0,
        avgResolutionHours: Math.round(result.avgResolutionTime[0]?.avgTime || 0),
        ...entityCounts,
      },
      byStatus: result.byStatus.reduce((acc, s) => {
        acc[s._id] = s.count;
        return acc;
      }, {}),
      byCategory: result.byCategory.reduce((acc, c) => {
        acc[c._id] = c.count;
        return acc;
      }, {}),
      bySource: result.bySource.reduce((acc, s) => {
        acc[s._id] = s.count;
        return acc;
      }, {}),
      byCity: result.byCity,
      dailyTrend: result.dailyTrend,
      recentActivity: recentActivity.map(log => ({
        action: log.action,
        actor: log.actor?.name || 'System',
        targetType: log.target?.type,
        createdAt: log.createdAt,
      })),
    },
  });
});

/**
 * @desc    Get SLA performance report
 * @route   GET /api/v1/analytics/sla-performance
 * @access  Protected - Town Chairman+
 */
exports.getSLAPerformance = asyncHandler(async (req, res, next) => {
  const { days = 30 } = req.query;
  const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  // Apply hierarchy filter
  const matchFilter = { createdAt: { $gte: startDate } };
  if (req.hierarchyFilter) {
    Object.assign(matchFilter, req.hierarchyFilter);
  }

  const slaStats = await Complaint.aggregate([
    { $match: matchFilter },
    {
      $facet: {
        overall: [
          {
            $group: {
              _id: null,
              total: { $sum: 1 },
              breached: { $sum: { $cond: ['$slaBreach', 1, 0] } },
              onTime: { $sum: { $cond: ['$slaBreach', 0, 1] } },
            },
          },
        ],
        byCategory: [
          {
            $group: {
              _id: '$category.primary',
              total: { $sum: 1 },
              breached: { $sum: { $cond: ['$slaBreach', 1, 0] } },
            },
          },
          {
            $project: {
              category: '$_id',
              total: 1,
              breached: 1,
              complianceRate: {
                $multiply: [
                  { $divide: [{ $subtract: ['$total', '$breached'] }, '$total'] },
                  100,
                ],
              },
            },
          },
          { $sort: { complianceRate: 1 } },
        ],
        worstUCs: [
          {
            $group: {
              _id: '$ucId',
              total: { $sum: 1 },
              breached: { $sum: { $cond: ['$slaBreach', 1, 0] } },
            },
          },
          {
            $match: { breached: { $gt: 0 } },
          },
          {
            $lookup: {
              from: 'ucs',
              localField: '_id',
              foreignField: '_id',
              as: 'ucInfo',
            },
          },
          { $unwind: { path: '$ucInfo', preserveNullAndEmptyArrays: true } },
          {
            $project: {
              ucName: { $ifNull: ['$ucInfo.name', 'Unknown'] },
              total: 1,
              breached: 1,
              breachRate: {
                $multiply: [{ $divide: ['$breached', '$total'] }, 100],
              },
            },
          },
          { $sort: { breached: -1 } },
          { $limit: 10 },
        ],
      },
    },
  ]);

  const result = slaStats[0];
  const overall = result.overall[0] || { total: 0, breached: 0, onTime: 0 };

  res.status(200).json({
    success: true,
    data: {
      period: { days, startDate },
      overall: {
        total: overall.total,
        breached: overall.breached,
        onTime: overall.onTime,
        complianceRate: overall.total > 0 
          ? ((overall.onTime / overall.total) * 100).toFixed(1) 
          : 100,
      },
      byCategory: result.byCategory,
      worstPerformingUCs: result.worstUCs,
    },
  });
});
