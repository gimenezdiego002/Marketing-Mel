"""Apply a transparent confidence penalty when weekly conversion volume is limited."""

from __future__ import annotations


MIN_WEEKLY_CONVERSIONS = 50.0


def confidence_penalty(conversions_per_week: float, threshold: float = MIN_WEEKLY_CONVERSIONS) -> float:
    """Return 0 with enough data, scaling linearly up to a maximum 0.5 penalty."""
    if conversions_per_week < 0:
        raise ValueError("Conversions cannot be negative")
    if threshold <= 0:
        raise ValueError("Threshold must be positive")
    return round(0.5 * max(0.0, 1.0 - conversions_per_week / threshold), 4)


def adjusted_confidence(base_confidence: float, conversions_per_week: float) -> float:
    """Subtract the sample-size penalty from a bounded base confidence."""
    if not 0 <= base_confidence <= 1:
        raise ValueError("Base confidence must be between 0 and 1")
    return round(max(0.0, base_confidence - confidence_penalty(conversions_per_week)), 4)
