/**
 * Topbar — Sticky top navigation with search, notifications and avatar.
 *
 * No props needed for now — search and actions are static.
 */

function Topbar() {
  return (
    <header className="nx-topbar">
      {/* Search */}
      <div className="nx-topbar__search">
        <span className="nx-topbar__search-icon">🔍</span>
        <input
          className="nx-topbar__search-input"
          type="text"
          placeholder="Search games, deals, giveaways..."
        />
      </div>

      {/* Action buttons */}
      <div className="nx-topbar__actions">
        <button className="nx-topbar__icon-btn" aria-label="Notifications">
          🔔
          <span className="nx-topbar__notif-dot" />
        </button>
        <button className="nx-topbar__icon-btn" aria-label="Messages">💬</button>
        <div className="nx-topbar__avatar">KS</div>
      </div>
    </header>
  )
}

export default Topbar
