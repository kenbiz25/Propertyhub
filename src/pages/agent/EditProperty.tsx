import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
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
import { doc, getDoc, serverTimestamp, updateDoc } from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { COUNTRIES } from "@/lib/constants/countries";
import { useCities } from "@/hooks/useCities";
import { CityCombobox } from "@/components/ui/CityCombobox";
import { Plus, Trash2, X } from "lucide-react";
import { validateImages } from "@/lib/uploadValidation";

const LISTING_TYPES = ["rent", "sale", "lease"] as const;
const PROPERTY_TYPES = [
  "apartment", "house", "villa", "townhouse", "bungalow", "maisonette",
  "studio", "penthouse", "duplex", "condo", "office", "retail",
  "warehouse", "industrial", "mixed_use", "land", "farm", "commercial",
  "hotel", "guesthouse",
] as const;

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
  ctx.globalAlpha = 0.9;
  ctx.drawImage(mark, canvas.width - size - padding, padding, size, size);
  ctx.globalAlpha = 1;
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Watermark failed"))),
      "image/jpeg", 0.92
    );
  });
}

export default function EditProperty() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

  // Existing data
  const [existingImageUrls, setExistingImageUrls] = useState<string[]>([]);
  const [existingVideoUrls, setExistingVideoUrls] = useState<string[]>([]);
  const [embedUrls, setEmbedUrls] = useState<string[]>([]);
  const [anchorIndex, setAnchorIndex] = useState<number>(0);

  // New files to add
  const [newImages, setNewImages] = useState<File[]>([]);
  const [newVideoFiles, setNewVideoFiles] = useState<File[]>([]);

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

  // Load existing property
  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const snap = await getDoc(doc(db, "properties", id));
        if (!snap.exists()) {
          toast.error("Property not found.");
          navigate("/agent/properties");
          return;
        }
        const d = snap.data() as any;
        // Check ownership
        const user = auth.currentUser;
        if (user && d.agent_id && d.agent_id !== user.uid) {
          toast.error("You don't have permission to edit this property.");
          navigate("/agent/properties");
          return;
        }
        setForm({
          title: d.title ?? "",
          description: d.description ?? "",
          price: String(d.price ?? ""),
          listing_type: d.listing_type ?? "rent",
          property_type: d.property_type ?? "apartment",
          country: d.country ?? "Kenya",
          city: d.city ?? "",
          neighborhood: d.neighborhood ?? "",
          address: d.address ?? "",
          bedrooms: d.bedrooms != null ? String(d.bedrooms) : "",
          bathrooms: d.bathrooms != null ? String(d.bathrooms) : "",
          size_sqm: d.size_sqm != null ? String(d.size_sqm) : "",
          contact_phone: d.contact_phone ?? "",
        });
        setExistingImageUrls(Array.isArray(d.image_urls) ? d.image_urls : d.image ? [d.image] : []);
        setExistingVideoUrls(Array.isArray(d.video_urls) ? d.video_urls : []);
        setEmbedUrls(Array.isArray(d.embed_urls) ? d.embed_urls : []);
        setAnchorIndex(typeof d.anchor_image_index === "number" ? d.anchor_image_index : 0);
      } catch (err: any) {
        toast.error(err?.message ?? "Failed to load property.");
      } finally {
        setFetching(false);
      }
    })();
  }, [id, navigate]);

  const newImagePreviews = useMemo(
    () => newImages.map((f) => URL.createObjectURL(f)),
    [newImages]
  );

  // Combined image count for anchor selection
  const totalImages = existingImageUrls.length + newImages.length;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading || !id) return;

    if (!form.title || !form.price || !form.city || !form.country) {
      toast.error("Please fill in all required fields.");
      return;
    }
    if (totalImages === 0) {
      toast.error("Please keep at least one image.");
      return;
    }

    try {
      setLoading(true);
      const user = auth.currentUser;
      if (!user) { navigate("/auth"); return; }

      // Upload new images
      const newUploadedUrls = await Promise.all(
        newImages.map(async (file, index) => {
          const watermarked = await applyWatermark(file, "/hh.png");
          const storageRef = ref(storage, `properties/${user.uid}/${id}/img_edit_${Date.now()}_${index}.jpg`);
          await uploadBytes(storageRef, watermarked, { contentType: "image/jpeg" });
          return getDownloadURL(storageRef);
        })
      );

      // Upload new videos
      const newUploadedVideoUrls = await Promise.all(
        newVideoFiles.map(async (file, index) => {
          const storageRef = ref(storage, `properties/${user.uid}/${id}/vid_edit_${Date.now()}_${index}_${file.name}`);
          await uploadBytes(storageRef, file, { contentType: file.type });
          return getDownloadURL(storageRef);
        })
      );

      const allImageUrls = [...existingImageUrls, ...newUploadedUrls];
      const allVideoUrls = [...existingVideoUrls, ...newUploadedVideoUrls];
      const safeAnchor = anchorIndex < allImageUrls.length ? anchorIndex : 0;
      const cleanedEmbeds = embedUrls.map((u) => u.trim()).filter(Boolean);

      await updateDoc(doc(db, "properties", id), {
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
        image_urls: allImageUrls,
        thumbnail_url: allImageUrls[safeAnchor] ?? null,
        image: allImageUrls[safeAnchor] ?? null,
        anchor_image_index: safeAnchor,
        video_urls: allVideoUrls,
        embed_urls: cleanedEmbeds,
        updated_at: serverTimestamp(),
      });

      toast.success("Property updated successfully.");
      navigate("/agent/properties");
    } catch (err: any) {
      console.error("[EditProperty] error:", err);
      toast.error(err?.message ?? "Failed to update listing.");
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return <div className="p-6 text-muted-foreground">Loading property…</div>;
  }

  return (
    <div className="space-y-6">
      <DashboardHeader
        title="Edit Listing"
        description="Update your property details, images, and videos."
      />

      <form onSubmit={handleSubmit} className="glass-card rounded-2xl p-6 space-y-6">
        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm text-muted-foreground">Title *</label>
            <Input value={form.title} onChange={(e) => setForm((s) => ({ ...s, title: e.target.value }))} placeholder="Modern 3BR Apartment" required />
          </div>
          <div className="space-y-2">
            <label className="text-sm text-muted-foreground">Price (KES) *</label>
            <Input type="number" value={form.price} onChange={(e) => setForm((s) => ({ ...s, price: e.target.value }))} placeholder="250000" required />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm text-muted-foreground">Description</label>
          <Textarea rows={4} value={form.description} onChange={(e) => setForm((s) => ({ ...s, description: e.target.value }))} placeholder="Describe the property..." />
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm text-muted-foreground">Listing Type</label>
            <Select value={form.listing_type} onValueChange={(v) => setForm((s) => ({ ...s, listing_type: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {LISTING_TYPES.map((t) => <SelectItem key={t} value={t}>{t.toUpperCase()}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <label className="text-sm text-muted-foreground">Property Type</label>
            <Select value={form.property_type} onValueChange={(v) => setForm((s) => ({ ...s, property_type: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {PROPERTY_TYPES.map((t) => <SelectItem key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm text-muted-foreground">Country *</label>
            <Select value={form.country} onValueChange={(v) => setForm((s) => ({ ...s, country: v, city: "" }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent className="max-h-64">
                {COUNTRIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
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
            <Input value={form.neighborhood} onChange={(e) => setForm((s) => ({ ...s, neighborhood: e.target.value }))} placeholder="Westlands" />
          </div>
          <div className="space-y-2">
            <label className="text-sm text-muted-foreground">Bedrooms</label>
            <Input type="number" value={form.bedrooms} onChange={(e) => setForm((s) => ({ ...s, bedrooms: e.target.value }))} placeholder="3" />
          </div>
          <div className="space-y-2">
            <label className="text-sm text-muted-foreground">Bathrooms</label>
            <Input type="number" value={form.bathrooms} onChange={(e) => setForm((s) => ({ ...s, bathrooms: e.target.value }))} placeholder="2" />
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm text-muted-foreground">Address</label>
            <Input value={form.address} onChange={(e) => setForm((s) => ({ ...s, address: e.target.value }))} placeholder="Road / Estate / Building" />
          </div>
          <div className="space-y-2">
            <label className="text-sm text-muted-foreground">Size (sqm)</label>
            <Input type="number" value={form.size_sqm} onChange={(e) => setForm((s) => ({ ...s, size_sqm: e.target.value }))} placeholder="120" />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm text-muted-foreground">Contact Phone Number</label>
          <Input type="tel" value={form.contact_phone} onChange={(e) => setForm((s) => ({ ...s, contact_phone: e.target.value }))} placeholder="0712345678 or +254712345678" />
        </div>

        {/* Existing images */}
        <div className="space-y-2">
          <label className="text-sm text-muted-foreground">Current Images</label>
          {existingImageUrls.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {existingImageUrls.map((url, idx) => (
                <div key={idx} className="relative">
                  <img src={url} alt={`img-${idx}`} className={`h-24 w-full object-cover rounded-lg ${anchorIndex === idx ? "ring-2 ring-primary" : ""}`} />
                  <label className="absolute bottom-1 left-1 flex items-center gap-1 bg-background/80 rounded px-1 py-0.5 cursor-pointer text-xs">
                    <Checkbox checked={anchorIndex === idx} onCheckedChange={() => setAnchorIndex(idx)} />
                    Cover
                  </label>
                  <button
                    type="button"
                    className="absolute top-1 right-1 w-5 h-5 rounded-full bg-red-600 flex items-center justify-center"
                    onClick={() => {
                      setExistingImageUrls((v) => v.filter((_, i) => i !== idx));
                      if (anchorIndex >= idx && anchorIndex > 0) setAnchorIndex((a) => a - 1);
                    }}
                  >
                    <X className="w-3 h-3 text-white" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">No existing images.</p>
          )}
        </div>

        {/* Add new images */}
        <div className="space-y-2">
          <label className="text-sm text-muted-foreground">Add More Images</label>
          <Input
            type="file"
            multiple
            accept="image/*"
            onChange={(e) => {
              const selected = Array.from(e.target.files ?? []);
              const result = validateImages(selected);
              if (!result.ok) { toast.error(result.error); e.target.value = ""; return; }
              setNewImages(selected);
            }}
          />
          {newImagePreviews.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3">
              {newImagePreviews.map((src, idx) => {
                const globalIdx = existingImageUrls.length + idx;
                return (
                  <div key={idx} className="relative">
                    <img src={src} alt="new-preview" className={`h-24 w-full object-cover rounded-lg ${anchorIndex === globalIdx ? "ring-2 ring-primary" : ""}`} />
                    <label className="absolute bottom-1 left-1 flex items-center gap-1 bg-background/80 rounded px-1 py-0.5 cursor-pointer text-xs">
                      <Checkbox checked={anchorIndex === globalIdx} onCheckedChange={() => setAnchorIndex(globalIdx)} />
                      Cover
                    </label>
                  </div>
                );
              })}
            </div>
          )}
          <p className="text-xs text-muted-foreground">New images will be watermarked automatically.</p>
        </div>

        {/* Existing videos */}
        <div className="space-y-2">
          <label className="text-sm text-muted-foreground">Current Videos</label>
          {existingVideoUrls.length > 0 ? (
            <div className="space-y-2">
              {existingVideoUrls.map((url, idx) => (
                <div key={idx} className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
                  <span className="flex-1 text-sm truncate">{url}</span>
                  <button
                    type="button"
                    className="w-5 h-5 rounded-full bg-red-600 flex items-center justify-center flex-shrink-0"
                    onClick={() => setExistingVideoUrls((v) => v.filter((_, i) => i !== idx))}
                  >
                    <X className="w-3 h-3 text-white" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">No existing videos.</p>
          )}
        </div>

        {/* Add new videos */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-sm text-muted-foreground">
              Add More Videos (optional, up to {5 - existingVideoUrls.length - newVideoFiles.length} more)
            </label>
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
                  setNewVideoFiles((v) => [...v, ...files].slice(0, 5 - existingVideoUrls.length));
                };
                input.click();
              }}
              disabled={existingVideoUrls.length + newVideoFiles.length >= 5}
            >
              <Plus className="w-4 h-4 mr-1" /> Add Videos
            </Button>
          </div>
          {newVideoFiles.length > 0 && (
            <div className="space-y-2">
              {newVideoFiles.map((file, index) => (
                <div key={index} className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
                  <span className="flex-1 text-sm truncate">{file.name}</span>
                  <span className="text-xs text-muted-foreground">{(file.size / 1024 / 1024).toFixed(1)} MB</span>
                  <Button type="button" size="icon" variant="ghost" onClick={() => setNewVideoFiles((v) => v.filter((_, i) => i !== index))}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
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
            {loading ? "Saving…" : "Save Changes"}
          </Button>
          <Button type="button" variant="outline" onClick={() => navigate("/agent/properties")}>Cancel</Button>
        </div>
      </form>
    </div>
  );
}
