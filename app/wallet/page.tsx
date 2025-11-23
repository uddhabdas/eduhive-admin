'use client';

import { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import { api, WalletTransaction } from '@/lib/api';

type HistoryFilter = 'all' | 'approved' | 'rejected' | 'completed' | 'course';

export default function WalletPage() {
  const [pendingRequests, setPendingRequests] = useState<WalletTransaction[]>([]);
  const [history, setHistory] = useState<WalletTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [adminNotes, setAdminNotes] = useState<{ [key: string]: string }>({});
  const [activeFilter, setActiveFilter] = useState<HistoryFilter>('all');
  const [selectedTx, setSelectedTx] = useState<WalletTransaction | null>(null);

  const loadData = async () => {
    try {
      const [pending, allTx] = await Promise.all([
        api.getPendingWalletRequests(),
        api.getAllWalletTransactions(),
      ]);
      setPendingRequests(pending);
      setHistory(allTx);
    } catch (error) {
      console.error('Failed to load wallet data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    // 🔁 every 10s auto refresh (new requests, history update)
    const intervalId = setInterval(loadData, 10000);
    return () => clearInterval(intervalId);
  }, []);

  const handleApprove = async (id: string) => {
    if (!confirm('Are you sure you want to approve this wallet top-up request?')) return;

    setProcessingId(id);
    try {
      await api.approveWalletRequest(id, adminNotes[id] || '');
      await loadData();
      setAdminNotes((prev) => ({ ...prev, [id]: '' }));
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
      await loadData();
      setAdminNotes((prev) => ({ ...prev, [id]: '' }));
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

  // 🔹 admin / processedBy display
  const getActorName = (actor: any) => {
    if (!actor) return '—';
    if (typeof actor === 'object') {
      return actor.name || actor.email || 'Unknown admin';
    }
    return actor; // id string
  };

  const getActorEmail = (actor: any) => {
    if (!actor || typeof actor !== 'object') return '';
    return actor.email || '';
  };

  // 🔍 history filter logic
  const filteredHistory = history.filter((tx) => {
    if (activeFilter === 'all') return tx.status !== 'pending';

    if (activeFilter === 'approved') {
      // jo credit aur completed hai woh approved jaise treat kare
      return tx.type === 'credit' && tx.status === 'completed';
    }

    if (activeFilter === 'rejected') return tx.status === 'rejected';

    if (activeFilter === 'completed') return tx.status === 'completed';

    if (activeFilter === 'course') {
      if (tx.type === 'debit' && tx.status === 'completed') return true;
      const desc = (tx.description || '').toLowerCase();
      return desc.includes('course') || desc.includes('purchase');
    }

    return true;
  });

  const formatDateTime = (iso: string) =>
    new Date(iso).toLocaleString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });

  const renderStatusBadge = (tx: WalletTransaction) => {
    const base = 'px-2.5 py-1 text-xs font-semibold rounded-full';
    switch (tx.status) {
      case 'pending':
        return <span className={`${base} bg-yellow-100 text-yellow-800`}>Pending</span>;
      case 'approved':
        return <span className={`${base} bg-emerald-100 text-emerald-800`}>Approved</span>;
      case 'rejected':
        return <span className={`${base} bg-red-100 text-red-800`}>Rejected</span>;
      case 'completed':
        return <span className={`${base} bg-blue-100 text-blue-800`}>Completed</span>;
      default:
        return <span className={`${base} bg-gray-100 text-gray-700`}>{tx.status}</span>;
    }
  };

  const renderTypeBadge = (tx: WalletTransaction) => {
    const base = 'px-2.5 py-1 text-xs font-semibold rounded-full';
    if (tx.type === 'credit') {
      return <span className={`${base} bg-emerald-50 text-emerald-700`}>Credit</span>;
    }
    return <span className={`${base} bg-rose-50 text-rose-700`}>Debit</span>;
  };

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
      <div className="space-y-10">
        {/* Pending Requests */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Wallet Requests</h1>
          <p className="text-gray-600 mt-1">Review and approve pending wallet top-up requests</p>
        </div>

        {pendingRequests.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
            <svg
              className="w-16 h-16 text-gray-300 mx-auto mb-4"
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
            <p className="text-gray-400 text-sm mt-2">All wallet requests have been processed</p>
          </div>
        ) : (
          <div className="space-y-4">
            {pendingRequests.map((request) => (
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
                        <p className="text-2xl font-bold text-emerald-600">₹{request.amount}</p>
                        <p className="text-xs text-gray-500 mt-1">{formatDateTime(request.createdAt)}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div className="bg-gray-50 rounded-lg p-3">
                        <p className="text-xs font-medium text-gray-500 mb-1">UTR Number</p>
                        <p className="text-sm font-mono text-gray-900 break-all">{request.utrNumber}</p>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-3">
                        <p className="text-xs font-medium text-gray-500 mb-1">UPI ID</p>
                        <p className="text-sm text-gray-900">{request.upiId}</p>
                      </div>
                    </div>

                    {request.description && (
                      <div className="mb-4">
                        <p className="text-xs font-medium text-gray-500 mb-1">Description</p>
                        <p className="text-sm text-gray-700">{request.description}</p>
                      </div>
                    )}

                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Admin Notes (optional)
                      </label>
                      <textarea
                        value={adminNotes[request._id] || ''}
                        onChange={(e) =>
                          setAdminNotes((prev) => ({ ...prev, [request._id]: e.target.value }))
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
                      {processingId === request._id ? 'Processing...' : 'Approve'}
                    </button>
                    <button
                      onClick={() => handleReject(request._id)}
                      disabled={processingId === request._id}
                      className="flex-1 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                    >
                      {processingId === request._id ? 'Processing...' : 'Reject'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* History */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-semibold text-gray-900">Transaction History</h2>
              <p className="text-gray-600 text-sm">
                View approved, rejected, completed wallet top-ups and course purchases
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {(['all', 'approved', 'rejected', 'completed', 'course'] as HistoryFilter[]).map(
                (filter) => {
                  const labels: Record<HistoryFilter, string> = {
                    all: 'All',
                    approved: 'Approved',
                    rejected: 'Rejected',
                    completed: 'Completed',
                    course: 'Course Purchases',
                  };
                  const isActive = activeFilter === filter;
                  return (
                    <button
                      key={filter}
                      onClick={() => setActiveFilter(filter)}
                      className={`px-4 py-1.5 rounded-full text-sm font-medium border transition ${
                        isActive
                          ? 'bg-emerald-600 text-white border-emerald-600'
                          : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {labels[filter]}
                    </button>
                  );
                }
              )}
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            {filteredHistory.length === 0 ? (
              <div className="py-10 text-center text-gray-500 text-sm">
                No history found for this filter.
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {filteredHistory.map((tx) => (
                  <button
                    key={tx._id}
                    onClick={() => setSelectedTx(tx)}
                    className="w-full text-left px-6 py-4 hover:bg-gray-50 flex items-center justify-between gap-4"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-semibold text-gray-900">
                          {getUserName(tx.userId)}
                        </span>
                        {renderTypeBadge(tx)}
                        {renderStatusBadge(tx)}
                      </div>
                      <p className="text-xs text-gray-500 mb-1">
                        {getUserEmail(tx.userId)} • {formatDateTime(tx.createdAt)}
                      </p>
                      {tx.description && (
                        <p className="text-sm text-gray-700 line-clamp-1">{tx.description}</p>
                      )}
                    </div>
                    <div className="text-right">
                      <p
                        className={`text-lg font-bold ${
                          tx.type === 'credit' ? 'text-emerald-600' : 'text-rose-600'
                        }`}
                      >
                        {tx.type === 'credit' ? '+' : '-'}₹{tx.amount}
                      </p>
                      {tx.processedAt && (
                        <p className="text-[11px] text-gray-400 mt-1">
                          Processed: {formatDateTime(tx.processedAt)}
                        </p>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Detail Modal */}
        {selectedTx && (
          <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40">
            <div className="bg-white w-full max-w-lg rounded-2xl shadow-xl p-6 relative">
              <button
                className="absolute top-3 right-3 text-gray-400 hover:text-gray-600"
                onClick={() => setSelectedTx(null)}
              >
                ✕
              </button>

              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Transaction Details
              </h3>
              <p className="text-sm text-gray-500 mb-4">
                {selectedTx.type === 'credit'
                  ? selectedTx.status === 'rejected'
                    ? 'Wallet top-up request was rejected by admin.'
                    : 'Wallet top-up credited to user.'
                  : 'Amount deducted from wallet (e.g. course purchase).'}
              </p>

              <div className="space-y-4 text-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-500">User</p>
                    <p className="font-medium text-gray-900">
                      {getUserName(selectedTx.userId)}
                    </p>
                    <p className="text-xs text-gray-500">
                      {getUserEmail(selectedTx.userId)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p
                      className={`text-2xl font-bold ${
                        selectedTx.type === 'credit' ? 'text-emerald-600' : 'text-rose-600'
                      }`}
                    >
                      {selectedTx.type === 'credit' ? '+' : '-'}₹{selectedTx.amount}
                    </p>
                    <div className="mt-1 flex justify-end gap-2">
                      {renderTypeBadge(selectedTx)}
                      {renderStatusBadge(selectedTx)}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Transaction ID</p>
                    <p className="font-mono text-gray-900 break-all text-xs">
                      {selectedTx._id}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Status</p>
                    <p className="text-gray-900 text-sm capitalize">
                      {selectedTx.status}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">UTR Number</p>
                    <p className="font-mono text-gray-900 break-all text-xs">
                      {selectedTx.utrNumber || '—'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">UPI ID</p>
                    <p className="text-gray-900 text-sm">{selectedTx.upiId || '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Created At</p>
                    <p className="text-gray-900 text-sm">
                      {formatDateTime(selectedTx.createdAt)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Processed At</p>
                    <p className="text-gray-900 text-sm">
                      {selectedTx.processedAt
                        ? formatDateTime(selectedTx.processedAt)
                        : 'Not processed yet'}
                    </p>
                  </div>
                </div>

                {/* 🔥 Who approved / rejected */}
                {selectedTx.status !== 'pending' && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Action</p>
                      <p className="text-gray-900 text-sm capitalize">
                        {selectedTx.type === 'credit'
                          ? selectedTx.status === 'completed'
                            ? 'Top-up completed'
                            : selectedTx.status === 'approved'
                            ? 'Top-up approved'
                            : selectedTx.status === 'rejected'
                            ? 'Top-up rejected'
                            : selectedTx.status
                          : selectedTx.status}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Processed By</p>
                      <p className="text-gray-900 text-sm">
                        {getActorName(selectedTx.processedBy)}
                      </p>
                      {getActorEmail(selectedTx.processedBy) && (
                        <p className="text-xs text-gray-500">
                          {getActorEmail(selectedTx.processedBy)}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {selectedTx.description && (
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Description</p>
                    <p className="text-gray-800 text-sm">{selectedTx.description}</p>
                  </div>
                )}

                {selectedTx.adminNotes && (
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Admin Notes</p>
                    <p className="text-gray-800 text-sm">{selectedTx.adminNotes}</p>
                  </div>
                )}
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                  onClick={() => setSelectedTx(null)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
