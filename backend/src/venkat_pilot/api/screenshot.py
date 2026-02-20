import base64
from typing import Any

import anthropic
from fastapi import APIRouter, HTTPException
from openai import AsyncOpenAI
from pydantic import BaseModel

from venkat_pilot.core.blob_store import upload_screenshot
from venkat_pilot.core.llm_client import LLMProvider

router = APIRouter()


class ScreenshotRequest(BaseModel):
    image_base64: str
    prompt: str = "Describe what you see on this page screenshot in detail."
    provider: LLMProvider = "anthropic"
    model: str = "claude-sonnet-4-6"
    api_key: str


class ScreenshotResponse(BaseModel):
    analysis: str
    blob_url: str | None = None


@router.post("/screenshot", response_model=ScreenshotResponse)
async def analyse_screenshot(req: ScreenshotRequest) -> ScreenshotResponse:
    if not req.api_key:
        raise HTTPException(status_code=400, detail="api_key is required")

    # Optionally persist to blob
    blob_url = await upload_screenshot(req.image_base64)

    analysis = await _analyse(req)
    return ScreenshotResponse(analysis=analysis, blob_url=blob_url)


async def _analyse(req: ScreenshotRequest) -> str:
    image_data = req.image_base64

    if req.provider == "anthropic":
        client = anthropic.AsyncAnthropic(api_key=req.api_key)
        response = await client.messages.create(
            model=req.model,
            max_tokens=2048,
            messages=[
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "image",
                            "source": {
                                "type": "base64",
                                "media_type": "image/jpeg",
                                "data": image_data,
                            },
                        },
                        {"type": "text", "text": req.prompt},
                    ],
                }
            ],
        )
        return "\n".join(
            b.text for b in response.content if b.type == "text"  # type: ignore[union-attr]
        )

    # OpenAI / xAI vision
    base_url = "https://api.x.ai/v1" if req.provider == "xai" else None
    oai: Any = AsyncOpenAI(api_key=req.api_key, **({"base_url": base_url} if base_url else {}))
    response = await oai.chat.completions.create(
        model=req.model,
        messages=[
            {
                "role": "user",
                "content": [
                    {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{image_data}"}},
                    {"type": "text", "text": req.prompt},
                ],
            }
        ],
        max_tokens=2048,
    )
    return response.choices[0].message.content or ""
