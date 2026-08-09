import Link from "next/link";

export default function Topbar() {
  return (
    <header className="topbar">
      <div className="topbar__search" role="search">
        <span className="topbar__search-icon" aria-hidden="true">🔍</span>
        <label className="sr-only" htmlFor="nexora-search">
          Search games, deals, and giveaways
        </label>
        <input
          id="nexora-search"
          type="search"
          placeholder="Search games, deals, giveaways..."
          autoComplete="off"
        />
        <kbd>⌘ K</kbd>
      </div>

      <div className="topbar__actions">
        <div className="topbar__status">
          <span className="status-dot" aria-hidden="true" />
          Online
        </div>
        <button className="icon-button icon-button--emoji" type="button" aria-label="Notifications">
          <span aria-hidden="true">🔔</span>
          <span className="notification-dot" />
        </button>
        <button className="icon-button icon-button--emoji" type="button" aria-label="Messages">
          <span aria-hidden="true">💬</span>
        </button>
        <Link className="topbar__avatar" href="/settings" aria-label="Open account settings">KS</Link>
      </div>
    </header>
  );
}
