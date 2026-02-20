import { PendingApproval } from "../hooks/useChat";

interface Props {
  approval: PendingApproval;
  onApprove: (approved: boolean) => void;
}

const ACTION_ICONS: Record<string, string> = {
  click: "🖱",
  type: "⌨️",
  scroll: "↕️",
  navigate: "🔗",
  wait: "⏳",
  extract: "📋",
  execute_browser_action: "⚡",
  capture_screenshot: "📷",
  get_all_tabs: "🗂",
  extract_page_content: "📄",
  synthesize_tabs: "🔀",
};

export function ActionApproval({ approval, onApprove }: Props) {
  const { toolCall, step } = approval;
  const icon = ACTION_ICONS[toolCall.name] ?? "🔧";

  return (
    <div className="mx-3 mb-3 rounded-xl border border-amber-200 bg-amber-50 p-3 shadow-sm">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-base">{icon}</span>
        <span className="text-xs font-semibold text-amber-800 uppercase tracking-wide">
          Step {step} — Awaiting approval
        </span>
      </div>
      <p className="text-sm text-stone-700 mb-2 font-medium">{toolCall.name}</p>
      <pre className="text-xs bg-white rounded border border-amber-100 p-2 overflow-auto max-h-24 text-stone-600">
        {JSON.stringify(toolCall.input, null, 2)}
      </pre>
      <div className="flex gap-2 mt-3">
        <button
          onClick={() => onApprove(true)}
          className="flex-1 py-1.5 rounded-lg bg-brand-500 text-white text-sm font-medium hover:bg-brand-600 transition-colors"
        >
          Approve
        </button>
        <button
          onClick={() => onApprove(false)}
          className="flex-1 py-1.5 rounded-lg bg-stone-200 text-stone-700 text-sm font-medium hover:bg-stone-300 transition-colors"
        >
          Reject
        </button>
      </div>
    </div>
  );
}
