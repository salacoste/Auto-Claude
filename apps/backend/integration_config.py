"""
Integration Configuration Module
=================================

Reads active integration settings from Electron's settings.json and provides
model mapping for API token integrations.

This allows API token integrations (like z.ai GLM) to override default model IDs.
"""

import json
import os
import sys
from pathlib import Path
from typing import TypedDict, Literal


class ApiTokenIntegration(TypedDict, total=False):
    """API token integration from settings."""

    id: str
    type: Literal['api-token']
    name: str
    description: str
    apiToken: str
    baseUrl: str
    modelMapping: ModelMapping
    createdAt: str


def get_electron_settings_path() -> Path | None:
    """
    Get path to Electron app's settings.json.

    Returns:
        Path to settings.json or None if not found
    """
    # Standard path for Electron apps
    if sys.platform == "win32":
        app_data = Path(os.environ.get("APPDATA", ""))
        settings_path = app_data / "auto-claude-ui" / "settings.json"
    elif sys.platform == "darwin":
        home = Path.home()
        settings_path = (
            home / "Library" / "Application Support" / "auto-claude-ui" / "settings.json"
        )
    elif sys.platform == "linux":
        home = Path.home()
        settings_path = home / ".config" / "auto-claude-ui" / "settings.json"
    else:
        return None

    return settings_path if settings_path.exists() else None


def get_active_integration() -> ApiTokenIntegration | None:
    """
    Get the active API token integration from Electron settings.

    Returns:
        Active integration config or None if not found/not API token type
    """
    settings_path = get_electron_settings_path()
    if not settings_path:
        return None

    try:
        with open(settings_path, encoding='utf-8') as f:
            settings = json.load(f)

        active_id = settings.get("activeIntegrationId")
        if not active_id:
            return None

        # Find active integration
        integrations = settings.get("integrations", [])
        for integration in integrations:
            if integration.get("id") == active_id:
                # Only return if it's an API token integration with mapping
                if (
                    integration.get("type") == "api-token"
                    and integration.get("modelMapping")
                ):
                    return integration
                break

        return None

    except (json.JSONDecodeError, OSError, KeyError):
        return None


def get_model_mapping() -> ModelMapping | None:
    """
    Get model mapping from active API token integration.

    Returns:
        Model mapping dict or None if no active integration or mapping
    """
    integration = get_active_integration()
    return integration.get("modelMapping") if integration else None


def resolve_model_with_integration(model_shorthand: str, default: str = "") -> str:
    """
    Resolve model shorthand using active integration's model mapping.

    If an API token integration is active with model mapping, uses that.
    Otherwise falls back to standard resolution.

    Args:
        model_shorthand: 'opus', 'sonnet', or 'haiku'
        default: Value to return if no mapping found (default: "")

    Returns:
        Resolved model ID (custom or default)
    """
    mapping = get_model_mapping()

    if mapping and model_shorthand in mapping:
        return mapping[model_shorthand]

    # Fallback to provided default
    return default


def get_api_token() -> str | None:
    """
    Get API token from active API token integration.

    Returns:
        API token or None if no active API token integration
    """
    integration = get_active_integration()
    return integration.get("apiToken") if integration else None


def get_base_url() -> str | None:
    """
    Get base URL from active API token integration.

    Returns:
        Base URL or None if no active API token integration
    """
    integration = get_active_integration()
    return integration.get("baseUrl") if integration else None
