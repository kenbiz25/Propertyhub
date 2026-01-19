
// scripts/seed-users.mjs
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const url = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. Check your .env in project root.');
  process.exit(1);
}

const admin = createClient(url, serviceKey);

const SEED_USERS = [
  { email: 'customer@test.com',   password: 'Passw0rd!', role: 'customer' },
  { email: 'agent@test.com',      password: 'Passw0rd!', role: 'agent' },
  { email: 'admin@test.com',      password: 'Passw0rd!', role: 'admin' },
  { email: 'superadmin@test.com', password: 'Passw0rd!', role: 'superadmin' },
];

async function findUserByEmail(email) {
  let page = 1;
  const perPage = 200;
  for (;;) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error) throw error;
    const users = data?.users || [];
    const match = users.find(u => (u.email || '').toLowerCase() === email.toLowerCase());
    if (match) return match;
    if (users.length < perPage) return null;
    page += 1;
  }
}

async function ensureUser({ email, password, role }) {
  let user = await findUserByEmail(email);

  if (!user) {
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: email.split('@')[0] },
    });
    if (error) throw error;
    user = data.user;
    console.log(`Created user: ${email} → ${user.id}`);
  } else {
    console.log(`User exists: ${email} → ${user.id}`);
  }

  const { error: upsertErr } = await admin
    .from('profiles')
    .upsert(
      {
        id: user.id,
        role,
        kyc_verified: false,
        subscription_active: false,
      },
      { onConflict: 'id' }
    );

  if (upsertErr) throw upsertErr;
  console.log(`Upserted profile: ${email} → role=${role}`);
}

(async () => {
  try {
    for (const u of SEED_USERS) {
      await ensureUser(u);
    }
    console.log('✅ Seeding complete.');
  } catch (e) {
    console.error('❌ Seeding failed:', e?.message ?? e);
    process.exit(1);
  }
})();
