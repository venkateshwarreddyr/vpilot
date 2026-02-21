import { useEffect, useRef, useState } from "react";
import { saveSettings } from "../lib/storage";
import { MODEL_OPTIONS, MODEL_SHORT_NAMES, TabInfo } from "../lib/types";
import { ActionApproval } from "./components/ActionApproval";
import { ChatInput } from "./components/ChatInput";
import { ChatMessage } from "./components/ChatMessage";
import { SettingsPanel } from "./components/SettingsPanel";
import { useChat } from "./hooks/useChat";

export default function App() {
  const {
    messages,
    settings,
    isRunning,
    progress,
    stepCount,
    pendingApproval,
    sendMessage,
    approveAction,
    clearChat,
    reloadSettings,
    setSettings,
  } = useChat();

  const [showSettings, setShowSettings] = useState(false);
  const [showModelPicker, setShowModelPicker] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to latest message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, progress]);

  // Show settings on first launch if no API key
  useEffect(() => {
    if (settings && !settings.api_key) setShowSettings(true);
  }, [settings]);

  async function handleScreenshot() {
    if (!settings) return;
    const b64 = await chrome.runtime.sendMessage({ type: "CAPTURE_SCREENSHOT" }) as string;
    sendMessage(`[Screenshot attached] Analyse this screenshot and describe what you see.`);
    void b64; // screenshot is handled by service worker tool
  }

  async function handleSynthesize() {
    if (!settings) return;
    const allTabs = await chrome.runtime.sendMessage({ type: "GET_ALL_TABS" }) as TabInfo[];
    const tabList = allTabs.map((t) => `• ${t.title} (${t.url})`).join("\n");
    sendMessage(
      `Synthesize data from all my open tabs and give me a combined summary:\n${tabList}`,
    );
  }

  async function handleToggleActMode() {
    if (!settings) return;
    const updated = { ...settings, act_without_asking: !settings.act_without_asking };
    await saveSettings(updated);
    setSettings(updated);
  }

  if (!settings) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (showSettings) {
    return (
      <div className="h-screen">
        <SettingsPanel
          settings={settings}
          onClose={() => setShowSettings(false)}
          onSaved={reloadSettings}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-stone-50">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 bg-white border-b border-stone-200 shadow-sm">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-brand-500 flex items-center justify-center">
            <span className="text-white text-xs font-bold">VP</span>
          </div>
          <span className="font-semibold text-stone-800 text-sm">vpilot</span>
          <div className="relative">
            <button
              onClick={() => setShowModelPicker((v) => !v)}
              className="text-xs text-stone-400 hover:text-stone-600 hover:bg-stone-100 rounded-md px-1.5 py-0.5 transition-colors flex items-center gap-1"
            >
              {MODEL_SHORT_NAMES[settings.model] ?? settings.model}
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {showModelPicker && (
              <div className="absolute top-full left-0 mt-1 bg-white border border-stone-200 rounded-lg shadow-lg py-1 z-50 min-w-[180px]">
                {MODEL_OPTIONS[settings.provider].map((m) => (
                  <button
                    key={m}
                    onClick={async () => {
                      const updated = { ...settings, model: m };
                      await saveSettings(updated);
                      setSettings(updated);
                      setShowModelPicker(false);
                    }}
                    className={`w-full text-left px-3 py-1.5 text-xs hover:bg-stone-100 transition-colors ${
                      m === settings.model ? "text-brand-500 font-semibold" : "text-stone-600"
                    }`}
                  >
                    {MODEL_SHORT_NAMES[m] ?? m}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={clearChat}
            className="text-stone-400 hover:text-stone-600 p-1.5 rounded-lg hover:bg-stone-100 transition-colors"
            title="Clear chat"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
          <button
            onClick={() => setShowSettings(true)}
            className="text-stone-400 hover:text-stone-600 p-1.5 rounded-lg hover:bg-stone-100 transition-colors"
            title="Settings"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-3 py-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center px-6">
            <div className="w-12 h-12 rounded-2xl bg-brand-500 flex items-center justify-center mb-4 shadow-md">
              <span className="text-white text-xl font-bold">VP</span>
            </div>
            <h3 className="font-semibold text-stone-700 mb-1">vpilot</h3>
            <p className="text-sm text-stone-400 leading-relaxed">
              Your AI browser copilot. I can read pages, act across tabs, edit
              documents, and complete multi-step tasks autonomously.
            </p>
          </div>
        )}

        {messages.map((msg) => (
          <ChatMessage key={msg.id} entry={msg} />
        ))}

        {/* Progress indicator with step counter */}
        {isRunning && progress && (
          <div className="flex items-center gap-2 px-3 py-2 mx-1 mb-2 bg-blue-50 border border-blue-100 rounded-xl">
            {stepCount > 0 && (
              <span className="text-xs font-semibold text-blue-700 whitespace-nowrap">{stepCount} steps</span>
            )}
            <div className="w-3.5 h-3.5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin flex-shrink-0" />
            <span className="text-xs text-blue-600 truncate">{progress}</span>
          </div>
        )}

        {/* Action approval card */}
        {pendingApproval && (
          <ActionApproval
            approval={pendingApproval}
            onApprove={approveAction}
          />
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <ChatInput
        onSend={sendMessage}
        onScreenshot={handleScreenshot}
        onSynthesize={handleSynthesize}
        disabled={isRunning || !!pendingApproval}
        settings={settings}
        onToggleActMode={handleToggleActMode}
      />
    </div>
  );
}
