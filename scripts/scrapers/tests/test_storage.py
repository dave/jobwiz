"""Tests for Supabase storage."""

import pytest
from unittest.mock import Mock, patch, MagicMock
from datetime import datetime, timezone

from scrapers.storage import ScraperStorage, ScrapedItem, ScrapeRunResult


class TestScrapedItem:
    def test_creates_item(self):
        """Should create a scraped item with all fields."""
        item = ScrapedItem(
            company_slug="google",
            source="reddit",
            source_id="abc123",
            content="Test content",
            metadata={"title": "Test"},
        )
        assert item.company_slug == "google"
        assert item.source == "reddit"
        assert item.source_id == "abc123"
        assert item.content == "Test content"
        assert item.metadata == {"title": "Test"}


class TestScrapeRunResult:
    def test_creates_result(self):
        """Should create a scrape run result."""
        result = ScrapeRunResult(
            source="reddit",
            company_slug="google",
            total_fetched=10,
            new_items=8,
            duplicates_skipped=2,
            errors=0,
        )
        assert result.source == "reddit"
        assert result.total_fetched == 10
        assert result.new_items == 8
        assert result.duplicates_skipped == 2

    def test_error_message_optional(self):
        """Error message should be optional."""
        result = ScrapeRunResult(
            source="reddit",
            company_slug="google",
            total_fetched=0,
            new_items=0,
            duplicates_skipped=0,
            errors=1,
            error_message="Connection timeout",
        )
        assert result.error_message == "Connection timeout"


class TestScraperStorage:
    @patch("scrapers.storage.create_client")
    def test_initializes_with_credentials(self, mock_create_client):
        """Should initialize Supabase client with credentials."""
        storage = ScraperStorage(
            supabase_url="https://test.supabase.co", supabase_key="test_key"
        )
        mock_create_client.assert_called_once_with(
            "https://test.supabase.co", "test_key"
        )

    @patch("scrapers.storage.create_client")
    def test_uses_environment_variables(self, mock_create_client):
        """Should fall back to environment variables."""
        with patch.dict(
            "os.environ",
            {
                "SUPABASE_URL": "https://env.supabase.co",
                "SUPABASE_ANON_KEY": "env_key",
            },
        ):
            storage = ScraperStorage()
            mock_create_client.assert_called_once_with(
                "https://env.supabase.co", "env_key"
            )

    def test_raises_without_credentials(self):
        """Should raise if credentials not provided."""
        with patch.dict("os.environ", {}, clear=True):
            with pytest.raises(ValueError, match="Supabase credentials required"):
                ScraperStorage()

    @patch("scrapers.storage.create_client")
    def test_store_items_calls_upsert(self, mock_create_client):
        """Should call upsert for each item."""
        mock_client = MagicMock()
        mock_table = MagicMock()
        mock_table.upsert.return_value.execute.return_value.data = [{}]
        mock_client.table.return_value = mock_table
        mock_create_client.return_value = mock_client

        storage = ScraperStorage(
            supabase_url="https://test.supabase.co", supabase_key="test_key"
        )

        items = [
            ScrapedItem(
                company_slug="google",
                source="reddit",
                source_id="abc123",
                content="Test",
                metadata={},
            )
        ]

        new_count, dup_count = storage.store_items(items, "reddit")

        mock_client.table.assert_called_with("scraped_reddit")
        assert mock_table.upsert.called

    @patch("scrapers.storage.create_client")
    def test_store_items_counts_new_vs_duplicate(self, mock_create_client):
        """Should count new items vs duplicates."""
        mock_client = MagicMock()
        mock_table = MagicMock()
        # First item: inserted (returns data)
        # Second item: duplicate (returns empty)
        mock_table.upsert.return_value.execute.side_effect = [
            Mock(data=[{}]),  # New item
            Mock(data=[]),  # Duplicate
        ]
        mock_client.table.return_value = mock_table
        mock_create_client.return_value = mock_client

        storage = ScraperStorage(
            supabase_url="https://test.supabase.co", supabase_key="test_key"
        )

        items = [
            ScrapedItem("google", "reddit", "abc123", "Test1", {}),
            ScrapedItem("google", "reddit", "def456", "Test2", {}),
        ]

        new_count, dup_count = storage.store_items(items, "reddit")

        assert new_count == 1
        assert dup_count == 1

    @patch("scrapers.storage.create_client")
    def test_log_scrape_run_inserts_record(self, mock_create_client):
        """Should insert scrape run record."""
        mock_client = MagicMock()
        mock_table = MagicMock()
        mock_client.table.return_value = mock_table
        mock_create_client.return_value = mock_client

        storage = ScraperStorage(
            supabase_url="https://test.supabase.co", supabase_key="test_key"
        )

        result = ScrapeRunResult(
            source="reddit",
            company_slug="google",
            total_fetched=10,
            new_items=8,
            duplicates_skipped=2,
            errors=0,
        )

        storage.log_scrape_run(result)

        mock_client.table.assert_called_with("scrape_runs")
        assert mock_table.insert.called

    @patch("scrapers.storage.create_client")
    def test_get_items_for_company(self, mock_create_client):
        """Should query items for a company."""
        mock_client = MagicMock()
        mock_table = MagicMock()
        mock_table.select.return_value.eq.return_value.execute.return_value.data = [
            {"id": "1", "content": "Test"}
        ]
        mock_client.table.return_value = mock_table
        mock_create_client.return_value = mock_client

        storage = ScraperStorage(
            supabase_url="https://test.supabase.co", supabase_key="test_key"
        )

        items = storage.get_items_for_company("google", "reddit")

        mock_client.table.assert_called_with("scraped_reddit")
        mock_table.select.assert_called_with("*")
        assert len(items) == 1
        assert items[0]["content"] == "Test"


class TestDeduplication:
    @patch("scrapers.storage.create_client")
    def test_generates_unique_source_id(self, mock_create_client):
        """source_id should be unique per post."""
        item1 = ScrapedItem("google", "reddit", "unique_id_1", "Content", {})
        item2 = ScrapedItem("google", "reddit", "unique_id_2", "Content", {})
        item3 = ScrapedItem("google", "reddit", "unique_id_1", "Content", {})  # Duplicate

        assert item1.source_id != item2.source_id
        assert item1.source_id == item3.source_id  # Same ID = duplicate

    @patch("scrapers.storage.create_client")
    def test_upsert_uses_source_id_conflict(self, mock_create_client):
        """Should use ON CONFLICT for source_id."""
        mock_client = MagicMock()
        mock_table = MagicMock()
        mock_table.upsert.return_value.execute.return_value.data = [{}]
        mock_client.table.return_value = mock_table
        mock_create_client.return_value = mock_client

        storage = ScraperStorage(
            supabase_url="https://test.supabase.co", supabase_key="test_key"
        )

        items = [ScrapedItem("google", "reddit", "abc123", "Test", {})]
        storage.store_items(items, "reddit")

        # Verify upsert was called with on_conflict="source_id"
        call_args = mock_table.upsert.call_args
        assert call_args.kwargs["on_conflict"] == "source_id"
        assert call_args.kwargs["ignore_duplicates"] == True
