import Link from "next/link";
import type { Giveaway } from "@/data/dashboard";

export default function GiveawayCard({ giveaway }: { giveaway: Giveaway }) {
  return (
    <article className={`giveaway-card giveaway-card--${giveaway.platform}`} aria-labelledby={`dashboard-giveaway-${giveaway.id}`}>
      <div className="giveaway-card__accent" />
      <div className="giveaway-card__topline">
        <span className="giveaway-card__platform">{giveaway.platformLabel}</span>
        <span className="giveaway-card__free">Free</span>
      </div>
      <h3 id={`dashboard-giveaway-${giveaway.id}`}>{giveaway.title}</h3>
      <p>{giveaway.genre}</p>

      <div className="giveaway-card__progress">
        <div>
          <span>{giveaway.claimed}% claimed</span>
          <span className="giveaway-card__timer">
            <span aria-hidden="true">⏱️</span>
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

      <Link href="/giveaways" aria-label={`View giveaway details for ${giveaway.title}`}>
        Claim Now <span aria-hidden="true">→</span>
      </Link>
    </article>
  );
}
