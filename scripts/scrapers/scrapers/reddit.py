"""Reddit scraper using PRAW (Python Reddit API Wrapper)."""

import os
import logging
from typing import List, Dict, Any, Optional
from dataclasses import dataclass

import praw
from praw.models import Submission

from .storage import ScrapedItem
from .backoff import exponential_backoff, BackoffConfig

logger = logging.getLogger(__name__)

# Subreddits to search for interview content
DEFAULT_SUBREDDITS = ["cscareerquestions", "jobs", "interviews"]


@dataclass
class RedditConfig:
    """Configuration for Reddit scraper."""

    client_id: Optional[str] = None
    client_secret: Optional[str] = None
    user_agent: str = "JobWiz Interview Scraper 1.0"
    subreddits: List[str] = None  # type: ignore

    def __post_init__(self):
        self.client_id = self.client_id or os.environ.get("REDDIT_CLIENT_ID")
        self.client_secret = self.client_secret or os.environ.get("REDDIT_CLIENT_SECRET")
        if self.subreddits is None:
            self.subreddits = DEFAULT_SUBREDDITS


class RedditScraper:
    """Scrapes interview-related posts from Reddit."""

    def __init__(self, config: Optional[RedditConfig] = None):
        """Initialize Reddit scraper with credentials."""
        self.config = config or RedditConfig()

        if not self.config.client_id or not self.config.client_secret:
            raise ValueError(
                "Reddit API credentials required. Set REDDIT_CLIENT_ID and "
                "REDDIT_CLIENT_SECRET environment variables or pass them directly."
            )

        self.reddit = praw.Reddit(
            client_id=self.config.client_id,
            client_secret=self.config.client_secret,
            user_agent=self.config.user_agent,
        )

    def build_search_query(self, company: str) -> str:
        """Build search query for interview posts."""
        return f"interview {company}"

    def extract_comments(
        self, submission: Submission, max_comments: int = 10
    ) -> List[Dict[str, Any]]:
        """Extract top comments from a submission."""
        comments = []
        submission.comments.replace_more(limit=0)  # Don't fetch "more comments"

        for comment in submission.comments[:max_comments]:
            if hasattr(comment, "body"):
                comments.append(
                    {
                        "id": comment.id,
                        "body": comment.body,
                        "score": comment.score,
                        "author": str(comment.author) if comment.author else "[deleted]",
                    }
                )

        return comments

    def scrape(
        self,
        company: str,
        limit: int = 25,
        max_comments_per_post: int = 10,
    ) -> List[ScrapedItem]:
        """
        Scrape Reddit for interview posts about a company.

        Args:
            company: Company name/slug to search for
            limit: Maximum posts to fetch per subreddit
            max_comments_per_post: Maximum comments to extract per post

        Returns:
            List of ScrapedItem objects
        """
        items: List[ScrapedItem] = []
        query = self.build_search_query(company)

        for subreddit_name in self.config.subreddits:
            try:
                subreddit = self.reddit.subreddit(subreddit_name)

                def search_subreddit():
                    return list(subreddit.search(query, limit=limit, sort="relevance"))

                # Use exponential backoff for rate limiting
                posts = exponential_backoff(
                    search_subreddit,
                    max_attempts=3,
                    config=BackoffConfig(initial_delay=2.0),
                )

                if posts is None:
                    logger.warning(f"Failed to search r/{subreddit_name} for {company}")
                    continue

                for post in posts:
                    comments = self.extract_comments(post, max_comments_per_post)

                    item = ScrapedItem(
                        company_slug=company.lower().replace(" ", "-"),
                        source="reddit",
                        source_id=post.id,
                        content=post.selftext or "",
                        metadata={
                            "title": post.title,
                            "subreddit": subreddit_name,
                            "score": post.score,
                            "num_comments": post.num_comments,
                            "created_utc": post.created_utc,
                            "url": f"https://reddit.com{post.permalink}",
                            "author": str(post.author) if post.author else "[deleted]",
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
) -> List[ScrapedItem]:
    """
    Convenience function to scrape Reddit for a company.

    Args:
        company: Company name to search for
        limit: Maximum posts per subreddit
        config: Optional Reddit configuration

    Returns:
        List of ScrapedItem objects
    """
    scraper = RedditScraper(config)
    return scraper.scrape(company, limit=limit)
