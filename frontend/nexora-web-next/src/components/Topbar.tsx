import AuthStatus from "@/components/AuthStatus";

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
          aria-describedby="nexora-search-help"
        />
        <kbd aria-hidden="true">Preview</kbd>
        <span className="sr-only" id="nexora-search-help">Global search is an interface preview and does not submit a search.</span>
      </div>

      <div className="topbar__actions">
        <div className="topbar__status">
          <span className="status-dot" aria-hidden="true" />
          Online
        </div>
        <button className="icon-button icon-button--emoji" type="button" aria-label="Notifications unavailable in this preview" title="Notifications are unavailable in this preview" disabled>
          <span aria-hidden="true">🔔</span>
          <span className="notification-dot" aria-hidden="true" />
        </button>
        <button className="icon-button icon-button--emoji" type="button" aria-label="Messages unavailable in this preview" title="Messages are unavailable in this preview" disabled>
          <span aria-hidden="true">💬</span>
        </button>
        <AuthStatus />
      </div>
    </header>
  );
}
