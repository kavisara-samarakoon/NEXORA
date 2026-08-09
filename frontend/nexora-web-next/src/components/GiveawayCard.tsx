import type { Giveaway } from "@/data/dashboard";

export default function GiveawayCard({ giveaway }: { giveaway: Giveaway }) {
  return (
    <article className={`giveaway-card giveaway-card--${giveaway.platform}`}>
      <div className="giveaway-card__accent" />
      <div className="giveaway-card__topline">
        <span className="giveaway-card__platform">{giveaway.platformLabel}</span>
        <span className="giveaway-card__free">Free</span>
      </div>
      <h3>{giveaway.title}</h3>
      <p>{giveaway.genre}</p>

      <div className="giveaway-card__progress">
        <div>
          <span>{giveaway.claimed}% claimed</span>
          <span className="giveaway-card__timer">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="12" cy="12" r="9" />
              <path d="M12 7v5l3 2" />
            </svg>
            {giveaway.timer}
          </span>
        </div>
        <div
          className="giveaway-card__track"
          role="progressbar"
          aria-label={`${giveaway.title} claim progress`}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={giveaway.claimed}
        >
          <span style={{ width: `${giveaway.claimed}%` }} />
        </div>
      </div>

      <button type="button" disabled>
        Claim now <span aria-hidden="true">→</span>
      </button>
    </article>
  );
}
