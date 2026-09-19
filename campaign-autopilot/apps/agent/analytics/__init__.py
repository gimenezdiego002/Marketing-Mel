"""Pure, deterministic analytics used by the Campaign Autopilot agent."""

from .diagnostics import diagnose
from .fatigue import fatigue_score

__all__ = ["diagnose", "fatigue_score"]
