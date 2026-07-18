/**
 * DealCard — Displays a single game deal with pricing info.
 *
 * Props:
 *   store    (string) — store name, e.g. "Steam Store"
 *   discount (string) — discount label, e.g. "-75%"
 *   title    (string) — game title
 *   priceOld (string) — original price, e.g. "$39.99"
 *   priceNew (string) — discounted price, e.g. "$9.99"
 *   rating   (number) — numeric rating, e.g. 4.8
 *   stars    (string) — star characters, e.g. "★★★★★"
 */

function DealCard({ store, discount, title, priceOld, priceNew, rating, stars }) {
  return (
    <div className="nx-deal-card">
      <div className="nx-deal-card__header">
        <span className="nx-deal-card__store">{store}</span>
        <span className="nx-deal-card__discount">{discount}</span>
      </div>

      <h3 className="nx-deal-card__title">{title}</h3>

      <div className="nx-deal-card__prices">
        <span className="nx-deal-card__price-old">{priceOld}</span>
        <span className="nx-deal-card__price-new">{priceNew}</span>
      </div>

      <div className="nx-deal-card__rating">
        <span className="nx-deal-card__stars">{stars}</span>
        {rating}
      </div>
    </div>
  )
}

export default DealCard
