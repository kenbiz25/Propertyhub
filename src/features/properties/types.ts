
export type Property = {
  id: string;
  agent_id?: string;                // keep agent_id (owner/agent who created)
  title: string;
  description?: string;

  // Location details
  country?: string;
  city?: string;
  neighborhood?: string;
  location?: string;                // UI compatibility (derived)

  // Listing details
  listing_type?: "rent" | "sale";
  property_type?: string;

  // Pricing
  price?: number;
  currency?: string;                // default 'KES'

  // Attributes
  bedrooms?: number;
  bathrooms?: number;
  furnishing?: "furnished" | "semi-furnished" | "unfurnished";
  amenities?: string[];             // e.g. ["parking","balcony","security"]
  size_sqm?: number;
  available_from?: string;

  // Status & verification
  status?: "published" | "draft" | "archived";
  verified?: boolean;

  // Media
  thumbnail_url?: string | null;    // primary display image
  image?: string | null;            // for UI compatibility (mirrors thumbnail_url)
  image_urls?: string[] | null;     // optional gallery

  // Metrics
  views?: number;
  inquiries?: number;

  // Timestamps
  created_at?: string;
  updated_at?: string;
};

export type PropertyInsert = Omit<Property, "id" | "created_at" | "updated_at"> & {
  agent_id: string;                 // required for RLS
};

export type PropertyUpdate = Partial<Omit<Property, "id" | "agent_id">>;

export type PropertyFilters = {
  q?: string;                       // free-text search
  status?: Property["status"];
  listing_type?: Property["listing_type"];
  property_type?: string;

  country?: string;
  city?: string;
  neighborhood?: string;

  min_price?: number;
  max_price?: number;

  min_bedrooms?: number;
  min_bathrooms?: number;

  furnishing?: Property["furnishing"];
  amenities?: string[];

  verified?: boolean;

  page?: number;
  pageSize?: number;
};
