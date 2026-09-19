"""Verify the low-volume confidence penalty."""

import pytest

from analytics.significance import adjusted_confidence, confidence_penalty


def test_no_penalty_at_fifty_weekly_conversions() -> None:
    assert confidence_penalty(50) == 0
    assert adjusted_confidence(.9, 50) == .9


def test_penalty_scales_below_threshold() -> None:
    assert confidence_penalty(25) == .25
    assert adjusted_confidence(.9, 25) == .65


def test_negative_volume_is_rejected() -> None:
    with pytest.raises(ValueError):
        confidence_penalty(-1)
