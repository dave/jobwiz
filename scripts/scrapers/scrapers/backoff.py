"""Exponential backoff utilities for rate limiting."""

import time
import random
from dataclasses import dataclass
from typing import Callable, TypeVar, Optional
import logging

logger = logging.getLogger(__name__)

T = TypeVar("T")


@dataclass
class BackoffConfig:
    """Configuration for exponential backoff."""

    initial_delay: float = 1.0
    max_delay: float = 60.0
    multiplier: float = 2.0
    jitter: float = 0.1  # Random jitter as fraction of delay

    def calculate_delay(self, attempt: int) -> float:
        """Calculate delay for given attempt number (0-indexed)."""
        delay = min(self.initial_delay * (self.multiplier**attempt), self.max_delay)
        # Add random jitter
        jitter_amount = delay * self.jitter * random.random()
        return delay + jitter_amount


def exponential_backoff(
    func: Callable[[], T],
    max_attempts: int = 5,
    config: Optional[BackoffConfig] = None,
    on_retry: Optional[Callable[[int, Exception], None]] = None,
) -> Optional[T]:
    """
    Execute function with exponential backoff on failure.

    Args:
        func: Function to execute
        max_attempts: Maximum number of attempts
        config: Backoff configuration
        on_retry: Optional callback called before each retry with (attempt, exception)

    Returns:
        Result of func() on success, None if all attempts fail
    """
    if config is None:
        config = BackoffConfig()

    last_exception: Optional[Exception] = None

    for attempt in range(max_attempts):
        try:
            return func()
        except Exception as e:
            last_exception = e
            if attempt < max_attempts - 1:
                delay = config.calculate_delay(attempt)
                logger.warning(
                    f"Attempt {attempt + 1}/{max_attempts} failed: {e}. "
                    f"Retrying in {delay:.1f}s..."
                )
                if on_retry:
                    on_retry(attempt, e)
                time.sleep(delay)
            else:
                logger.error(f"All {max_attempts} attempts failed. Last error: {e}")

    return None
