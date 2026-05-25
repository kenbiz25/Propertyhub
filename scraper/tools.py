"""
LangGraph / LangChain tools used by the scraper agent.

Each function is decorated with @tool so it can be bound to a ChatOpenAI model
and invoked by the LangGraph ReAct loop.
"""

from __future__ import annotations

import io
import json
import os
import time
from textwrap import dedent
from typing import List
from urllib.parse import urljoin, urlparse

import httpx
from bs4 import BeautifulSoup
from langchain_core.tools import tool
from langchain_openai import ChatOpenAI
from PIL import Image
from tenacity import retry, stop_after_attempt, wait_exponential

import firebase_client as fb
from models import AMENITY_SLUGS, PROPERTY_TYPES, FirestoreProperty, ScrapedProperty

# ── Shared HTTP client ─────────────────────────────────────────────────────────

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0.0.0 Safari/537.36"
    ),
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
    "Accept-Encoding": "gzip, deflate, br",
    "Connection": "keep-alive",
    "Upgrade-Insecure-Requests": "1",
    "Sec-Fetch-Dest": "document",
    "Sec-Fetch-Mode": "navigate",
    "Sec-Fetch-Site": "none",
    "Sec-Fetch-User": "?1",
    "sec-ch-ua": '"Chromium";v="124", "Google Chrome";v="124", "Not-A.Brand";v="99"',
    "sec-ch-ua-mobile": "?0",
    "sec-ch-ua-platform": '"Windows"',
}

REQUEST_DELAY = float(os.environ.get("SCRAPER_REQUEST_DELAY", "2"))

# OpenAI model used only for extraction (shared with agent)
_extractor_llm = None


def _get_extractor() -> ChatOpenAI:
    global _extractor_llm
    if _extractor_llm is None:
        _extractor_llm = ChatOpenAI(
            model="gpt-4o-mini",
            temperature=0,
        )
    return _extractor_llm


# ── Source site definitions ────────────────────────────────────────────────────

SOURCES = {
    "BuyRentKenya": [
        "https://www.buyrentkenya.com/houses-for-sale",
        "https://www.buyrentkenya.com/apartments-for-rent",
        "https://www.buyrentkenya.com/land-for-sale",
    ],
    "PigiaMe": [
        "https://www.pigiame.co.ke/real-estate",
        "https://www.pigiame.co.ke/real-estate/houses-for-sale-nairobi",
    ],
    "Property24": [
        "https://www.property24.co.ke/property-for-sale",
        "https://www.property24.co.ke/property-to-rent",
    ],
    "JumiaHouse": [
        "https://www.jumia.co.ke/real-estate/houses-for-sale/",
        "https://www.jumia.co.ke/real-estate/apartments-for-rent/",
    ],
}


# ── HTTP fetch helpers ─────────────────────────────────────────────────────────

@retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=2, max=10))
def _fetch_html(url: str, timeout: int = 20) -> str:
    time.sleep(REQUEST_DELAY)
    with httpx.Client(headers=HEADERS, follow_redirects=True, timeout=timeout) as client:
        resp = client.get(url)
        resp.raise_for_status()
        return resp.text


def _clean_html(html: str, base_url: str) -> tuple[str, list[str]]:
    """Return (cleaned_text, list_of_image_urls) from raw HTML."""
    soup = BeautifulSoup(html, "lxml")

    # Remove noise
    for tag in soup(["script", "style", "nav", "footer", "header", "iframe", "noscript"]):
        tag.decompose()

    # Collect image URLs before stripping tags
    images: list[str] = []
    for img in soup.find_all("img"):
        src = img.get("src") or img.get("data-src") or img.get("data-lazy-src")
        if src and not src.startswith("data:"):
            images.append(urljoin(base_url, src))

    text = soup.get_text(separator="\n", strip=True)
    # Collapse blank lines
    lines = [ln for ln in text.splitlines() if ln.strip()]
    return "\n".join(lines[:300]), images   # cap at 300 lines to keep prompt small


def _extract_links(html: str, base_url: str, pattern_hints: list[str]) -> list[str]:
    """Return anchor hrefs that look like property detail pages."""
    soup = BeautifulSoup(html, "lxml")
    domain = urlparse(base_url).netloc
    candidates = set()
    for a in soup.find_all("a", href=True):
        href = urljoin(base_url, a["href"])
        parsed = urlparse(href)
        if parsed.netloc != domain:
            continue
        path = parsed.path.lower()
        if any(hint in path for hint in pattern_hints):
            candidates.add(href.split("?")[0])   # drop query params
    return list(candidates)


# ── LangGraph tools ────────────────────────────────────────────────────────────

@tool
def get_listing_urls(source_name: str) -> str:
    """
    Fetch the first listing page of a named source site and return up to 20
    property detail page URLs as a JSON array.

    source_name must be one of: BuyRentKenya, PigiaMe, Property24, JumiaHouse
    """
    pages = SOURCES.get(source_name)
    if not pages:
        available = ", ".join(SOURCES.keys())
        return json.dumps({"error": f"Unknown source. Use one of: {available}"})

    # Heuristic path fragments that appear in property detail URLs
    hints_by_site = {
        "BuyRentKenya": ["/listing/", "/property/", "/listings/", "/house", "/apartment", "/land"],
        "PigiaMe": ["/item/", "/ad/", "/property/", "/houses/", "/real-estate/"],
        "Property24": ["/property-details/", "/for-sale/", "/to-rent/", "/listing/", "/property-for-sale", "/property-to-rent"],
        "JumiaHouse": ["/real-estate/", "/property/", "/house/", "/apartment/"],
    }
    hints = hints_by_site.get(source_name, ["/listing/", "/property/", "/item/", "/ad/"])

    all_urls: list[str] = []
    errors: list[str] = []
    for page_url in pages[:2]:          # sample first two category pages
        try:
            html = _fetch_html(page_url)
            links = _extract_links(html, page_url, hints)
            all_urls.extend(links)
            if len(all_urls) >= 20:
                break
        except Exception as exc:
            errors.append(f"{page_url}: {exc}")
            continue   # try next URL instead of aborting

    unique = list(dict.fromkeys(all_urls))[:20]
    if not unique and errors:
        return json.dumps({"error": f"All URLs failed for {source_name}", "details": errors})
    return json.dumps({"source": source_name, "urls": unique, "count": len(unique), "errors": errors})


@tool
def scrape_property_details(url: str) -> str:
    """
    Scrape a single property detail page URL and return a JSON object with all
    available property fields (title, price, city, bedrooms, image_urls, etc.).

    Returns JSON with key "property" on success, or "error" on failure.
    """
    try:
        html = _fetch_html(url)
    except Exception as exc:
        return json.dumps({"error": f"HTTP error for {url}: {exc}"})

    text, images = _clean_html(html, url)

    # Build an extraction prompt
    extraction_prompt = dedent(f"""
        You are a property data extractor. Extract all available details from the
        text below, which came from a Kenyan real estate listing page.

        Return ONLY a valid JSON object with these exact keys (omit keys you cannot
        determine; do NOT guess):

        title          (string)
        description    (string — full listing description, max 500 chars)
        city           (string — Kenyan city, e.g. "Nairobi", "Mombasa")
        neighborhood   (string — e.g. "Westlands", "Kilimani")
        address        (string — street address if available)
        listing_type   ("sale" | "rent" | "lease")
        property_type  (one of: {', '.join(PROPERTY_TYPES)})
        price          (number — KES, strip symbols/commas)
        bedrooms       (integer)
        bathrooms      (integer)
        size_sqm       (number — square metres)
        parking        (integer — number of spaces)
        furnishing     ("furnished" | "semi-furnished" | "unfurnished")
        amenities      (array of slugs from: {', '.join(AMENITY_SLUGS)})

        Page text:
        {text[:4000]}
    """).strip()

    llm = _get_extractor()
    try:
        response = llm.invoke(extraction_prompt)
        raw = response.content.strip()
        # Strip markdown code fences if present
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
        extracted = json.loads(raw)
    except Exception as exc:
        return json.dumps({"error": f"OpenAI extraction failed: {exc}", "url": url})

    # Attach images and source info
    extracted["image_urls"] = images[:10]    # keep up to 10 images
    extracted["source_url"] = url
    extracted["source_site"] = _guess_site_name(url)

    return json.dumps({"property": extracted})


def _guess_site_name(url: str) -> str:
    domain = urlparse(url).netloc.lower()
    if "buyrentkenya" in domain:
        return "BuyRentKenya"
    if "pigiame" in domain:
        return "PigiaMe"
    if "property24" in domain:
        return "Property24"
    return domain


@tool
def check_duplicate(source_url: str) -> str:
    """
    Check whether a property with this source URL has already been saved.
    Returns JSON: {"exists": true/false}
    """
    try:
        exists = fb.source_url_exists(source_url)
        return json.dumps({"exists": exists, "source_url": source_url})
    except Exception as exc:
        return json.dumps({"error": str(exc)})


@tool
def save_property_listing(property_json: str) -> str:
    """
    Validate, upload images to Firebase Storage, and write the property to
    the Firestore `properties` collection.

    property_json: JSON string with the fields from scrape_property_details.

    Returns JSON with the new Firestore document ID on success.
    """
    agent_id = os.environ.get("SCRAPER_AGENT_ID", "scraper_bot")
    default_status = os.environ.get("SCRAPER_DEFAULT_STATUS", "published")

    try:
        raw = json.loads(property_json) if isinstance(property_json, str) else property_json
    except json.JSONDecodeError as exc:
        return json.dumps({"error": f"Invalid JSON: {exc}"})

    # Validate with Pydantic
    try:
        scraped = ScrapedProperty(**raw)
    except Exception as exc:
        return json.dumps({"error": f"Validation error: {exc}"})

    # Reserve a Firestore ID first so we can build the Storage path
    property_id = fb.get_db().collection("properties").document().id

    # ── Upload images ──────────────────────────────────────────────────────────
    uploaded_urls: list[str] = []
    for idx, img_url in enumerate(scraped.image_urls[:8]):   # max 8 images
        try:
            time.sleep(0.5)
            img_bytes, content_type = _download_image(img_url)
            if img_bytes:
                public_url = fb.upload_image_bytes(img_bytes, agent_id, property_id, idx, content_type)
                uploaded_urls.append(public_url)
        except Exception as exc:
            print(f"[scraper] Image upload failed ({img_url}): {exc}")

    if not uploaded_urls:
        print("[scraper] Warning: no images uploaded for", scraped.source_url)

    # ── Build Firestore document ───────────────────────────────────────────────
    fs_prop = FirestoreProperty(
        agent_id=agent_id,
        title=scraped.title,
        description=scraped.description,
        city=scraped.city,
        neighborhood=scraped.neighborhood,
        address=scraped.address,
        listing_type=scraped.listing_type,
        property_type=scraped.property_type,
        price=scraped.price,
        currency=scraped.currency,
        bedrooms=scraped.bedrooms,
        bathrooms=scraped.bathrooms,
        size_sqm=scraped.size_sqm,
        parking=scraped.parking,
        furnishing=scraped.furnishing,
        amenities=scraped.amenities,
        status=default_status,
        thumbnail_url=uploaded_urls[0] if uploaded_urls else None,
        image_urls=uploaded_urls,
        source_url=scraped.source_url,
        source_site=scraped.source_site,
    )

    doc_data = fs_prop.to_firestore_dict()

    # Write with the pre-reserved ID
    fb.get_db().collection("properties").document(property_id).set(
        {**doc_data, "created_at": fb.firestore.SERVER_TIMESTAMP, "updated_at": fb.firestore.SERVER_TIMESTAMP}
    )

    return json.dumps({
        "success": True,
        "property_id": property_id,
        "title": scraped.title,
        "city": scraped.city,
        "images_uploaded": len(uploaded_urls),
    })


@tool
def count_saved_today() -> str:
    """Return how many properties the scraper has already saved today."""
    try:
        n = fb.count_scraped_today()
        target = int(os.environ.get("SCRAPER_DAILY_TARGET", "10"))
        return json.dumps({"saved_today": n, "target": target, "remaining": max(0, target - n)})
    except Exception as exc:
        return json.dumps({"error": str(exc)})


# ── Internal image download helper ────────────────────────────────────────────

ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp"}
MAX_IMAGE_BYTES = 15 * 1024 * 1024   # 15 MB hard cap before PIL decode


def _download_image(url: str) -> tuple[bytes | None, str]:
    """Download an image, validate it, resize, and return (jpeg_bytes, content_type)."""
    try:
        with httpx.Client(headers=HEADERS, follow_redirects=True, timeout=15) as client:
            resp = client.get(url)
            resp.raise_for_status()
            content_type = resp.headers.get("content-type", "image/jpeg").split(";")[0].strip()

        # Reject non-image or suspiciously large responses before decoding
        if content_type not in ALLOWED_IMAGE_TYPES:
            return None, "image/jpeg"
        if len(resp.content) > MAX_IMAGE_BYTES:
            return None, "image/jpeg"

        img = Image.open(io.BytesIO(resp.content)).convert("RGB")

        # Resize if very large (cap longest side at 1600px)
        max_side = 1600
        if max(img.size) > max_side:
            img.thumbnail((max_side, max_side), Image.LANCZOS)

        buf = io.BytesIO()
        img.save(buf, format="JPEG", quality=88, optimize=True)
        return buf.getvalue(), "image/jpeg"
    except Exception:
        return None, "image/jpeg"
