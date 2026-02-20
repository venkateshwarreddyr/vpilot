"""Tests for pydantic models."""

import pytest
from pydantic import ValidationError

from venkat_pilot.models.action import (
    ClickAction,
    ExtractAction,
    NavigateAction,
    ScrollAction,
    ScreenshotAction,
    TypeAction,
    WaitAction,
)
from venkat_pilot.models.message import FormField, PageContent, TabInfo, TextMessage, ToolResultMessage


class TestActionModels:
    def test_click_action(self) -> None:
        a = ClickAction(type="click", selector="#btn")
        assert a.selector == "#btn"

    def test_type_action_defaults(self) -> None:
        a = TypeAction(type="type", selector="input", value="hello")
        assert a.clear is False

    def test_type_action_with_clear(self) -> None:
        a = TypeAction(type="type", selector="input", value="x", clear=True)
        assert a.clear is True

    def test_scroll_action_valid(self) -> None:
        a = ScrollAction(type="scroll", direction="down", px=300)
        assert a.px == 300

    def test_scroll_action_px_too_large(self) -> None:
        with pytest.raises(ValidationError):
            ScrollAction(type="scroll", direction="down", px=99999)

    def test_scroll_action_px_zero(self) -> None:
        with pytest.raises(ValidationError):
            ScrollAction(type="scroll", direction="down", px=0)

    def test_navigate_action(self) -> None:
        a = NavigateAction(type="navigate", url="https://example.com")
        assert a.url == "https://example.com"

    def test_wait_action_valid(self) -> None:
        a = WaitAction(type="wait", ms=1000)
        assert a.ms == 1000

    def test_wait_action_too_long(self) -> None:
        with pytest.raises(ValidationError):
            WaitAction(type="wait", ms=10000)

    def test_extract_action(self) -> None:
        a = ExtractAction.model_validate({"type": "extract", "selector": ".data", "as": "result"})
        assert a.as_ == "result"

    def test_screenshot_action(self) -> None:
        a = ScreenshotAction(type="screenshot")
        assert a.type == "screenshot"


class TestMessageModels:
    def test_text_message(self) -> None:
        m = TextMessage(role="user", content="Hello")
        assert m.role == "user"
        assert m.content == "Hello"

    def test_tool_result_message(self) -> None:
        m = ToolResultMessage(role="tool", tool_use_id="tc_123", content="done")
        assert m.tool_use_id == "tc_123"

    def test_page_content_defaults(self) -> None:
        p = PageContent(url="https://x.com", title="X", text="body text")
        assert p.headings == []
        assert p.tables == []
        assert p.forms == []
        assert p.links == []

    def test_page_content_full(self) -> None:
        p = PageContent(
            url="https://x.com",
            title="X",
            text="hello",
            headings=["H1"],
            tables=[["a", "b"]],
            forms=[FormField(name="email", type="email", label="Email", value="", placeholder="")],
            links=[{"text": "Click", "href": "https://x.com"}],
        )
        assert len(p.headings) == 1
        assert len(p.forms) == 1

    def test_tab_info(self) -> None:
        t = TabInfo(id=1, url="https://x.com", title="X")
        assert t.id == 1
