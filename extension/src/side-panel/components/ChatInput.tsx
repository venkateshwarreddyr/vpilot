import { KeyboardEvent, useRef, useState } from "react";
import { UserSettings } from "../../lib/types";

const SUGGESTIONS = [
  "Summarize this page",
  "Pull data from all my open tabs",
  "Fill out this form with...",
  "Transform this doc to an executive briefing",
  "Resolve all comments in this doc",
  "Analyse this page screenshot",
];

interface Props {
  onSend: (text: string) => void;
  onScreenshot: () => void;
  onSynthesize: () => void;
  disabled: boolean;
  settings: UserSettings;
  onToggleActMode: () => void;
}

export function ChatInput({
  onSend,
  onScreenshot,
  onSynthesize,
  disabled,
  settings,
  onToggleActMode,
}: Props) {
  const [text, setText] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  }

  function submit() {
    const trimmed = text.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setText("");
    setShowSuggestions(false);
  }

  function pickSuggestion(s: string) {
    setText(s);
    setShowSuggestions(false);
    textareaRef.current?.focus();
  }

  return (
    <div className="border-t border-stone-200 bg-white">
      {/* Suggestions */}
      {showSuggestions && (
        <div className="px-3 pt-2 pb-1 flex flex-wrap gap-1.5">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              onClick={() => pickSuggestion(s)}
              className="text-xs bg-stone-100 hover:bg-stone-200 text-stone-600 rounded-full px-2.5 py-1 transition-colors"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Act without asking toggle */}
      <div className="flex items-center gap-2 px-3 pt-2">
        <button
          onClick={onToggleActMode}
          className={`flex items-center gap-1.5 text-xs rounded-full px-2.5 py-1 font-medium transition-colors ${
            settings.act_without_asking
              ? "bg-brand-500 text-white"
              : "bg-stone-100 text-stone-500 hover:bg-stone-200"
          }`}
        >
          <span>▶▶</span>
          <span>{settings.act_without_asking ? "Acting" : "Act without asking"}</span>
        </button>

        <button
          onClick={onSynthesize}
          disabled={disabled}
          className="text-xs bg-stone-100 hover:bg-stone-200 text-stone-500 rounded-full px-2.5 py-1 transition-colors disabled:opacity-40"
          title="Synthesize data from all open tabs"
        >
          🗂 All tabs
        </button>

        <button
          onClick={onScreenshot}
          disabled={disabled}
          className="text-xs bg-stone-100 hover:bg-stone-200 text-stone-500 rounded-full px-2.5 py-1 transition-colors disabled:opacity-40"
          title="Analyse current tab screenshot"
        >
          📷
        </button>

        <button
          onClick={() => setShowSuggestions((v) => !v)}
          className="ml-auto text-xs text-stone-400 hover:text-stone-600 transition-colors"
          title="Show suggestions"
        >
          {showSuggestions ? "−" : "+"}
        </button>
      </div>

      {/* Text input */}
      <div className="flex items-end gap-2 px-3 py-2">
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="What can I do for you?"
          disabled={disabled}
          rows={1}
          className="flex-1 resize-none rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:opacity-50 max-h-32 overflow-y-auto"
          style={{ minHeight: "38px" }}
          onInput={(e) => {
            const el = e.currentTarget;
            el.style.height = "auto";
            el.style.height = `${Math.min(el.scrollHeight, 128)}px`;
          }}
        />
        <button
          onClick={submit}
          disabled={disabled || !text.trim()}
          className="w-9 h-9 rounded-xl bg-brand-500 text-white flex items-center justify-center hover:bg-brand-600 transition-colors disabled:opacity-40 flex-shrink-0"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 10l7-7m0 0l7 7m-7-7v18" />
          </svg>
        </button>
      </div>
    </div>
  );
}
