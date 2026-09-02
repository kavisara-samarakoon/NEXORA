"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";
import RequestIdSupportText from "@/components/RequestIdSupportText";
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
  type SentinelInsightError,
  type SentinelInsightResponse,
  type SentinelProviderFallbackReason,
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

const fallbackReasonCopy: Record<SentinelProviderFallbackReason, string> = {
  gemini_not_configured: "Gemini is not configured for this local session.",
  gemini_non_success_response: "Gemini returned a non-success response.",
  gemini_invalid_response: "Gemini returned an unusable response.",
  gemini_timeout_or_network: "Gemini could not be reached in time.",
  gemini_configuration_invalid: "The local Gemini configuration is invalid.",
  gemini_unavailable: "Gemini is currently unavailable.",
  unknown: "Gemini could not complete the request.",
};

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

      {response.mode === "local-fallback" && response.fallbackReason && (
        <div className="sn-gateway-response__fallback-reason">
          <strong>Local fallback used</strong>
          <p>{fallbackReasonCopy[response.fallbackReason]} Sentinel returned a local deterministic response instead. This response is transient, and the public static samples remain available.</p>
        </div>
      )}

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
        <span>Transient response — not saved</span>
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
  const [gatewayError, setGatewayError] = useState<Pick<
    SentinelInsightError,
    "code" | "message" | "requestId"
  > | null>(null);
  const [showSignInHint, setShowSignInHint] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [authState, setAuthState] = useState<GatewayAuthState>("checking");
  const composerInputRef = useRef<HTMLInputElement>(null);

  function returnMessageToComposer(message: string) {
    setDraft(message);
    setGatewayError(null);
    window.requestAnimationFrame(() => composerInputRef.current?.focus());
  }

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
        setGatewayError({
          code: details.code,
          message: details.message,
          requestId: details.requestId,
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  const statusLabel = authState === "authenticated"
    ? "Backend gateway ready"
    : authState === "checking"
      ? "Checking session"
      : authState === "unavailable"
        ? "Session check unavailable"
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
          : authState === "unavailable"
            ? "Static samples remain available while the local session route is unavailable"
            : "Sign in with a local backend session to use bounded NEXORA context"}
        <strong>No conversation saved</strong>
      </p>

      <div
        className="sn-chat__messages"
        role="log"
        aria-label="Sentinel conversation preview"
        aria-live="polite"
        aria-relevant="additions text"
      >
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
          <div className="sn-message sn-message--ai">
            <SentinelAvatar />
            <div className="sn-typing" aria-hidden="true"><span /><span /><span /></div>
            <span className="sr-only">Sentinel gateway is preparing a response.</span>
          </div>
        )}

        {gatewayResponse && <GatewayResponseCard response={gatewayResponse} />}

        {showSignInHint && (
          <div
            className={`sn-gateway-state ${authState === "unavailable" ? "sn-gateway-state--unavailable" : "sn-gateway-state--notice"}`}
          >
            <strong>{authState === "unavailable" ? "Session check unavailable" : "Sign in required"}</strong>
            <p>{authState === "unavailable"
              ? "The local authentication route could not be reached. Static samples remain available; the authenticated gateway needs a reachable local backend and session."
              : "This composer needs a local backend session for the authenticated gateway. Static sample messages remain available, and NEXORA will not save this conversation."}</p>
            <Link href="/login">{authState === "unavailable" ? "Open sign in" : "Sign in"}</Link>
          </div>
        )}

        {authState === "unavailable" && !showSignInHint && (
          <div className="sn-gateway-state sn-gateway-state--unavailable">
            <strong>Session check unavailable</strong>
            <p>The local authentication route could not be reached. Static samples remain available; the authenticated gateway needs a reachable local backend and session.</p>
            <Link href="/login">Open sign in</Link>
          </div>
        )}

        {gatewayError && (
          <div className="sn-gateway-state sn-gateway-state--error" role="alert">
            <strong>{gatewayError.code === "rate_limit_exceeded" ? "Request limit reached" : "Gateway unavailable"}</strong>
            <p>{gatewayError.message} {gatewayError.code === "rate_limit_exceeded" ? "Wait briefly, then return the message to the composer and submit it manually." : "Check the local backend and session, then return the message to the composer and submit it manually."} Returning a message does not retry automatically.</p>
            <RequestIdSupportText requestId={gatewayError.requestId} />
            {submittedMessage ? (
              <button
                type="button"
                onClick={() => returnMessageToComposer(submittedMessage)}
              >
                Return message to composer
              </button>
            ) : null}
          </div>
        )}
      </div>

      <div className="sn-suggestions" role="group" aria-label="Quick suggestions">
        {suggestions.map((suggestion) => (
          <button type="button" key={suggestion} onClick={() => returnMessageToComposer(suggestion)}>
            {suggestion}
          </button>
        ))}
      </div>

      <form className="sn-chat__composer" aria-busy={isSubmitting} onSubmit={submitPreview}>
        <span className="sr-only" id="sentinel-composer-help">Choose a context, then enter a message. This preview does not save conversations.</span>
        <label className="sr-only" htmlFor="sentinel-context">Insight context</label>
        <select
          id="sentinel-context"
          aria-describedby="sentinel-composer-help"
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
          ref={composerInputRef}
          type="text"
          maxLength={500}
          placeholder="Ask Sentinel about games, deals, giveaways or account security..."
          value={draft}
          disabled={isSubmitting}
          aria-describedby="sentinel-composer-help"
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
