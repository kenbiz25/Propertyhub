"""Pydantic models that mirror the Firestore `properties` collection schema."""

from __future__ import annotations

from typing import List, Literal, Optional
from pydantic import BaseModel, Field

# ── Enum constants ─────────────────────────────────────────────────────────────

PROPERTY_TYPES = [
    "apartment", "house", "villa", "townhouse", "bungalow",
    "maisonette", "studio", "penthouse", "duplex", "condo",
    "office", "retail", "warehouse", "industrial", "mixed_use",
    "land", "farm", "commercial", "hotel", "guesthouse",
]

AMENITY_SLUGS = [
    "parking", "security", "swimming_pool", "gym", "elevator",
    "balcony", "garden", "wifi", "air_conditioning", "backup_generator",
    "borehole", "solar", "cctv", "intercom", "club_house",
    "children_play_area", "gated_community", "servant_quarters",
    "fibre_internet", "water_storage",
]

ListingType = Literal["sale", "rent", "lease"]
PropertyType = Literal[
    "apartment", "house", "villa", "townhouse", "bungalow",
    "maisonette", "studio", "penthouse", "duplex", "condo",
    "office", "retail", "warehouse", "industrial", "mixed_use",
    "land", "farm", "commercial", "hotel", "guesthouse",
]
FurnishingType = Literal["furnished", "semi-furnished", "unfurnished"]


# ── Scraped property (raw, before Firebase) ────────────────────────────────────

class ScrapedProperty(BaseModel):
    """Property data extracted from a source page, before images are uploaded."""

    # Identity
    title: str = Field(description="Descriptive property title, e.g. '3-bed apartment in Kilimani'")
    description: Optional[str] = Field(None, description="Full property description (multi-paragraph)")
    source_url: str = Field(description="Canonical URL of the scraped listing page")
    source_site: str = Field(description="Human-readable site name, e.g. 'BuyRentKenya'")

    # Location
    city: str = Field(description="Kenyan city, e.g. Nairobi, Mombasa, Nakuru")
    neighborhood: Optional[str] = Field(None, description="Specific area, e.g. Westlands, Kilimani")
    address: Optional[str] = Field(None, description="Street address if visible on the page")

    # Classification
    listing_type: ListingType = Field("sale", description="sale | rent | lease")
    property_type: Optional[str] = Field(
        None,
        description=(
            "One of: " + ", ".join(PROPERTY_TYPES)
        ),
    )

    # Pricing
    price: Optional[float] = Field(None, description="Numeric price in KES (strip commas/symbols)")
    currency: str = "KES"

    # Attributes
    bedrooms: Optional[int] = Field(None, ge=0)
    bathrooms: Optional[int] = Field(None, ge=0)
    size_sqm: Optional[float] = Field(None, description="Total area in square metres")
    parking: Optional[int] = Field(None, ge=0)
    furnishing: Optional[FurnishingType] = None
    amenities: List[str] = Field(
        default_factory=list,
        description="Subset of known slugs: " + ", ".join(AMENITY_SLUGS),
    )

    # Media — original source URLs; will be replaced by Firebase Storage URLs after upload
    image_urls: List[str] = Field(default_factory=list, description="All image URLs found on the page")


# ── Firestore document (after images uploaded) ─────────────────────────────────

class FirestoreProperty(BaseModel):
    """Ready-to-write Firestore document for the `properties` collection."""

    agent_id: str
    title: str
    description: Optional[str] = None

    country: str = "Kenya"
    city: str
    neighborhood: Optional[str] = None
    address: Optional[str] = None
    location: Optional[str] = None       # derived: "neighborhood, city, Kenya"

    listing_type: str = "sale"
    property_type: Optional[str] = None

    price: Optional[float] = None
    currency: str = "KES"

    bedrooms: Optional[int] = None
    bathrooms: Optional[int] = None
    size_sqm: Optional[float] = None
    area: Optional[float] = None         # mirrors size_sqm for UI compat
    parking: Optional[int] = None
    furnishing: Optional[str] = None
    amenities: List[str] = Field(default_factory=list)

    status: str = "published"
    verified: bool = False
    promoted: bool = False

    thumbnail_url: Optional[str] = None  # first uploaded image
    image: Optional[str] = None          # mirrors thumbnail_url
    image_urls: List[str] = Field(default_factory=list)

    views: int = 0
    inquiries: int = 0

    # Provenance — not displayed on frontend but used for deduplication
    source_url: str = ""
    source_site: str = ""

    def build_location(self) -> str:
        parts = [p for p in [self.neighborhood, self.city, self.country] if p]
        return ", ".join(parts)

    def to_firestore_dict(self) -> dict:
        d = self.model_dump(exclude_none=False)
        d["location"] = self.build_location()
        d["area"] = self.size_sqm
        d["image"] = self.thumbnail_url
        return {k: v for k, v in d.items() if v is not None or k in ("views", "inquiries")}
