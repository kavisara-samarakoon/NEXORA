import Link from "next/link";
import type { Deal } from "@/data/dashboard";

export default function DealCard({ deal }: { deal: Deal }) {
  const stars = `${"★".repeat(deal.stars)}${"☆".repeat(5 - deal.stars)}`;

  return (
    <article className="deal-card" aria-labelledby={`dashboard-deal-${deal.id}`}>
      <div className="deal-card__topline">
        <span>{deal.store}</span>
        <strong>{deal.discount}</strong>
      </div>
      <span className="deal-card__status">{deal.status}</span>
      <h3 id={`dashboard-deal-${deal.id}`}>{deal.title}</h3>
      <div className="deal-card__rating" aria-label={`${deal.rating} out of 5 stars`}>
        <span aria-hidden="true">{stars}</span>
        <strong>{deal.rating}</strong>
      </div>
      <div className="deal-card__footer">
        <div className="deal-card__prices">
          <del>{deal.priceOld}</del>
          <strong>{deal.priceNew}</strong>
        </div>
        <div className="deal-card__actions">
          <button type="button" aria-label={`Add ${deal.title} to wishlist unavailable in this dashboard preview`} title="Wishlist saving is available from the Deals page after sign in" disabled>
            <span aria-hidden="true">♡</span>
          </button>
          <Link className="deal-card__view" href="/deals" aria-label={`View deal intelligence for ${deal.title}`}>
            View Deal
          </Link>
        </div>
      </div>
    </article>
  );
}
