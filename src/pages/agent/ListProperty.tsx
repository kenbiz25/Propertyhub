import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { auth, db, storage } from "@/lib/firebaseClient";
import { addDoc, collection, doc, serverTimestamp, updateDoc, runTransaction } from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { COUNTRIES } from "@/lib/constants/countries";
import { useCities } from "@/hooks/useCities";
import { Plus, Trash2 } from "lucide-react";

const LISTING_TYPES = ["rent", "sale", "lease"] as const;
const PROPERTY_TYPES = [
  "apartment",
  "house",
  "villa",
  "townhouse",
  "bungalow",
  "maisonette",
  "studio",
  "penthouse",
  "duplex",
  "condo",
  "office",
  "retail",
  "warehouse",
  "industrial",
  "mixed_use",
  "land",
  "farm",
  "commercial",
  "hotel",
  "guesthouse",
] as const;

const DRAFT_KEY = "hh_property_draft_v1";

async function applyWatermark(file: File, watermarkSrc: string) {
  const [img, mark] = await Promise.all([
    createImageBitmap(file),
    fetch(watermarkSrc).then((r) => r.blob()).then(createImageBitmap),
  ]);
  const canvas = document.createElement("canvas");
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Failed to initialize canvas");

  ctx.drawImage(img, 0, 0);
  const size = Math.max(24, Math.round(canvas.width * 0.08));
  const padding = Math.max(8, Math.round(size * 0.2));
  const x = canvas.width - size - padding;
  const y = padding;
  ctx.globalAlpha = 0.9;
  ctx.drawImage(mark, x, y, size, size);
  ctx.globalAlpha = 1;

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Watermark failed"))),
      "image/jpeg",
      0.92
    );
  });
}

export default function ListProperty() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [images, setImages] = useState<File[]>([]);
  const [videoUrls, setVideoUrls] = useState<string[]>(["", ""]);

  const [form, setForm] = useState({
    title: "",
    description: "",
    price: "",
    listing_type: "rent",
    property_type: "apartment",
    country: "Kenya",
    city: "",
    neighborhood: "",
    address: "",
    bedrooms: "",
    bathrooms: "",
    size_sqm: "",
  });

  const { data: cityOptions = [] } = useCities(form.country);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (parsed?.form) {
        setForm((s) => ({ ...s, ...parsed.form }));
      }
      if (Array.isArray(parsed?.videoUrls)) {
        setVideoUrls(parsed.videoUrls);
      }
      toast.info("Recovered a draft. Please re-upload images before publishing.");
    } catch {
      // ignore invalid draft
    }
  }, []);

  useEffect(() => {
    const id = window.setTimeout(() => {
      try {
        localStorage.setItem(DRAFT_KEY, JSON.stringify({ form, videoUrls }));
      } catch {
        // ignore storage errors
      }
    }, 500);
    return () => window.clearTimeout(id);
  }, [form, videoUrls]);

  const imagePreviews = useMemo(
    () => images.map((f) => URL.createObjectURL(f)),
    [images]
  );

  const cleanedVideos = videoUrls
    .map((v) => v.trim())
    .filter(Boolean)
    .slice(0, 5);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    if (!form.title || !form.price || !form.city || !form.country) {
      toast.error("Please fill in all required fields.");
      return;
    }
    if (images.length === 0) {
      toast.error("Please upload at least one image.");
      return;
    }
    if (cleanedVideos.length > 0 && (cleanedVideos.length < 2 || cleanedVideos.length > 5)) {
      toast.error("Please provide between 2 and 5 YouTube video links.");
      return;
    }

    try {
      setLoading(true);
      const user = auth.currentUser;
      if (!user) {
        navigate("/auth");
        return;
      }

      await runTransaction(db, async (tx) => {
        const userRef = doc(db, "users", user.uid);
        const userSnap = await tx.get(userRef);
        const userData = userSnap.data() as any;
        if (userData?.role !== "agent") {
          const counterRef = doc(db, "meta", "agent_codes");
          const counterSnap = await tx.get(counterRef);
          const next = Number(counterSnap.data()?.next_code ?? 1) || 1;
          tx.set(counterRef, { next_code: next + 1 }, { merge: true });
          tx.set(userRef, { role: "agent", agent_code: userData?.agent_code ?? next }, { merge: true });
          try {
            localStorage.setItem("hh_role", "agent");
          } catch {}
        }
      });

      const propertyRef = await addDoc(collection(db, "properties"), {
        title: form.title.trim(),
        description: form.description.trim(),
        price: Number(form.price),
        listing_type: form.listing_type,
        property_type: form.property_type,
        country: form.country,
        city: form.city,
        neighborhood: form.neighborhood || null,
        address: form.address || null,
        bedrooms: form.bedrooms ? Number(form.bedrooms) : null,
        bathrooms: form.bathrooms ? Number(form.bathrooms) : null,
        size_sqm: form.size_sqm ? Number(form.size_sqm) : null,
        agent_id: user.uid,
        status: "draft",
        video_urls: cleanedVideos,
        created_at: serverTimestamp(),
      });

      const uploadedUrls = await Promise.all(
        images.map(async (file, index) => {
          const watermarked = await applyWatermark(file, "/hh.png");
          const storageRef = ref(storage, `properties/${user.uid}/${propertyRef.id}/${index}.jpg`);
          await uploadBytes(storageRef, watermarked, { contentType: "image/jpeg" });
          return getDownloadURL(storageRef);
        })
      );

      await updateDoc(doc(db, "properties", propertyRef.id), {
        image_urls: uploadedUrls,
        thumbnail_url: uploadedUrls[0] ?? null,
        image: uploadedUrls[0] ?? null,
        status: "published",
      });

      toast.success("Property listed successfully.");
      try {
        localStorage.removeItem(DRAFT_KEY);
      } catch {}
      navigate("/agent/properties");
    } catch (err: any) {
      console.error("[ListProperty] error:", err);
      toast.error(err?.message ?? "Failed to create listing.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <DashboardHeader
        title="Create Listing"
        description="Add property details, images, and YouTube previews for your listing."
      />

      <form onSubmit={handleSubmit} className="glass-card rounded-2xl p-6 space-y-6">
        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm text-muted-foreground">Title *</label>
            <Input
              value={form.title}
              onChange={(e) => setForm((s) => ({ ...s, title: e.target.value }))}
              placeholder="Modern 3BR Apartment"
              required
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm text-muted-foreground">Price (KES) *</label>
            <Input
              type="number"
              value={form.price}
              onChange={(e) => setForm((s) => ({ ...s, price: e.target.value }))}
              placeholder="250000"
              required
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm text-muted-foreground">Description</label>
          <Textarea
            rows={4}
            value={form.description}
            onChange={(e) => setForm((s) => ({ ...s, description: e.target.value }))}
            placeholder="Describe the property..."
          />
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm text-muted-foreground">Listing Type</label>
            <Select
              value={form.listing_type}
              onValueChange={(v) => setForm((s) => ({ ...s, listing_type: v }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                {LISTING_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t.toUpperCase()}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm text-muted-foreground">Property Type</label>
            <Select
              value={form.property_type}
              onValueChange={(v) => setForm((s) => ({ ...s, property_type: v }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                {PROPERTY_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t.charAt(0).toUpperCase() + t.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm text-muted-foreground">Country *</label>
            <Select
              value={form.country}
              onValueChange={(v) => setForm((s) => ({ ...s, country: v, city: "" }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select country" />
              </SelectTrigger>
              <SelectContent className="max-h-64">
                {COUNTRIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <label className="text-sm text-muted-foreground">City *</label>
            <Select
              value={form.city}
              onValueChange={(v) => setForm((s) => ({ ...s, city: v }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select city" />
              </SelectTrigger>
              <SelectContent className="max-h-64">
                {cityOptions.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <label className="text-sm text-muted-foreground">Neighborhood</label>
            <Input
              value={form.neighborhood}
              onChange={(e) => setForm((s) => ({ ...s, neighborhood: e.target.value }))}
              placeholder="Westlands"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm text-muted-foreground">Bedrooms</label>
            <Input
              type="number"
              value={form.bedrooms}
              onChange={(e) => setForm((s) => ({ ...s, bedrooms: e.target.value }))}
              placeholder="3"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm text-muted-foreground">Bathrooms</label>
            <Input
              type="number"
              value={form.bathrooms}
              onChange={(e) => setForm((s) => ({ ...s, bathrooms: e.target.value }))}
              placeholder="2"
            />
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm text-muted-foreground">Address</label>
            <Input
              value={form.address}
              onChange={(e) => setForm((s) => ({ ...s, address: e.target.value }))}
              placeholder="Road / Estate / Building"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm text-muted-foreground">Size (sqm)</label>
            <Input
              type="number"
              value={form.size_sqm}
              onChange={(e) => setForm((s) => ({ ...s, size_sqm: e.target.value }))}
              placeholder="120"
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm text-muted-foreground">Property Images (watermarked)</label>
          <Input
            type="file"
            multiple
            accept="image/*"
            onChange={(e) => setImages(Array.from(e.target.files ?? []))}
          />
          {imagePreviews.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3">
              {imagePreviews.map((src, idx) => (
                <img key={idx} src={src} alt="preview" className="h-24 w-full object-cover rounded-lg" />
              ))}
            </div>
          )}
          <p className="text-xs text-muted-foreground">
            Images will be watermarked automatically to prevent reuse.
          </p>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-sm text-muted-foreground">YouTube Video Links (2–5)</label>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setVideoUrls((v) => (v.length >= 5 ? v : [...v, ""]))}
              disabled={videoUrls.length >= 5}
            >
              <Plus className="w-4 h-4 mr-1" /> Add Video
            </Button>
          </div>
          <div className="space-y-2">
            {videoUrls.map((value, index) => (
              <div key={index} className="flex items-center gap-2">
                <Input
                  value={value}
                  onChange={(e) =>
                    setVideoUrls((v) => v.map((item, i) => (i === index ? e.target.value : item)))
                  }
                  placeholder="https://www.youtube.com/watch?v=..."
                />
                {videoUrls.length > 2 && (
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    onClick={() => setVideoUrls((v) => v.filter((_, i) => i !== index))}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <Button type="submit" disabled={loading}>
            {loading ? "Publishing…" : "Publish Listing"}
          </Button>
          <Button type="button" variant="outline" onClick={() => navigate("/agent/properties")}>Cancel</Button>
        </div>
      </form>
    </div>
  );
}
