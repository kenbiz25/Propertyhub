
// src/pages/Support.tsx
import React from 'react';
import { withRoleGuard } from '../components/auth/withRoleGuard';

function Support() {
  return (
    <div className="max-w-xl mx-auto p-6">
      <h1 className="text-xl font-semibold">Support</h1>
      <p className="mt-2 text-sm text-gray-600">Need help? Contact us or browse FAQs.</p>
      {/* Add contact form or links */}
    </div>
  );
}

export default withRoleGuard(Support, ['customer', 'agent', 'admin', 'superadmin']);
