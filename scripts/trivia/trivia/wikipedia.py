"""Wikipedia API fetcher for company facts."""

import logging
import re
from dataclasses import dataclass, field
from typing import Optional, List, Dict, Any
import requests

logger = logging.getLogger(__name__)

# Wikipedia API base URL
WIKIPEDIA_API_URL = "https://en.wikipedia.org/w/api.php"


@dataclass
class CompanyFacts:
    """Structured company facts from Wikipedia."""

    company_name: str
    wikipedia_url: Optional[str] = None
    founding_date: Optional[str] = None
    founders: List[str] = field(default_factory=list)
    headquarters: Optional[str] = None
    industry: Optional[str] = None
    products: List[str] = field(default_factory=list)
    employees: Optional[str] = None
    ceo: Optional[str] = None
    revenue: Optional[str] = None
    summary: Optional[str] = None
    raw_infobox: Dict[str, Any] = field(default_factory=dict)


class WikipediaFetcher:
    """Fetches company information from Wikipedia API."""

    def __init__(self, session: Optional[requests.Session] = None):
        """Initialize with optional custom session."""
        self.session = session or requests.Session()
        self.session.headers.update({
            "User-Agent": "JobWiz/1.0 (https://jobwiz.com; contact@jobwiz.com)"
        })

    def fetch_company(self, company_name: str) -> Optional[CompanyFacts]:
        """
        Fetch company facts from Wikipedia.

        Args:
            company_name: Name of the company to search for

        Returns:
            CompanyFacts if found, None otherwise
        """
        # First, search for the company page
        page_title = self._search_company(company_name)
        if not page_title:
            logger.warning(f"No Wikipedia page found for: {company_name}")
            return None

        # Get page content and parse infobox
        facts = self._get_page_facts(page_title, company_name)
        return facts

    def _search_company(self, company_name: str) -> Optional[str]:
        """Search Wikipedia for a company page."""
        params = {
            "action": "query",
            "format": "json",
            "list": "search",
            "srsearch": f"{company_name} company",
            "srlimit": 5,
        }

        try:
            response = self.session.get(WIKIPEDIA_API_URL, params=params, timeout=10)
            response.raise_for_status()
            data = response.json()

            search_results = data.get("query", {}).get("search", [])
            if not search_results:
                return None

            # Return the first result title
            return search_results[0]["title"]

        except requests.RequestException as e:
            logger.error(f"Wikipedia search failed: {e}")
            return None

    def _get_page_facts(self, page_title: str, company_name: str) -> Optional[CompanyFacts]:
        """Get facts from a Wikipedia page."""
        # Get page content with infobox
        params = {
            "action": "query",
            "format": "json",
            "titles": page_title,
            "prop": "extracts|revisions|info",
            "exintro": True,
            "explaintext": True,
            "rvprop": "content",
            "rvslots": "main",
            "inprop": "url",
        }

        try:
            response = self.session.get(WIKIPEDIA_API_URL, params=params, timeout=10)
            response.raise_for_status()
            data = response.json()

            pages = data.get("query", {}).get("pages", {})
            if not pages:
                return None

            # Get the first page (there should only be one)
            page_data = list(pages.values())[0]

            if page_data.get("missing"):
                return None

            facts = CompanyFacts(company_name=company_name)
            facts.wikipedia_url = page_data.get("fullurl")
            facts.summary = page_data.get("extract", "")[:500]  # Limit summary

            # Parse infobox from wikitext
            revisions = page_data.get("revisions", [])
            if revisions:
                content = revisions[0].get("slots", {}).get("main", {}).get("*", "")
                self._parse_infobox(content, facts)

            return facts

        except requests.RequestException as e:
            logger.error(f"Wikipedia page fetch failed: {e}")
            return None

    def _parse_infobox(self, wikitext: str, facts: CompanyFacts) -> None:
        """Parse infobox data from Wikipedia wikitext."""
        # Find infobox section - multiple formats
        # Format 1: {{Infobox company|...}} (pipe-separated, common in tests)
        infobox_match = re.search(
            r"\{\{Infobox[_ ]company\|?(.*?)\}\}",
            wikitext,
            re.IGNORECASE | re.DOTALL
        )

        if not infobox_match:
            # Format 2: {{Infobox company\n...\n}} (newline-separated)
            infobox_match = re.search(
                r"\{\{Infobox\s+company\s*\n(.*?)\n\}\}",
                wikitext,
                re.IGNORECASE | re.DOTALL
            )

        if not infobox_match:
            # Format 3: Generic infobox
            infobox_match = re.search(
                r"\{\{Infobox[^|]*\|(.*?)\}\}",
                wikitext,
                re.IGNORECASE | re.DOTALL
            )

        if not infobox_match:
            return

        infobox_text = infobox_match.group(1)

        # Parse key-value pairs from infobox
        # Pattern: key = value (optionally preceded by | or at start)
        # Handle both first field (no |) and subsequent fields (with |)
        field_pattern = re.compile(r"(?:^|\|)\s*(\w+(?:[\s_]\w+)?)\s*=\s*([^|]*?)(?=\s*\||$)", re.DOTALL)

        for match in field_pattern.finditer(infobox_text):
            key = match.group(1).lower().strip().replace(" ", "_")
            value = self._clean_wiki_value(match.group(2))

            if not value:
                continue

            facts.raw_infobox[key] = value

            # Map common fields
            if key in ("founded", "foundation", "founding_date"):
                facts.founding_date = value
            elif key == "founder":
                facts.founders = self._split_list(value)
            elif key in ("location", "headquarters", "hq_location", "location_city"):
                facts.headquarters = value
            elif key == "industry":
                facts.industry = value
            elif key in ("products", "services"):
                facts.products = self._split_list(value)
            elif key in ("num_employees", "employees", "num_employees_year"):
                facts.employees = value
            elif key in ("key_people", "ceo"):
                if "ceo" in value.lower() or key == "ceo":
                    facts.ceo = self._extract_ceo(value)
            elif key == "revenue":
                facts.revenue = value

    def _clean_wiki_value(self, value: str) -> str:
        """Clean Wikipedia markup from a value."""
        # Remove wiki links [[...]] but keep text
        value = re.sub(r"\[\[([^\]|]*\|)?([^\]]*)\]\]", r"\2", value)
        # Remove references
        value = re.sub(r"<ref[^>]*>.*?</ref>", "", value, flags=re.DOTALL)
        value = re.sub(r"<ref[^/]*/>", "", value)
        # Remove templates like {{...}}
        value = re.sub(r"\{\{[^}]*\}\}", "", value)
        # Remove HTML tags
        value = re.sub(r"<[^>]+>", "", value)
        # Clean whitespace
        value = " ".join(value.split())
        return value.strip()

    def _split_list(self, value: str) -> List[str]:
        """Split a comma or newline separated list."""
        # Split on commas, newlines, or bullet points
        items = re.split(r"[,\n•*]", value)
        return [item.strip() for item in items if item.strip()]

    def _extract_ceo(self, value: str) -> Optional[str]:
        """Extract CEO name from key_people field."""
        # Look for CEO designation
        ceo_match = re.search(r"([^,\n(]+)\s*\(?CEO\)?", value, re.IGNORECASE)
        if ceo_match:
            return ceo_match.group(1).strip()
        # If field is just "ceo", return the whole value
        return value.split(",")[0].strip() if value else None
