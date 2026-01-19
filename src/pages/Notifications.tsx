
// src/pages/Notifications.tsx
import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { withRoleGuard } from '../components/auth/withRoleGuard';

// 🔥 Firebase
import {
  collection,
  query as fsQuery,
  where,
  orderBy,
  getDocs,
  updateDoc,
  doc,
} from 'firebase/firestore';
import { db, auth } from '@/lib/firebaseClient';

type Notification = {
  id: string;
  title: string;
  body: string;
  read: boolean;
  created_at: any; // Firestore Timestamp
  recipient_uid: string;
};

function Notifications() {
  const qc = useQueryClient();
  const user = auth.currentUser;

  const { data, isLoading, error } = useQuery<Notification[], Error>({
    queryKey: ['notifications', user?.uid],
    enabled: !!user, // only run when signed-in
    queryFn: async () => {
      if (!auth.currentUser) {
        throw new Error('You must be signed in to view notifications.');
      }
      const uid = auth.currentUser.uid;

      // Build Firestore query for this user's notifications
      const q = fsQuery(
        collection(db, 'notifications'),
        where('recipient_uid', '==', uid),
        orderBy('created_at', 'desc') // created_at should be a Firestore Timestamp
      );

      const snap = await getDocs(q);
      const items: Notification[] = snap.docs.map((d) => {
        const data = d.data() as Omit<Notification, 'id'>;
        return { id: d.id, ...data };
      });
      return items;
    },
  });

  const markRead = useMutation({
    mutationFn: async (id: string) => {
      // Update read=true
      const ref = doc(db, 'notifications', id);
      await updateDoc(ref, { read: true });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications', user?.uid] });
    },
  });

  if (!user) {
    return <div className="text-red-600">Please sign in to view notifications.</div>;
  }
  if (isLoading) return <div>Loading…</div>;
  if (error) return <div className="text-red-600">Error loading notifications: {error.message}</div>;

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-xl font-semibold">Notifications</h1>
      <div className="mt-4 space-y-3">
        {data?.map((n) => {
          const created = n.created_at?.toDate?.() ?? new Date(); // defensive
          return (
            <div
              key={n.id}
              className={`p-3 border rounded ${n.read ? 'bg-white' : 'bg-yellow-50'}`}
            >
              <div className="text-sm text-gray-600">{created.toLocaleString()}</div>
              <div className="font-semibold">{n.title}</div>
              <div className="text-sm">{n.body}</div>
              {!n.read && (
                <button
                  className="mt-2 px-3 py-1 bg-blue-600 text-white rounded disabled:opacity-60"
                  onClick={() => markRead.mutate(n.id)}
                  disabled={markRead.isPending}
                >
                  {markRead.isPending ? 'Marking…' : 'Mark as read'}
                </button>
              )}
            </div>
          );
        })}
        {data?.length === 0 && (
          <div className="text-sm text-gray-500">No notifications yet.</div>
        )}
      </div>
    </div>
  );
}

export default withRoleGuard(Notifications, ['customer', 'agent', 'admin', 'superadmin']);
