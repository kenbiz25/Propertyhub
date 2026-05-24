"""
Entry point for the Kenya Properties daily scraper.

Run modes
─────────
  python main.py            # run once immediately
  python main.py --schedule # run once now, then daily at SCRAPER_RUN_TIME
  python main.py --dry-run  # validate config & Firebase connection, no scraping
"""

from __future__ import annotations

import argparse
import logging
import os
import sys
from datetime import datetime

import schedule
import time as _time
from dotenv import load_dotenv

# ── Bootstrap ──────────────────────────────────────────────────────────────────

# Load .env from the project root (one level up from scraper/)
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), "..", ".env"))

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[logging.StreamHandler(open(sys.stdout.fileno(), mode="w", encoding="utf-8", closefd=False))],
)
log = logging.getLogger("scraper")

# ── Required env vars check ────────────────────────────────────────────────────

REQUIRED_VARS = [
    "OPENAI_API_KEY",
    "FIREBASE_PROJECT_ID",
    "FIREBASE_STORAGE_BUCKET",
]

def _check_env() -> bool:
    missing = [v for v in REQUIRED_VARS if not os.environ.get(v)]
    cred_a = os.environ.get("FIREBASE_SERVICE_ACCOUNT_PATH")
    cred_b = os.environ.get("FIREBASE_SERVICE_ACCOUNT_JSON")
    if not (cred_a or cred_b):
        missing.append("FIREBASE_SERVICE_ACCOUNT_PATH or FIREBASE_SERVICE_ACCOUNT_JSON")
    if missing:
        log.error("Missing required environment variables:\n  " + "\n  ".join(missing))
        return False
    return True


def _dry_run():
    """Validate config and Firebase connection without scraping."""
    log.info("-- Dry run ------------------------------------------")
    if not _check_env():
        sys.exit(1)
    log.info("Environment variables: OK")

    # Test Firebase connection
    import firebase_client as fb
    db = fb.get_db()
    _ = list(db.collection("properties").limit(1).stream())
    log.info("Firestore connection: OK")

    bucket = fb.get_bucket()
    log.info(f"Firebase Storage bucket: {bucket.name}  OK")

    target = int(os.environ.get("SCRAPER_DAILY_TARGET", "10"))
    run_time = os.environ.get("SCRAPER_RUN_TIME", "07:00")
    agent_id = os.environ.get("SCRAPER_AGENT_ID", "scraper_bot")
    log.info(f"Scraper config: target={target}, run_time={run_time}, agent_id={agent_id}")
    log.info("Dry run complete. All checks passed.")


# ── Main scraping job ──────────────────────────────────────────────────────────

def run_job() -> bool:
    """Run one scraping session. Returns True on success, False on failure."""
    if not _check_env():
        log.error("Aborting: missing environment variables.")
        return False

    log.info("=" * 60)
    log.info(f"Kenya Properties scraper started at {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    log.info("=" * 60)

    try:
        from agent import run_scraper
        summary = run_scraper()
        log.info("\n" + "-" * 60)
        log.info("AGENT SUMMARY:")
        log.info(summary)
        log.info("-" * 60)

        # Write GitHub Actions step summary if running in CI
        summary_file = os.environ.get("GITHUB_STEP_SUMMARY")
        if summary_file:
            with open(summary_file, "a") as f:
                f.write(f"## Kenya Properties Scraper\n\n```\n{summary}\n```\n")

        return True
    except Exception as exc:
        log.exception(f"Scraper failed with unhandled error: {exc}")
        return False


# ── CLI ────────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="Kenya Properties daily scraper")
    parser.add_argument(
        "--schedule",
        action="store_true",
        help="Run once now, then keep running on a daily schedule",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        dest="dry_run",
        help="Validate config & Firebase connectivity without scraping",
    )
    args = parser.parse_args()

    if args.dry_run:
        _dry_run()
        return

    # Always run once immediately
    success = run_job()
    if not success and not args.schedule:
        sys.exit(1)

    if args.schedule:
        run_time = os.environ.get("SCRAPER_RUN_TIME", "07:00")
        log.info(f"Scheduler active - next run at {run_time} daily. Press Ctrl+C to stop.")
        schedule.every().day.at(run_time).do(run_job)
        while True:
            schedule.run_pending()
            _time.sleep(30)


if __name__ == "__main__":
    main()
