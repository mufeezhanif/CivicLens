/**
 * useComplaints Hook
 * Fetches and manages complaints data for the map
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { complaintsApi } from '../../../services/api';
import { debounce, complaintsToHeatmapData } from '../../../utils/mapHelpers';

const useComplaints = (filters = {}, options = {}) => {
  const [complaints, setComplaints] = useState([]);
  const [heatmapData, setHeatmapData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({ total: 0, byCategory: {}, byStatus: {} });
  const [dataFetched, setDataFetched] = useState(false);
  const fetchTimeoutRef = useRef(null);

  const {
    autoFetch = true,
    debounceMs = 300,
    includeHeatmap = true,
    deferMs = 800,
  } = options;

  const fetchComplaints = useCallback(async (filterParams = {}) => {
    setLoading(true);
    setError(null);

    try {
      const response = await complaintsApi.getComplaints(filterParams);
      
      let complaintsData = [];
      if (Array.isArray(response)) complaintsData = response;
      else if (response?.complaints && Array.isArray(response.complaints)) complaintsData = response.complaints;
      else if (response?.data && Array.isArray(response.data)) complaintsData = response.data;
      
      setComplaints(complaintsData);
      
      const categoryCount = {};
      const statusCount = {};
      complaintsData.forEach(c => {
        const cat = c.category?.primary || c.category || 'Other';
        categoryCount[cat] = (categoryCount[cat] || 0) + 1;
        const status = c.status || 'submitted';
        statusCount[status] = (statusCount[status] || 0) + 1;
      });
      
      setStats({ total: complaintsData.length, byCategory: categoryCount, byStatus: statusCount });

      if (includeHeatmap) {
        setHeatmapData(complaintsToHeatmapData(complaintsData));
      }

      return complaintsData;
    } catch (err) {
      console.error('Error fetching complaints:', err);
      setError(err.message || 'Failed to fetch complaints');
      setComplaints([]);
      setHeatmapData([]);
      return [];
    } finally {
      setLoading(false);
    }
  }, [includeHeatmap]);

  const fetchHeatmapData = useCallback(async (filterParams = {}) => {
    try {
      const response = await complaintsApi.getHeatmapData(filterParams);
      const heatData = response.heatmap || response.data || [];
      setHeatmapData(heatData);
      return heatData;
    } catch (err) {
      console.error('Error fetching heatmap data:', err);
      if (complaints.length > 0) {
        const heatData = complaintsToHeatmapData(complaints);
        setHeatmapData(heatData);
        return heatData;
      }
      return [];
    }
  }, [complaints]);

  const debouncedFetch = useMemo(
    () => debounce(fetchComplaints, debounceMs),
    [fetchComplaints, debounceMs]
  );

  const getComplaintsInBounds = useCallback((bounds) => {
    const arr = Array.isArray(complaints) ? complaints : [];
    if (!bounds) return arr;
    return arr.filter(c => {
      if (!c.location?.coordinates) return false;
      const [lng, lat] = c.location.coordinates;
      return bounds.contains([lat, lng]);
    });
  }, [complaints]);

  const getComplaintsByCategory = useCallback((category) => {
    const arr = Array.isArray(complaints) ? complaints : [];
    if (!category) return arr;
    return arr.filter(c => (c.category?.primary || c.category) === category);
  }, [complaints]);

  const getComplaintById = useCallback((id) => {
    const arr = Array.isArray(complaints) ? complaints : [];
    return arr.find(c => c._id === id || c.complaintId === id);
  }, [complaints]);

  const refresh = useCallback(() => fetchComplaints(filters), [fetchComplaints, filters]);

  // Auto-fetch with deferred loading
  useEffect(() => {
    if (autoFetch && !dataFetched) {
      fetchTimeoutRef.current = setTimeout(() => {
        debouncedFetch(filters);
        setDataFetched(true);
      }, deferMs);
    }
    return () => { if (fetchTimeoutRef.current) clearTimeout(fetchTimeoutRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoFetch, deferMs, dataFetched]);

  // Handle filter changes after initial load
  useEffect(() => {
    if (dataFetched && autoFetch) debouncedFetch(filters);
  }, [filters, dataFetched, autoFetch, debouncedFetch]);

  return {
    complaints, heatmapData, loading, error, stats,
    fetchComplaints, fetchHeatmapData, getComplaintsInBounds,
    getComplaintsByCategory, getComplaintById, refresh,
  };
};

export default useComplaints;
