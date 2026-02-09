/**
 * BlockchainStatus Component
 * Shows blockchain verification status on complaint cards
 */

import { useState, useEffect } from 'react';
import blockchainService from '../../services/blockchainService';

// Icons
const Icons = {
  Verified: () => (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    </svg>
  ),
  Pending: () => (
    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
    </svg>
  ),
  NotRecorded: () => (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  ExternalLink: () => (
    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
    </svg>
  ),
  Chain: () => (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
    </svg>
  ),
};

const BlockchainStatus = ({ 
  complaintId, 
  transactionHash = null, 
  isVerified = false,
  compact = false,
  showDetails = false,
  onViewDetails,
}) => {
  const [blockchainData, setBlockchainData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchBlockchainStatus = async () => {
      if (!complaintId || !blockchainService.isAvailable()) return;
      
      setLoading(true);
      try {
        const result = await blockchainService.getComplaint(complaintId);
        if (result.success && result.data.exists) {
          setBlockchainData(result.data);
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (showDetails) {
      fetchBlockchainStatus();
    }
  }, [complaintId, showDetails]);

  // Compact badge version
  if (compact) {
    const status = isVerified || transactionHash ? 'verified' : 'not-recorded';
    
    return (
      <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium ${
        status === 'verified' 
          ? 'bg-emerald-100 text-emerald-700' 
          : 'bg-gray-100 text-gray-500'
      }`}>
        {status === 'verified' ? <Icons.Verified /> : <Icons.NotRecorded />}
        <span>{status === 'verified' ? 'On-Chain' : 'Off-Chain'}</span>
      </div>
    );
  }

  // Full status card
  return (
    <div className="bg-linear-to-r from-indigo-50 to-purple-50 border border-indigo-100 rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-indigo-100 rounded-lg">
            <Icons.Chain />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-gray-900">Blockchain Verification</h4>
            <p className="text-xs text-gray-500">Sepolia Testnet</p>
          </div>
        </div>
        
        {loading ? (
          <div className="flex items-center gap-2 text-indigo-600">
            <Icons.Pending />
            <span className="text-sm">Verifying...</span>
          </div>
        ) : isVerified || transactionHash || blockchainData?.exists ? (
          <div className="flex items-center gap-2 text-emerald-600">
            <Icons.Verified />
            <span className="text-sm font-medium">Verified</span>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-gray-400">
            <Icons.NotRecorded />
            <span className="text-sm">Not Recorded</span>
          </div>
        )}
      </div>

      {/* Transaction Hash */}
      {transactionHash && (
        <div className="mt-3 p-3 bg-white/60 rounded-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500">Transaction Hash</span>
            <a
              href={blockchainService.getEtherscanLink(transactionHash)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 transition-colors"
            >
              View on Etherscan <Icons.ExternalLink />
            </a>
          </div>
          <p className="mt-1 text-xs font-mono text-gray-700 break-all">
            {transactionHash}
          </p>
        </div>
      )}

      {/* Blockchain Data */}
      {showDetails && blockchainData && (
        <div className="mt-3 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">On-Chain Status:</span>
            <span className="font-medium text-gray-900">{blockchainData.currentStatus}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Recorded At:</span>
            <span className="font-medium text-gray-900">
              {new Date(blockchainData.timestamp * 1000).toLocaleDateString()}
            </span>
          </div>
        </div>
      )}

      {/* View Details Button */}
      {onViewDetails && (
        <button
          onClick={onViewDetails}
          className="mt-3 w-full py-2 text-sm font-medium text-indigo-600 bg-white rounded-lg border border-indigo-200 hover:bg-indigo-50 transition-colors"
        >
          View Transaction History
        </button>
      )}

      {error && (
        <p className="mt-2 text-xs text-red-500">{error}</p>
      )}
    </div>
  );
};

export default BlockchainStatus;
