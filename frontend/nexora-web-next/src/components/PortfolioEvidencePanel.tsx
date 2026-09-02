const portfolioEvidence = [
  {
    icon: "UI",
    label: "Frontend implementation",
    detail:
      "Next.js App Router pages, reusable components, responsive UI, source labels, reviewer panels, and accessibility review aid.",
  },
  {
    icon: "API",
    label: "Backend/API integration",
    detail:
      "Spring Boot API routes, health visibility, dashboard data, deals, giveaways, wishlist, security, and Sentinel gateway foundations.",
  },
  {
    icon: "SEC",
    label: "Security foundation",
    detail:
      "Authentication flows, CSRF-aware browser behavior, safe error handling, request correlation, and security-header documentation.",
  },
  {
    icon: "GIT",
    label: "GitHub workflow",
    detail:
      "Milestone branches, pull requests, tags, release notes, reviewer documentation, and clean public-safe project status.",
  },
  {
    icon: "QA",
    label: "Validation evidence",
    detail:
      "Backend tests, frontend lint/build, API smoke testing, OpenAPI contract checks, security checks, dependency review, and reviewer tooling CI.",
  },
] as const;

export default function PortfolioEvidencePanel() {
  return (
    <section
      className="portfolio-evidence"
      aria-labelledby="portfolio-evidence-title"
    >
      <header className="portfolio-evidence__header">
        <h2 id="portfolio-evidence-title">Portfolio evidence</h2>
        <p>
          Public-safe project evidence for frontend, backend API, security
          foundations, documentation, CI, and reviewer workflows.
        </p>
      </header>

      <ul className="portfolio-evidence__grid">
        {portfolioEvidence.map((evidence) => (
          <li className="portfolio-evidence__card" key={evidence.label}>
            <span className="portfolio-evidence__icon" aria-hidden="true">
              {evidence.icon}
            </span>
            <div className="portfolio-evidence__copy">
              <h3>{evidence.label}</h3>
              <p>{evidence.detail}</p>
            </div>
          </li>
        ))}
      </ul>

      <p className="portfolio-evidence__boundary">
        Evidence summary only — not a production-readiness claim.
      </p>
    </section>
  );
}
