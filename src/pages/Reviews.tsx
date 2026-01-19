
// src/pages/Reviews.tsx
import React from 'react';
import { withRoleGuard } from '../components/auth/withRoleGuard';
function Reviews() {
  return <div className="max-w-4xl mx-auto p-6">Reviews go here…</div>;
}
export default withRoleGuard(Reviews, ['customer', 'agent', 'admin', 'superadmin']);