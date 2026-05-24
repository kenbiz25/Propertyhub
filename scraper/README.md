# Kenya Properties — Daily Scraper

A LangGraph + OpenAI agent that discovers **10 new property listings** from Kenyan real estate websites every day, downloads their images to Firebase Storage, and publishes them directly to the Firestore `properties` collection.

---

## Architecture

```
main.py  (scheduler)
   │
   └─► agent.py  (LangGraph StateGraph — ReAct loop)
            │
            ├─► get_listing_urls       → scrapes listing-page HTML, returns detail URLs
            ├─► scrape_property_details → fetches a detail page, uses GPT-4o to extract fields
            ├─► check_duplicate        → queries Firestore by source_url
            ├─► save_property_listing  → downloads images, uploads to Firebase Storage, writes Firestore doc
            └─► count_saved_today      → tracks daily progress
```

**Sources scraped:**  BuyRentKenya · PigiaMe · Property24 Kenya

---

## Quick Start

### 1. Install Python dependencies

```bash
cd scraper
python -m venv .venv

# Windows
.venv\Scripts\activate

# macOS / Linux
source .venv/bin/activate

pip install -r requirements.txt
playwright install chromium   # optional, only needed for JS-heavy sites
```

### 2. Firebase service account

1. Go to [Firebase Console](https://console.firebase.google.com) → your project
2. **Project Settings → Service accounts → Generate new private key**
3. Save the downloaded JSON as `scraper/serviceAccountKey.json`

### 3. Environment variables

```bash
cp .env.example .env
```

Edit `scraper/.env`:

| Variable | Description |
|---|---|
| `OPENAI_API_KEY` | Your OpenAI API key |
| `FIREBASE_SERVICE_ACCOUNT_PATH` | Path to service account JSON (default: `serviceAccountKey.json`) |
| `FIREBASE_PROJECT_ID` | Your Firebase project ID |
| `FIREBASE_STORAGE_BUCKET` | e.g. `your-project.firebasestorage.app` |
| `SCRAPER_AGENT_ID` | Firestore `agent_id` stamped on all scraped listings (default: `scraper_bot`) |
| `SCRAPER_DAILY_TARGET` | Listings to save per run (default: `10`) |
| `SCRAPER_DEFAULT_STATUS` | `published` (live immediately) or `draft` (manual review) |
| `SCRAPER_RUN_TIME` | Daily run time in HH:MM, e.g. `07:00` |

### 4. Validate setup

```bash
python main.py --dry-run
```

This checks env vars and Firebase connectivity without any scraping.

### 5. Run once

```bash
python main.py
```

### 6. Run on a daily schedule

```bash
python main.py --schedule
```

The agent runs immediately, then again every day at `SCRAPER_RUN_TIME`.

---

## Firestore document structure

Scraped listings are written to the `properties` collection with these fields:

| Field | Example |
|---|---|
| `agent_id` | `"scraper_bot"` |
| `title` | `"3-bed apartment in Kilimani"` |
| `city` | `"Nairobi"` |
| `neighborhood` | `"Kilimani"` |
| `listing_type` | `"sale"` / `"rent"` |
| `property_type` | `"apartment"` |
| `price` | `8500000` |
| `bedrooms` | `3` |
| `bathrooms` | `2` |
| `size_sqm` | `120` |
| `amenities` | `["parking","security","gym"]` |
| `image_urls` | `["https://storage.googleapis.com/..."]` |
| `thumbnail_url` | first image URL |
| `status` | `"published"` |
| `source_url` | original listing URL (used for deduplication) |
| `source_site` | `"BuyRentKenya"` |

---

## Running on a server / cloud

### GitHub Actions (recommended for free daily runs)

Create `.github/workflows/scraper.yml` in the repo root:

```yaml
name: Daily property scraper

on:
  schedule:
    - cron: '0 4 * * *'   # 07:00 EAT = 04:00 UTC
  workflow_dispatch:       # manual trigger

jobs:
  scrape:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: scraper
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: '3.11'
      - run: pip install -r requirements.txt
      - run: python main.py
        env:
          OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
          FIREBASE_SERVICE_ACCOUNT_JSON: ${{ secrets.FIREBASE_SERVICE_ACCOUNT_JSON }}
          FIREBASE_PROJECT_ID: ${{ secrets.FIREBASE_PROJECT_ID }}
          FIREBASE_STORAGE_BUCKET: ${{ secrets.FIREBASE_STORAGE_BUCKET }}
          SCRAPER_AGENT_ID: scraper_bot
          SCRAPER_DAILY_TARGET: 10
          SCRAPER_DEFAULT_STATUS: published
```

Add `OPENAI_API_KEY`, `FIREBASE_SERVICE_ACCOUNT_JSON` (paste the full JSON string), `FIREBASE_PROJECT_ID`, and `FIREBASE_STORAGE_BUCKET` as **GitHub repository secrets**.

### Railway / Render / Fly.io

Set the same env vars in the platform dashboard. Start command:

```
python scraper/main.py --schedule
```

---

## Reviewing scraped listings

Scraped listings appear immediately on the website if `SCRAPER_DEFAULT_STATUS=published`.

To review before publishing, set `SCRAPER_DEFAULT_STATUS=draft`. Drafts are visible in the agent dashboard at `/agent/properties`.

To identify all scraped listings in Firestore, filter by `agent_id == "scraper_bot"`.

---

## Notes

- **Deduplication**: Each property's `source_url` is indexed in Firestore. A listing is never saved twice.
- **Images**: Up to 8 images per listing are downloaded, resized to max 1600px, and uploaded to `properties/scraper_bot/{id}/img_N.jpg`.
- **Rate limiting**: A configurable delay (`SCRAPER_REQUEST_DELAY`, default 2 s) is added between HTTP requests.
- **Robots.txt compliance**: The scraper respects server errors (4xx/5xx) and retries with exponential back-off. Check each site's terms of service before running in production.
