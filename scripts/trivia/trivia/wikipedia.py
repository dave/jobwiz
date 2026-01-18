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
        # Find start of infobox
        infobox_start = re.search(r"\{\{Infobox[_ ]company", wikitext, re.IGNORECASE)
        if not infobox_start:
            return

        # Extract infobox content by counting brace pairs
        start_pos = infobox_start.end()
        remaining = wikitext[start_pos:]
        brace_count = 1  # We've seen one {{ (the opening)
        end_pos = len(remaining)
        i = 0

        while i < len(remaining):
            if i + 1 < len(remaining):
                if remaining[i] == '{' and remaining[i + 1] == '{':
                    brace_count += 1
                    i += 2  # Skip both braces
                    continue
                elif remaining[i] == '}' and remaining[i + 1] == '}':
                    brace_count -= 1
                    if brace_count == 0:
                        end_pos = i
                        break
                    i += 2  # Skip both braces
                    continue
            i += 1

        infobox_text = remaining[:end_pos]

        # Check if this is a single-line pipe-separated format (common in mocked data)
        # Format: |key=value|key2=value2
        if '\n' not in infobox_text.strip() or infobox_text.count('|') > infobox_text.count('\n'):
            # Single line or mostly single line - split by pipe
            self._parse_single_line_infobox(infobox_text, facts)
        else:
            # Multi-line format - parse line by line
            self._parse_multiline_infobox(infobox_text, facts)

    def _parse_single_line_infobox(self, infobox_text: str, facts: CompanyFacts) -> None:
        """Parse infobox in single-line pipe-separated format."""
        # Split by | and parse each key=value pair
        parts = infobox_text.split('|')
        for part in parts:
            if '=' in part:
                key, _, value = part.partition('=')
                key = key.strip().lower().replace(" ", "_")
                value = value.strip()
                if key and value:
                    self._process_infobox_field(key, value, facts)

    def _parse_multiline_infobox(self, infobox_text: str, facts: CompanyFacts) -> None:
        """Parse infobox in multi-line format."""
        # Parse key-value pairs from infobox line by line
        # Format: | key = value
        lines = infobox_text.split('\n')
        current_key = None
        current_value = []

        for line in lines:
            # Check if this line starts a new field
            field_match = re.match(r"\s*\|\s*(\w+(?:[\s_]\w+)?)\s*=\s*(.*)", line)
            if field_match:
                # Save previous field if exists
                if current_key and current_value:
                    self._process_infobox_field(current_key, ' '.join(current_value), facts)
                current_key = field_match.group(1).lower().strip().replace(" ", "_")
                current_value = [field_match.group(2)]
            elif current_key and line.strip() and not line.strip().startswith('}}'):
                # Continuation of previous field
                current_value.append(line.strip())

        # Process last field
        if current_key and current_value:
            self._process_infobox_field(current_key, ' '.join(current_value), facts)

    def _process_infobox_field(self, key: str, raw_value: str, facts: CompanyFacts) -> None:
        """Process a single infobox field."""
        # Extract data from templates before cleaning
        extracted_value = self._extract_from_templates(raw_value)
        value = self._clean_wiki_value(extracted_value)

        if not value:
            return

        facts.raw_infobox[key] = value

        # Map common fields
        if key in ("founded", "foundation", "founding_date"):
            facts.founding_date = value
        elif key == "founder":
            facts.founders = self._split_list(value)
        elif key in ("location", "headquarters", "hq_location", "hq_location_city"):
            facts.headquarters = value
        elif key == "industry":
            facts.industry = value
        elif key in ("products", "services"):
            facts.products = self._split_list(value)
        elif key in ("num_employees", "employees", "num_employees_year"):
            facts.employees = value
        elif key in ("key_people", "ceo"):
            # For key_people, look for CEO in the raw value (before cleaning removes structure)
            ceo = self._extract_ceo(raw_value)
            if ceo:
                facts.ceo = ceo
        elif key == "revenue":
            facts.revenue = value

    def _extract_from_templates(self, value: str) -> str:
        """Extract useful data from Wikipedia templates before cleaning."""
        # Extract date from {{Start date and age|YYYY|MM|DD}}
        date_match = re.search(r"\{\{Start date[^|]*\|(\d{4})\|?(\d{1,2})?\|?(\d{1,2})?", value, re.IGNORECASE)
        if date_match:
            year = date_match.group(1)
            month = date_match.group(2)
            day = date_match.group(3)
            if month and day:
                return f"{year}-{month.zfill(2)}-{day.zfill(2)}"
            elif month:
                return f"{year}-{month.zfill(2)}"
            return year

        # Extract from {{Ubl|...}} (unbulleted list)
        if "{{Ubl" in value or "{{ubl" in value:
            # Just return the raw value, it will be cleaned later
            return value

        return value

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
        # Handle format: [[Name]] ([[Chief executive officer|CEO]])
        ceo_match = re.search(r"\[\[([^\]|]+)(?:\|[^\]]+)?\]\]\s*\(?(?:\[\[)?(?:Chief executive officer\|)?CEO", value, re.IGNORECASE)
        if ceo_match:
            return ceo_match.group(1).strip()

        # Handle format: Name (CEO)
        ceo_match = re.search(r"([^,\n\[]+)\s*\(CEO\)", value, re.IGNORECASE)
        if ceo_match:
            return ceo_match.group(1).strip()

        # Handle format: Name CEO or Name CEO, ... (no parentheses, title follows name)
        ceo_match = re.search(r"([^,\n\[]+?)\s+CEO(?:\s|,|$)", value, re.IGNORECASE)
        if ceo_match:
            return ceo_match.group(1).strip()

        # If field is just "ceo", return the whole value cleaned
        if value:
            # Clean wiki links
            cleaned = re.sub(r"\[\[([^\]|]*\|)?([^\]]*)\]\]", r"\2", value)
            return cleaned.split(",")[0].strip()
        return None
