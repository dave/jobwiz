"""Tests for Trivia Storage."""

import pytest
from datetime import date
from unittest.mock import Mock, patch, MagicMock

from trivia.storage import TriviaStorage, TriviaRunResult
from trivia.generator import TriviaItem


class TestTriviaStorage:
    """Tests for TriviaStorage class."""

    @patch.dict("os.environ", {
        "SUPABASE_URL": "https://test.supabase.co",
        "SUPABASE_ANON_KEY": "test-key"
    })
    @patch("trivia.storage.create_client")
    def test_init_with_env_vars(self, mock_create_client):
        """Should initialize with env vars."""
        storage = TriviaStorage()
        mock_create_client.assert_called_once_with(
            "https://test.supabase.co", "test-key"
        )

    @patch("trivia.storage.create_client")
    def test_init_with_explicit_credentials(self, mock_create_client):
        """Should accept explicit credentials."""
        storage = TriviaStorage(
            supabase_url="https://custom.supabase.co",
            supabase_key="custom-key"
        )
        mock_create_client.assert_called_once_with(
            "https://custom.supabase.co", "custom-key"
        )

    @patch.dict("os.environ", {}, clear=True)
    def test_init_raises_without_credentials(self):
        """Should raise if no credentials provided."""
        import os
        # Ensure env vars are cleared
        for key in ["SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_ANON_KEY", "NEXT_PUBLIC_SUPABASE_ANON_KEY"]:
            if key in os.environ:
                del os.environ[key]

        with pytest.raises(ValueError, match="Supabase credentials required"):
            TriviaStorage()

    @patch.dict("os.environ", {
        "SUPABASE_URL": "https://test.supabase.co",
        "SUPABASE_ANON_KEY": "test-key"
    })
    @patch("trivia.storage.create_client")
    def test_stores_with_source_url(self, mock_create_client):
        """Should save source_url for verification."""
        mock_client = MagicMock()
        mock_create_client.return_value = mock_client

        mock_result = MagicMock()
        mock_result.data = [{"id": "123"}]
        mock_client.table.return_value.upsert.return_value.execute.return_value = mock_result

        storage = TriviaStorage()
        item = TriviaItem(
            company_slug="google",
            fact_type="founding",
            format="quiz",
            question="When was Google founded?",
            answer="1998",
            options=["1995", "2000", "2004"],
            source_url="https://en.wikipedia.org/wiki/Google",
            source_date=date(2026, 1, 15),
        )

        new_count, dup_count = storage.store_items([item])

        # Verify upsert was called with source_url
        call_args = mock_client.table.return_value.upsert.call_args
        assert call_args[0][0]["source_url"] == "https://en.wikipedia.org/wiki/Google"

    @patch.dict("os.environ", {
        "SUPABASE_URL": "https://test.supabase.co",
        "SUPABASE_ANON_KEY": "test-key"
    })
    @patch("trivia.storage.create_client")
    def test_slug_matches_search_volume_format(self, mock_create_client):
        """company_slug should match format in search_volume.json."""
        mock_client = MagicMock()
        mock_create_client.return_value = mock_client

        mock_result = MagicMock()
        mock_result.data = [{"id": "123"}]
        mock_client.table.return_value.upsert.return_value.execute.return_value = mock_result

        storage = TriviaStorage()
        item = TriviaItem(
            company_slug="google",  # lowercase, hyphenated format
            fact_type="founding",
            format="flashcard",
            question="When was Google founded?",
            answer="1998",
        )

        storage.store_items([item])

        call_args = mock_client.table.return_value.upsert.call_args
        assert call_args[0][0]["company_slug"] == "google"

    @patch.dict("os.environ", {
        "SUPABASE_URL": "https://test.supabase.co",
        "SUPABASE_ANON_KEY": "test-key"
    })
    @patch("trivia.storage.create_client")
    def test_store_items_counts_new_and_duplicates(self, mock_create_client):
        """Should return correct counts for new and duplicate items."""
        mock_client = MagicMock()
        mock_create_client.return_value = mock_client

        # First item succeeds, second is duplicate
        mock_success = MagicMock()
        mock_success.data = [{"id": "123"}]

        mock_duplicate = MagicMock()
        mock_duplicate.data = []

        mock_client.table.return_value.upsert.return_value.execute.side_effect = [
            mock_success, mock_duplicate
        ]

        storage = TriviaStorage()
        items = [
            TriviaItem(
                company_slug="google",
                fact_type="founding",
                format="quiz",
                question="When was Google founded?",
                answer="1998",
                options=["1995", "2000", "2004"],
            ),
            TriviaItem(
                company_slug="google",
                fact_type="founding",
                format="quiz",
                question="When was Google founded?",  # Duplicate
                answer="1998",
                options=["1995", "2000", "2004"],
            ),
        ]

        new_count, dup_count = storage.store_items(items)

        assert new_count == 1
        assert dup_count == 1

    @patch.dict("os.environ", {
        "SUPABASE_URL": "https://test.supabase.co",
        "SUPABASE_ANON_KEY": "test-key"
    })
    @patch("trivia.storage.create_client")
    def test_store_items_handles_factoids_without_question(self, mock_create_client):
        """Should handle factoid items (no question) with insert."""
        mock_client = MagicMock()
        mock_create_client.return_value = mock_client

        mock_result = MagicMock()
        mock_result.data = [{"id": "123"}]
        mock_client.table.return_value.insert.return_value.execute.return_value = mock_result

        storage = TriviaStorage()
        item = TriviaItem(
            company_slug="google",
            fact_type="news",
            format="factoid",
            question=None,  # Factoid has no question
            answer="Google was founded in 1998.",
        )

        new_count, dup_count = storage.store_items([item])

        # Should use insert, not upsert, for factoids
        mock_client.table.return_value.insert.assert_called_once()

    @patch.dict("os.environ", {
        "SUPABASE_URL": "https://test.supabase.co",
        "SUPABASE_ANON_KEY": "test-key"
    })
    @patch("trivia.storage.create_client")
    def test_store_items_handles_errors(self, mock_create_client):
        """Should handle storage errors gracefully."""
        mock_client = MagicMock()
        mock_create_client.return_value = mock_client
        mock_client.table.return_value.upsert.return_value.execute.side_effect = Exception("DB Error")

        storage = TriviaStorage()
        item = TriviaItem(
            company_slug="google",
            fact_type="founding",
            format="quiz",
            question="Q?",
            answer="A",
            options=["B", "C", "D"],
        )

        new_count, dup_count = storage.store_items([item])

        # Error counts as skipped
        assert new_count == 0
        assert dup_count == 1

    @patch.dict("os.environ", {
        "SUPABASE_URL": "https://test.supabase.co",
        "SUPABASE_ANON_KEY": "test-key"
    })
    @patch("trivia.storage.create_client")
    def test_log_run(self, mock_create_client):
        """Should log run to trivia_runs table."""
        mock_client = MagicMock()
        mock_create_client.return_value = mock_client

        storage = TriviaStorage()
        result = TriviaRunResult(
            company_slug="google",
            total_generated=10,
            new_items=8,
            duplicates_skipped=2,
            errors=0,
        )

        storage.log_run(result)

        mock_client.table.assert_called_with("trivia_runs")
        call_args = mock_client.table.return_value.insert.call_args
        assert call_args[0][0]["company_slug"] == "google"
        assert call_args[0][0]["total_generated"] == 10
        assert call_args[0][0]["new_items"] == 8

    @patch.dict("os.environ", {
        "SUPABASE_URL": "https://test.supabase.co",
        "SUPABASE_ANON_KEY": "test-key"
    })
    @patch("trivia.storage.create_client")
    def test_get_trivia_for_company(self, mock_create_client):
        """Should retrieve trivia items for a company."""
        mock_client = MagicMock()
        mock_create_client.return_value = mock_client

        mock_result = MagicMock()
        mock_result.data = [
            {"id": "1", "question": "Q1"},
            {"id": "2", "question": "Q2"},
        ]
        mock_client.table.return_value.select.return_value.eq.return_value.execute.return_value = mock_result

        storage = TriviaStorage()
        items = storage.get_trivia_for_company("google")

        assert len(items) == 2
        mock_client.table.return_value.select.return_value.eq.assert_called_with(
            "company_slug", "google"
        )

    @patch.dict("os.environ", {
        "SUPABASE_URL": "https://test.supabase.co",
        "SUPABASE_ANON_KEY": "test-key"
    })
    @patch("trivia.storage.create_client")
    def test_get_trivia_count(self, mock_create_client):
        """Should return count of trivia items."""
        mock_client = MagicMock()
        mock_create_client.return_value = mock_client

        mock_result = MagicMock()
        mock_result.count = 15
        mock_client.table.return_value.select.return_value.eq.return_value.execute.return_value = mock_result

        storage = TriviaStorage()
        count = storage.get_trivia_count("google")

        assert count == 15

    @patch.dict("os.environ", {
        "SUPABASE_URL": "https://test.supabase.co",
        "SUPABASE_ANON_KEY": "test-key"
    })
    @patch("trivia.storage.create_client")
    def test_get_trivia_by_format(self, mock_create_client):
        """Should filter trivia by format."""
        mock_client = MagicMock()
        mock_create_client.return_value = mock_client

        mock_result = MagicMock()
        mock_result.data = [{"id": "1", "format": "quiz"}]
        mock_client.table.return_value.select.return_value.eq.return_value.eq.return_value.execute.return_value = mock_result

        storage = TriviaStorage()
        items = storage.get_trivia_by_format("google", "quiz")

        assert len(items) == 1

    @patch.dict("os.environ", {
        "SUPABASE_URL": "https://test.supabase.co",
        "SUPABASE_ANON_KEY": "test-key"
    })
    @patch("trivia.storage.create_client")
    def test_delete_trivia_for_company(self, mock_create_client):
        """Should delete all trivia for a company."""
        mock_client = MagicMock()
        mock_create_client.return_value = mock_client

        mock_result = MagicMock()
        mock_result.data = [{"id": "1"}, {"id": "2"}, {"id": "3"}]
        mock_client.table.return_value.delete.return_value.eq.return_value.execute.return_value = mock_result

        storage = TriviaStorage()
        count = storage.delete_trivia_for_company("google")

        assert count == 3


class TestTriviaRunResult:
    """Tests for TriviaRunResult dataclass."""

    def test_creates_with_required_fields(self):
        """Should create with required fields."""
        result = TriviaRunResult(
            company_slug="google",
            total_generated=10,
            new_items=8,
            duplicates_skipped=2,
            errors=0,
        )

        assert result.company_slug == "google"
        assert result.total_generated == 10
        assert result.new_items == 8
        assert result.duplicates_skipped == 2
        assert result.errors == 0
        assert result.error_message is None

    def test_creates_with_error_message(self):
        """Should store error message."""
        result = TriviaRunResult(
            company_slug="google",
            total_generated=0,
            new_items=0,
            duplicates_skipped=0,
            errors=1,
            error_message="API key invalid",
        )

        assert result.errors == 1
        assert result.error_message == "API key invalid"
