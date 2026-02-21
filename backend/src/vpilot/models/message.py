from typing import Annotated, Literal

from pydantic import BaseModel, Field


class TextMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str


class ToolResultMessage(BaseModel):
    role: Literal["tool"]
    tool_use_id: str
    content: str


Message = Annotated[TextMessage | ToolResultMessage, Field(discriminator="role")]


class FormField(BaseModel):
    name: str
    type: str
    label: str
    value: str
    placeholder: str


class PageContent(BaseModel):
    url: str
    title: str
    text: str
    headings: list[str] = []
    tables: list[list[str]] = []
    forms: list[FormField] = []
    links: list[dict[str, str]] = []


class TabInfo(BaseModel):
    id: int
    url: str
    title: str
