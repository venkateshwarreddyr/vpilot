"""Integration-style tests for FastAPI endpoints (no real LLM calls)."""

from unittest.mock import AsyncMock, patch

import pytest
from httpx import ASGITransport, AsyncClient

from vpilot.app import app
from vpilot.core.llm_client import LLMResponse, ToolCall


@pytest.fixture
async def client() -> AsyncClient:
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as c:
        yield c


HEADERS = {"Authorization": "Bearer dev-key"}

CHAT_PAYLOAD = {
    "messages": [{"role": "user", "content": "Summarize this page"}],
    "page_content": {
        "url": "https://example.com",
        "title": "Example",
        "text": "Hello world",
        "headings": [],
        "tables": [],
        "forms": [],
        "links": [],
    },
    "all_tabs": [],
    "provider": "anthropic",
    "model": "claude-haiku-4-5-20251001",
    "api_key": "sk-ant-fake",
}


async def test_health(client: AsyncClient) -> None:
    resp = await client.get("/api/health")
    assert resp.status_code == 200
    assert resp.json()["status"] == "ok"


async def test_chat_returns_text(client: AsyncClient) -> None:
    mock_response = LLMResponse(type="text", content="This page says Hello world.")

    with patch(
        "vpilot.api.chat.LLMClient.chat",
        new_callable=AsyncMock,
        return_value=mock_response,
    ):
        resp = await client.post("/api/chat", json=CHAT_PAYLOAD, headers=HEADERS)

    assert resp.status_code == 200
    data = resp.json()
    assert data["type"] == "text"
    assert "Hello world" in data["content"]


async def test_chat_returns_tool_calls(client: AsyncClient) -> None:
    mock_response = LLMResponse(
        type="tool_calls",
        tool_calls=[ToolCall(id="tc1", name="get_all_tabs", input={})],
        raw_content="[...]",
    )

    with patch(
        "vpilot.api.chat.LLMClient.chat",
        new_callable=AsyncMock,
        return_value=mock_response,
    ):
        resp = await client.post("/api/chat", json=CHAT_PAYLOAD, headers=HEADERS)

    assert resp.status_code == 200
    data = resp.json()
    assert data["type"] == "tool_calls"
    assert data["tool_calls"][0]["name"] == "get_all_tabs"


async def test_chat_requires_auth(client: AsyncClient) -> None:
    resp = await client.post("/api/chat", json=CHAT_PAYLOAD)
    assert resp.status_code == 401


async def test_chat_missing_api_key(client: AsyncClient) -> None:
    payload = {**CHAT_PAYLOAD, "api_key": ""}
    resp = await client.post("/api/chat", json=payload, headers=HEADERS)
    assert resp.status_code == 400


async def test_synthesize(client: AsyncClient) -> None:
    mock_response = LLMResponse(type="text", content="Combined summary of all tabs.")

    with patch(
        "vpilot.api.synthesize.LLMClient.chat",
        new_callable=AsyncMock,
        return_value=mock_response,
    ):
        resp = await client.post(
            "/api/synthesize",
            json={
                "tabs": [
                    {
                        "url": "https://a.com",
                        "title": "Site A",
                        "content": {
                            "url": "https://a.com", "title": "A", "text": "Revenue: $100K",
                            "headings": [], "tables": [], "forms": [], "links": [],
                        },
                    }
                ],
                "prompt": "Summarize the data",
                "provider": "anthropic",
                "model": "claude-haiku-4-5-20251001",
                "api_key": "sk-ant-fake",
            },
            headers=HEADERS,
        )

    assert resp.status_code == 200
    assert "summary" in resp.json()["result"].lower()
