import { defineManifest } from "@crxjs/vite-plugin";

export default defineManifest({
  manifest_version: 3,
  name: "vpilot",
  version: "1.0.0",
  description: "AI browser copilot powered by Claude, GPT-4, or xAI Grok",
  permissions: [
    "tabs",
    "activeTab",
    "scripting",
    "storage",
    "sidePanel",
    "contextMenus",
    "alarms",
  ],
  host_permissions: ["<all_urls>"],
  background: {
    service_worker: "src/background/service-worker.ts",
    type: "module",
  },
  side_panel: {
    default_path: "src/side-panel/index.html",
  },
  action: {
    default_popup: "src/popup/index.html",
    default_icon: {
      "16": "icons/icon16.png",
      "48": "icons/icon48.png",
      "128": "icons/icon128.png",
    },
  },
  content_scripts: [
    {
      matches: ["<all_urls>"],
      js: ["src/content/extractor.ts", "src/content/actor.ts"],
      run_at: "document_idle",
    },
  ],
  icons: {
    "16": "icons/icon16.png",
    "48": "icons/icon48.png",
    "128": "icons/icon128.png",
  },
});
