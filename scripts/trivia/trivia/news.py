"""Google News RSS fetcher for company news."""

import logging
from dataclasses import dataclass
from datetime import datetime
from typing import List, Optional
from urllib.parse import quote_plus

import feedparser
import requests

logger = logging.getLogger(__name__)

# Google News RSS URL template
GOOGLE_NEWS_RSS_URL = "https://news.google.com/rss/search?q={query}&hl=en-US&gl=US&ceid=US:en"


@dataclass
class NewsItem:
    """A single news item."""

    title: str
    link: str
    published: Optional[datetime]
    source: str
    summary: Optional[str] = None


class NewsFetcher:
    """Fetches company news from Google News RSS."""

    def __init__(self, session: Optional[requests.Session] = None):
        """Initialize with optional custom session."""
        self.session = session or requests.Session()
        self.session.headers.update({
            "User-Agent": "JobWiz/1.0 (https://jobwiz.com; contact@jobwiz.com)"
        })

    def fetch_news(self, company_name: str, limit: int = 10) -> List[NewsItem]:
        """
        Fetch recent news about a company.

        Args:
            company_name: Name of the company
            limit: Maximum number of news items to return

        Returns:
            List of NewsItem objects
        """
        query = quote_plus(f'"{company_name}" company')
        url = GOOGLE_NEWS_RSS_URL.format(query=query)

        try:
            # Fetch RSS feed
            response = self.session.get(url, timeout=10)
            response.raise_for_status()

            # Parse feed
            feed = feedparser.parse(response.content)

            entries = feed.get("entries", []) if hasattr(feed, "get") else getattr(feed, "entries", [])
            if not entries:
                logger.warning(f"No news found for: {company_name}")
                return []

            news_items = []
            for entry in entries[:limit]:
                item = self._parse_entry(entry)
                if item:
                    news_items.append(item)

            logger.info(f"Found {len(news_items)} news items for {company_name}")
            return news_items

        except requests.RequestException as e:
            logger.error(f"News fetch failed: {e}")
            return []

    def _parse_entry(self, entry: dict) -> Optional[NewsItem]:
        """Parse a single RSS feed entry."""
        try:
            title = entry.get("title", "")
            link = entry.get("link", "")

            if not title or not link:
                return None

            # Parse publication date
            published = None
            published_parsed = entry.get("published_parsed")
            if published_parsed:
                try:
                    published = datetime(*published_parsed[:6])
                except (TypeError, ValueError):
                    pass

            # Extract source from title (format: "Title - Source")
            source = "Unknown"
            if " - " in title:
                parts = title.rsplit(" - ", 1)
                if len(parts) == 2:
                    title = parts[0]
                    source = parts[1]

            summary = entry.get("summary", "")
            # Clean HTML from summary
            if summary:
                import re
                summary = re.sub(r"<[^>]+>", "", summary)[:300]

            return NewsItem(
                title=title,
                link=link,
                published=published,
                source=source,
                summary=summary if summary else None,
            )

        except Exception as e:
            logger.warning(f"Failed to parse news entry: {e}")
            return None

    def fetch_acquisition_news(self, company_name: str, limit: int = 5) -> List[NewsItem]:
        """Fetch acquisition-related news for a company."""
        query = quote_plus(f'"{company_name}" acquisition OR acquires OR acquired')
        url = GOOGLE_NEWS_RSS_URL.format(query=query)

        try:
            response = self.session.get(url, timeout=10)
            response.raise_for_status()
            feed = feedparser.parse(response.content)

            entries = feed.get("entries", []) if hasattr(feed, "get") else getattr(feed, "entries", [])
            news_items = []
            for entry in entries[:limit]:
                item = self._parse_entry(entry)
                if item:
                    news_items.append(item)

            return news_items

        except requests.RequestException as e:
            logger.error(f"Acquisition news fetch failed: {e}")
            return []

    def fetch_executive_news(self, company_name: str, limit: int = 5) -> List[NewsItem]:
        """Fetch executive-related news for a company."""
        query = quote_plus(f'"{company_name}" CEO OR executive OR leadership')
        url = GOOGLE_NEWS_RSS_URL.format(query=query)

        try:
            response = self.session.get(url, timeout=10)
            response.raise_for_status()
            feed = feedparser.parse(response.content)

            entries = feed.get("entries", []) if hasattr(feed, "get") else getattr(feed, "entries", [])
            news_items = []
            for entry in entries[:limit]:
                item = self._parse_entry(entry)
                if item:
                    news_items.append(item)

            return news_items

        except requests.RequestException as e:
            logger.error(f"Executive news fetch failed: {e}")
            return []
