"""Tests for News fetcher."""

import pytest
from datetime import datetime
from unittest.mock import Mock, patch, MagicMock

from trivia.news import NewsFetcher, NewsItem


class TestNewsFetcher:
    """Tests for NewsFetcher class."""

    @pytest.fixture
    def fetcher(self):
        """Create a NewsFetcher instance."""
        return NewsFetcher()

    @patch("trivia.news.requests.Session")
    @patch("trivia.news.feedparser.parse")
    def test_fetch_news_returns_items(self, mock_feedparser, mock_session_class):
        """Should return NewsItem objects from RSS feed."""
        mock_session = MagicMock()
        mock_response = Mock()
        mock_response.content = b"<rss>...</rss>"
        mock_response.raise_for_status = Mock()
        mock_session.get.return_value = mock_response

        mock_feedparser.return_value = {
            "entries": [
                {
                    "title": "Google announces new AI features - TechCrunch",
                    "link": "https://techcrunch.com/article1",
                    "published_parsed": (2026, 1, 15, 10, 30, 0, 0, 15, 0),
                    "summary": "Google revealed new AI features today.",
                },
                {
                    "title": "Google stock rises - Reuters",
                    "link": "https://reuters.com/article2",
                    "published_parsed": (2026, 1, 14, 8, 0, 0, 0, 14, 0),
                    "summary": "Stock prices increased.",
                },
            ]
        }

        fetcher = NewsFetcher(session=mock_session)
        result = fetcher.fetch_news("Google", limit=10)

        assert len(result) == 2
        assert result[0].title == "Google announces new AI features"
        assert result[0].source == "TechCrunch"
        assert result[0].link == "https://techcrunch.com/article1"
        assert result[1].title == "Google stock rises"
        assert result[1].source == "Reuters"

    @patch("trivia.news.requests.Session")
    @patch("trivia.news.feedparser.parse")
    def test_fetch_news_respects_limit(self, mock_feedparser, mock_session_class):
        """Should respect the limit parameter."""
        mock_session = MagicMock()
        mock_response = Mock()
        mock_response.content = b"<rss>...</rss>"
        mock_response.raise_for_status = Mock()
        mock_session.get.return_value = mock_response

        mock_feedparser.return_value = {
            "entries": [
                {"title": f"News {i} - Source", "link": f"https://example.com/{i}"}
                for i in range(20)
            ]
        }

        fetcher = NewsFetcher(session=mock_session)
        result = fetcher.fetch_news("Google", limit=5)

        assert len(result) == 5

    @patch("trivia.news.requests.Session")
    @patch("trivia.news.feedparser.parse")
    def test_fetch_news_handles_empty_feed(self, mock_feedparser, mock_session_class):
        """Should return empty list for empty feed."""
        mock_session = MagicMock()
        mock_response = Mock()
        mock_response.content = b"<rss></rss>"
        mock_response.raise_for_status = Mock()
        mock_session.get.return_value = mock_response

        mock_feedparser.return_value = {"entries": []}

        fetcher = NewsFetcher(session=mock_session)
        result = fetcher.fetch_news("TotallyFakeCompany", limit=10)

        assert result == []

    @patch("trivia.news.requests.Session")
    def test_fetch_news_handles_request_error(self, mock_session_class):
        """Should return empty list on request error."""
        import requests as req
        mock_session = MagicMock()
        mock_session.get.side_effect = req.RequestException("Network error")

        fetcher = NewsFetcher(session=mock_session)
        result = fetcher.fetch_news("Google", limit=10)

        assert result == []

    def test_parse_entry_extracts_source(self):
        """Should extract source from title."""
        fetcher = NewsFetcher()

        entry = {
            "title": "Google announces new product - The Verge",
            "link": "https://theverge.com/article",
        }
        result = fetcher._parse_entry(entry)

        assert result is not None
        assert result.title == "Google announces new product"
        assert result.source == "The Verge"

    def test_parse_entry_handles_no_source(self):
        """Should handle titles without source."""
        fetcher = NewsFetcher()

        entry = {
            "title": "Simple headline",
            "link": "https://example.com/article",
        }
        result = fetcher._parse_entry(entry)

        assert result is not None
        assert result.title == "Simple headline"
        assert result.source == "Unknown"

    def test_parse_entry_parses_date(self):
        """Should parse publication date."""
        fetcher = NewsFetcher()

        entry = {
            "title": "News - Source",
            "link": "https://example.com",
            "published_parsed": (2026, 1, 15, 10, 30, 0, 0, 15, 0),
        }
        result = fetcher._parse_entry(entry)

        assert result is not None
        assert result.published == datetime(2026, 1, 15, 10, 30, 0)

    def test_parse_entry_handles_missing_date(self):
        """Should handle missing publication date."""
        fetcher = NewsFetcher()

        entry = {
            "title": "News - Source",
            "link": "https://example.com",
        }
        result = fetcher._parse_entry(entry)

        assert result is not None
        assert result.published is None

    def test_parse_entry_cleans_html_from_summary(self):
        """Should remove HTML tags from summary."""
        fetcher = NewsFetcher()

        entry = {
            "title": "News - Source",
            "link": "https://example.com",
            "summary": "<p>This is a <b>test</b> summary.</p>",
        }
        result = fetcher._parse_entry(entry)

        assert result is not None
        assert "<" not in result.summary
        assert ">" not in result.summary
        assert "test" in result.summary

    def test_parse_entry_returns_none_for_missing_required(self):
        """Should return None if title or link missing."""
        fetcher = NewsFetcher()

        assert fetcher._parse_entry({"link": "https://example.com"}) is None
        assert fetcher._parse_entry({"title": "Test"}) is None
        assert fetcher._parse_entry({}) is None

    @patch("trivia.news.requests.Session")
    @patch("trivia.news.feedparser.parse")
    def test_fetch_acquisition_news(self, mock_feedparser, mock_session_class):
        """Should fetch acquisition-related news."""
        mock_session = MagicMock()
        mock_response = Mock()
        mock_response.content = b"<rss>...</rss>"
        mock_response.raise_for_status = Mock()
        mock_session.get.return_value = mock_response

        mock_feedparser.return_value = {
            "entries": [
                {
                    "title": "Google acquires startup - TechCrunch",
                    "link": "https://techcrunch.com/acquisition",
                }
            ]
        }

        fetcher = NewsFetcher(session=mock_session)
        result = fetcher.fetch_acquisition_news("Google", limit=5)

        assert len(result) == 1
        # Verify query includes acquisition terms
        call_args = mock_session.get.call_args
        assert "acquisition" in call_args[0][0].lower() or "acquisition" in str(call_args)

    @patch("trivia.news.requests.Session")
    @patch("trivia.news.feedparser.parse")
    def test_fetch_executive_news(self, mock_feedparser, mock_session_class):
        """Should fetch executive-related news."""
        mock_session = MagicMock()
        mock_response = Mock()
        mock_response.content = b"<rss>...</rss>"
        mock_response.raise_for_status = Mock()
        mock_session.get.return_value = mock_response

        mock_feedparser.return_value = {
            "entries": [
                {
                    "title": "Google CEO speaks - Bloomberg",
                    "link": "https://bloomberg.com/ceo",
                }
            ]
        }

        fetcher = NewsFetcher(session=mock_session)
        result = fetcher.fetch_executive_news("Google", limit=5)

        assert len(result) == 1
