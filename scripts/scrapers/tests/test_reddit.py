"""Tests for Reddit scraper."""

import pytest
from unittest.mock import Mock, patch, MagicMock

from scrapers.reddit import RedditScraper, scrape_reddit, RedditConfig


class MockSubmission:
    """Mock PRAW Submission object."""

    def __init__(
        self,
        id: str = "abc123",
        title: str = "Google interview experience",
        selftext: str = "My interview experience...",
        score: int = 100,
        num_comments: int = 10,
        created_utc: float = 1700000000.0,
        permalink: str = "/r/cscareerquestions/comments/abc123/",
        author: str = "testuser",
    ):
        self.id = id
        self.title = title
        self.selftext = selftext
        self.score = score
        self.num_comments = num_comments
        self.created_utc = created_utc
        self.permalink = permalink
        self.author = Mock(__str__=Mock(return_value=author))

        # Mock comments
        self.comments = MockCommentForest()


class MockComment:
    """Mock PRAW Comment object."""

    def __init__(self, id: str, body: str, score: int = 10, author: str = "commenter"):
        self.id = id
        self.body = body
        self.score = score
        self.author = Mock(__str__=Mock(return_value=author))


class MockCommentForest:
    """Mock PRAW CommentForest object."""

    def __init__(self):
        self._comments = [
            MockComment("c1", "Great experience!", 50),
            MockComment("c2", "Thanks for sharing", 30),
        ]

    def replace_more(self, limit=0):
        pass

    def __iter__(self):
        return iter(self._comments)

    def __getitem__(self, key):
        return self._comments[key]


class TestRedditScraper:
    @patch("scrapers.reddit.praw.Reddit")
    def test_parses_valid_response(self, mock_reddit):
        """Should parse mocked Reddit API response correctly."""
        # Setup mock
        mock_subreddit = MagicMock()
        mock_subreddit.search.return_value = [
            MockSubmission(id="abc123", title="Google interview", selftext="My experience...")
        ]
        mock_reddit.return_value.subreddit.return_value = mock_subreddit

        config = RedditConfig(
            client_id="test_id", client_secret="test_secret", subreddits=["cscareerquestions"]
        )
        result = scrape_reddit("google", limit=1, config=config)

        assert len(result) == 1
        assert result[0].source_id == "abc123"
        assert result[0].source == "reddit"
        assert result[0].company_slug == "google"

    @patch("scrapers.reddit.praw.Reddit")
    def test_handles_empty_results(self, mock_reddit):
        """Should return empty list for no matches."""
        mock_subreddit = MagicMock()
        mock_subreddit.search.return_value = []
        mock_reddit.return_value.subreddit.return_value = mock_subreddit

        config = RedditConfig(
            client_id="test_id", client_secret="test_secret", subreddits=["cscareerquestions"]
        )
        result = scrape_reddit("unknowncompany12345", limit=10, config=config)

        assert result == []

    @patch("scrapers.reddit.praw.Reddit")
    def test_extracts_comments(self, mock_reddit):
        """Should include top comments in parsed results."""
        mock_subreddit = MagicMock()
        mock_subreddit.search.return_value = [MockSubmission()]
        mock_reddit.return_value.subreddit.return_value = mock_subreddit

        config = RedditConfig(
            client_id="test_id", client_secret="test_secret", subreddits=["cscareerquestions"]
        )
        result = scrape_reddit("google", limit=1, config=config)

        assert len(result) == 1
        assert "comments" in result[0].metadata
        assert len(result[0].metadata["comments"]) == 2
        assert result[0].metadata["comments"][0]["body"] == "Great experience!"

    @patch("scrapers.reddit.praw.Reddit")
    def test_builds_correct_search_query(self, mock_reddit):
        """Should search for 'interview {company}'."""
        mock_subreddit = MagicMock()
        mock_subreddit.search.return_value = []
        mock_reddit.return_value.subreddit.return_value = mock_subreddit

        config = RedditConfig(
            client_id="test_id", client_secret="test_secret", subreddits=["cscareerquestions"]
        )
        scraper = RedditScraper(config)

        query = scraper.build_search_query("google")
        assert query == "interview google"

    @patch("scrapers.reddit.praw.Reddit")
    def test_searches_multiple_subreddits(self, mock_reddit):
        """Should search across all configured subreddits."""
        mock_subreddit = MagicMock()
        mock_subreddit.search.return_value = [MockSubmission()]
        mock_reddit.return_value.subreddit.return_value = mock_subreddit

        config = RedditConfig(
            client_id="test_id",
            client_secret="test_secret",
            subreddits=["cscareerquestions", "jobs", "interviews"],
        )
        result = scrape_reddit("google", limit=1, config=config)

        # Should have called subreddit() 3 times
        assert mock_reddit.return_value.subreddit.call_count == 3

    @patch("scrapers.reddit.praw.Reddit")
    def test_normalizes_company_slug(self, mock_reddit):
        """Should lowercase and hyphenate company names."""
        mock_subreddit = MagicMock()
        mock_subreddit.search.return_value = [MockSubmission()]
        mock_reddit.return_value.subreddit.return_value = mock_subreddit

        config = RedditConfig(
            client_id="test_id", client_secret="test_secret", subreddits=["cscareerquestions"]
        )
        result = scrape_reddit("Goldman Sachs", limit=1, config=config)

        assert result[0].company_slug == "goldman-sachs"

    @patch("scrapers.reddit.praw.Reddit")
    def test_handles_deleted_author(self, mock_reddit):
        """Should handle posts with deleted authors."""
        submission = MockSubmission()
        submission.author = None

        mock_subreddit = MagicMock()
        mock_subreddit.search.return_value = [submission]
        mock_reddit.return_value.subreddit.return_value = mock_subreddit

        config = RedditConfig(
            client_id="test_id", client_secret="test_secret", subreddits=["cscareerquestions"]
        )
        result = scrape_reddit("google", limit=1, config=config)

        assert result[0].metadata["author"] == "[deleted]"


class TestRedditConfig:
    def test_uses_environment_variables(self):
        """Should fall back to environment variables."""
        with patch.dict(
            "os.environ",
            {"REDDIT_CLIENT_ID": "env_id", "REDDIT_CLIENT_SECRET": "env_secret"},
        ):
            config = RedditConfig()
            assert config.client_id == "env_id"
            assert config.client_secret == "env_secret"

    def test_explicit_values_override_env(self):
        """Explicit values should override environment."""
        config = RedditConfig(client_id="explicit_id", client_secret="explicit_secret")
        assert config.client_id == "explicit_id"
        assert config.client_secret == "explicit_secret"

    def test_default_subreddits(self):
        """Should have default subreddits configured."""
        config = RedditConfig(client_id="test", client_secret="test")
        assert "cscareerquestions" in config.subreddits
        assert "jobs" in config.subreddits
        assert "interviews" in config.subreddits
