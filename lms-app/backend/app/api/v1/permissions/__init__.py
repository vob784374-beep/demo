"""Permissions API v1 package."""

from flask_smorest import Blueprint
from .routes import permissions_bp

# Export blueprint for registration
__all__ = ["permissions_bp"]
