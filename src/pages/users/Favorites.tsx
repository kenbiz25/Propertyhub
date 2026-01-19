
// src/pages/Favorites.tsx
import React from 'react';
import { withRoleGuard } from '../../components/auth/withRoleGuard';
function Favorites() {
  return <div className="max-w-4xl mx-auto p-6">Favorites go here…</div>;
}
export default withRoleGuard(Favorites, ['customer', 'agent', 'admin', 'superadmin']);