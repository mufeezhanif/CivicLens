import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { complaintsApi, categoriesApi, hierarchyApi } from '../../services/api';
import { useAuth } from '../../contexts';

// Icons
const Icons = {
  Report: () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  Camera: () => (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
  X: () => (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  ),
  Feedback: () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
    </svg>
  ),
  Browse: () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
    </svg>
  ),
  Map: () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
    </svg>
  ),
  Clock: () => (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  Check: () => (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  ),
  AlertCircle: () => (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  TrendingUp: () => (
    <svg className="w-5 h-5 text-foreground/30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
    </svg>
  ),
  ArrowRight: () => (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
  ),
};

// Fallback data for when API is unavailable
const fallbackIssues = [
  {
    id: 'CL-1042',
    complaintId: 'CL-1042',
    title: 'Street light outage on Maple Ave',
    description: 'Street light outage on Maple Ave',
    status: 'acknowledged',
    category: { primary: 'Infrastructure' },
    createdAt: '2026-01-20T10:00:00.000Z',
  },
  {
    id: 'CL-1031',
    complaintId: 'CL-1031',
    title: 'Overflowing trash bins in Central Park',
    description: 'Overflowing trash bins in Central Park',
    status: 'resolved',
    category: { primary: 'Sanitation' },
    createdAt: '2026-01-18T10:00:00.000Z',
  },
  {
    id: 'CL-1016',
    complaintId: 'CL-1016',
    title: 'Pothole near 5th & Pine',
    description: 'Pothole near 5th & Pine',
    status: 'in_progress',
    category: { primary: 'Roads' },
    createdAt: '2026-01-14T10:00:00.000Z',
  },
];

// Format date helper
const formatDate = (dateString) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

// Map API status to display status
const getDisplayStatus = (status) => {
  const statusMap = {
    submitted: 'Submitted',
    reported: 'Submitted',
    acknowledged: 'In Review',
    in_progress: 'In Progress',
    resolved: 'Resolved',
    closed: 'Closed',
    citizen_feedback: 'Closed',
    rejected: 'Rejected',
  };
  return statusMap[status] || status;
};

const CitizenDashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activeOperation, setActiveOperation] = useState('report');
  const [issues, setIssues] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    resolved: 0,
    inProgress: 0,
    pending: 0,
  });
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reportForm, setReportForm] = useState({
    title: '',
    category: '',
    location: '',
    description: '',
  });
  const [reportImages, setReportImages] = useState([]);
  const [imagePreviewUrls, setImagePreviewUrls] = useState([]);
  const [detectedUC, setDetectedUC] = useState(null);
  const [locationCoords, setLocationCoords] = useState(null);
  const [detectingLocation, setDetectingLocation] = useState(false);
  const [feedbackForm, setFeedbackForm] = useState({
    issueId: '',
    satisfaction: 'satisfied',
    comments: '',
  });
  const [feedbackSuccess, setFeedbackSuccess] = useState(false);
  const [reportSuccess, setReportSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Fetch user's complaints and stats from API
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Fetch user's complaints
      const complaintsResponse = await complaintsApi.getMyComplaints({ limit: 10 });
      const complaintsData = complaintsResponse.data?.complaints || complaintsResponse.data || [];
      
      // Transform complaints to match expected format
      const transformedIssues = complaintsData.map(complaint => ({
        id: complaint._id || complaint.id,
        complaintId: complaint.complaintId || complaint._id,
        title: complaint.description?.substring(0, 50) + (complaint.description?.length > 50 ? '...' : '') || 'Untitled',
        description: complaint.description,
        status: complaint.status?.current || complaint.status || 'submitted',
        category: complaint.category,
        createdAt: complaint.createdAt,
      }));
      
      setIssues(transformedIssues.length > 0 ? transformedIssues : fallbackIssues);
      
      // Calculate stats from complaints
      const total = transformedIssues.length;
      const resolved = transformedIssues.filter(c => c.status === 'resolved' || c.status === 'closed' || c.status === 'citizen_feedback').length;
      const inProgress = transformedIssues.filter(c => c.status === 'in_progress' || c.status === 'acknowledged').length;
      const pending = transformedIssues.filter(c => c.status === 'submitted' || c.status === 'reported').length;
      
      setStats({
        total,
        resolved,
        inProgress,
        pending,
      });
      
      // Fetch categories
      try {
        const categoriesResponse = await categoriesApi.getCategories();
        setCategories(categoriesResponse.data?.categories || []);
      } catch (catErr) {
        console.warn('Failed to fetch categories:', catErr);
      }
    } catch (err) {
      console.error('Failed to fetch data:', err);
      setError('Failed to load data');
      // Use fallback data
      setIssues(fallbackIssues);
      setStats({ total: 3, resolved: 1, inProgress: 1, pending: 1 });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Detect current location and find UC automatically
  const detectLocationAndUC = useCallback(async () => {
    setDetectingLocation(true);
    setDetectedUC(null);
    
    try {
      if (!navigator.geolocation) {
        throw new Error('Geolocation not supported');
      }
      
      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, { 
          timeout: 10000,
          enableHighAccuracy: true,
        });
      });
      
      const { latitude, longitude } = position.coords;
      setLocationCoords({ latitude, longitude });
      
      // Reverse geocode for address (optional - can use a service)
      // For now, just set coordinates
      
      // Find UC by location
      try {
        const ucResponse = await hierarchyApi.findUCByLocation(longitude, latitude);
        if (ucResponse.success && ucResponse.data?.uc) {
          setDetectedUC({
            id: ucResponse.data.uc._id,
            name: ucResponse.data.uc.name,
            town: ucResponse.data.uc.town?.name,
            confidence: ucResponse.data.confidence,
            method: ucResponse.data.assignmentMethod,
          });
        }
      } catch (ucErr) {
        console.warn('UC detection failed:', ucErr);
      }
      
      return { latitude, longitude };
    } catch (err) {
      console.error('Location detection failed:', err);
      // Return default Karachi coordinates
      return { latitude: 24.8607, longitude: 67.0011 };
    } finally {
      setDetectingLocation(false);
    }
  }, []);

  const operations = useMemo(
    () => [
      { id: 'report', label: 'Report Issue', description: 'Submit a new civic issue', icon: Icons.Report },
      { id: 'feedback', label: 'Give Feedback', description: 'Rate resolved issues', icon: Icons.Feedback },
      { id: 'browse', label: 'Browse Issues', description: 'Track your reports', icon: Icons.Browse },
    ],
    []
  );

  const handleReportChange = (e) => setReportForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  const handleFeedbackChange = (e) => setFeedbackForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files);
    if (files.length + reportImages.length > 5) {
      alert('Maximum 5 images allowed');
      return;
    }
    const newImages = [...reportImages, ...files].slice(0, 5);
    setReportImages(newImages);
    const urls = newImages.map(file => URL.createObjectURL(file));
    setImagePreviewUrls(urls);
  };

  const removeImage = (index) => {
    const newImages = reportImages.filter((_, i) => i !== index);
    const newUrls = imagePreviewUrls.filter((_, i) => i !== index);
    setReportImages(newImages);
    setImagePreviewUrls(newUrls);
  };

  const handleSubmitReport = async (e) => {
    e.preventDefault();
    
    // Validate required fields
    if (!reportForm.title || reportForm.title.length < 5) {
      setError('Title must be at least 5 characters');
      return;
    }
    if (!reportForm.description || reportForm.description.length < 20) {
      setError('Description must be at least 20 characters');
      return;
    }
    if (!reportForm.category) {
      setError('Please select a category');
      return;
    }
    
    setSubmitting(true);
    setError(null);
    
    try {
      // Use already detected location or detect now
      let coords = locationCoords;
      if (!coords) {
        coords = await detectLocationAndUC();
      }
      
      const formData = new FormData();
      formData.append('description', `${reportForm.title}. ${reportForm.description}`);
      formData.append('phone', user?.phone || '');
      formData.append('latitude', coords.latitude);
      formData.append('longitude', coords.longitude);
      formData.append('address', reportForm.location);
      formData.append('source', 'web');
      
      // Include detected UC if available
      if (detectedUC?.id) {
        formData.append('ucId', detectedUC.id);
      }
      
      // Append images
      reportImages.forEach((img) => {
        formData.append('images', img);
      });
      
      await complaintsApi.createComplaint(formData);
      
      setReportForm({ title: '', category: '', location: '', description: '' });
      setReportImages([]);
      setImagePreviewUrls([]);
      setDetectedUC(null);
      setLocationCoords(null);
      setReportSuccess(true);
      
      // Refresh data
      await fetchData();
      
      setTimeout(() => setReportSuccess(false), 3000);
    } catch (err) {
      console.error('Failed to submit complaint:', err);
      setError(err.response?.data?.message || 'Failed to submit report. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitFeedback = (e) => {
    e.preventDefault();
    setFeedbackSuccess(true);
    setFeedbackForm({ issueId: '', satisfaction: 'satisfied', comments: '' });
    setTimeout(() => setFeedbackSuccess(false), 3000);
  };

  const resolvedIssues = issues.filter((issue) => issue.status === 'resolved' || issue.status === 'closed');

  // Quick stats computed from real data
  const quickStats = [
      { label: 'Total Reports', value: String(stats.total), change: 'All time', color: 'green' },
    { label: 'Resolved', value: String(stats.resolved), change: stats.total > 0 ? `${Math.round((stats.resolved / stats.total) * 100)}% success` : '0%', color: 'emerald' },
    { label: 'In Progress', value: String(stats.inProgress), change: 'Active', color: 'teal' },
    { label: 'Pending', value: String(stats.pending), change: 'Awaiting review', color: 'lime' },
  ];

  const getStatusStyles = (status) => {
    const statusLower = status?.toLowerCase() || '';
    switch (statusLower) {
      case 'resolved':
      case 'closed':
        return 'bg-emerald-50 text-emerald-700 border-emerald-300';
      case 'in_progress':
      case 'in progress':
        return 'bg-teal-50 text-teal-700 border-teal-300';
      case 'acknowledged':
      case 'in review':
        return 'bg-lime-50 text-lime-700 border-lime-300';
      case 'submitted':
      case 'reported':
        return 'bg-green-50 text-green-700 border-green-300';
      case 'rejected':
        return 'bg-red-50 text-red-700 border-red-300';
      default: 
        return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  const getPriorityDot = (priority) => {
    switch (priority) {
      case 'high': return 'bg-red-500';
      case 'medium': return 'bg-amber-500';
      default: return 'bg-gray-400';
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header Section */}
      <div className="mb-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-1 rounded-full bg-green-100 text-green-700 text-xs font-semibold">
                Citizen Portal
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">Your Civic Dashboard</h1>
            <p className="text-foreground/60 mt-1">Report issues, track progress, and make your community better</p>
          </div>
          <Link
            to="/map"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-linear-to-r from-green-600 to-emerald-600 text-white rounded-xl font-semibold text-sm hover:shadow-lg hover:shadow-green-500/25 transition-all"
          >
            <Icons.Map />
            View City Map
          </Link>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {quickStats.map((stat, index) => (
          <div key={index} className="bg-white rounded-2xl border border-foreground/10 p-4 hover:shadow-lg transition-all duration-300 group hover:border-green-200">
            <div className="flex items-start justify-between mb-3">
              <div className={`p-2 rounded-xl ${stat.color === 'green' ? 'bg-green-100 text-green-600' : stat.color === 'emerald' ? 'bg-emerald-100 text-emerald-600' : stat.color === 'teal' ? 'bg-teal-100 text-teal-600' : 'bg-lime-100 text-lime-600'}`}>
                {stat.color === 'green' ? <Icons.Report /> : stat.color === 'emerald' ? <Icons.Check /> : stat.color === 'teal' ? <Icons.Clock /> : <Icons.AlertCircle />}
              </div>
              <Icons.TrendingUp />
            </div>
            <p className="text-2xl font-bold text-foreground">{stat.value}</p>
            <p className="text-sm font-medium text-foreground/70">{stat.label}</p>
            <p className="text-xs text-foreground/50 mt-1">{stat.change}</p>
          </div>
        ))}
      </div>

      {/* Operation Tabs */}
      <div className="flex gap-3 mb-6 overflow-x-auto pb-2">
        {operations.map((op) => (
          <button
            key={op.id}
            onClick={() => setActiveOperation(op.id)}
            className={`flex items-center gap-3 px-5 py-3 rounded-xl border-2 transition-all duration-200 min-w-fit ${
              activeOperation === op.id
                ? 'bg-linear-to-r from-green-600 to-emerald-600 text-white border-green-600 shadow-lg shadow-green-500/25'
                : 'bg-white border-foreground/10 hover:border-green-300 hover:bg-green-50'
            }`}
          >
            <div className={`p-1.5 rounded-lg ${activeOperation === op.id ? 'bg-white/20' : 'bg-green-100'}`}>
              <op.icon />
            </div>
            <div className="text-left">
              <p className="text-sm font-semibold">{op.label}</p>
              <p className={`text-xs ${activeOperation === op.id ? 'text-white/70' : 'text-foreground/50'}`}>{op.description}</p>
            </div>
          </button>
        ))}
      </div>

      {/* Report Issue Section */}
      {activeOperation === 'report' && (
        <section className="bg-white rounded-2xl border border-foreground/10 overflow-hidden shadow-sm">
          <div className="bg-linear-to-r from-green-600 to-emerald-600 px-6 py-5">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-white/20 text-white"><Icons.Report /></div>
              <div>
                <h3 className="text-lg font-semibold text-white">Report a New Issue</h3>
                <p className="text-sm text-white/80">Describe the problem and we'll route it to the right department</p>
              </div>
            </div>
          </div>
          <form onSubmit={handleSubmitReport} className="p-6 space-y-5">
            <div className="grid md:grid-cols-2 gap-5">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-foreground">Issue Title <span className="text-red-500">*</span></label>
                <input type="text" name="title" value={reportForm.title} onChange={handleReportChange} placeholder="E.g., Broken traffic light (min 5 chars)" className="w-full rounded-xl border-2 border-foreground/10 bg-background px-4 py-3 text-sm focus:outline-none focus:border-green-500 focus:ring-4 focus:ring-green-500/10 transition-all" required minLength={5} maxLength={100} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-foreground">Category <span className="text-red-500">*</span></label>
                <select name="category" value={reportForm.category} onChange={handleReportChange} className="w-full rounded-xl border-2 border-foreground/10 bg-background px-4 py-3 text-sm focus:outline-none focus:border-green-500 focus:ring-4 focus:ring-green-500/10 transition-all" required>
                  <option value="">Select a category...</option>
                  {categories.length > 0 ? (
                    categories.map((cat) => (
                      <option key={cat._id || cat.name} value={cat.name}>{cat.name}</option>
                    ))
                  ) : (
                    <>
                      <option value="Roads">Roads</option>
                      <option value="Water">Water</option>
                      <option value="Garbage">Garbage</option>
                      <option value="Electricity">Electricity</option>
                      <option value="Others">Others</option>
                    </>
                  )}
                </select>
              </div>
            </div>
            
            {/* Location with Auto-Detection */}
            <div className="space-y-3">
              <label className="text-sm font-semibold text-foreground">Location</label>
              <div className="flex gap-3">
                <input type="text" name="location" value={reportForm.location} onChange={handleReportChange} placeholder="Street address or landmark" className="flex-1 rounded-xl border-2 border-foreground/10 bg-background px-4 py-3 text-sm focus:outline-none focus:border-green-500 focus:ring-4 focus:ring-green-500/10 transition-all" />
                <button 
                  type="button" 
                  onClick={detectLocationAndUC}
                  disabled={detectingLocation}
                  className="px-4 py-3 rounded-xl border-2 border-green-300 bg-green-50 text-green-700 font-medium text-sm hover:bg-green-100 disabled:opacity-50 transition-all flex items-center gap-2"
                >
                  {detectingLocation ? (
                    <div className="animate-spin w-4 h-4 border-2 border-green-600 border-t-transparent rounded-full"></div>
                  ) : (
                    <Icons.Map />
                  )}
                  {detectingLocation ? 'Detecting...' : 'Detect Location'}
                </button>
              </div>
              {/* UC Detection Info */}
              {detectedUC && (
                <div className="rounded-xl border-2 border-emerald-300 bg-emerald-50 px-4 py-3 flex items-center gap-3">
                  <div className="p-1.5 rounded-full bg-emerald-100 text-emerald-600"><Icons.Check /></div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      UC Detected: {detectedUC.name}
                      {detectedUC.town && <span className="font-normal text-foreground/60"> ({detectedUC.town})</span>}
                    </p>
                    <p className="text-xs text-foreground/50">
                      {detectedUC.method === 'geo_fence' ? 'Within UC boundary' : 'Nearest UC'} 
                      {detectedUC.confidence && ` • ${Math.round(detectedUC.confidence * 100)}% confidence`}
                    </p>
                  </div>
                </div>
              )}
              {locationCoords && !detectedUC && (
                <p className="text-xs text-foreground/50">
                  📍 Location: {locationCoords.latitude.toFixed(4)}, {locationCoords.longitude.toFixed(4)}
                </p>
              )}
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-semibold text-foreground">Description <span className="text-red-500">*</span></label>
              <textarea name="description" value={reportForm.description} onChange={handleReportChange} placeholder="Provide detailed information (min 20 chars)..." rows={4} className="w-full rounded-xl border-2 border-foreground/10 bg-background px-4 py-3 text-sm focus:outline-none focus:border-green-500 focus:ring-4 focus:ring-green-500/10 transition-all resize-none" required minLength={20} maxLength={1000} />
              <p className="text-xs text-foreground/40 text-right">{reportForm.description.length}/1000</p>
            </div>
            
            {/* Image Upload Section */}
            <div className="space-y-3">
              <label className="text-sm font-semibold text-foreground">Upload Evidence (Optional)</label>
              <div className="border-2 border-dashed border-green-200 rounded-xl p-6 text-center hover:border-green-400 transition-all bg-green-50/30">
                <input type="file" accept="image/*" multiple onChange={handleImageUpload} className="hidden" id="image-upload" />
                <label htmlFor="image-upload" className="cursor-pointer flex flex-col items-center gap-3">
                  <div className="p-3 rounded-full bg-green-100 text-green-600"><Icons.Camera /></div>
                  <div>
                    <p className="text-sm font-medium text-foreground">Click to upload images</p>
                    <p className="text-xs text-foreground/50 mt-1">PNG, JPG up to 5MB each (max 5 images)</p>
                  </div>
                </label>
              </div>
              {imagePreviewUrls.length > 0 && (
                <div className="flex flex-wrap gap-3 mt-3">
                  {imagePreviewUrls.map((url, index) => (
                    <div key={index} className="relative group">
                      <img src={url} alt={`Preview ${index + 1}`} className="w-20 h-20 object-cover rounded-lg border-2 border-foreground/10" />
                      <button type="button" onClick={() => removeImage(index)} className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-md"><Icons.X /></button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-2">
              <div className="flex items-center gap-2 text-xs text-foreground/50"><Icons.Clock /><span>Reports reviewed within 24 hours</span></div>
              <button 
                type="submit" 
                disabled={submitting}
                className="px-8 py-3 rounded-xl bg-linear-to-r from-green-600 to-emerald-600 text-white font-semibold text-sm hover:shadow-lg hover:shadow-green-500/25 disabled:opacity-50 transition-all flex items-center gap-2"
              >
                {submitting ? (
                  <>
                    <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
                    Submitting...
                  </>
                ) : (
                  <>Submit Report<Icons.ArrowRight /></>
                )}
              </button>
            </div>
          </form>
          {error && (
            <div className="mx-6 mb-6 rounded-xl border-2 border-red-300 bg-red-50 px-4 py-3 flex items-center gap-3">
              <div className="p-1.5 rounded-full bg-red-100 text-red-600"><Icons.AlertCircle /></div>
              <div><p className="text-sm font-semibold text-red-800">{error}</p></div>
            </div>
          )}
          {reportSuccess && (
            <div className="mx-6 mb-6 rounded-xl border-2 border-emerald-300 bg-emerald-50 px-4 py-3 flex items-center gap-3">
              <div className="p-1.5 rounded-full bg-emerald-100 text-emerald-600"><Icons.Check /></div>
              <div><p className="text-sm font-semibold text-foreground">Issue submitted successfully!</p><p className="text-xs text-foreground/60">Tracking ID created</p></div>
            </div>
          )}
        </section>
      )}

      {/* Feedback Section */}
      {activeOperation === 'feedback' && (
        <section className="bg-white rounded-2xl border border-foreground/10 overflow-hidden shadow-sm">
          <div className="bg-linear-to-r from-teal-600 to-emerald-600 px-6 py-5">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-white/20 text-white"><Icons.Feedback /></div>
              <div>
                <h3 className="text-lg font-semibold text-white">Resolution Feedback</h3>
                <p className="text-sm text-white/80">Help us improve by sharing your experience</p>
              </div>
            </div>
          </div>
          <form onSubmit={handleSubmitFeedback} className="p-6 space-y-5">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-foreground">Select Resolved Issue</label>
              <select name="issueId" value={feedbackForm.issueId} onChange={handleFeedbackChange} className="w-full rounded-xl border-2 border-foreground/10 bg-background px-4 py-3 text-sm focus:outline-none focus:border-green-500 focus:ring-4 focus:ring-green-500/10 transition-all" required>
                <option value="">Choose an issue to rate...</option>
                {resolvedIssues.map((issue) => (<option key={issue.id} value={issue.id}>{issue.complaintId || issue.id} — {issue.title}</option>))}
              </select>
            </div>
            <div className="space-y-3">
              <label className="text-sm font-semibold text-foreground">How satisfied are you?</label>
              <div className="flex flex-wrap justify-center gap-3">
                {[
                  { value: 'very_dissatisfied', emoji: '😠', label: 'Very Dissatisfied', color: 'border-red-300 bg-red-50' },
                  { value: 'dissatisfied', emoji: '😞', label: 'Dissatisfied', color: 'border-orange-300 bg-orange-50' },
                  { value: 'neutral', emoji: '😐', label: 'Neutral', color: 'border-gray-300 bg-gray-50' },
                  { value: 'satisfied', emoji: '😊', label: 'Satisfied', color: 'border-green-300 bg-green-50' },
                  { value: 'very_satisfied', emoji: '🤩', label: 'Very Satisfied', color: 'border-emerald-300 bg-emerald-50' }
                ].map((opt) => (
                  <label key={opt.value} className={`flex flex-col items-center gap-2 rounded-xl border-2 px-4 py-3 cursor-pointer transition-all min-w-[90px] ${feedbackForm.satisfaction === opt.value ? `${opt.color} border-green-500 ring-2 ring-green-500/20` : 'border-foreground/10 hover:border-foreground/20 hover:bg-foreground/[0.02]'}`}>
                    <input type="radio" name="satisfaction" value={opt.value} checked={feedbackForm.satisfaction === opt.value} onChange={handleFeedbackChange} className="sr-only" />
                    <span className="text-3xl">{opt.emoji}</span>
                    <span className="text-xs font-medium text-center">{opt.label}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-foreground">Additional Comments (Optional)</label>
              <textarea name="comments" value={feedbackForm.comments} onChange={handleFeedbackChange} rows={3} placeholder="Share any thoughts..." className="w-full rounded-xl border-2 border-foreground/10 bg-background px-4 py-3 text-sm focus:outline-none focus:border-green-500 focus:ring-4 focus:ring-green-500/10 transition-all resize-none" />
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-2">
              <p className="text-xs text-foreground/50">Your feedback helps us improve</p>
              <button type="submit" className="px-8 py-3 rounded-xl bg-linear-to-r from-teal-600 to-emerald-600 text-white font-semibold text-sm hover:shadow-lg hover:shadow-teal-500/25 transition-all flex items-center gap-2">Submit Feedback<Icons.ArrowRight /></button>
            </div>
          </form>
          {feedbackSuccess && (
            <div className="mx-6 mb-6 rounded-xl border-2 border-emerald-300 bg-emerald-50 px-4 py-3 flex items-center gap-3">
              <div className="p-1.5 rounded-full bg-emerald-100 text-emerald-600"><Icons.Check /></div>
              <div><p className="text-sm font-semibold text-foreground">Thank you for your feedback!</p></div>
            </div>
          )}
        </section>
      )}

      {/* Browse Issues Section */}
      {activeOperation === 'browse' && (
        <section className="bg-white rounded-2xl border border-foreground/10 overflow-hidden shadow-sm">
          <div className="bg-linear-to-r from-green-600 to-emerald-600 px-6 py-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-white/20 text-white"><Icons.Browse /></div>
                <div>
                  <h3 className="text-lg font-semibold text-white">Your Reported Issues</h3>
                  <p className="text-sm text-white/80">Track the status of all your civic reports</p>
                </div>
              </div>
              <div className="px-4 py-1.5 rounded-full bg-white/20 text-sm font-semibold text-white">{issues.length} reports</div>
            </div>
          </div>
          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin w-8 h-8 border-2 border-green-600 border-t-transparent rounded-full mx-auto mb-2"></div>
              <p className="text-sm text-foreground/60">Loading your complaints...</p>
            </div>
          ) : issues.length === 0 ? (
            <div className="p-12 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-100 flex items-center justify-center">
                <Icons.Report />
              </div>
              <p className="text-lg font-semibold text-foreground mb-2">No complaints yet</p>
              <p className="text-foreground/60 mb-6">You haven't submitted any complaints yet.</p>
              <button
                onClick={() => setActiveOperation('report')}
                className="px-6 py-2.5 rounded-xl bg-linear-to-r from-green-600 to-emerald-600 text-white font-medium text-sm hover:shadow-lg hover:shadow-green-500/25 transition-all"
              >
                Report Your First Issue
              </button>
            </div>
          ) : (
            <div className="p-5">
              <div className="grid gap-4">
                {issues.map((issue, index) => (
                  <div 
                    key={issue.id} 
                    className="group relative rounded-xl border-2 border-foreground/5 bg-linear-to-br from-white to-gray-50 p-5 hover:border-green-200 hover:shadow-lg transition-all duration-300 cursor-pointer overflow-hidden"
                    onClick={() => navigate(`/citizen/complaints/${issue.id}`)}
                  >
                    {/* Decorative accent */}
                    <div className={`absolute top-0 left-0 w-1 h-full ${
                      issue.status === 'resolved' || issue.status === 'closed' ? 'bg-emerald-500' :
                      issue.status === 'in_progress' ? 'bg-teal-500' :
                      issue.status === 'acknowledged' ? 'bg-lime-500' :
                      'bg-green-400'
                    }`}></div>
                    
                    <div className="flex flex-col lg:flex-row lg:items-center gap-4 pl-3">
                      {/* Category Icon */}
                      <div className={`hidden lg:flex w-12 h-12 rounded-xl items-center justify-center shrink-0 ${
                        issue.category?.primary === 'Roads' ? 'bg-orange-100 text-orange-600' :
                        issue.category?.primary === 'Water' ? 'bg-blue-100 text-blue-600' :
                        issue.category?.primary === 'Garbage' ? 'bg-amber-100 text-amber-600' :
                        issue.category?.primary === 'Electricity' ? 'bg-yellow-100 text-yellow-600' :
                        'bg-green-100 text-green-600'
                      }`}>
                        {issue.category?.primary === 'Roads' ? '🛣️' :
                         issue.category?.primary === 'Water' ? '💧' :
                         issue.category?.primary === 'Garbage' ? '🗑️' :
                         issue.category?.primary === 'Electricity' ? '⚡' :
                         '📋'}
                      </div>
                      
                      {/* Main Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-md bg-green-100 text-green-800 text-xs font-mono font-medium">
                            {issue.complaintId || `#${index + 1}`}
                          </span>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium border ${getStatusStyles(issue.status)}`}>
                            {getDisplayStatus(issue.status)}
                          </span>
                          <span className="text-xs text-foreground/40 hidden sm:inline">•</span>
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-foreground/60 bg-gray-100 px-2.5 py-0.5 rounded-md">
                            {issue.category?.primary || 'General'}
                          </span>
                        </div>
                        
                        <h4 className="text-base font-semibold text-foreground group-hover:text-green-700 transition-colors line-clamp-2 mb-2">
                          {issue.title || issue.description?.substring(0, 60) || 'Untitled Complaint'}
                        </h4>
                        
                        <div className="flex flex-wrap items-center gap-3 text-xs text-foreground/50">
                          <span className="flex items-center gap-1">
                            <Icons.Clock />
                            {formatDate(issue.createdAt)}
                          </span>
                          {issue.severity?.priority && (
                            <span className={`flex items-center gap-1 px-2 py-0.5 rounded ${
                              issue.severity.priority === 'high' ? 'bg-red-100 text-red-700' :
                              issue.severity.priority === 'medium' ? 'bg-amber-100 text-amber-700' :
                              'bg-gray-100 text-gray-600'
                            }`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${
                                issue.severity.priority === 'high' ? 'bg-red-500' :
                                issue.severity.priority === 'medium' ? 'bg-amber-500' :
                                'bg-gray-400'
                              }`}></span>
                              {issue.severity.priority.charAt(0).toUpperCase() + issue.severity.priority.slice(1)}
                            </span>
                          )}
                        </div>
                      </div>
                      
                      {/* Action Button */}
                      <div className="flex items-center gap-2">
                        <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-green-50 text-green-700 font-medium text-sm hover:bg-green-100 transition-colors">
                          View Details
                          <Icons.ArrowRight />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div className="px-6 py-4 border-t border-foreground/10 bg-linear-to-r from-green-50 to-emerald-50">
            <Link to="/citizen/complaints" className="text-sm font-semibold text-green-700 hover:text-green-800 flex items-center gap-1 transition-colors">
              View all complaints
              <Icons.ArrowRight />
            </Link>
          </div>
        </section>
      )}
    </div>
  );
};

export default CitizenDashboard;
