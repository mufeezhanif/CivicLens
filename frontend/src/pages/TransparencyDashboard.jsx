/**
 * TransparencyDashboard Page
 * Shows all blockchain-recorded complaints and transactions
 */

import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import blockchainService, { STATUS_ENUM } from '../services/blockchainService';
import { BlockchainStatus, TransactionHistory } from '../components/Blockchain';

// Icons
const Icons = {
  Chain: () => (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
    </svg>
  ),
  Shield: () => (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    </svg>
  ),
  Document: () => (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  ),
  Clock: () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  ExternalLink: () => (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
    </svg>
  ),
  Refresh: () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
    </svg>
  ),
  Search: () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  ),
  Home: () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
    </svg>
  ),
};

// Status badge colors
const STATUS_COLORS = {
  'Pending': 'bg-yellow-100 text-yellow-800 border-yellow-200',
  'Under Review': 'bg-blue-100 text-blue-800 border-blue-200',
  'In Progress': 'bg-indigo-100 text-indigo-800 border-indigo-200',
  'Resolved': 'bg-green-100 text-green-800 border-green-200',
  'Rejected': 'bg-red-100 text-red-800 border-red-200',
  'Closed': 'bg-gray-100 text-gray-800 border-gray-200',
};

const TransparencyDashboard = () => {
  const [complaints, setComplaints] = useState([]);
  const [totalComplaints, setTotalComplaints] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isConnected, setIsConnected] = useState(false);

  // Initialize blockchain service
  const initializeBlockchain = useCallback(async () => {
    try {
      const success = await blockchainService.initialize();
      setIsConnected(success);
      return success;
    } catch (err) {
      console.error('Failed to initialize blockchain:', err);
      setError('Failed to connect to blockchain network');
      return false;
    }
  }, []);

  // Fetch complaints from blockchain
  const fetchComplaints = useCallback(async () => {
    if (!blockchainService.isAvailable()) {
      const connected = await initializeBlockchain();
      if (!connected) return;
    }

    setLoading(true);
    setError(null);

    try {
      // Get total count
      const totalResult = await blockchainService.getTotalComplaints();
      if (totalResult.success) {
        setTotalComplaints(totalResult.total);
      }

      // Get all complaints
      const result = await blockchainService.getAllComplaints(0, 100);
      if (result.success) {
        setComplaints(result.data);
      } else {
        setError(result.error);
      }
    } catch (err) {
      console.error('Failed to fetch blockchain complaints:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [initializeBlockchain]);

  useEffect(() => {
    fetchComplaints();
  }, [fetchComplaints]);

  // Filter complaints by search query
  const filteredComplaints = complaints.filter(complaint => 
    complaint.complaintId.toLowerCase().includes(searchQuery.toLowerCase()) ||
    complaint.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Handle view transaction history
  const handleViewHistory = (complaint) => {
    setSelectedComplaint(complaint);
    setIsHistoryOpen(true);
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-gray-50 to-indigo-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link 
                to="/"
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <Icons.Home />
              </Link>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-100 rounded-xl">
                  <Icons.Chain />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Blockchain Transparency</h1>
                  <p className="text-sm text-gray-500">All complaints verified on Sepolia Testnet</p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${
                isConnected 
                  ? 'bg-emerald-100 text-emerald-700' 
                  : 'bg-red-100 text-red-700'
              }`}>
                <span className={`w-2 h-2 rounded-full ${
                  isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'
                }`} />
                {isConnected ? 'Connected' : 'Disconnected'}
              </div>
              <a
                href={blockchainService.getContractEtherscanLink()}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium"
              >
                View Contract <Icons.ExternalLink />
              </a>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-indigo-100 rounded-xl">
                <Icons.Document />
              </div>
              <div>
                <p className="text-sm text-gray-500">Total On-Chain Complaints</p>
                <p className="text-3xl font-bold text-gray-900">{totalComplaints}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-emerald-100 rounded-xl text-emerald-600">
                <Icons.Shield />
              </div>
              <div>
                <p className="text-sm text-gray-500">Network</p>
                <p className="text-xl font-bold text-gray-900">Sepolia Testnet</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-purple-100 rounded-xl text-purple-600">
                <Icons.Chain />
              </div>
              <div>
                <p className="text-sm text-gray-500">Chain ID</p>
                <p className="text-xl font-bold text-gray-900">11155111</p>
              </div>
            </div>
          </div>
        </div>

        {/* Info Banner */}
        <div className="bg-linear-to-r from-indigo-600 to-purple-600 rounded-2xl p-6 mb-8 text-white">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-white/20 rounded-xl">
              <Icons.Shield />
            </div>
            <div>
              <h2 className="text-xl font-bold mb-2">What is Blockchain Transparency?</h2>
              <p className="text-indigo-100 leading-relaxed">
                Every complaint and status update in CivicLens is recorded on the Ethereum Sepolia testnet blockchain. 
                This ensures complete transparency and immutability - once recorded, data cannot be altered or deleted. 
                You can verify any transaction using the links to Sepolia Etherscan.
              </p>
            </div>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-6">
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Icons.Search />
              <input
                type="text"
                placeholder="Search by Complaint ID or Category..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                <Icons.Search />
              </span>
            </div>
            <button
              onClick={fetchComplaints}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors disabled:opacity-50"
            >
              <span className={loading ? 'animate-spin' : ''}>
                <Icons.Refresh />
              </span>
              Refresh
            </button>
          </div>
        </div>

        {/* Complaints List */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="w-16 h-16 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
            <p className="mt-4 text-gray-500">Loading blockchain data...</p>
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-8 text-center">
            <p className="text-red-600 font-medium mb-2">{error}</p>
            <p className="text-red-500 text-sm mb-4">
              Make sure you have a valid RPC connection to Sepolia testnet
            </p>
            <button
              onClick={fetchComplaints}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Try Again
            </button>
          </div>
        ) : filteredComplaints.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
            <div className="w-20 h-20 mx-auto bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <Icons.Document />
            </div>
            <h3 className="text-xl font-semibold text-gray-900">No Complaints Found</h3>
            <p className="text-gray-500 mt-2">
              {searchQuery 
                ? 'No complaints match your search criteria' 
                : 'No complaints have been recorded on the blockchain yet'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredComplaints.map((complaint, index) => (
              <div
                key={complaint.complaintId || index}
                className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <span className="text-lg font-bold text-gray-900 font-mono">
                        {complaint.complaintId}
                      </span>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium border ${
                        STATUS_COLORS[complaint.currentStatus] || STATUS_COLORS['Pending']
                      }`}>
                        {complaint.currentStatus}
                      </span>
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
                      <span className="flex items-center gap-1.5">
                        📂 {complaint.category}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Icons.Clock />
                        {new Date(complaint.timestamp * 1000).toLocaleString()}
                      </span>
                    </div>

                    <div className="mt-3 flex items-center gap-2">
                      <span className="text-xs text-gray-400">Hash:</span>
                      <code className="text-xs font-mono text-gray-600 bg-gray-100 px-2 py-1 rounded">
                        {complaint.hashedDetails?.slice(0, 20)}...
                      </code>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleViewHistory(complaint)}
                      className="px-4 py-2 bg-indigo-100 text-indigo-700 rounded-lg hover:bg-indigo-200 transition-colors text-sm font-medium"
                    >
                      View History
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Transaction History Modal */}
      <TransactionHistory
        complaintId={selectedComplaint?.complaintId}
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
      />
    </div>
  );
};

export default TransparencyDashboard;
