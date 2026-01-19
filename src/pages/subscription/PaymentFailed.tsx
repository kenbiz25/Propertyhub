
// src/pages/subscription/PaymentFailed.tsx
import React from 'react';
import { Link } from 'react-router-dom';
import { withRoleGuard } from '../../components/auth/withRoleGuard';

function PaymentFailed() {
  return (
    <div className="max-w-lg mx-auto p-6">
      <h1 className="text-xl font-semibold text-red-700">Payment Failed</h1>
      <p className="mt-2 text-sm text-gray-600">
        Your payment did not complete. Please try again or contact support.
      </p>
      <div className="mt-4 space-x-2">
        <Link to="/subscription/billing" className="px-4 py-2 bg-blue-600 text-white rounded">Try Again</Link>
        <Link to="/support" className="px-4 py-2 bg-gray-200 rounded">Contact Support</Link>
      </div>
    </div>
  );
}

export default withRoleGuard(PaymentFailed, ['customer', 'agent', 'admin', 'superadmin']);
