
// src/pages/agent/AgentKyc.tsx
import React from 'react';
import { withRoleGuard } from '../../components/auth/withRoleGuard';

function AgentKyc() {
  return (
    <div className="max-w-xl mx-auto p-6">
      <h1 className="text-xl font-semibold">Agent Verification (KYC)</h1>
      <p className="mt-2 text-sm text-gray-600">Upload ID documents and fill verification info.</p>
      {/* File upload & form fields */}
    </div>
  );
}

export default withRoleGuard(AgentKyc, ['agent', 'admin', 'superadmin']);
