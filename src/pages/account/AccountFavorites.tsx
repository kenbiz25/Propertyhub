
import { useEffect, useState } from "react";
import { auth, db } from "@/lib/firebaseClient";
import { collection, onSnapshot, getDoc, doc } from "firebase/firestore";
import { Link } from "react-router-dom";
import { MapPin, Bed, Bath, Square } from "lucide-react";

type Property = {
  id: string; title: string; city: string; neighborhood: string;
  bedrooms: number; bathrooms: number; area: number; image?: string;
  type: string; price: number;
};

export default function AccountFavorites() {
  const u = auth.currentUser;
  const [items, setItems] = useState<Property[]>([]);

  useEffect(() => {
    if (!u) return;
    const favCol = collection(db, "user_favorites", u.uid, "properties");
    const unsub = onSnapshot(favCol, async (snap) => {
      const results: Property[] = [];
      for (const d of snap.docs) {
        const ref = d.data()?.property_ref;
        if (ref?.path) {
          const psnap = await getDoc(doc(db, ref.path));
          if (psnap.exists()) {
            const p = psnap.data() as any;
            results.push({
              id: psnap.id,
              title: p?.title ?? "Untitled",
              city: p?.city ?? "",
              neighborhood: p?.neighborhood ?? "",
              bedrooms: Number(p?.bedrooms ?? 0),
              bathrooms: Number(p?.bathrooms ?? 0),
              area: Number(p?.area ?? 0),
              image: (p?.images ?? p?.image_urls ?? [])[0],
              type: p?.type ?? "sale",
              price: Number(p?.price ?? 0),
            });
          }
        }
      }
      setItems(results);
    });
    return () => unsub();
  }, [u?.uid]);

  if (!u) return <div className="p-6">Please sign in to view your saved properties.</div>;

  return (
    <div>
      {items.length === 0 ? (
        <div className="text-muted-foreground">You haven’t saved any properties yet.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {items.map((listing) => (
            <Link key={listing.id} to={`/listing/${listing.id}`} className="group glass-card rounded-2xl overflow-hidden hover-lift">
              <div className="relative aspect-[4/3]">
                {listing.image ? <img src={listing.image} alt={listing.title} className="w-full h-full object-cover" /> : <div className="w-full h-full bg-muted" />}
              </div>
              <div className="p-5">
                <h3 className="font-display font-semibold text-lg line-clamp-1 group-hover:text-primary transition-colors">{listing.title}</h3>
                <div className="flex items-center gap-1 text-muted-foreground text-sm mb-3">
                  <MapPin className="w-4 h-4" />
                  {listing.neighborhood}, {listing.city}
                </div>
                <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                  {listing.bedrooms > 0 && <span className="flex items-center gap-1"><Bed className="w-4 h-4" />{listing.bedrooms}</span>}
                  <span className="flex items-center gap-1"><Bath className="w-4 h-4" />{listing.bathrooms}</span>
                  <span className="flex items-center gap-1"><Square className="w-4 h-4" />{listing.area} m²</span>
                </div>
                <div className="pt-4 border-t border-border">
                  <p className="font-display font-bold text-xl text-primary">
                    KES {new Intl.NumberFormat("en-KE").format(listing.price)}
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
