
// apps/web/app/listings/page.tsx
import { supabaseServer } from '@/supabase/server';
import Link from 'next/link';

export default async function ListingsPage({ searchParams }: { searchParams: { city?: string; type?: string } }) {
  const city = searchParams?.city;
  const type = searchParams?.type; // rent | sale | lease
  const db = supabaseServer();

  let query = db.from('properties')
    .select('id,title,price,currency,city,country,bedrooms,bathrooms,property_images(storage_path,is_cover),promoted_until,status,listing_type')
    .eq('status', 'published');

  if (city) query = query.eq('city', city);
  if (type) query = query.eq('listing_type', type);

  const { data: listings } = await query;

  return (
    <main className="mx-auto max-w-7xl px-4 py-8">
      <h1 className="text-2xl font-bold">Properties {city ? `in ${city}` : ''}</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
        {(listings ?? []).map((l:any) => {
          const cover = l.property_images?.find((i:any)=>i.is_cover)?.storage_path;
          const imgUrl = cover
            ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/property-media/${cover}`
            : '/placeholder.svg';

          return (
            <Link key={l.id} href={`/listing/${l.id}`} className="group rounded-xl border bg-card hover:shadow-lg transition">
              <div className="aspect-[4/3] relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={imgUrl} alt={l.title} className="object-cover w-full h-full rounded-t-xl" />
                {l.promoted_until && (
                  <span className="absolute top-3 left-3 bg-orange-600 text-white px-2 py-1 text-xs rounded">Promoted</span>
                )}
              </div>
              <div className="p-4">
                <h3 className="text-lg font-semibold line-clamp-1">{l.title}</h3>
                <p className="text-sm text-muted-foreground">{l.city}, {l.country}</p>
                <p className="mt-2 font-bold">
                  {new Intl.NumberFormat('en-KE',{ style:'currency', currency: l.currency || 'KES'}).format(Number(l.price))}
                </p>
                <p className="text-sm text-muted-foreground capitalize">For {l.listing_type}</p>
              </div>
            </Link>
          );
        })}
      </div>
    </main>
  );
}
