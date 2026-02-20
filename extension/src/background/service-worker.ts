import { callChat, callScreenshot, callSynthesize } from "../lib/api";
import { getSettings } from "../lib/storage";
import {
  BrowserAction,
  ChatRequest,
  ExtMessage,
  LLMResponse,
  Message,
  PageContent,
  TabInfo,
  ToolCall,
  ToolCallsResponse,
} from "../lib/types";

const MAX_TURNS = 200;

// Keep side panel port for streaming progress updates
let sidePanelPort: chrome.runtime.Port | null = null;

chrome.runtime.onConnect.addListener((port) => {
  if (port.name === "side-panel") {
    sidePanelPort = port;
    port.onDisconnect.addListener(() => {
      sidePanelPort = null;
    });
  }
});

function postToPanel(msg: ExtMessage) {
  sidePanelPort?.postMessage(msg);
}

// ── Context menu: open side panel ────────────────────────────────────────────

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "open-venkat-pilot",
    title: "Ask venkat_pilot",
    contexts: ["selection", "page"],
  });
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
});

chrome.contextMenus.onClicked.addListener((_info, tab) => {
  if (tab?.id) chrome.sidePanel.open({ tabId: tab.id });
});

// ── Main message handler ──────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener(
  (
    msg: ExtMessage,
    _sender,
    sendResponse: (r: unknown) => void,
  ) => {
    if (msg.type === "CHAT_REQUEST") {
      handleChatRequest(msg.payload).catch((err: unknown) => {
        postToPanel({
          type: "CHAT_ERROR",
          error: err instanceof Error ? err.message : String(err),
        });
      });
      sendResponse({ ok: true });
      return true;
    }

    if (msg.type === "GET_ALL_TABS") {
      getAllTabs().then(sendResponse);
      return true;
    }

    if (msg.type === "CAPTURE_SCREENSHOT") {
      captureScreenshot().then(sendResponse);
      return true;
    }

    return false;
  },
);

// ── Agent orchestration loop ──────────────────────────────────────────────────

async function handleChatRequest(req: ChatRequest) {
  const settings = await getSettings();
  const messages: Message[] = [...req.messages];
  let pageContent = req.page_content;
  const allTabs = req.all_tabs;

  // pending approval map: toolCallId → resolve fn
  const approvalQueue = new Map<
    string,
    (approved: boolean) => void
  >();

  // Listen for approval responses from side panel
  const approvalListener = (msg: ExtMessage) => {
    if (msg.type === "ACTION_APPROVED") {
      approvalQueue.get(msg.toolCallId)?.(true);
      approvalQueue.delete(msg.toolCallId);
    }
    if (msg.type === "ACTION_REJECTED") {
      approvalQueue.get(msg.toolCallId)?.(false);
      approvalQueue.delete(msg.toolCallId);
    }
  };
  chrome.runtime.onMessage.addListener(approvalListener);

  try {
    for (let turn = 0; turn < MAX_TURNS; turn++) {
      const response: LLMResponse = await callChat(
        settings.backend_url,
        settings.backend_api_key,
        { ...req, messages, page_content: pageContent, all_tabs: allTabs },
      );

      if (response.type === "text") {
        postToPanel({ type: "CHAT_DONE", message: response.content });
        break;
      }

      // Tool calls
      const tcRes = response as ToolCallsResponse;
      const toolResults: Message[] = [];

      for (const toolCall of tcRes.tool_calls) {
        postToPanel({
          type: "ACTION_PROGRESS",
          step: turn + 1,
          total: -1,
          description: toolCallDescription(toolCall),
        });

        // Approval gate (skipped in act-without-asking mode)
        if (!req.act_without_asking) {
          postToPanel({
            type: "ACTION_APPROVAL_REQUEST",
            toolCall,
            step: turn + 1,
            total: -1,
          });
          const approved = await new Promise<boolean>((resolve) => {
            approvalQueue.set(toolCall.id, resolve);
          });
          if (!approved) {
            postToPanel({
              type: "CHAT_DONE",
              message: "Action cancelled by user.",
            });
            return;
          }
        }

        // Execute
        const result = await executeTool(toolCall, pageContent, allTabs);

        // Refresh page content after navigation/action
        if (
          toolCall.name === "execute_browser_action" ||
          toolCall.name === "extract_page_content"
        ) {
          pageContent = await getCurrentPageContent();
        }

        toolResults.push({
          role: "tool",
          tool_use_id: toolCall.id,
          content: typeof result === "string" ? result : JSON.stringify(result),
        });
      }

      // Append assistant turn + tool results to history
      messages.push({ role: "assistant", content: tcRes.raw_content });
      messages.push(...toolResults);
    }
  } finally {
    chrome.runtime.onMessage.removeListener(approvalListener);
  }
}

// ── Tool execution ────────────────────────────────────────────────────────────

async function executeTool(
  toolCall: ToolCall,
  _pageContent: PageContent,
  _allTabs: TabInfo[],
): Promise<unknown> {
  const { name, input } = toolCall;

  switch (name) {
    case "extract_page_content": {
      const tabId = input.tab_id as string | undefined;
      if (tabId && tabId !== "current") {
        return await getPageContentForTab(parseInt(tabId));
      }
      return await getCurrentPageContent();
    }

    case "get_all_tabs": {
      return await getAllTabs();
    }

    case "execute_browser_action": {
      const actions = input.actions as BrowserAction[];
      return await executeActionsInTab(actions);
    }

    case "capture_screenshot": {
      const b64 = await captureScreenshot();
      const settings = await getSettings();
      // Analyse screenshot inline
      return await callScreenshot(
        settings.backend_url,
        settings.backend_api_key,
        b64,
        "Describe what you see on this page screenshot.",
        settings.provider,
        settings.model,
        settings.api_key,
      );
    }

    case "synthesize_tabs": {
      const settings = await getSettings();
      const tabs = await getAllTabs();
      const tabsWithContent = await Promise.all(
        tabs.map(async (t) => ({
          url: t.url,
          title: t.title,
          content: await getPageContentForTab(t.id),
        })),
      );
      return await callSynthesize(
        settings.backend_url,
        settings.backend_api_key,
        tabsWithContent,
        input.prompt as string,
        settings.provider,
        settings.model,
        settings.api_key,
      );
    }

    default:
      return `Unknown tool: ${name}`;
  }
}

// ── DOM helpers (via content scripts) ────────────────────────────────────────

async function getCurrentPageContent(): Promise<PageContent> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) throw new Error("No active tab");
  return await getPageContentForTab(tab.id);
}

async function getPageContentForTab(tabId: number): Promise<PageContent> {
  const results = await chrome.scripting.executeScript({
    target: { tabId },
    func: () => {
      // extractor.ts exposes window.__venkatExtract
      return (
        window as unknown as { __venkatExtract?: () => PageContent }
      ).__venkatExtract?.();
    },
  });
  return (results[0]?.result ?? {
    url: "",
    title: "",
    text: "",
    headings: [],
    tables: [],
    forms: [],
    links: [],
  }) as PageContent;
}

async function getAllTabs(): Promise<TabInfo[]> {
  const tabs = await chrome.tabs.query({});
  return tabs
    .filter((t) => t.url && !t.url.startsWith("chrome://"))
    .map((t) => ({ id: t.id!, url: t.url!, title: t.title ?? "" }));
}

async function executeActionsInTab(actions: BrowserAction[]): Promise<string> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) throw new Error("No active tab");
  const results = await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: (acts: BrowserAction[]) => {
      return (
        window as unknown as {
          __venkatAct?: (a: BrowserAction[]) => Promise<string>;
        }
      ).__venkatAct?.(acts);
    },
    args: [actions],
  });
  return (results[0]?.result as string) ?? "done";
}

async function captureScreenshot(): Promise<string> {
  const dataUrl = await chrome.tabs.captureVisibleTab({ format: "jpeg", quality: 80 });
  // Strip "data:image/jpeg;base64," prefix
  return dataUrl.split(",")[1] ?? "";
}

function toolCallDescription(tc: ToolCall): string {
  switch (tc.name) {
    case "execute_browser_action":
      return `Executing ${(tc.input.actions as BrowserAction[])?.length ?? 1} browser action(s)`;
    case "extract_page_content":
      return "Reading page content";
    case "get_all_tabs":
      return "Listing open tabs";
    case "capture_screenshot":
      return "Taking screenshot";
    case "synthesize_tabs":
      return "Synthesizing data across tabs";
    default:
      return tc.name;
  }
}
