"""Glassdoor scraper for interview reviews.

⚠️ IMPORTANT: Glassdoor has aggressive anti-bot protection.
This scraper may not work reliably. If blocked, the script will
log the issue and return empty results gracefully.

Options if scraping fails:
1. Use a third-party scraping API service (e.g., ScrapingBee, Bright Data)
2. Browser automation with Playwright (slower but more reliable)
3. Manual data collection as fallback
"""

import os
import logging
import time
import random
from typing import List, Dict, Any, Optional
from dataclasses import dataclass
from urllib.parse import urlencode, quote

import requests
from bs4 import BeautifulSoup

from .storage import ScrapedItem
from .backoff import exponential_backoff, BackoffConfig

logger = logging.getLogger(__name__)

# Glassdoor interview review URL pattern
GLASSDOOR_INTERVIEW_URL = "https://www.glassdoor.com/Interview/{company}-Interview-Questions-E{employer_id}.htm"


@dataclass
class GlassdoorConfig:
    """Configuration for Glassdoor scraper."""

    # Rate limiting
    min_delay: float = 3.0  # Minimum seconds between requests
    max_delay: float = 8.0  # Maximum seconds between requests

    # Request settings
    timeout: int = 30
    max_retries: int = 3

    # Headers to mimic browser
    user_agent: str = (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/120.0.0.0 Safari/537.36"
    )


class GlassdoorBlockedError(Exception):
    """Raised when Glassdoor blocks the request."""

    pass


class GlassdoorScraper:
    """Scrapes interview reviews from Glassdoor.

    Note: This scraper may be blocked by Glassdoor's anti-bot protection.
    It's designed to fail gracefully and log blockers.
    """

    def __init__(self, config: Optional[GlassdoorConfig] = None):
        """Initialize Glassdoor scraper."""
        self.config = config or GlassdoorConfig()
        self.session = requests.Session()
        self.session.headers.update(
            {
                "User-Agent": self.config.user_agent,
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
                "Accept-Language": "en-US,en;q=0.9",
                "Accept-Encoding": "gzip, deflate, br",
                "DNT": "1",
                "Connection": "keep-alive",
                "Upgrade-Insecure-Requests": "1",
            }
        )

    def _random_delay(self) -> None:
        """Sleep for a random delay to avoid rate limiting."""
        delay = random.uniform(self.config.min_delay, self.config.max_delay)
        time.sleep(delay)

    def _check_for_block(self, response: requests.Response, html: str) -> None:
        """Check if response indicates we're blocked."""
        # Common blocking indicators
        blocked_indicators = [
            "captcha",
            "blocked",
            "rate limit",
            "too many requests",
            "access denied",
            "please verify you are a human",
        ]

        html_lower = html.lower()
        for indicator in blocked_indicators:
            if indicator in html_lower:
                raise GlassdoorBlockedError(
                    f"Glassdoor blocked request (detected: '{indicator}')"
                )

        if response.status_code == 403:
            raise GlassdoorBlockedError("Glassdoor returned 403 Forbidden")

        if response.status_code == 429:
            raise GlassdoorBlockedError("Glassdoor rate limited (429)")

    def search_employer(self, company: str) -> Optional[Dict[str, Any]]:
        """
        Search for employer ID by company name.

        Returns:
            Dict with employer_id and employer_name, or None if not found
        """
        search_url = f"https://www.glassdoor.com/Search/results.htm?keyword={quote(company)}"

        try:
            self._random_delay()
            response = self.session.get(search_url, timeout=self.config.timeout)
            html = response.text

            self._check_for_block(response, html)

            # Parse search results to find employer
            soup = BeautifulSoup(html, "lxml")

            # Look for employer links in search results
            # This is fragile and may break if Glassdoor changes their HTML
            employer_links = soup.select('a[href*="/Overview/"]')

            for link in employer_links:
                href = link.get("href", "")
                if "-EI_IE" in href:
                    # Extract employer ID from URL like /Overview/Working-at-Google-EI_IE9079.htm
                    try:
                        employer_id = href.split("-EI_IE")[1].split(".")[0]
                        return {
                            "employer_id": employer_id,
                            "employer_name": link.get_text(strip=True),
                        }
                    except (IndexError, ValueError):
                        continue

            logger.warning(f"Could not find employer ID for '{company}'")
            return None

        except GlassdoorBlockedError:
            raise
        except Exception as e:
            logger.error(f"Error searching for employer '{company}': {e}")
            return None

    def scrape_interviews(
        self, employer_id: str, company_slug: str, limit: int = 25
    ) -> List[ScrapedItem]:
        """
        Scrape interview reviews for an employer.

        Args:
            employer_id: Glassdoor employer ID
            company_slug: Company slug for storage
            limit: Maximum reviews to fetch

        Returns:
            List of ScrapedItem objects
        """
        items: List[ScrapedItem] = []
        page = 1
        max_pages = (limit // 10) + 1  # Glassdoor shows ~10 reviews per page

        while len(items) < limit and page <= max_pages:
            url = f"https://www.glassdoor.com/Interview/{company_slug}-Interview-Questions-E{employer_id}_P{page}.htm"

            try:
                self._random_delay()
                response = self.session.get(url, timeout=self.config.timeout)
                html = response.text

                self._check_for_block(response, html)

                soup = BeautifulSoup(html, "lxml")

                # Parse interview reviews
                # Note: Selectors are fragile and may break if Glassdoor changes HTML
                reviews = soup.select('[data-test="interview-question"]')

                if not reviews:
                    # Try alternative selectors
                    reviews = soup.select(".interview-question")

                if not reviews:
                    logger.warning(f"No reviews found on page {page}, stopping")
                    break

                for review in reviews:
                    if len(items) >= limit:
                        break

                    try:
                        item = self._parse_review(review, company_slug)
                        if item:
                            items.append(item)
                    except Exception as e:
                        logger.warning(f"Error parsing review: {e}")
                        continue

                page += 1

            except GlassdoorBlockedError:
                raise
            except Exception as e:
                logger.error(f"Error fetching page {page}: {e}")
                break

        return items

    def _parse_review(
        self, review_element: BeautifulSoup, company_slug: str
    ) -> Optional[ScrapedItem]:
        """Parse a single interview review element."""
        # Extract review ID from element
        review_id = review_element.get("id", "") or review_element.get(
            "data-id", ""
        )
        if not review_id:
            # Generate a hash from content as fallback
            import hashlib

            content = review_element.get_text()
            review_id = hashlib.md5(content.encode()).hexdigest()[:12]

        # Extract content
        question_text = review_element.get_text(strip=True)

        # Try to extract structured data
        metadata: Dict[str, Any] = {}

        # Look for difficulty rating
        difficulty_elem = review_element.select_one('[class*="difficulty"]')
        if difficulty_elem:
            metadata["difficulty"] = difficulty_elem.get_text(strip=True)

        # Look for interview outcome
        outcome_elem = review_element.select_one('[class*="outcome"]')
        if outcome_elem:
            metadata["outcome"] = outcome_elem.get_text(strip=True)

        # Look for date
        date_elem = review_element.select_one("time, [class*='date']")
        if date_elem:
            metadata["date"] = date_elem.get_text(strip=True)

        return ScrapedItem(
            company_slug=company_slug,
            source="glassdoor",
            source_id=f"gd_{review_id}",
            content=question_text,
            metadata=metadata,
        )

    def scrape(self, company: str, limit: int = 25) -> List[ScrapedItem]:
        """
        Scrape interview reviews for a company.

        Args:
            company: Company name
            limit: Maximum reviews to fetch

        Returns:
            List of ScrapedItem objects (may be empty if blocked)
        """
        company_slug = company.lower().replace(" ", "-")

        try:
            # First, find the employer ID
            employer_info = self.search_employer(company)
            if not employer_info:
                logger.warning(f"Could not find employer ID for '{company}'")
                return []

            # Then scrape interviews
            return self.scrape_interviews(
                employer_id=employer_info["employer_id"],
                company_slug=company_slug,
                limit=limit,
            )

        except GlassdoorBlockedError as e:
            logger.error(
                f"Glassdoor blocked scraping for '{company}': {e}\n"
                "Consider using a third-party scraping service or manual collection."
            )
            return []


def scrape_glassdoor(
    company: str, limit: int = 25, config: Optional[GlassdoorConfig] = None
) -> List[ScrapedItem]:
    """
    Convenience function to scrape Glassdoor for a company.

    Args:
        company: Company name to search for
        limit: Maximum reviews to fetch
        config: Optional Glassdoor configuration

    Returns:
        List of ScrapedItem objects (may be empty if blocked)
    """
    scraper = GlassdoorScraper(config)
    return scraper.scrape(company, limit=limit)
