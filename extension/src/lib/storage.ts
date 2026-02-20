import { DEFAULT_SETTINGS, UserSettings } from "./types";

export async function getSettings(): Promise<UserSettings> {
  const result = await chrome.storage.local.get("settings");
  return { ...DEFAULT_SETTINGS, ...(result.settings ?? {}) };
}

export async function saveSettings(settings: UserSettings): Promise<void> {
  await chrome.storage.local.set({ settings });
}

export async function clearHistory(): Promise<void> {
  await chrome.storage.local.remove("chat_history");
}
