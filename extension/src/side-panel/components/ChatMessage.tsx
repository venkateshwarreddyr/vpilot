import ReactMarkdown from "react-markdown";
import { ChatEntry } from "../hooks/useChat";

interface Props {
  entry: ChatEntry;
}

export function ChatMessage({ entry }: Props) {
  if (entry.role === "system") {
    return (
      <div className="flex justify-center my-1">
        <span className="text-xs text-stone-400 bg-stone-100 rounded px-2 py-0.5">
          {entry.content}
        </span>
      </div>
    );
  }

  const isUser = entry.role === "user";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} mb-3`}>
      {!isUser && (
        <div className="w-6 h-6 rounded-full bg-brand-500 flex items-center justify-center mr-2 mt-0.5 flex-shrink-0">
          <span className="text-white text-xs font-bold">V</span>
        </div>
      )}
      <div
        className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
          isUser
            ? "bg-brand-500 text-white rounded-br-sm"
            : "bg-white border border-stone-200 text-stone-800 rounded-bl-sm shadow-sm"
        }`}
      >
        {isUser ? (
          <p>{entry.content}</p>
        ) : (
          <div className="prose-chat">
            <ReactMarkdown>{entry.content}</ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  );
}
