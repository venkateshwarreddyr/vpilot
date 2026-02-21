import { useState } from "react";
import { saveSettings } from "../../lib/storage";
import { LLMProvider, MODEL_LABELS, MODEL_OPTIONS, UserSettings } from "../../lib/types";

interface Props {
  settings: UserSettings;
  onClose: () => void;
  onSaved: () => void;
}

export function SettingsPanel({ settings, onClose, onSaved }: Props) {
  const [local, setLocal] = useState<UserSettings>({ ...settings });
  const [saved, setSaved] = useState(false);

  function update<K extends keyof UserSettings>(key: K, value: UserSettings[K]) {
    setLocal((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSave() {
    // Reset model if provider changed and current model not in new list
    const models = MODEL_OPTIONS[local.provider];
    if (!models.includes(local.model)) {
      local.model = models[0];
    }
    await saveSettings(local);
    setSaved(true);
    setTimeout(() => { setSaved(false); onSaved(); onClose(); }, 800);
  }

  const providerLabels: Record<LLMProvider, string> = {
    anthropic: "Anthropic (Claude)",
    openai: "OpenAI (GPT)",
    xai: "xAI (Grok)",
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-3 border-b border-stone-200">
        <h2 className="font-semibold text-stone-800">Settings</h2>
        <button onClick={onClose} className="text-stone-400 hover:text-stone-600 text-xl leading-none">×</button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5">
        {/* Provider */}
        <div>
          <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wide mb-1.5">
            LLM Provider
          </label>
          <select
            value={local.provider}
            onChange={(e) => {
              const p = e.target.value as LLMProvider;
              update("provider", p);
              update("model", MODEL_OPTIONS[p][0]);
            }}
            className="w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            {(Object.keys(providerLabels) as LLMProvider[]).map((p) => (
              <option key={p} value={p}>{providerLabels[p]}</option>
            ))}
          </select>
        </div>

        {/* Model */}
        <div>
          <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wide mb-1.5">
            Model
          </label>
          <select
            value={local.model}
            onChange={(e) => update("model", e.target.value)}
            className="w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            {MODEL_OPTIONS[local.provider].map((m) => (
              <option key={m} value={m}>{MODEL_LABELS[m] ?? m}</option>
            ))}
          </select>
        </div>

        {/* API Key */}
        <div>
          <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wide mb-1.5">
            API Key
          </label>
          <input
            type="password"
            value={local.api_key}
            onChange={(e) => update("api_key", e.target.value)}
            placeholder={
              local.provider === "anthropic" ? "sk-ant-..." :
              local.provider === "openai" ? "sk-..." :
              "xai-..."
            }
            className="w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>

        {/* Backend URL */}
        <div>
          <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wide mb-1.5">
            Backend URL
          </label>
          <input
            type="url"
            value={local.backend_url}
            onChange={(e) => update("backend_url", e.target.value)}
            placeholder="http://localhost:7071"
            className="w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
          <p className="text-xs text-stone-400 mt-1">
            Local dev: http://localhost:7071 · Azure: your Function App URL
          </p>
        </div>

        {/* Backend API Key */}
        <div>
          <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wide mb-1.5">
            Backend API Key
          </label>
          <input
            type="password"
            value={local.backend_api_key}
            onChange={(e) => update("backend_api_key", e.target.value)}
            placeholder="dev-key"
            className="w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
      </div>

      <div className="px-4 py-3 border-t border-stone-200">
        <button
          onClick={handleSave}
          className="w-full py-2.5 rounded-xl bg-brand-500 text-white font-semibold text-sm hover:bg-brand-600 transition-colors"
        >
          {saved ? "✓ Saved!" : "Save Settings"}
        </button>
      </div>
    </div>
  );
}
