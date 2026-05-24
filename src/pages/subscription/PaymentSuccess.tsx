
// src/pages/subscription/PaymentSuccess.tsx
import React from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { withRoleGuard } from '../../components/auth/withRoleGuard';
import SEO from "@/components/SEO";

function PaymentSuccess() {
  const [params] = useSearchParams();
  const sessionId = params.get('session_id');

  return (
    <div className="max-w-lg mx-auto p-6">
      <SEO title="Payment Successful" noindex={true} />
      <h1 className="text-xl font-semibold text-green-700">Payment Successful 🎉</h1>
      {sessionId && <p className="mt-2 text-sm text-gray-600">Session: {sessionId}</p>}
      <p className="mt-2">Your subscription has been activated. You can now access agent features.</p>
      <Link to="/post-login" className="mt-4 inline-block px-4 py-2 bg-blue-600 text-white rounded">Go to Dashboard</Link>
    </div>
  );
}

export default withRoleGuard(PaymentSuccess, ['customer', 'agent', 'admin', 'superadmin']);