'use client';

import { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import { api, WalletTransaction } from '@/lib/api';
import { socket } from '@/lib/socket';

type HistoryFilter = 'all' | 'approved' | 'rejected' | 'completed' | 'purchases';

export default function WalletPage() {
  const [pendingRequests, setPendingRequests] = useState<WalletTransaction[]>([]);
  const [history, setHistory] = useState<WalletTransaction[]>([]);
  const [loading, setLoading] = useState(true);            // pending ke liye
  const [loadingHistory, setLoadingHistory] = useState(true); // history ke liye
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [adminNotes, setAdminNotes] = useState<{ [key: string]: string }>({});
  const [historyFilter, setHistoryFilter] = useState<HistoryFilter>('all');

  useEffect(() => {
    // initial load
    loadPendingRequests();
    loadHistory();

    // 🔄 auto refresh har 10 second
    const interval = setInterval(() => {
      loadPendingRequests();
      loadHistory();
    }, 10000);

    // 🔥 socket listeners (agar backend emit kar raha ho)
    socket.on('new_wallet_request', (data: any) => {
      const tx = data as WalletTransaction;
      setPendingRequests(prev => {
        // duplicate avoid
        if (prev.some(p => p._id === tx._id)) return prev;
        return [tx, ...prev];
      });
    });

    socket.on('wallet_request_approved', (id: string) => {
      setPendingRequests(prev => prev.filter(req => req._id !== id));
      loadHistory();
    });

    socket.on('wallet_request_rejected', (id: string) => {
      setPendingRequests(prev => prev.filter(req => req._id !== id));
      loadHistory();
    });

    return () => {
      clearInterval(interval);
      socket.off('new_wallet_request');
      socket.off('wallet_request_approved');
      socket.off('wallet_request_rejected');
    };
  }, []);

  const loadPendingRequests = async () => {
    try {
      const data = await api.getPendingWalletRequests();
      setPendingRequests(data);
    } catch (error) {
      console.error('Failed to load pending requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadHistory = async () => {
    try {
      const data = await api.getAllWalletTransactions();

      // sirf non-pending ko history me rakhna
      const nonPending = data.filter(tx => tx.status !== 'pending');

      // latest upar
      nonPending.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      setHistory(nonPending);
    } catch (error) {
      console.error('Failed to load history:', error);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleApprove = async (id: string) => {
    if (!confirm('Are you sure you want to approve this wallet top-up request?')) return;

    setProcessingId(id);
    try {
      await api.approveWalletRequest(id, adminNotes[id] || '');
      setAdminNotes({ ...adminNotes, [id]: '' });
      await Promise.all([loadPendingRequests(), loadHistory()]);
    } catch (error: any) {
      alert(error.message || 'Failed to approve request');
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (id: string) => {
    if (!confirm('Are you sure you want to reject this wallet top-up request?')) return;

    setProcessingId(id);
    try {
      await api.rejectWalletRequest(id, adminNotes[id] || '');
      setAdminNotes({ ...adminNotes, [id]: '' });
      await Promise.all([loadPendingRequests(), loadHistory()]);
    } catch (error: any) {
      alert(error.message || 'Failed to reject request');
    } finally {
      setProcessingId(null);
    }
  };

  const getUserName = (user: any) => {
    if (typeof user === 'object' && user !== null) {
      return user.name || user.email || 'Unknown';
    }
    return 'Unknown';
  };

  const getUserEmail = (user: any) => {
    if (typeof user === 'object' && user !== null) {
      return user.email || 'Unknown';
    }
    return 'Unknown';
  };

  const formatDateTime = (value?: string) => {
    if (!value) return '-';
    return new Date(value).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // label + chip color
   const getStatusLabel = (tx: WalletTransaction) => {
    // 🎓 Course purchase
    if (tx.type === 'debit' && tx.status === 'completed') {
      return 'COURSE PURCHASE';
    }

    // 💰 Wallet top-up: credit + completed = actually approved hi hai
    if (tx.type === 'credit' && tx.status === 'completed') {
      return 'APPROVED';
    }

    if (tx.status === 'approved') return 'APPROVED';
    if (tx.status === 'rejected') return 'REJECTED';
    if (tx.status === 'completed') return 'COMPLETED';

    return tx.status.toUpperCase();
  };

  const getStatusClasses = (tx: WalletTransaction) => {
    if (tx.type === 'debit' && tx.status === 'completed') {
      return 'bg-purple-100 text-purple-800';
    }
    if (tx.status === 'approved') return 'bg-emerald-100 text-emerald-800';
    if (tx.status === 'rejected') return 'bg-red-100 text-red-800';
    if (tx.status === 'completed') return 'bg-blue-100 text-blue-800';
    return 'bg-gray-100 text-gray-800';
  };

  // history filter logic
  const filteredHistory = history.filter(tx => {
    if (historyFilter === 'all') return true;

    if (historyFilter === 'approved') return tx.status === 'approved';
    if (historyFilter === 'rejected') return tx.status === 'rejected';
    if (historyFilter === 'completed') return tx.status === 'completed';

    if (historyFilter === 'purchases') {
      return tx.type === 'debit' && tx.status === 'completed';
    }

    return true;
  });

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-8">
        {/* 🔹 Tumhara original style header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Wallet Requests</h1>
          <p className="text-gray-600 mt-1">
            Review and approve pending wallet top-up requests
          </p>
        </div>

        {/* 🔹 Pending requests section (same style) */}
        {pendingRequests.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
            <svg
              className="w-16 h-16 text-gray-400 mx-auto mb-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <p className="text-gray-500 text-lg font-medium">No pending requests</p>
            <p className="text-gray-400 text-sm mt-2">
              All wallet requests have been processed
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {pendingRequests.map(request => (
              <div
                key={request._id}
                className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition"
              >
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-1">
                          {getUserName(request.userId)}
                        </h3>
                        <p className="text-sm text-gray-600">{getUserEmail(request.userId)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-emerald-600">
                          ₹{request.amount}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {formatDateTime(request.createdAt)}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div className="bg-gray-50 rounded-lg p-3">
                        <p className="text-xs font-medium text-gray-500 mb-1">
                          UTR Number
                        </p>
                        <p className="text-sm font-mono text-gray-900 break-all">
                          {request.utrNumber}
                        </p>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-3">
                        <p className="text-xs font-medium text-gray-500 mb-1">
                          UPI ID
                        </p>
                        <p className="text-sm text-gray-900">{request.upiId}</p>
                      </div>
                    </div>

                    {request.description && (
                      <div className="mb-4">
                        <p className="text-xs font-medium text-gray-500 mb-1">
                          Description
                        </p>
                        <p className="text-sm text-gray-700">
                          {request.description}
                        </p>
                      </div>
                    )}

                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Admin Notes (optional)
                      </label>
                      <textarea
                        value={adminNotes[request._id] || ''}
                        onChange={e =>
                          setAdminNotes({
                            ...adminNotes,
                            [request._id]: e.target.value,
                          })
                        }
                        placeholder="Add notes about this transaction..."
                        rows={2}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none text-sm"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row lg:flex-col gap-3 lg:w-48">
                    <button
                      onClick={() => handleApprove(request._id)}
                      disabled={processingId === request._id}
                      className="flex-1 px-6 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                    >
                      {processingId === request._id ? (
                        <>
                          <svg
                            className="animate-spin h-5 w-5 mr-2"
                            fill="none"
                            viewBox="0 0 24 24"
                          >
                            <circle
                              className="opacity-25"
                              cx="12"
                              cy="12"
                              r="10"
                              stroke="currentColor"
                              strokeWidth="4"
                            ></circle>
                            <path
                              className="opacity-75"
                              fill="currentColor"
                              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                            ></path>
                          </svg>
                          Processing...
                        </>
                      ) : (
                        <>
                          <svg
                            className="w-5 h-5 mr-2"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M5 13l4 4L19 7"
                            />
                          </svg>
                          Approve
                        </>
                      )}
                    </button>

                    <button
                      onClick={() => handleReject(request._id)}
                      disabled={processingId === request._id}
                      className="flex-1 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                    >
                      {processingId === request._id ? (
                        <>
                          <svg
                            className="animate-spin h-5 w-5 mr-2"
                            fill="none"
                            viewBox="0 0 24 24"
                          >
                            <circle
                              className="opacity-25"
                              cx="12"
                              cy="12"
                              r="10"
                              stroke="currentColor"
                              strokeWidth="4"
                            ></circle>
                            <path
                              className="opacity-75"
                              fill="currentColor"
                              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                            ></path>
                          </svg>
                          Processing...
                        </>
                      ) : (
                        <>
                          <svg
                            className="w-5 h-5 mr-2"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M6 18L18 6M6 6l12 12"
                            />
                          </svg>
                          Reject
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 📜 Transaction history */}
        <div className="pt-8 border-t border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-2xl font-semibold text-gray-900">
                Transaction History
              </h2>
              <p className="text-gray-600 text-sm mt-1">
                View approved, rejected, completed wallet top-ups and course purchases
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {(['all', 'approved', 'rejected', 'completed', 'purchases'] as HistoryFilter[]).map(f => (
                <button
                  key={f}
                  onClick={() => setHistoryFilter(f)}
                  className={`px-3 py-1 rounded-full text-xs font-medium border ${
                    historyFilter === f
                      ? 'bg-emerald-600 text-white border-emerald-600'
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {f === 'all'
                    ? 'All'
                    : f === 'purchases'
                    ? 'Course Purchases'
                    : f.charAt(0).toUpperCase() + f.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {loadingHistory ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
            </div>
          ) : filteredHistory.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
              <p className="text-gray-500 text-sm">
                No history found for this filter.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredHistory.map(tx => (
                <div
                  key={tx._id}
                  className="bg-white rounded-xl shadow-sm border border-gray-200 p-4"
                >
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-gray-900">
                        {getUserName(tx.userId)}{' '}
                        <span className="text-gray-500 text-xs">
                          ({getUserEmail(tx.userId)})
                        </span>
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        Created: {formatDateTime(tx.createdAt)}
                        {tx.processedAt &&
                          ` • Processed: ${formatDateTime(tx.processedAt)}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      <p className="text-lg font-bold text-emerald-600">
                        ₹{tx.amount}
                      </p>
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusClasses(
                          tx
                        )}`}
                      >
                        {getStatusLabel(tx)}
                      </span>
                    </div>
                  </div>

                  {tx.description && (
                    <p className="text-sm text-gray-700 mt-2">
                      <span className="font-medium">Description: </span>
                      {tx.description}
                    </p>
                  )}

                  {tx.adminNotes && (
                    <p className="text-sm text-gray-700 mt-1">
                      <span className="font-medium">Admin Notes: </span>
                      {tx.adminNotes}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
