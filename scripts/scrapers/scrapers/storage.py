"""Supabase storage for scraped data."""

import os
import logging
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any
from dataclasses import dataclass, asdict
from supabase import create_client, Client

logger = logging.getLogger(__name__)


@dataclass
class ScrapedItem:
    """A single scraped item."""

    company_slug: str
    source: str  # 'reddit' or 'glassdoor'
    source_id: str  # Unique ID from source (e.g., Reddit post ID)
    content: str  # Main text content
    metadata: Dict[str, Any]  # Additional fields (title, comments, etc.)


@dataclass
class ScrapeRunResult:
    """Result of a scrape run."""

    source: str
    company_slug: str
    total_fetched: int
    new_items: int
    duplicates_skipped: int
    errors: int
    error_message: Optional[str] = None


class ScraperStorage:
    """Manages storage of scraped data to Supabase."""

    def __init__(self, supabase_url: Optional[str] = None, supabase_key: Optional[str] = None):
        """Initialize with Supabase credentials."""
        url = (
            supabase_url
            or os.environ.get("SUPABASE_URL")
            or os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
        )
        key = (
            supabase_key
            or os.environ.get("SUPABASE_ANON_KEY")
            or os.environ.get("NEXT_PUBLIC_SUPABASE_ANON_KEY")
        )

        if not url or not key:
            raise ValueError(
                "Supabase credentials required. Set SUPABASE_URL/NEXT_PUBLIC_SUPABASE_URL "
                "and SUPABASE_ANON_KEY/NEXT_PUBLIC_SUPABASE_ANON_KEY environment variables."
            )

        self.client: Client = create_client(url, key)

    def store_items(
        self, items: List[ScrapedItem], source: str
    ) -> tuple[int, int]:
        """
        Store items with deduplication via source_id.

        Returns:
            Tuple of (new_items, duplicates_skipped)
        """
        table_name = f"scraped_{source}"
        new_count = 0
        dup_count = 0

        for item in items:
            try:
                # Use upsert with ON CONFLICT DO NOTHING behavior
                result = self.client.table(table_name).upsert(
                    {
                        "company_slug": item.company_slug,
                        "source": item.source,
                        "source_id": item.source_id,
                        "content": item.content,
                        "metadata": item.metadata,
                        "scraped_at": datetime.now(timezone.utc).isoformat(),
                    },
                    on_conflict="source_id",
                    ignore_duplicates=True,
                ).execute()

                # Check if item was inserted (not a duplicate)
                if result.data:
                    new_count += 1
                else:
                    dup_count += 1

            except Exception as e:
                logger.error(f"Error storing item {item.source_id}: {e}")
                dup_count += 1  # Treat errors as skipped

        return new_count, dup_count

    def log_scrape_run(self, result: ScrapeRunResult) -> None:
        """Log a scrape run to the scrape_runs table."""
        try:
            self.client.table("scrape_runs").insert(
                {
                    "source": result.source,
                    "company_slug": result.company_slug,
                    "total_fetched": result.total_fetched,
                    "new_items": result.new_items,
                    "duplicates_skipped": result.duplicates_skipped,
                    "errors": result.errors,
                    "error_message": result.error_message,
                    "created_at": datetime.now(timezone.utc).isoformat(),
                }
            ).execute()
        except Exception as e:
            logger.error(f"Failed to log scrape run: {e}")

    def get_items_for_company(
        self, company_slug: str, source: str
    ) -> List[Dict[str, Any]]:
        """Retrieve all items for a company from a source."""
        table_name = f"scraped_{source}"
        result = self.client.table(table_name).select("*").eq(
            "company_slug", company_slug
        ).execute()
        return result.data or []
