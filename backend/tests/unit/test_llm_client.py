"""Unit tests for LLM client (mocked API calls)."""

from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from venkat_pilot.core.llm_client import LLMClient, LLMResponse


@pytest.fixture
def anthropic_client() -> LLMClient:
    return LLMClient(provider="anthropic", api_key="sk-ant-test", model="claude-haiku-4-5-20251001")


@pytest.fixture
def openai_client() -> LLMClient:
    return LLMClient(provider="openai", api_key="sk-test", model="gpt-4o-mini")


@pytest.fixture
def xai_client() -> LLMClient:
    return LLMClient(provider="xai", api_key="xai-test", model="grok-2-1212")


class TestAnthropicClient:
    async def test_text_response(self, anthropic_client: LLMClient) -> None:
        mock_block = MagicMock()
        mock_block.type = "text"
        mock_block.text = "Hello, world!"

        mock_response = MagicMock()
        mock_response.stop_reason = "end_turn"
        mock_response.content = [mock_block]

        with patch.object(
            anthropic_client._anthropic.messages,  # type: ignore[union-attr]
            "create",
            new_callable=AsyncMock,
            return_value=mock_response,
        ):
            result = await anthropic_client.chat([{"role": "user", "content": "Hi"}])

        assert result.type == "text"
        assert result.content == "Hello, world!"

    async def test_tool_call_response(self, anthropic_client: LLMClient) -> None:
        mock_tool_block = MagicMock()
        mock_tool_block.type = "tool_use"
        mock_tool_block.id = "tu_123"
        mock_tool_block.name = "get_all_tabs"
        mock_tool_block.input = {}

        mock_response = MagicMock()
        mock_response.stop_reason = "tool_use"
        mock_response.content = [mock_tool_block]

        with patch.object(
            anthropic_client._anthropic.messages,  # type: ignore[union-attr]
            "create",
            new_callable=AsyncMock,
            return_value=mock_response,
        ):
            result = await anthropic_client.chat([{"role": "user", "content": "List tabs"}])

        assert result.type == "tool_calls"
        assert len(result.tool_calls) == 1
        assert result.tool_calls[0].name == "get_all_tabs"


class TestOpenAIClient:
    async def test_text_response(self, openai_client: LLMClient) -> None:
        mock_message = MagicMock()
        mock_message.content = "Hello from GPT"
        mock_message.tool_calls = None

        mock_choice = MagicMock()
        mock_choice.message = mock_message

        mock_response = MagicMock()
        mock_response.choices = [mock_choice]

        with patch.object(
            openai_client._openai.chat.completions,  # type: ignore[union-attr]
            "create",
            new_callable=AsyncMock,
            return_value=mock_response,
        ):
            result = await openai_client.chat([{"role": "user", "content": "Hi"}])

        assert result.type == "text"
        assert result.content == "Hello from GPT"


class TestXAIClient:
    def test_uses_xai_base_url(self, xai_client: LLMClient) -> None:
        assert xai_client._openai is not None
        assert "x.ai" in str(xai_client._openai.base_url)


class TestMessageInjection:
    async def test_page_context_injected(self, anthropic_client: LLMClient) -> None:
        """Context injection happens in api/chat.py, not the client."""
        from venkat_pilot.api.chat import _inject_page_context
        from venkat_pilot.models.message import PageContent

        page = PageContent(url="https://example.com", title="Example", text="hello world")
        messages = [{"role": "user", "content": "What is this page about?"}]
        result = _inject_page_context(messages, page, [])

        assert "example.com" in result[0]["content"]
        assert "What is this page about?" in result[0]["content"]
