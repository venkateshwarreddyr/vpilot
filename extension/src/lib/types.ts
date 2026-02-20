// ── Messages ─────────────────────────────────────────────────────────────────

export type Role = "user" | "assistant" | "tool";

export interface TextMessage {
  role: "user" | "assistant";
  content: string;
}

export interface ToolResultMessage {
  role: "tool";
  tool_use_id: string;
  content: string;
}

export type Message = TextMessage | ToolResultMessage;

// ── LLM response from backend ────────────────────────────────────────────────

export interface TextResponse {
  type: "text";
  content: string;
}

export interface ToolCall {
  id: string;
  name: string;
  input: Record<string, unknown>;
}

export interface ToolCallsResponse {
  type: "tool_calls";
  tool_calls: ToolCall[];
  raw_content: string; // serialised assistant message to push back into history
}

export type LLMResponse = TextResponse | ToolCallsResponse;

// ── Browser Actions ───────────────────────────────────────────────────────────

export type ActionType =
  | "click"
  | "type"
  | "scroll"
  | "navigate"
  | "wait"
  | "extract"
  | "screenshot";

export interface ClickAction {
  type: "click";
  selector: string;
}
export interface TypeAction {
  type: "type";
  selector: string;
  value: string;
  clear?: boolean;
}
export interface ScrollAction {
  type: "scroll";
  direction: "up" | "down";
  px: number;
  selector?: string;
}
export interface NavigateAction {
  type: "navigate";
  url: string;
}
export interface WaitAction {
  type: "wait";
  ms: number;
}
export interface ExtractAction {
  type: "extract";
  selector: string;
  as: string;
}
export interface ScreenshotAction {
  type: "screenshot";
}

export type BrowserAction =
  | ClickAction
  | TypeAction
  | ScrollAction
  | NavigateAction
  | WaitAction
  | ExtractAction
  | ScreenshotAction;

// ── Page Content ──────────────────────────────────────────────────────────────

export interface PageContent {
  url: string;
  title: string;
  text: string;
  headings: string[];
  tables: string[][];
  forms: FormField[];
  links: { text: string; href: string }[];
}

export interface FormField {
  name: string;
  type: string;
  label: string;
  value: string;
  placeholder: string;
}

export interface TabInfo {
  id: number;
  url: string;
  title: string;
}

// ── Extension ↔ Service Worker messages ──────────────────────────────────────

export type ExtMessage =
  | { type: "GET_PAGE_CONTENT" }
  | { type: "GET_ALL_TABS" }
  | { type: "EXECUTE_ACTIONS"; actions: BrowserAction[] }
  | { type: "CAPTURE_SCREENSHOT" }
  | { type: "CHAT_REQUEST"; payload: ChatRequest }
  | { type: "CHAT_CHUNK"; content: string }
  | { type: "CHAT_DONE"; message: string }
  | { type: "CHAT_ERROR"; error: string }
  | { type: "ACTION_APPROVAL_REQUEST"; toolCall: ToolCall; step: number; total: number }
  | { type: "ACTION_APPROVED"; toolCallId: string }
  | { type: "ACTION_REJECTED"; toolCallId: string }
  | { type: "ACTION_PROGRESS"; step: number; total: number; description: string };

// ── Chat Request ──────────────────────────────────────────────────────────────

export interface ChatRequest {
  messages: Message[];
  page_content: PageContent;
  all_tabs: TabInfo[];
  act_without_asking: boolean;
  provider: LLMProvider;
  model: string;
  api_key: string;
}

export type LLMProvider = "anthropic" | "openai" | "xai";

// ── Settings ──────────────────────────────────────────────────────────────────

export interface UserSettings {
  provider: LLMProvider;
  model: string;
  api_key: string;
  backend_url: string;
  act_without_asking: boolean;
  backend_api_key: string;
}

export const DEFAULT_SETTINGS: UserSettings = {
  provider: "anthropic",
  model: "claude-sonnet-4-6",
  api_key: "",
  backend_url: "http://localhost:7071",
  act_without_asking: false,
  backend_api_key: "dev-key",
};

export const MODEL_OPTIONS: Record<LLMProvider, string[]> = {
  anthropic: ["claude-sonnet-4-6", "claude-opus-4-6", "claude-haiku-4-5-20251001"],
  openai: ["gpt-4o", "gpt-4o-mini", "gpt-4-turbo"],
  xai: ["grok-2-1212", "grok-2-vision-1212", "grok-beta"],
};
