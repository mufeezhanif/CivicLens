import React, { useMemo, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts';
import { complaintsApi, analyticsApi, invitationApi, hierarchyApi } from '../../services/api';
import { toast } from 'react-hot-toast';

// Icons
const Icons = {
  Browse: () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
    </svg>
  ),
  UserPlus: () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
    </svg>
  ),
  Building: () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
    </svg>
  ),
  Feedback: () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
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
  Globe: () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
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
  Star: () => (
    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
    </svg>
  ),
  Crown: () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3l3.057 5.5L12 3l3.943 5.5L19 3v14a2 2 0 01-2 2H7a2 2 0 01-2-2V3z" />
    </svg>
  ),
};

const MayorDashboard = () => {
  const { user } = useAuth();
  const [activeOperation, setActiveOperation] = useState('browse');
  const [issues, setIssues] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [towns, setTowns] = useState([]);
  const [ucs, setUCs] = useState([]);
  
  const [townshipForm, setTownshipForm] = useState({ email: '', townId: '' });
  const [chairmanForm, setChairmanForm] = useState({ email: '', ucId: '' });
  const [townshipSuccess, setTownshipSuccess] = useState(false);
  const [chairmanSuccess, setChairmanSuccess] = useState(false);

  // Fetch city-wide data
  useEffect(() => {
    const fetchData = async () => {
      if (!user?.city) {
        toast.error('No city assigned to your account');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        
        // Fetch complaints for the city
        const complaintsRes = await complaintsApi.getAll({ cityId: user.city });
        setIssues(complaintsRes.data || []);

        // Fetch city analytics
        const analyticsRes = await analyticsApi.getCityAnalytics(user.city, 30);
        setAnalytics(analyticsRes.data);

        // Fetch towns in the city
        const townsRes = await hierarchyApi.getTownsByCity(user.city);
        setTowns(townsRes.data || []);

      } catch (error) {
        console.error('Failed to fetch mayor dashboard data:', error);
        toast.error('Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  // Fetch UCs when a town is selected for UC chairman invitation
  useEffect(() => {
    const fetchUCs = async () => {
      if (chairmanForm.townId) {
        try {
          const ucsRes = await hierarchyApi.getUCsByTown(chairmanForm.townId);
          setUCs(ucsRes.data || []);
        } catch (error) {
          console.error('Failed to fetch UCs:', error);
          toast.error('Failed to load UCs');
        }
      }
    };

    fetchUCs();
  }, [chairmanForm.townId]);

  const operations = useMemo(() => [
    { id: 'browse', label: 'Browse Issues', description: 'Citywide reports overview', icon: Icons.Browse },
    { id: 'register-township', label: 'Register Township', description: 'Onboard township heads', icon: Icons.Building },
    { id: 'register-uc', label: 'Register UC Chairman', description: 'Union council leadership', icon: Icons.UserPlus },
    { id: 'feedback', label: 'Citizen Feedback', description: 'Monitor satisfaction', icon: Icons.Feedback },
  ], []);

  const handleTownshipChange = (e) => setTownshipForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  const handleChairmanChange = (e) => setChairmanForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleTownshipSubmit = async (e) => {
    e.preventDefault();
    try {
      await invitationApi.createInvitation({
        email: townshipForm.email,
        role: 'town_chairman',
        targetEntityId: townshipForm.townId,
      });
      
      setTownshipSuccess(true);
      setTownshipForm({ email: '', townId: '' });
      toast.success('Township head invitation sent!');
      setTimeout(() => setTownshipSuccess(false), 3000);
    } catch (error) {
      console.error('Failed to send township invitation:', error);
      toast.error(error.response?.data?.message || 'Failed to send invitation');
    }
  };

  const handleChairmanSubmit = async (e) => {
    e.preventDefault();
    try {
      await invitationApi.createInvitation({
        email: chairmanForm.email,
        role: 'uc_chairman',
        targetEntityId: chairmanForm.ucId,
      });
      
      setChairmanSuccess(true);
      setChairmanForm({ email: '', ucId: '', townId: '' });
      toast.success('UC chairman invitation sent!');
      setTimeout(() => setChairmanSuccess(false), 3000);
    } catch (error) {
      console.error('Failed to send UC chairman invitation:', error);
      toast.error(error.response?.data?.message || 'Failed to send invitation');
    }
  };

  const getStatusStyles = (status) => {
    const statusLower = (status || '').toLowerCase();
    switch (statusLower) {
      case 'resolved':
      case 'closed':
      case 'citizen_feedback':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'in_progress':
      case 'in progress':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'acknowledged':
      case 'in review':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'submitted':
        return 'bg-gray-50 text-gray-700 border-gray-200';
      case 'rejected':
        return 'bg-red-50 text-red-700 border-red-200';
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

  const getRatingStyles = (rating) => {
    switch (rating.toLowerCase()) {
      case 'satisfied': return { bg: 'bg-emerald-50', text: 'text-emerald-700', emoji: '😊' };
      case 'neutral': return { bg: 'bg-amber-50', text: 'text-amber-700', emoji: '😐' };
      default: return { bg: 'bg-red-50', text: 'text-red-700', emoji: '😞' };
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/official/login');
  };

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-1 rounded-full bg-linear-to-r from-amber-100 to-amber-50 text-amber-700 text-xs font-semibold flex items-center gap-1.5"><Icons.Crown />Mayor</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">City Operations Center</h1>
            <p className="text-foreground/60 mt-1">Citywide oversight, leadership management, and citizen satisfaction</p>
          </div>
          <Link to="/map" className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-white rounded-xl font-semibold text-sm hover:bg-primary/90 transition-all shadow-sm hover:shadow-md">
            <Icons.Map />City Map
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      ) : (
        <>
          {/* Quick Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-white rounded-2xl border border-foreground/10 p-4 hover:shadow-lg transition-all duration-300">
              <div className="flex items-start justify-between mb-3">
                <div className="p-2 rounded-xl bg-primary/10 text-primary">
                  <Icons.Globe />
                </div>
                <Icons.TrendingUp />
              </div>
              <p className="text-2xl font-bold text-foreground">{analytics?.summary?.totalComplaints || 0}</p>
              <p className="text-sm font-medium text-foreground/70">Citywide Issues</p>
              <p className="text-xs text-foreground/50 mt-1">Last 30 days</p>
            </div>

            <div className="bg-white rounded-2xl border border-foreground/10 p-4 hover:shadow-lg transition-all duration-300">
              <div className="flex items-start justify-between mb-3">
                <div className="p-2 rounded-xl bg-secondary/10 text-secondary">
                  <Icons.Check />
                </div>
                <Icons.TrendingUp />
              </div>
              <p className="text-2xl font-bold text-foreground">{analytics?.summary?.resolvedCount || 0}</p>
              <p className="text-sm font-medium text-foreground/70">Resolved</p>
              <p className="text-xs text-foreground/50 mt-1">Last 30 days</p>
            </div>

            <div className="bg-white rounded-2xl border border-foreground/10 p-4 hover:shadow-lg transition-all duration-300">
              <div className="flex items-start justify-between mb-3">
                <div className="p-2 rounded-xl bg-purple-100 text-purple-600">
                  <Icons.Building />
                </div>
                <Icons.TrendingUp />
              </div>
              <p className="text-2xl font-bold text-foreground">{towns.length || 0}</p>
              <p className="text-sm font-medium text-foreground/70">Townships</p>
              <p className="text-xs text-foreground/50 mt-1">All reporting</p>
            </div>

            <div className="bg-white rounded-2xl border border-foreground/10 p-4 hover:shadow-lg transition-all duration-300">
              <div className="flex items-start justify-between mb-3">
                <div className="p-2 rounded-xl bg-amber-100 text-amber-600">
                  <Icons.Star />
                </div>
                <Icons.TrendingUp />
              </div>
              <p className="text-2xl font-bold text-foreground">{analytics?.summary?.avgCitizenRating || 'N/A'}</p>
              <p className="text-sm font-medium text-foreground/70">Satisfaction</p>
              <p className="text-xs text-foreground/50 mt-1">Average rating</p>
            </div>
          </div>

      {/* Operation Tabs */}
      <div className="flex gap-3 mb-6 overflow-x-auto pb-2">
        {operations.map((op) => (
          <button key={op.id} onClick={() => setActiveOperation(op.id)} className={`flex items-center gap-3 px-5 py-3 rounded-xl border-2 transition-all duration-200 min-w-fit ${activeOperation === op.id ? 'bg-primary text-white border-primary shadow-lg shadow-primary/25' : 'bg-white border-foreground/10 hover:border-primary/30 hover:bg-primary/5'}`}>
            <div className={`p-1.5 rounded-lg ${activeOperation === op.id ? 'bg-white/20' : 'bg-primary/10'}`}><op.icon /></div>
            <div className="text-left">
              <p className="text-sm font-semibold">{op.label}</p>
              <p className={`text-xs ${activeOperation === op.id ? 'text-white/70' : 'text-foreground/50'}`}>{op.description}</p>
            </div>
          </button>
        ))}
      </div>

          {/* Browse Issues */}
          {activeOperation === 'browse' && (
            <section className="bg-white rounded-2xl border border-foreground/10 overflow-hidden shadow-sm">
              <div className="bg-linear-to-r from-primary/5 to-secondary/5 px-6 py-5 border-b border-foreground/10">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-primary/10 text-primary"><Icons.Browse /></div>
                    <div>
                      <h3 className="text-lg font-semibold text-foreground">Citywide Issues</h3>
                      <p className="text-sm text-foreground/60">Review and prioritize response teams across all townships</p>
                    </div>
                  </div>
                  <div className="px-3 py-1.5 rounded-full bg-foreground/5 text-sm font-medium text-foreground/70">{issues.length} total</div>
                </div>
              </div>
              <div className="p-4 space-y-3">
                {issues.length === 0 ? (
                  <p className="text-center text-foreground/60 py-8">No complaints found</p>
                ) : (
                  issues.slice(0, 10).map((issue) => (
                    <div key={issue._id} className="rounded-xl border border-foreground/10 bg-linear-to-r from-background to-white p-4 hover:shadow-md transition-all duration-200 group">
                      <div className="flex flex-col md:flex-row md:items-center gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className="text-xs font-mono text-foreground/50">{issue._id?.substring(0, 8) || 'N/A'}</span>
                            <span className="text-xs text-foreground/40">•</span>
                            <span className="text-xs text-foreground/50">{issue.category?.primary || 'Uncategorized'}</span>
                            {issue.townName && (
                              <>
                                <span className="text-xs text-foreground/40">•</span>
                                <span className="text-xs px-2 py-0.5 rounded bg-purple-50 text-purple-600 font-medium">{issue.townName}</span>
                              </>
                            )}
                          </div>
                          <p className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">{issue.description?.substring(0, 100) || 'No description'}</p>
                          <p className="text-xs text-foreground/50 mt-1 flex items-center gap-1">
                            <Icons.Clock />
                            Reported {new Date(issue.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className={`text-xs font-semibold px-3 py-1.5 rounded-full border ${getStatusStyles(issue.status?.current || 'submitted')}`}>
                            {issue.status?.current || 'Submitted'}
                          </span>
                          <button className="p-2 rounded-lg hover:bg-foreground/5 text-foreground/40 hover:text-primary transition-colors"><Icons.ArrowRight /></button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>
          )}

          {/* Register Township Head */}
          {activeOperation === 'register-township' && (
            <section className="bg-white rounded-2xl border border-foreground/10 overflow-hidden shadow-sm">
              <div className="bg-linear-to-r from-purple-50 to-primary/5 px-6 py-5 border-b border-foreground/10">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-purple-100 text-purple-600"><Icons.Building /></div>
                  <div>
                    <h3 className="text-lg font-semibold text-foreground">Invite Township Head</h3>
                    <p className="text-sm text-foreground/60">Send invitation to town chairman via email</p>
                  </div>
                </div>
              </div>
              <form onSubmit={handleTownshipSubmit} className="p-6 space-y-5">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-foreground">Township *</label>
                  <select 
                    name="townId" 
                    value={townshipForm.townId} 
                    onChange={handleTownshipChange} 
                    className="w-full rounded-xl border-2 border-foreground/10 bg-background px-4 py-3 text-sm focus:outline-none focus:border-primary/50 focus:ring-4 focus:ring-primary/10 transition-all" 
                    required
                  >
                    <option value="">Select township...</option>
                    {towns.map((town) => (
                      <option key={town._id} value={town._id}>{town.name}</option>
                    ))}
                  </select>
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-foreground">Official Email *</label>
                  <input 
                    type="email" 
                    name="email" 
                    value={townshipForm.email} 
                    onChange={handleTownshipChange} 
                    placeholder="head@township.gov" 
                    className="w-full rounded-xl border-2 border-foreground/10 bg-background px-4 py-3 text-sm focus:outline-none focus:border-primary/50 focus:ring-4 focus:ring-primary/10 transition-all" 
                    required 
                  />
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-2">
                  <p className="text-xs text-foreground/50">Township head will receive invitation and registration link via email</p>
                  <button type="submit" className="px-8 py-3 rounded-xl bg-primary text-white font-semibold text-sm hover:bg-primary/90 transition-all shadow-sm hover:shadow-lg hover:shadow-primary/25 flex items-center gap-2">
                    Send Invitation<Icons.ArrowRight />
                  </button>
                </div>
              </form>
              {townshipSuccess && (
                <div className="mx-6 mb-6 rounded-xl border-2 border-secondary/30 bg-secondary/10 px-4 py-3 flex items-center gap-3">
                  <div className="p-1.5 rounded-full bg-secondary/20 text-secondary"><Icons.Check /></div>
                  <div><p className="text-sm font-semibold text-foreground">Township head invited!</p><p className="text-xs text-foreground/60">Invitation email sent</p></div>
                </div>
              )}
            </section>
          )}

          {/* Register UC Chairman */}
          {activeOperation === 'register-uc' && (
            <section className="bg-white rounded-2xl border border-foreground/10 overflow-hidden shadow-sm">
              <div className="bg-linear-to-r from-blue-50 to-primary/5 px-6 py-5 border-b border-foreground/10">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-blue-100 text-blue-600"><Icons.UserPlus /></div>
                  <div>
                    <h3 className="text-lg font-semibold text-foreground">Invite UC Chairman</h3>
                    <p className="text-sm text-foreground/60">Send invitation to union council chairman via email</p>
                  </div>
                </div>
              </div>
              <form onSubmit={handleChairmanSubmit} className="p-6 space-y-5">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-foreground">Town *</label>
                  <select 
                    name="townId" 
                    value={chairmanForm.townId} 
                    onChange={handleChairmanChange} 
                    className="w-full rounded-xl border-2 border-foreground/10 bg-background px-4 py-3 text-sm focus:outline-none focus:border-primary/50 focus:ring-4 focus:ring-primary/10 transition-all" 
                    required
                  >
                    <option value="">Select town first...</option>
                    {towns.map((town) => (
                      <option key={town._id} value={town._id}>{town.name}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-foreground">Union Council *</label>
                  <select 
                    name="ucId" 
                    value={chairmanForm.ucId} 
                    onChange={handleChairmanChange} 
                    className="w-full rounded-xl border-2 border-foreground/10 bg-background px-4 py-3 text-sm focus:outline-none focus:border-primary/50 focus:ring-4 focus:ring-primary/10 transition-all" 
                    required
                    disabled={!chairmanForm.townId}
                  >
                    <option value="">Select UC...</option>
                    {ucs.map((uc) => (
                      <option key={uc._id} value={uc._id}>{uc.name}</option>
                    ))}
                  </select>
                  {!chairmanForm.townId && (
                    <p className="text-xs text-foreground/50">Select a town first to load UCs</p>
                  )}
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-foreground">Official Email *</label>
                  <input 
                    type="email" 
                    name="email" 
                    value={chairmanForm.email} 
                    onChange={handleChairmanChange} 
                    placeholder="chairman@uc.gov" 
                    className="w-full rounded-xl border-2 border-foreground/10 bg-background px-4 py-3 text-sm focus:outline-none focus:border-primary/50 focus:ring-4 focus:ring-primary/10 transition-all" 
                    required 
                  />
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-2">
                  <p className="text-xs text-foreground/50">Chairman will receive invitation and registration link via email</p>
                  <button type="submit" className="px-8 py-3 rounded-xl bg-primary text-white font-semibold text-sm hover:bg-primary/90 transition-all shadow-sm hover:shadow-lg hover:shadow-primary/25 flex items-center gap-2">
                    Send Invitation<Icons.ArrowRight />
                  </button>
                </div>
              </form>
              {chairmanSuccess && (
                <div className="mx-6 mb-6 rounded-xl border-2 border-secondary/30 bg-secondary/10 px-4 py-3 flex items-center gap-3">
                  <div className="p-1.5 rounded-full bg-secondary/20 text-secondary"><Icons.Check /></div>
                  <div><p className="text-sm font-semibold text-foreground">UC chairman invited!</p><p className="text-xs text-foreground/60">Invitation email sent</p></div>
                </div>
              )}
            </section>
          )}

          {/* Citizen Feedback */}
          {activeOperation === 'feedback' && (
            <section className="bg-white rounded-2xl border border-foreground/10 overflow-hidden shadow-sm">
              <div className="bg-linear-to-r from-secondary/5 to-primary/5 px-6 py-5 border-b border-foreground/10">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-secondary/10 text-secondary"><Icons.Feedback /></div>
                    <div>
                      <h3 className="text-lg font-semibold text-foreground">Citizen Feedback</h3>
                      <p className="text-sm text-foreground/60">Citywide satisfaction monitoring - Coming soon</p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="p-8 text-center">
                <p className="text-foreground/60">Feedback monitoring feature will be available soon</p>
                <p className="text-sm text-foreground/50 mt-2">Average citizen rating: {analytics?.summary?.avgCitizenRating || 'N/A'}</p>
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
};

export default MayorDashboard;
