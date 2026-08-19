"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { login, normalizeAuthError, type LoginPayload } from "@/lib/auth";
import { saveAuthToken } from "@/lib/auth-client";

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
      if (!saveAuthToken(response.token)) {
        setErrorMessage("Your browser blocked local authentication storage. Enable local storage and try again.");
        return;
      }

      form.reset();
      router.replace("/");
    } catch (error) {
      setErrorMessage(normalizeAuthError(error).message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="auth-form" onSubmit={handleSubmit} onChange={() => setErrorMessage(null)}>
      <div className="auth-form__field">
        <label htmlFor="login-identifier">Email or username</label>
        <input
          id="login-identifier"
          name="emailOrUsername"
          type="text"
          autoComplete="username"
          placeholder="player@example.com"
          maxLength={320}
          required
        />
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

      <div className="auth-form__message" aria-live="polite">
        {errorMessage ? <p role="alert">{errorMessage}</p> : null}
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
