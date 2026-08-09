"use client";

import { useState, type FormEvent } from "react";
import { sentinelMessages, sentinelSuggestions } from "@/data/sentinel";

function SentinelAvatar() {
  return (
    <span className="sn-avatar" aria-hidden="true">
      <svg viewBox="0 0 24 24">
        <path d="M12 3 5 7v5c0 4 2.7 7.1 7 9 4.3-1.9 7-5 7-9V7z" />
        <path d="M9 12h.01M15 12h.01M10 16h4" />
      </svg>
    </span>
  );
}

export default function SentinelChat() {
  const [draft, setDraft] = useState("");
  const [previewMessage, setPreviewMessage] = useState<string | null>(null);

  function submitPreview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const message = draft.trim();
    if (!message) return;
    setPreviewMessage(message);
    setDraft("");
  }

  return (
    <section className="sn-chat" aria-labelledby="sentinel-chat-title">
      <div className="sn-chat__header">
        <div className="sn-chat__identity">
          <SentinelAvatar />
          <div>
            <h2 id="sentinel-chat-title">Sentinel AI</h2>
            <span><span aria-hidden="true" /> Demo mode</span>
          </div>
        </div>
        <span className="sn-chat__preview-badge">Static preview</span>
      </div>

      <div className="sn-chat__messages" aria-live="polite">
        {sentinelMessages.map((message) => (
          <div className={`sn-message sn-message--${message.role}`} key={message.id}>
            {message.role === "ai" && <SentinelAvatar />}
            <p>
              {message.segments.map((segment, index) =>
                "emphasis" in segment && segment.emphasis ? (
                  <strong key={`${message.id}-${index}`}>{segment.text}</strong>
                ) : (
                  <span key={`${message.id}-${index}`}>{segment.text}</span>
                ),
              )}
            </p>
          </div>
        ))}

        {previewMessage && (
          <div className="sn-message sn-message--user sn-message--preview">
            <p>{previewMessage}</p>
          </div>
        )}

        <div className="sn-message sn-message--ai" aria-label="Sentinel is typing">
          <SentinelAvatar />
          <div className="sn-typing" aria-hidden="true"><span /><span /><span /></div>
        </div>
      </div>

      <div className="sn-suggestions" aria-label="Quick suggestions">
        {sentinelSuggestions.map((suggestion) => (
          <button type="button" key={suggestion} onClick={() => setDraft(suggestion)}>
            {suggestion}
          </button>
        ))}
      </div>

      <form className="sn-chat__composer" onSubmit={submitPreview}>
        <label className="sr-only" htmlFor="sentinel-message">Message Sentinel</label>
        <input
          id="sentinel-message"
          type="text"
          placeholder="Ask Sentinel about games, deals, giveaways or account security..."
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
        />
        <button type="submit" aria-label="Send message preview" disabled={!draft.trim()}>
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m4 4 17 8-17 8 4-8zM8 12h13" /></svg>
        </button>
      </form>
    </section>
  );
}
