"""Tests for Glassdoor scraper."""

import pytest
from unittest.mock import Mock, patch, MagicMock

from scrapers.glassdoor import (
    GlassdoorScraper,
    scrape_glassdoor,
    GlassdoorConfig,
    GlassdoorBlockedError,
)


# Sample HTML fragments for mocking
SEARCH_RESULTS_HTML = """
<html>
<body>
    <a href="/Overview/Working-at-Google-EI_IE9079.htm">Google</a>
</body>
</html>
"""

BLOCKED_HTML = """
<html>
<body>
    <h1>Please verify you are a human</h1>
    <div class="captcha">Complete the CAPTCHA to continue</div>
</body>
</html>
"""

INTERVIEW_PAGE_HTML = """
<html>
<body>
    <div data-test="interview-question" id="review1">
        <p>Tell me about yourself</p>
        <span class="difficulty">Medium</span>
        <span class="outcome">Accepted Offer</span>
        <time>Jan 2024</time>
    </div>
    <div data-test="interview-question" id="review2">
        <p>Why Google?</p>
        <span class="difficulty">Easy</span>
    </div>
</body>
</html>
"""

EMPTY_RESULTS_HTML = """
<html>
<body>
    <div class="no-results">No interview reviews found</div>
</body>
</html>
"""


class TestGlassdoorScraper:
    @patch("scrapers.glassdoor.requests.Session")
    def test_parses_valid_html(self, mock_session):
        """Should extract review data from mocked HTML."""
        mock_response = Mock()
        mock_response.status_code = 200

        # First call: search for employer ID
        # Second call: interview page
        mock_response.text = SEARCH_RESULTS_HTML
        mock_session.return_value.get.side_effect = [
            Mock(text=SEARCH_RESULTS_HTML, status_code=200),
            Mock(text=INTERVIEW_PAGE_HTML, status_code=200),
            Mock(text=EMPTY_RESULTS_HTML, status_code=200),  # Page 2 - empty
        ]

        scraper = GlassdoorScraper(GlassdoorConfig(min_delay=0, max_delay=0))
        result = scraper.scrape("Google", limit=5)

        # Should find the 2 reviews from mocked HTML
        assert len(result) == 2
        assert result[0].source == "glassdoor"
        assert result[0].company_slug == "google"
        assert "Tell me about yourself" in result[0].content

    @patch("scrapers.glassdoor.requests.Session")
    def test_handles_blocked_response_403(self, mock_session):
        """Should return empty list and raise error on 403."""
        mock_session.return_value.get.return_value = Mock(
            text="Access Denied", status_code=403
        )

        scraper = GlassdoorScraper(GlassdoorConfig(min_delay=0, max_delay=0))
        result = scraper.scrape("Google", limit=5)

        # Should return empty (caught BlockedError)
        assert result == []

    @patch("scrapers.glassdoor.requests.Session")
    def test_handles_blocked_response_captcha(self, mock_session):
        """Should return empty list when captcha detected."""
        mock_session.return_value.get.return_value = Mock(
            text=BLOCKED_HTML, status_code=200
        )

        scraper = GlassdoorScraper(GlassdoorConfig(min_delay=0, max_delay=0))
        result = scraper.scrape("Google", limit=5)

        # Should return empty (caught BlockedError)
        assert result == []

    @patch("scrapers.glassdoor.requests.Session")
    def test_handles_rate_limit_429(self, mock_session):
        """Should return empty list on 429 rate limit."""
        mock_session.return_value.get.return_value = Mock(
            text="Too Many Requests", status_code=429
        )

        scraper = GlassdoorScraper(GlassdoorConfig(min_delay=0, max_delay=0))
        result = scraper.scrape("Google", limit=5)

        assert result == []

    @patch("scrapers.glassdoor.requests.Session")
    def test_extracts_employer_id_from_search(self, mock_session):
        """Should extract employer ID from search results."""
        mock_session.return_value.get.return_value = Mock(
            text=SEARCH_RESULTS_HTML, status_code=200
        )

        scraper = GlassdoorScraper(GlassdoorConfig(min_delay=0, max_delay=0))
        result = scraper.search_employer("Google")

        assert result is not None
        assert result["employer_id"] == "9079"

    @patch("scrapers.glassdoor.requests.Session")
    def test_handles_missing_employer(self, mock_session):
        """Should return None for unknown company."""
        mock_session.return_value.get.return_value = Mock(
            text="<html><body>No results</body></html>", status_code=200
        )

        scraper = GlassdoorScraper(GlassdoorConfig(min_delay=0, max_delay=0))
        result = scraper.search_employer("UnknownCompany12345")

        assert result is None

    @patch("scrapers.glassdoor.requests.Session")
    def test_normalizes_company_slug(self, mock_session):
        """Should lowercase and hyphenate company names."""
        mock_session.return_value.get.side_effect = [
            Mock(text=SEARCH_RESULTS_HTML, status_code=200),
            Mock(text=INTERVIEW_PAGE_HTML, status_code=200),
            Mock(text=EMPTY_RESULTS_HTML, status_code=200),
        ]

        scraper = GlassdoorScraper(GlassdoorConfig(min_delay=0, max_delay=0))
        result = scraper.scrape("Goldman Sachs", limit=5)

        if result:
            assert result[0].company_slug == "goldman-sachs"


class TestGlassdoorConfig:
    def test_default_values(self):
        """Should have sensible defaults."""
        config = GlassdoorConfig()
        assert config.min_delay == 3.0
        assert config.max_delay == 8.0
        assert config.timeout == 30
        assert config.max_retries == 3

    def test_custom_delay_settings(self):
        """Should accept custom delay settings."""
        config = GlassdoorConfig(min_delay=1.0, max_delay=2.0)
        assert config.min_delay == 1.0
        assert config.max_delay == 2.0


class TestGlassdoorBlockedError:
    def test_error_message(self):
        """Should include descriptive error message."""
        error = GlassdoorBlockedError("Glassdoor returned 403 Forbidden")
        assert "403 Forbidden" in str(error)


class TestScrapeGlassdoorFunction:
    @patch("scrapers.glassdoor.GlassdoorScraper")
    def test_convenience_function(self, mock_scraper_class):
        """Should create scraper and call scrape method."""
        mock_scraper = Mock()
        mock_scraper.scrape.return_value = []
        mock_scraper_class.return_value = mock_scraper

        result = scrape_glassdoor("Google", limit=10)

        mock_scraper_class.assert_called_once()
        mock_scraper.scrape.assert_called_once_with("Google", limit=10)
        assert result == []
