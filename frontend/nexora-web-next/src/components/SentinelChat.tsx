"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import type { ChatMessage } from "@/data/sentinel";
import {
  AUTH_STATE_EVENT,
  clearAuthToken,
  ensureAuthToken,
  readAuthToken,
} from "@/lib/auth-client";
import {
  normalizeSentinelInsightError,
  requestSentinelInsight,
  withSentinelAuthRetry,
  type SentinelInsightContext,
  type SentinelInsightResponse,
} from "@/lib/user-sentinel";

type GatewayAuthState = "checking" | "authenticated" | "anonymous" | "unavailable";

const gatewayContexts = [
  { value: "general", label: "General" },
  { value: "wishlist", label: "Wishlist" },
  { value: "deals", label: "Deals" },
  { value: "security", label: "Security" },
] as const satisfies readonly { value: SentinelInsightContext; label: string }[];

function SentinelAvatar() {
  return (
    <span className="sn-avatar" aria-hidden="true">
      🤖
    </span>
  );
}

function GatewayResponseCard({ response }: { response: SentinelInsightResponse }) {
  const providerLabel = response.provider === "gemini"
    ? "Gemini provider"
    : response.mode === "local-fallback"
      ? "Local fallback"
      : "Local provider";
  const badgeClass = response.provider === "gemini"
    ? "sn-gateway-response__badge sn-gateway-response__badge--gemini"
    : response.mode === "local-fallback"
      ? "sn-gateway-response__badge sn-gateway-response__badge--fallback"
      : "sn-gateway-response__badge";

  return (
    <article className="sn-gateway-response">
      <header>
        <div>
          <span>{response.mode === "gemini-provider-foundation"
            ? "Gemini Provider Foundation"
            : "AI Gateway Foundation"}</span>
          <h3>{response.title}</h3>
        </div>
        <span className={badgeClass}>{providerLabel}</span>
      </header>

      <p className="sn-gateway-response__answer">{response.answer}</p>

      <div className="sn-gateway-response__sections">
        <section>
          <h4>Recommendations</h4>
          <ul>{response.recommendations.map((item) => <li key={item}>{item}</li>)}</ul>
        </section>
        <section className="sn-gateway-response__safety">
          <h4>Safety notes</h4>
          <ul>{response.safetyNotes.map((item) => <li key={item}>{item}</li>)}</ul>
        </section>
        <section>
          <h4>Next actions</h4>
          <ul>{response.nextActions.map((item) => <li key={item}>{item}</li>)}</ul>
        </section>
      </div>

      <footer>
        <span>{response.context} context</span>
        <time dateTime={response.createdAt}>Transient response — not saved</time>
      </footer>
    </article>
  );
}

export default function SentinelChat({
  messages,
  suggestions,
}: {
  messages: readonly ChatMessage[];
  suggestions: readonly string[];
}) {
  const [draft, setDraft] = useState("");
  const [context, setContext] = useState<SentinelInsightContext>("general");
  const [submittedMessage, setSubmittedMessage] = useState<string | null>(null);
  const [gatewayResponse, setGatewayResponse] = useState<SentinelInsightResponse | null>(null);
  const [gatewayError, setGatewayError] = useState<string | null>(null);
  const [showSignInHint, setShowSignInHint] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [authState, setAuthState] = useState<GatewayAuthState>("checking");

  useEffect(() => {
    let active = true;

    async function refreshAuthentication() {
      const memoryToken = readAuthToken();
      if (memoryToken) {
        if (active) {
          setAuthToken(memoryToken);
          setAuthState("authenticated");
        }
        return;
      }

      try {
        const token = await ensureAuthToken();
        if (!active) return;
        setAuthToken(token);
        setAuthState(token ? "authenticated" : "anonymous");
      } catch {
        if (!active) return;
        setAuthToken(null);
        setAuthState("unavailable");
      }
    }

    function handleAuthChange() {
      void refreshAuthentication();
    }

    void refreshAuthentication();
    window.addEventListener(AUTH_STATE_EVENT, handleAuthChange);
    return () => {
      active = false;
      window.removeEventListener(AUTH_STATE_EVENT, handleAuthChange);
    };
  }, []);

  async function submitPreview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const message = draft.trim();
    if (!message || isSubmitting) return;

    setSubmittedMessage(message);
    setGatewayResponse(null);
    setGatewayError(null);
    setShowSignInHint(false);
    setDraft("");

    if (!authToken) {
      setShowSignInHint(true);
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await withSentinelAuthRetry(
        authToken,
        (activeToken) => requestSentinelInsight(activeToken, { message, context }),
      );
      setAuthToken(result.token);
      setAuthState("authenticated");
      setGatewayResponse(result.value);
    } catch (error) {
      const details = normalizeSentinelInsightError(error);
      if (details.status === 401) {
        clearAuthToken();
        setAuthToken(null);
        setAuthState("anonymous");
        setShowSignInHint(true);
      } else {
        setGatewayError(details.message);
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  const statusLabel = authState === "authenticated"
    ? "Backend gateway ready"
    : authState === "checking"
      ? "Checking session"
      : "Static preview";

  return (
    <section className="sn-chat" aria-labelledby="sentinel-chat-title">
      <div className="sn-chat__header">
        <div className="sn-chat__identity">
          <SentinelAvatar />
          <div>
            <h2 id="sentinel-chat-title">Sentinel AI</h2>
            <span><span aria-hidden="true" /> {statusLabel}</span>
          </div>
        </div>
        <span className="sn-chat__preview-badge">
          {authState === "authenticated" ? "Provider routed" : "Static preview"}
        </span>
      </div>

      <p className="sn-chat__context-note">
        <span aria-hidden="true">◇</span>
        {authState === "authenticated"
          ? "Uses bounded, backend-generated NEXORA context"
          : "Sign in to use bounded NEXORA context"}
        <strong>No conversation saved</strong>
      </p>

      <div className="sn-chat__messages" aria-live="polite">
        {messages.map((message) => (
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

        {submittedMessage && (
          <div className="sn-message sn-message--user sn-message--preview">
            <p>{submittedMessage}</p>
          </div>
        )}

        {isSubmitting && (
          <div className="sn-message sn-message--ai" aria-label="Local gateway is preparing a response">
            <SentinelAvatar />
            <div className="sn-typing" aria-hidden="true"><span /><span /><span /></div>
          </div>
        )}

        {gatewayResponse && <GatewayResponseCard response={gatewayResponse} />}

        {showSignInHint && (
          <div className="sn-gateway-state sn-gateway-state--notice" role="status">
            <strong>Authenticated gateway preview</strong>
            <p>Sign in to send this message to the local backend foundation.</p>
            <Link href="/login">Sign in</Link>
          </div>
        )}

        {gatewayError && (
          <div className="sn-gateway-state sn-gateway-state--error" role="alert">
            <strong>Gateway unavailable</strong>
            <p>{gatewayError}</p>
          </div>
        )}
      </div>

      <div className="sn-suggestions" aria-label="Quick suggestions">
        {suggestions.map((suggestion) => (
          <button type="button" key={suggestion} onClick={() => setDraft(suggestion)}>
            {suggestion}
          </button>
        ))}
      </div>

      <form className="sn-chat__composer" onSubmit={submitPreview}>
        <label className="sr-only" htmlFor="sentinel-context">Insight context</label>
        <select
          id="sentinel-context"
          value={context}
          disabled={isSubmitting}
          onChange={(event) => setContext(event.target.value as SentinelInsightContext)}
        >
          {gatewayContexts.map((option) => (
            <option value={option.value} key={option.value}>{option.label}</option>
          ))}
        </select>
        <label className="sr-only" htmlFor="sentinel-message">Message Sentinel</label>
        <input
          id="sentinel-message"
          type="text"
          maxLength={500}
          placeholder="Ask Sentinel about games, deals, giveaways or account security..."
          value={draft}
          disabled={isSubmitting}
          onChange={(event) => setDraft(event.target.value)}
        />
        <button
          type="submit"
          aria-label="Send message to Sentinel gateway preview"
          disabled={!draft.trim() || isSubmitting}
        >
          <span aria-hidden="true">↗</span>
        </button>
      </form>
    </section>
  );
}
