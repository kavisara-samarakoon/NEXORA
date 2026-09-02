const accessibilityChecks = [
  {
    label: "Keyboard focus",
    detail:
      "Visible focus styles are available for links, buttons, inputs, and form controls.",
  },
  {
    label: "Skip link",
    detail: "A skip link moves keyboard users directly to the main content.",
  },
  {
    label: "Preview controls",
    detail: "Unavailable preview actions are disabled with clear labels.",
  },
  {
    label: "Reduced motion",
    detail:
      "Motion-heavy effects are reduced when the user requests reduced motion.",
  },
] as const;

export default function AccessibilityReviewPanel() {
  return (
    <section
      className="accessibility-review"
      aria-labelledby="accessibility-review-title"
    >
      <header className="accessibility-review__header">
        <h2 id="accessibility-review-title">Accessibility review</h2>
        <p>
          Quick checks for keyboard navigation, readable labels, disabled
          preview controls, and reduced-motion support.
        </p>
      </header>

      <ul className="accessibility-review__grid">
        {accessibilityChecks.map((check) => (
          <li className="accessibility-review__item" key={check.label}>
            <span className="accessibility-review__icon" aria-hidden="true">
              ✓
            </span>
            <div>
              <h3>{check.label}</h3>
              <p>{check.detail}</p>
            </div>
          </li>
        ))}
      </ul>

      <p className="accessibility-review__boundary">
        Accessibility review aid only — not a formal WCAG audit.
      </p>
    </section>
  );
}
