import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import LoginForm from "@/components/LoginForm";
import { productReturnTo } from "@/lib/auth-form";
import { createPageMetadata } from "@/lib/metadata";
import styles from "@/components/AuthProduct.module.css";

export const metadata: Metadata = createPageMetadata({
  title: "Sign In",
  description: "Sign in to your NEXORA account with the basic authentication foundation.",
  path: "/login",
  keywords: ["NEXORA login", "gaming account sign in"],
});

export default async function LoginPage({ searchParams }: {
  searchParams: Promise<{ returnTo?: string | string[] }>;
}) {
  const returnTo = productReturnTo((await searchParams).returnTo);

  return (
    <main className={`${styles.scene} auth-page nx-page-reveal`} id="main-content" tabIndex={-1}>
      <div className={styles.atmosphere} aria-hidden="true" />
      <div className={styles.vignette} aria-hidden="true" />

      <section className="auth-panel" aria-labelledby="login-title">
        <div className="auth-panel__intro">
          <Link className="auth-brand" href="/" aria-label="Return to NEXORA home">
            <Image src="/brand/nexora-logo.png" alt="" width={52} height={52} priority />
            <span><strong>NEXORA</strong><small>Secure Game Hub</small></span>
          </Link>

          <div className="auth-panel__copy">
            <span className="auth-panel__eyebrow"><i aria-hidden="true" /> Account gateway</span>
            <h1>Sign in to NEXORA.</h1>
            <p>Reconnect your wishlist, saved alerts, Sentinel access, and account preferences.</p>
          </div>

          <div className="auth-panel__trust" aria-label="Authentication preview notes">
            <span>Session-aware access</span>
            <span>Wishlist controls</span>
            <span>Sentinel gateway</span>
          </div>

          <Link className="auth-panel__back" href="/">← Back to home</Link>
        </div>

        <div className="auth-panel__form-card">
          <header>
            <span>Protected access</span>
            <h2 id="login-title">Welcome back</h2>
            <p>Use your registered email or username.</p>
          </header>

          <LoginForm returnTo={returnTo} />

          <p className="auth-panel__note">
            You will return to your selected page after signing in. Account features require a reachable backend session.
          </p>
        </div>
      </section>
    </main>
  );
}
