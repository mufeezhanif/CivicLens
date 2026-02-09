/**
 * Map Utility Helpers for CivicLens
 * Coordinate transforms, styling, and helper functions
 */

import L from 'leaflet';

/**
 * Default map center - Karachi, Pakistan
 */
export const KARACHI_CENTER = [24.8607, 67.0011];
export const DEFAULT_ZOOM = 12;
export const MIN_ZOOM = 10;
export const MAX_ZOOM = 18;

/**
 * Map tile providers (free, no API key required)
 */
export const TILE_PROVIDERS = {
  openStreetMap: {
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  },
  cartoDB: {
    url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; <a href="https://carto.com/attributions">CARTO</a>',
  },
  cartoDBDark: {
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; <a href="https://carto.com/attributions">CARTO</a>',
  },
};

/**
 * Category colors for markers and legends
 */
export const CATEGORY_COLORS = {
  'Water': '#3B82F6',        // Blue
  'Electricity': '#F59E0B',  // Yellow/Amber
  'Roads': '#92400E',        // Brown
  'Sanitation': '#10B981',   // Green
  'Sewerage': '#8B5CF6',     // Purple
  'Street Lights': '#F97316', // Orange
  'Garbage': '#84CC16',      // Lime
  'Other': '#EF4444',        // Red
  'default': '#6B7280',      // Gray
};

/**
 * Category emoji icons
 */
export const CATEGORY_ICONS = {
  'Water': '💧',
  'Electricity': '⚡',
  'Roads': '🛣️',
  'Sanitation': '🚿',
  'Sewerage': '🚰',
  'Street Lights': '💡',
  'Garbage': '🗑️',
  'Other': '📋',
};

/**
 * Status colors
 */
export const STATUS_COLORS = {
  'submitted': '#EF4444',    // Red
  'acknowledged': '#F59E0B', // Amber 
  'in_progress': '#3B82F6',  // Blue
  'resolved': '#10B981',     // Green
  'closed': '#6B7280',       // Gray
  'rejected': '#991B1B',     // Dark Red
};

export const STATUS_LABELS = {
  'submitted': 'Submitted',
  'acknowledged': 'Acknowledged',
  'in_progress': 'In Progress',
  'resolved': 'Resolved',
  'closed': 'Closed',
  'rejected': 'Rejected',
};

/**
 * Severity colors (1-10 scale)
 */
export const getSeverityColor = (severity) => {
  if (severity <= 3) return '#10B981';  // Green - Low
  if (severity <= 6) return '#F59E0B';  // Amber - Medium
  if (severity <= 8) return '#F97316';  // Orange - High
  return '#EF4444';                      // Red - Critical
};

/**
 * Convert GeoJSON coordinates [lng, lat] to Leaflet [lat, lng]
 */
export const geoJSONToLeaflet = (coordinates) => {
  if (!coordinates || coordinates.length < 2) return null;
  return [coordinates[1], coordinates[0]];
};

/**
 * Convert Leaflet [lat, lng] to GeoJSON [lng, lat]
 */
export const leafletToGeoJSON = (coordinates) => {
  if (!coordinates || coordinates.length < 2) return null;
  return [coordinates[1], coordinates[0]];
};

/**
 * Convert complaint location to Leaflet coordinates
 */
export const getComplaintLatLng = (complaint) => {
  if (!complaint?.location?.coordinates) return null;
  return geoJSONToLeaflet(complaint.location.coordinates);
};

/**
 * Convert array of complaints to heatmap data format
 * @param {Array} complaints - Array of complaint objects
 * @returns {Array} - Array of [lat, lng, intensity]
 */
export const complaintsToHeatmapData = (complaints) => {
  return complaints
    .filter(c => c.location?.coordinates)
    .map(c => {
      const [lng, lat] = c.location.coordinates;
      // Intensity based on severity (1-10) normalized to 0-1
      const intensity = (c.severity || 5) / 10;
      return [lat, lng, intensity];
    });
};

/**
 * Create custom marker icon for a category
 */
export const createCategoryIcon = (category, size = 'medium') => {
  const color = CATEGORY_COLORS[category] || CATEGORY_COLORS.default;
  const sizes = {
    small: { size: [20, 32], anchor: [10, 32] },
    medium: { size: [25, 41], anchor: [12, 41] },
    large: { size: [32, 52], anchor: [16, 52] },
  };
  const { size: iconSize, anchor } = sizes[size] || sizes.medium;

  return L.divIcon({
    className: 'custom-marker-icon',
    html: `
      <div class="marker-pin" style="background-color: ${color};">
        <span class="marker-icon">${CATEGORY_ICONS[category] || '📍'}</span>
      </div>
    `,
    iconSize,
    iconAnchor: anchor,
    popupAnchor: [0, -anchor[1]],
  });
};

/**
 * Create cluster icon
 */
export const createClusterIcon = (cluster) => {
  const count = cluster.getChildCount();
  let size = 'small';
  let diameter = 40;

  if (count >= 100) {
    size = 'large';
    diameter = 60;
  } else if (count >= 10) {
    size = 'medium';
    diameter = 50;
  }

  return L.divIcon({
    html: `<div class="cluster-icon cluster-${size}"><span>${count}</span></div>`,
    className: 'custom-cluster-icon',
    iconSize: [diameter, diameter],
  });
};

/**
 * UC boundary style
 */
export const getUCStyle = (feature, isHovered = false, isSelected = false) => ({
  color: isSelected ? '#166534' : '#22C55E',
  weight: isSelected ? 3 : isHovered ? 2 : 1,
  opacity: isSelected ? 1 : isHovered ? 0.9 : 0.6,
  fillColor: isSelected ? '#166534' : '#22C55E',
  fillOpacity: isSelected ? 0.2 : isHovered ? 0.15 : 0.05,
  dashArray: isSelected ? null : '5, 5',
});

/**
 * District colors for town boundaries
 */
export const DISTRICT_COLORS = {
  'Central': '#3B82F6',   // Blue
  'East': '#10B981',      // Green
  'West': '#F59E0B',      // Amber
  'Malir': '#8B5CF6',     // Purple
  'Korangi': '#EF4444',   // Red
  'South': '#EC4899',     // Pink
  'Keamari': '#06B6D4',   // Cyan
  'default': '#166534',   // Primary green
};

/**
 * Town boundary style - BOLD borders for clear separation
 * @param {Object} feature - GeoJSON feature with properties
 * @param {boolean} isHovered - Whether town is being hovered
 * @param {boolean} isSelected - Whether town is selected
 */
export const getTownStyle = (feature, isHovered = false, isSelected = false) => {
  // Get district color from feature properties (set by useTerritories hook)
  const district = feature?.properties?.district;
  const districtColor = feature?.properties?.districtColor || DISTRICT_COLORS[district] || DISTRICT_COLORS.default;
  
  return {
    // Bold borders - prominent weight for clear separation
    color: isSelected ? '#052E16' : districtColor,
    weight: isSelected ? 6 : isHovered ? 5 : 4,  // Bold: 4px default, 5px hover, 6px selected
    opacity: isSelected ? 1 : isHovered ? 1 : 0.85,
    
    // Subtle fill to show town area
    fillColor: districtColor,
    fillOpacity: isSelected ? 0.25 : isHovered ? 0.18 : 0.08,
    
    // Solid line for clear boundaries
    dashArray: null,
    lineCap: 'round',
    lineJoin: 'round',
  };
};

/**
 * Format date for display
 */
export const formatDate = (dateString) => {
  if (!dateString) return 'Unknown';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-PK', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

/**
 * Format relative time
 */
export const formatRelativeTime = (dateString) => {
  if (!dateString) return 'Unknown';
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now - date;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
  return `${Math.floor(diffDays / 365)} years ago`;
};

/**
 * Truncate text with ellipsis
 */
export const truncateText = (text, maxLength = 100) => {
  if (!text || text.length <= maxLength) return text;
  return text.substring(0, maxLength).trim() + '...';
};

/**
 * Calculate bounds from complaints
 */
export const getBoundsFromComplaints = (complaints) => {
  const validComplaints = complaints.filter(c => c.location?.coordinates);
  if (validComplaints.length === 0) return null;

  const lats = validComplaints.map(c => c.location.coordinates[1]);
  const lngs = validComplaints.map(c => c.location.coordinates[0]);

  return L.latLngBounds(
    [Math.min(...lats), Math.min(...lngs)],
    [Math.max(...lats), Math.max(...lngs)]
  );
};

/**
 * Get map bounds as filter params
 */
export const boundsToFilterParams = (bounds) => {
  if (!bounds) return null;
  return {
    sw_lat: bounds.getSouthWest().lat,
    sw_lng: bounds.getSouthWest().lng,
    ne_lat: bounds.getNorthEast().lat,
    ne_lng: bounds.getNorthEast().lng,
  };
};

/**
 * Debounce function
 */
export const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

/**
 * Heatmap configuration options
 */
export const HEATMAP_CONFIG = {
  radius: 25,
  blur: 15,
  maxZoom: 17,
  max: 1.0,
  minOpacity: 0.4,
  gradient: {
    0.2: '#22C55E',  // Green - low
    0.4: '#86EFAC',  // Light green
    0.6: '#F59E0B',  // Yellow
    0.8: '#F97316',  // Orange
    1.0: '#EF4444',  // Red - high
  },
};

/**
 * Fix Leaflet default icon issue in React/Vite
 */
export const fixLeafletIcon = () => {
  delete L.Icon.Default.prototype._getIconUrl;
  
  L.Icon.Default.mergeOptions({
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  });
};

export default {
  KARACHI_CENTER,
  DEFAULT_ZOOM,
  CATEGORY_COLORS,
  STATUS_COLORS,
  geoJSONToLeaflet,
  leafletToGeoJSON,
  getComplaintLatLng,
  createCategoryIcon,
  formatDate,
  truncateText,
};
