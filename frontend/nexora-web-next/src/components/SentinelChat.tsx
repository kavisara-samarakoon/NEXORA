"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import RequestIdSupportText from "@/components/RequestIdSupportText";
import type { ChatMessage } from "@/data/sentinel";
import {
  AUTH_STATE_EVENT,
  clearAuthToken,
  ensureAuthToken,
  isAuthSessionInvalidatedError,
  readAuthSessionRevision,
  readAuthToken,
} from "@/lib/auth-client";
import { createSentinelRequestGuard } from "@/lib/sentinel-request-guard";
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
  gemini_not_configured: "External AI is not configured for this local session.",
  gemini_non_success_response: "The external provider returned a non-success response.",
  gemini_invalid_response: "The external provider returned an unusable response.",
  gemini_timeout_or_network: "The external provider could not be reached in time.",
  gemini_configuration_invalid: "The external provider configuration is invalid.",
  gemini_unavailable: "The external provider is currently unavailable.",
  unknown: "The external provider could not complete the request.",
};

function MessageSegments({ message }: { message: ChatMessage }) {
  return (
    <>
      {message.segments.map((segment, index) =>
        "emphasis" in segment && segment.emphasis ? (
          <strong key={`${message.id}-${index}`}>{segment.text}</strong>
        ) : (
          <span key={`${message.id}-${index}`}>{segment.text}</span>
        ),
      )}
    </>
  );
}

function SentinelWelcomeMessage({ authenticated }: { authenticated: boolean }) {
  return (
    <div className="sn-message sn-message--ai sn-message--welcome">
      <SentinelAvatar />
      <div className="sn-message__body">
        <strong>How can I help with your games today?</strong>
        <p>
          Ask Sentinel to find deals, compare prices, explain wishlist alerts, or review gaming-account safety.
          {authenticated
            ? " Your signed-in session can use bounded NEXORA context."
            : " Sign in to use account-aware answers."}
        </p>
      </div>
    </div>
  );
}

function GatewayResponseCard({ response }: { response: SentinelInsightResponse }) {
  const providerLabel = response.provider === "gemini"
    ? "External AI"
    : response.mode === "local-fallback"
      ? "Local fallback"
      : "Local AI";

  const badgeClass = response.provider === "gemini"
    ? "sn-gateway-response__badge sn-gateway-response__badge--gemini"
    : response.mode === "local-fallback"
      ? "sn-gateway-response__badge sn-gateway-response__badge--fallback"
      : "sn-gateway-response__badge";

  const recommendations = response.recommendations.slice(0, 3);
  const nextActions = response.nextActions.slice(0, 3);

  return (
    <div className="sn-message sn-message--ai sn-message--gateway">
      <SentinelAvatar />
      <div className="sn-message__body">
        <header className="sn-gateway-response__compact-header">
          <div>
            <span className="sn-gateway-response__kicker">{response.context} insight</span>
            <h3>{response.title}</h3>
          </div>
          <span className={badgeClass}>{providerLabel}</span>
        </header>

        <p className="sn-gateway-response__answer">{response.answer}</p>

        {recommendations.length > 0 ? (
          <div className="sn-gateway-response__chips" aria-label="Top recommendations">
            {recommendations.map((item) => (
              <span key={item}>{item}</span>
            ))}
          </div>
        ) : null}

        {nextActions.length > 0 ? (
          <div className="sn-gateway-response__actions" aria-label="Suggested next actions">
            {nextActions.map((item) => (
              <span key={item}>{item}</span>
            ))}
          </div>
        ) : null}

        {response.mode === "local-fallback" && response.fallbackReason ? (
          <p className="sn-gateway-response__fallback-reason">
            {fallbackReasonCopy[response.fallbackReason]} Sentinel answered with the local deterministic model instead.
          </p>
        ) : null}

        <details className="sn-gateway-response__details">
          <summary>View safety notes</summary>
          <ul>
            {response.safetyNotes.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </details>

        <footer>
          <span>{response.context} context</span>
          <span>No conversation saved</span>
        </footer>
      </div>
    </div>
  );
}

export default function SentinelChat({
  messages,
  suggestions,
}: {
  messages: readonly ChatMessage[];
  suggestions: readonly string[];
}) {
  const renderSessionRevision = readAuthSessionRevision();
  const requestLifetime = useRef<object | null>(null);
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
  const [sessionRetryKey, setSessionRetryKey] = useState(0);
  const [authState, setAuthState] = useState<GatewayAuthState>("checking");
  const composerInputRef = useRef<HTMLInputElement>(null);
  const requestGuardRef = useRef(createSentinelRequestGuard());
  const authSessionRevisionRef = useRef(readAuthSessionRevision());

  const clearPrivateConversation = useCallback(() => {
    requestGuardRef.current.invalidate();
    setDraft("");
    setContext("general");
    setSubmittedMessage(null);
    setGatewayResponse(null);
    setGatewayError(null);
    setShowSignInHint(false);
    setIsSubmitting(false);
  }, []);

  function returnMessageToComposer(message: string) {
    if (!requestLifetime.current || renderSessionRevision !== readAuthSessionRevision()) return;
    setDraft(message);
    setGatewayError(null);
    window.requestAnimationFrame(() => composerInputRef.current?.focus());
  }

  useEffect(() => {
    let active = true;
    const requestGuard = requestGuardRef.current;
    requestLifetime.current = {};

    async function refreshAuthentication() {
      const revisionAtStart = readAuthSessionRevision();
      setAuthState("checking");
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
        if (!active || readAuthSessionRevision() !== revisionAtStart) return;
        setAuthToken(token);
        setAuthState(token ? "authenticated" : "anonymous");
      } catch {
        if (!active || readAuthSessionRevision() !== revisionAtStart) return;
        setAuthToken(null);
        setAuthState("unavailable");
      }
    }

    function handleAuthChange() {
      const revision = readAuthSessionRevision();
      if (revision !== authSessionRevisionRef.current) {
        authSessionRevisionRef.current = revision;
        clearPrivateConversation();
        if (!readAuthToken()) setShowSignInHint(true);
      }
      void refreshAuthentication();
    }

    void refreshAuthentication();
    window.addEventListener(AUTH_STATE_EVENT, handleAuthChange);
    return () => {
      active = false;
      requestLifetime.current = null;
      requestGuard.invalidate();
      window.removeEventListener(AUTH_STATE_EVENT, handleAuthChange);
    };
  }, [clearPrivateConversation, sessionRetryKey]);

  async function submitPreview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const lifetime = requestLifetime.current;
    if (!lifetime || renderSessionRevision !== readAuthSessionRevision()
      || renderSessionRevision !== authSessionRevisionRef.current) return;
    const message = draft.trim();
    if (!message || isSubmitting || authState === "checking") return;
    const requestGuard = requestGuardRef.current;
    const requestVersion = requestGuard.begin();
    const isCurrent = () => requestLifetime.current === lifetime && requestGuard.isCurrent(requestVersion)
      && renderSessionRevision === readAuthSessionRevision();

    setSubmittedMessage(message);
    setGatewayResponse(null);
    setGatewayError(null);
    setShowSignInHint(false);

    if (!authToken) {
      setShowSignInHint(true);
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await withSentinelAuthRetry(
        authToken,
        (activeToken) => requestSentinelInsight(activeToken, { message, context }),
        { sessionRevision: renderSessionRevision, isCurrent },
      );
      if (!isCurrent()) return;
      setAuthToken(result.token);
      setAuthState("authenticated");
      setGatewayResponse(result.value);
      setDraft("");
    } catch (error) {
      if (!isCurrent() || isAuthSessionInvalidatedError(error)) return;
      const details = normalizeSentinelInsightError(error);
      if (details.status === 401) {
        clearAuthToken();
        clearPrivateConversation();
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
      if (isCurrent()) {
        setIsSubmitting(false);
      }
    }
  }

  const statusLabel = authState === "authenticated"
    ? "Assistant ready"
    : authState === "checking"
      ? "Checking session"
      : authState === "unavailable"
        ? "Session unavailable"
        : "Sign in for live assistant";

  const badgeLabel = authState === "authenticated"
    ? "Live session"
    : authState === "checking"
      ? "Checking"
      : authState === "unavailable"
        ? "Offline"
        : "Guest mode";

  const showWelcome = messages.length === 0 &&
    !submittedMessage &&
    !gatewayResponse &&
    !gatewayError &&
    !showSignInHint &&
    !isSubmitting;

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
        <span className="sn-chat__preview-badge">{badgeLabel}</span>
      </div>

      <p className="sn-chat__context-note">
        <span aria-hidden="true">◇</span>
        {authState === "authenticated"
          ? "Uses bounded, backend-generated NEXORA context for this signed-in session."
          : authState === "unavailable"
            ? "The local session route is unavailable. You can still review the assistant interface."
            : "Sign in to use account-aware Sentinel answers for deals, wishlist, and security."}
        <strong>No chat history saved</strong>
      </p>

      {authState === "unavailable" ? (
        <button className="ux-state__action" type="button" onClick={() => setSessionRetryKey((value) => value + 1)}>
          Retry session check
        </button>
      ) : null}

      <div
        className="sn-chat__messages"
        role="log"
        aria-label="Sentinel chat"
        aria-live="polite"
        aria-relevant="additions text"
      >
        {showWelcome ? <SentinelWelcomeMessage authenticated={authState === "authenticated"} /> : null}

        {messages.map((message) => (
          <div className={`sn-message sn-message--${message.role}`} key={message.id}>
            {message.role === "ai" ? <SentinelAvatar /> : null}
            <div className="sn-message__body">
              <p><MessageSegments message={message} /></p>
            </div>
          </div>
        ))}

        {submittedMessage ? (
          <div className="sn-message sn-message--user sn-message--preview">
            <div className="sn-message__body">
              <p>{submittedMessage}</p>
            </div>
          </div>
        ) : null}

        {isSubmitting ? (
          <div className="sn-message sn-message--ai">
            <SentinelAvatar />
            <div className="sn-message__body sn-message__body--typing">
              <div className="sn-typing" aria-hidden="true"><span /><span /><span /></div>
              <span className="sr-only">Sentinel is preparing a response.</span>
            </div>
          </div>
        ) : null}

        {gatewayResponse ? <GatewayResponseCard response={gatewayResponse} /> : null}

        {showSignInHint ? (
          <div
            className={`sn-gateway-state ${authState === "unavailable" ? "sn-gateway-state--unavailable" : "sn-gateway-state--notice"}`}
          >
            <strong>{authState === "unavailable" ? "Session unavailable" : "Sign in required"}</strong>
            <p>{authState === "unavailable"
              ? "The local authentication route could not be reached. Start the backend and sign in to use account-aware Sentinel responses."
              : "Sign in to use backend-generated Sentinel answers for your wishlist, deals, and account context."}</p>
            <Link href="/login?returnTo=%2Fsentinel">{authState === "unavailable" ? "Open sign in" : "Sign in"}</Link>
          </div>
        ) : null}

        {authState === "unavailable" && !showSignInHint ? (
          <div className="sn-gateway-state sn-gateway-state--unavailable">
            <strong>Session unavailable</strong>
            <p>The local authentication route could not be reached. Start the backend and sign in to use account-aware Sentinel responses.</p>
            <Link href="/login?returnTo=%2Fsentinel">Open sign in</Link>
          </div>
        ) : null}

        {gatewayError ? (
          <div className="sn-gateway-state sn-gateway-state--error" role="alert">
            <strong>{gatewayError.code === "rate_limit_exceeded" ? "Request limit reached" : "Sentinel unavailable"}</strong>
            <p>{gatewayError.message} {gatewayError.code === "rate_limit_exceeded" ? "Wait briefly, then return the message to the composer and submit it manually." : "Check the local backend and session, then return the message to the composer and submit it manually."}</p>
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
        ) : null}
      </div>

      <div className="sn-suggestions" role="group" aria-label="Try asking Sentinel">
        {suggestions.map((suggestion) => (
          <button type="button" key={suggestion} onClick={() => returnMessageToComposer(suggestion)}>
            {suggestion}
          </button>
        ))}
      </div>

      <form className="sn-chat__composer" aria-busy={isSubmitting} onSubmit={submitPreview}>
        <span className="sr-only" id="sentinel-composer-help">Choose a context, then ask Sentinel a question. This demo does not save chat history.</span>
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
          placeholder="Ask about deals, prices, wishlist alerts, or account safety..."
          value={draft}
          disabled={isSubmitting}
          aria-describedby="sentinel-composer-help"
          onChange={(event) => setDraft(event.target.value)}
        />
        <button
          type="submit"
          aria-label="Send message to Sentinel"
          disabled={!draft.trim() || isSubmitting || authState === "checking"}
        >
          <span aria-hidden="true">↗</span>
        </button>
      </form>
    </section>
  );
}
