#!/usr/bin/env python3
"""
CLI script to scrape interview data from Reddit and Glassdoor.

Usage:
    python scrape.py --source=reddit --company=google --limit=10
    python scrape.py --source=glassdoor --company=google --limit=10
    python scrape.py --source=all --company=google --limit=10

Environment variables required:
    REDDIT_CLIENT_ID     - Reddit API client ID
    REDDIT_CLIENT_SECRET - Reddit API client secret
    SUPABASE_URL         - Supabase project URL
    SUPABASE_ANON_KEY    - Supabase anonymous key
"""

import argparse
import logging
import sys
from typing import Optional

from scrapers.reddit import scrape_reddit
from scrapers.glassdoor import scrape_glassdoor, GlassdoorBlockedError
from scrapers.storage import ScraperStorage, ScrapeRunResult

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)


def run_reddit_scraper(
    company: str, limit: int, storage: Optional[ScraperStorage] = None
) -> ScrapeRunResult:
    """Run Reddit scraper and optionally store results."""
    logger.info(f"Scraping Reddit for '{company}' (limit: {limit})...")

    try:
        items = scrape_reddit(company, limit=limit)
        logger.info(f"Fetched {len(items)} posts from Reddit")

        new_items = 0
        duplicates = 0

        if storage and items:
            new_items, duplicates = storage.store_items(items, "reddit")
            logger.info(f"Stored {new_items} new, skipped {duplicates} duplicates")

        result = ScrapeRunResult(
            source="reddit",
            company_slug=company.lower().replace(" ", "-"),
            total_fetched=len(items),
            new_items=new_items,
            duplicates_skipped=duplicates,
            errors=0,
        )

        if storage:
            storage.log_scrape_run(result)

        return result

    except Exception as e:
        logger.error(f"Reddit scraper failed: {e}")
        result = ScrapeRunResult(
            source="reddit",
            company_slug=company.lower().replace(" ", "-"),
            total_fetched=0,
            new_items=0,
            duplicates_skipped=0,
            errors=1,
            error_message=str(e),
        )
        if storage:
            storage.log_scrape_run(result)
        return result


def run_glassdoor_scraper(
    company: str, limit: int, storage: Optional[ScraperStorage] = None
) -> ScrapeRunResult:
    """Run Glassdoor scraper and optionally store results."""
    logger.info(f"Scraping Glassdoor for '{company}' (limit: {limit})...")

    try:
        items = scrape_glassdoor(company, limit=limit)
        logger.info(f"Fetched {len(items)} reviews from Glassdoor")

        new_items = 0
        duplicates = 0

        if storage and items:
            new_items, duplicates = storage.store_items(items, "glassdoor")
            logger.info(f"Stored {new_items} new, skipped {duplicates} duplicates")

        result = ScrapeRunResult(
            source="glassdoor",
            company_slug=company.lower().replace(" ", "-"),
            total_fetched=len(items),
            new_items=new_items,
            duplicates_skipped=duplicates,
            errors=0,
        )

        if storage:
            storage.log_scrape_run(result)

        return result

    except GlassdoorBlockedError as e:
        logger.warning(f"Glassdoor blocked: {e}")
        result = ScrapeRunResult(
            source="glassdoor",
            company_slug=company.lower().replace(" ", "-"),
            total_fetched=0,
            new_items=0,
            duplicates_skipped=0,
            errors=1,
            error_message=f"Blocked: {e}",
        )
        if storage:
            storage.log_scrape_run(result)
        return result

    except Exception as e:
        logger.error(f"Glassdoor scraper failed: {e}")
        result = ScrapeRunResult(
            source="glassdoor",
            company_slug=company.lower().replace(" ", "-"),
            total_fetched=0,
            new_items=0,
            duplicates_skipped=0,
            errors=1,
            error_message=str(e),
        )
        if storage:
            storage.log_scrape_run(result)
        return result


def main():
    parser = argparse.ArgumentParser(
        description="Scrape interview data from Reddit and Glassdoor"
    )
    parser.add_argument(
        "--source",
        choices=["reddit", "glassdoor", "all"],
        required=True,
        help="Source to scrape: reddit, glassdoor, or all",
    )
    parser.add_argument(
        "--company",
        required=True,
        help="Company name to search for",
    )
    parser.add_argument(
        "--limit",
        type=int,
        default=25,
        help="Maximum items to fetch (default: 25)",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Fetch data but don't store to database",
    )

    args = parser.parse_args()

    # Initialize storage unless dry run
    storage = None
    if not args.dry_run:
        try:
            storage = ScraperStorage()
            logger.info("Connected to Supabase")
        except ValueError as e:
            logger.error(f"Storage initialization failed: {e}")
            logger.info("Running in dry-run mode (no storage)")

    results = []

    if args.source in ("reddit", "all"):
        result = run_reddit_scraper(args.company, args.limit, storage)
        results.append(result)

    if args.source in ("glassdoor", "all"):
        result = run_glassdoor_scraper(args.company, args.limit, storage)
        results.append(result)

    # Print summary
    print("\n" + "=" * 50)
    print("SCRAPE SUMMARY")
    print("=" * 50)

    total_new = 0
    total_dup = 0
    total_errors = 0

    for result in results:
        status = "✓" if result.errors == 0 else "✗"
        print(
            f"{status} {result.source.upper()}: "
            f"{result.new_items} new, {result.duplicates_skipped} duplicates"
        )
        if result.error_message:
            print(f"  Error: {result.error_message}")
        total_new += result.new_items
        total_dup += result.duplicates_skipped
        total_errors += result.errors

    print("-" * 50)
    print(f"Total: {total_new} new items, {total_dup} duplicates, {total_errors} errors")

    # Exit with error code if any scraper failed
    if total_errors > 0:
        sys.exit(1)


if __name__ == "__main__":
    main()
