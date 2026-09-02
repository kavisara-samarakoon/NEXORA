const screenshotGuidance = [
  {
    label: "Use review pages",
    detail: "Dashboard, Deals, Giveaways, Wishlist, Security, and Sentinel show the clearest project evidence.",
    icon: "01",
  },
  {
    label: "Crop browser chrome",
    detail: "Remove browser tabs, address bar, bookmarks, extensions, account menus, and desktop notifications.",
    icon: "02",
  },
  {
    label: "Avoid private identity",
    detail: "Use an anonymous or demo account, or crop signed-in account/profile areas before sharing.",
    icon: "03",
  },
  {
    label: "Hide local evidence",
    detail: "Do not include terminal usernames, local filesystem paths, .env files, API keys, tokens, cookies, or private data.",
    icon: "04",
  },
  {
    label: "Keep claims accurate",
    detail: "Present screenshots as local MVP evidence, not production deployment, monitoring, WCAG certification, or job-readiness proof.",
    icon: "05",
  },
] as const;

export default function ScreenshotSafeReviewPanel() {
  return (
    <section
      className="screenshot-safe-review"
      aria-labelledby="screenshot-safe-review-title"
    >
      <header className="screenshot-safe-review__header">
        <h2 id="screenshot-safe-review-title">Screenshot-safe review</h2>
        <p>Public capture guidance for portfolio, GitHub, lecturer, and reviewer screenshots.</p>
      </header>

      <ul className="screenshot-safe-review__grid">
        {screenshotGuidance.map((item) => (
          <li className="screenshot-safe-review__item" key={item.label}>
            <span className="screenshot-safe-review__icon" aria-hidden="true">{item.icon}</span>
            <div>
              <h3>{item.label}</h3>
              <p>{item.detail}</p>
            </div>
          </li>
        ))}
      </ul>

      <p className="screenshot-safe-review__boundary">
        Screenshot guidance only — it does not change runtime privacy, security, or production readiness.
      </p>
    </section>
  );
}
