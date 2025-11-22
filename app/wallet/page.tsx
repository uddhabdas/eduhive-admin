'use client';

import { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import { api, WalletTransaction } from '@/lib/api';
import { socket } from '@/lib/socket';   // now valid, page is fully client

export default function WalletPage() {
  const [pendingRequests, setPendingRequests] = useState<WalletTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [adminNotes, setAdminNotes] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    loadPendingRequests();

    // 🚀 Realtime: New request added
    socket.on("new_wallet_request", (data: WalletTransaction) => {
      setPendingRequests(prev => [data, ...prev]);
    });

    // 🚀 Realtime: Approved → Remove from list
    socket.on("wallet_request_approved", (id: string) => {
      setPendingRequests(prev => prev.filter(req => req._id !== id));
    });

    // 🚀 Realtime: Rejected → Remove from list
    socket.on("wallet_request_rejected", (id: string) => {
      setPendingRequests(prev => prev.filter(req => req._id !== id));
    });

    return () => {
      socket.off("new_wallet_request");
      socket.off("wallet_request_approved");
      socket.off("wallet_request_rejected");
    };
  }, []);

  const loadPendingRequests = async () => {
    try {
      const data = await api.getPendingWalletRequests();
      setPendingRequests(data);
    } catch (err) {
      console.error("Failed to load pending:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id: string) => {
    if (!confirm("Approve this wallet request?")) return;
    setProcessingId(id);

    try {
      await api.approveWalletRequest(id, adminNotes[id] || "");
      setAdminNotes(prev => ({ ...prev, [id]: "" }));
    } catch (err) {
      alert("Failed to approve");
    }
    setProcessingId(null);
  };

  const handleReject = async (id: string) => {
    if (!confirm("Reject this wallet request?")) return;
    setProcessingId(id);

    try {
      await api.rejectWalletRequest(id, adminNotes[id] || "");
      setAdminNotes(prev => ({ ...prev, [id]: "" }));
    } catch (err) {
      alert("Failed to reject");
    }
    setProcessingId(null);
  };

  const getUserName = (user: any) => {
    return typeof user === "object" ? user.name || user.email || "Unknown" : "Unknown";
  };

  const getUserEmail = (user: any) => {
    return typeof user === "object" ? user.email || "Unknown" : "Unknown";
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
          <p className="text-gray-600 mt-1">Live wallet top-up requests</p>
        </div>

        {pendingRequests.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
            <p className="text-gray-500 text-lg font-medium">No pending requests</p>
          </div>
        ) : (
          <div className="space-y-4">
            {pendingRequests.map((request) => (
              <div key={request._id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {getUserName(request.userId)}
                    </h3>
                    <p className="text-sm text-gray-600 mb-4">
                      {getUserEmail(request.userId)}
                    </p>

                    <p className="text-xl text-emerald-600 font-bold mb-2">
                      ₹{request.amount}
                    </p>

                    <p className="text-sm text-gray-500 mb-2">UTR: {request.utrNumber}</p>
                    <p className="text-sm text-gray-500 mb-4">UPI: {request.upiId}</p>

                    <textarea
                      value={adminNotes[request._id] || ""}
                      onChange={(e) =>
                        setAdminNotes(prev => ({ ...prev, [request._id]: e.target.value }))
                      }
                      placeholder="Admin notes..."
                      className="w-full border p-2 rounded mb-4"
                    />
                  </div>

                  <div className="flex flex-col gap-3 lg:w-48">
                    <button
                      onClick={() => handleApprove(request._id)}
                      disabled={processingId === request._id}
                      className="px-6 py-3 bg-emerald-600 text-white rounded-lg"
                    >
                      {processingId === request._id ? "Processing..." : "Approve"}
                    </button>
                    <button
                      onClick={() => handleReject(request._id)}
                      disabled={processingId === request._id}
                      className="px-6 py-3 bg-red-600 text-white rounded-lg"
                    >
                      {processingId === request._id ? "Processing..." : "Reject"}
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
