
// src/pages/SavedSearches.tsx
import React from 'react';
import { withRoleGuard } from '../components/auth/withRoleGuard';
function SavedSearches() {
  return <div className="max-w-4xl mx-auto p-6">Saved searches go here…</div>;
}
export default withRoleGuard(SavedSearches, ['customer', 'agent', 'admin', 'superadmin']);
