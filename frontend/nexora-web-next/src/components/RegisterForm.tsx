"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { normalizeAuthError, register, type RegisterPayload } from "@/lib/auth";
import { startAuthSession } from "@/lib/auth-client";

export default function RegisterForm() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);
    setIsSubmitting(true);

    const form = event.currentTarget;
    const formData = new FormData(form);
    const payload: RegisterPayload = {
      email: String(formData.get("email") || "").trim(),
      username: String(formData.get("username") || "").trim(),
      displayName: String(formData.get("displayName") || "").trim(),
      password: String(formData.get("password") || ""),
    };

    try {
      const response = await register(payload);
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
    <form className="auth-form" onSubmit={handleSubmit} onChange={() => setErrorMessage(null)}>
      <div className="auth-form__grid">
        <div className="auth-form__field">
          <label htmlFor="register-display-name">Display name</label>
          <input
            id="register-display-name"
            name="displayName"
            type="text"
            autoComplete="name"
            placeholder="Player One"
            maxLength={100}
            required
          />
        </div>

        <div className="auth-form__field">
          <label htmlFor="register-username">Username</label>
          <input
            id="register-username"
            name="username"
            type="text"
            autoComplete="username"
            placeholder="player_one"
            minLength={3}
            maxLength={50}
            required
          />
        </div>
      </div>

      <div className="auth-form__field">
        <label htmlFor="register-email">Email</label>
        <input
          id="register-email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="player@example.com"
          maxLength={320}
          required
        />
      </div>

      <div className="auth-form__field">
        <label htmlFor="register-password">Password</label>
        <input
          id="register-password"
          name="password"
          type="password"
          autoComplete="new-password"
          placeholder="At least 8 characters"
          minLength={8}
          maxLength={72}
          aria-describedby="register-password-hint"
          required
        />
        <small id="register-password-hint">Use 8–72 characters. Your password is sent only to the authentication API.</small>
      </div>

      <div className="auth-form__message" aria-live="polite">
        {errorMessage ? <p role="alert">{errorMessage}</p> : null}
      </div>

      <button className="auth-form__submit" type="submit" disabled={isSubmitting}>
        {isSubmitting ? <span className="auth-form__spinner" aria-hidden="true" /> : null}
        {isSubmitting ? "Creating account…" : "Create account"}
      </button>

      <p className="auth-form__switch">
        Already have an account? <Link href="/login">Sign in</Link>
      </p>
    </form>
  );
}
