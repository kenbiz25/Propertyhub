
import { useEffect, useMemo, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft, Heart, Share2, MapPin, Bed, Bath, Square, Car,
  Wifi, AirVent, Shield, Waves, Trees, ChevronLeft, ChevronRight,
  Phone, Calendar, CheckCircle, Star, MessageCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import Navbar from "@/components/layouts/Navbar";
import Footer from "@/components/layouts/Footer";
import { FavoriteButton } from "@/components/FavoriteButton";
import { useFavorites } from "@/hooks/useFavorites";


import { auth, db } from "@/lib/firebaseClient";
import {
  doc, getDoc, collection, query as fsQuery,
  where, orderBy, getDocs, limit, serverTimestamp,
  setDoc, deleteDoc
} from "firebase/firestore";

// ---------- Mock fallback (keeps UX rich during migration) ----------
const mockListing = {
  id: "1",
  title: "Luxury 4BR Villa in Karen",
  description: `This stunning 4-bedroom villa in the prestigious Karen neighborhood offers the perfect blend of luxury and comfort. Set on a beautifully landscaped 0.5-acre plot, the property features high ceilings, natural light throughout, and premium finishes.

The main house includes a spacious living room with a fireplace, a modern open-plan kitchen with granite countertops and top-of-the-line appliances, a formal dining room, and a family room. The master suite features a walk-in closet and an en-suite bathroom with a jacuzzi.

Additional features include a detached staff quarters, a double garage, a swimming pool, and mature gardens with indigenous trees. The property is located in a secure gated community with 24-hour security.`,
  price: 45000000,
  type: "sale",
  city: "Nairobi",
  neighborhood: "Karen",
  address: "Karen Road, off Langata Road",
  bedrooms: 4,
  bathrooms: 3,
  area: 350,
  plotSize: 2000,
  yearBuilt: 2019,
  parking: 2,
  verified: true,
  promoted: true,
  images: [
    "https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=1200",
    "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1200",
    "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=1200",
    "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1200",
    "https://images.unsplash.com/photo-1600573472550-8090b5e0745e?w=1200",
  ],
  amenities: ["wifi", "air_conditioning", "security", "pool", "garden", "parking"],
  agent: {
    name: "Grace Wanjiku",
    phone: "+254 712 345 678",
    email: "grace@househunter.co.ke",
    image: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400",
    listings: 24,
    rating: 4.9,
  },
  lat: -1.3179,
  lng: 36.7001,
};

type Review = {
  id: string;
  author: string;
  rating: number;
  comment: string;
  date: string;
};

// ---------- Amenity icon mapping ----------
const amenityIconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  wifi: Wifi,
  air_conditioning: AirVent,
  security: Shield,
  pool: Waves,
  garden: Trees,
  parking: Car,
};

// ---------- Utils ----------
const formatPrice = (price: number) => new Intl.NumberFormat("en-KE").format(Number(price || 0));

const toReview = (d: any, id: string): Review => ({
  id,
  author: d?.author_name ?? "Anonymous",
  rating: Number(d?.rating ?? 0),
  comment: d?.comment ?? "",
  date: d?.created_at?.toDate?.()?.toLocaleDateString?.() ?? "",
});

const ListingDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [currentImage, setCurrentImage] = useState(0);
  const [isFavorite, setIsFavorite] = useState(false);
  const [loading, setLoading] = useState(true);
  const [listing, setListing] = useState<any | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const user = auth.currentUser;

  // Load listing by id
  useEffect(() => {
    let alive = true;
    (async () => {
      if (!id) {
        navigate("/listings");
        return;
      }
      setLoading(true);
      try {
        const ref = doc(db, "properties", id);
        const snap = await getDoc(ref);

        if (snap.exists()) {
          const d = snap.data();

          // Normalize fields to your UI shape
          const images: string[] = d?.images ?? d?.image_urls ?? [];
          const amenities: string[] = d?.amenities ?? [];
          const agent = d?.agent ?? {
            name: d?.agent_name ?? "Agent",
            phone: d?.agent_phone ?? "",
            email: d?.agent_email ?? "",
            image: d?.agent_image ?? "",
            listings: d?.agent_listings ?? 0,
            rating: d?.agent_rating ?? 0,
          };

          const normalized = {
            id: snap.id,
            title: d?.title ?? "Untitled",
            description: d?.description ?? "",
            price: Number(d?.price ?? 0),
            type: d?.type ?? "sale",
            city: d?.city ?? d?.location ?? "",
            neighborhood: d?.neighborhood ?? "",
            address: d?.address ?? d?.location ?? "",
            bedrooms: Number(d?.bedrooms ?? 0),
            bathrooms: Number(d?.bathrooms ?? 0),
            area: Number(d?.area ?? 0),
            plotSize: Number(d?.plotSize ?? d?.plot_size ?? 0),
            yearBuilt: Number(d?.yearBuilt ?? d?.year_built ?? 0),
            parking: Number(d?.parking ?? 0),
            verified: Boolean(d?.verified ?? d?.isVerified ?? false),
            promoted: Boolean(d?.featured ?? d?.promoted ?? false),
            images: images.length ? images : mockListing.images,
            amenities: amenities.length ? amenities : mockListing.amenities,
            agent,
            lat: Number(d?.lat ?? 0),
            lng: Number(d?.lng ?? 0),
          };

          if (alive) setListing(normalized);
        } else {
          // Fallback to mock (keeps page styled)
          if (alive) setListing(mockListing);
        }
      } catch (e) {
        console.error("[ListingDetail] load error:", e);
        // Fallback to mock so page still renders
        if (alive) setListing(mockListing);
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [id, navigate]);

  // Load reviews for this property
  useEffect(() => {
    let alive = true;
    (async () => {
      if (!id) return;
      try {
        const q = fsQuery(
          collection(db, "reviews"),
          where("property_id", "==", id),
          orderBy("created_at", "desc"),
          limit(10)
        );
        const snap = await getDocs(q);
        const items = snap.docs.map((d) => toReview(d.data(), d.id));
        if (alive) setReviews(items);
      } catch (e) {
        console.warn("[ListingDetail] reviews load error:", e);
        // Optional: keep your mockReviews if you have them
      }
    })();
    return () => {
      alive = false;
    };
  }, [id]);

  // Favorite state for signed-in user
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        if (!user || !id) {
          setIsFavorite(false);
          return;
        }
        const favRef = doc(db, "user_favorites", user.uid, "properties", id);
        const favSnap = await getDoc(favRef);
        if (alive) setIsFavorite(favSnap.exists());
      } catch (e) {
        console.warn("[ListingDetail] favorite check failed:", e);
      }
    })();
    return () => {
      alive = false;
    };
  }, [user, id]);

  const toggleFavorite = async () => {
    try {
      if (!user || !id) {
        // Optional: redirect to auth
        navigate("/auth", { state: { from: `/listing/${id}` } });
        return;
      }
      const favRef = doc(db, "user_favorites", user.uid, "properties", id);
      if (isFavorite) {
        await deleteDoc(favRef);
        setIsFavorite(false);
      } else {
        await setDoc(favRef, {
          created_at: serverTimestamp(),
          property_ref: doc(db, "properties", id),
        });
        setIsFavorite(true);
      }
    } catch (e) {
      console.error("[ListingDetail] toggleFavorite error:", e);
    }
  };

  const amenityTiles = useMemo(() => {
    const items = Array.isArray(listing?.amenities)
      ? listing!.amenities
      : [];
    return items.map((slug: any) => {
      const key = typeof slug === "string" ? slug : slug?.name?.toLowerCase?.();
      const Icon = amenityIconMap[key as string] ?? Trees; // default icon
      const name =
        typeof slug === "string" ? slug.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()) :
        slug?.name ?? "Amenity";
      return { icon: Icon, name };
    });
  }, [listing]);

  // Early states
  if (loading || !listing) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="pt-16">
          <div className="container mx-auto px-4">
            <div className="p-6 text-muted-foreground">Loading property…</div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="pt-16">
        {/* Breadcrumb */}
        <div className="bg-card border-b border-border py-4">
          <div className="container mx-auto px-4">
            <div className="flex items-center gap-2 text-sm">
              <Link
                to="/listings"
                className="text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Listings
              </Link>
              <span className="text-muted-foreground">/</span>
              <span className="text-foreground">{listing.title}</span>
            </div>
          </div>
        </div>

        {/* Image Gallery */}
        <section className="relative">
          <div className="aspect-[16/9] md:aspect-[21/9] relative overflow-hidden">
            <img
              src={listing.images[currentImage]}
              alt={listing.title}
              className="w-full h-full object-cover"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background/60 via-transparent to-transparent" />

            {/* Gallery Controls */}
            <button
              onClick={() =>
                setCurrentImage((prev) => (prev - 1 + listing.images.length) % listing.images.length)
              }
              className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-background/80 backdrop-blur-sm flex items-center justify-center hover:bg-background transition-colors"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            <button
              onClick={() =>
                setCurrentImage((prev) => (prev + 1) % listing.images.length)
              }
              className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-background/80 backdrop-blur-sm flex items-center justify-center hover:bg-background transition-colors"
            >
              <ChevronRight className="w-6 h-6" />
            </button>

            {/* Image Counter */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full bg-background/80 backdrop-blur-sm text-sm">
              {currentImage + 1} / {listing.images.length}
            </div>
            

              
<div className="absolute top-4 right-4 flex gap-2">
  <FavoriteButton
    active={id ? isFavorite(id) : false}
    onToggle={async () => {
      try {
        if (!auth.currentUser) {
          navigate("/auth", { state: { from: `/listing/${id}` } });
          return;
        }
        if (id) await toggleFavorite(id);
      } catch (err: any) {
        if (err?.message === "AUTH_REQUIRED") {
          navigate("/auth", { state: { from: `/listing/${id}` } });
        } else {
          console.error("[ListingDetail] toggleFavorite error:", err);
        }
      }
    }}
  />
  <button className="w-12 h-12 rounded-full bg-background/80 backdrop-blur-sm flex items-center justify-center hover:bg-background transition-colors">
    <Share2 className="w-5 h-5" />
  </button>
</div>



            {/* Action Buttons */}
            <div className="absolute top-4 right-4 flex gap-2">
              <button
                onClick={toggleFavorite}
                className={`w-12 h-12 rounded-full backdrop-blur-sm flex items-center justify-center transition-colors ${
                  isFavorite ? "bg-primary text-primary-foreground" : "bg-background/80 hover:bg-background"
                }`}
              >
                <Heart className={`w-5 h-5 ${isFavorite ? "fill-current" : ""}`} />
              </button>
              <button className="w-12 h-12 rounded-full bg-background/80 backdrop-blur-sm flex items-center justify-center hover:bg-background transition-colors">
                <Share2 className="w-5 h-5" />
              </button>
            </div>

            {/* Badges */}
            <div className="absolute top-4 left-4 flex gap-2">
              {listing.verified && (
                <span className="px-3 py-1 rounded-full bg-green-600 text-white text-sm font-medium flex items-center gap-1">
                  <CheckCircle className="w-4 h-4" />
                  Verified
                </span>
              )}
              {listing.promoted && (
                <span className="px-3 py-1 rounded-full bg-primary text-primary-foreground text-sm font-medium">
                  Featured
                </span>
              )}
            </div>
          </div>

          {/* Thumbnail Strip */}
          <div className="container mx-auto px-4 -mt-12 relative z-10">
            <div className="flex gap-2 overflow-x-auto pb-4">
              {listing.images.map((img: string, index: number) => (
                <button
                  key={index}
                  onClick={() => setCurrentImage(index)}
                  className={`flex-shrink-0 w-24 h-16 rounded-lg overflow-hidden border-2 transition-colors ${
                    currentImage === index ? "border-primary" : "border-transparent opacity-70 hover:opacity-100"
                  }`}
                >
                  <img src={img} alt="" className="w-full h-full object-cover" loading="lazy" />
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Content */}
        <section className="py-8">
          <div className="container mx-auto px-4">
            <div className="grid lg:grid-cols-3 gap-8">
              {/* Main Content */}
              <div className="lg:col-span-2 space-y-8">
                {/* Header */}
                <div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                    <MapPin className="w-4 h-4" />
                    {listing.address}{listing.neighborhood ? `, ${listing.neighborhood}` : ""}{listing.city ? `, ${listing.city}` : ""}
                  </div>
                  <h1 className="font-display text-3xl md:text-4xl font-bold mb-4">
                    {listing.title}
                  </h1>
                  <div className="flex flex-wrap gap-6 text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <Bed className="w-5 h-5" />
                      <span>{listing.bedrooms} Bedrooms</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Bath className="w-5 h-5" />
                      <span>{listing.bathrooms} Bathrooms</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Square className="w-5 h-5" />
                      <span>{listing.area} m²</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Car className="w-5 h-5" />
                      <span>{listing.parking} Parking</span>
                    </div>
                  </div>
                </div>

                {/* Price Card Mobile */}
                <div className="lg:hidden glass-card rounded-2xl p-6">
                  <p className="text-muted-foreground text-sm mb-1 capitalize">For {listing.type}</p>
                  <p className="font-display text-3xl font-bold text-primary mb-4">
                    KES {formatPrice(listing.price)}
                  </p>
                  <Button className="w-full" size="lg">
                    <MessageCircle className="w-5 h-5 mr-2" />
                    Contact Agent
                  </Button>
                </div>

                {/* Description */}
                <div className="glass-card rounded-2xl p-6">
                  <h2 className="font-display text-xl font-semibold mb-4">Description</h2>
                  <div className="prose prose-invert max-w-none">
                    {(listing.description || "").split("\n\n").map((paragraph: string, index: number) => (
                      <p key={index} className="text-muted-foreground mb-4">
                        {paragraph}
                      </p>
                    ))}
                  </div>
                </div>

                {/* Amenities */}
                <div className="glass-card rounded-2xl p-6">
                  <h2 className="font-display text-xl font-semibold mb-4">Amenities</h2>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {amenityTiles.map((amenity, index) => {
                      const Icon = amenity.icon;
                      return (
                        <div key={index} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                            <Icon className="w-5 h-5 text-primary" />
                          </div>
                          <span className="text-sm">{amenity.name}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Map */}
                {listing.lat && listing.lng && (
                  <div className="glass-card rounded-2xl p-6">
                    <h2 className="font-display text-xl font-semibold mb-4">Location</h2>
                    <div className="aspect-[16/9] rounded-xl overflow-hidden">
                      <iframe
                        src={`https://maps.google.com/maps?q=${listing.lat},${listing.lng}&z=15&output=embed`}
                        className="w-full h-full"
                        loading="lazy"
                      />
                    </div>
                  </div>
                )}

                {/* Reviews */}
                <div className="glass-card rounded-2xl p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="font-display text-xl font-semibold">Reviews</h2>
                    <Button variant="outline" size="sm">Write a Review</Button>
                  </div>

                  <div className="space-y-4">
                    {reviews.length === 0 && (
                      <div className="text-sm text-muted-foreground">No reviews yet.</div>
                    )}
                    {reviews.map((review) => (
                      <div key={review.id} className="p-4 rounded-xl bg-muted/50">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center font-semibold">
                              {review.author.charAt(0)}
                            </div>
                            <div>
                              <p className="font-medium">{review.author}</p>
                              <div className="flex items-center gap-1">
                                {[...Array(5)].map((_, i) => (
                                  <Star
                                    key={i}
                                    className={`w-3 h-3 ${
                                      i < review.rating ? "text-yellow-500 fill-yellow-500" : "text-muted"
                                    }`}
                                  />
                                ))}
                              </div>
                            </div>
                          </div>
                          <span className="text-sm text-muted-foreground">{review.date}</span>
                        </div>
                        <p className="text-muted-foreground">{review.comment}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Sidebar */}
              <div className="space-y-6">
                {/* Price Card */}
                <div className="hidden lg:block glass-card rounded-2xl p-6 sticky top-24">
                  <p className="text-muted-foreground text-sm mb-1 capitalize">For {listing.type}</p>
                  <p className="font-display text-3xl font-bold text-primary mb-6">
                    KES {formatPrice(listing.price)}
                  </p>

                  {/* Agent Card */}
                  <div className="flex items-center gap-4 mb-6 pb-6 border-b border-border">
                    {listing.agent?.image && (
                      <img
                        src={listing.agent.image}
                        alt={listing.agent.name}
                        className="w-16 h-16 rounded-full object-cover"
                        loading="lazy"
                      />
                    )}
                    <div>
                      <p className="font-semibold">{listing.agent?.name}</p>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                        {listing.agent?.rating ?? 0} • {listing.agent?.listings ?? 0} listings
                      </div>
                    </div>
                  </div>

                  {/* Contact Form */}
                  <form className="space-y-4">
                    <Input placeholder="Your Name" />
                    <Input type="email" placeholder="Your Email" />
                    <Input type="tel" placeholder="Phone Number" />
                    <Textarea placeholder="I'm interested in this property..." rows={3} />
                    <Button className="w-full" size="lg">
                      <MessageCircle className="w-5 h-5 mr-2" />
                      Send Message
                    </Button>
                  </form>

                  <div className="mt-4 pt-4 border-t border-border space-y-2">
                    {listing.agent?.phone && (
                      <Button variant="outline" className="w-full">
                        <Phone className="w-4 h-4 mr-2" />
                        Call Agent
                      </Button>
                    )}
                    <Button variant="outline" className="w-full">
                      <Calendar className="w-4 h-4 mr-2" />
                      Schedule Viewing
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default ListingDetail;
