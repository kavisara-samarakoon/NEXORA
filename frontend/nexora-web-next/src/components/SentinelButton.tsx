import Link from "next/link";

export default function SentinelButton() {
  return (
    <div className="sentinel-button-shell">
      <Link
        className="sentinel-button"
        href="/sentinel"
        aria-label="Open NEXORA Sentinel"
      >
        <span className="sentinel-button__orb" aria-hidden="true">🤖</span>
        <strong>NEXORA Sentinel</strong>
      </Link>
    </div>
  );
}
