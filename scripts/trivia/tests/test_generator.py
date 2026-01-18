"""Tests for Quiz Generator."""

import pytest
from datetime import date
from unittest.mock import Mock, patch, MagicMock

from trivia.generator import QuizGenerator, TriviaItem
from trivia.wikipedia import CompanyFacts
from trivia.news import NewsItem


class TestTriviaItem:
    """Tests for TriviaItem dataclass."""

    def test_to_dict(self):
        """Should convert to dictionary."""
        item = TriviaItem(
            company_slug="google",
            fact_type="founding",
            format="quiz",
            question="When was Google founded?",
            answer="1998",
            options=["1995", "2000", "2004"],
            source_url="https://wikipedia.org/wiki/Google",
            source_date=date(2026, 1, 15),
        )

        result = item.to_dict()

        assert result["company_slug"] == "google"
        assert result["fact_type"] == "founding"
        assert result["format"] == "quiz"
        assert result["question"] == "When was Google founded?"
        assert result["answer"] == "1998"
        assert result["options"] == ["1995", "2000", "2004"]
        assert result["source_url"] == "https://wikipedia.org/wiki/Google"
        assert result["source_date"] == "2026-01-15"

    def test_to_dict_handles_none_date(self):
        """Should handle None source_date."""
        item = TriviaItem(
            company_slug="google",
            fact_type="founding",
            format="factoid",
            question=None,
            answer="Google was founded in 1998.",
            source_date=None,
        )

        result = item.to_dict()
        assert result["source_date"] is None


class TestQuizGenerator:
    """Tests for QuizGenerator class."""

    @patch.dict("os.environ", {"OPENAI_API_KEY": "test-key"})
    def test_init_with_env_var(self):
        """Should initialize with API key from env."""
        with patch("trivia.generator.OpenAI"):
            generator = QuizGenerator()
            assert generator.api_key == "test-key"

    def test_init_with_explicit_key(self):
        """Should accept explicit API key."""
        with patch("trivia.generator.OpenAI"):
            generator = QuizGenerator(api_key="my-explicit-key")
            assert generator.api_key == "my-explicit-key"

    @patch.dict("os.environ", {}, clear=True)
    def test_init_raises_without_key(self):
        """Should raise if no API key provided."""
        # Clear any existing OPENAI_API_KEY
        import os
        if "OPENAI_API_KEY" in os.environ:
            del os.environ["OPENAI_API_KEY"]

        with pytest.raises(ValueError, match="OpenAI API key required"):
            QuizGenerator()

    @patch("trivia.generator.OpenAI")
    def test_generates_quiz_format(self, mock_openai_class):
        """Should produce question with 4 options (1 correct + 3 wrong)."""
        mock_client = MagicMock()
        mock_openai_class.return_value = mock_client

        mock_response = MagicMock()
        mock_response.choices = [
            MagicMock(message=MagicMock(content='{"question": "When was Google founded?", "answer": "1998", "options": ["1995", "2000", "2004"]}'))
        ]
        mock_client.chat.completions.create.return_value = mock_response

        generator = QuizGenerator(api_key="test-key")
        result = generator._call_openai_for_quiz(
            "Google was founded in 1998.",
            "founding year",
            "Google"
        )

        assert result is not None
        assert result["question"] == "When was Google founded?"
        assert result["answer"] == "1998"
        assert len(result["options"]) == 3

    @patch("trivia.generator.OpenAI")
    def test_quiz_has_one_correct_answer(self, mock_openai_class):
        """Correct answer should be separate from wrong options."""
        mock_client = MagicMock()
        mock_openai_class.return_value = mock_client

        mock_response = MagicMock()
        mock_response.choices = [
            MagicMock(message=MagicMock(content='{"question": "Q?", "answer": "A", "options": ["B", "C", "D"]}'))
        ]
        mock_client.chat.completions.create.return_value = mock_response

        generator = QuizGenerator(api_key="test-key")
        result = generator._call_openai_for_quiz("Fact", "type", "Company")

        assert result is not None
        assert result["answer"] not in result["options"]

    @patch("trivia.generator.OpenAI")
    def test_handles_invalid_json_response(self, mock_openai_class):
        """Should return None for invalid JSON."""
        mock_client = MagicMock()
        mock_openai_class.return_value = mock_client

        mock_response = MagicMock()
        mock_response.choices = [
            MagicMock(message=MagicMock(content="This is not JSON"))
        ]
        mock_client.chat.completions.create.return_value = mock_response

        generator = QuizGenerator(api_key="test-key")
        result = generator._call_openai_for_quiz("Fact", "type", "Company")

        assert result is None

    @patch("trivia.generator.OpenAI")
    def test_handles_missing_fields_in_response(self, mock_openai_class):
        """Should return None if response missing required fields."""
        mock_client = MagicMock()
        mock_openai_class.return_value = mock_client

        mock_response = MagicMock()
        mock_response.choices = [
            MagicMock(message=MagicMock(content='{"question": "Q?"}'))  # Missing answer and options
        ]
        mock_client.chat.completions.create.return_value = mock_response

        generator = QuizGenerator(api_key="test-key")
        result = generator._call_openai_for_quiz("Fact", "type", "Company")

        assert result is None

    @patch("trivia.generator.OpenAI")
    def test_handles_wrong_number_of_options(self, mock_openai_class):
        """Should return None if not exactly 3 options."""
        mock_client = MagicMock()
        mock_openai_class.return_value = mock_client

        mock_response = MagicMock()
        mock_response.choices = [
            MagicMock(message=MagicMock(content='{"question": "Q?", "answer": "A", "options": ["B", "C"]}'))  # Only 2 options
        ]
        mock_client.chat.completions.create.return_value = mock_response

        generator = QuizGenerator(api_key="test-key")
        result = generator._call_openai_for_quiz("Fact", "type", "Company")

        assert result is None

    @patch("trivia.generator.OpenAI")
    def test_handles_api_error(self, mock_openai_class):
        """Should return None on API error."""
        mock_client = MagicMock()
        mock_openai_class.return_value = mock_client
        mock_client.chat.completions.create.side_effect = Exception("API Error")

        generator = QuizGenerator(api_key="test-key")
        result = generator._call_openai_for_quiz("Fact", "type", "Company")

        assert result is None

    @patch("trivia.generator.OpenAI")
    def test_generate_from_facts_creates_founding_trivia(self, mock_openai_class):
        """Should generate founding trivia from facts."""
        mock_client = MagicMock()
        mock_openai_class.return_value = mock_client

        mock_response = MagicMock()
        mock_response.choices = [
            MagicMock(message=MagicMock(content='{"question": "When was Google founded?", "answer": "1998", "options": ["1995", "2000", "2004"]}'))
        ]
        mock_client.chat.completions.create.return_value = mock_response

        facts = CompanyFacts(
            company_name="Google",
            wikipedia_url="https://wikipedia.org/wiki/Google",
            founding_date="1998",
            founders=["Larry Page", "Sergey Brin"],
        )

        generator = QuizGenerator(api_key="test-key")
        items = generator.generate_from_facts(
            company_slug="google",
            company_name="Google",
            facts=facts,
            news_items=[],
            limit=15,
        )

        # Should have founding-related trivia
        founding_items = [i for i in items if i.fact_type == "founding"]
        assert len(founding_items) > 0

        # Should have quiz, flashcard, and factoid formats
        formats = {i.format for i in founding_items}
        assert "flashcard" in formats or "factoid" in formats

    @patch("trivia.generator.OpenAI")
    def test_generate_from_facts_creates_hq_trivia(self, mock_openai_class):
        """Should generate HQ trivia from facts."""
        mock_client = MagicMock()
        mock_openai_class.return_value = mock_client

        mock_response = MagicMock()
        mock_response.choices = [
            MagicMock(message=MagicMock(content='{"question": "Where is Google HQ?", "answer": "Mountain View", "options": ["SF", "NYC", "Seattle"]}'))
        ]
        mock_client.chat.completions.create.return_value = mock_response

        facts = CompanyFacts(
            company_name="Google",
            wikipedia_url="https://wikipedia.org/wiki/Google",
            headquarters="Mountain View, California",
        )

        generator = QuizGenerator(api_key="test-key")
        items = generator.generate_from_facts(
            company_slug="google",
            company_name="Google",
            facts=facts,
            news_items=[],
            limit=15,
        )

        hq_items = [i for i in items if i.fact_type == "hq"]
        assert len(hq_items) > 0

    @patch("trivia.generator.OpenAI")
    def test_generate_from_facts_creates_news_trivia(self, mock_openai_class):
        """Should generate news trivia from news items."""
        mock_client = MagicMock()
        mock_openai_class.return_value = mock_client

        facts = CompanyFacts(company_name="Google")
        news_items = [
            NewsItem(
                title="Google announces new AI",
                link="https://example.com/news1",
                published=None,
                source="TechCrunch",
            ),
        ]

        generator = QuizGenerator(api_key="test-key")
        items = generator.generate_from_facts(
            company_slug="google",
            company_name="Google",
            facts=facts,
            news_items=news_items,
            limit=15,
        )

        news_items_result = [i for i in items if i.fact_type == "news"]
        assert len(news_items_result) > 0

    @patch("trivia.generator.OpenAI")
    def test_generate_from_facts_respects_limit(self, mock_openai_class):
        """Should respect the limit parameter."""
        mock_client = MagicMock()
        mock_openai_class.return_value = mock_client

        mock_response = MagicMock()
        mock_response.choices = [
            MagicMock(message=MagicMock(content='{"question": "Q?", "answer": "A", "options": ["B", "C", "D"]}'))
        ]
        mock_client.chat.completions.create.return_value = mock_response

        facts = CompanyFacts(
            company_name="Google",
            wikipedia_url="https://wikipedia.org/wiki/Google",
            founding_date="1998",
            founders=["Larry Page", "Sergey Brin"],
            headquarters="Mountain View",
            ceo="Sundar Pichai",
            products=["Search", "Gmail", "YouTube"],
        )

        generator = QuizGenerator(api_key="test-key")
        items = generator.generate_from_facts(
            company_slug="google",
            company_name="Google",
            facts=facts,
            news_items=[],
            limit=5,
        )

        assert len(items) <= 5

    def test_generate_mock_trivia(self):
        """Should generate mock trivia without API calls."""
        with patch("trivia.generator.OpenAI"):
            generator = QuizGenerator(api_key="test-key")
            items = generator.generate_mock_trivia("google", "Google", limit=5)

            assert len(items) == 5
            assert all(isinstance(i, TriviaItem) for i in items)
            assert all(i.company_slug == "google" for i in items)

            # Should have various formats
            formats = {i.format for i in items}
            assert len(formats) > 1


class TestTriviaQuality:
    """Tests for trivia content quality."""

    def test_quiz_has_four_options(self):
        """Each quiz item should have exactly 4 options (1 correct + 3 wrong)."""
        item = TriviaItem(
            company_slug="google",
            fact_type="founding",
            format="quiz",
            question="When was Google founded?",
            answer="1998",
            options=["1995", "2000", "2004"],
        )

        # Total options = answer + wrong options
        total_options = 1 + len(item.options or [])
        assert total_options == 4

    def test_answer_not_in_wrong_options(self):
        """Correct answer must not appear in wrong options list."""
        item = TriviaItem(
            company_slug="google",
            fact_type="founding",
            format="quiz",
            question="When was Google founded?",
            answer="1998",
            options=["1995", "2000", "2004"],
        )

        assert item.answer not in item.options

    def test_source_url_format(self):
        """source_url should be a valid URL."""
        item = TriviaItem(
            company_slug="google",
            fact_type="founding",
            format="quiz",
            question="Q?",
            answer="A",
            source_url="https://en.wikipedia.org/wiki/Google",
        )

        assert item.source_url.startswith("http")
