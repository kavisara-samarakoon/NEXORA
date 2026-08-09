export default function SentinelButton() {
  return (
    <button
      className="sentinel-button"
      type="button"
      aria-label="Open NEXORA Sentinel"
      title="Sentinel is coming soon"
    >
      <span className="sentinel-button__orb" aria-hidden="true">
        <svg viewBox="0 0 24 24">
          <path d="M12 3 5 7v5c0 4 2.7 7.1 7 9 4.3-1.9 7-5 7-9V7z" />
          <path d="M9 12h.01M15 12h.01M10 16h4" />
        </svg>
      </span>
      <span className="sentinel-button__copy">
        <small>AI companion</small>
        <strong>Sentinel</strong>
      </span>
      <span className="sentinel-button__pulse" aria-hidden="true" />
    </button>
  );
}
