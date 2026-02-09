/**
 * Complaint Detail Page
 * Shows detailed view of a single complaint
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { complaintsApi } from '../../services/api';
import { 
  Button, 
  Card, 
  CardHeader, 
  CardTitle, 
  CardContent,
  Badge,
  Spinner,
  Alert,
  Textarea
} from '../../components/ui';
import { Modal, ConfirmDialog } from '../../components/ui/Modal';

// Icons
const ArrowLeftIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
  </svg>
);

const LocationIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

const CalendarIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
  </svg>
);

const UserIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
  </svg>
);

// Status badge variants
const getStatusVariant = (status) => {
  switch (status) {
    case 'pending':
      return 'warning';
    case 'assigned':
      return 'info';
    case 'in_progress':
      return 'primary';
    case 'resolved':
      return 'success';
    case 'rejected':
      return 'danger';
    default:
      return 'default';
  }
};

// Severity badge variants
const getSeverityVariant = (severity) => {
  switch (severity) {
    case 'low':
      return 'default';
    case 'medium':
      return 'warning';
    case 'high':
      return 'danger';
    case 'critical':
      return 'danger';
    default:
      return 'default';
  }
};

// Format date
const formatDate = (date) => {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

// Status timeline
const StatusTimeline = ({ history }) => {
  if (!history || history.length === 0) return null;

  return (
    <div className="space-y-4">
      {history.map((item, index) => (
        <div key={index} className="flex gap-4">
          <div className="relative">
            <div className="w-3 h-3 bg-primary rounded-full mt-1.5" />
            {index !== history.length - 1 && (
              <div className="absolute top-4 left-1 w-0.5 h-full bg-foreground/10" />
            )}
          </div>
          <div className="flex-1 pb-4">
            <div className="flex items-center gap-2">
              <Badge variant={getStatusVariant(item.status)} size="sm">
                {item.status?.replace('_', ' ')}
              </Badge>
              <span className="text-xs text-foreground/50">
                {formatDate(item.changedAt)}
              </span>
            </div>
            {item.comment && (
              <p className="text-sm text-foreground/70 mt-1">{item.comment}</p>
            )}
            {item.changedBy && (
              <p className="text-xs text-foreground/50 mt-1">
                by {item.changedBy.name}
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

const ComplaintDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [complaint, setComplaint] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [commentModal, setCommentModal] = useState(false);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);

  // Fetch complaint
  useEffect(() => {
    const fetchComplaint = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await complaintsApi.getComplaint(id);
        // Handle both possible response structures
        const complaintData = response.data?.data || response.data;
        setComplaint(complaintData);
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to fetch complaint');
      } finally {
        setLoading(false);
      }
    };

    fetchComplaint();
  }, [id]);

  // Add comment
  const handleAddComment = async () => {
    if (!comment.trim()) return;

    setSubmitting(true);
    try {
      await complaintsApi.addComment(id, { comment });
      // Refresh complaint
      const response = await complaintsApi.getComplaint(id);
      const complaintData = response.data?.data || response.data;
      setComplaint(complaintData);
      setComment('');
      setCommentModal(false);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to add comment');
    } finally {
      setSubmitting(false);
    }
  };

  // Delete complaint
  const handleDelete = async () => {
    setSubmitting(true);
    try {
      await complaintsApi.deleteComplaint(id);
      navigate('/citizen/complaints');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete complaint');
    } finally {
      setSubmitting(false);
      setDeleteConfirm(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error || !complaint) {
    return (
      <div className="max-w-2xl mx-auto">
        <Alert variant="error">
          {error || 'Complaint not found'}
        </Alert>
        <Button
          variant="outline"
          onClick={() => navigate('/citizen/complaints')}
          className="mt-4"
        >
          Back to Complaints
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/citizen/complaints')}
          className="p-2 hover:bg-foreground/5 rounded-lg transition-colors"
        >
          <ArrowLeftIcon />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-foreground">{complaint.title}</h1>
          <p className="text-sm text-foreground/50 mt-1">
            Complaint ID: {complaint._id}
          </p>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="md:col-span-2 space-y-6">
          {/* Description */}
          <Card>
            <CardHeader>
              <CardTitle>Description</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-foreground/80 whitespace-pre-wrap">
                {complaint.description}
              </p>
            </CardContent>
          </Card>

          {/* Images */}
          {complaint.images && complaint.images.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Photos</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {complaint.images.map((image, index) => (
                    <div
                      key={index}
                      className="aspect-square rounded-lg overflow-hidden cursor-pointer hover:opacity-90 transition-opacity"
                      onClick={() => setSelectedImage(image)}
                    >
                      <img
                        src={image}
                        alt={`Complaint photo ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Status History */}
          <Card>
            <CardHeader>
              <CardTitle>Status History</CardTitle>
            </CardHeader>
            <CardContent>
              <StatusTimeline history={complaint.statusHistory} />
            </CardContent>
          </Card>

          {/* Comments */}
          {complaint.comments && complaint.comments.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Comments</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {complaint.comments.map((comment, index) => (
                    <div key={index} className="flex gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/15 text-primary font-semibold flex items-center justify-center text-sm shrink-0">
                        {comment.user?.name?.charAt(0).toUpperCase() || 'U'}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-foreground">
                            {comment.user?.name}
                          </span>
                          <span className="text-xs text-foreground/50">
                            {formatDate(comment.createdAt)}
                          </span>
                        </div>
                        <p className="text-sm text-foreground/70 mt-1">
                          {comment.text}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Status Card */}
          <Card>
            <CardHeader>
              <CardTitle>Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <Badge variant={getStatusVariant(complaint.status)} size="lg">
                  {complaint.status?.replace('_', ' ')}
                </Badge>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant={getSeverityVariant(complaint.severity?.priority || complaint.severity)}>
                  {complaint.severity?.priority || complaint.severity || 'medium'} severity
                </Badge>
              </div>
              {complaint.category && (
                <div className="flex items-center gap-3">
                  <Badge variant="outline">{complaint.category.name}</Badge>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Details Card */}
          <Card>
            <CardHeader>
              <CardTitle>Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-3">
                <CalendarIcon className="text-foreground/40 mt-0.5" />
                <div>
                  <p className="text-xs text-foreground/50">Submitted</p>
                  <p className="text-sm text-foreground">
                    {formatDate(complaint.createdAt)}
                  </p>
                </div>
              </div>

              {complaint.location && (
                <div className="flex items-start gap-3">
                  <LocationIcon className="text-foreground/40 mt-0.5" />
                  <div>
                    <p className="text-xs text-foreground/50">Location</p>
                    <p className="text-sm text-foreground">
                      {complaint.address || `${complaint.location.coordinates[1]}, ${complaint.location.coordinates[0]}`}
                    </p>
                  </div>
                </div>
              )}

              {complaint.assignedTo && (
                <div className="flex items-start gap-3">
                  <UserIcon className="text-foreground/40 mt-0.5" />
                  <div>
                    <p className="text-xs text-foreground/50">Assigned To</p>
                    <p className="text-sm text-foreground">
                      {complaint.assignedTo.name}
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                variant="outline"
                fullWidth
                onClick={() => setCommentModal(true)}
              >
                Add Comment
              </Button>
              {complaint.status === 'pending' && (
                <Button
                  variant="danger"
                  fullWidth
                  onClick={() => setDeleteConfirm(true)}
                >
                  Delete Complaint
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Comment Modal */}
      <Modal
        isOpen={commentModal}
        onClose={() => setCommentModal(false)}
        title="Add Comment"
      >
        <div className="space-y-4">
          <Textarea
            label="Your Comment"
            placeholder="Add a comment or update about this complaint..."
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={4}
          />
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setCommentModal(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleAddComment}
              loading={submitting}
              disabled={!comment.trim()}
            >
              Add Comment
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={deleteConfirm}
        onClose={() => setDeleteConfirm(false)}
        onConfirm={handleDelete}
        title="Delete Complaint"
        message="Are you sure you want to delete this complaint? This action cannot be undone."
        confirmText="Delete"
        variant="danger"
        loading={submitting}
      />

      {/* Image Modal */}
      <Modal
        isOpen={!!selectedImage}
        onClose={() => setSelectedImage(null)}
        size="lg"
        title="Photo"
      >
        {selectedImage && (
          <img
            src={selectedImage}
            alt="Complaint photo"
            className="w-full h-auto rounded-lg"
          />
        )}
      </Modal>
    </div>
  );
};

export default ComplaintDetailPage;
