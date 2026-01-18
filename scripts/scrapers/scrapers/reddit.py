"""Reddit scraper using public JSON endpoints (no API key required)."""

import logging
import time
from typing import List, Dict, Any, Optional
from dataclasses import dataclass, field
import requests

from .storage import ScrapedItem
from .backoff import exponential_backoff, BackoffConfig

logger = logging.getLogger(__name__)

# Subreddits to search for interview content
DEFAULT_SUBREDDITS = ["cscareerquestions", "jobs", "interviews"]

# Reddit rate limits: ~60 requests/minute for unauthenticated
REQUEST_DELAY = 1.0  # seconds between requests


@dataclass
class RedditConfig:
    """Configuration for Reddit scraper."""

    user_agent: str = "JobWiz Interview Scraper 1.0"
    subreddits: List[str] = field(default_factory=lambda: DEFAULT_SUBREDDITS)
    request_delay: float = REQUEST_DELAY


class RedditScraper:
    """Scrapes interview-related posts from Reddit using JSON endpoints."""

    def __init__(self, config: Optional[RedditConfig] = None):
        """Initialize Reddit scraper."""
        self.config = config or RedditConfig()
        self.session = requests.Session()
        self.session.headers.update({"User-Agent": self.config.user_agent})
        self._last_request_time = 0.0

    def _rate_limit(self):
        """Enforce rate limiting between requests."""
        elapsed = time.time() - self._last_request_time
        if elapsed < self.config.request_delay:
            time.sleep(self.config.request_delay - elapsed)
        self._last_request_time = time.time()

    def build_search_query(self, company: str) -> str:
        """Build search query for interview posts."""
        return f"interview {company}"

    def _fetch_json(self, url: str) -> Optional[Dict[str, Any]]:
        """Fetch JSON from Reddit with rate limiting and error handling."""
        self._rate_limit()

        def do_request():
            response = self.session.get(url, timeout=10)
            response.raise_for_status()
            return response.json()

        return exponential_backoff(
            do_request,
            max_attempts=3,
            config=BackoffConfig(initial_delay=2.0),
        )

    def fetch_comments(
        self, permalink: str, max_comments: int = 10
    ) -> List[Dict[str, Any]]:
        """Fetch top comments for a post."""
        url = f"https://old.reddit.com{permalink}.json?limit={max_comments}"
        data = self._fetch_json(url)

        if not data or len(data) < 2:
            return []

        comments = []
        comment_data = data[1].get("data", {}).get("children", [])

        for item in comment_data[:max_comments]:
            if item.get("kind") != "t1":  # t1 = comment
                continue
            c = item.get("data", {})
            if c.get("body"):
                comments.append(
                    {
                        "id": c.get("id", ""),
                        "body": c.get("body", ""),
                        "score": c.get("score", 0),
                        "author": c.get("author", "[deleted]"),
                    }
                )

        return comments

    def search_subreddit(
        self, subreddit: str, query: str, limit: int = 25
    ) -> List[Dict[str, Any]]:
        """Search a subreddit for posts matching query."""
        url = (
            f"https://old.reddit.com/r/{subreddit}/search.json"
            f"?q={requests.utils.quote(query)}&limit={limit}&sort=relevance&restrict_sr=on"
        )

        data = self._fetch_json(url)
        if not data:
            return []

        return data.get("data", {}).get("children", [])

    def scrape(
        self,
        company: str,
        limit: int = 25,
        max_comments_per_post: int = 10,
        fetch_comments: bool = True,
    ) -> List[ScrapedItem]:
        """
        Scrape Reddit for interview posts about a company.

        Args:
            company: Company name/slug to search for
            limit: Maximum posts to fetch per subreddit
            max_comments_per_post: Maximum comments to extract per post
            fetch_comments: Whether to fetch comments (adds extra requests)

        Returns:
            List of ScrapedItem objects
        """
        items: List[ScrapedItem] = []
        query = self.build_search_query(company)

        for subreddit_name in self.config.subreddits:
            try:
                posts = self.search_subreddit(subreddit_name, query, limit)

                if not posts:
                    logger.warning(f"No posts found in r/{subreddit_name} for {company}")
                    continue

                for post_wrapper in posts:
                    post = post_wrapper.get("data", {})

                    # Optionally fetch comments (costs an extra request per post)
                    comments = []
                    if fetch_comments and post.get("num_comments", 0) > 0:
                        comments = self.fetch_comments(
                            post.get("permalink", ""), max_comments_per_post
                        )

                    item = ScrapedItem(
                        company_slug=company.lower().replace(" ", "-"),
                        source="reddit",
                        source_id=post.get("id", ""),
                        content=post.get("selftext", ""),
                        metadata={
                            "title": post.get("title", ""),
                            "subreddit": subreddit_name,
                            "score": post.get("score", 0),
                            "num_comments": post.get("num_comments", 0),
                            "created_utc": post.get("created_utc", 0),
                            "url": f"https://reddit.com{post.get('permalink', '')}",
                            "author": post.get("author", "[deleted]"),
                            "comments": comments,
                        },
                    )
                    items.append(item)

                logger.info(
                    f"Found {len(posts)} posts in r/{subreddit_name} for '{company}'"
                )

            except Exception as e:
                logger.error(f"Error searching r/{subreddit_name}: {e}")
                continue

        return items


def scrape_reddit(
    company: str,
    limit: int = 25,
    config: Optional[RedditConfig] = None,
    fetch_comments: bool = True,
) -> List[ScrapedItem]:
    """
    Convenience function to scrape Reddit for a company.

    Args:
        company: Company name to search for
        limit: Maximum posts per subreddit
        config: Optional Reddit configuration
        fetch_comments: Whether to fetch comments (slower but more data)

    Returns:
        List of ScrapedItem objects
    """
    scraper = RedditScraper(config)
    return scraper.scrape(company, limit=limit, fetch_comments=fetch_comments)
