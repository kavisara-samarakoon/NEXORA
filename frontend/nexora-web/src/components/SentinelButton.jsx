/**
 * SentinelButton — Floating AI chatbot button in the bottom-right corner.
 *
 * No props needed — purely visual for now.
 */

function SentinelButton() {
  return (
    <button className="nx-sentinel" aria-label="Open NEXORA Sentinel AI Chat">
      <span className="nx-sentinel__icon">🤖</span>
      NEXORA Sentinel
    </button>
  )
}

export default SentinelButton
