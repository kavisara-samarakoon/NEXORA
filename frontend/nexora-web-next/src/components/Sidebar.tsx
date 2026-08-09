"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";

type NavItem = {
  label: string;
  icon: ReactNode;
};

function GridIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="3" y="3" width="7" height="7" rx="2" />
      <rect x="14" y="3" width="7" height="7" rx="2" />
      <rect x="3" y="14" width="7" height="7" rx="2" />
      <rect x="14" y="14" width="7" height="7" rx="2" />
    </svg>
  );
}

function DealsIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M13 3s1 4-2 6c-2-3-5-2-5-2s-2 3-1 7c1 5 5 7 8 7 5 0 8-4 7-9-1-4-5-6-5-6s1 4-2 5c1-5 0-8 0-8Z" />
    </svg>
  );
}

function GiveawaysIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 10h16v11H4zM3 6h18v4H3zM12 6v15M12 6H8.5a2.5 2.5 0 1 1 0-5C11 1 12 6 12 6Zm0 0h3.5a2.5 2.5 0 1 0 0-5C13 1 12 6 12 6Z" />
    </svg>
  );
}

function WishlistIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5 4h14v16H5zM9 4v16M12 8h4M12 12h4M12 16h3" />
    </svg>
  );
}

const upcomingItems: NavItem[] = [
  {
    label: "Library",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M5 4h14v16H5zM9 4v16" />
      </svg>
    ),
  },
  {
    label: "Activity",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4 17V9M10 17V5M16 17v-7M22 17V7" />
      </svg>
    ),
  },
];

export default function Sidebar() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  return (
    <>
      <button
        className="menu-toggle"
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
          <span className="sidebar__label">Command</span>
          <Link
            className={`nav-item${pathname === "/" ? " nav-item--active" : ""}`}
            href="/"
            aria-current={pathname === "/" ? "page" : undefined}
            onClick={() => setIsOpen(false)}
          >
            <span className="nav-item__icon"><GridIcon /></span>
            Dashboard
          </Link>
          <Link
            className={`nav-item${pathname.startsWith("/deals") ? " nav-item--active" : ""}`}
            href="/deals"
            aria-current={pathname.startsWith("/deals") ? "page" : undefined}
            onClick={() => setIsOpen(false)}
          >
            <span className="nav-item__icon"><DealsIcon /></span>
            Deals
          </Link>
          <Link
            className={`nav-item${pathname.startsWith("/giveaways") ? " nav-item--active" : ""}`}
            href="/giveaways"
            aria-current={pathname.startsWith("/giveaways") ? "page" : undefined}
            onClick={() => setIsOpen(false)}
          >
            <span className="nav-item__icon"><GiveawaysIcon /></span>
            Giveaways
          </Link>
          <Link
            className={`nav-item${pathname.startsWith("/wishlist") ? " nav-item--active" : ""}`}
            href="/wishlist"
            aria-current={pathname.startsWith("/wishlist") ? "page" : undefined}
            onClick={() => setIsOpen(false)}
          >
            <span className="nav-item__icon"><WishlistIcon /></span>
            Wishlist
          </Link>

          <span className="sidebar__label sidebar__label--spaced">Coming next</span>
          {upcomingItems.map((item) => (
            <span className="nav-item nav-item--disabled" aria-disabled="true" key={item.label}>
              <span className="nav-item__icon">{item.icon}</span>
              {item.label}
              <span className="nav-item__soon">Soon</span>
            </span>
          ))}
        </nav>

        <div className="sidebar__footer">
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
