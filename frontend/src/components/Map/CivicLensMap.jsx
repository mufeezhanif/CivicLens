/**
 * CivicLensMap Component
 * Main map container that integrates all map sub-components
 */

import { useState, useCallback, useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, ZoomControl, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Components
import HeatmapLayer from './HeatmapLayer';
import ComplaintMarkers from './ComplaintMarkers';
import TerritoryBoundaries from './TerritoryBoundaries';
import FilterPanel from './FilterPanel';
import MapControls from './MapControls';
import MapLegend from './MapLegend';

// Hooks
import { useComplaints, useTerritories, useMapFilters } from './hooks';

// Utils
import { 
  KARACHI_CENTER, 
  DEFAULT_ZOOM, 
  MIN_ZOOM, 
  MAX_ZOOM,
  TILE_PROVIDERS,
  fixLeafletIcon,
} from '../../utils/mapHelpers';

// Fix Leaflet default icon issue
fixLeafletIcon();

/**
 * Map Event Handler Component
 * Handles map events like move, zoom, etc.
 */
const MapEventHandler = ({ onBoundsChange, onZoomChange }) => {
  const map = useMapEvents({
    moveend: () => {
      if (onBoundsChange) {
        onBoundsChange(map.getBounds());
      }
    },
    zoomend: () => {
      if (onZoomChange) {
        onZoomChange(map.getZoom());
      }
    },
  });
  return null;
};

/**
 * Map Inner Component
 * Contains map logic that needs access to the map instance
 */
const MapInner = ({
  complaints,
  heatmapData,
  ucBoundaries,
  townBoundaries,
  layerVisibility,
  selectedUCId,
  selectedTown,
  selectedComplaintId,
  onMarkerClick,
  onViewDetails,
  onUCClick,
  onTownClick,
  onBoundsChange,
  onToggleLayer,
}) => {
  const map = useMap();
  const [, setCurrentZoom] = useState(map.getZoom());

  // Track zoom changes
  useEffect(() => {
    const handleZoom = () => setCurrentZoom(map.getZoom());
    map.on('zoomend', handleZoom);
    return () => map.off('zoomend', handleZoom);
  }, [map]);

  return (
    <>
      {/* Map Event Handler */}
      <MapEventHandler 
        onBoundsChange={onBoundsChange}
        onZoomChange={setCurrentZoom}
      />

      {/* Territory Boundaries */}
      <TerritoryBoundaries
        ucData={ucBoundaries}
        townData={townBoundaries}
        showUC={layerVisibility.ucBoundaries}
        showTown={layerVisibility.townBoundaries}
        selectedUCId={selectedUCId}
        selectedTown={selectedTown}
        onUCClick={onUCClick}
        onTownClick={onTownClick}
      />

      {/* Heatmap Layer */}
      <HeatmapLayer
        data={heatmapData}
        visible={layerVisibility.heatmap}
      />

      {/* Complaint Markers */}
      <ComplaintMarkers
        complaints={complaints}
        visible={layerVisibility.markers}
        clustered={layerVisibility.clusters}
        selectedComplaintId={selectedComplaintId}
        onMarkerClick={onMarkerClick}
        onViewDetails={onViewDetails}
      />

      {/* Map Controls */}
      <MapControls
        layerVisibility={layerVisibility}
        onToggleLayer={onToggleLayer}
      />
    </>
  );
};

/**
 * Main CivicLensMap Component
 */
const CivicLensMap = ({
  className = '',
  style = {},
  initialFilters = {},
  showFilterPanel = true,
  showLegend = true,
  onComplaintSelect,
  onTerritorySelect,
}) => {
  // State
  const [filterPanelCollapsed, setFilterPanelCollapsed] = useState(false);
  const [selectedComplaintId, setSelectedComplaintId] = useState(null);
  const [currentBounds, setCurrentBounds] = useState(null);

  // Custom hooks
  const {
    filters,
    layerVisibility,
    availableCategories,
    availableStatuses,
    hasActiveFilters,
    activeFilterCount,
    filtersToApiParams,
    toggleCategory,
    toggleStatus,
    setSeverityRange,
    setDateRange,
    setUCFilter,
    setTownFilter,
    setSearchQuery,
    resetFilters,
    toggleLayer,
  } = useMapFilters(initialFilters);

  const {
    complaints,
    heatmapData,
    loading: complaintsLoading,
    error: complaintsError,
    stats,
    fetchComplaints,
    getComplaintsInBounds,
  } = useComplaints(filtersToApiParams);

  const {
    ucBoundaries,
    townBoundaries,
    ucList,
    townList,
    loading: territoriesLoading,
    selectedUC,
    selectedTown,
    selectUC,
    selectTown,
  } = useTerritories();

  // Filter complaints client-side for search
  const filteredComplaints = useMemo(() => {
    // Ensure complaints is always an array before filtering
    let result = Array.isArray(complaints) ? complaints : [];

    // Apply search query filter
    if (filters.searchQuery && result.length > 0) {
      const query = filters.searchQuery.toLowerCase();
      result = result.filter(c => {
        const text = (c.text || c.description || '').toLowerCase();
        const address = (c.address || '').toLowerCase();
        return text.includes(query) || address.includes(query);
      });
    }

    // Apply client-side category filter if categories selected
    if (filters.categories?.length > 0 && result.length > 0) {
      result = result.filter(c => {
        const category = c.category?.primary || c.category || 'Other';
        return filters.categories.includes(category);
      });
    }

    // Apply status filter
    if (filters.status?.length > 0 && result.length > 0) {
      result = result.filter(c => filters.status.includes(c.status));
    }

    // Apply severity filter
    if (result.length > 0) {
      result = result.filter(c => {
        const severity = c.severity || 5;
        return severity >= filters.severity?.min && severity <= filters.severity?.max;
      });
    }

    return result;
  }, [complaints, filters]);

  // Calculate complaints in view when bounds change (derived state)
  const complaintsInViewCount = useMemo(() => {
    if (!currentBounds) return 0;
    return getComplaintsInBounds(currentBounds).length;
  }, [currentBounds, getComplaintsInBounds]);

  // Handle marker click
  const handleMarkerClick = useCallback((complaint) => {
    setSelectedComplaintId(complaint._id || complaint.complaintId);
    if (onComplaintSelect) {
      onComplaintSelect(complaint);
    }
  }, [onComplaintSelect]);

  // Handle view details
  const handleViewDetails = useCallback((complaint) => {
    // Could navigate to complaint details page or open modal
    console.log('View details:', complaint);
    if (onComplaintSelect) {
      onComplaintSelect(complaint);
    }
  }, [onComplaintSelect]);

  // Handle UC click
  const handleUCClick = useCallback((ucProps) => {
    selectUC(ucProps.uc_id);
    setUCFilter(ucProps.uc_id);
    if (onTerritorySelect) {
      onTerritorySelect({ type: 'UC', ...ucProps });
    }
  }, [selectUC, setUCFilter, onTerritorySelect]);

  // Handle Town click
  const handleTownClick = useCallback((townProps) => {
    const townName = townProps.town_name || townProps.town;
    selectTown(townName);
    setTownFilter(townName);
    if (onTerritorySelect) {
      onTerritorySelect({ type: 'Town', ...townProps });
    }
  }, [selectTown, setTownFilter, onTerritorySelect]);

  // Handle bounds change
  const handleBoundsChange = useCallback((bounds) => {
    setCurrentBounds(bounds);
  }, []);

  // Loading state - only show loading if actually fetching (not on initial render)
  const isLoading = (complaintsLoading && !heatmapData?.length) || territoriesLoading;

  return (
    <div className={`civiclens-map-container ${className}`} style={style}>
      {/* Filter Panel */}
      {showFilterPanel && (
        <FilterPanel
          filters={filters}
          layerVisibility={layerVisibility}
          availableCategories={availableCategories}
          availableStatuses={availableStatuses}
          ucList={ucList}
          townList={townList}
          hasActiveFilters={hasActiveFilters}
          activeFilterCount={activeFilterCount}
          stats={stats}
          onToggleCategory={toggleCategory}
          onToggleStatus={toggleStatus}
          onSetSeverityRange={setSeverityRange}
          onSetDateRange={setDateRange}
          onSetUCFilter={setUCFilter}
          onSetTownFilter={setTownFilter}
          onSetSearchQuery={setSearchQuery}
          onResetFilters={resetFilters}
          onToggleLayer={toggleLayer}
          isCollapsed={filterPanelCollapsed}
          onToggleCollapse={() => setFilterPanelCollapsed(!filterPanelCollapsed)}
        />
      )}

      {/* Map Container */}
      <div className="map-wrapper">
        {/* Loading Overlay */}
        {isLoading && (
          <div className="map-loading-overlay">
            <div className="loading-spinner"></div>
            <span>Loading map data...</span>
          </div>
        )}

        {/* Error Message */}
        {complaintsError && (
          <div className="map-error-message">
            <span>⚠️ {complaintsError}</span>
            <button onClick={() => fetchComplaints(filtersToApiParams)}>
              Retry
            </button>
          </div>
        )}

        <MapContainer
          center={KARACHI_CENTER}
          zoom={DEFAULT_ZOOM}
          minZoom={MIN_ZOOM}
          maxZoom={MAX_ZOOM}
          zoomControl={false}
          className="civiclens-map"
          style={{ height: '100%', width: '100%' }}
        >
          {/* Base Tile Layer */}
          <TileLayer
            url={TILE_PROVIDERS.cartoDB.url}
            attribution={TILE_PROVIDERS.cartoDB.attribution}
          />

          {/* Map Inner Components */}
          <MapInner
            complaints={filteredComplaints}
            heatmapData={heatmapData}
            ucBoundaries={ucBoundaries}
            townBoundaries={townBoundaries}
            layerVisibility={layerVisibility}
            selectedUCId={selectedUC}
            selectedTown={selectedTown}
            selectedComplaintId={selectedComplaintId}
            onMarkerClick={handleMarkerClick}
            onViewDetails={handleViewDetails}
            onUCClick={handleUCClick}
            onTownClick={handleTownClick}
            onBoundsChange={handleBoundsChange}
            onToggleLayer={toggleLayer}
          />

          {/* Custom Zoom Control */}
          <ZoomControl position="bottomright" />
        </MapContainer>

        {/* Legend */}
        {showLegend && (
          <MapLegend
            visible={true}
            showCategories={layerVisibility.markers}
            showStatus={layerVisibility.markers}
            showHeatmap={layerVisibility.heatmap}
            showBoundaries={layerVisibility.ucBoundaries || layerVisibility.townBoundaries}
            complaintsInView={complaintsInViewCount}
          />
        )}
      </div>
    </div>
  );
};

export default CivicLensMap;
