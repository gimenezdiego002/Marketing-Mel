"""Typed OpenAI layer for explanations, plans, creative variants, and chat answers."""

from typing import TYPE_CHECKING, Any

if TYPE_CHECKING:
    from .client import LLMClient

__all__ = ["LLMClient"]


def __getattr__(name: str) -> Any:
    if name == "LLMClient":
        from .client import LLMClient
        return LLMClient
    raise AttributeError(name)
