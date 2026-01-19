
// src/pages/Reauth.tsx
import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'sonner';
import { auth } from '@/lib/firebaseClient';
import { EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';

export default function Reauth() {
  const [email, setEmail] = useState(auth.currentUser?.email || '');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();
  const location = useLocation();

  async function handleReauth() {
    try {
      const user = auth.currentUser;
      if (!user) {
        toast.error('You need to be signed in.');
        navigate('/auth');
        return;
      }
      const cred = EmailAuthProvider.credential(email, password);
      await reauthenticateWithCredential(user, cred);
      toast.success('Identity confirmed.');
      const redirectTo = (location.state as any)?.redirectTo || '/account/delete';
      navigate(redirectTo, { replace: true });
    } catch (e: any) {
      toast.error(e?.message || 'Re-authentication failed.');
    }
  }

  return (
    <div className="max-w-md mx-auto p-6">
      <h1 className="text-xl font-semibold">Confirm Your Identity</h1>
      <p className="text-sm text-gray-600 mb-4">
        For security, please sign in again to continue.
      </p>
      <input
        type="email"
        className="border rounded px-3 py-2 w-full mb-3"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <input
        type="password"
        className="border rounded px-3 py-2 w-full mb-4"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <button className="btn btn-primary" onClick={handleReauth}>
        Continue
      </button>
    </div>
  );
}
