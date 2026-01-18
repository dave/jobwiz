#!/usr/bin/env python3
"""
CLI script to generate company trivia content.

Usage:
    python generate.py --company=google --limit=10
    python generate.py --company=google --limit=10 --dry-run
    python generate.py --company=google --limit=10 --mock

Environment variables required:
    OPENAI_API_KEY       - OpenAI API key (unless --mock is used)
    SUPABASE_URL         - Supabase project URL (unless --dry-run is used)
    SUPABASE_ANON_KEY    - Supabase anonymous key (unless --dry-run is used)
"""

import argparse
import json
import logging
import os
import sys
from pathlib import Path
from typing import Optional

from trivia.wikipedia import WikipediaFetcher
from trivia.news import NewsFetcher
from trivia.generator import QuizGenerator
from trivia.storage import TriviaStorage, TriviaRunResult

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)


def load_search_volume() -> dict:
    """Load search volume data to get company info."""
    # Look for search_volume.json relative to repo root
    repo_root = Path(__file__).parent.parent.parent
    search_volume_path = repo_root / "data" / "search_volume.json"

    if not search_volume_path.exists():
        logger.warning(f"search_volume.json not found at {search_volume_path}")
        return {"companies": []}

    with open(search_volume_path) as f:
        return json.load(f)


def get_company_from_search_volume(slug: str) -> Optional[dict]:
    """Get company info from search_volume.json by slug."""
    data = load_search_volume()
    for company in data.get("companies", []):
        if company.get("slug") == slug:
            return company
    return None


def run_generator(
    company_slug: str,
    limit: int,
    dry_run: bool = False,
    mock: bool = False,
) -> TriviaRunResult:
    """Run trivia generation for a company."""

    # Get company name from search_volume.json or use slug as fallback
    company_info = get_company_from_search_volume(company_slug)
    company_name = company_info["name"] if company_info else company_slug.title()

    logger.info(f"Generating trivia for '{company_name}' (slug: {company_slug})...")

    # Initialize fetchers
    wiki_fetcher = WikipediaFetcher()
    news_fetcher = NewsFetcher()

    # Fetch data
    logger.info("Fetching Wikipedia data...")
    facts = wiki_fetcher.fetch_company(company_name)

    if facts:
        logger.info(f"Found Wikipedia data: HQ={facts.headquarters}, Founded={facts.founding_date}")
    else:
        logger.warning(f"No Wikipedia data found for {company_name}")

    logger.info("Fetching news data...")
    news_items = news_fetcher.fetch_news(company_name, limit=5)
    logger.info(f"Found {len(news_items)} news items")

    # Generate trivia
    trivia_items = []

    if mock:
        logger.info("Using mock trivia generator (no OpenAI calls)")
        generator = None
        # Create mock trivia without API
        from trivia.generator import QuizGenerator
        # Create a generator instance just for mock method
        class MockGenerator:
            def generate_mock_trivia(self, slug, name, limit):
                from trivia.generator import TriviaItem
                from datetime import date
                items = []
                source_date = date.today()

                items.append(TriviaItem(
                    company_slug=slug,
                    fact_type="founding",
                    format="quiz",
                    question=f"When was {name} founded?",
                    answer="1998",
                    options=["1995", "2000", "2004"],
                    source_url=f"https://en.wikipedia.org/wiki/{name.replace(' ', '_')}",
                    source_date=source_date,
                ))

                items.append(TriviaItem(
                    company_slug=slug,
                    fact_type="hq",
                    format="flashcard",
                    question=f"Where is {name}'s headquarters?",
                    answer="Mountain View, California",
                    source_url=f"https://en.wikipedia.org/wiki/{name.replace(' ', '_')}",
                    source_date=source_date,
                ))

                items.append(TriviaItem(
                    company_slug=slug,
                    fact_type="product",
                    format="factoid",
                    question=None,
                    answer=f"{name} is known for its innovative products and services.",
                    source_url=f"https://en.wikipedia.org/wiki/{name.replace(' ', '_')}",
                    source_date=source_date,
                ))

                return items[:limit]

        mock_gen = MockGenerator()
        trivia_items = mock_gen.generate_mock_trivia(company_slug, company_name, limit)
    else:
        # Use real OpenAI generator
        try:
            generator = QuizGenerator()
            if facts:
                trivia_items = generator.generate_from_facts(
                    company_slug=company_slug,
                    company_name=company_name,
                    facts=facts,
                    news_items=news_items,
                    limit=limit,
                )
            else:
                logger.warning("No facts available, generating minimal trivia from news only")
                # Generate factoids from news only
                from trivia.generator import TriviaItem
                from datetime import date
                for news in news_items[:limit]:
                    trivia_items.append(TriviaItem(
                        company_slug=company_slug,
                        fact_type="news",
                        format="factoid",
                        question=None,
                        answer=f"Recent news: {news.title}",
                        source_url=news.link,
                        source_date=date.today(),
                    ))
        except ValueError as e:
            logger.error(f"Generator initialization failed: {e}")
            return TriviaRunResult(
                company_slug=company_slug,
                total_generated=0,
                new_items=0,
                duplicates_skipped=0,
                errors=1,
                error_message=str(e),
            )

    logger.info(f"Generated {len(trivia_items)} trivia items")

    # Store or display
    new_items = 0
    duplicates = 0

    if dry_run:
        logger.info("Dry run - not storing to database")
        print("\n" + "=" * 60)
        print("GENERATED TRIVIA (dry run)")
        print("=" * 60)
        for item in trivia_items:
            print(f"\n[{item.format.upper()}] {item.fact_type}")
            if item.question:
                print(f"Q: {item.question}")
            print(f"A: {item.answer}")
            if item.options:
                print(f"Wrong options: {item.options}")
            if item.source_url:
                print(f"Source: {item.source_url}")
        print("=" * 60)
        new_items = len(trivia_items)
    else:
        try:
            storage = TriviaStorage()
            new_items, duplicates = storage.store_items(trivia_items)
            logger.info(f"Stored {new_items} new items, skipped {duplicates} duplicates")

            # Log the run
            result = TriviaRunResult(
                company_slug=company_slug,
                total_generated=len(trivia_items),
                new_items=new_items,
                duplicates_skipped=duplicates,
                errors=0,
            )
            storage.log_run(result)
            return result

        except ValueError as e:
            logger.error(f"Storage initialization failed: {e}")
            logger.info("Falling back to dry-run mode")
            new_items = len(trivia_items)

    return TriviaRunResult(
        company_slug=company_slug,
        total_generated=len(trivia_items),
        new_items=new_items,
        duplicates_skipped=duplicates,
        errors=0,
    )


def main():
    parser = argparse.ArgumentParser(
        description="Generate company trivia content for interview prep"
    )
    parser.add_argument(
        "--company",
        required=True,
        help="Company slug (e.g., 'google', 'apple', 'microsoft')",
    )
    parser.add_argument(
        "--limit",
        type=int,
        default=15,
        help="Maximum trivia items to generate (default: 15)",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Generate trivia but don't store to database",
    )
    parser.add_argument(
        "--mock",
        action="store_true",
        help="Use mock generator (no OpenAI API calls)",
    )

    args = parser.parse_args()

    # Normalize company slug
    company_slug = args.company.lower().replace(" ", "-")

    result = run_generator(
        company_slug=company_slug,
        limit=args.limit,
        dry_run=args.dry_run,
        mock=args.mock,
    )

    # Print summary
    print("\n" + "=" * 50)
    print("GENERATION SUMMARY")
    print("=" * 50)
    status = "✓" if result.errors == 0 else "✗"
    print(f"{status} Company: {result.company_slug}")
    print(f"  Generated: {result.total_generated}")
    print(f"  New items: {result.new_items}")
    print(f"  Duplicates skipped: {result.duplicates_skipped}")
    if result.error_message:
        print(f"  Error: {result.error_message}")
    print("=" * 50)

    if result.errors > 0:
        sys.exit(1)


if __name__ == "__main__":
    main()
