/**
 * Client-side upload validation.
 * These checks are the first line of defence — storage rules enforce
 * the same constraints server-side so spoofed clients are still blocked.
 */

const IMAGE_TYPES = new Set(["image/jpeg", "image/jpg", "image/png", "image/webp"]);
const KYC_TYPES   = new Set(["image/jpeg", "image/jpg", "image/png", "application/pdf"]);

const MAX_IMAGE_SIZE_MB = 5;
const MAX_KYC_SIZE_MB   = 5;
const MAX_IMAGE_COUNT   = 10;

export interface ValidationResult {
  ok: boolean;
  error?: string;
}

/** Validate a batch of property listing images before upload. */
export function validateImages(files: File[]): ValidationResult {
  if (files.length === 0) {
    return { ok: false, error: "Please select at least one image." };
  }
  if (files.length > MAX_IMAGE_COUNT) {
    return { ok: false, error: `Maximum ${MAX_IMAGE_COUNT} images allowed.` };
  }
  for (const file of files) {
    if (!IMAGE_TYPES.has(file.type)) {
      return { ok: false, error: `"${file.name}" is not a supported image (JPEG, PNG, WebP only).` };
    }
    if (file.size > MAX_IMAGE_SIZE_MB * 1024 * 1024) {
      return { ok: false, error: `"${file.name}" exceeds ${MAX_IMAGE_SIZE_MB} MB.` };
    }
  }
  return { ok: true };
}

/** Validate a single KYC document (image or PDF). */
export function validateKycFile(file: File): ValidationResult {
  if (!KYC_TYPES.has(file.type)) {
    return { ok: false, error: `"${file.name}" must be a JPEG, PNG, or PDF.` };
  }
  if (file.size > MAX_KYC_SIZE_MB * 1024 * 1024) {
    return { ok: false, error: `"${file.name}" exceeds ${MAX_KYC_SIZE_MB} MB.` };
  }
  return { ok: true };
}

/**
 * Sanitize a filename: strip path traversal characters, collapse spaces,
 * limit length. Returns a safe basename only (no directory component).
 */
export function sanitizeFilename(name: string): string {
  return name
    .replace(/[/\\?%*:|"<>]/g, "_") // strip dangerous characters
    .replace(/\.{2,}/g, ".")         // collapse ".." to "."
    .replace(/\s+/g, "_")            // spaces to underscores
    .slice(0, 120);                  // cap length
}
