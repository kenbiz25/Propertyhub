
// src/pages/ReportContent.tsx
import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { withRoleGuard } from '../components/auth/withRoleGuard';

// 🔥 Firebase imports
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '@/lib/firebaseClient'; // <-- ensure you have src/lib/firebase.ts exporting db & auth

function ReportContent() {
  const [listingId, setListingId] = useState('');
  const [reason, setReason] = useState('');

  const reportMutation = useMutation({
    mutationFn: async () => {
      const user = auth.currentUser;
      if (!user) {
        throw new Error('You must be signed in to submit a report.');
      }

      const payload = {
        listing_id: listingId.trim(),
        reason: reason.trim(),
        status: 'pending',            // keep same initial status
        reporter_uid: user.uid,       // who reported
        created_at: serverTimestamp() // Firestore server timestamp
      };

      if (!payload.listing_id || !payload.reason) {
        throw new Error('Listing ID and reason are required.');
      }

      await addDoc(collection(db, 'reports'), payload);
    },
  });

  return (
    <div className="max-w-xl mx-auto p-6">
      <h1 className="text-xl font-semibold">Report Listing</h1>

      <div className="mt-4 space-y-4">
        <input
          className="w-full border rounded p-2"
          placeholder="Listing ID"
          value={listingId}
          onChange={(e) => setListingId(e.target.value)}
          disabled={reportMutation.isPending}
        />

        <textarea
          className="w-full border rounded p-2"
          placeholder="Reason for reporting"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          disabled={reportMutation.isPending}
        />

        <button
          className="px-4 py-2 bg-red-600 text-white rounded disabled:opacity-60"
          onClick={() => reportMutation.mutate()}
          disabled={reportMutation.isPending}
        >
          {reportMutation.isPending ? 'Submitting…' : 'Submit Report'}
        </button>

        {reportMutation.isSuccess && (
          <p className="text-green-600">Report submitted!</p>
        )}

        {reportMutation.isError && (
          <p className="text-red-600 text-sm">
            {(reportMutation.error as Error)?.message || 'Could not submit report.'}
          </p>
        )}
      </div>
    </div>
  );
}

export default withRoleGuard(ReportContent, ['customer', 'agent', 'admin', 'superadmin']);
