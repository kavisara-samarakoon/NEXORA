"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { login, normalizeAuthError, type LoginPayload } from "@/lib/auth";
import { startAuthSession } from "@/lib/auth-client";
import RequestIdSupportText from "@/components/RequestIdSupportText";

export default function LoginForm() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorDetails, setErrorDetails] = useState<{
    message: string;
    requestId: string | null;
  } | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorDetails(null);
    setIsSubmitting(true);

    const form = event.currentTarget;
    const formData = new FormData(form);
    const payload: LoginPayload = {
      emailOrUsername: String(formData.get("emailOrUsername") || "").trim(),
      password: String(formData.get("password") || ""),
    };

    try {
      const response = await login(payload);
      startAuthSession(response);

      form.reset();
      router.replace("/");
    } catch (error) {
      const details = normalizeAuthError(error);
      setErrorDetails({
        message: details.message,
        requestId: details.requestId,
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form
      className="auth-form"
      aria-busy={isSubmitting}
      aria-describedby={errorDetails ? "login-form-error" : undefined}
      onSubmit={handleSubmit}
      onChange={() => setErrorDetails(null)}
    >
      <div className="auth-form__field">
        <label htmlFor="login-identifier">Email or username</label>
        <input
          id="login-identifier"
          name="emailOrUsername"
          type="text"
          autoComplete="username"
          placeholder="player@example.com"
          aria-describedby="login-identifier-hint"
          maxLength={320}
          required
        />
        <small className="ux-helper" id="login-identifier-hint">Use the identifier linked to your local NEXORA account. Sign-in needs the configured local backend.</small>
      </div>

      <div className="auth-form__field">
        <label htmlFor="login-password">Password</label>
        <input
          id="login-password"
          name="password"
          type="password"
          autoComplete="current-password"
          placeholder="Enter your password"
          maxLength={72}
          required
        />
      </div>

      <div className="auth-form__message">
        {errorDetails ? (
          <div className="auth-form__feedback auth-form__feedback--error" id="login-form-error" role="alert">
            <span aria-hidden="true">!</span>
            <span>
              <strong>Sign-in not completed</strong>
              <small>{errorDetails.message}</small>
              <RequestIdSupportText requestId={errorDetails.requestId} />
            </span>
          </div>
        ) : null}
      </div>

      <button className="auth-form__submit" type="submit" disabled={isSubmitting}>
        {isSubmitting ? <span className="auth-form__spinner" aria-hidden="true" /> : null}
        {isSubmitting ? "Checking local account…" : "Sign in"}
      </button>

      <p className="auth-form__switch">
        New to NEXORA? <Link href="/register">Create an account</Link>
      </p>
    </form>
  );
}
