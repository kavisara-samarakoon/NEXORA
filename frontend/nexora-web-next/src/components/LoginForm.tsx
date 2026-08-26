"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { login, normalizeAuthError, type LoginPayload } from "@/lib/auth";
import { startAuthSession } from "@/lib/auth-client";

export default function LoginForm() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);
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
      setErrorMessage(normalizeAuthError(error).message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form
      className="auth-form"
      aria-busy={isSubmitting}
      aria-describedby={errorMessage ? "login-form-error" : undefined}
      onSubmit={handleSubmit}
      onChange={() => setErrorMessage(null)}
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
        <small className="ux-helper" id="login-identifier-hint">Use the email address or username linked to your local NEXORA account.</small>
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
        {errorMessage ? (
          <div className="auth-form__feedback auth-form__feedback--error" id="login-form-error" role="alert">
            <span aria-hidden="true">!</span>
            <span><strong>Sign-in failed</strong><small>{errorMessage}</small></span>
          </div>
        ) : null}
      </div>

      <button className="auth-form__submit" type="submit" disabled={isSubmitting}>
        {isSubmitting ? <span className="auth-form__spinner" aria-hidden="true" /> : null}
        {isSubmitting ? "Signing in…" : "Sign in"}
      </button>

      <p className="auth-form__switch">
        New to NEXORA? <Link href="/register">Create an account</Link>
      </p>
    </form>
  );
}
