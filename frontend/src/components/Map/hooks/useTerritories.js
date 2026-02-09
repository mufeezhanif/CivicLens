/**
 * useTerritories Hook
 * Fetches and manages territory boundary data (UC/Town)
 * OPTIMIZED: Deferred loading to improve map initial render time
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { territoriesApi } from '../../../services/api';

const useTerritories = (options = {}) => {
  const [ucBoundaries, setUCBoundaries] = useState(null);
  const [townBoundaries, setTownBoundaries] = useState(null);
  const [ucList, setUCList] = useState([]);
  const [townList, setTownList] = useState([]);
  const [loading, setLoading] = useState(false); // Start as false to not block map render
  const [error, setError] = useState(null);
  const [selectedUC, setSelectedUC] = useState(null);
  const [selectedTown, setSelectedTown] = useState(null);
  const [dataFetched, setDataFetched] = useState(false);
  const fetchTimeoutRef = useRef(null);

  const {
    city = 'Karachi',
    autoFetch = true,
    fetchUC = true,
    fetchTown = true,
    deferMs = 1000, // Defer API calls by 1 second to let map render first
  } = options;

  /**
   * Fetch UC boundaries
   */
  const fetchUCBoundaries = useCallback(async () => {
    try {
      const response = await territoriesApi.getUCBoundaries(city);
      const territories = response.territories || response.data || [];
      
      // Convert to GeoJSON FeatureCollection including all properties
      const geojson = {
        type: 'FeatureCollection',
        features: territories.map(t => ({
          type: 'Feature',
          properties: {
            // IDs
            id: t._id,
            uc_id: t.uc_id,
            town_id: t.town_id,
            city_id: t.city_id,
            
            // Names
            uc_name: t.uc_name,
            town: t.town,
            city: t.city,
            code: t.code,
            
            // Demographics
            population: t.population,
            area: t.area,
            
            // Location
            center: t.center,
            
            // Statistics
            stats: t.stats || {
              totalComplaints: 0,
              pendingComplaints: 0,
              inProgressComplaints: 0,
              resolvedComplaints: 0,
              avgResolutionTime: 0,
              slaComplianceRate: 100,
              avgFeedbackRating: 0,
            },
            
            // Meta
            level: 'UC',
          },
          geometry: t.geometry,
        })),
      };
      
      setUCBoundaries(geojson);
      
      // Extract UC list for dropdown
      const ucs = territories.map(t => ({
        id: t.uc_id,
        name: t.uc_name,
        town: t.town,
      }));
      setUCList(ucs);
      
      return geojson;
    } catch (err) {
      console.error('Error fetching UC boundaries:', err);
      setError(err.message);
      return null;
    }
  }, [city]);

  /**
   * Fetch Town boundaries
   */
  const fetchTownBoundaries = useCallback(async () => {
    try {
      const response = await territoriesApi.getTownBoundaries(city);
      const territories = response.territories || response.data || [];
      
      // Convert to GeoJSON FeatureCollection including all properties
      const geojson = {
        type: 'FeatureCollection',
        features: territories.map(t => ({
          type: 'Feature',
          properties: {
            // IDs
            id: t._id,
            town_id: t.town_id || t._id,
            city_id: t.city_id,
            
            // Names
            town_name: t.town_name || t.town,
            town: t.town_name || t.town,
            city: t.city,
            code: t.code,
            
            // Demographics
            population: t.population,
            
            // Location
            center: t.center,
            
            // District info
            district: t.district || null,
            districtColor: t.districtColor || null,
            
            // Statistics
            stats: t.stats || {
              totalUCs: 0,
              totalComplaints: 0,
              resolvedComplaints: 0,
              avgResolutionTime: 0,
              slaComplianceRate: 100,
            },
            
            // Meta
            level: 'Town',
          },
          geometry: t.geometry,
        })),
      };
      
      setTownBoundaries(geojson);
      
      // Extract Town list for dropdown
      const towns = territories.map(t => ({
        id: t.town_id || t._id,
        name: t.town_name || t.town,
      }));
      setTownList(towns);
      
      return geojson;
    } catch (err) {
      console.error('Error fetching Town boundaries:', err);
      setError(err.message);
      return null;
    }
  }, [city]);

  /**
   * Fetch all boundaries
   */
  const fetchAllBoundaries = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const promises = [];
      if (fetchUC) promises.push(fetchUCBoundaries());
      if (fetchTown) promises.push(fetchTownBoundaries());
      
      await Promise.all(promises);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [fetchUC, fetchTown, fetchUCBoundaries, fetchTownBoundaries]);

  /**
   * Get UC by ID
   */
  const getUCById = useCallback((ucId) => {
    if (!ucBoundaries) return null;
    return ucBoundaries.features.find(f => f.properties.uc_id === ucId);
  }, [ucBoundaries]);

  /**
   * Get Town by name
   */
  const getTownByName = useCallback((townName) => {
    if (!townBoundaries) return null;
    return townBoundaries.features.find(
      f => f.properties.town_name === townName || f.properties.town === townName
    );
  }, [townBoundaries]);

  /**
   * Get UCs in a specific town
   */
  const getUCsInTown = useCallback((townName) => {
    return ucList.filter(uc => uc.town === townName);
  }, [ucList]);

  /**
   * Select a UC
   */
  const selectUC = useCallback((ucId) => {
    setSelectedUC(ucId);
    // Clear town selection when UC is selected
    setSelectedTown(null);
  }, []);

  /**
   * Select a Town
   */
  const selectTown = useCallback((townName) => {
    setSelectedTown(townName);
    // Clear UC selection when town is selected
    setSelectedUC(null);
  }, []);

  /**
   * Clear selection
   */
  const clearSelection = useCallback(() => {
    setSelectedUC(null);
    setSelectedTown(null);
  }, []);

  /**
   * Get bounds of selected territory
   */
  const getSelectedBounds = useMemo(() => {
    if (selectedUC && ucBoundaries) {
      const feature = getUCById(selectedUC);
      if (feature?.geometry?.coordinates) {
        // Calculate bounds from polygon coordinates
        const coords = feature.geometry.coordinates[0];
        const lats = coords.map(c => c[1]);
        const lngs = coords.map(c => c[0]);
        return [
          [Math.min(...lats), Math.min(...lngs)],
          [Math.max(...lats), Math.max(...lngs)],
        ];
      }
    }
    if (selectedTown && townBoundaries) {
      const feature = getTownByName(selectedTown);
      if (feature?.geometry?.coordinates) {
        const coords = feature.geometry.coordinates[0];
        const lats = coords.map(c => c[1]);
        const lngs = coords.map(c => c[0]);
        return [
          [Math.min(...lats), Math.min(...lngs)],
          [Math.max(...lats), Math.max(...lngs)],
        ];
      }
    }
    return null;
  }, [selectedUC, selectedTown, ucBoundaries, townBoundaries, getUCById, getTownByName]);

  // Auto-fetch on mount with deferred loading
  useEffect(() => {
    if (autoFetch && !dataFetched) {
      // Defer boundary loading to let map render first
      fetchTimeoutRef.current = setTimeout(() => {
        fetchAllBoundaries();
        setDataFetched(true);
      }, deferMs);
    }
    
    return () => {
      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current);
      }
    };
  }, [autoFetch, fetchAllBoundaries, deferMs, dataFetched]);

  return {
    ucBoundaries,
    townBoundaries,
    ucList,
    townList,
    loading,
    error,
    selectedUC,
    selectedTown,
    fetchUCBoundaries,
    fetchTownBoundaries,
    fetchAllBoundaries,
    getUCById,
    getTownByName,
    getUCsInTown,
    selectUC,
    selectTown,
    clearSelection,
    getSelectedBounds,
  };
};

export default useTerritories;
