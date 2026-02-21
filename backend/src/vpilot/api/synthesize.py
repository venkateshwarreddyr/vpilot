from typing import Any

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from vpilot.core.llm_client import LLMClient, LLMProvider
from vpilot.models.message import PageContent

router = APIRouter()


class TabData(BaseModel):
    url: str
    title: str
    content: PageContent


class SynthesizeRequest(BaseModel):
    tabs: list[TabData]
    prompt: str
    provider: LLMProvider = "anthropic"
    model: str = "claude-sonnet-4-6"
    api_key: str


class SynthesizeResponse(BaseModel):
    result: str


@router.post("/synthesize", response_model=SynthesizeResponse)
async def synthesize(req: SynthesizeRequest) -> SynthesizeResponse:
    if not req.api_key:
        raise HTTPException(status_code=400, detail="api_key is required")
    if not req.tabs:
        raise HTTPException(status_code=400, detail="No tabs provided")

    # Build a combined context string from all tabs
    tab_sections = []
    for i, tab in enumerate(req.tabs, 1):
        section = f"## Tab {i}: {tab.title}\nURL: {tab.url}\n\n{tab.content.text[:4000]}"
        if tab.content.tables:
            table_text = "\n".join(
                " | ".join(row) for row in tab.content.tables[:5]
            )
            section += f"\n\nTables:\n{table_text}"
        tab_sections.append(section)

    combined = "\n\n---\n\n".join(tab_sections)
    user_msg = f"{req.prompt}\n\nHere is the data from all open tabs:\n\n{combined}"

    messages: list[dict[str, Any]] = [{"role": "user", "content": user_msg}]
    client = LLMClient(provider=req.provider, api_key=req.api_key, model=req.model)
    response = await client.chat(messages)

    return SynthesizeResponse(result=response.content)
