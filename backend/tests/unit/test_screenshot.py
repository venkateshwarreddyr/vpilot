"""Tests for screenshot API endpoint."""

from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from httpx import ASGITransport, AsyncClient

from vpilot.app import app

HEADERS = {"Authorization": "Bearer dev-key"}

PAYLOAD = {
    "image_base64": "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
    "prompt": "What do you see?",
    "provider": "anthropic",
    "model": "claude-haiku-4-5-20251001",
    "api_key": "sk-ant-fake",
}


@pytest.fixture
async def client() -> AsyncClient:
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as c:
        yield c


async def test_screenshot_anthropic(client: AsyncClient) -> None:
    mock_block = MagicMock()
    mock_block.type = "text"
    mock_block.text = "A blank white image."

    mock_response = MagicMock()
    mock_response.content = [mock_block]

    with patch("vpilot.api.screenshot.anthropic.AsyncAnthropic") as MockAnth:
        instance = MockAnth.return_value
        instance.messages = MagicMock()
        instance.messages.create = AsyncMock(return_value=mock_response)
        with patch("vpilot.api.screenshot.upload_screenshot", new_callable=AsyncMock, return_value=None):
            resp = await client.post("/api/screenshot", json=PAYLOAD, headers=HEADERS)

    assert resp.status_code == 200
    assert "blank" in resp.json()["analysis"]


async def test_screenshot_openai(client: AsyncClient) -> None:
    mock_msg = MagicMock()
    mock_msg.content = "Analysed with GPT."
    mock_choice = MagicMock()
    mock_choice.message = mock_msg
    mock_response = MagicMock()
    mock_response.choices = [mock_choice]

    payload = {**PAYLOAD, "provider": "openai", "model": "gpt-4o", "api_key": "sk-fake"}

    with patch("vpilot.api.screenshot.AsyncOpenAI") as MockOAI:
        instance = MockOAI.return_value
        instance.chat = MagicMock()
        instance.chat.completions = MagicMock()
        instance.chat.completions.create = AsyncMock(return_value=mock_response)
        with patch("vpilot.api.screenshot.upload_screenshot", new_callable=AsyncMock, return_value=None):
            resp = await client.post("/api/screenshot", json=payload, headers=HEADERS)

    assert resp.status_code == 200
    assert "GPT" in resp.json()["analysis"]


async def test_screenshot_xai(client: AsyncClient) -> None:
    mock_msg = MagicMock()
    mock_msg.content = "xAI vision response."
    mock_choice = MagicMock()
    mock_choice.message = mock_msg
    mock_response = MagicMock()
    mock_response.choices = [mock_choice]

    payload = {**PAYLOAD, "provider": "xai", "model": "grok-2-vision-1212", "api_key": "xai-fake"}

    with patch("vpilot.api.screenshot.AsyncOpenAI") as MockOAI:
        instance = MockOAI.return_value
        instance.chat = MagicMock()
        instance.chat.completions = MagicMock()
        instance.chat.completions.create = AsyncMock(return_value=mock_response)
        with patch("vpilot.api.screenshot.upload_screenshot", new_callable=AsyncMock, return_value=None):
            resp = await client.post("/api/screenshot", json=payload, headers=HEADERS)

    assert resp.status_code == 200
    assert "xAI" in resp.json()["analysis"]


async def test_screenshot_missing_key(client: AsyncClient) -> None:
    resp = await client.post("/api/screenshot", json={**PAYLOAD, "api_key": ""}, headers=HEADERS)
    assert resp.status_code == 400
