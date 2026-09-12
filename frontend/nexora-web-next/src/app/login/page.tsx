import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import LoginForm from "@/components/LoginForm";
import { productReturnTo } from "@/lib/auth-form";
import { createPageMetadata } from "@/lib/metadata";

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
    <main className="auth-page nx-page-reveal" id="main-content" tabIndex={-1}>
      <div className="auth-page__orb auth-page__orb--orange" aria-hidden="true" />
      <div className="auth-page__orb auth-page__orb--blue" aria-hidden="true" />

      <section className="auth-panel" aria-labelledby="login-title">
        <div className="auth-panel__intro">
          <Link className="auth-brand" href="/" aria-label="Return to NEXORA dashboard">
            <Image src="/brand/nexora-logo.png" alt="" width={48} height={48} priority />
            <span><strong>NEXORA</strong><small>Game Hub</small></span>
          </Link>
          <div>
            <span className="auth-panel__eyebrow"><i aria-hidden="true" /> Your NEXORA account</span>
            <h1>Welcome back to your command center.</h1>
            <p>Sign in with your email or username to reconnect your NEXORA account.</p>
          </div>
          <Link className="auth-panel__back" href="/">← Back to dashboard</Link>
        </div>

        <div className="auth-panel__form-card">
          <header>
            <span>Secure access</span>
            <h2 id="login-title">Sign in</h2>
            <p>Use the credentials registered with NEXORA.</p>
          </header>
          <LoginForm returnTo={returnTo} />
          <p className="auth-panel__note">Sign in to save games, manage your wishlist, and use Sentinel. You’ll return to your selected page after signing in.</p>
        </div>
      </section>
    </main>
  );
}
