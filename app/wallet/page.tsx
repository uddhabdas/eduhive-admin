'use client';

import { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import { api, WalletTransaction } from '@/lib/api';

type HistoryFilter = 'all' | 'approved' | 'rejected' | 'completed' | 'coursePurchases';

export default function WalletPage() {
  const [pendingRequests, setPendingRequests] = useState<WalletTransaction[]>([]);
  const [history, setHistory] = useState<WalletTransaction[]>([]);
  const [pendingLoading, setPendingLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [adminNotes, setAdminNotes] = useState<{ [key: string]: string }>({});
  const [historyFilter, setHistoryFilter] = useState<HistoryFilter>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    loadPendingRequests();
    loadHistory();
  }, []);

  const loadPendingRequests = async () => {
    try {
      setPendingLoading(true);
      const data = await api.getPendingWalletRequests();
      setPendingRequests(data);
    } catch (error) {
      console.error('Failed to load pending requests:', error);
    } finally {
      setPendingLoading(false);
    }
  };

  const loadHistory = async () => {
    try {
      setHistoryLoading(true);
      const data = await api.getAllWalletTransactions(); // backend se jitna mile sab
      const sorted = [...data].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      setHistory(sorted);
    } catch (error) {
      console.error('Failed to load history:', error);
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleApprove = async (id: string) => {
    if (!confirm('Are you sure you want to approve this wallet top-up request?')) return;

    setProcessingId(id);
    try {
      // ✅ server se updated transaction milega
      const updated = await api.approveWalletRequest(id, adminNotes[id] || '');

      // pending list se hatao
      setPendingRequests((prev) => prev.filter((r) => r._id !== id));

      // history me turant add / update karo
      setHistory((prev) => {
        const without = prev.filter((t) => t._id !== updated._id);
        return [updated, ...without];
      });

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
      const updated = await api.rejectWalletRequest(id, adminNotes[id] || '');

      setPendingRequests((prev) => prev.filter((r) => r._id !== id));

      setHistory((prev) => {
        const without = prev.filter((t) => t._id !== updated._id);
        return [updated, ...without];
      });

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

  const formatDateTime = (iso: string) =>
    new Date(iso).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

  const capitalize = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

  // 👉 History filter (client-side)
  // 👉 History filter (client-side)
const filteredHistory = history.filter((tx) => {
  if (tx.status === 'pending') return false; // pending upar hi dikha rahe hain

  if (historyFilter === 'all') return true;

  // ✅ Approved tab:
  // jo bhi CREDIT hai aur status approved/completed hai, wo approved list me aayega
  if (historyFilter === 'approved') {
    return tx.type === 'credit' && (tx.status === 'approved' || tx.status === 'completed');
  }

  // ✅ Course Purchases tab:
  // debit + completed ko course purchase maan rahe hain
  if (historyFilter === 'coursePurchases') {
    return tx.type === 'debit' && tx.status === 'completed';
  }

  // ✅ Rejected / Completed tabs normal status pe
  if (historyFilter === 'rejected') {
    return tx.status === 'rejected';
  }

  if (historyFilter === 'completed') {
    return tx.status === 'completed';
  }

  return true;
});


  // 👁 Professional explanation text
  const getTransactionExplanation = (tx: WalletTransaction) => {
    const who = getUserName(tx.userId);
    const base = `₹${tx.amount} ${tx.type === 'credit' ? 'credited to' : 'debited from'} ${who}'s wallet.`;
    const when = `This transaction was created on ${formatDateTime(tx.createdAt)}.`;

    let statusPart = `Current status is "${capitalize(tx.status)}".`;

    if (tx.status === 'approved' || tx.status === 'completed') {
      if (tx.processedAt || tx.processedBy || tx.adminNotes) {
        const by =
          typeof tx.processedBy === 'object' && tx.processedBy
            ? getUserName(tx.processedBy)
            : typeof tx.processedBy === 'string'
            ? tx.processedBy
            : 'an admin';

        const at = tx.processedAt ? ` on ${formatDateTime(tx.processedAt)}` : '';
        statusPart = `The request was processed by ${by}${at} with status "${capitalize(
          tx.status
        )}".`;
      }
    }

    const paymentInfo = `Payment reference: UTR ${tx.utrNumber}, UPI ID ${tx.upiId}.`;
    const desc = tx.description ? ` Description: ${tx.description}` : '';
    const notes = tx.adminNotes ? ` Admin notes: ${tx.adminNotes}` : '';

    return `${base} ${when} ${statusPart} ${paymentInfo}${desc}${notes}`;
  };

  const renderStatusBadge = (tx: WalletTransaction) => {
    const common =
      'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium';
    switch (tx.status) {
      case 'approved':
        return (
          <span className={`${common} bg-emerald-100 text-emerald-800`}>Approved</span>
        );
      case 'rejected':
        return <span className={`${common} bg-red-100 text-red-800`}>Rejected</span>;
      case 'completed':
        return (
          <span className={`${common} bg-blue-100 text-blue-800`}>Completed</span>
        );
      default:
        return (
          <span className={`${common} bg-gray-100 text-gray-800`}>
            {capitalize(tx.status)}
          </span>
        );
    }
  };

  const renderTypeBadge = (tx: WalletTransaction) => {
    const common =
      'inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide';
    if (tx.type === 'credit') {
      return (
        <span className={`${common} bg-emerald-50 text-emerald-700 border border-emerald-100`}>
          Top-up
        </span>
      );
    }
    return (
      <span className={`${common} bg-indigo-50 text-indigo-700 border border-indigo-100`}>
        Course Purchase
      </span>
    );
  };

  // ---------- RENDER ----------

  if (pendingLoading && historyLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-10">
        {/* PENDING SECTION */}
        <section className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Wallet Requests</h1>
            <p className="text-gray-600 mt-1">
              Review and approve pending wallet top-up requests
            </p>
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
              <p className="text-gray-400 text-sm mt-2">
                All wallet requests have been processed
              </p>
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
                          <p className="text-sm text-gray-600">
                            {getUserEmail(request.userId)}
                          </p>
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
                            setAdminNotes((prev) => ({
                              ...prev,
                              [request._id]: e.target.value,
                            }))
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
                        {processingId === request._id ? 'Processing…' : 'Approve'}
                      </button>
                      <button
                        onClick={() => handleReject(request._id)}
                        disabled={processingId === request._id}
                        className="flex-1 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                      >
                        {processingId === request._id ? 'Processing…' : 'Reject'}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* HISTORY SECTION */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Transaction History</h2>
              <p className="text-gray-600 mt-1 text-sm">
                View approved, rejected, completed wallet top-ups and course purchases
              </p>
            </div>
            <div className="flex flex-wrap gap-2 text-sm">
              {(['all', 'approved', 'rejected', 'completed', 'coursePurchases'] as HistoryFilter[]).map(
                (f) => (
                  <button
                    key={f}
                    onClick={() => setHistoryFilter(f)}
                    className={`px-4 py-1.5 rounded-full border text-sm ${
                      historyFilter === f
                        ? 'bg-emerald-600 text-white border-emerald-600'
                        : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    {f === 'all'
                      ? 'All'
                      : f === 'coursePurchases'
                      ? 'Course Purchases'
                      : capitalize(f)}
                  </button>
                )
              )}
            </div>
          </div>

          {historyLoading ? (
            <div className="bg-white rounded-xl border border-gray-200 p-8 flex justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600" />
            </div>
          ) : filteredHistory.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-10 text-center text-gray-500 text-sm">
              No history found for this filter.
            </div>
          ) : (
            <div className="space-y-3">
              {filteredHistory.map((tx) => (
                <div
                  key={tx._id}
                  className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition cursor-pointer"
                  onClick={() =>
                    setExpandedId((prev) => (prev === tx._id ? null : tx._id))
                  }
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-semibold text-gray-900">
                          {getUserName(tx.userId)}
                        </p>
                        {renderTypeBadge(tx)}
                        {renderStatusBadge(tx)}
                      </div>
                      <p className="text-xs text-gray-500">
                        {getUserEmail(tx.userId)} • {formatDateTime(tx.createdAt)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p
                        className={`text-lg font-bold ${
                          tx.type === 'credit' ? 'text-emerald-600' : 'text-red-600'
                        }`}
                      >
                        {tx.type === 'credit' ? '+' : '-'}₹{tx.amount}
                      </p>
                      <p className="text-[11px] text-gray-500 mt-1">
                        UTR: {tx.utrNumber}
                      </p>
                    </div>
                  </div>

                  {expandedId === tx._id && (
                    <div className="mt-4 border-t border-gray-100 pt-3 text-sm text-gray-800">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                        <div>
                          <p className="text-xs font-semibold text-gray-500 mb-1">
                            Transaction ID
                          </p>
                          <p className="font-mono text-xs break-all">{tx._id}</p>
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-gray-500 mb-1">
                            Amount
                          </p>
                          <p>
                            ₹{tx.amount} ({tx.type === 'credit' ? 'Credit (Top-up)' : 'Debit'})
                          </p>
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-gray-500 mb-1">
                            Status
                          </p>
                          <p>{capitalize(tx.status)}</p>
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-gray-500 mb-1">
                            Created At
                          </p>
                          <p>{formatDateTime(tx.createdAt)}</p>
                        </div>
                        {tx.processedAt && (
                          <div>
                            <p className="text-xs font-semibold text-gray-500 mb-1">
                              Processed At
                            </p>
                            <p>{formatDateTime(tx.processedAt)}</p>
                          </div>
                        )}
                        {tx.processedBy && (
                          <div>
                            <p className="text-xs font-semibold text-gray-500 mb-1">
                              Processed By
                            </p>
                            <p>
                              {typeof tx.processedBy === 'object'
                                ? getUserName(tx.processedBy)
                                : tx.processedBy}
                            </p>
                          </div>
                        )}
                        <div>
                          <p className="text-xs font-semibold text-gray-500 mb-1">
                            Payment Reference
                          </p>
                          <p>UTR: {tx.utrNumber}</p>
                          <p>UPI: {tx.upiId}</p>
                        </div>
                      </div>

                      {tx.description && (
                        <p className="mb-2">
                          <span className="font-semibold">Description: </span>
                          {tx.description}
                        </p>
                      )}
                      {tx.adminNotes && (
                        <p className="mb-2">
                          <span className="font-semibold">Admin Notes: </span>
                          {tx.adminNotes}
                        </p>
                      )}

                      <p className="mt-2 text-[13px] text-gray-700">
                        {getTransactionExplanation(tx)}
                      </p>
                    </div>
                  )}

                  {expandedId !== tx._id && (
                    <button
                      type="button"
                      className="mt-3 text-xs font-medium text-emerald-700 hover:text-emerald-800 underline"
                      onClick={(e) => {
                        e.stopPropagation();
                        setExpandedId(tx._id);
                      }}
                    >
                      Explain this transaction
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </Layout>
  );
}
