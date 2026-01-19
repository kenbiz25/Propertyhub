
// src/pages/DeleteAccount.tsx
import React from 'react';
import { withRoleGuard } from '../components/auth/withRoleGuard';
import { auth, db } from '@/lib/firebaseClient';
import { doc, deleteDoc } from 'firebase/firestore';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

function DeleteAccount() {
  const navigate = useNavigate();

  async function handleDelete() {
    const ok = window.confirm(
      'Are you sure you want to delete your account? This action is irreversible.'
    );
    if (!ok) return;

    try {
      // Ensure user is present
      const user = auth.currentUser;
      if (!user) {
        toast.error('You must be signed in to delete your account.');
        navigate('/auth');
        return;
      }

      // 1) Delete user-owned profile doc (client-side)
      //    If your profile doc id == uid (recommended), this is straightforward.
      const profileRef = doc(db, 'profiles', user.uid);
      try {
        await deleteDoc(profileRef);
      } catch (e) {
        // Non-fatal: profile may not exist or rules may deny; we log and continue.
        console.warn('[DeleteAccount] Failed to delete profile doc:', e);
      }

      // 2) Call Cloud Function to cascade delete user content (properties, messages, reports, images)
      //    This avoids doing many deletes from the client and enforces admin privileges securely.
      //    If you haven't deployed this yet, skip—see section 3 for implementation.
      // await httpsCallable(getFunctions(), 'cascadeDeleteUser')({ uid: user.uid });

      // 3) Delete the Auth user (requires recent login)
      await user.delete();

      // 4) Sign out locally just in case and redirect home
      await auth.signOut();
      toast.success('Your account has been deleted.');
      window.location.href = '/';
    } catch (err: any) {
      // Firebase often throws `auth/requires-recent-login` for sensitive ops like delete()
      if (err?.code === 'auth/requires-recent-login') {
        toast.warning('Please re-authenticate to delete your account.');
        // Send user to a reauth page; return-to ensures they land back here afterwards.
        navigate('/reauth', { state: { redirectTo: '/account/delete' } });
        return;
      }

      console.error('[DeleteAccount] Error:', err);
      toast.error(err?.message || 'Failed to delete account.');
    }
  }

  return (
    <div className="max-w-lg mx-auto p-6">
      <h1 className="text-xl font-semibold text-red-700">Delete Account</h1>
      <p className="mt-2 text-sm text-gray-600">
        This will permanently remove your data and cannot be undone.
      </p>
      <button
        className="mt-4 px-4 py-2 bg-red-600 text-white rounded"
        onClick={handleDelete}
      >
        Delete My Account
      </button>
    </div>
  );
}

export default withRoleGuard(DeleteAccount, ['customer', 'agent', 'admin', 'superadmin']);