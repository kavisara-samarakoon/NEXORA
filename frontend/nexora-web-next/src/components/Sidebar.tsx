"use client";

import Image from "next/image";
import Link from "next/link";
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
            className="nav-item nav-item--active"
            href="/"
            aria-current="page"
            onClick={() => setIsOpen(false)}
          >
            <span className="nav-item__icon"><GridIcon /></span>
            Dashboard
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
