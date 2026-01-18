"""Supabase storage for company trivia."""

import os
import logging
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any
from dataclasses import dataclass

from supabase import create_client, Client

from .generator import TriviaItem

logger = logging.getLogger(__name__)


@dataclass
class TriviaRunResult:
    """Result of a trivia generation run."""

    company_slug: str
    total_generated: int
    new_items: int
    duplicates_skipped: int
    errors: int
    error_message: Optional[str] = None


class TriviaStorage:
    """Manages storage of company trivia to Supabase."""

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

    def store_items(self, items: List[TriviaItem]) -> tuple[int, int]:
        """
        Store trivia items with deduplication via unique question constraint.

        Returns:
            Tuple of (new_items, duplicates_skipped)
        """
        new_count = 0
        dup_count = 0

        for item in items:
            try:
                data = {
                    "company_slug": item.company_slug,
                    "fact_type": item.fact_type,
                    "format": item.format,
                    "question": item.question,
                    "answer": item.answer,
                    "options": item.options,
                    "source_url": item.source_url,
                    "source_date": item.source_date.isoformat() if item.source_date else None,
                    "created_at": datetime.now(timezone.utc).isoformat(),
                }

                # Use upsert with conflict handling on (company_slug, question)
                # If question is None (factoid), we need different handling
                if item.question:
                    result = self.client.table("company_trivia").upsert(
                        data,
                        on_conflict="company_slug,question",
                        ignore_duplicates=True,
                    ).execute()
                else:
                    # For factoids without questions, just insert
                    result = self.client.table("company_trivia").insert(data).execute()

                if result.data:
                    new_count += 1
                else:
                    dup_count += 1

            except Exception as e:
                # Check if it's a duplicate key error
                if "duplicate" in str(e).lower() or "unique" in str(e).lower():
                    dup_count += 1
                    logger.debug(f"Duplicate trivia item skipped: {item.question}")
                else:
                    logger.error(f"Error storing trivia item: {e}")
                    dup_count += 1

        return new_count, dup_count

    def log_run(self, result: TriviaRunResult) -> None:
        """Log a trivia generation run to the trivia_runs table."""
        try:
            self.client.table("trivia_runs").insert({
                "company_slug": result.company_slug,
                "total_generated": result.total_generated,
                "new_items": result.new_items,
                "duplicates_skipped": result.duplicates_skipped,
                "errors": result.errors,
                "error_message": result.error_message,
                "created_at": datetime.now(timezone.utc).isoformat(),
            }).execute()
        except Exception as e:
            logger.error(f"Failed to log trivia run: {e}")

    def get_trivia_for_company(self, company_slug: str) -> List[Dict[str, Any]]:
        """Retrieve all trivia items for a company."""
        result = self.client.table("company_trivia").select("*").eq(
            "company_slug", company_slug
        ).execute()
        return result.data or []

    def get_trivia_count(self, company_slug: str) -> int:
        """Get count of trivia items for a company."""
        result = self.client.table("company_trivia").select(
            "id", count="exact"
        ).eq("company_slug", company_slug).execute()
        return result.count or 0

    def get_trivia_by_format(
        self, company_slug: str, format: str
    ) -> List[Dict[str, Any]]:
        """Get trivia items of a specific format for a company."""
        result = self.client.table("company_trivia").select("*").eq(
            "company_slug", company_slug
        ).eq("format", format).execute()
        return result.data or []

    def delete_trivia_for_company(self, company_slug: str) -> int:
        """Delete all trivia for a company (for regeneration)."""
        result = self.client.table("company_trivia").delete().eq(
            "company_slug", company_slug
        ).execute()
        return len(result.data) if result.data else 0
