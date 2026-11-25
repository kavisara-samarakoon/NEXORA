# Dependency security

Security CI audits the committed npm lockfile before any install. High and
Critical production findings fail the frontend job. The full report includes
development packages for triage. A registry error fails the applicable step.

The backend job resolves the Maven runtime dependency tree and scans a
CycloneDX inventory with Trivy. The artifact contains the runtime tree, SBOM,
raw scanner output and the gate decision. The gate rejects High and Critical
findings, including unfixed advisories. Inventory, scanner and report
errors fail the job. The gate verifies that Trivy reported coverage for every
Maven coordinate in the SBOM. This checks scan coverage, while advisory feeds
may still miss published issues.

The [vendor supplement](../../scripts/security/backend-vendor-advisories.json)
adds explicitly reviewed findings from the F5 inventory that public feeds can
miss. It is additive. When updating dependencies, review current vendor
advisories, the affected ranges and any differences from the scanner report.
For example, Apache reports CVE-2026-133325 for the Tomcat 11.0.29 release.
NEXORA's embedded JAR lacks the affected Tribes clustering implementation.
The gate still blocks this release match pending owner review. No overrides or
security exceptions are active. If an exception is separately authorized,
record the exact package/version and advisory, supporting package inspection,
owner approval and an expiry. Keep the finding visible in the gate output.
[Apache Tomcat advisory](https://tomcat.apache.org/security-11.html#Fixed_in_Apache_Tomcat_11.0.30)

GitHub Dependency Review independently blocks High and Critical changes on
public repositories. For a private repository, enable GitHub's supported
security capability first, then set `NEXORA_PRIVATE_DEPENDENCY_REVIEW=true` as
a repository Actions variable. Confirm the resulting workflow and branch
protection in GitHub. Independent Security CI still runs on pull requests,
main pushes, a weekly schedule and manual dispatch.
[GitHub Dependency Review](https://docs.github.com/en/code-security/concepts/supply-chain-security/dependency-review)

Node.js 24 LTS is declared in the root `.nvmrc` and the frontend
`engines.node` field. CI and the devcontainer use that major. Vercel honors
the frontend engine declaration for hosted builds and functions. Confirm the
actual hosted runtime during deployment validation. The backend continues
to target Java 17.
[Vercel Node.js versions](https://vercel.com/docs/functions/runtimes/node-js/node-js-versions)
