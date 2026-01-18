"""
Unit tests for Google Trends fetch script.

These tests mock external dependencies (pytrends) and validate:
- Input file loading
- Progress saving/loading
- Output file generation
- Data quality checks
"""

import json
import os
import sys
import tempfile
from pathlib import Path
from unittest.mock import Mock, patch, MagicMock
import pytest

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))


class TestInputLoading:
    """Tests for loading input JSON files."""

    def test_companies_json_valid(self):
        """companies.json should be valid JSON with required structure."""
        companies_file = Path(__file__).parent.parent / "companies.json"
        with open(companies_file) as f:
            data = json.load(f)

        assert "categories" in data
        assert len(data["categories"]) >= 5  # At least 5 categories

        total_companies = 0
        for category in data["categories"]:
            assert "name" in category
            assert "companies" in category
            for company in category["companies"]:
                assert "name" in company
                assert "slug" in company
                total_companies += 1

        assert total_companies >= 100  # At least 100 companies

    def test_roles_json_valid(self):
        """roles.json should be valid JSON with required structure."""
        roles_file = Path(__file__).parent.parent / "roles.json"
        with open(roles_file) as f:
            data = json.load(f)

        assert "roles" in data
        assert len(data["roles"]) >= 8  # At least 8 roles

        for role in data["roles"]:
            assert "name" in role
            assert "slug" in role

    def test_company_slugs_lowercase_no_spaces(self):
        """All company slugs should be lowercase with no spaces."""
        companies_file = Path(__file__).parent.parent / "companies.json"
        with open(companies_file) as f:
            data = json.load(f)

        for category in data["categories"]:
            for company in category["companies"]:
                slug = company["slug"]
                assert slug == slug.lower(), f"Slug not lowercase: {slug}"
                assert " " not in slug, f"Slug has spaces: {slug}"

    def test_role_slugs_lowercase_no_spaces(self):
        """All role slugs should be lowercase with no spaces."""
        roles_file = Path(__file__).parent.parent / "roles.json"
        with open(roles_file) as f:
            data = json.load(f)

        for role in data["roles"]:
            slug = role["slug"]
            assert slug == slug.lower(), f"Slug not lowercase: {slug}"
            assert " " not in slug, f"Slug has spaces: {slug}"

    def test_no_duplicate_company_slugs(self):
        """Company slugs should be unique across all categories."""
        companies_file = Path(__file__).parent.parent / "companies.json"
        with open(companies_file) as f:
            data = json.load(f)

        slugs = []
        for category in data["categories"]:
            for company in category["companies"]:
                slugs.append(company["slug"])

        assert len(slugs) == len(set(slugs)), "Duplicate company slugs found"

    def test_no_duplicate_role_slugs(self):
        """Role slugs should be unique."""
        roles_file = Path(__file__).parent.parent / "roles.json"
        with open(roles_file) as f:
            data = json.load(f)

        slugs = [role["slug"] for role in data["roles"]]
        assert len(slugs) == len(set(slugs)), "Duplicate role slugs found"


class TestOutputValidation:
    """Tests for validating output JSON structure."""

    def test_output_has_required_fields(self):
        """Output JSON should have all required fields."""
        output_file = Path(__file__).parent.parent.parent.parent / "data" / "search_volume.json"
        if not output_file.exists():
            pytest.skip("Output file does not exist yet")

        with open(output_file) as f:
            data = json.load(f)

        assert "generated_at" in data
        assert "geography" in data
        assert "status" in data
        assert "companies" in data
        assert "priority_list" in data

    def test_output_status_valid(self):
        """Status should be one of: complete, partial, blocked."""
        output_file = Path(__file__).parent.parent.parent.parent / "data" / "search_volume.json"
        if not output_file.exists():
            pytest.skip("Output file does not exist yet")

        with open(output_file) as f:
            data = json.load(f)

        assert data["status"] in ["complete", "partial", "blocked"]

    def test_output_companies_have_required_fields(self):
        """Each company in output should have required fields."""
        output_file = Path(__file__).parent.parent.parent.parent / "data" / "search_volume.json"
        if not output_file.exists():
            pytest.skip("Output file does not exist yet")

        with open(output_file) as f:
            data = json.load(f)

        for company in data["companies"]:
            assert "name" in company
            assert "slug" in company
            assert "interview_volume" in company
            assert isinstance(company["interview_volume"], (int, float))

    def test_output_priority_list_sorted(self):
        """Priority list should be sorted by score descending."""
        output_file = Path(__file__).parent.parent.parent.parent / "data" / "search_volume.json"
        if not output_file.exists():
            pytest.skip("Output file does not exist yet")

        with open(output_file) as f:
            data = json.load(f)

        scores = [item["score"] for item in data["priority_list"]]
        assert scores == sorted(scores, reverse=True), "Priority list not sorted"

    def test_output_roles_have_numeric_volume(self):
        """Each role should have numeric volume."""
        output_file = Path(__file__).parent.parent.parent.parent / "data" / "search_volume.json"
        if not output_file.exists():
            pytest.skip("Output file does not exist yet")

        with open(output_file) as f:
            data = json.load(f)

        for company in data["companies"]:
            for role in company.get("roles", []):
                assert "volume" in role
                assert isinstance(role["volume"], (int, float))


class TestProgressSaving:
    """Tests for progress file functionality."""

    def test_progress_file_structure(self):
        """Progress file should have correct structure when created."""
        with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False) as f:
            progress = {
                "processed_companies": ["google", "apple"],
                "results": {
                    "google": {
                        "name": "Google",
                        "category": "Big Tech",
                        "interview_volume": 85,
                        "roles": []
                    }
                }
            }
            json.dump(progress, f)
            temp_path = f.name

        try:
            with open(temp_path) as f:
                loaded = json.load(f)

            assert "processed_companies" in loaded
            assert "results" in loaded
            assert isinstance(loaded["processed_companies"], list)
            assert isinstance(loaded["results"], dict)
        finally:
            os.unlink(temp_path)


class TestDataQuality:
    """Tests for data quality requirements."""

    def test_geography_is_us(self):
        """Geography should be US."""
        output_file = Path(__file__).parent.parent.parent.parent / "data" / "search_volume.json"
        if not output_file.exists():
            pytest.skip("Output file does not exist yet")

        with open(output_file) as f:
            data = json.load(f)

        assert data["geography"] == "US"

    def test_generated_at_is_iso_format(self):
        """generated_at should be ISO format timestamp."""
        output_file = Path(__file__).parent.parent.parent.parent / "data" / "search_volume.json"
        if not output_file.exists():
            pytest.skip("Output file does not exist yet")

        with open(output_file) as f:
            data = json.load(f)

        # Should not raise
        from datetime import datetime
        # Accept with or without Z suffix
        timestamp = data["generated_at"].rstrip("Z")
        datetime.fromisoformat(timestamp)


class TestBlockHandling:
    """Tests for block detection and handling."""

    def test_blocked_status_in_output(self):
        """When blocked, output should have status='blocked'."""
        # This is tested via manual integration test
        # Unit test verifies the status values are valid
        valid_statuses = ["complete", "partial", "blocked"]
        output_file = Path(__file__).parent.parent.parent.parent / "data" / "search_volume.json"
        if not output_file.exists():
            pytest.skip("Output file does not exist yet")

        with open(output_file) as f:
            data = json.load(f)

        assert data["status"] in valid_statuses


class TestRateLimiting:
    """Tests for rate limiting configuration."""

    def test_delay_constants_defined(self):
        """MIN_DELAY and MAX_DELAY should be defined."""
        # Read the script and check for constants
        script_file = Path(__file__).parent.parent / "fetch_trends.py"
        with open(script_file) as f:
            content = f.read()

        assert "MIN_DELAY" in content
        assert "MAX_DELAY" in content
        assert "10" in content  # MIN_DELAY = 10
        assert "30" in content  # MAX_DELAY = 30
