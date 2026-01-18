#!/usr/bin/env python3
"""
CLI script to scrape interview data from Reddit and Glassdoor.

Usage:
    python scrape.py --source=reddit --company=google --limit=10
    python scrape.py --source=reddit --all --limit=25 --with-comments
    python scrape.py --source=glassdoor --company=google --limit=10
    python scrape.py --source=all --company=google --limit=10

Environment variables required:
    REDDIT_CLIENT_ID     - Reddit API client ID
    REDDIT_CLIENT_SECRET - Reddit API client secret
    SUPABASE_URL         - Supabase project URL
    SUPABASE_ANON_KEY    - Supabase anonymous key
"""

import argparse
import json
import logging
import sys
from pathlib import Path
from typing import Optional, List

from dotenv import load_dotenv

# Load environment variables from project root .env.local
project_root = Path(__file__).parent.parent.parent
load_dotenv(project_root / ".env.local")

from scrapers.reddit import scrape_reddit
from scrapers.glassdoor import scrape_glassdoor, GlassdoorBlockedError
from scrapers.storage import ScraperStorage, ScrapeRunResult

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)


def load_companies() -> List[str]:
    """Load company slugs from search_volume.json."""
    # Path relative to project root
    data_path = Path(__file__).parent.parent.parent / "data" / "search_volume.json"
    if not data_path.exists():
        raise FileNotFoundError(f"Company list not found: {data_path}")

    with open(data_path) as f:
        data = json.load(f)

    return [company["slug"] for company in data["companies"]]


def run_reddit_scraper(
    company: str, limit: int, storage: Optional[ScraperStorage] = None,
    fetch_comments: bool = True
) -> ScrapeRunResult:
    """Run Reddit scraper and optionally store results."""
    logger.info(f"Scraping Reddit for '{company}' (limit: {limit}, comments: {fetch_comments})...")

    try:
        items = scrape_reddit(company, limit=limit, fetch_comments=fetch_comments)
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
    company_group = parser.add_mutually_exclusive_group(required=True)
    company_group.add_argument(
        "--company",
        help="Company name/slug to search for",
    )
    company_group.add_argument(
        "--all",
        action="store_true",
        dest="all_companies",
        help="Scrape all 105 companies from search_volume.json",
    )
    parser.add_argument(
        "--limit",
        type=int,
        default=25,
        help="Maximum items to fetch per company (default: 25)",
    )
    parser.add_argument(
        "--with-comments",
        action="store_true",
        dest="with_comments",
        help="Fetch comments for each post (slower but richer data)",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Fetch data but don't store to database",
    )

    args = parser.parse_args()

    # Get list of companies to scrape
    if args.all_companies:
        companies = load_companies()
        logger.info(f"Loaded {len(companies)} companies from search_volume.json")
    else:
        companies = [args.company]

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
    total_companies = len(companies)

    for i, company in enumerate(companies, 1):
        logger.info(f"\n[{i}/{total_companies}] Processing {company}...")

        if args.source in ("reddit", "all"):
            result = run_reddit_scraper(
                company, args.limit, storage, fetch_comments=args.with_comments
            )
            results.append(result)

        if args.source in ("glassdoor", "all"):
            result = run_glassdoor_scraper(company, args.limit, storage)
            results.append(result)

    # Print summary
    print("\n" + "=" * 50)
    print("SCRAPE SUMMARY")
    print("=" * 50)

    total_new = 0
    total_dup = 0
    total_errors = 0

    # Group results by company for cleaner output
    companies_seen = set()
    for result in results:
        company_key = f"{result.company_slug}:{result.source}"
        if company_key not in companies_seen:
            companies_seen.add(company_key)
            status = "✓" if result.errors == 0 else "✗"
            print(
                f"{status} {result.company_slug} ({result.source}): "
                f"{result.new_items} new, {result.duplicates_skipped} duplicates"
            )
            if result.error_message:
                print(f"  Error: {result.error_message}")
        total_new += result.new_items
        total_dup += result.duplicates_skipped
        total_errors += result.errors

    print("-" * 50)
    print(f"Total: {total_new} new items, {total_dup} duplicates, {total_errors} errors")
    print(f"Companies processed: {total_companies}")

    # Exit with error code if any scraper failed
    if total_errors > 0:
        sys.exit(1)


if __name__ == "__main__":
    main()
