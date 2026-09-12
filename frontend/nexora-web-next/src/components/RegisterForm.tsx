"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { normalizeAuthError, register, type RegisterPayload } from "@/lib/auth";
import { startAuthSession } from "@/lib/auth-client";
import AuthPasswordField from "@/components/AuthPasswordField";
import { authFieldError } from "@/lib/auth-form";
import styles from "./ProductFeedback.module.css";
import RequestIdSupportText from "@/components/RequestIdSupportText";

export default function RegisterForm({ returnTo }: { returnTo: string }) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorDetails, setErrorDetails] = useState<{
    message: string;
    requestId: string | null;
  } | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorDetails(null);

    if (isSubmitting) return;
    const form = event.currentTarget;
    for (const input of Array.from(form.querySelectorAll("input"))) {
      input.setCustomValidity(authFieldError(input.name, input.value, "register"));
    }
    if (!form.reportValidity()) return;
    setIsSubmitting(true);
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
      router.replace(returnTo);
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
      className={`auth-form ${styles.form}`}
      aria-busy={isSubmitting}
      aria-describedby={errorDetails ? "register-form-error" : undefined}
      onSubmit={handleSubmit}
      onChange={(event) => {
        setErrorDetails(null);
        if (event.target instanceof HTMLInputElement) event.target.setCustomValidity("");
      }}
    >
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
            aria-describedby="register-username-hint"
            required
          />
          <small className="ux-helper" id="register-username-hint">Use 3–50 characters, excluding spaces at the start or end.</small>
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

      <AuthPasswordField mode="register" />

      <div className="auth-form__message">
        {errorDetails ? (
          <div className="auth-form__feedback auth-form__feedback--error" id="register-form-error" role="alert">
            <span aria-hidden="true">!</span>
            <span>
              <strong>Account not created</strong>
              <small>{errorDetails.message}</small>
              <RequestIdSupportText requestId={errorDetails.requestId} />
            </span>
          </div>
        ) : null}
      </div>

      <button className="auth-form__submit" type="submit" disabled={isSubmitting}>
        {isSubmitting ? <span className="auth-form__spinner" aria-hidden="true" /> : null}
        {isSubmitting ? "Creating account…" : "Create account"}
      </button>

      <p className="auth-form__switch">
        Already have an account? <Link href={`/login?returnTo=${encodeURIComponent(returnTo)}`}>Sign in</Link>
      </p>
    </form>
  );
}
