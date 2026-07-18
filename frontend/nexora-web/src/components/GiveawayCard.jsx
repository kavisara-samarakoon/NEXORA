/**
 * GiveawayCard — Displays a single free game giveaway.
 *
 * Props:
 *   platform      (string) — 'steam' | 'epic' | 'gog' (used for colour)
 *   platformLabel (string) — display name, e.g. "Epic Games"
 *   title         (string) — game title
 *   meta          (string) — genre tags like "Action · FPS · Indie"
 *   timer         (string) — remaining time, e.g. "2d 14h 32m left"
 */

function GiveawayCard({ platform, platformLabel, title, meta, timer }) {
  return (
    <div className="nx-giveaway-card">
      <span className="nx-giveaway-card__free-tag">FREE</span>

      <span className={`nx-giveaway-card__platform nx-giveaway-card__platform--${platform}`}>
        {platformLabel}
      </span>

      <h3 className="nx-giveaway-card__title">{title}</h3>
      <p className="nx-giveaway-card__meta">{meta}</p>

      <div className="nx-giveaway-card__timer">
        <span className="nx-giveaway-card__timer-icon">⏱️</span>
        {timer}
      </div>
    </div>
  )
}

export default GiveawayCard
