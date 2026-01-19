
// src/pages/auth/EmailVerificationPending.tsx
import React from 'react';

export default function EmailVerificationPending() {
  return (
    <div className="max-w-lg mx-auto p-6">
      <h1 className="text-xl font-semibold">Check your email</h1>
      <p className="mt-2 text-sm text-gray-600">
        We sent a verification link to your email. Please verify to continue.
      </p>
    </div>
  );
}