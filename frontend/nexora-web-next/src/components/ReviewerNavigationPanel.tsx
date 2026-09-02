import Link from "next/link";

const reviewerRoutes = [
  {
    href: "/",
    icon: "🏠",
    label: "Dashboard",
    detail: "Health, source labels, and local overview",
  },
  {
    href: "/deals",
    icon: "🔥",
    label: "Deals",
    detail: "API/fallback deal feed and wishlist save flow",
  },
  {
    href: "/giveaways",
    icon: "🎁",
    label: "Giveaways",
    detail: "API/fallback giveaway feed",
  },
  {
    href: "/wishlist",
    icon: "📋",
    label: "Wishlist",
    detail: "Public preview and signed-in wishlist area",
  },
  {
    href: "/security",
    icon: "🛡️",
    label: "Security",
    detail: "Authentication and security foundation preview",
  },
  {
    href: "/sentinel",
    icon: "🤖",
    label: "Sentinel",
    detail: "AI assistant gateway preview",
  },
] as const;

export default function ReviewerNavigationPanel() {
  return (
    <section
      className="reviewer-navigation"
      aria-labelledby="reviewer-navigation-title"
    >
      <header className="reviewer-navigation__header">
        <h2 id="reviewer-navigation-title">Reviewer path</h2>
        <p>
          Use these pages to review the local MVP frontend, API-backed data,
          fallback states, and security foundations.
        </p>
      </header>

      <nav aria-label="Suggested reviewer path">
        <ul className="reviewer-navigation__grid">
          {reviewerRoutes.map((route) => (
            <li key={route.href}>
              <Link
                className="reviewer-navigation__card"
                href={route.href}
                aria-label={`Review ${route.label} page: ${route.detail}`}
              >
                <span
                  className="reviewer-navigation__card-icon"
                  aria-hidden="true"
                >
                  {route.icon}
                </span>
                <span className="reviewer-navigation__card-copy">
                  <strong>{route.label}</strong>
                  <span>{route.detail}</span>
                </span>
                <span aria-hidden="true">→</span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </section>
  );
}
