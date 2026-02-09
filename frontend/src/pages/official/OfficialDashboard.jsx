/**
 * Official Dashboard
 * Dashboard for township officers and UC chairmen
 */

import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { complaintsApi } from '../../services/api';
import { useAuth } from '../../contexts';
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardContent,
  Badge,
  Button,
  Spinner,
  Alert
} from '../../components/ui';

// Icons
const TrendingUpIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
  </svg>
);

const ClipboardIcon = () => (
  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
  </svg>
);

const CheckCircleIcon = () => (
  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const ClockIcon = () => (
  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const AlertIcon = () => (
  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
  </svg>
);

// Status badge variants
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

// Severity badge variants
const getSeverityVariant = (severity) => {
  switch (severity) {
    case 'critical': return 'danger';
    case 'high': return 'danger';
    case 'medium': return 'warning';
    default: return 'default';
  }
};

const formatDate = (date) => {
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const StatCard = ({ title, value, icon, trend, color = 'primary' }) => (
  <Card>
    <CardContent className="p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-foreground/60">{title}</p>
          <p className="text-3xl font-bold text-foreground mt-1">{value}</p>
          {trend && (
            <div className="flex items-center gap-1 mt-2">
              <TrendingUpIcon className="w-4 h-4 text-green-600" />
              <span className="text-xs text-green-600">{trend}</span>
            </div>
          )}
        </div>
        <div className={`w-12 h-12 rounded-xl bg-${color}/10 text-${color} flex items-center justify-center`}>
          {icon}
        </div>
      </div>
    </CardContent>
  </Card>
);

const ComplaintRow = ({ complaint, onAction }) => (
  <tr className="border-b border-foreground/5 hover:bg-foreground/5 transition-colors">
    <td className="px-4 py-3">
      <div>
        <p className="font-medium text-foreground truncate max-w-[200px]">{complaint.title}</p>
        <p className="text-xs text-foreground/50">{complaint._id?.slice(-8)}</p>
      </div>
    </td>
    <td className="px-4 py-3">
      <Badge variant={getStatusVariant(complaint.status)} size="sm">
        {complaint.status?.replace('_', ' ')}
      </Badge>
    </td>
    <td className="px-4 py-3">
      <Badge variant={getSeverityVariant(complaint.severity?.priority || complaint.severity)} size="sm">
        {complaint.severity?.priority || complaint.severity || 'medium'}
      </Badge>
    </td>
    <td className="px-4 py-3 text-sm text-foreground/60">
      {complaint.category?.name || 'Uncategorized'}
    </td>
    <td className="px-4 py-3 text-sm text-foreground/50">
      {formatDate(complaint.createdAt)}
    </td>
    <td className="px-4 py-3">
      <Button
        variant="outline"
        size="sm"
        onClick={() => onAction(complaint)}
      >
        View
      </Button>
    </td>
  </tr>
);

const OfficialDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    inProgress: 0,
    resolved: 0,
    critical: 0,
  });
  const [recentComplaints, setRecentComplaints] = useState([]);

  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);
      try {
        // Fetch complaints assigned to this official or in their territory
        const response = await complaintsApi.getComplaints({
          limit: 10,
          assignedToMe: true,
        });

        const complaints = response.data.data || [];
        
        // Calculate stats
        setStats({
          total: response.data.total || complaints.length,
          pending: complaints.filter((c) => c.status === 'pending' || c.status === 'assigned').length,
          inProgress: complaints.filter((c) => c.status === 'in_progress').length,
          resolved: complaints.filter((c) => c.status === 'resolved').length,
          critical: complaints.filter((c) => c.severity === 'critical' || c.severity === 'high').length,
        });

        setRecentComplaints(complaints.slice(0, 5));
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const handleViewComplaint = (complaint) => {
    navigate(`/official/complaints/${complaint._id}`);
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
      {/* Welcome Section */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          Welcome back, {user?.name?.split(' ')[0]}
        </h1>
        <p className="text-foreground/60 mt-1">
          Here's what's happening in your territory today.
        </p>
      </div>

      {error && (
        <Alert variant="error" onDismiss={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard
          title="Total Complaints"
          value={stats.total}
          icon={<ClipboardIcon />}
          color="primary"
        />
        <StatCard
          title="Pending"
          value={stats.pending}
          icon={<ClockIcon />}
          color="yellow-600"
        />
        <StatCard
          title="In Progress"
          value={stats.inProgress}
          icon={<ClockIcon />}
          color="blue-600"
        />
        <StatCard
          title="Resolved"
          value={stats.resolved}
          icon={<CheckCircleIcon />}
          color="green-600"
          trend="+12% this week"
        />
        <StatCard
          title="Critical"
          value={stats.critical}
          icon={<AlertIcon />}
          color="red-600"
        />
      </div>

      {/* Quick Actions */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Button
          variant="outline"
          fullWidth
          onClick={() => navigate('/official/complaints?status=pending')}
          className="h-auto py-4 flex-col gap-2"
        >
          <ClockIcon className="w-6 h-6" />
          <span>Review Pending</span>
        </Button>
        <Button
          variant="outline"
          fullWidth
          onClick={() => navigate('/official/complaints?severity=critical')}
          className="h-auto py-4 flex-col gap-2"
        >
          <AlertIcon className="w-6 h-6" />
          <span>Critical Issues</span>
        </Button>
        <Button
          variant="outline"
          fullWidth
          onClick={() => navigate('/official/territory')}
          className="h-auto py-4 flex-col gap-2"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
          </svg>
          <span>View Territory</span>
        </Button>
        <Button
          variant="outline"
          fullWidth
          onClick={() => navigate('/official/reports')}
          className="h-auto py-4 flex-col gap-2"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <span>Generate Report</span>
        </Button>
      </div>

      {/* Recent Complaints Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Recent Complaints</CardTitle>
          <Button
            variant="link"
            onClick={() => navigate('/official/complaints')}
          >
            View All
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-foreground/5">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-foreground/60 uppercase tracking-wider">
                    Complaint
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-foreground/60 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-foreground/60 uppercase tracking-wider">
                    Severity
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-foreground/60 uppercase tracking-wider">
                    Category
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-foreground/60 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-foreground/60 uppercase tracking-wider">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody>
                {recentComplaints.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-4 py-8 text-center text-foreground/50">
                      No complaints found in your territory
                    </td>
                  </tr>
                ) : (
                  recentComplaints.map((complaint) => (
                    <ComplaintRow
                      key={complaint._id}
                      complaint={complaint}
                      onAction={handleViewComplaint}
                    />
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default OfficialDashboard;
