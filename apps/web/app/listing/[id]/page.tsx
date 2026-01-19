
// apps/web/app/listing/[id]/page.tsx
import { supabaseServer } from '@/supabase/server';
import MapEmbed from '@/components/maps/MapEmbed';

export default async function ListingPage({ params }: { params: { id: string } }) {
  const db = supabaseServer();
  const { data: property } = await db
    .from('properties')
    .select('*, property_images(*)')
    .eq('id', params.id)
    .single();

  if (!property) return <main className="p-8">Listing not found</main>;

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 space-y-8">
      {/* Gallery */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {property.property_images?.map((img:any)=>(
          <img
            key={img.id}
            src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/property-media/${img.storage_path}`}
            className="rounded-xl object-cover w-full h-64"
          />
        ))}
      </div>

      {/* Summary */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-2">
          <h1 className="text-2xl font-bold">{property.title}</h1>
          <p className="text-muted-foreground">{property.address}</p>
          <p className="mt-4">{property.description}</p>
          <MapEmbed lat={property.lat} lng={property.lng} />
        </div>
        <aside className="space-y-4">
          <div className="rounded-xl border p-4">
            <p className="text-3xl font-extrabold">
              {new Intl.NumberFormat('en-KE',{ style:'currency', currency: property.currency || 'KES'}).format(Number(property.price))}
            </p>
            <p className="text-sm text-muted-foreground">{property.listing_type?.toUpperCase()}</p>
          </div>
        </aside>
      </section>
    </main>
  );
}
