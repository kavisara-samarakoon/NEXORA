/**
 * GiveawayCard — Displays a single free game giveaway with claim button.
 *
 * Props:
 *   platform      (string) — 'steam' | 'epic' | 'gog' (used for colour)
 *   platformLabel (string) — display name, e.g. "Epic Games"
 *   title         (string) — game title
 *   meta          (string) — genre tags like "Action · FPS · Indie"
 *   timer         (string) — remaining time, e.g. "2d 14h 32m left"
 *   claimed       (number) — percentage of users who claimed (0-100)
 */

function GiveawayCard({ platform, platformLabel, title, meta, timer, claimed = 72 }) {
  return (
    <div className="nx-giveaway-card">
      {/* Top accent line coloured by platform */}
      <div className={`nx-giveaway-card__accent nx-giveaway-card__accent--${platform}`} />

      <span className="nx-giveaway-card__free-tag">FREE</span>

      <span className={`nx-giveaway-card__platform nx-giveaway-card__platform--${platform}`}>
        {platformLabel}
      </span>

      <h3 className="nx-giveaway-card__title">{title}</h3>
      <p className="nx-giveaway-card__meta">{meta}</p>

      {/* Claim progress bar */}
      <div className="nx-giveaway-card__progress">
        <div className="nx-giveaway-card__progress-info">
          <span>{claimed}% claimed</span>
          <span className="nx-giveaway-card__timer">
            <span className="nx-giveaway-card__timer-icon">⏱️</span>
            {timer}
          </span>
        </div>
        <div className="nx-giveaway-card__progress-track">
          <div
            className={`nx-giveaway-card__progress-fill nx-giveaway-card__progress-fill--${platform}`}
            style={{ width: `${claimed}%` }}
          />
        </div>
      </div>

      <button className={`nx-giveaway-card__claim nx-giveaway-card__claim--${platform}`}>
        Claim Now →
      </button>
    </div>
  )
}

export default GiveawayCard
