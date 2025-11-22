'use client';

import { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import { api, WalletTransaction } from '@/lib/api';
import io from "socket.io-client";

const SOCKET_URL =
  process.env.NEXT_PUBLIC_SOCKET_URL ||
  "https://eduhive-server.onrender.com";

export default function WalletPage() {
  const [pendingRequests, setPendingRequests] = useState<WalletTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [adminNotes, setAdminNotes] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    loadPendingRequests();

    // --- SOCKET.IO CLIENT ---
    const socket = io(SOCKET_URL, {
      transports: ["websocket"],
    });

    socket.on("connect", () => {
      console.log("Socket Connected:", socket.id);
    });

    // 🔥 When NEW request created by user → instantly update
    socket.on("new_wallet_request", (data: WalletTransaction) => {
      console.log("New Wallet Request Received:", data);

      setPendingRequests(prev => [data, ...prev]);
    });

    // 🔥 When request APPROVED → remove from pending
    socket.on("wallet_request_approved", (id: string) => {
      setPendingRequests(prev => prev.filter(req => req._id !== id));
    });

    // 🔥 When request REJECTED → remove from pending
    socket.on("wallet_request_rejected", (id: string) => {
      setPendingRequests(prev => prev.filter(req => req._id !== id));
    });

    return () => {
      socket.disconnect();
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

  const handleApprove = async (id: string) => {
    if (!confirm('Are you sure you want to approve this wallet top-up request?')) return;

    setProcessingId(id);
    try {
      await api.approveWalletRequest(id, adminNotes[id] || '');
      setPendingRequests(prev => prev.filter(req => req._id !== id));
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
      setPendingRequests(prev => prev.filter(req => req._id !== id));
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
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Wallet Requests</h1>
          <p className="text-gray-600 mt-1">Review and approve pending wallet top-up requests</p>
        </div>

        {pendingRequests.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
            <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
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
                        <p className="text-xs text-gray-500 mt-1">
                          {new Date(request.createdAt).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
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
                        onChange={(e) => setAdminNotes({ ...adminNotes, [request._id]: e.target.value })}
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
                      Approve
                    </button>
                    <button
                      onClick={() => handleReject(request._id)}
                      disabled={processingId === request._id}
                      className="flex-1 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
