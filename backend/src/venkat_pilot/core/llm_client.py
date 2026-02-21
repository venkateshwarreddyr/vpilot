"""
Unified LLM client supporting Anthropic, OpenAI, and xAI (Grok).

All three share the same interface:
  chat(messages, tools) -> LLMResponse
"""

from __future__ import annotations

import json
from dataclasses import dataclass, field
from typing import Any, Literal

import anthropic
from openai import AsyncOpenAI

LLMProvider = Literal["anthropic", "openai", "xai"]

# ── Tool definition (provider-agnostic) ───────────────────────────────────────

TOOLS: list[dict[str, Any]] = [
    {
        "name": "extract_page_content",
        "description": "Get the structured content (text, headings, tables, forms) of the current tab or a specific tab.",
        "input_schema": {
            "type": "object",
            "properties": {
                "tab_id": {"type": "string", "description": "Tab ID or 'current'"}
            },
        },
    },
    {
        "name": "execute_browser_action",
        "description": "Perform browser actions: click, type, scroll, navigate, wait, or extract.",
        "input_schema": {
            "type": "object",
            "required": ["actions"],
            "properties": {
                "actions": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "required": ["type"],
                        "properties": {
                            "type": {"type": "string", "enum": ["click", "type", "scroll", "navigate", "wait", "extract"]},
                            "selector": {"type": "string"},
                            "value": {"type": "string"},
                            "clear": {"type": "boolean"},
                            "direction": {"type": "string", "enum": ["up", "down"]},
                            "px": {"type": "integer"},
                            "url": {"type": "string"},
                            "ms": {"type": "integer"},
                            "as": {"type": "string"},
                        },
                    },
                }
            },
        },
    },
    {
        "name": "get_all_tabs",
        "description": "List all currently open browser tabs with their URLs and titles.",
        "input_schema": {"type": "object", "properties": {}},
    },
    {
        "name": "capture_screenshot",
        "description": "Capture a screenshot of the current tab and analyse it visually.",
        "input_schema": {"type": "object", "properties": {}},
    },
    {
        "name": "synthesize_tabs",
        "description": "Pull and combine data from all open tabs to answer a question or create a document.",
        "input_schema": {
            "type": "object",
            "required": ["prompt"],
            "properties": {
                "prompt": {"type": "string", "description": "What to synthesize or create from the tab data"}
            },
        },
    },
]

SYSTEM_PROMPT = """You are venkat_pilot, an AI browser copilot embedded in Chrome.
You can read web pages, act on them, and synthesize information across tabs.

Guidelines:
- Be concise. For multi-step tasks, plan briefly then execute.
- In "Act without asking" mode complete all steps autonomously and report when done.
- Never navigate away from important pages without warning the user first.
- When using execute_browser_action, batch related actions in a single call.
- Use extract_page_content after actions to verify results.
- Format your final responses in clear markdown."""

# ── Response types ────────────────────────────────────────────────────────────

@dataclass
class ToolCall:
    id: str
    name: str
    input: dict[str, Any]


@dataclass
class LLMResponse:
    type: Literal["text", "tool_calls"]
    content: str = ""
    tool_calls: list[ToolCall] = field(default_factory=list)
    raw_content: str = ""  # serialised for pushing back into message history


# ── Client ────────────────────────────────────────────────────────────────────

class LLMClient:
    def __init__(self, provider: LLMProvider, api_key: str, model: str) -> None:
        self.provider = provider
        self.model = model
        self._anthropic: anthropic.AsyncAnthropic | None = None
        self._openai: AsyncOpenAI | None = None

        if provider == "anthropic":
            self._anthropic = anthropic.AsyncAnthropic(api_key=api_key)
        elif provider == "openai":
            self._openai = AsyncOpenAI(api_key=api_key)
        elif provider == "xai":
            self._openai = AsyncOpenAI(api_key=api_key, base_url="https://api.x.ai/v1")

    async def chat(
        self,
        messages: list[dict[str, Any]],
    ) -> LLMResponse:
        if self.provider == "anthropic":
            return await self._chat_anthropic(messages)
        return await self._chat_openai(messages)

    # ── Anthropic ─────────────────────────────────────────────────────────────

    async def _chat_anthropic(self, messages: list[dict[str, Any]]) -> LLMResponse:
        assert self._anthropic is not None

        # Convert tool result messages to Anthropic format
        converted = _convert_messages_to_anthropic(messages)

        tools_anthropic = [
            {
                "name": t["name"],
                "description": t["description"],
                "input_schema": t["input_schema"],
            }
            for t in TOOLS
        ]

        response = await self._anthropic.messages.create(
            model=self.model,
            max_tokens=16384,
            system=SYSTEM_PROMPT,
            messages=converted,
            tools=tools_anthropic,  # type: ignore[arg-type]
        )

        if response.stop_reason == "tool_use":
            calls = []
            text_parts = []
            for block in response.content:
                if block.type == "tool_use":
                    calls.append(ToolCall(id=block.id, name=block.name, input=block.input))  # type: ignore[arg-type]
                elif block.type == "text":
                    text_parts.append(block.text)

            # raw_content for appending back to history (Anthropic format)
            raw = json.dumps([
                {"type": b.type, **_anthropic_block_to_dict(b)}
                for b in response.content
            ])
            return LLMResponse(
                type="tool_calls",
                content="\n".join(text_parts),
                tool_calls=calls,
                raw_content=raw,
            )

        text = "\n".join(
            b.text for b in response.content if b.type == "text"  # type: ignore[union-attr]
        )
        return LLMResponse(type="text", content=text, raw_content=text)

    # ── OpenAI / xAI ─────────────────────────────────────────────────────────

    async def _chat_openai(self, messages: list[dict[str, Any]]) -> LLMResponse:
        assert self._openai is not None

        system_msg = {"role": "system", "content": SYSTEM_PROMPT}
        converted = _convert_messages_to_openai(messages)

        tools_openai = [
            {
                "type": "function",
                "function": {
                    "name": t["name"],
                    "description": t["description"],
                    "parameters": t["input_schema"],
                },
            }
            for t in TOOLS
        ]

        response = await self._openai.chat.completions.create(
            model=self.model,
            messages=[system_msg, *converted],  # type: ignore[arg-type]
            tools=tools_openai,  # type: ignore[arg-type]
            tool_choice="auto",
            max_tokens=16384,
        )

        choice = response.choices[0]
        msg = choice.message

        if msg.tool_calls:
            calls = [
                ToolCall(
                    id=tc.id,
                    name=tc.function.name,
                    input=json.loads(tc.function.arguments),
                )
                for tc in msg.tool_calls
            ]
            raw = json.dumps({"role": "assistant", "content": msg.content, "tool_calls": [
                {"id": tc.id, "type": "function",
                 "function": {"name": tc.function.name, "arguments": tc.function.arguments}}
                for tc in msg.tool_calls
            ]})
            return LLMResponse(
                type="tool_calls",
                content=msg.content or "",
                tool_calls=calls,
                raw_content=raw,
            )

        return LLMResponse(type="text", content=msg.content or "")


# ── Message format converters ─────────────────────────────────────────────────

def _convert_messages_to_anthropic(messages: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Convert unified message format to Anthropic format."""
    result = []
    for m in messages:
        if m["role"] == "tool":
            result.append({
                "role": "user",
                "content": [{
                    "type": "tool_result",
                    "tool_use_id": m["tool_use_id"],
                    "content": m["content"],
                }],
            })
        elif m["role"] == "assistant" and m.get("content", "").startswith("["):
            # Raw JSON content (tool_use blocks from previous turn)
            try:
                blocks = json.loads(m["content"])
                result.append({"role": "assistant", "content": blocks})
            except json.JSONDecodeError:
                result.append({"role": m["role"], "content": m["content"]})
        else:
            result.append({"role": m["role"], "content": m["content"]})
    return result


def _convert_messages_to_openai(messages: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Convert unified message format to OpenAI format."""
    result = []
    for m in messages:
        if m["role"] == "tool":
            result.append({
                "role": "tool",
                "tool_call_id": m["tool_use_id"],
                "content": m["content"],
            })
        elif m["role"] == "assistant" and m.get("content", "").startswith("{"):
            # Raw JSON from previous openai turn
            try:
                parsed = json.loads(m["content"])
                result.append(parsed)
            except json.JSONDecodeError:
                result.append({"role": "assistant", "content": m["content"]})
        else:
            result.append({"role": m["role"], "content": m["content"]})
    return result


def _anthropic_block_to_dict(block: Any) -> dict[str, Any]:
    if block.type == "text":
        return {"text": block.text}
    if block.type == "tool_use":
        return {"id": block.id, "name": block.name, "input": block.input}
    return {}
