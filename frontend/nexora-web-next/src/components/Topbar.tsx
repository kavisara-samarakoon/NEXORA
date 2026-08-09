export default function Topbar() {
  return (
    <header className="topbar">
      <div className="topbar__search" role="search">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-4-4" />
        </svg>
        <label className="sr-only" htmlFor="nexora-search">
          Search NEXORA
        </label>
        <input
          id="nexora-search"
          type="search"
          placeholder="Search NEXORA"
          autoComplete="off"
        />
        <kbd>⌘ K</kbd>
      </div>

      <div className="topbar__actions">
        <div className="topbar__status">
          <span className="status-dot" aria-hidden="true" />
          Online
        </div>
        <button className="icon-button" type="button" aria-label="Notifications">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" />
          </svg>
          <span className="notification-dot" />
        </button>
        <button className="profile-button" type="button" aria-label="Open profile menu">
          <span>KS</span>
          <span className="profile-button__copy">
            <strong>Operator</strong>
            <small>Commander</small>
          </span>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="m8 10 4 4 4-4" />
          </svg>
        </button>
      </div>
    </header>
  );
}
