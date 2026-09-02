const stateReviewItems = [
  {
    label: "Loading",
    description: "The page is waiting for a local or backend-routed response.",
    icon: "…",
  },
  {
    label: "Fallback",
    description: "Bundled preview data may appear when API-backed data is unavailable.",
    icon: "↺",
  },
  {
    label: "Empty",
    description: "No displayed items match the current filter or account state.",
    icon: "○",
  },
  {
    label: "Unavailable",
    description: "A local backend, session, or provider route could not be reached.",
    icon: "×",
  },
  {
    label: "Retry",
    description: "Retry controls are manual and do not add polling or background refresh.",
    icon: "↗",
  },
] as const;

export default function StateReviewPanel() {
  return (
    <section className="state-review" aria-labelledby="state-review-title">
      <header className="state-review__header">
        <h2 id="state-review-title">State review</h2>
        <p>How the local frontend explains loading, fallback, empty, unavailable, and retry states during review.</p>
      </header>

      <ul className="state-review__grid">
        {stateReviewItems.map((item) => (
          <li className="state-review__item" key={item.label}>
            <span className="state-review__icon" aria-hidden="true">{item.icon}</span>
            <div>
              <h3>{item.label}</h3>
              <p>{item.description}</p>
            </div>
          </li>
        ))}
      </ul>

      <p className="state-review__boundary">State review aid only — not production monitoring.</p>
    </section>
  );
}
