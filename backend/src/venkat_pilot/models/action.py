from typing import Literal

from pydantic import BaseModel, Field


class ClickAction(BaseModel):
    type: Literal["click"]
    selector: str


class TypeAction(BaseModel):
    type: Literal["type"]
    selector: str
    value: str
    clear: bool = False


class ScrollAction(BaseModel):
    type: Literal["scroll"]
    direction: Literal["up", "down"]
    px: int = Field(ge=1, le=10000)
    selector: str | None = None


class NavigateAction(BaseModel):
    type: Literal["navigate"]
    url: str


class WaitAction(BaseModel):
    type: Literal["wait"]
    ms: int = Field(ge=100, le=5000)


class ExtractAction(BaseModel):
    type: Literal["extract"]
    selector: str
    as_: str = Field(alias="as")


class ScreenshotAction(BaseModel):
    type: Literal["screenshot"]


BrowserAction = (
    ClickAction
    | TypeAction
    | ScrollAction
    | NavigateAction
    | WaitAction
    | ExtractAction
    | ScreenshotAction
)
