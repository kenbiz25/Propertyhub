
// src/pages/agent/TeamMembers.tsx
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../supabaseClient';
import { withRoleGuard } from '../../components/auth/withRoleGuard';

function TeamMembers() {
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ['team-members'],
    queryFn: async () => {
      const { data, error } = await supabase.from('team_members').select('*');
      if (error) throw error;
      return data;
    },
  });

  const [email, setEmail] = useState('');
  const inviteMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('team_members').insert({ email });
      if (error) throw error;
    },
    onSuccess: () => {
      setEmail('');
      qc.invalidateQueries({ queryKey: ['team-members'] });
    },
  });

  return (
    <div className="max-w-xl mx-auto p-6">
      <h1 className="text-xl font-semibold">Team Members</h1>
      <div className="mt-4 space-y-4">
        <input
          className="w-full border rounded p-2"
          placeholder="Assistant email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <button
          className="px-4 py-2 bg-blue-600 text-white rounded"
          onClick={() => inviteMutation.mutate()}
        >
          Invite
        </button>
      </div>
      <div className="mt-6">
        <h2 className="text-lg font-semibold">Current Team</h2>
        <ul className="mt-2 space-y-2">
          {data?.map((m) => (
            <li key={m.id} className="p-2 border rounded">{m.email}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default withRoleGuard(TeamMembers, ['agent', 'admin', 'superadmin']);