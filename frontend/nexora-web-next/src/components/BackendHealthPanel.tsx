import type { BackendHealthResult } from "@/lib/backend-health";

type BackendHealthPanelProps = {
  result: BackendHealthResult;
};

function formatCheckedAt(checkedAtUtc: string): string {
  const checkedAt = new Date(checkedAtUtc);

  if (Number.isNaN(checkedAt.getTime())) return "Just now";

  return `${new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "medium",
    timeZone: "UTC",
  }).format(checkedAt)} UTC`;
}

export default function BackendHealthPanel({
  result,
}: BackendHealthPanelProps) {
  const checkedAt = formatCheckedAt(result.checkedAtUtc);

  if (result.source === "unavailable") {
    return (
      <section
        className="backend-health-panel"
        aria-labelledby="backend-health-title"
      >
        <header className="backend-health-panel__header">
          <div>
            <h2 id="backend-health-title">Backend health</h2>
            <p>Local API check</p>
          </div>
          <span className="backend-health-panel__status backend-health-panel__status--unavailable">
            Backend unavailable
          </span>
        </header>

        <p className="backend-health-panel__message">{result.message}</p>
        <dl className="backend-health-panel__grid">
          <div className="backend-health-panel__item">
            <dt>Last checked</dt>
            <dd>
              <time dateTime={result.checkedAtUtc}>{checkedAt}</time>
            </dd>
          </div>
        </dl>

        <p className="backend-health-panel__note">
          <strong>Hint:</strong> Run{" "}
          <code>cd backend/nexora-api &amp;&amp; mvn spring-boot:run</code>, then
          refresh. This panel does not prove deployment or production readiness.
        </p>
      </section>
    );
  }

  const { health } = result;
  const authGuardCheck = health.checks.authProductionGuard;
  const activeProfiles = health.activeProfiles.length
    ? health.activeProfiles.join(", ")
    : "Not reported";

  return (
    <section
      className="backend-health-panel"
      aria-labelledby="backend-health-title"
    >
      <header className="backend-health-panel__header">
        <div>
          <h2 id="backend-health-title">Backend health</h2>
          <p>API reachable</p>
        </div>
        <span className="backend-health-panel__status backend-health-panel__status--online">
          Online
        </span>
      </header>

      <dl className="backend-health-panel__grid">
        <div className="backend-health-panel__item">
          <dt>Service</dt>
          <dd>{health.service}</dd>
        </div>
        <div className="backend-health-panel__item">
          <dt>Runtime mode</dt>
          <dd>{health.runtimeMode}</dd>
        </div>
        <div className="backend-health-panel__item">
          <dt>Data mode</dt>
          <dd>{health.dataMode}</dd>
        </div>
        {authGuardCheck ? (
          <div className="backend-health-panel__item">
            <dt>Auth guard check</dt>
            <dd>{authGuardCheck}</dd>
          </div>
        ) : null}
        <div className="backend-health-panel__item">
          <dt>Active profiles</dt>
          <dd>{activeProfiles}</dd>
        </div>
        <div className="backend-health-panel__item">
          <dt>Last checked</dt>
          <dd>
            <time dateTime={result.checkedAtUtc}>{checkedAt}</time>
          </dd>
        </div>
      </dl>

      <p className="backend-health-panel__note">
        Local health visibility only — not production readiness.
      </p>
    </section>
  );
}
