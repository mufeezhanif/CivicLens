/**
 * Territory Controller
 * Provides territory data for map visualization and admin management
 * Acts as a simplified interface to City/Town/UC data
 */

const { City, Town, UC } = require('../models');
const asyncHandler = require('../utils/asyncHandler');
const ErrorResponse = require('../utils/errorResponse');

/**
 * @desc    Get territories (UCs or Towns) with boundaries
 * @route   GET /api/v1/territories
 * @query   level=UC|Town, city=CityName
 * @access  Public (boundaries for map visualization)
 */
exports.getTerritories = asyncHandler(async (req, res, next) => {
  const { level, city, town } = req.query;

  // Find city by name if provided
  let cityDoc = null;
  if (city) {
    cityDoc = await City.findOne({ 
      $or: [
        { name: { $regex: new RegExp(`^${city}$`, 'i') } },
        { code: city.toUpperCase() }
      ],
      isActive: true 
    });
  }

  if (level === 'UC') {
    // Return UC boundaries
    const query = { isActive: true };
    if (cityDoc) query.city = cityDoc._id;
    if (town) {
      const townDoc = await Town.findOne({ 
        name: { $regex: new RegExp(`^${town}$`, 'i') },
        isActive: true 
      });
      if (townDoc) query.town = townDoc._id;
    }

    const ucs = await UC.find(query)
      .populate('town', 'name code')
      .populate('city', 'name code')
      .select('name code ucNumber boundary center town city population area stats');

    // Format for GeoJSON consumption
    const territories = ucs.map(uc => ({
      _id: uc._id,
      uc_id: uc.ucNumber,
      uc_name: uc.name,
      code: uc.code,
      town: uc.town?.name || '',
      town_id: uc.town?._id,
      city: uc.city?.name || '',
      city_id: uc.city?._id,
      population: uc.population,
      area: uc.area,
      center: uc.center,
      geometry: uc.boundary,
      stats: uc.stats,
    }));

    return res.status(200).json({
      success: true,
      count: territories.length,
      level: 'UC',
      territories,
    });
  }

  if (level === 'Town') {
    // Return Town boundaries
    const query = { isActive: true };
    if (cityDoc) query.city = cityDoc._id;

    const towns = await Town.find(query)
      .populate('city', 'name code')
      .select('name code boundary center city population stats metadata');

    // Format for GeoJSON consumption
    const territories = towns.map(t => ({
      _id: t._id,
      town_id: t._id,
      town_name: t.name,
      town: t.name,
      code: t.code,
      city: t.city?.name || '',
      city_id: t.city?._id,
      population: t.population,
      center: t.center,
      geometry: t.boundary,
      stats: t.stats,
      district: t.metadata?.district || null,
      districtColor: t.metadata?.districtColor || null,
    }));

    return res.status(200).json({
      success: true,
      count: territories.length,
      level: 'Town',
      territories,
    });
  }

  // Return all territories (mixed)
  const query = { isActive: true };
  if (cityDoc) query.city = cityDoc._id;

  const [towns, ucs] = await Promise.all([
    Town.find(query).populate('city', 'name code').select('name code boundary center city population stats metadata'),
    UC.find(query).populate('town', 'name code').populate('city', 'name code').select('name code ucNumber boundary center town city population area stats'),
  ]);

  const territories = [
    ...towns.map(t => ({
      _id: t._id,
      type: 'Town',
      name: t.name,
      code: t.code,
      city: t.city?.name || '',
      geometry: t.boundary,
      district: t.metadata?.district || null,
      districtColor: t.metadata?.districtColor || null,
    })),
    ...ucs.map(uc => ({
      _id: uc._id,
      type: 'UC',
      name: uc.name,
      code: uc.code,
      ucNumber: uc.ucNumber,
      town: uc.town?.name || '',
      city: uc.city?.name || '',
      geometry: uc.boundary,
    })),
  ];

  res.status(200).json({
    success: true,
    count: territories.length,
    territories,
  });
});

/**
 * @desc    Get all UCs (list without boundaries for dropdowns)
 * @route   GET /api/v1/territories/ucs
 * @access  Public
 */
exports.getUCList = asyncHandler(async (req, res, next) => {
  const ucs = await UC.find({ isActive: true })
    .populate('town', 'name code')
    .populate('city', 'name code')
    .select('name code ucNumber town city population')
    .sort({ ucNumber: 1 });

  res.status(200).json({
    success: true,
    count: ucs.length,
    data: ucs.map(uc => ({
      _id: uc._id,
      id: uc.ucNumber,
      name: uc.name,
      code: uc.code,
      town: uc.town?.name || '',
      townId: uc.town?._id,
      city: uc.city?.name || '',
      cityId: uc.city?._id,
      population: uc.population,
    })),
  });
});

/**
 * @desc    Get all Towns (list without boundaries for dropdowns)
 * @route   GET /api/v1/territories/towns
 * @access  Public
 */
exports.getTownList = asyncHandler(async (req, res, next) => {
  const towns = await Town.find({ isActive: true })
    .populate('city', 'name code')
    .select('name code city population stats')
    .sort({ name: 1 });

  res.status(200).json({
    success: true,
    count: towns.length,
    data: towns.map(t => ({
      _id: t._id,
      id: t._id,
      name: t.name,
      code: t.code,
      city: t.city?.name || '',
      cityId: t.city?._id,
      population: t.population,
      ucCount: t.stats?.totalUCs || 0,
    })),
  });
});

/**
 * @desc    Get single territory by ID
 * @route   GET /api/v1/territories/:id
 * @access  Authenticated
 */
exports.getTerritory = asyncHandler(async (req, res, next) => {
  const { id } = req.params;

  // Try to find as UC first, then Town
  let territory = await UC.findById(id)
    .populate('town', 'name code')
    .populate('city', 'name code')
    .populate('chairman', 'name email');

  if (territory) {
    return res.status(200).json({
      success: true,
      type: 'UC',
      data: {
        _id: territory._id,
        name: territory.name,
        code: territory.code,
        ucNumber: territory.ucNumber,
        town: territory.town,
        city: territory.city,
        chairman: territory.chairman,
        boundary: territory.boundary,
        center: territory.center,
        population: territory.population,
        area: territory.area,
        stats: territory.stats,
        isActive: territory.isActive,
      },
    });
  }

  // Try as Town
  territory = await Town.findById(id)
    .populate('city', 'name code')
    .populate('chairman', 'name email');

  if (territory) {
    return res.status(200).json({
      success: true,
      type: 'Town',
      data: {
        _id: territory._id,
        name: territory.name,
        code: territory.code,
        city: territory.city,
        chairman: territory.chairman,
        boundary: territory.boundary,
        center: territory.center,
        population: territory.population,
        stats: territory.stats,
        isActive: territory.isActive,
      },
    });
  }

  return next(new ErrorResponse('Territory not found', 404));
});

/**
 * @desc    Create a new territory (UC or Town)
 * @route   POST /api/v1/territories
 * @access  Admin
 */
exports.createTerritory = asyncHandler(async (req, res, next) => {
  const { type, name, code, ucNumber, townId, cityId, boundary, center, population, area } = req.body;

  if (!type || !['UC', 'Town'].includes(type)) {
    return next(new ErrorResponse('Territory type must be UC or Town', 400));
  }

  if (type === 'UC') {
    if (!townId) {
      return next(new ErrorResponse('Town ID is required for UC', 400));
    }

    const town = await Town.findById(townId);
    if (!town) {
      return next(new ErrorResponse('Town not found', 404));
    }

    const uc = await UC.create({
      name,
      code: code || undefined,
      ucNumber: ucNumber || (await UC.countDocuments({ town: townId })) + 1,
      town: townId,
      city: town.city,
      boundary,
      center: center || { type: 'Point', coordinates: [0, 0] },
      population,
      area,
      metadata: { createdBy: req.user?._id },
    });

    return res.status(201).json({
      success: true,
      type: 'UC',
      data: uc,
    });
  }

  // Create Town
  if (!cityId) {
    return next(new ErrorResponse('City ID is required for Town', 400));
  }

  const city = await City.findById(cityId);
  if (!city) {
    return next(new ErrorResponse('City not found', 404));
  }

  const town = await Town.create({
    name,
    code: code || undefined,
    city: cityId,
    boundary,
    center: center || { type: 'Point', coordinates: [0, 0] },
    population,
    metadata: { createdBy: req.user?._id },
  });

  res.status(201).json({
    success: true,
    type: 'Town',
    data: town,
  });
});

/**
 * @desc    Update a territory
 * @route   PUT /api/v1/territories/:id
 * @access  Admin
 */
exports.updateTerritory = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const updates = { ...req.body };

  // Remove sensitive fields
  delete updates.chairman;
  delete updates.city;
  delete updates.town;
  delete updates._id;

  // Try UC first
  let territory = await UC.findByIdAndUpdate(id, {
    ...updates,
    'metadata.lastModifiedBy': req.user?._id,
  }, { new: true, runValidators: true });

  if (territory) {
    return res.status(200).json({
      success: true,
      type: 'UC',
      data: territory,
    });
  }

  // Try Town
  territory = await Town.findByIdAndUpdate(id, {
    ...updates,
    'metadata.lastModifiedBy': req.user?._id,
  }, { new: true, runValidators: true });

  if (territory) {
    return res.status(200).json({
      success: true,
      type: 'Town',
      data: territory,
    });
  }

  return next(new ErrorResponse('Territory not found', 404));
});

/**
 * @desc    Delete (deactivate) a territory
 * @route   DELETE /api/v1/territories/:id
 * @access  Admin
 */
exports.deleteTerritory = asyncHandler(async (req, res, next) => {
  const { id } = req.params;

  // Try UC first
  let territory = await UC.findById(id);
  if (territory) {
    territory.isActive = false;
    await territory.save();
    return res.status(200).json({
      success: true,
      message: 'UC deactivated successfully',
    });
  }

  // Try Town
  territory = await Town.findById(id);
  if (territory) {
    // Check for active UCs
    const activeUCs = await UC.countDocuments({ town: id, isActive: true });
    if (activeUCs > 0) {
      return next(new ErrorResponse(`Cannot deactivate town with ${activeUCs} active UCs`, 400));
    }

    territory.isActive = false;
    await territory.save();
    return res.status(200).json({
      success: true,
      message: 'Town deactivated successfully',
    });
  }

  return next(new ErrorResponse('Territory not found', 404));
});

/**
 * @desc    Get cities list (for territory management)
 * @route   GET /api/v1/territories/cities
 * @access  Public
 */
exports.getCities = asyncHandler(async (req, res, next) => {
  const cities = await City.find({ isActive: true })
    .select('name code population')
    .sort({ name: 1 });

  res.status(200).json({
    success: true,
    count: cities.length,
    data: cities.map(c => ({
      _id: c._id,
      id: c._id,
      name: c.name,
      code: c.code,
      population: c.population,
    })),
  });
});
