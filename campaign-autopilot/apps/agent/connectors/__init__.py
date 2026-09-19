"""External-system adapters selected through the connector registry."""

from .registry import get_connector

__all__ = ["get_connector"]
