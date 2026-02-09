/**
 * FilterPanel Component
 * Floating sidebar filter controls for the map
 */

import { useState, useCallback } from 'react';
import { 
  CATEGORY_COLORS, 
  CATEGORY_ICONS,
  STATUS_COLORS,
  STATUS_LABELS,
} from '../../utils/mapHelpers';

// Icons
const Icons = {
  Filter: () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
    </svg>
  ),
  X: () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  ),
  ChevronDown: () => (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
  ),
  Layers: () => (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
    </svg>
  ),
  Search: () => (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  ),
};

// Section header component
const SectionHeader = ({ title, icon, section, count, isExpanded, onToggle }) => (
  <button
    className={`w-full flex items-center justify-between px-4 py-3 text-left transition-colors ${isExpanded ? 'bg-primary/5' : 'hover:bg-gray-50'}`}
    onClick={() => onToggle(section)}
    aria-expanded={isExpanded}
  >
    <span className="flex items-center gap-2 text-sm font-semibold text-gray-700">
      {icon}
      {title}
      {count > 0 && (
        <span className="px-2 py-0.5 text-xs font-bold bg-primary text-white rounded-full">{count}</span>
      )}
    </span>
    <span className={`transform transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
      <Icons.ChevronDown />
    </span>
  </button>
);

const FilterPanel = ({
  filters,
  layerVisibility,
  availableCategories,
  availableStatuses,
  ucList = [],
  townList = [],
  hasActiveFilters,
  activeFilterCount,
  stats = {},
  onToggleCategory,
  onToggleStatus,
  onSetSeverityRange,
  onSetDateRange,
  onSetUCFilter,
  onSetTownFilter,
  onSetSearchQuery,
  onResetFilters,
  onToggleLayer,
  isCollapsed = false,
  onToggleCollapse,
}) => {
  const [expandedSections, setExpandedSections] = useState({
    layers: true,
    categories: false,
    status: false,
    severity: false,
    date: false,
    location: false,
  });

  const toggleSection = useCallback((section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section],
    }));
  }, []);

  return (
    <>
      {/* Toggle Button - Always visible */}
      <button
        onClick={onToggleCollapse}
        className={`fixed top-20 z-[1001] flex items-center gap-2 px-4 py-3 rounded-r-xl shadow-lg border border-l-0 transition-all duration-300 ${
          isCollapsed 
            ? 'left-0 bg-white border-gray-200 text-gray-700 hover:bg-gray-50' 
            : 'left-[320px] bg-primary text-white border-primary'
        }`}
        aria-label={isCollapsed ? 'Open filters' : 'Close filters'}
      >
        {isCollapsed ? <Icons.Filter /> : <Icons.X />}
        {isCollapsed && hasActiveFilters && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
            {activeFilterCount}
          </span>
        )}
      </button>

      {/* Filter Panel - Floating Overlay */}
      <div 
        className={`fixed top-0 left-0 h-full z-[1000] w-[320px] bg-white shadow-2xl transform transition-transform duration-300 ease-in-out ${
          isCollapsed ? '-translate-x-full' : 'translate-x-0'
        }`}
      >
        {/* Header */}
        <div className="bg-linear-to-r from-primary to-green-600 px-5 py-4 text-white">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold flex items-center gap-2">
              <Icons.Filter />
              Map Filters
            </h3>
            {hasActiveFilters && (
              <button 
                className="px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded-lg text-sm font-medium transition-colors"
                onClick={onResetFilters}
              >
                Reset ({activeFilterCount})
              </button>
            )}
          </div>
          {/* Stats */}
          <div className="mt-3 flex items-center gap-3">
            <div className="px-3 py-1.5 bg-white/10 rounded-lg">
              <span className="text-2xl font-bold">{stats.total || 0}</span>
              <span className="text-xs text-white/80 ml-1">Issues</span>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="h-[calc(100%-120px)] overflow-y-auto">
          {/* Search */}
          <div className="px-4 py-3 border-b border-gray-100">
            <div className="relative">
              <input
                type="text"
                placeholder="Search complaints..."
                value={filters.searchQuery}
                onChange={(e) => onSetSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                <Icons.Search />
              </span>
            </div>
          </div>

          {/* Layer Toggles */}
          <div className="border-b border-gray-100">
            <SectionHeader 
              title="Map Layers" 
              icon={<Icons.Layers />}
              section="layers" 
              isExpanded={expandedSections.layers} 
              onToggle={toggleSection} 
            />
            {expandedSections.layers && (
              <div className="px-4 pb-4 space-y-2">
                {[
                  { id: 'markers', icon: '📍', label: 'Issue Markers' },
                  { id: 'heatmap', icon: '🔥', label: 'Heatmap Overlay' },
                  { id: 'townBoundaries', icon: '🏙️', label: 'Town Boundaries' },
                  { id: 'ucBoundaries', icon: '🔲', label: 'UC Boundaries' },
                  { id: 'clusters', icon: '⭕', label: 'Cluster Markers' },
                ].map(layer => (
                  <label key={layer.id} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors">
                    <input
                      type="checkbox"
                      checked={layerVisibility[layer.id]}
                      onChange={() => onToggleLayer(layer.id)}
                      className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
                    />
                    <span className="text-lg">{layer.icon}</span>
                    <span className="text-sm font-medium text-gray-700">{layer.label}</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Categories */}
          <div className="border-b border-gray-100">
            <SectionHeader 
              title="Categories" 
              icon="📂"
              section="categories" 
              count={filters.categories.length}
              isExpanded={expandedSections.categories}
              onToggle={toggleSection}
            />
            {expandedSections.categories && (
              <div className="px-4 pb-4 space-y-1.5">
                {availableCategories.map(category => (
                  <label 
                    key={category}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-all border-2 ${
                      filters.categories.includes(category) 
                        ? 'border-primary bg-primary/5' 
                        : 'border-transparent hover:bg-gray-50'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={filters.categories.includes(category)}
                      onChange={() => onToggleCategory(category)}
                      className="hidden"
                    />
                    <span className="w-8 h-8 flex items-center justify-center bg-gray-100 rounded-lg text-lg">
                      {CATEGORY_ICONS[category]}
                    </span>
                    <span className="flex-1 text-sm font-medium text-gray-700">{category}</span>
                    {stats.byCategory?.[category] && (
                      <span className="text-xs font-semibold text-gray-400 bg-gray-100 px-2 py-1 rounded">
                        {stats.byCategory[category]}
                      </span>
                    )}
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Status */}
          <div className="border-b border-gray-100">
            <SectionHeader 
              title="Status" 
              icon="🚦"
              section="status" 
              count={filters.status.length}
              isExpanded={expandedSections.status}
              onToggle={toggleSection}
            />
            {expandedSections.status && (
              <div className="px-4 pb-4 space-y-1.5">
                {availableStatuses.map(status => (
                  <label 
                    key={status}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-all ${
                      filters.status.includes(status) 
                        ? 'bg-gray-100' 
                        : 'hover:bg-gray-50'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={filters.status.includes(status)}
                      onChange={() => onToggleStatus(status)}
                      className="hidden"
                    />
                    <span 
                      className="w-3.5 h-3.5 rounded-full shadow-sm"
                      style={{ backgroundColor: STATUS_COLORS[status] }}
                    />
                    <span className="flex-1 text-sm font-medium text-gray-700">
                      {STATUS_LABELS[status]}
                    </span>
                    {stats.byStatus?.[status] && (
                      <span className="text-xs font-semibold text-gray-400">
                        {stats.byStatus[status]}
                      </span>
                    )}
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Location */}
          <div className="border-b border-gray-100">
            <SectionHeader 
              title="Location" 
              icon="📍"
              section="location" 
              isExpanded={expandedSections.location} 
              onToggle={toggleSection} 
            />
            {expandedSections.location && (
              <div className="px-4 pb-4 space-y-3">
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Town</label>
                  <select
                    value={filters.town || ''}
                    onChange={(e) => onSetTownFilter(e.target.value || null)}
                    className="mt-1 w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                  >
                    <option value="">All Towns</option>
                    {townList.map(town => (
                      <option key={town.id || town.name} value={town.name}>{town.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Union Council</label>
                  <select
                    value={filters.ucId || ''}
                    onChange={(e) => onSetUCFilter(e.target.value || null)}
                    className="mt-1 w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                  >
                    <option value="">All UCs</option>
                    {ucList.filter(uc => !filters.town || uc.town === filters.town).map(uc => (
                      <option key={uc.id} value={uc.id}>{uc.name}</option>
                    ))}
                  </select>
                </div>
                {(filters.town || filters.ucId) && (
                  <button
                    className="w-full py-2 text-sm font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
                    onClick={() => { onSetTownFilter(null); onSetUCFilter(null); }}
                  >
                    Clear Location Filter
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Severity */}
          <div className="border-b border-gray-100">
            <SectionHeader 
              title="Severity" 
              icon="⚠️"
              section="severity" 
              isExpanded={expandedSections.severity} 
              onToggle={toggleSection} 
            />
            {expandedSections.severity && (
              <div className="px-4 pb-4 space-y-4">
                <div>
                  <div className="flex justify-between text-xs font-medium text-gray-500 mb-2">
                    <span>Min: {filters.severity.min}</span>
                    <span>Max: {filters.severity.max}</span>
                  </div>
                  <div className="space-y-3">
                    <input
                      type="range"
                      min="1"
                      max="10"
                      value={filters.severity.min}
                      onChange={(e) => onSetSeverityRange(parseInt(e.target.value), filters.severity.max)}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary"
                    />
                    <input
                      type="range"
                      min="1"
                      max="10"
                      value={filters.severity.max}
                      onChange={(e) => onSetSeverityRange(filters.severity.min, parseInt(e.target.value))}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary"
                    />
                  </div>
                </div>
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-green-600">Low</span>
                  <span className="text-amber-600">Medium</span>
                  <span className="text-red-600">High</span>
                </div>
              </div>
            )}
          </div>

          {/* Date Range */}
          <div>
            <SectionHeader 
              title="Date Range" 
              icon="📅"
              section="date" 
              isExpanded={expandedSections.date} 
              onToggle={toggleSection} 
            />
            {expandedSections.date && (
              <div className="px-4 pb-4 space-y-3">
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">From</label>
                  <input
                    type="date"
                    value={filters.dateRange.from || ''}
                    onChange={(e) => onSetDateRange(e.target.value, filters.dateRange.to)}
                    className="mt-1 w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">To</label>
                  <input
                    type="date"
                    value={filters.dateRange.to || ''}
                    onChange={(e) => onSetDateRange(filters.dateRange.from, e.target.value)}
                    className="mt-1 w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-primary"
                  />
                </div>
                {(filters.dateRange.from || filters.dateRange.to) && (
                  <button
                    className="w-full py-2 text-sm font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
                    onClick={() => onSetDateRange(null, null)}
                  >
                    Clear Dates
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Backdrop */}
      {!isCollapsed && (
        <div 
          className="fixed inset-0 bg-black/20 z-[999] lg:hidden"
          onClick={onToggleCollapse}
        />
      )}
    </>
  );
};

export default FilterPanel;
