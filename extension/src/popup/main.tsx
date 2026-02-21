import React from "react";
import ReactDOM from "react-dom/client";
import "./popup.css";

function Popup() {
  function openSidePanel() {
    chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
      if (tab?.id) chrome.sidePanel.open({ tabId: tab.id });
      window.close();
    });
  }

  return (
    <div className="p-4 flex flex-col gap-3">
      <div className="flex items-center gap-2 mb-1">
        <div className="w-8 h-8 rounded-lg bg-brand-500 flex items-center justify-center">
          <span className="text-white text-sm font-bold">VP</span>
        </div>
        <div>
          <p className="font-semibold text-stone-800 text-sm leading-none">vpilot</p>
          <p className="text-xs text-stone-400 mt-0.5">AI browser copilot</p>
        </div>
      </div>

      <button
        onClick={openSidePanel}
        className="w-full py-2 rounded-lg bg-brand-500 text-white text-sm font-medium hover:bg-brand-600 transition-colors"
      >
        Open Side Panel
      </button>

      <button
        onClick={() => chrome.runtime.openOptionsPage?.()}
        className="w-full py-2 rounded-lg bg-stone-100 text-stone-600 text-sm hover:bg-stone-200 transition-colors"
      >
        Settings
      </button>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <Popup />
  </React.StrictMode>,
);
