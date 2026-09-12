import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import RegisterForm from "@/components/RegisterForm";
import { productReturnTo } from "@/lib/auth-form";
import { createPageMetadata } from "@/lib/metadata";

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
    <main className="auth-page nx-page-reveal" id="main-content" tabIndex={-1}>
      <div className="auth-page__orb auth-page__orb--orange" aria-hidden="true" />
      <div className="auth-page__orb auth-page__orb--blue" aria-hidden="true" />

      <section className="auth-panel auth-panel--register" aria-labelledby="register-title">
        <div className="auth-panel__intro">
          <Link className="auth-brand" href="/" aria-label="Return to NEXORA dashboard">
            <Image src="/brand/nexora-logo.png" alt="" width={48} height={48} priority />
            <span><strong>NEXORA</strong><small>Game Hub</small></span>
          </Link>
          <div>
            <span className="auth-panel__eyebrow"><i aria-hidden="true" /> Your NEXORA account</span>
            <h1>Build your player identity.</h1>
            <p>Save games to your wishlist and choose the prices you want to track.</p>
          </div>
          <Link className="auth-panel__back" href="/">← Back to dashboard</Link>
        </div>

        <div className="auth-panel__form-card">
          <header>
            <span>New player profile</span>
            <h2 id="register-title">Create account</h2>
            <p>Choose the credentials you will use to sign in.</p>
          </header>
          <RegisterForm returnTo={returnTo} />
          <p className="auth-panel__note">Create an account to manage your personal wishlist. Email verification and password recovery are not available in this demo.</p>
        </div>
      </section>
    </main>
  );
}
