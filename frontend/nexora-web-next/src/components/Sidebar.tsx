"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

export default function Sidebar() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  return (
    <>
      <button
        className={`menu-toggle${isOpen ? " menu-toggle--open" : ""}`}
        type="button"
        aria-label={isOpen ? "Close navigation" : "Open navigation"}
        aria-controls="primary-navigation"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((open) => !open)}
      >
        <span />
        <span />
      </button>

      <button
        className={`sidebar-scrim${isOpen ? " sidebar-scrim--visible" : ""}`}
        type="button"
        aria-label="Close navigation"
        tabIndex={isOpen ? 0 : -1}
        onClick={() => setIsOpen(false)}
      />

      <aside className={`sidebar${isOpen ? " sidebar--open" : ""}`}>
        <Link className="brand" href="/" onClick={() => setIsOpen(false)}>
          <Image
            className="brand__logo"
            src="/brand/nexora-logo.png"
            alt="NEXORA"
            width={48}
            height={48}
            priority
          />
          <span className="brand__copy">
            <strong>NEXORA</strong>
            <small>Game Hub</small>
          </span>
        </Link>

        <nav id="primary-navigation" className="sidebar__nav" aria-label="Primary navigation">
          <span className="sidebar__label">Main Menu</span>
          <Link
            className={`nav-item${pathname === "/" ? " nav-item--active" : ""}`}
            href="/"
            aria-current={pathname === "/" ? "page" : undefined}
            onClick={() => setIsOpen(false)}
          >
            <span className="nav-item__icon" aria-hidden="true">🏠</span>
            Dashboard
          </Link>
          <Link
            className={`nav-item${pathname.startsWith("/deals") ? " nav-item--active" : ""}`}
            href="/deals"
            aria-current={pathname.startsWith("/deals") ? "page" : undefined}
            onClick={() => setIsOpen(false)}
          >
            <span className="nav-item__icon" aria-hidden="true">🔥</span>
            Deals
            <span className="nav-item__badge">24</span>
          </Link>
          <Link
            className={`nav-item${pathname.startsWith("/giveaways") ? " nav-item--active" : ""}`}
            href="/giveaways"
            aria-current={pathname.startsWith("/giveaways") ? "page" : undefined}
            onClick={() => setIsOpen(false)}
          >
            <span className="nav-item__icon" aria-hidden="true">🎁</span>
            Giveaways
            <span className="nav-item__badge">7</span>
          </Link>
          <Link
            className={`nav-item${pathname.startsWith("/wishlist") ? " nav-item--active" : ""}`}
            href="/wishlist"
            aria-current={pathname.startsWith("/wishlist") ? "page" : undefined}
            onClick={() => setIsOpen(false)}
          >
            <span className="nav-item__icon" aria-hidden="true">📋</span>
            Wishlist
          </Link>
          <Link
            className={`nav-item${pathname.startsWith("/security") ? " nav-item--active" : ""}`}
            href="/security"
            aria-current={pathname.startsWith("/security") ? "page" : undefined}
            onClick={() => setIsOpen(false)}
          >
            <span className="nav-item__icon" aria-hidden="true">🛡️</span>
            Security
          </Link>
          <Link
            className={`nav-item${pathname.startsWith("/sentinel") ? " nav-item--active" : ""}`}
            href="/sentinel"
            aria-current={pathname.startsWith("/sentinel") ? "page" : undefined}
            onClick={() => setIsOpen(false)}
          >
            <span className="nav-item__icon" aria-hidden="true">🤖</span>
            Sentinel
          </Link>

          <span className="sidebar__label sidebar__label--spaced">System</span>
          <Link
            className={`nav-item${pathname.startsWith("/settings") ? " nav-item--active" : ""}`}
            href="/settings"
            aria-current={pathname.startsWith("/settings") ? "page" : undefined}
            onClick={() => setIsOpen(false)}
          >
            <span className="nav-item__icon" aria-hidden="true">⚙️</span>
            Settings
          </Link>
        </nav>

        <div className="sidebar__footer">
          <button
            className="nav-item sidebar__help"
            type="button"
            aria-disabled="true"
            title="Help center coming soon"
          >
            <span className="nav-item__icon" aria-hidden="true">❓</span>
            Help &amp; Support
          </button>
          <div className="sidebar__connection">
            <span className="status-dot" aria-hidden="true" />
            <span>
              <small>Network</small>
              <strong>All systems normal</strong>
            </span>
          </div>
          <span className="sidebar__version">NEXORA / 01</span>
        </div>
      </aside>
    </>
  );
}
