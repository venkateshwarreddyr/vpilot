import { useCallback, useEffect, useRef, useState } from "react";
import { getSettings } from "../../lib/storage";
import {
  ChatRequest,
  ExtMessage,
  Message,
  PageContent,
  TabInfo,
  ToolCall,
  UserSettings,
} from "../../lib/types";

export interface ChatEntry {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  isStreaming?: boolean;
}

export interface PendingApproval {
  toolCall: ToolCall;
  step: number;
}

export function useChat() {
  const [messages, setMessages] = useState<ChatEntry[]>([]);
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);
  const [pendingApproval, setPendingApproval] = useState<PendingApproval | null>(null);
  const historyRef = useRef<Message[]>([]);
  const portRef = useRef<chrome.runtime.Port | null>(null);

  // Load settings on mount
  useEffect(() => {
    getSettings().then(setSettings);
  }, []);

  // Connect long-lived port to service worker for progress updates
  useEffect(() => {
    const port = chrome.runtime.connect({ name: "side-panel" });
    portRef.current = port;

    port.onMessage.addListener((msg: ExtMessage) => {
      if (msg.type === "CHAT_DONE") {
        appendMessage("assistant", msg.message);
        historyRef.current.push({ role: "assistant", content: msg.message });
        setIsRunning(false);
        setProgress(null);
      }
      if (msg.type === "CHAT_ERROR") {
        appendMessage("system", `Error: ${msg.error}`);
        setIsRunning(false);
        setProgress(null);
      }
      if (msg.type === "ACTION_PROGRESS") {
        setProgress(`Step ${msg.step}: ${msg.description}`);
      }
      if (msg.type === "ACTION_APPROVAL_REQUEST") {
        setPendingApproval({ toolCall: msg.toolCall, step: msg.step });
      }
    });

    return () => port.disconnect();
  }, []);

  const appendMessage = (role: ChatEntry["role"], content: string) => {
    setMessages((prev) => [
      ...prev,
      { id: crypto.randomUUID(), role, content },
    ]);
  };

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || isRunning || !settings) return;

      appendMessage("user", text);
      historyRef.current.push({ role: "user", content: text });
      setIsRunning(true);
      setProgress("Reading page...");

      // Get page content and all tabs from service worker
      const [pageContent, allTabs] = await Promise.all([
        chrome.runtime.sendMessage({ type: "GET_PAGE_CONTENT" }) as Promise<PageContent>,
        chrome.runtime.sendMessage({ type: "GET_ALL_TABS" }) as Promise<TabInfo[]>,
      ]);

      const req: ChatRequest = {
        messages: [...historyRef.current],
        page_content: pageContent,
        all_tabs: allTabs,
        act_without_asking: settings.act_without_asking,
        provider: settings.provider,
        model: settings.model,
        api_key: settings.api_key,
      };

      chrome.runtime.sendMessage({ type: "CHAT_REQUEST", payload: req });
    },
    [isRunning, settings],
  );

  const approveAction = useCallback((approved: boolean) => {
    if (!pendingApproval) return;
    chrome.runtime.sendMessage({
      type: approved ? "ACTION_APPROVED" : "ACTION_REJECTED",
      toolCallId: pendingApproval.toolCall.id,
    });
    setPendingApproval(null);
  }, [pendingApproval]);

  const clearChat = useCallback(() => {
    setMessages([]);
    historyRef.current = [];
  }, []);

  const reloadSettings = useCallback(() => {
    getSettings().then(setSettings);
  }, []);

  return {
    messages,
    settings,
    isRunning,
    progress,
    pendingApproval,
    sendMessage,
    approveAction,
    clearChat,
    reloadSettings,
    setSettings,
  };
}
