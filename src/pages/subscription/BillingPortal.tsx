
// src/pages/subscription/BillingPortal.tsx
import React from 'react';
import { withRoleGuard } from '../../components/auth/withRoleGuard';

function BillingPortal() {
  async function go() {
    // Hit your backend API to create a Stripe billing portal session
    // Then window.location.href = session.url
    try {
      const res = await fetch('/api/billing/portal', { method: 'POST' });
      const json = await res.json();
      if (json?.url) window.location.href = json.url;
    } catch (e) {
      console.error(e);
      alert('Failed to open billing portal');
    }
  }
  return (
    <div className="max-w-lg mx-auto p-6">
      <h1 className="text-xl font-semibold">Manage Billing</h1>
      <p className="mt-2 text-sm text-gray-600">Update your payment method, cancel or resume subscription.</p>
      <button className="mt-4 px-4 py-2 bg-blue-600 text-white rounded" onClick={go}>Open Billing Portal</button>
    </div>
  );
}

export default withRoleGuard(BillingPortal, ['customer', 'agent', 'admin', 'superadmin']);