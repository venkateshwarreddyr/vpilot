"""Tests for context_store and blob_store (graceful fallback when not configured)."""

import pytest

from vpilot.core.context_store import load_conversation, load_user_prefs, save_conversation, save_user_prefs
from vpilot.core.blob_store import upload_screenshot


class TestContextStoreFallback:
    """When Cosmos is not configured, all operations should silently no-op."""

    async def test_save_conversation_no_cosmos(self) -> None:
        # Should not raise even without Cosmos configured
        await save_conversation("sess-1", [{"role": "user", "content": "hi"}])

    async def test_load_conversation_no_cosmos(self) -> None:
        result = await load_conversation("sess-1")
        assert result == []

    async def test_save_user_prefs_no_cosmos(self) -> None:
        await save_user_prefs("device-1", {"theme": "dark"})

    async def test_load_user_prefs_no_cosmos(self) -> None:
        result = await load_user_prefs("device-1")
        assert result == {}


class TestBlobStoreFallback:
    """When Blob is not configured (UseDevelopmentStorage), upload returns None."""

    async def test_upload_screenshot_no_blob(self) -> None:
        # Default config uses UseDevelopmentStorage → _get_client returns None
        result = await upload_screenshot("aGVsbG8=")  # base64 "hello"
        assert result is None
