import type { Deal } from "@/data/dashboard";

export default function DealCard({ deal }: { deal: Deal }) {
  const stars = `${"★".repeat(deal.stars)}${"☆".repeat(5 - deal.stars)}`;

  return (
    <article className="deal-card">
      <div className="deal-card__topline">
        <span>{deal.store}</span>
        <strong>{deal.discount}</strong>
      </div>
      <span className="deal-card__status">{deal.status}</span>
      <h3>{deal.title}</h3>
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
          <button type="button" aria-label={`Add ${deal.title} to wishlist`} disabled>
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M20.8 5.8a5.5 5.5 0 0 0-7.8 0L12 6.9l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 22l8.8-8.4a5.5 5.5 0 0 0 0-7.8Z" />
            </svg>
          </button>
          <button type="button" disabled>View deal</button>
        </div>
      </div>
    </article>
  );
}
