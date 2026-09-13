"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import AuthStatus from "./AuthStatus";
import styles from "./cinematic.module.css";

/**
 * NOTE FOR INTEGRATION
 * If `src/app/layout.tsx` already renders a global site header, either
 * remove this component from `page.tsx` or hide the global header on `/`.
 * Two stacked navigations will break the cinematic composition.
 */

const PRIMARY_LINKS = [
  { href: "/", label: "Dashboard" },
  { href: "/deals", label: "Deals" },
  { href: "/giveaways", label: "Giveaways" },
  { href: "/wishlist", label: "Wishlist" },
  { href: "/sentinel", label: "Sentinel" },
  { href: "/security", label: "Security" },
  { href: "/settings", label: "Settings" },
] as const;

export default function CinematicTopNav({ className }: { className?: string }) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const navRef = useRef<HTMLElement>(null);

  const isActiveRoute = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  useEffect(() => {
    if (!menuOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    const onPointerDown = (event: PointerEvent) => {
      if (navRef.current && !navRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };

    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [menuOpen]);

  return (
    <header className={className}>
      <nav ref={navRef} className={styles.nav} aria-label="Primary">
        <Link
          href="/"
          className={isActiveRoute("/") ? `${styles.brand} ${styles.brandActive}` : styles.brand}
          aria-current={isActiveRoute("/") ? "page" : undefined}
        >
          Nexora<span className={styles.brandDot}>.</span>
        </Link>

        <ul className={styles.navLinks}>
          {PRIMARY_LINKS.map((link) => {
            const isActive = isActiveRoute(link.href);

            return (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className={isActive ? `${styles.navLink} ${styles.navLinkActive}` : styles.navLink}
                  aria-current={isActive ? "page" : undefined}
                >
                  {link.label}
                </Link>
              </li>
            );
          })}
        </ul>

        <div className={styles.navActions}>
          <Link href="/deals" className={styles.iconButton} aria-label="Search deals">
            <svg viewBox="0 0 20 20" width="16" height="16" aria-hidden="true" focusable="false">
              <circle
                cx="9"
                cy="9"
                r="5.4"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
              />
              <path
                d="M13.2 13.2 17 17"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          </Link>

          <div className={styles.navAuthStatus}>
            <AuthStatus />
          </div>

          <button
            type="button"
            className={styles.menuButton}
            aria-expanded={menuOpen}
            aria-controls="nexora-compact-menu"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            onClick={() => setMenuOpen((open) => !open)}
          >
            <svg viewBox="0 0 20 20" width="16" height="16" aria-hidden="true" focusable="false">
              <path
                d={menuOpen ? "M5 5l10 10M15 5L5 15" : "M3.5 7h13M3.5 13h13"}
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>

        {menuOpen ? (
          <ul id="nexora-compact-menu" className={styles.menuPanel}>
            {PRIMARY_LINKS.map((link) => {
              const isActive = isActiveRoute(link.href);

              return (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className={isActive ? `${styles.menuLink} ${styles.menuLinkActive}` : styles.menuLink}
                    aria-current={isActive ? "page" : undefined}
                    onClick={() => setMenuOpen(false)}
                  >
                    {link.label}
                  </Link>
                </li>
              );
            })}
            <li className={styles.menuAuthStatus}>
              <AuthStatus />
            </li>
          </ul>
        ) : null}
      </nav>
    </header>
  );
}
