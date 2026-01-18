"""Tests for exponential backoff utility."""

import pytest
from unittest.mock import Mock, patch
import time

from scrapers.backoff import BackoffConfig, exponential_backoff


class TestBackoffConfig:
    def test_default_values(self):
        """Should have sensible defaults."""
        config = BackoffConfig()
        assert config.initial_delay == 1.0
        assert config.max_delay == 60.0
        assert config.multiplier == 2.0
        assert config.jitter == 0.1

    def test_calculate_delay_increases_exponentially(self):
        """Backoff: 1s → 2s → 4s → 8s."""
        config = BackoffConfig(jitter=0)  # Disable jitter for deterministic test
        assert config.calculate_delay(0) == 1.0
        assert config.calculate_delay(1) == 2.0
        assert config.calculate_delay(2) == 4.0
        assert config.calculate_delay(3) == 8.0

    def test_caps_at_max_delay(self):
        """Should not exceed max_delay."""
        config = BackoffConfig(initial_delay=1.0, max_delay=60.0, jitter=0)
        # After 6 attempts: 1 → 2 → 4 → 8 → 16 → 32 → 64 (capped to 60)
        assert config.calculate_delay(6) == 60.0
        assert config.calculate_delay(10) == 60.0

    def test_jitter_adds_randomness(self):
        """Delay should vary slightly with jitter."""
        config = BackoffConfig(initial_delay=10.0, jitter=0.1)
        delays = [config.calculate_delay(0) for _ in range(10)]
        # All delays should be between 10.0 and 11.0 (10% jitter)
        assert all(10.0 <= d <= 11.0 for d in delays)
        # At least some variation (not all exactly the same)
        assert len(set(delays)) > 1


class TestExponentialBackoff:
    def test_returns_result_on_success(self):
        """Should return function result immediately on success."""
        func = Mock(return_value="success")
        result = exponential_backoff(func, max_attempts=3)
        assert result == "success"
        assert func.call_count == 1

    def test_retries_on_failure(self):
        """Should retry up to max_attempts times."""
        func = Mock(side_effect=Exception("fail"))
        with patch("scrapers.backoff.time.sleep"):  # Don't actually sleep
            result = exponential_backoff(
                func, max_attempts=3, config=BackoffConfig(initial_delay=0.1)
            )
        assert result is None
        assert func.call_count == 3

    def test_succeeds_after_retry(self):
        """Should succeed if function works on retry."""
        func = Mock(side_effect=[Exception("fail"), Exception("fail"), "success"])
        with patch("scrapers.backoff.time.sleep"):
            result = exponential_backoff(
                func, max_attempts=5, config=BackoffConfig(initial_delay=0.1)
            )
        assert result == "success"
        assert func.call_count == 3

    def test_calls_on_retry_callback(self):
        """Should call on_retry callback before each retry."""
        func = Mock(side_effect=[Exception("fail1"), Exception("fail2"), "success"])
        on_retry = Mock()
        with patch("scrapers.backoff.time.sleep"):
            exponential_backoff(
                func, max_attempts=5, config=BackoffConfig(initial_delay=0.1), on_retry=on_retry
            )
        assert on_retry.call_count == 2
        # Check first call was with attempt=0
        assert on_retry.call_args_list[0][0][0] == 0
