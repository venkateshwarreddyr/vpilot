import {
  BrowserAction,
  ClickAction,
  ExtractAction,
  NavigateAction,
  ScrollAction,
  TypeAction,
  WaitAction,
} from "../lib/types";

async function executeActions(actions: BrowserAction[]): Promise<string> {
  const results: string[] = [];

  for (const action of actions) {
    try {
      const result = await executeOne(action);
      results.push(result);
    } catch (err) {
      results.push(
        `Error on ${action.type}: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  return results.join("\n");
}

async function executeOne(action: BrowserAction): Promise<string> {
  switch (action.type) {
    case "click": {
      const a = action as ClickAction;
      const el = resolveElement(a.selector);
      if (!el) return `click: element not found: ${a.selector}`;
      (el as HTMLElement).click();
      return `clicked: ${a.selector}`;
    }

    case "type": {
      const a = action as TypeAction;
      const el = resolveElement(a.selector) as HTMLInputElement | null;
      if (!el) return `type: element not found: ${a.selector}`;
      el.focus();
      if (a.clear) el.value = "";
      // Native input event so React/Vue frameworks detect the change
      const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        "value",
      )?.set;
      nativeInputValueSetter?.call(el, a.value);
      el.dispatchEvent(new Event("input", { bubbles: true }));
      el.dispatchEvent(new Event("change", { bubbles: true }));
      return `typed into: ${a.selector}`;
    }

    case "scroll": {
      const a = action as ScrollAction;
      const target = a.selector
        ? (resolveElement(a.selector) as HTMLElement | null) ?? window
        : window;
      const by = a.direction === "down" ? a.px : -a.px;
      if (target === window) {
        window.scrollBy({ top: by, behavior: "smooth" });
      } else {
        (target as HTMLElement).scrollBy({ top: by, behavior: "smooth" });
      }
      await sleep(400);
      return `scrolled ${a.direction} ${a.px}px`;
    }

    case "navigate": {
      const a = action as NavigateAction;
      location.href = a.url;
      return `navigating to ${a.url}`;
    }

    case "wait": {
      const a = action as WaitAction;
      await sleep(Math.min(a.ms, 5000));
      return `waited ${a.ms}ms`;
    }

    case "extract": {
      const a = action as ExtractAction;
      const el = resolveElement(a.selector);
      if (!el) return `extract: element not found: ${a.selector}`;
      return `${a.as}: ${(el as HTMLElement).innerText.trim().slice(0, 500)}`;
    }

    case "screenshot":
      return "screenshot taken by service worker";

    default:
      return `unknown action type`;
  }
}

function resolveElement(selector: string): Element | null {
  // Try CSS selector first, then XPath, then text match
  try {
    const el = document.querySelector(selector);
    if (el) return el;
  } catch {
    // invalid CSS selector
  }

  // Try XPath
  if (selector.startsWith("/") || selector.startsWith("(")) {
    const result = document.evaluate(
      selector,
      document,
      null,
      XPathResult.FIRST_ORDERED_NODE_TYPE,
      null,
    );
    if (result.singleNodeValue) return result.singleNodeValue as Element;
  }

  // Fuzzy: find button/link by text
  const lower = selector.toLowerCase();
  for (const tag of ["button", "a", "input", "label", "[role='button']"]) {
    for (const el of document.querySelectorAll(tag)) {
      if (
        (el as HTMLElement).innerText?.toLowerCase().includes(lower) ||
        (el as HTMLInputElement).value?.toLowerCase().includes(lower) ||
        (el as HTMLElement).getAttribute("aria-label")?.toLowerCase().includes(lower)
      ) {
        return el;
      }
    }
  }

  return null;
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

(
  window as unknown as {
    __venkatAct: (actions: BrowserAction[]) => Promise<string>;
  }
).__venkatAct = executeActions;
