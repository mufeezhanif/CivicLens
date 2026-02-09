/**
 * TerritoryBoundaries Component
 * Renders UC and Town boundary polygons from GeoJSON with detailed tooltips
 */

import { useState, useCallback } from 'react';
import { GeoJSON, Tooltip, useMap } from 'react-leaflet';
import { getUCStyle, getTownStyle } from '../../utils/mapHelpers';

/**
 * Format number with commas
 */
const formatNumber = (num) => {
  if (!num && num !== 0) return 'N/A';
  return num.toLocaleString('en-US');
};

/**
 * Format percentage
 */
const formatPercentage = (num) => {
  if (!num && num !== 0) return 'N/A';
  return `${num.toFixed(1)}%`;
};

/**
 * UC Boundaries Layer
 */
export const UCBoundaries = ({
  data,
  visible = true,
  selectedUCId = null,
  onUCClick,
  onUCHover,
}) => {
  const map = useMap();
  const [hoveredUC, setHoveredUC] = useState(null);

  // Style function for each feature
  const styleFunction = useCallback((feature) => {
    const isHovered = hoveredUC === feature.properties.uc_id;
    const isSelected = selectedUCId === feature.properties.uc_id;
    return getUCStyle(feature, isHovered, isSelected);
  }, [hoveredUC, selectedUCId]);

  // Event handlers for each feature
  const onEachFeature = useCallback((feature, layer) => {
    const props = feature.properties;
    const stats = props.stats || {};
    
    // Create detailed tooltip content
    const tooltipContent = `
      <div class="uc-tooltip">
        <div class="tooltip-header">
          <strong>${props.uc_name || 'Unknown UC'}</strong>
        </div>
        <div class="tooltip-body">
          <div class="tooltip-row">
            <span class="tooltip-label">Code:</span>
            <span class="tooltip-value">${props.code || 'N/A'}</span>
          </div>
          <div class="tooltip-row">
            <span class="tooltip-label">Town:</span>
            <span class="tooltip-value">${props.town || 'N/A'}</span>
          </div>
          <div class="tooltip-row">
            <span class="tooltip-label">Population:</span>
            <span class="tooltip-value">${formatNumber(props.population)}</span>
          </div>
          <div class="tooltip-divider"></div>
          <div class="tooltip-row">
            <span class="tooltip-label">Total Complaints:</span>
            <span class="tooltip-value">${formatNumber(stats.totalComplaints)}</span>
          </div>
          <div class="tooltip-row">
            <span class="tooltip-label">Pending:</span>
            <span class="tooltip-value pending">${formatNumber(stats.pendingComplaints)}</span>
          </div>
          <div class="tooltip-row">
            <span class="tooltip-label">Resolved:</span>
            <span class="tooltip-value resolved">${formatNumber(stats.resolvedComplaints)}</span>
          </div>
          <div class="tooltip-row">
            <span class="tooltip-label">SLA Compliance:</span>
            <span class="tooltip-value">${formatPercentage(stats.slaComplianceRate)}</span>
          </div>
        </div>
      </div>
    `;
    
    // Bind tooltip with custom content
    layer.bindTooltip(tooltipContent, {
      permanent: false,
      direction: 'auto',
      className: 'territory-tooltip uc-territory-tooltip',
      sticky: true,
      opacity: 0.95,
    });
    
    // Mouse events
    layer.on({
      mouseover: (e) => {
        setHoveredUC(feature.properties.uc_id);
        if (onUCHover) onUCHover(feature.properties);
        
        // Highlight style
        e.target.setStyle(getUCStyle(feature, true, selectedUCId === feature.properties.uc_id));
        e.target.bringToFront();
      },
      mouseout: (e) => {
        setHoveredUC(null);
        if (onUCHover) onUCHover(null);
        
        // Reset style
        e.target.setStyle(getUCStyle(feature, false, selectedUCId === feature.properties.uc_id));
      },
      click: () => {
        if (onUCClick) {
          onUCClick(feature.properties);
          
          // Zoom to UC bounds
          const bounds = layer.getBounds();
          map.fitBounds(bounds, { padding: [50, 50] });
        }
      },
    });
  }, [map, onUCClick, onUCHover, selectedUCId]);

  if (!visible || !data || !data.features?.length) {
    return null;
  }

  return (
    <GeoJSON
      key={`uc-${selectedUCId}-${hoveredUC}`}
      data={data}
      style={styleFunction}
      onEachFeature={onEachFeature}
    />
  );
};

/**
 * Town Boundaries Layer
 */
export const TownBoundaries = ({
  data,
  visible = true,
  selectedTown = null,
  onTownClick,
  onTownHover,
}) => {
  const map = useMap();
  const [hoveredTown, setHoveredTown] = useState(null);

  // Style function for each feature
  const styleFunction = useCallback((feature) => {
    const townName = feature.properties.town_name || feature.properties.town;
    const isHovered = hoveredTown === townName;
    const isSelected = selectedTown === townName;
    return getTownStyle(feature, isHovered, isSelected);
  }, [hoveredTown, selectedTown]);

  // Event handlers for each feature
  const onEachFeature = useCallback((feature, layer) => {
    const props = feature.properties;
    const stats = props.stats || {};
    const townName = props.town_name || props.town;
    
    // Create detailed tooltip content
    const tooltipContent = `
      <div class="town-tooltip">
        <div class="tooltip-header">
          <strong>${townName || 'Unknown Town'}</strong>
        </div>
        <div class="tooltip-body">
          <div class="tooltip-row">
            <span class="tooltip-label">Code:</span>
            <span class="tooltip-value">${props.code || 'N/A'}</span>
          </div>
          <div class="tooltip-row">
            <span class="tooltip-label">District:</span>
            <span class="tooltip-value">${props.district || 'N/A'}</span>
          </div>
          <div class="tooltip-row">
            <span class="tooltip-label">Population:</span>
            <span class="tooltip-value">${formatNumber(props.population)}</span>
          </div>
          <div class="tooltip-row">
            <span class="tooltip-label">Total UCs:</span>
            <span class="tooltip-value">${formatNumber(stats.totalUCs)}</span>
          </div>
          <div class="tooltip-divider"></div>
          <div class="tooltip-row">
            <span class="tooltip-label">Total Complaints:</span>
            <span class="tooltip-value">${formatNumber(stats.totalComplaints)}</span>
          </div>
          <div class="tooltip-row">
            <span class="tooltip-label">Resolved:</span>
            <span class="tooltip-value resolved">${formatNumber(stats.resolvedComplaints)}</span>
          </div>
          <div class="tooltip-row">
            <span class="tooltip-label">Avg. Resolution:</span>
            <span class="tooltip-value">${stats.avgResolutionTime ? Math.round(stats.avgResolutionTime / 60) + ' hrs' : 'N/A'}</span>
          </div>
          <div class="tooltip-row">
            <span class="tooltip-label">SLA Compliance:</span>
            <span class="tooltip-value">${formatPercentage(stats.slaComplianceRate)}</span>
          </div>
        </div>
      </div>
    `;
    
    // Bind tooltip with detailed content
    layer.bindTooltip(tooltipContent, {
      permanent: false,
      direction: 'auto',
      className: 'territory-tooltip town-territory-tooltip',
      sticky: true,
      opacity: 0.95,
    });

    // Mouse events
    layer.on({
      mouseover: (e) => {
        setHoveredTown(townName);
        if (onTownHover) onTownHover(feature.properties);
        
        // Highlight style
        e.target.setStyle(getTownStyle(feature, true, selectedTown === townName));
        e.target.bringToFront();
      },
      mouseout: (e) => {
        setHoveredTown(null);
        if (onTownHover) onTownHover(null);
        
        // Reset style
        e.target.setStyle(getTownStyle(feature, false, selectedTown === townName));
      },
      click: () => {
        if (onTownClick) {
          onTownClick(feature.properties);
          
          // Zoom to Town bounds
          const bounds = layer.getBounds();
          map.fitBounds(bounds, { padding: [50, 50] });
        }
      },
    });
  }, [map, onTownClick, onTownHover, selectedTown]);

  if (!visible || !data || !data.features?.length) {
    return null;
  }

  return (
    <GeoJSON
      key={`town-${selectedTown}-${hoveredTown}`}
      data={data}
      style={styleFunction}
      onEachFeature={onEachFeature}
    />
  );
};

/**
 * Combined Territory Boundaries Component
 */
const TerritoryBoundaries = ({
  ucData,
  townData,
  showUC = true,
  showTown = true,
  selectedUCId = null,
  selectedTown = null,
  onUCClick,
  onTownClick,
  onUCHover,
  onTownHover,
}) => {
  return (
    <>
      {/* Town boundaries render below UC boundaries */}
      <TownBoundaries
        data={townData}
        visible={showTown}
        selectedTown={selectedTown}
        onTownClick={onTownClick}
        onTownHover={onTownHover}
      />
      
      {/* UC boundaries render on top */}
      <UCBoundaries
        data={ucData}
        visible={showUC}
        selectedUCId={selectedUCId}
        onUCClick={onUCClick}
        onUCHover={onUCHover}
      />
    </>
  );
};

export default TerritoryBoundaries;
