"""Tests for Reddit scraper (JSON endpoint version)."""

import pytest
from unittest.mock import patch, MagicMock

from scrapers.reddit import RedditScraper, scrape_reddit, RedditConfig


def make_post_response(posts):
    """Create a mock Reddit search response."""
    return {
        "data": {
            "children": [
                {"kind": "t3", "data": post} for post in posts
            ]
        }
    }


def make_comments_response(comments):
    """Create a mock Reddit comments response."""
    return [
        {"data": {}},  # First element is the post
        {
            "data": {
                "children": [
                    {"kind": "t1", "data": comment} for comment in comments
                ]
            }
        },
    ]


SAMPLE_POST = {
    "id": "abc123",
    "title": "Google interview experience",
    "selftext": "My interview experience...",
    "score": 100,
    "num_comments": 10,
    "created_utc": 1700000000.0,
    "permalink": "/r/cscareerquestions/comments/abc123/",
    "author": "testuser",
}

SAMPLE_COMMENTS = [
    {"id": "c1", "body": "Great experience!", "score": 50, "author": "commenter1"},
    {"id": "c2", "body": "Thanks for sharing", "score": 30, "author": "commenter2"},
]


class TestRedditScraper:
    @patch("scrapers.reddit.requests.Session")
    def test_parses_valid_response(self, mock_session_class):
        """Should parse mocked Reddit JSON response correctly."""
        mock_session = MagicMock()
        mock_session_class.return_value = mock_session

        # Mock search response
        mock_response = MagicMock()
        mock_response.json.return_value = make_post_response([SAMPLE_POST])
        mock_response.raise_for_status = MagicMock()
        mock_session.get.return_value = mock_response

        config = RedditConfig(subreddits=["cscareerquestions"])
        result = scrape_reddit("google", limit=1, config=config, fetch_comments=False)

        assert len(result) == 1
        assert result[0].source_id == "abc123"
        assert result[0].source == "reddit"
        assert result[0].company_slug == "google"

    @patch("scrapers.reddit.requests.Session")
    def test_handles_empty_results(self, mock_session_class):
        """Should return empty list for no matches."""
        mock_session = MagicMock()
        mock_session_class.return_value = mock_session

        mock_response = MagicMock()
        mock_response.json.return_value = make_post_response([])
        mock_response.raise_for_status = MagicMock()
        mock_session.get.return_value = mock_response

        config = RedditConfig(subreddits=["cscareerquestions"])
        result = scrape_reddit("unknowncompany12345", limit=10, config=config)

        assert result == []

    @patch("scrapers.reddit.requests.Session")
    def test_fetches_comments(self, mock_session_class):
        """Should fetch and include comments when enabled."""
        mock_session = MagicMock()
        mock_session_class.return_value = mock_session

        # First call: search, second call: comments
        search_response = MagicMock()
        search_response.json.return_value = make_post_response([SAMPLE_POST])
        search_response.raise_for_status = MagicMock()

        comments_response = MagicMock()
        comments_response.json.return_value = make_comments_response(SAMPLE_COMMENTS)
        comments_response.raise_for_status = MagicMock()

        mock_session.get.side_effect = [search_response, comments_response]

        config = RedditConfig(subreddits=["cscareerquestions"], request_delay=0)
        result = scrape_reddit("google", limit=1, config=config, fetch_comments=True)

        assert len(result) == 1
        assert "comments" in result[0].metadata
        assert len(result[0].metadata["comments"]) == 2
        assert result[0].metadata["comments"][0]["body"] == "Great experience!"

    @patch("scrapers.reddit.requests.Session")
    def test_skips_comments_when_disabled(self, mock_session_class):
        """Should not fetch comments when fetch_comments=False."""
        mock_session = MagicMock()
        mock_session_class.return_value = mock_session

        mock_response = MagicMock()
        mock_response.json.return_value = make_post_response([SAMPLE_POST])
        mock_response.raise_for_status = MagicMock()
        mock_session.get.return_value = mock_response

        config = RedditConfig(subreddits=["cscareerquestions"])
        result = scrape_reddit("google", limit=1, config=config, fetch_comments=False)

        # Should only make one request (search), not two (search + comments)
        assert mock_session.get.call_count == 1
        assert result[0].metadata["comments"] == []

    def test_builds_correct_search_query(self):
        """Should search for 'interview {company}'."""
        scraper = RedditScraper()
        query = scraper.build_search_query("google")
        assert query == "interview google"

    @patch("scrapers.reddit.requests.Session")
    def test_searches_multiple_subreddits(self, mock_session_class):
        """Should search across all configured subreddits."""
        mock_session = MagicMock()
        mock_session_class.return_value = mock_session

        mock_response = MagicMock()
        mock_response.json.return_value = make_post_response([SAMPLE_POST])
        mock_response.raise_for_status = MagicMock()
        mock_session.get.return_value = mock_response

        config = RedditConfig(
            subreddits=["cscareerquestions", "jobs", "interviews"],
            request_delay=0,
        )
        result = scrape_reddit("google", limit=1, config=config, fetch_comments=False)

        # Should have called get() 3 times (once per subreddit)
        assert mock_session.get.call_count == 3
        # Should have 3 results (one per subreddit)
        assert len(result) == 3

    @patch("scrapers.reddit.requests.Session")
    def test_normalizes_company_slug(self, mock_session_class):
        """Should lowercase and hyphenate company names."""
        mock_session = MagicMock()
        mock_session_class.return_value = mock_session

        mock_response = MagicMock()
        mock_response.json.return_value = make_post_response([SAMPLE_POST])
        mock_response.raise_for_status = MagicMock()
        mock_session.get.return_value = mock_response

        config = RedditConfig(subreddits=["cscareerquestions"])
        result = scrape_reddit("Goldman Sachs", limit=1, config=config, fetch_comments=False)

        assert result[0].company_slug == "goldman-sachs"

    @patch("scrapers.reddit.requests.Session")
    def test_handles_deleted_author(self, mock_session_class):
        """Should handle posts with deleted authors."""
        mock_session = MagicMock()
        mock_session_class.return_value = mock_session

        post_with_deleted_author = {**SAMPLE_POST, "author": "[deleted]"}
        mock_response = MagicMock()
        mock_response.json.return_value = make_post_response([post_with_deleted_author])
        mock_response.raise_for_status = MagicMock()
        mock_session.get.return_value = mock_response

        config = RedditConfig(subreddits=["cscareerquestions"])
        result = scrape_reddit("google", limit=1, config=config, fetch_comments=False)

        assert result[0].metadata["author"] == "[deleted]"

    @patch("scrapers.reddit.requests.Session")
    def test_handles_request_error(self, mock_session_class):
        """Should handle request errors gracefully."""
        mock_session = MagicMock()
        mock_session_class.return_value = mock_session

        mock_response = MagicMock()
        mock_response.raise_for_status.side_effect = Exception("Connection error")
        mock_session.get.return_value = mock_response

        config = RedditConfig(subreddits=["cscareerquestions"], request_delay=0)
        result = scrape_reddit("google", limit=1, config=config)

        # Should return empty list on error, not crash
        assert result == []


class TestRedditConfig:
    def test_default_subreddits(self):
        """Should have default subreddits configured."""
        config = RedditConfig()
        assert "cscareerquestions" in config.subreddits
        assert "jobs" in config.subreddits
        assert "interviews" in config.subreddits

    def test_default_user_agent(self):
        """Should have a default user agent."""
        config = RedditConfig()
        assert "JobWiz" in config.user_agent

    def test_custom_subreddits(self):
        """Should allow custom subreddits."""
        config = RedditConfig(subreddits=["customsub"])
        assert config.subreddits == ["customsub"]

    def test_custom_request_delay(self):
        """Should allow custom request delay."""
        config = RedditConfig(request_delay=2.0)
        assert config.request_delay == 2.0
