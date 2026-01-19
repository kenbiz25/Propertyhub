
// src/pages/Search.tsx
import React, { useState } from 'react';
import { withRoleGuard } from '../components/auth/withRoleGuard';

// 🔥 Firestore imports (modular SDK v10+)
import { collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebaseClient'; // <-- see setup in section 2

type Property = {
  id: string;
  title: string;
  price: number;
  location: string;
  bedrooms: number;
  published: boolean;
  thumbnail_url?: string;
};

function Search() {
  const [q, setQ] = useState('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [bedrooms, setBedrooms] = useState('');
  const [results, setResults] = useState<Property[]>([]);
  const [loading, setLoading] = useState(false);
  const [errMsg, setErrMsg] = useState<string | null>(null);

  async function runSearch() {
    setLoading(true);
    setErrMsg(null);

    try {
      // Build Firestore constraints
      const constraints: any[] = [where('published', '==', true)];

      if (bedrooms) constraints.push(where('bedrooms', '==', Number(bedrooms)));

      // Firestore supports range queries on a single field (here: price).
      // Using >= and <= on price is fine; pair it with orderBy('price').
      if (minPrice) constraints.push(where('price', '>=', Number(minPrice)));
      if (maxPrice) constraints.push(where('price', '<=', Number(maxPrice)));

      const qRef = query(
        collection(db, 'properties'),
        ...constraints,
        orderBy('price'), // order by the same field used in range queries
        limit(50)
      );

      const snap = await getDocs(qRef);
      let items: Property[] = snap.docs.map((d) => {
        const data = d.data() as Omit<Property, 'id'>;
        // Ensure numeric price (in case your stored type is string)
        const price = typeof data.price === 'string' ? Number(data.price) : data.price;
        return { id: d.id, ...data, price };
      });

      // Client-side keyword filter (case-insensitive substring match)
      if (q.trim()) {
        const qLower = q.toLowerCase();
        items = items.filter((p) => p.title?.toLowerCase().includes(qLower));
      }

      setResults(items);
    } catch (e: any) {
      // If a Firestore index is required, Firebase will throw with a link to create it.
      setErrMsg(e?.message || 'Search failed');
      console.error('[Search] Firestore query error:', e);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-xl font-semibold">Search Properties</h1>

      <div className="mt-4 grid grid-cols-1 md:grid-cols-4 gap-2">
        <input
          className="border rounded p-2"
          placeholder="Keywords"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <input
          className="border rounded p-2"
          placeholder="Min price"
          value={minPrice}
          onChange={(e) => setMinPrice(e.target.value)}
        />
        <input
          className="border rounded p-2"
          placeholder="Max price"
          value={maxPrice}
          onChange={(e) => setMaxPrice(e.target.value)}
        />
        <input
          className="border rounded p-2"
          placeholder="Bedrooms"
          value={bedrooms}
          onChange={(e) => setBedrooms(e.target.value)}
        />
      </div>

      <button
        className="mt-3 px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-60"
        onClick={runSearch}
        disabled={loading}
      >
        {loading ? 'Searching…' : 'Search'}
      </button>

      {errMsg && (
        <div className="mt-3 text-red-600 text-sm">
          {errMsg}
        </div>
      )}

      <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        {results.map((p) => (
          <div key={p.id} className="border rounded p-3">
            {p.thumbnail_url && (
              <img
                src={p.thumbnail_url}
                alt={p.title}
                className="w-full h-40 object-cover rounded"
              />
            )}
            <div className="mt-2 font-semibold">{p.title}</div>
            <div className="text-sm text-gray-600">
              {p.location} • {p.bedrooms} BR
            </div>
            <div className="text-sm font-bold mt-1">
              ${Number(p.price || 0).toLocaleString()}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default withRoleGuard(Search, ['customer', 'agent', 'admin', 'superadmin']);
