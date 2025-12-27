"""
API Token Provider
==================

Token-based authentication provider for Claude API.

Handles API token authentication and provides methods for testing
connectivity and retrieving available models.
"""

import asyncio
import json
import logging
import os
import sys
from typing import Any

import httpx

logger = logging.getLogger(__name__)


class TokenProviderError(Exception):
    """Base exception for token provider errors."""

    pass


class TokenProvider:
    """
    API token authentication provider.

    Handles test connections, model retrieval, and API calls using token-based auth.
    """

    def __init__(
        self,
        api_token: str,
        base_url: str = "https://api.anthropic.com",
        timeout_ms: int = 30000,
    ):
        """
        Initialize token provider.

        Args:
            api_token: API authentication token
            base_url: Base URL for API endpoint
            timeout_ms: Request timeout in milliseconds
        """
        self.api_token = api_token
        self.base_url = base_url.rstrip("/")
        self.timeout = timeout_ms / 1000

    async def test_connection(self) -> dict[str, Any]:
        """
        Test API connection and authentication.

        Returns:
            Dict with status and message:
            - success: {"status": "success", "message": "Connection successful"}
            - failure: {"status": "error", "message": "Error description"}
        """
        try:
            # Try a simple API call to verify auth
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                # Use messages endpoint with empty content to test auth
                response = await client.post(
                    f"{self.base_url}/v1/messages",
        Test connection to API with minimal request.

        Returns:
            Test result with status and message
        """
        print(f"[TokenProvider] Testing connection to: {self.base_url}", file=sys.stderr)
        print(f"[TokenProvider] Token length: {len(self.api_token)}", file=sys.stderr)
        print(f"[TokenProvider] Token preview: {self.api_token[:15]}...{self.api_token[-10:]}", file=sys.stderr)
        
        try:
            # Make minimal API call to test token
            messages = [{"role": "user", "content": "test"}]
            
            print(f"[TokenProvider] Making POST request to: {self.base_url}/v1/messages", file=sys.stderr)
            print(f"[TokenProvider] Request headers:", file=sys.stderr)
            print(f"  x-api-key: {self.api_token[:15]}...", file=sys.stderr)
            print(f"  anthropic-version: 2023-06-01", file=sys.stderr)
            print(f"  content-type: application/json", file=sys.stderr)
            print(f"[TokenProvider] Request payload: model=claude-3-5-sonnet-20241022, max_tokens=10", file=sys.stderr)
            
            response = await self._make_request(
                model="claude-3-5-sonnet-20241022", messages=messages, max_tokens=10
            )

            print(f"[TokenProvider] ✅ Success! Got 200 response", file=sys.stderr)
            return {"status": "success", "message": "Connection successful!"}

        except httpx.HTTPStatusError as e:
            status_code = e.response.status_code
            response_text = e.response.text
            
            print(f"[TokenProvider] ❌ HTTP Error: {status_code}", file=sys.stderr)
            print(f"[TokenProvider] Response headers: {dict(e.response.headers)}", file=sys.stderr)
            print(f"[TokenProvider] Response body: {response_text}", file=sys.stderr)
            
            if status_code == 401:
                return {
                    "status": "error",
                    "message": f"Invalid API token. Please check your credentials. (API responded: {response_text[:100]})",
                }
            return {
                "status": "error",
                "message": f"API request failed (HTTP {status_code}): {response_text[:100]}",
            }

        except httpx.TimeoutException:
            print(f"[TokenProvider] ❌ Timeout connecting to API", file=sys.stderr)
            return {
                "status": "error",
                "message": "Connection timeout. Please check your network and API endpoint.",
            }

        except Exception as error:
            print(f"[TokenProvider] ❌ Unexpected error: {type(error).__name__}: {str(error)}", file=sys.stderr)
            return {"status": "error", "message": f"Connection failed: {str(error)}"}

    async def get_models(self) -> dict[str, Any]:
        """
        Retrieve available models from API.

        Returns:
            Dict with models list:
            - success: {"status": "success", "models": ["model-1", "model-2"]}
            - failure: {"status": "error", "message": "Error description"}
        """
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                # Try OpenAI-style models endpoint
                response = await client.get(
                    f"{self.base_url}/v1/models",
                    headers={
                        "x-api-key": self.api_token,
                        "anthropic-version": "2023-06-01",
                    },
                )

                if response.status_code == 200:
                    data = response.json()
                    # Extract model IDs from response
                    models = []
                    if "data" in data:
                        # OpenAI-style response
                        models = [m["id"] for m in data["data"]]
                    elif "models" in data:
                        # Alternative format
                        models = data["models"]
                    else:
                        # Assume direct list
                        models = data

                    logger.info(f"Retrieved {len(models)} models")
                    return {"status": "success", "models": models}
                else:
                    error_msg = f"Failed to retrieve models (status {response.status_code})"
                    logger.error(error_msg)
                    return {"status": "error", "message": error_msg}

        except Exception as e:
            logger.error(f"Model retrieval failed: {e}")
            return {"status": "error", "message": f"Failed to get models: {str(e)}"}

    async def make_request(
        self, model: str, messages: list[dict], max_tokens: int = 4096, **kwargs
    ) -> dict[str, Any]:
        """
        Make an API request with token authentication.

        Args:
            model: Model identifier
            messages: List of message dicts
            max_tokens: Max tokens to generate
            **kwargs: Additional API parameters

        Returns:
            API response as dict
        """
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                payload = {
                    "model": model,
                    "messages": messages,
                    "max_tokens": max_tokens,
                    **kwargs,
                }

                response = await client.post(
                    f"{self.base_url}/v1/messages",
                    headers={
                        "x-api-key": self.api_token,
                        "anthropic-version": "2023-06-01",
                        "content-type": "application/json",
                    },
                    json=payload,
                )

                response.raise_for_status()
                return response.json()

        except Exception as e:
            logger.error(f"API request failed: {e}")
            raise TokenProviderError(f"Request failed: {str(e)}") from e


def test_connection_sync(api_token: str, base_url: str) -> dict[str, Any]:
    """
    Synchronous wrapper for test_connection.

    Args:
        api_token: API authentication token
        base_url: Base URL for API endpoint

    Returns:
        Connection test result
    """
    provider = TokenProvider(api_token, base_url)
    return asyncio.run(provider.test_connection())


def get_models_sync(api_token: str, base_url: str) -> dict[str, Any]:
    """
    Synchronous wrapper for get_models.

    Args:
        api_token: API authentication token
        base_url: Base URL for API endpoint

    Returns:
        Models list result
    """
    provider = TokenProvider(api_token, base_url)
    return asyncio.run(provider.get_models())


def test_oauth_connection_sync(oauth_token: str) -> dict[str, Any]:
    """
    Test OAuth connection with real API call.

    Args:
        oauth_token: OAuth authentication token

    Returns:
        Connection test result
    """
    # OAuth uses standard Anthropic API endpoint
    provider = TokenProvider(oauth_token, "https://api.anthropic.com")
    return asyncio.run(provider.test_connection())
