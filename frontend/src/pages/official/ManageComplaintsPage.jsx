/**
 * Manage Complaints Page
 * For officials to manage complaints in their territory
 */

import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { complaintsApi } from '../../services/api';
import { 
  Button, 
  Card, 
  CardHeader, 
  CardTitle, 
  CardContent,
  Badge,
  Select,
  Input,
  Spinner,
  EmptyState,
  Alert 
} from '../../components/ui';
import { Modal } from '../../components/ui/Modal';

// Icons
const SearchIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
  </svg>
);

const FilterIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
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
    year: 'numeric',
  });
};

const ComplaintCard = ({ complaint, onUpdateStatus, onView }) => (
  <Card className="hover:shadow-md transition-shadow">
    <CardContent className="p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <Badge variant={getSeverityVariant(complaint.severity?.priority || complaint.severity)} size="sm">
              {complaint.severity?.priority || complaint.severity || 'medium'}
            </Badge>
            <Badge variant={getStatusVariant(complaint.status)} size="sm">
              {complaint.status?.replace('_', ' ')}
            </Badge>
          </div>
          <h3 className="font-semibold text-foreground truncate">{complaint.title}</h3>
          <p className="text-sm text-foreground/60 mt-1 line-clamp-2">{complaint.description}</p>
          
          <div className="flex flex-wrap items-center gap-4 mt-3 text-xs text-foreground/50">
            {complaint.category?.name && (
              <span className="flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                </svg>
                {complaint.category.name}
              </span>
            )}
            <span className="flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              {formatDate(complaint.createdAt)}
            </span>
            <span className="flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              {complaint.createdBy?.name || 'Anonymous'}
            </span>
          </div>
        </div>
        
        <div className="flex flex-col gap-2">
          <Button variant="primary" size="sm" onClick={() => onView(complaint)}>
            View
          </Button>
          <Button variant="outline" size="sm" onClick={() => onUpdateStatus(complaint)}>
            Update
          </Button>
        </div>
      </div>
    </CardContent>
  </Card>
);

const ManageComplaintsPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || '');
  const [severityFilter, setSeverityFilter] = useState(searchParams.get('severity') || '');
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });

  // Status update modal
  const [statusModal, setStatusModal] = useState(false);
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [newStatus, setNewStatus] = useState('');
  const [statusComment, setStatusComment] = useState('');
  const [updating, setUpdating] = useState(false);

  // Fetch complaints
  const fetchComplaints = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params = {
        page: pagination.page,
        limit: pagination.limit,
        assignedToMe: true,
      };

      if (statusFilter) params.status = statusFilter;
      if (severityFilter) params.severity = severityFilter;
      if (searchQuery) params.search = searchQuery;

      const response = await complaintsApi.getComplaints(params);
      const data = response.data;

      setComplaints(data.data || []);
      setPagination(prev => ({
        ...prev,
        total: data.total || 0,
        totalPages: data.totalPages || 1,
      }));
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch complaints');
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, statusFilter, severityFilter, searchQuery]);

  useEffect(() => {
    fetchComplaints();
  }, [fetchComplaints]);

  // Handle search
  const handleSearch = (e) => {
    e.preventDefault();
    setPagination({ ...pagination, page: 1 });
    fetchComplaints();
  };

  // Open status update modal
  const handleUpdateStatus = (complaint) => {
    setSelectedComplaint(complaint);
    setNewStatus(complaint.status);
    setStatusComment('');
    setStatusModal(true);
  };

  // Submit status update
  const handleSubmitStatus = async () => {
    if (!selectedComplaint || !newStatus) return;

    setUpdating(true);
    try {
      await complaintsApi.updateComplaint(selectedComplaint._id, {
        status: newStatus,
        comment: statusComment,
      });
      
      // Refresh list
      fetchComplaints();
      setStatusModal(false);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update status');
    } finally {
      setUpdating(false);
    }
  };

  // View complaint details
  const handleView = (complaint) => {
    navigate(`/official/complaints/${complaint._id}`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Manage Complaints</h1>
        <p className="text-foreground/60 mt-1">Review and manage complaints in your territory</p>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <form onSubmit={handleSearch} className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-foreground/40">
                  <SearchIcon />
                </div>
                <input
                  type="text"
                  placeholder="Search complaints..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-foreground/5 border-0 rounded-xl text-sm focus:ring-2 focus:ring-primary/20"
                />
              </div>
            </div>
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="md:w-40"
            >
              <option value="">All Status</option>
              <option value="pending">Pending</option>
              <option value="assigned">Assigned</option>
              <option value="in_progress">In Progress</option>
              <option value="resolved">Resolved</option>
              <option value="rejected">Rejected</option>
            </Select>
            <Select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              className="md:w-40"
            >
              <option value="">All Severity</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </Select>
            <Button type="submit" icon={<FilterIcon />}>
              Filter
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="flex gap-4 text-sm">
        <span className="text-foreground/50">
          Showing <span className="font-medium text-foreground">{complaints.length}</span> of{' '}
          <span className="font-medium text-foreground">{pagination.total}</span> complaints
        </span>
      </div>

      {error && (
        <Alert variant="error" onDismiss={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Complaints List */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Spinner size="lg" />
        </div>
      ) : complaints.length === 0 ? (
        <EmptyState
          title="No complaints found"
          description="There are no complaints matching your filters"
        />
      ) : (
        <div className="space-y-4">
          {complaints.map((complaint) => (
            <ComplaintCard
              key={complaint._id}
              complaint={complaint}
              onUpdateStatus={handleUpdateStatus}
              onView={handleView}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={pagination.page === 1}
            onClick={() => setPagination({ ...pagination, page: pagination.page - 1 })}
          >
            Previous
          </Button>
          <span className="flex items-center px-4 text-sm text-foreground/60">
            Page {pagination.page} of {pagination.totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={pagination.page === pagination.totalPages}
            onClick={() => setPagination({ ...pagination, page: pagination.page + 1 })}
          >
            Next
          </Button>
        </div>
      )}

      {/* Status Update Modal */}
      <Modal
        isOpen={statusModal}
        onClose={() => setStatusModal(false)}
        title="Update Complaint Status"
      >
        <div className="space-y-4">
          <div>
            <p className="font-medium text-foreground">{selectedComplaint?.title}</p>
            <p className="text-sm text-foreground/50">ID: {selectedComplaint?._id?.slice(-8)}</p>
          </div>

          <Select
            label="New Status"
            value={newStatus}
            onChange={(e) => setNewStatus(e.target.value)}
          >
            <option value="pending">Pending</option>
            <option value="assigned">Assigned</option>
            <option value="in_progress">In Progress</option>
            <option value="resolved">Resolved</option>
            <option value="rejected">Rejected</option>
          </Select>

          <div>
            <label className="block text-sm font-medium text-foreground/80 mb-2">
              Comment (Optional)
            </label>
            <textarea
              value={statusComment}
              onChange={(e) => setStatusComment(e.target.value)}
              placeholder="Add a note about this status change..."
              rows={3}
              className="w-full px-4 py-3 bg-foreground/5 border-0 rounded-xl text-sm focus:ring-2 focus:ring-primary/20"
            />
          </div>

          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setStatusModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmitStatus} loading={updating}>
              Update Status
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default ManageComplaintsPage;
