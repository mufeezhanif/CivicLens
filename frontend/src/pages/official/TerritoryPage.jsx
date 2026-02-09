/**
 * Territory Page
 * Map view for officials to see complaints in their territory
 */

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { complaintsApi, territoriesApi } from '../../services/api';
import { useAuth } from '../../contexts';
import { 
  Button, 
  Card, 
  CardHeader, 
  CardTitle, 
  CardContent,
  Badge,
  Select,
  Spinner,
  Alert 
} from '../../components/ui';

// We'll use the existing map components
import CivicLensMap from '../../components/Map/CivicLensMap';

// Icons
const RefreshIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
  </svg>
);

const LayersIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
  </svg>
);

const getStatusVariant = (status) => {
  switch (status) {
    case 'pending': return 'warning';
    case 'assigned': return 'info';
    case 'in_progress': return 'primary';
    case 'resolved': return 'success';
    case 'rejected': return 'danger';
    default: return 'default';
  }
};

const TerritoryPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [complaints, setComplaints] = useState([]);
  const [territory, setTerritory] = useState(null);
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  
  // Filters
  const [statusFilter, setStatusFilter] = useState('');
  const [severityFilter, setSeverityFilter] = useState('');
  const [showHeatmap, setShowHeatmap] = useState(true);

  // Stats
  const stats = {
    total: complaints.length,
    pending: complaints.filter(c => c.status === 'pending' || c.status === 'assigned').length,
    inProgress: complaints.filter(c => c.status === 'in_progress').length,
    resolved: complaints.filter(c => c.status === 'resolved').length,
  };

  // Fetch data
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Fetch complaints in territory
      const params = { assignedToMe: true, limit: 100 };
      if (statusFilter) params.status = statusFilter;
      if (severityFilter) params.severity = severityFilter;

      const complaintsRes = await complaintsApi.getComplaints(params);
      setComplaints(complaintsRes.data.data || []);

      // Fetch territory info if available
      if (user?.territory) {
        try {
          const territoryRes = await territoriesApi.getTerritory(user.territory);
          setTerritory(territoryRes.data);
        } catch (err) {
          console.log('Territory not found:', err);
        }
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load territory data');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, severityFilter, user?.territory]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Handle marker click
  const handleMarkerClick = (complaint) => {
    setSelectedComplaint(complaint);
  };

  // View complaint details
  const handleViewDetails = () => {
    if (selectedComplaint) {
      navigate(`/official/complaints/${selectedComplaint._id}`);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Territory Map</h1>
          <p className="text-foreground/60 mt-1">
            {territory?.name || 'Your assigned territory'}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchData} icon={<RefreshIcon />}>
            Refresh
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="error" onDismiss={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Stats Bar */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-foreground">{stats.total}</p>
            <p className="text-xs text-foreground/50">Total</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
            <p className="text-xs text-foreground/50">Pending</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-blue-600">{stats.inProgress}</p>
            <p className="text-xs text-foreground/50">In Progress</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-green-600">{stats.resolved}</p>
            <p className="text-xs text-foreground/50">Resolved</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4">
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-40"
            >
              <option value="">All Status</option>
              <option value="pending">Pending</option>
              <option value="assigned">Assigned</option>
              <option value="in_progress">In Progress</option>
              <option value="resolved">Resolved</option>
            </Select>
            <Select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              className="w-40"
            >
              <option value="">All Severity</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </Select>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showHeatmap}
                onChange={(e) => setShowHeatmap(e.target.checked)}
                className="w-4 h-4 text-primary rounded focus:ring-primary"
              />
              <span className="text-sm text-foreground/70">Show Heatmap</span>
            </label>
          </div>
        </CardContent>
      </Card>

      {/* Map and Sidebar */}
      <div className="grid lg:grid-cols-4 gap-6">
        {/* Map */}
        <div className="lg:col-span-3">
          <Card className="overflow-hidden">
            <div className="h-[600px]">
              <CivicLensMap
                complaints={complaints}
                showHeatmap={showHeatmap}
                onMarkerClick={handleMarkerClick}
                center={territory?.center || [31.5204, 74.3587]}
                zoom={territory ? 14 : 12}
              />
            </div>
          </Card>
        </div>

        {/* Sidebar - Selected Complaint */}
        <div className="lg:col-span-1">
          <Card className="sticky top-6">
            <CardHeader>
              <CardTitle>
                {selectedComplaint ? 'Complaint Details' : 'Select a Marker'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {selectedComplaint ? (
                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold text-foreground">
                      {selectedComplaint.title}
                    </h4>
                    <p className="text-sm text-foreground/60 mt-1 line-clamp-3">
                      {selectedComplaint.description}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Badge variant={getStatusVariant(selectedComplaint.status)}>
                      {selectedComplaint.status?.replace('_', ' ')}
                    </Badge>
                    <Badge variant={(selectedComplaint.severity?.priority || selectedComplaint.severity) === 'critical' || (selectedComplaint.severity?.priority || selectedComplaint.severity) === 'high' ? 'danger' : 'warning'}>
                      {selectedComplaint.severity?.priority || selectedComplaint.severity || 'medium'}
                    </Badge>
                  </div>

                  {selectedComplaint.category && (
                    <div className="text-sm">
                      <span className="text-foreground/50">Category:</span>{' '}
                      <span className="text-foreground">{selectedComplaint.category.name}</span>
                    </div>
                  )}

                  <div className="text-sm">
                    <span className="text-foreground/50">Reported by:</span>{' '}
                    <span className="text-foreground">
                      {selectedComplaint.createdBy?.name || 'Anonymous'}
                    </span>
                  </div>

                  <div className="text-sm">
                    <span className="text-foreground/50">Date:</span>{' '}
                    <span className="text-foreground">
                      {new Date(selectedComplaint.createdAt).toLocaleDateString()}
                    </span>
                  </div>

                  <Button fullWidth onClick={handleViewDetails}>
                    View Full Details
                  </Button>
                </div>
              ) : (
                <div className="text-center py-8 text-foreground/50">
                  <LayersIcon className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>Click on a marker to view complaint details</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default TerritoryPage;
