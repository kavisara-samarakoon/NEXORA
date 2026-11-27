"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import AuthStatus from "./AuthStatus";
import CinematicSceneControls from "./CinematicSceneControls";
import styles from "./cinematic.module.css";

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
  const [openPath, setOpenPath] = useState<string | null>(null);
  const menuOpen = openPath !== null && openPath === pathname;
  if (openPath !== null && !menuOpen) setOpenPath(null);
  const menuToggleRef = useRef<HTMLButtonElement>(null);
  const menuPanelRef = useRef<HTMLUListElement>(null);
  const navRef = useRef<HTMLElement>(null);

  const isActiveRoute = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  const showNavbarSceneControls = !isActiveRoute("/");

  const handleSearchShortcut = (event: React.MouseEvent<HTMLAnchorElement>) => {
    if (!isActiveRoute("/deals") || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const input = document.getElementById("deal-search");
    if (!(input instanceof HTMLInputElement)) return;

    event.preventDefault();
    setOpenPath(null);
    input.focus({ preventScroll: true });
    input.scrollIntoView({ block: "center" });
    window.history.replaceState(null, "", "/deals#deal-search");
  };

  useEffect(() => {
    if (!menuOpen) return;

    const restoreWithinDrawer = () => {
      if (menuPanelRef.current?.contains(document.activeElement)) {
        menuToggleRef.current?.focus({ preventScroll: true });
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || event.defaultPrevented ||
          !navRef.current?.contains(document.activeElement)) return;
      event.preventDefault();
      restoreWithinDrawer();
      setOpenPath(null);
    };
    let focusWasInDrawer = false;
    const onPointerDown = () => {
      focusWasInDrawer = Boolean(menuPanelRef.current?.contains(document.activeElement));
    };
    const onOutsideClick = (event: MouseEvent) => {
      if (!(event.target instanceof Node) || navRef.current?.contains(event.target)) return;
      // A click on a focusable control keeps its native focus. A click on the
      // background can leave body focused after the drawer link loses focus.
      if (focusWasInDrawer && document.activeElement === document.body) {
        menuToggleRef.current?.focus({ preventScroll: true });
      } else {
        restoreWithinDrawer();
      }
      setOpenPath(null);
    };
    const onHistory = () => setOpenPath(null);
    const mobileNav = window.matchMedia("(max-width: 980px)");
    const onResize = () => {
      if (mobileNav.matches) return;
      if (menuToggleRef.current === document.activeElement ||
          menuPanelRef.current?.contains(document.activeElement)) {
        navRef.current?.querySelector<HTMLElement>("[data-nx-nav-brand]")?.focus({ preventScroll: true });
      }
      setOpenPath(null);
    };

    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown, true);
    document.addEventListener("click", onOutsideClick);
    window.addEventListener("popstate", onHistory);
    mobileNav.addEventListener("change", onResize);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown, true);
      document.removeEventListener("click", onOutsideClick);
      window.removeEventListener("popstate", onHistory);
      mobileNav.removeEventListener("change", onResize);
    };
  }, [menuOpen]);

  return (
    <header className={className}>
      <nav
        ref={navRef}
        className={styles.nav}
        aria-label="Primary"
        onBlur={(event) => {
          if (menuOpen && event.relatedTarget && !event.currentTarget.contains(event.relatedTarget)) {
            setOpenPath(null);
          }
        }}
      >
        <Link
          href="/"
          data-nx-nav-brand
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
          <Link href="/deals#deal-search" className={styles.iconButton} aria-label="Focus deals search" onClick={handleSearchShortcut}>
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

          {showNavbarSceneControls ? (
            <CinematicSceneControls
              className={styles.navSceneControls}
              showMotion={false}
              soundIconOnly
            />
          ) : null}

          <div className={styles.navAuthStatus}>
            <AuthStatus />
          </div>

          <button
            type="button"
            ref={menuToggleRef}
            className={styles.menuButton}
            aria-expanded={menuOpen}
            aria-controls="nexora-compact-menu"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            onClick={() => setOpenPath((open) => open === pathname ? null : pathname)}
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

        <ul
          ref={menuPanelRef}
          id="nexora-compact-menu"
          className={styles.menuPanel}
          hidden={!menuOpen}
          onClickCapture={(event) => {
            if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey ||
                !(event.target instanceof Element) || !event.target.closest("a")) return;
            menuToggleRef.current?.focus({ preventScroll: true });
            setOpenPath(null);
          }}
        >
          {menuOpen ? <>
            {PRIMARY_LINKS.map((link) => {
              const isActive = isActiveRoute(link.href);

              return (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className={isActive ? `${styles.menuLink} ${styles.menuLinkActive}` : styles.menuLink}
                    aria-current={isActive ? "page" : undefined}
                  >
                    {link.label}
                  </Link>
                </li>
              );
            })}
            {showNavbarSceneControls ? (
              <li className={styles.menuSceneControls}>
                <CinematicSceneControls showMotion={false} />
              </li>
            ) : null}
            <li className={styles.menuAuthStatus}>
              <AuthStatus />
            </li>
          </> : null}
        </ul>
      </nav>
    </header>
  );
}
