from typing import Any, Literal

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from venkat_pilot.core.llm_client import LLMClient, LLMProvider, LLMResponse
from venkat_pilot.models.message import PageContent, TabInfo

router = APIRouter()


class ChatRequest(BaseModel):
    messages: list[dict[str, Any]]
    page_content: PageContent
    all_tabs: list[TabInfo] = []
    act_without_asking: bool = False
    provider: LLMProvider = "anthropic"
    model: str = "claude-sonnet-4-6"
    api_key: str


class TextResponse(BaseModel):
    type: Literal["text"] = "text"
    content: str


class ToolCallItem(BaseModel):
    id: str
    name: str
    input: dict[str, Any]


class ToolCallsResponse(BaseModel):
    type: Literal["tool_calls"] = "tool_calls"
    tool_calls: list[ToolCallItem]
    raw_content: str


@router.post("/chat", response_model=TextResponse | ToolCallsResponse)
async def chat(req: ChatRequest) -> TextResponse | ToolCallsResponse:
    if not req.api_key:
        raise HTTPException(status_code=400, detail="api_key is required")

    # Inject page context into the first user message if present
    messages = _inject_page_context(req.messages, req.page_content, req.all_tabs)

    client = LLMClient(provider=req.provider, api_key=req.api_key, model=req.model)
    response: LLMResponse = await client.chat(messages)

    if response.type == "text":
        return TextResponse(content=response.content)

    return ToolCallsResponse(
        tool_calls=[
            ToolCallItem(id=tc.id, name=tc.name, input=tc.input)
            for tc in response.tool_calls
        ],
        raw_content=response.raw_content,
    )


def _inject_page_context(
    messages: list[dict[str, Any]],
    page: PageContent,
    tabs: list[TabInfo],
) -> list[dict[str, Any]]:
    """Prepend a system-style context block to the first user message."""
    if not messages:
        return messages

    context_lines = [
        f"**Current page:** {page.title} ({page.url})",
        f"**Open tabs:** {len(tabs)} tab(s) — " + ", ".join(t.title for t in tabs[:5]),
    ]
    if page.text:
        context_lines.append(f"\n**Page text (truncated):**\n{page.text[:3000]}")

    context_block = "\n".join(context_lines)

    result = list(messages)
    # Find first user message and prepend context
    for i, msg in enumerate(result):
        if msg.get("role") == "user":
            result[i] = {
                **msg,
                "content": f"[Context]\n{context_block}\n\n[User]\n{msg['content']}",
            }
            break
    return result
