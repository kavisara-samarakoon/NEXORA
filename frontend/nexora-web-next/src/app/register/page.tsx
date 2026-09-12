import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import RegisterForm from "@/components/RegisterForm";
import { productReturnTo } from "@/lib/auth-form";
import { createPageMetadata } from "@/lib/metadata";
import styles from "@/components/AuthProduct.module.css";

export const metadata: Metadata = createPageMetadata({
  title: "Create Account",
  description: "Create a NEXORA account with the basic authentication foundation.",
  path: "/register",
  keywords: ["NEXORA registration", "gaming account"],
});

export default async function RegisterPage({ searchParams }: {
  searchParams: Promise<{ returnTo?: string | string[] }>;
}) {
  const returnTo = productReturnTo((await searchParams).returnTo);

  return (
    <main className={`${styles.scene} auth-page nx-page-reveal`} id="main-content" tabIndex={-1}>
      <div className={styles.atmosphere} aria-hidden="true" />
      <div className={styles.vignette} aria-hidden="true" />

      <section className="auth-panel auth-panel--register" aria-labelledby="register-title">
        <div className="auth-panel__intro">
          <Link className="auth-brand" href="/" aria-label="Return to NEXORA home">
            <Image src="/brand/nexora-logo.png" alt="" width={52} height={52} priority />
            <span><strong>NEXORA</strong><small>Secure Game Hub</small></span>
          </Link>

          <div className="auth-panel__copy">
            <span className="auth-panel__eyebrow"><i aria-hidden="true" /> Player identity</span>
            <h1>Create your account.</h1>
            <p>Start tracking wanted games, target prices, saved alerts, and future Sentinel guidance.</p>
          </div>

          <div className="auth-panel__trust" aria-label="Registration preview notes">
            <span>Personal wishlist</span>
            <span>Price alerts</span>
            <span>Demo-safe controls</span>
          </div>

          <Link className="auth-panel__back" href="/">← Back to home</Link>
        </div>

        <div className="auth-panel__form-card">
          <header>
            <span>New secure profile</span>
            <h2 id="register-title">Create account</h2>
            <p>Choose the credentials you will use to sign in.</p>
          </header>

          <RegisterForm returnTo={returnTo} />

          <p className="auth-panel__note">
            Email verification and password recovery are not available in this demo.
          </p>
        </div>
      </section>
    </main>
  );
}
