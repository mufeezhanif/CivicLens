/**
 * useMapFilters Hook
 * Manages filter state for the map
 */

import { useState, useCallback, useMemo } from 'react';
import { CATEGORY_COLORS } from '../../../utils/mapHelpers';

const INITIAL_FILTERS = {
  categories: [],
  severity: { min: 1, max: 10 },
  status: [],
  dateRange: { from: null, to: null },
  ucId: null,
  town: null,
  searchQuery: '',
};

const useMapFilters = (initialFilters = {}) => {
  const [filters, setFilters] = useState({
    ...INITIAL_FILTERS,
    ...initialFilters,
  });

  const [layerVisibility, setLayerVisibility] = useState({
    markers: true,
    heatmap: true,
    ucBoundaries: false,
    townBoundaries: false,
    clusters: true,
  });

  /**
   * Available categories (derived from CATEGORY_COLORS)
   */
  const availableCategories = useMemo(() => {
    return Object.keys(CATEGORY_COLORS).filter(c => c !== 'default');
  }, []);

  /**
   * Available statuses
   */
  const availableStatuses = useMemo(() => {
    return ['submitted', 'acknowledged', 'in_progress', 'resolved', 'closed', 'rejected'];
  }, []);

  /**
   * Update single filter
   */
  const setFilter = useCallback((key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value,
    }));
  }, []);

  /**
   * Update multiple filters at once
   */
  const setMultipleFilters = useCallback((newFilters) => {
    setFilters(prev => ({
      ...prev,
      ...newFilters,
    }));
  }, []);

  /**
   * Toggle category filter
   */
  const toggleCategory = useCallback((category) => {
    setFilters(prev => {
      const categories = prev.categories.includes(category)
        ? prev.categories.filter(c => c !== category)
        : [...prev.categories, category];
      return { ...prev, categories };
    });
  }, []);

  /**
   * Set all categories selected
   */
  const selectAllCategories = useCallback(() => {
    setFilters(prev => ({
      ...prev,
      categories: [...availableCategories],
    }));
  }, [availableCategories]);

  /**
   * Clear all categories
   */
  const clearAllCategories = useCallback(() => {
    setFilters(prev => ({
      ...prev,
      categories: [],
    }));
  }, []);

  /**
   * Toggle status filter
   */
  const toggleStatus = useCallback((status) => {
    setFilters(prev => {
      const statuses = prev.status.includes(status)
        ? prev.status.filter(s => s !== status)
        : [...prev.status, status];
      return { ...prev, status: statuses };
    });
  }, []);

  /**
   * Set severity range
   */
  const setSeverityRange = useCallback((min, max) => {
    setFilters(prev => ({
      ...prev,
      severity: { min, max },
    }));
  }, []);

  /**
   * Set date range
   */
  const setDateRange = useCallback((from, to) => {
    setFilters(prev => ({
      ...prev,
      dateRange: { from, to },
    }));
  }, []);

  /**
   * Set UC filter
   */
  const setUCFilter = useCallback((ucId) => {
    setFilters(prev => ({
      ...prev,
      ucId,
      town: null, // Clear town when UC is set
    }));
  }, []);

  /**
   * Set Town filter
   */
  const setTownFilter = useCallback((town) => {
    setFilters(prev => ({
      ...prev,
      town,
      ucId: null, // Clear UC when town is set
    }));
  }, []);

  /**
   * Set search query
   */
  const setSearchQuery = useCallback((query) => {
    setFilters(prev => ({
      ...prev,
      searchQuery: query,
    }));
  }, []);

  /**
   * Reset all filters
   */
  const resetFilters = useCallback(() => {
    setFilters(INITIAL_FILTERS);
  }, []);

  /**
   * Toggle layer visibility
   */
  const toggleLayer = useCallback((layer) => {
    setLayerVisibility(prev => ({
      ...prev,
      [layer]: !prev[layer],
    }));
  }, []);

  /**
   * Set layer visibility
   */
  const setLayerVisible = useCallback((layer, visible) => {
    setLayerVisibility(prev => ({
      ...prev,
      [layer]: visible,
    }));
  }, []);

  /**
   * Check if any filters are active
   */
  const hasActiveFilters = useMemo(() => {
    return (
      filters.categories.length > 0 ||
      filters.status.length > 0 ||
      filters.severity.min > 1 ||
      filters.severity.max < 10 ||
      filters.dateRange.from !== null ||
      filters.dateRange.to !== null ||
      filters.ucId !== null ||
      filters.town !== null ||
      filters.searchQuery !== ''
    );
  }, [filters]);

  /**
   * Get active filter count
   */
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.categories.length > 0) count++;
    if (filters.status.length > 0) count++;
    if (filters.severity.min > 1 || filters.severity.max < 10) count++;
    if (filters.dateRange.from || filters.dateRange.to) count++;
    if (filters.ucId) count++;
    if (filters.town) count++;
    if (filters.searchQuery) count++;
    return count;
  }, [filters]);

  /**
   * Convert filters to API params
   */
  const filtersToApiParams = useMemo(() => {
    const params = {};
    
    if (filters.categories.length === 1) {
      params.category = filters.categories[0];
    } else if (filters.categories.length > 1) {
      params.categories = filters.categories.join(',');
    }
    
    if (filters.status.length === 1) {
      params.status = filters.status[0];
    } else if (filters.status.length > 1) {
      params.statuses = filters.status.join(',');
    }
    
    if (filters.severity.min > 1) {
      params.severity_min = filters.severity.min;
    }
    if (filters.severity.max < 10) {
      params.severity_max = filters.severity.max;
    }
    
    if (filters.dateRange.from) {
      params.date_from = filters.dateRange.from;
    }
    if (filters.dateRange.to) {
      params.date_to = filters.dateRange.to;
    }
    
    if (filters.ucId) {
      params.uc_id = filters.ucId;
    }
    if (filters.town) {
      params.town = filters.town;
    }
    
    return params;
  }, [filters]);

  return {
    filters,
    layerVisibility,
    availableCategories,
    availableStatuses,
    hasActiveFilters,
    activeFilterCount,
    filtersToApiParams,
    setFilter,
    setMultipleFilters,
    toggleCategory,
    selectAllCategories,
    clearAllCategories,
    toggleStatus,
    setSeverityRange,
    setDateRange,
    setUCFilter,
    setTownFilter,
    setSearchQuery,
    resetFilters,
    toggleLayer,
    setLayerVisible,
  };
};

export default useMapFilters;
