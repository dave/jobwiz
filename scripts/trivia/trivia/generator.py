"""AI-powered quiz generator for company trivia."""

import json
import logging
import os
from dataclasses import dataclass, field
from datetime import date
from typing import List, Optional, Dict, Any, Literal

from openai import OpenAI

from .wikipedia import CompanyFacts
from .news import NewsItem

logger = logging.getLogger(__name__)

FactType = Literal["founding", "hq", "mission", "product", "news", "exec", "acquisition"]
Format = Literal["quiz", "flashcard", "factoid"]


@dataclass
class TriviaItem:
    """A single trivia item."""

    company_slug: str
    fact_type: FactType
    format: Format
    question: Optional[str]
    answer: str
    options: Optional[List[str]] = None  # Wrong answers for quiz format
    source_url: Optional[str] = None
    source_date: Optional[date] = None

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for storage."""
        return {
            "company_slug": self.company_slug,
            "fact_type": self.fact_type,
            "format": self.format,
            "question": self.question,
            "answer": self.answer,
            "options": self.options,
            "source_url": self.source_url,
            "source_date": self.source_date.isoformat() if self.source_date else None,
        }


class QuizGenerator:
    """Generates trivia content using OpenAI."""

    def __init__(self, api_key: Optional[str] = None):
        """Initialize with OpenAI API key."""
        self.api_key = api_key or os.environ.get("OPENAI_API_KEY")
        if not self.api_key:
            raise ValueError("OpenAI API key required. Set OPENAI_API_KEY environment variable.")
        self.client = OpenAI(api_key=self.api_key)

    def generate_from_facts(
        self,
        company_slug: str,
        company_name: str,
        facts: CompanyFacts,
        news_items: List[NewsItem],
        limit: int = 15,
    ) -> List[TriviaItem]:
        """
        Generate trivia items from company facts and news.

        Args:
            company_slug: Slug identifier for the company
            company_name: Display name of the company
            facts: CompanyFacts from Wikipedia
            news_items: List of NewsItem from news sources
            limit: Maximum number of trivia items to generate

        Returns:
            List of TriviaItem objects
        """
        trivia_items: List[TriviaItem] = []

        # Generate trivia for each fact type
        if facts.founding_date or facts.founders:
            items = self._generate_founding_trivia(company_slug, company_name, facts)
            trivia_items.extend(items)

        if facts.headquarters:
            items = self._generate_hq_trivia(company_slug, company_name, facts)
            trivia_items.extend(items)

        if facts.products:
            items = self._generate_product_trivia(company_slug, company_name, facts)
            trivia_items.extend(items)

        if facts.ceo:
            items = self._generate_exec_trivia(company_slug, company_name, facts)
            trivia_items.extend(items)

        if news_items:
            items = self._generate_news_trivia(company_slug, company_name, news_items)
            trivia_items.extend(items)

        # Limit total items
        return trivia_items[:limit]

    def _generate_founding_trivia(
        self, company_slug: str, company_name: str, facts: CompanyFacts
    ) -> List[TriviaItem]:
        """Generate trivia about company founding."""
        items = []
        source_url = facts.wikipedia_url
        source_date = date.today()

        # Founding date quiz
        if facts.founding_date:
            quiz_data = self._call_openai_for_quiz(
                f"{company_name} was founded in {facts.founding_date}.",
                "founding year/date",
                company_name,
            )
            if quiz_data:
                items.append(TriviaItem(
                    company_slug=company_slug,
                    fact_type="founding",
                    format="quiz",
                    question=quiz_data["question"],
                    answer=quiz_data["answer"],
                    options=quiz_data["options"],
                    source_url=source_url,
                    source_date=source_date,
                ))

            # Flashcard
            items.append(TriviaItem(
                company_slug=company_slug,
                fact_type="founding",
                format="flashcard",
                question=f"When was {company_name} founded?",
                answer=facts.founding_date,
                source_url=source_url,
                source_date=source_date,
            ))

            # Factoid
            items.append(TriviaItem(
                company_slug=company_slug,
                fact_type="founding",
                format="factoid",
                question=None,
                answer=f"{company_name} was founded in {facts.founding_date}.",
                source_url=source_url,
                source_date=source_date,
            ))

        # Founders quiz
        if facts.founders:
            founders_str = ", ".join(facts.founders[:3])
            quiz_data = self._call_openai_for_quiz(
                f"{company_name} was founded by {founders_str}.",
                "founder(s)",
                company_name,
            )
            if quiz_data:
                items.append(TriviaItem(
                    company_slug=company_slug,
                    fact_type="founding",
                    format="quiz",
                    question=quiz_data["question"],
                    answer=quiz_data["answer"],
                    options=quiz_data["options"],
                    source_url=source_url,
                    source_date=source_date,
                ))

        return items

    def _generate_hq_trivia(
        self, company_slug: str, company_name: str, facts: CompanyFacts
    ) -> List[TriviaItem]:
        """Generate trivia about headquarters."""
        items = []
        source_url = facts.wikipedia_url
        source_date = date.today()

        quiz_data = self._call_openai_for_quiz(
            f"{company_name}'s headquarters is located in {facts.headquarters}.",
            "headquarters location",
            company_name,
        )
        if quiz_data:
            items.append(TriviaItem(
                company_slug=company_slug,
                fact_type="hq",
                format="quiz",
                question=quiz_data["question"],
                answer=quiz_data["answer"],
                options=quiz_data["options"],
                source_url=source_url,
                source_date=source_date,
            ))

        items.append(TriviaItem(
            company_slug=company_slug,
            fact_type="hq",
            format="flashcard",
            question=f"Where is {company_name}'s headquarters located?",
            answer=facts.headquarters or "Unknown",
            source_url=source_url,
            source_date=source_date,
        ))

        items.append(TriviaItem(
            company_slug=company_slug,
            fact_type="hq",
            format="factoid",
            question=None,
            answer=f"{company_name}'s headquarters is located in {facts.headquarters}.",
            source_url=source_url,
            source_date=source_date,
        ))

        return items

    def _generate_product_trivia(
        self, company_slug: str, company_name: str, facts: CompanyFacts
    ) -> List[TriviaItem]:
        """Generate trivia about products/services."""
        items = []
        source_url = facts.wikipedia_url
        source_date = date.today()

        if not facts.products:
            return items

        products_str = ", ".join(facts.products[:5])
        quiz_data = self._call_openai_for_quiz(
            f"{company_name}'s key products/services include: {products_str}.",
            "products or services",
            company_name,
        )
        if quiz_data:
            items.append(TriviaItem(
                company_slug=company_slug,
                fact_type="product",
                format="quiz",
                question=quiz_data["question"],
                answer=quiz_data["answer"],
                options=quiz_data["options"],
                source_url=source_url,
                source_date=source_date,
            ))

        items.append(TriviaItem(
            company_slug=company_slug,
            fact_type="product",
            format="flashcard",
            question=f"What are some key products/services of {company_name}?",
            answer=products_str,
            source_url=source_url,
            source_date=source_date,
        ))

        return items

    def _generate_exec_trivia(
        self, company_slug: str, company_name: str, facts: CompanyFacts
    ) -> List[TriviaItem]:
        """Generate trivia about executives."""
        items = []
        source_url = facts.wikipedia_url
        source_date = date.today()

        if not facts.ceo:
            return items

        quiz_data = self._call_openai_for_quiz(
            f"The CEO of {company_name} is {facts.ceo}.",
            "CEO",
            company_name,
        )
        if quiz_data:
            items.append(TriviaItem(
                company_slug=company_slug,
                fact_type="exec",
                format="quiz",
                question=quiz_data["question"],
                answer=quiz_data["answer"],
                options=quiz_data["options"],
                source_url=source_url,
                source_date=source_date,
            ))

        items.append(TriviaItem(
            company_slug=company_slug,
            fact_type="exec",
            format="flashcard",
            question=f"Who is the CEO of {company_name}?",
            answer=facts.ceo,
            source_url=source_url,
            source_date=source_date,
        ))

        return items

    def _generate_news_trivia(
        self, company_slug: str, company_name: str, news_items: List[NewsItem]
    ) -> List[TriviaItem]:
        """Generate trivia from news items."""
        items = []
        source_date = date.today()

        # Use up to 3 news items
        for news in news_items[:3]:
            # Create a factoid from the news headline
            items.append(TriviaItem(
                company_slug=company_slug,
                fact_type="news",
                format="factoid",
                question=None,
                answer=f"Recent news: {news.title}",
                source_url=news.link,
                source_date=source_date,
            ))

        return items

    def _call_openai_for_quiz(
        self, fact: str, fact_type: str, company_name: str
    ) -> Optional[Dict[str, Any]]:
        """
        Call OpenAI to generate a quiz question with distractors.

        Args:
            fact: The factual statement
            fact_type: Type of fact (for context)
            company_name: Name of the company

        Returns:
            Dict with question, answer, and options (wrong answers)
        """
        prompt = f"""Generate a multiple choice quiz question about this fact:

Fact: {fact}

Requirements:
1. Create a clear question about the {fact_type}
2. The correct answer should be concise (1-5 words)
3. Generate exactly 3 wrong but plausible answers (distractors)
4. Distractors should be realistic alternatives, not obviously wrong
5. Do NOT include the company name in the answer if it's already in the question

Return JSON in this exact format:
{{
    "question": "Your question here?",
    "answer": "Correct answer",
    "options": ["Wrong answer 1", "Wrong answer 2", "Wrong answer 3"]
}}

Return ONLY the JSON, no other text."""

        try:
            response = self.client.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=[
                    {"role": "system", "content": "You are a quiz generator. Return only valid JSON."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.7,
                max_tokens=200,
            )

            content = response.choices[0].message.content
            if not content:
                return None

            # Parse JSON response
            result = json.loads(content.strip())

            # Validate structure
            if not all(k in result for k in ["question", "answer", "options"]):
                logger.warning("Invalid quiz response structure")
                return None

            if len(result["options"]) != 3:
                logger.warning(f"Expected 3 options, got {len(result['options'])}")
                return None

            return result

        except json.JSONDecodeError as e:
            logger.warning(f"Failed to parse OpenAI response as JSON: {e}")
            return None
        except Exception as e:
            logger.error(f"OpenAI API call failed: {e}")
            return None

    def generate_mock_trivia(
        self, company_slug: str, company_name: str, limit: int = 10
    ) -> List[TriviaItem]:
        """
        Generate mock trivia for testing without API calls.

        Args:
            company_slug: Slug identifier for the company
            company_name: Display name of the company
            limit: Number of items to generate

        Returns:
            List of mock TriviaItem objects
        """
        items = []
        source_date = date.today()

        # Mock founding trivia
        items.append(TriviaItem(
            company_slug=company_slug,
            fact_type="founding",
            format="quiz",
            question=f"When was {company_name} founded?",
            answer="1998",
            options=["1995", "2000", "2004"],
            source_url=f"https://en.wikipedia.org/wiki/{company_name.replace(' ', '_')}",
            source_date=source_date,
        ))

        items.append(TriviaItem(
            company_slug=company_slug,
            fact_type="founding",
            format="flashcard",
            question=f"Who founded {company_name}?",
            answer="Larry Page and Sergey Brin",
            source_url=f"https://en.wikipedia.org/wiki/{company_name.replace(' ', '_')}",
            source_date=source_date,
        ))

        # Mock HQ trivia
        items.append(TriviaItem(
            company_slug=company_slug,
            fact_type="hq",
            format="quiz",
            question=f"Where is {company_name}'s headquarters located?",
            answer="Mountain View, California",
            options=["San Francisco, California", "Seattle, Washington", "New York City, New York"],
            source_url=f"https://en.wikipedia.org/wiki/{company_name.replace(' ', '_')}",
            source_date=source_date,
        ))

        # Mock product trivia
        items.append(TriviaItem(
            company_slug=company_slug,
            fact_type="product",
            format="factoid",
            question=None,
            answer=f"{company_name}'s flagship product is its search engine, used by billions worldwide.",
            source_url=f"https://en.wikipedia.org/wiki/{company_name.replace(' ', '_')}",
            source_date=source_date,
        ))

        # Mock exec trivia
        items.append(TriviaItem(
            company_slug=company_slug,
            fact_type="exec",
            format="flashcard",
            question=f"Who is the current CEO of {company_name}?",
            answer="Sundar Pichai",
            source_url=f"https://en.wikipedia.org/wiki/{company_name.replace(' ', '_')}",
            source_date=source_date,
        ))

        return items[:limit]
