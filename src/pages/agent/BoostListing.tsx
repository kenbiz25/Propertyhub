import { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { addDoc, collection, doc, getDoc, serverTimestamp } from "firebase/firestore";
import { toast } from "sonner";

import DashboardHeader from "@/components/dashboard/DashboardHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  BOOST_DURATION_OPTIONS,
  BOOST_PAYMENT,
  BOOST_SLOTS,
  BoostDurationKey,
  BoostSlotKey,
  formatKes,
} from "@/lib/constants/boosting";
import { auth, db } from "@/lib/firebaseClient";

export default function BoostListing() {
  const { id } = useParams();
  const [listing, setListing] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [slotType, setSlotType] = useState<BoostSlotKey>("premium");
  const [durationKey, setDurationKey] = useState<BoostDurationKey>("week");
  const [phone, setPhone] = useState("");
  const [mpesaCode, setMpesaCode] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [requestId, setRequestId] = useState<string | null>(null);

  useEffect(() => {
    const fetchListing = async () => {
      if (!id) return;
      try {
        const snap = await getDoc(doc(db, "properties", id));
        if (!snap.exists()) {
          setListing(null);
        } else {
          setListing({ id: snap.id, ...snap.data() });
        }
      } catch (err) {
        console.error("[BoostListing] Failed to fetch listing:", err);
        setListing(null);
      } finally {
        setLoading(false);
      }
    };

    fetchListing();
  }, [id]);

  const duration = BOOST_DURATION_OPTIONS.find((d) => d.key === durationKey);
  const slot = BOOST_SLOTS.find((s) => s.key === slotType);

  const priceKes = useMemo(() => {
    if (!slot) return 0;
    return slot.prices[durationKey];
  }, [slot, durationKey]);

  const canSubmit =
    !!listing &&
    !!slot &&
    !!duration &&
    phone.trim().length > 0 &&
    mpesaCode.trim().length > 0;

  const isOwner = useMemo(() => {
    if (!listing) return false;
    const uid = auth.currentUser?.uid;
    if (!uid) return false;
    const ownerId = listing.agent_id ?? listing.user_id ?? listing.owner_id;
    return !ownerId || ownerId === uid;
  }, [listing]);

  const handleSubmit = async () => {
    if (!canSubmit) {
      toast.error("Please fill in all required fields.");
      return;
    }
    if (!isOwner) {
      toast.error("You can only boost listings you own.");
      return;
    }
    if (!id || !listing) return;

    try {
      setSubmitting(true);
      const docRef = await addDoc(collection(db, "boost_requests"), {
        listing_id: id,
        listing_title: listing.title ?? "Untitled Listing",
        listing_image:
          listing.thumbnail_url ?? listing.image ?? listing.image_urls?.[0] ?? null,
        slot_type: slotType,
        duration_key: durationKey,
        duration_days: duration?.days ?? 7,
        duration_label: duration?.label ?? "7 Days",
        price_kes: priceKes,
        agent_id: auth.currentUser?.uid ?? null,
        agent_email: auth.currentUser?.email ?? null,
        phone,
        mpesa_code: mpesaCode,
        notes: notes.trim() || null,
        status: "pending",
        created_at: serverTimestamp(),
      });

      setRequestId(docRef.id);
      toast.success("Boost request submitted. Awaiting confirmation.");
    } catch (err: any) {
      console.error("[BoostListing] submit error:", err);
      toast.error(err?.message ?? "Failed to submit boost request.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="p-6 text-muted-foreground">Loading listing…</div>;
  }

  if (!listing) {
    return (
      <div className="p-6">
        <div className="glass-card rounded-2xl p-8 text-center">
          <div className="text-lg font-semibold text-white">Listing not found</div>
          <p className="text-sm text-muted-foreground mt-2">
            The listing you’re trying to boost doesn’t exist.
          </p>
          <Button asChild className="mt-4">
            <Link to="/agent/properties">Back to Properties</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <DashboardHeader
        title="Boost Listing"
        description="Choose your slot, duration, and submit payment confirmation to activate promotion."
      />

      <div className="grid gap-6 lg:grid-cols-[2fr,1fr]">
        <div className="glass-card rounded-2xl p-6 space-y-6">
          <div>
            <div className="text-sm text-muted-foreground">Listing</div>
            <div className="text-lg font-semibold text-white">
              {listing.title ?? "Untitled Listing"}
            </div>
            <div className="text-sm text-muted-foreground mt-1">
              {[listing.neighborhood, listing.city, listing.country]
                .filter(Boolean)
                .join(", ") || listing.location}
            </div>
          </div>

          <div className="space-y-3">
            <div className="text-sm text-muted-foreground">Choose slot</div>
            <div className="grid gap-3 sm:grid-cols-2">
              {BOOST_SLOTS.map((s) => (
                <button
                  key={s.key}
                  type="button"
                  onClick={() => setSlotType(s.key)}
                  className={`rounded-xl border px-4 py-3 text-left transition-all ${
                    slotType === s.key
                      ? "border-primary bg-primary/10"
                      : "border-border/60 hover:border-primary/50"
                  }`}
                >
                  <div className="text-white font-semibold">{s.label}</div>
                  <div className="text-xs text-muted-foreground mt-1">{s.description}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <div className="text-sm text-muted-foreground">Choose duration</div>
            <div className="grid gap-3 sm:grid-cols-2">
              {BOOST_DURATION_OPTIONS.map((d) => (
                <button
                  key={d.key}
                  type="button"
                  onClick={() => setDurationKey(d.key)}
                  className={`rounded-xl border px-4 py-3 text-left transition-all ${
                    durationKey === d.key
                      ? "border-primary bg-primary/10"
                      : "border-border/60 hover:border-primary/50"
                  }`}
                >
                  <div className="text-white font-semibold">{d.label}</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {formatKes(slot?.prices[d.key] ?? 0)}
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <div className="text-sm text-muted-foreground">Payment confirmation</div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                placeholder="Phone number"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
              <Input
                placeholder="M-Pesa confirmation code"
                value={mpesaCode}
                onChange={(e) => setMpesaCode(e.target.value)}
              />
            </div>
            <Textarea
              placeholder="Optional notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
            />
          </div>

          <div className="flex flex-wrap gap-3">
            <Button onClick={handleSubmit} disabled={!canSubmit || submitting}>
              {submitting ? "Submitting…" : "Submit Boost Request"}
            </Button>
            <Button variant="outline" asChild>
              <Link to="/agent/properties">Cancel</Link>
            </Button>
          </div>
        </div>

        <div className="space-y-4">
          <div className="glass-card rounded-2xl p-6">
            <div className="text-sm text-muted-foreground">Pay via {BOOST_PAYMENT.provider}</div>
            <div className="text-lg font-semibold text-white mt-1">
              {BOOST_PAYMENT.mobileNumber}
            </div>
            <div className="text-sm text-muted-foreground mt-1">
              Account: {BOOST_PAYMENT.accountLabel}
            </div>
            <div className="text-sm text-muted-foreground mt-4">
              {BOOST_PAYMENT.instructions}
            </div>
          </div>

          <div className="glass-card rounded-2xl p-6">
            <div className="text-sm text-muted-foreground">Summary</div>
            <div className="mt-2 text-white font-semibold">{slot?.label}</div>
            <div className="text-sm text-muted-foreground">{duration?.label}</div>
            <div className="mt-3 text-2xl font-bold text-primary">{formatKes(priceKes)}</div>
          </div>

          {requestId && (
            <div className="glass-card rounded-2xl p-6">
              <div className="text-sm text-muted-foreground">Request submitted</div>
              <div className="text-white font-semibold mt-1">ID: {requestId}</div>
              <div className="text-sm text-muted-foreground mt-2">
                We will activate your promotion after verifying payment.
              </div>
              <Button asChild className="mt-4">
                <Link to="/agent/promotions">View Requests</Link>
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
