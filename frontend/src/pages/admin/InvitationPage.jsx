/**
 * InvitationPage Component
 * Allows admins, mayors, and town chairmen to invite officials
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { useAuth } from '../../contexts';
import { invitationApi, hierarchyApi } from '../../services/api';

// Icons
const Icons = {
  Mail: () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  ),
  User: () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  ),
  Building: () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
    </svg>
  ),
  Check: () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  ),
  Copy: () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
    </svg>
  ),
  ArrowLeft: () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
    </svg>
  ),
  Trash: () => (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  ),
  Refresh: () => (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
    </svg>
  ),
};

const ROLE_CONFIG = {
  mayor: {
    title: 'Invite Mayor',
    description: 'Send an invitation to appoint a new Mayor for a city.',
    role: 'mayor',
    entityLabel: 'City',
    entityPlaceholder: 'Select a city',
    apiEntityType: 'city',
    successMessage: 'Mayor invitation sent successfully!',
    icon: '🏛️',
  },
  'town-chairman': {
    title: 'Invite Town Chairman',
    description: 'Send an invitation to appoint a new Town Chairman.',
    role: 'town_chairman',
    entityLabel: 'Town',
    entityPlaceholder: 'Select a town',
    apiEntityType: 'town',
    successMessage: 'Town Chairman invitation sent successfully!',
    icon: '🏙️',
  },
  'uc-chairman': {
    title: 'Invite UC Chairman',
    description: 'Send an invitation to appoint a new UC (Union Council) Chairman.',
    role: 'uc_chairman',
    entityLabel: 'Union Council',
    entityPlaceholder: 'Select a UC',
    apiEntityType: 'uc',
    successMessage: 'UC Chairman invitation sent successfully!',
    icon: '📍',
  },
};

const InvitationPage = () => {
  const { type } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [email, setEmail] = useState('');
  const [selectedEntity, setSelectedEntity] = useState('');
  const [entities, setEntities] = useState([]);
  const [pendingInvitations, setPendingInvitations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingEntities, setLoadingEntities] = useState(true);
  const [generatedLink, setGeneratedLink] = useState(null);
  const [copied, setCopied] = useState(false);

  const config = ROLE_CONFIG[type] || ROLE_CONFIG.mayor;

  // Fetch entities based on type
  useEffect(() => {
    const fetchEntities = async () => {
      setLoadingEntities(true);
      try {
        let response;
        switch (config.apiEntityType) {
          case 'city':
            response = await hierarchyApi.getCities();
            break;
          case 'town':
            response = await hierarchyApi.getTowns();
            break;
          case 'uc':
            response = await hierarchyApi.getUCs();
            break;
          default:
            response = { data: [] };
        }
        setEntities(response.data || []);
      } catch (error) {
        console.error('Error fetching entities:', error);
        toast.error('Failed to load entities');
      } finally {
        setLoadingEntities(false);
      }
    };

    fetchEntities();
  }, [config.apiEntityType]);

  // Fetch pending invitations
  useEffect(() => {
    const fetchPendingInvitations = async () => {
      try {
        const response = await invitationApi.getPendingInvitations();
        const filtered = (response.data || []).filter(inv => inv.role === config.role);
        setPendingInvitations(filtered);
      } catch (error) {
        console.error('Error fetching invitations:', error);
      }
    };

    fetchPendingInvitations();
  }, [config.role]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!email || !selectedEntity) {
      toast.error('Please fill in all fields');
      return;
    }

    setLoading(true);
    try {
      const response = await invitationApi.createInvitation({
        email,
        role: config.role,
        targetEntityId: selectedEntity,
      });

      if (response.data?.registrationLink) {
        setGeneratedLink(response.data.registrationLink);
      }

      toast.success(config.successMessage);
      
      // Refresh pending invitations
      const invitationsResponse = await invitationApi.getPendingInvitations();
      const filtered = (invitationsResponse.data || []).filter(inv => inv.role === config.role);
      setPendingInvitations(filtered);

      // Clear form
      setEmail('');
      setSelectedEntity('');
    } catch (error) {
      console.error('Error creating invitation:', error);
      toast.error(error.response?.data?.message || 'Failed to create invitation');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyLink = async () => {
    if (generatedLink) {
      await navigator.clipboard.writeText(generatedLink);
      setCopied(true);
      toast.success('Link copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleRevokeInvitation = async (id) => {
    if (!confirm('Are you sure you want to revoke this invitation?')) return;
    
    try {
      await invitationApi.revokeInvitation(id);
      toast.success('Invitation revoked');
      setPendingInvitations(prev => prev.filter(inv => inv.id !== id));
    } catch {
      toast.error('Failed to revoke invitation');
    }
  };

  const handleResendInvitation = async (id) => {
    try {
      await invitationApi.resendInvitation(id);
      toast.success('Invitation resent');
    } catch {
      toast.error('Failed to resend invitation');
    }
  };

  const getBackLink = () => {
    if (user?.role === 'website_admin' || user?.role === 'admin') {
      return '/admin/dashboard';
    } else if (user?.role === 'mayor') {
      return '/mayor/dashboard';
    } else {
      return '/official/dashboard';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Back Button */}
        <button
          onClick={() => navigate(getBackLink())}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6 transition-colors"
        >
          <Icons.ArrowLeft />
          <span>Back to Dashboard</span>
        </button>

        {/* Header */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-primary/10 rounded-xl flex items-center justify-center text-2xl">
              {config.icon}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{config.title}</h1>
              <p className="text-gray-500 mt-1">{config.description}</p>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Invitation Form */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Icons.Mail />
              Send Invitation
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Email Input */}
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1.5">
                  Email Address
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                    <Icons.Mail />
                  </span>
                  <input
                    type="email"
                    id="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="official@example.com"
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                    required
                  />
                </div>
              </div>

              {/* Entity Selection */}
              <div>
                <label htmlFor="entity" className="block text-sm font-medium text-gray-700 mb-1.5">
                  {config.entityLabel}
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                    <Icons.Building />
                  </span>
                  <select
                    id="entity"
                    value={selectedEntity}
                    onChange={(e) => setSelectedEntity(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white transition-all appearance-none"
                    required
                    disabled={loadingEntities}
                  >
                    <option value="">{loadingEntities ? 'Loading...' : config.entityPlaceholder}</option>
                    {entities.map((entity) => (
                      <option key={entity._id || entity.id} value={entity._id || entity.id}>
                        {entity.name} {entity.code ? `(${entity.code})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading || !email || !selectedEntity}
                className="w-full py-3 px-4 bg-primary text-white font-medium rounded-xl hover:bg-primary/90 disabled:bg-gray-300 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Icons.Mail />
                    Send Invitation
                  </>
                )}
              </button>
            </form>

            {/* Generated Link */}
            {generatedLink && (
              <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-xl">
                <div className="flex items-center gap-2 text-green-700 font-medium mb-2">
                  <Icons.Check />
                  Invitation Created!
                </div>
                <p className="text-sm text-green-600 mb-3">
                  Share this link with the invitee or they will receive an email.
                </p>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={generatedLink}
                    readOnly
                    className="flex-1 px-3 py-2 bg-white border border-green-200 rounded-lg text-sm font-mono text-gray-600"
                  />
                  <button
                    onClick={handleCopyLink}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
                  >
                    {copied ? <Icons.Check /> : <Icons.Copy />}
                    {copied ? 'Copied!' : 'Copy'}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Pending Invitations */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Icons.User />
              Pending Invitations ({pendingInvitations.length})
            </h2>

            {pendingInvitations.length === 0 ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center text-2xl">
                  {config.icon}
                </div>
                <p className="text-gray-500">No pending invitations</p>
                <p className="text-sm text-gray-400 mt-1">
                  Send an invitation to get started
                </p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[400px] overflow-y-auto">
                {pendingInvitations.map((invitation) => (
                  <div
                    key={invitation.id}
                    className="p-4 bg-gray-50 rounded-xl border border-gray-100 hover:border-primary/30 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium text-gray-900">{invitation.email}</p>
                        <p className="text-sm text-gray-500 mt-0.5">
                          {invitation.targetEntity?.name || 'Entity'}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                          Expires: {invitation.expiresIn || '24h'}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleResendInvitation(invitation.id)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Resend"
                        >
                          <Icons.Refresh />
                        </button>
                        <button
                          onClick={() => handleRevokeInvitation(invitation.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Revoke"
                        >
                          <Icons.Trash />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Help Card */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-2xl p-6">
          <h3 className="font-semibold text-blue-900 mb-2">How Invitations Work</h3>
          <ul className="space-y-2 text-sm text-blue-700">
            <li className="flex items-start gap-2">
              <span className="w-5 h-5 bg-blue-200 rounded-full flex items-center justify-center text-xs font-bold text-blue-800 shrink-0 mt-0.5">1</span>
              <span>Enter the email address of the person you want to invite.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-5 h-5 bg-blue-200 rounded-full flex items-center justify-center text-xs font-bold text-blue-800 shrink-0 mt-0.5">2</span>
              <span>Select the {config.entityLabel.toLowerCase()} they will manage.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-5 h-5 bg-blue-200 rounded-full flex items-center justify-center text-xs font-bold text-blue-800 shrink-0 mt-0.5">3</span>
              <span>They will receive an email with a registration link valid for 24 hours.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-5 h-5 bg-blue-200 rounded-full flex items-center justify-center text-xs font-bold text-blue-800 shrink-0 mt-0.5">4</span>
              <span>Once they complete registration, they'll be assigned to the selected {config.entityLabel.toLowerCase()}.</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default InvitationPage;
