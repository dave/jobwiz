"""Tests for Wikipedia fetcher."""

import pytest
from unittest.mock import Mock, patch, MagicMock

from trivia.wikipedia import WikipediaFetcher, CompanyFacts


class TestWikipediaFetcher:
    """Tests for WikipediaFetcher class."""

    @pytest.fixture
    def fetcher(self):
        """Create a WikipediaFetcher instance."""
        return WikipediaFetcher()

    @patch("trivia.wikipedia.requests.Session")
    def test_search_company_returns_page_title(self, mock_session_class):
        """Should return page title from search results."""
        mock_session = MagicMock()
        mock_response = Mock()
        mock_response.json.return_value = {
            "query": {
                "search": [
                    {"title": "Google"},
                    {"title": "Google LLC"},
                ]
            }
        }
        mock_response.raise_for_status = Mock()
        mock_session.get.return_value = mock_response

        fetcher = WikipediaFetcher(session=mock_session)
        result = fetcher._search_company("Google")

        assert result == "Google"
        mock_session.get.assert_called_once()

    @patch("trivia.wikipedia.requests.Session")
    def test_search_company_returns_none_for_no_results(self, mock_session_class):
        """Should return None when no search results."""
        mock_session = MagicMock()
        mock_response = Mock()
        mock_response.json.return_value = {"query": {"search": []}}
        mock_response.raise_for_status = Mock()
        mock_session.get.return_value = mock_response

        fetcher = WikipediaFetcher(session=mock_session)
        result = fetcher._search_company("NonexistentCompany123456")

        assert result is None

    @patch("trivia.wikipedia.requests.Session")
    def test_extracts_infobox_data(self, mock_session_class):
        """Should parse founding date, HQ from mocked Wikipedia response."""
        mock_session = MagicMock()

        # Mock search response
        search_response = Mock()
        search_response.json.return_value = {
            "query": {"search": [{"title": "Google"}]}
        }
        search_response.raise_for_status = Mock()

        # Mock page response with infobox - use pipe-separated format
        page_response = Mock()
        page_response.json.return_value = {
            "query": {
                "pages": {
                    "1234": {
                        "title": "Google",
                        "fullurl": "https://en.wikipedia.org/wiki/Google",
                        "extract": "Google LLC is a technology company.",
                        "revisions": [{
                            "slots": {
                                "main": {
                                    "*": "{{Infobox company|name=Google LLC|founded=September 4, 1998|founder=Larry Page, Sergey Brin|location=Mountain View, California|industry=Technology|products=Search engine, Cloud computing|num_employees=190,000|key_people=Sundar Pichai (CEO)}}"
                                }
                            }
                        }]
                    }
                }
            }
        }
        page_response.raise_for_status = Mock()

        mock_session.get.side_effect = [search_response, page_response]

        fetcher = WikipediaFetcher(session=mock_session)
        facts = fetcher.fetch_company("Google")

        assert facts is not None
        assert facts.company_name == "Google"
        assert facts.wikipedia_url == "https://en.wikipedia.org/wiki/Google"
        assert facts.founding_date == "September 4, 1998"
        assert "Larry Page" in facts.founders or "Sergey Brin" in facts.founders
        assert facts.headquarters == "Mountain View, California"
        assert facts.industry == "Technology"

    @patch("trivia.wikipedia.requests.Session")
    def test_handles_missing_company(self, mock_session_class):
        """Should return None for unknown company."""
        mock_session = MagicMock()
        mock_response = Mock()
        mock_response.json.return_value = {"query": {"search": []}}
        mock_response.raise_for_status = Mock()
        mock_session.get.return_value = mock_response

        fetcher = WikipediaFetcher(session=mock_session)
        result = fetcher.fetch_company("TotallyFakeCompany12345")

        assert result is None

    @patch("trivia.wikipedia.requests.Session")
    def test_handles_page_not_found(self, mock_session_class):
        """Should handle missing page gracefully."""
        mock_session = MagicMock()

        search_response = Mock()
        search_response.json.return_value = {
            "query": {"search": [{"title": "SomeCompany"}]}
        }
        search_response.raise_for_status = Mock()

        page_response = Mock()
        page_response.json.return_value = {
            "query": {
                "pages": {
                    "-1": {"missing": True}
                }
            }
        }
        page_response.raise_for_status = Mock()

        mock_session.get.side_effect = [search_response, page_response]

        fetcher = WikipediaFetcher(session=mock_session)
        result = fetcher.fetch_company("SomeCompany")

        assert result is None

    def test_clean_wiki_value_removes_links(self):
        """Should remove wiki links but keep text."""
        fetcher = WikipediaFetcher()

        result = fetcher._clean_wiki_value("[[Mountain View, California|Mountain View]]")
        assert result == "Mountain View"

        result = fetcher._clean_wiki_value("[[Larry Page]]")
        assert result == "Larry Page"

    def test_clean_wiki_value_removes_references(self):
        """Should remove reference tags."""
        fetcher = WikipediaFetcher()

        result = fetcher._clean_wiki_value("1998<ref name=test>source</ref>")
        assert result == "1998"

        result = fetcher._clean_wiki_value("2000<ref/>")
        assert result == "2000"

    def test_clean_wiki_value_removes_templates(self):
        """Should remove template markup."""
        fetcher = WikipediaFetcher()

        result = fetcher._clean_wiki_value("{{USD|100 billion}}")
        assert result == ""

    def test_split_list_handles_commas(self):
        """Should split comma-separated values."""
        fetcher = WikipediaFetcher()

        result = fetcher._split_list("Larry Page, Sergey Brin")
        assert result == ["Larry Page", "Sergey Brin"]

    def test_split_list_handles_newlines(self):
        """Should split newline-separated values."""
        fetcher = WikipediaFetcher()

        result = fetcher._split_list("Search\nCloud\nAds")
        assert result == ["Search", "Cloud", "Ads"]

    def test_extract_ceo_finds_ceo(self):
        """Should extract CEO from key_people field."""
        fetcher = WikipediaFetcher()

        result = fetcher._extract_ceo("Sundar Pichai (CEO)")
        assert result == "Sundar Pichai"

        result = fetcher._extract_ceo("Sundar Pichai CEO, Ruth Porat CFO")
        assert result == "Sundar Pichai"
