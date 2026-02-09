/**
 * TransactionHistory Component
 * Shows blockchain transaction history for a complaint
 */

import { useState, useEffect } from 'react';
import blockchainService from '../../services/blockchainService';

// Icons
const Icons = {
  Close: () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  ),
  ExternalLink: () => (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
    </svg>
  ),
  Chain: () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
    </svg>
  ),
  Clock: () => (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  CheckCircle: () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  ArrowRight: () => (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
    </svg>
  ),
};

// Status color mapping
const STATUS_COLORS = {
  'Pending': 'bg-yellow-100 text-yellow-800',
  'Under Review': 'bg-blue-100 text-blue-800',
  'In Progress': 'bg-indigo-100 text-indigo-800',
  'Resolved': 'bg-green-100 text-green-800',
  'Rejected': 'bg-red-100 text-red-800',
  'Closed': 'bg-gray-100 text-gray-800',
};

const TransactionHistory = ({ 
  complaintId, 
  transactions = [],
  isOpen, 
  onClose,
}) => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [complaintData, setComplaintData] = useState(null);

  useEffect(() => {
    const fetchHistory = async () => {
      if (!isOpen || !complaintId) return;
      
      setLoading(true);
      setError(null);
      
      try {
        // Initialize blockchain service if needed
        if (!blockchainService.isAvailable()) {
          await blockchainService.initialize();
        }

        // Fetch complaint data
        const complaintResult = await blockchainService.getComplaint(complaintId);
        if (complaintResult.success && complaintResult.data.exists) {
          setComplaintData(complaintResult.data);
          
          // Fetch history
          const historyResult = await blockchainService.getComplaintHistory(complaintId);
          if (historyResult.success) {
            setHistory(historyResult.data);
          }
        } else {
          // Use provided transactions if blockchain data not available
          setHistory(transactions);
        }
      } catch (err) {
        console.error('Failed to fetch blockchain history:', err);
        setError(err.message);
        // Fallback to provided transactions
        setHistory(transactions);
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [isOpen, complaintId, transactions]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative min-h-screen flex items-center justify-center p-4">
        <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
          {/* Header */}
          <div className="bg-linear-to-r from-indigo-600 to-purple-600 px-6 py-5 text-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/20 rounded-lg">
                  <Icons.Chain />
                </div>
                <div>
                  <h2 className="text-xl font-bold">Blockchain Transaction History</h2>
                  <p className="text-sm text-indigo-100 font-mono">
                    {complaintId}
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-white/20 rounded-lg transition-colors"
              >
                <Icons.Close />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto max-h-[60vh]">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
                <p className="mt-4 text-gray-500">Fetching blockchain data...</p>
              </div>
            ) : error ? (
              <div className="text-center py-8">
                <p className="text-red-500 mb-2">{error}</p>
                <p className="text-gray-500 text-sm">
                  Showing cached transaction data
                </p>
              </div>
            ) : history.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 mx-auto bg-gray-100 rounded-full flex items-center justify-center mb-4">
                  <Icons.Chain />
                </div>
                <h3 className="text-lg font-medium text-gray-900">No Blockchain Records</h3>
                <p className="text-gray-500 mt-2">
                  This complaint has not been recorded on the blockchain yet.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Current Status Summary */}
                {complaintData && (
                  <div className="bg-linear-to-r from-emerald-50 to-teal-50 border border-emerald-100 rounded-xl p-4 mb-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-500">Current On-Chain Status</p>
                        <p className="text-lg font-semibold text-gray-900 mt-1">
                          {complaintData.currentStatus}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 text-emerald-600">
                        <Icons.CheckCircle />
                        <span className="text-sm font-medium">Verified</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Timeline */}
                <div className="relative">
                  {history.map((item, index) => (
                    <div key={index} className="relative pl-8 pb-6 last:pb-0">
                      {/* Timeline line */}
                      {index < history.length - 1 && (
                        <div className="absolute left-3 top-8 w-0.5 h-full bg-indigo-200" />
                      )}
                      
                      {/* Timeline dot */}
                      <div className={`absolute left-0 w-6 h-6 rounded-full flex items-center justify-center ${
                        index === history.length - 1 
                          ? 'bg-indigo-600 text-white' 
                          : 'bg-indigo-100 text-indigo-600'
                      }`}>
                        <span className="text-xs font-bold">{index + 1}</span>
                      </div>

                      {/* Content */}
                      <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[item.oldStatus] || 'bg-gray-100'}`}>
                              {item.oldStatus}
                            </span>
                            <Icons.ArrowRight />
                            <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[item.newStatus] || 'bg-gray-100'}`}>
                              {item.newStatus}
                            </span>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                          <Icons.Clock />
                          <span>
                            {new Date(item.timestamp * 1000).toLocaleString()}
                          </span>
                        </div>

                        {/* Transaction Hash */}
                        {item.transactionHash && item.transactionHash !== '0x' + '0'.repeat(64) && (
                          <div className="mt-3 pt-3 border-t border-gray-200">
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-gray-400">Transaction Hash</span>
                              <a
                                href={blockchainService.getEtherscanLink(item.transactionHash)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800"
                              >
                                View <Icons.ExternalLink />
                              </a>
                            </div>
                            <p className="text-xs font-mono text-gray-600 mt-1 break-all">
                              {item.transactionHash}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                Sepolia Testnet
              </div>
              <a
                href={blockchainService.getContractEtherscanLink()}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-indigo-600 hover:text-indigo-800 font-medium"
              >
                View Contract on Etherscan
                <Icons.ExternalLink />
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TransactionHistory;
