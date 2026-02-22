
import { useEffect, useMemo, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft, Heart, Share2, MapPin, Bed, Bath, Square, Car,
  Wifi, AirVent, Shield, Waves, Trees, ChevronLeft, ChevronRight,
  CheckCircle, Star, MessageCircle, Download,
  Facebook, Twitter, Link2, Instagram, Music2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import Navbar from "@/components/layouts/Navbar";
import Footer from "@/components/layouts/Footer";
import SEO from "@/components/SEO";
import { addDoc, collection, serverTimestamp, doc, getDoc, query as fsQuery, where, orderBy, getDocs, limit, setDoc, deleteDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebaseClient";
import { toast } from "sonner";

const DEFAULT_IMAGES = [
  "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1200&q=80",
  "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1200&q=80",
  "https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=1200&q=80",
];

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
  const [notFound, setNotFound] = useState(false);
  const [listing, setListing] = useState<any | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
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
            image: d?.agent_image ?? "",
            listings: d?.agent_listings ?? 0,
            rating: d?.agent_rating ?? 0,
          };

          const normalized = {
            id: snap.id,
            agent_id: d?.agent_id ?? d?.agent?.id ?? null,
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
            images: images.length ? images : DEFAULT_IMAGES,
            video_urls: Array.isArray(d?.video_urls) ? d.video_urls : (Array.isArray(d?.videos) ? d.videos : []),
            amenities,
            agent,
            lat: Number(d?.lat ?? 0),
            lng: Number(d?.lng ?? 0),
          };

          if (alive) {
            setListing(normalized);
            setNotFound(false);
          }
        } else {
          if (alive) {
            setListing(null);
            setNotFound(true);
          }
        }
      } catch (e) {
        console.error("[ListingDetail] load error:", e);
        if (alive) {
          setListing(null);
          setNotFound(true);
        }
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

  // Track view (once per session)
  useEffect(() => {
    if (!listing?.id) return;
    const key = `hh_viewed_${listing.id}`;
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, "1");
    } catch {}

    (async () => {
      try {
        await addDoc(collection(db, "view_events"), {
          property_id: listing.id,
          agent_id: listing.agent_id ?? listing.agent?.id ?? null,
          city: listing.city ?? null,
          created_at: serverTimestamp(),
        });
      } catch (e) {
        console.warn("[ListingDetail] view tracking failed:", e);
      }
    })();
  }, [listing?.id, listing?.city, listing?.agent_id, listing?.agent?.id]);

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

  const isOwner = !!(listing?.agent_id && auth.currentUser?.uid === listing.agent_id);

  const videoUrls = useMemo(
    () => (Array.isArray(listing?.video_urls) ? listing.video_urls.filter(Boolean).slice(0, 5) : []),
    [listing]
  );

  const getYouTubeEmbedUrl = (url: string) => {
    try {
      const u = new URL(url);
      if (u.hostname.includes("youtu.be")) {
        return `https://www.youtube.com/embed/${u.pathname.replace("/", "")}`;
      }
      if (u.searchParams.get("v")) {
        return `https://www.youtube.com/embed/${u.searchParams.get("v")}`;
      }
      return url;
    } catch {
      return url;
    }
  };

  const shareListing = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title: listing?.title ?? "Property", url });
      } else {
        await navigator.clipboard.writeText(url);
        toast.success("Link copied to clipboard");
      }
    } catch (err) {
      console.warn("Share failed:", err);
      toast.error("Unable to share link");
    }
  };

  const handleContactAgent = () => {
    const waNumber = listing?.agent_whatsapp?.replace(/[^0-9]/g, "") || "254705091683";
    const text = encodeURIComponent(`Hi, I'm interested in your property: ${listing?.title ?? ""}`);
    window.open(`https://wa.me/${waNumber}?text=${text}`, "_blank", "noopener,noreferrer");
  };

  const copyShareLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast.success("Link copied to clipboard");
    } catch {
      toast.error("Unable to copy link");
    }
  };

  const shareLinks = useMemo(() => {
    if (!listing) return [] as { label: string; href: string; Icon: React.ComponentType<{ className?: string }> }[];
    const url = encodeURIComponent(window.location.href);
    const text = encodeURIComponent(`${listing.title} on Kenya Properties`);
    return [
      { label: "Instagram", href: `https://www.instagram.com/`, Icon: Instagram },
      { label: "Facebook", href: `https://www.facebook.com/sharer/sharer.php?u=${url}`, Icon: Facebook },
      { label: "Twitter", href: `https://twitter.com/intent/tweet?text=${text}&url=${url}`, Icon: Twitter },
      { label: "WhatsApp", href: `https://wa.me/?text=${text}%20${url}`, Icon: MessageCircle },
      { label: "TikTok", href: `https://www.tiktok.com/`, Icon: Music2 },
    ];
  }, [listing]);

  // Early states
  if (loading) {
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

  if (notFound || !listing) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="pt-16">
          <div className="container mx-auto px-4">
            <div className="glass-card rounded-2xl p-10 text-center">
              <h1 className="font-display text-2xl font-bold mb-2">Listing not found</h1>
              <p className="text-muted-foreground mb-6">
                This property may have been removed or is no longer available.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button asChild>
                  <Link to="/listings">Browse Listings</Link>
                </Button>
                <Button variant="outline" asChild>
                  <Link to="/list-property">List a Property</Link>
                </Button>
              </div>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

    async function submitReview() {
      if (!listing?.id || !user) return;
      if (!reviewComment.trim()) return;
      try {
        setReviewSubmitting(true);
        await addDoc(collection(db, "reviews"), {
          property_id: listing.id,
          agent_id: listing.agent_id ?? listing.agent?.id ?? null,
          author_uid: user.uid,
          author_name: user.displayName ?? user.email ?? "Anonymous",
          rating: reviewRating,
          comment: reviewComment.trim(),
          created_at: serverTimestamp(),
        });
        setReviewComment("");
        setReviewRating(5);
        // refresh list
        const q = fsQuery(
          collection(db, "reviews"),
          where("property_id", "==", listing.id),
          orderBy("created_at", "desc"),
          limit(10)
        );
        const snap = await getDocs(q);
        const items = snap.docs.map((d) => toReview(d.data(), d.id));
        setReviews(items);
      } finally {
        setReviewSubmitting(false);
      }
    }



  const seoTitle = listing
    ? `${listing.title} – ${listing.city}${listing.neighborhood ? `, ${listing.neighborhood}` : ""} | Kenya Properties`
    : "Property Listing | Kenya Properties";
  const seoDescription = listing
    ? `${listing.title} for ${listing.type} in ${listing.city}${listing.neighborhood ? `, ${listing.neighborhood}` : ""}. KES ${new Intl.NumberFormat("en-KE").format(listing.price)}. ${listing.description?.slice(0, 120) ?? ""}`
    : "View property details on Kenya Properties.";
  const seoImage = listing?.images?.[0] ?? listing?.image ?? undefined;
  const listingSchema = listing
    ? {
        "@context": "https://schema.org",
        "@type": "RealEstateListing",
        "name": listing.title,
        "description": listing.description,
        "url": `https://kenyaproperties.co.ke/listing/${id}`,
        "image": seoImage,
        "offers": {
          "@type": "Offer",
          "price": listing.price,
          "priceCurrency": "KES",
          "availability": "https://schema.org/InStock",
        },
        "address": {
          "@type": "PostalAddress",
          "addressLocality": listing.neighborhood || listing.city,
          "addressRegion": listing.city,
          "addressCountry": "KE",
        },
      }
    : undefined;

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title={seoTitle}
        description={seoDescription}
        canonical={`/listing/${id}`}
        image={seoImage}
        type="article"
        schema={listingSchema}
      />
      <Navbar />

      {/* Floating Share Button */}
      <button
        onClick={shareListing}
        className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-40 inline-flex items-center gap-2 rounded-full bg-primary px-4 py-3 text-primary-foreground shadow-lg hover:bg-primary/90"
        aria-label="Share property"
      >
        <Share2 className="w-4 h-4" />
        <span className="text-sm font-semibold hidden sm:inline">Share</span>
      </button>

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
              <button
                onClick={shareListing}
                className="w-12 h-12 rounded-full bg-background/80 backdrop-blur-sm flex items-center justify-center hover:bg-background transition-colors"
              >
                <Share2 className="w-5 h-5" />
              </button>
              {isOwner && (
                <a
                  href={listing.images[currentImage]}
                  download
                  className="w-12 h-12 rounded-full bg-background/80 backdrop-blur-sm flex items-center justify-center hover:bg-background transition-colors"
                  aria-label="Download image"
                >
                  <Download className="w-5 h-5" />
                </a>
              )}
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
                  <Button className="w-full bg-green-600 hover:bg-green-700" size="lg" onClick={handleContactAgent}>
                    <MessageCircle className="w-5 h-5 mr-2" />
                    WhatsApp Agent
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

                {/* Share */}
                <div className="glass-card rounded-2xl p-6">
                  <h2 className="font-display text-xl font-semibold mb-4">Share this property</h2>
                  <div className="flex flex-wrap gap-3">
                    {shareLinks.map((item) => (
                      <a
                        key={item.label}
                        href={item.href}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-2 rounded-full border border-border bg-muted/40 px-4 py-2 text-sm text-foreground hover:bg-muted"
                        aria-label={`Share on ${item.label}`}
                      >
                        <item.Icon className="w-4 h-4" />
                        {item.label}
                      </a>
                    ))}
                    <Button variant="outline" size="sm" onClick={copyShareLink}>
                      <Link2 className="w-4 h-4 mr-2" />
                      Copy link
                    </Button>
                  </div>
                </div>

                {/* Amenities */}
                <div className="glass-card rounded-2xl p-6">
                  <h2 className="font-display text-xl font-semibold mb-4">Amenities</h2>
                  {amenityTiles.length === 0 ? (
                    <div className="text-sm text-muted-foreground">
                      Amenities will appear here once provided by the listing owner.
                    </div>
                  ) : (
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
                  )}
                </div>

                {/* Video Previews */}
                {videoUrls.length > 0 && (
                  <div className="glass-card rounded-2xl p-6">
                    <h2 className="font-display text-xl font-semibold mb-4">Video Tour</h2>
                    <div className="grid md:grid-cols-2 gap-4">
                      {videoUrls.map((url: string, index: number) => (
                        <div key={index} className="aspect-video rounded-xl overflow-hidden bg-muted/50">
                          <iframe
                            src={getYouTubeEmbedUrl(url)}
                            className="w-full h-full"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                            loading="lazy"
                            title={`Video tour ${index + 1}`}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

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
                    {!user && (
                      <Button variant="outline" size="sm" asChild>
                        <Link to="/auth">Sign in to review</Link>
                      </Button>
                    )}
                  </div>

                  {user && (
                    <div className="mb-6 space-y-3">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">Rating</span>
                        <select
                          value={reviewRating}
                          onChange={(e) => setReviewRating(Number(e.target.value))}
                          className="rounded-md border border-border bg-background px-2 py-1 text-sm"
                        >
                          {[5, 4, 3, 2, 1].map((v) => (
                            <option key={v} value={v}>{v} Star{v > 1 ? "s" : ""}</option>
                          ))}
                        </select>
                      </div>
                      <Textarea
                        value={reviewComment}
                        onChange={(e) => setReviewComment(e.target.value)}
                        placeholder="Share your experience..."
                      />
                      <Button onClick={submitReview} disabled={reviewSubmitting || !reviewComment.trim()}>
                        {reviewSubmitting ? "Submitting…" : "Submit Review"}
                      </Button>
                    </div>
                  )}

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

                  <Button className="w-full mb-4 bg-green-600 hover:bg-green-700" onClick={handleContactAgent}>
                    <MessageCircle className="w-4 h-4 mr-2" />
                    WhatsApp Agent
                  </Button>
                  <div className="text-sm text-muted-foreground">
                    You'll be connected via WhatsApp to discuss this property.
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
