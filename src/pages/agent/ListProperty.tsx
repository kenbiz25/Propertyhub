import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
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
import { CityCombobox } from "@/components/ui/CityCombobox";
import { Plus, Trash2 } from "lucide-react";
import { validateImages } from "@/lib/uploadValidation";

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
  const [anchorIndex, setAnchorIndex] = useState<number>(0);
  const [videoFiles, setVideoFiles] = useState<File[]>([]);
  const [embedUrls, setEmbedUrls] = useState<string[]>([]);

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
    contact_phone: "",
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
      toast.info("Recovered a draft. Please re-upload images and videos before publishing.");
    } catch {
      // ignore invalid draft
    }
  }, []);

  useEffect(() => {
    const id = window.setTimeout(() => {
      try {
        localStorage.setItem(DRAFT_KEY, JSON.stringify({ form }));
      } catch {
        // ignore storage errors
      }
    }, 500);
    return () => window.clearTimeout(id);
  }, [form]);

  const imagePreviews = useMemo(
    () => images.map((f) => URL.createObjectURL(f)),
    [images]
  );

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

    try {
      setLoading(true);
      const user = auth.currentUser;
      if (!user) {
        navigate("/auth");
        return;
      }

      let wasCustomer = false;
      await runTransaction(db, async (tx) => {
        const userRef = doc(db, "users", user.uid);
        const userSnap = await tx.get(userRef);
        const userData = userSnap.data() as any;
        if (userData?.role !== "agent") {
          wasCustomer = true;
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
        contact_phone: form.contact_phone.trim() || null,
        agent_id: user.uid,
        status: "draft",
        created_at: serverTimestamp(),
      });

      const uploadedImageUrls = await Promise.all(
        images.map(async (file, index) => {
          const watermarked = await applyWatermark(file, "/hh.png");
          const storageRef = ref(storage, `properties/${user.uid}/${propertyRef.id}/img_${index}.jpg`);
          await uploadBytes(storageRef, watermarked, { contentType: "image/jpeg" });
          return getDownloadURL(storageRef);
        })
      );

      const uploadedVideoUrls = await Promise.all(
        videoFiles.map(async (file, index) => {
          const storageRef = ref(storage, `properties/${user.uid}/${propertyRef.id}/vid_${index}_${file.name}`);
          await uploadBytes(storageRef, file, { contentType: file.type });
          return getDownloadURL(storageRef);
        })
      );

      const safeAnchor = anchorIndex < uploadedImageUrls.length ? anchorIndex : 0;
      const cleanedEmbeds = embedUrls.map((u) => u.trim()).filter(Boolean);
      await updateDoc(doc(db, "properties", propertyRef.id), {
        image_urls: uploadedImageUrls,
        thumbnail_url: uploadedImageUrls[safeAnchor] ?? null,
        image: uploadedImageUrls[safeAnchor] ?? null,
        anchor_image_index: safeAnchor,
        video_urls: uploadedVideoUrls,
        embed_urls: cleanedEmbeds,
        status: "published",
        published: true,
      });

      toast.success("Property listed successfully.");
      try {
        localStorage.removeItem(DRAFT_KEY);
      } catch {}

      if (wasCustomer) {
        // Force a full reload so auth context picks up the new role
        window.location.href = "/agent";
      } else {
        navigate("/agent/properties");
      }
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
            <label className="text-sm text-muted-foreground">City / Town *</label>
            <CityCombobox
              value={form.city}
              onChange={(v) => setForm((s) => ({ ...s, city: v }))}
              options={cityOptions}
              disabled={cityOptions.length === 0}
            />
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
          <label className="text-sm text-muted-foreground">Contact Phone Number *</label>
          <Input
            type="tel"
            value={form.contact_phone}
            onChange={(e) => setForm((s) => ({ ...s, contact_phone: e.target.value }))}
            placeholder="0712345678 or +254712345678"
          />
          <p className="text-xs text-muted-foreground">
            This number is shown to logged-in customers as both a call and WhatsApp link.
          </p>
        </div>

        <div className="space-y-2">
          <label className="text-sm text-muted-foreground">Property Images (watermarked)</label>
          <Input
            type="file"
            multiple
            accept="image/*"
            onChange={(e) => {
              const selected = Array.from(e.target.files ?? []);
              const result = validateImages(selected);
              if (!result.ok) { toast.error(result.error); e.target.value = ""; return; }
              setImages(selected);
              setAnchorIndex(0);
            }}
          />
          {imagePreviews.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3">
              {imagePreviews.map((src, idx) => (
                <div key={idx} className="relative">
                  <img src={src} alt="preview" className={`h-24 w-full object-cover rounded-lg ${anchorIndex === idx ? "ring-2 ring-primary" : ""}`} />
                  <label className="absolute bottom-1 left-1 flex items-center gap-1 bg-background/80 rounded px-1 py-0.5 cursor-pointer text-xs">
                    <Checkbox
                      checked={anchorIndex === idx}
                      onCheckedChange={() => setAnchorIndex(idx)}
                    />
                    Cover
                  </label>
                </div>
              ))}
            </div>
          )}
          <p className="text-xs text-muted-foreground">
            Images will be watermarked automatically. Check "Cover" on the image to use as the front-page thumbnail.
          </p>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-sm text-muted-foreground">Property Videos (optional, up to 5)</label>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => {
                const input = document.createElement("input");
                input.type = "file";
                input.accept = "video/*";
                input.multiple = true;
                input.onchange = () => {
                  const files = Array.from(input.files ?? []);
                  setVideoFiles((v) => [...v, ...files].slice(0, 5));
                };
                input.click();
              }}
              disabled={videoFiles.length >= 5}
            >
              <Plus className="w-4 h-4 mr-1" /> Add Videos
            </Button>
          </div>
          {videoFiles.length > 0 && (
            <div className="space-y-2">
              {videoFiles.map((file, index) => (
                <div key={index} className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
                  <span className="flex-1 text-sm truncate">{file.name}</span>
                  <span className="text-xs text-muted-foreground">{(file.size / 1024 / 1024).toFixed(1)} MB</span>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    onClick={() => setVideoFiles((v) => v.filter((_, i) => i !== index))}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
          <p className="text-xs text-muted-foreground">Upload video files directly (MP4, MOV, etc.).</p>
        </div>

        {/* Embed Videos (YouTube / Instagram) */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium">Embed Videos</label>
              <p className="text-xs text-muted-foreground mt-0.5">YouTube or Instagram post/reel links (max 5)</p>
            </div>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setEmbedUrls((v) => (v.length >= 5 ? v : [...v, ""]))}
              disabled={embedUrls.length >= 5}
            >
              <Plus className="w-4 h-4 mr-1" /> Add Link
            </Button>
          </div>

          {embedUrls.length === 0 && (
            <div className="border border-dashed border-border rounded-lg p-4 text-center text-xs text-muted-foreground">
              No embed links added yet. Click "Add Link" to add a YouTube or Instagram URL.
            </div>
          )}

          <div className="space-y-2">
            {embedUrls.map((url, index) => {
              const isYT = /youtu\.?be/.test(url);
              const isIG = /instagram\.com/.test(url);
              const badge = isYT ? "YouTube" : isIG ? "Instagram" : url ? "Unknown" : null;
              const badgeColor = isYT
                ? "bg-red-500/10 text-red-400"
                : isIG
                ? "bg-purple-500/10 text-purple-400"
                : "bg-yellow-500/10 text-yellow-400";

              return (
                <div key={index} className="flex items-center gap-2 p-2 rounded-lg bg-muted/40 border border-border">
                  {badge && (
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${badgeColor}`}>
                      {badge}
                    </span>
                  )}
                  <Input
                    value={url}
                    onChange={(e) => setEmbedUrls((v) => v.map((item, i) => (i === index ? e.target.value : item)))}
                    placeholder="https://www.youtube.com/watch?v=... or https://www.instagram.com/p/..."
                    className="border-0 bg-transparent focus-visible:ring-0 h-8 px-1"
                  />
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="shrink-0 h-7 w-7 text-muted-foreground hover:text-red-500"
                    onClick={() => setEmbedUrls((v) => v.filter((_, i) => i !== index))}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              );
            })}
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
