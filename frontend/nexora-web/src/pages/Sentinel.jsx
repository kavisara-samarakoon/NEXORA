/**
 * Sentinel — Premium "NEXORA Sentinel" AI assistant page.
 *
 * Features:
 * - Cyber-themed page header with animated gradient title
 * - Demo disclaimer banner
 * - Large Liquid Glass chatbot panel with static messages + typing indicator
 * - Chat input with send button
 * - Quick suggestion chips
 * - 4 capability cards
 * - Sentinel System Status side panel
 *
 * All data is static. AI integration will be added later.
 */

/* ── Static chat messages ── */
const CHAT_MESSAGES = [
  {
    id: 1,
    role: 'user',
    text: 'Find me co-op games under $15',
  },
  {
    id: 2,
    role: 'ai',
    text: 'I found **12 co-op games** under $15 across Steam and Epic Games. Top picks: **It Takes Two ($9.99)**, **Deep Rock Galactic ($7.49)**, and **Stardew Valley ($11.99)**. Want me to add any to your wishlist?',
  },
  {
    id: 3,
    role: 'user',
    text: 'Add It Takes Two to my wishlist and set a price alert for $7',
  },
  {
    id: 4,
    role: 'ai',
    text: '✅ Done! **It Takes Two** has been added to your wishlist with a price alert at **$7.00**. I\'ll notify you the moment it drops below that threshold. Anything else?',
  },
]

const SUGGESTION_CHIPS = [
  'Find RPGs under $20',
  'When is the next Steam sale?',
  'Free games this week',
  'Is my account secure?',
  'Compare Elden Ring prices',
]

const CAPABILITY_CARDS = [
  {
    id: 1,
    icon: '🎮',
    title: 'Game Discovery Assistant',
    description: 'Ask Sentinel to find games by genre, price, platform, or play style across all major stores.',
    color: 'blue',
  },
  {
    id: 2,
    icon: '💰',
    title: 'Deal Recommendation Support',
    description: 'Get personalized deal suggestions, price history insights, and sale predictions.',
    color: 'orange',
  },
  {
    id: 3,
    icon: '🛡️',
    title: 'Account Safety Guidance',
    description: 'Sentinel helps you review session activity, password strength, and connected platform security.',
    color: 'green',
  },
  {
    id: 4,
    icon: '🔐',
    title: 'Cyber Security Awareness',
    description: 'Learn about phishing risks, safe store redirects, and best practices for gaming account safety.',
    color: 'purple',
  },
]

function Sentinel() {
  return (
    <div className="nx-content">
      {/* ═══════════ PAGE HEADER ═══════════ */}
      <div className="sn-header">
        {/* Decorative orbs */}
        <div className="sn-header__orb sn-header__orb--blue" />
        <div className="sn-header__orb sn-header__orb--orange" />

        {/* Scanlines */}
        <div className="sn-header__scanlines" />

        <div className="sn-header__inner">
          <div className="sn-header__text">
            <div className="sn-header__tag">
              <span className="sn-header__tag-dot" />
              <span>AI ASSISTANT</span>
            </div>
            <h1 className="sn-header__title">
              🤖 <span>NEXORA Sentinel</span>
            </h1>
            <p className="sn-header__desc">
              Your AI assistant for game discovery, deal guidance, and account
              safety — powered by intelligent conversation.
            </p>
          </div>
        </div>
      </div>

      {/* ═══════════ DEMO DISCLAIMER ═══════════ */}
      <div className="sn-disclaimer">
        <span className="sn-disclaimer__icon">ℹ️</span>
        <div className="sn-disclaimer__text">
          <strong>AI Demo Mode</strong> — Chat messages are static samples.
          Real AI integration (Gemini API) and backend conversation logic
          will be added in a future sprint.
        </div>
      </div>

      {/* ═══════════ MAIN CONTENT AREA ═══════════ */}
      <div className="sn-layout">
        {/* ── Left content ── */}
        <div className="sn-content">

          {/* ── Chat Panel ── */}
          <div className="sn-chat">
            {/* Chat header */}
            <div className="sn-chat__header">
              <div className="sn-chat__header-left">
                <span className="sn-chat__avatar">🤖</span>
                <div className="sn-chat__header-info">
                  <span className="sn-chat__header-name">Sentinel AI</span>
                  <span className="sn-chat__header-status">
                    <span className="sn-chat__header-dot" />
                    Demo Mode
                  </span>
                </div>
              </div>
              <span className="sn-chat__header-badge">STATIC PREVIEW</span>
            </div>

            {/* Chat messages */}
            <div className="sn-chat__messages">
              {CHAT_MESSAGES.map((msg) => (
                <div
                  key={msg.id}
                  className={`sn-chat__bubble sn-chat__bubble--${msg.role}`}
                >
                  {msg.role === 'ai' && (
                    <span className="sn-chat__bubble-avatar">🤖</span>
                  )}
                  <div className="sn-chat__bubble-content">
                    {msg.role === 'ai' ? (
                      <p
                        className="sn-chat__bubble-text"
                        dangerouslySetInnerHTML={{
                          __html: msg.text
                            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>'),
                        }}
                      />
                    ) : (
                      <p className="sn-chat__bubble-text">{msg.text}</p>
                    )}
                  </div>
                </div>
              ))}

              {/* Typing indicator */}
              <div className="sn-chat__bubble sn-chat__bubble--ai">
                <span className="sn-chat__bubble-avatar">🤖</span>
                <div className="sn-chat__typing">
                  <span className="sn-chat__typing-dot" />
                  <span className="sn-chat__typing-dot" />
                  <span className="sn-chat__typing-dot" />
                </div>
              </div>
            </div>

            {/* Quick suggestion chips */}
            <div className="sn-chat__suggestions">
              {SUGGESTION_CHIPS.map((chip) => (
                <button key={chip} className="sn-chat__suggestion-chip">
                  {chip}
                </button>
              ))}
            </div>

            {/* Chat input */}
            <div className="sn-chat__input-row">
              <input
                className="sn-chat__input"
                type="text"
                placeholder="Ask Sentinel about games, deals, giveaways or account security..."
                readOnly
              />
              <button className="sn-chat__send-btn" aria-label="Send message">
                ↗
              </button>
            </div>
          </div>

          {/* ── Capability Cards ── */}
          <div className="sn-section-header">
            <h2 className="sn-section-header__title">⚡ Sentinel Capabilities</h2>
          </div>
          <div className="sn-capabilities">
            {CAPABILITY_CARDS.map((card) => (
              <div
                key={card.id}
                className={`sn-capability sn-capability--${card.color}`}
              >
                <div className={`sn-capability__accent sn-capability__accent--${card.color}`} />
                <div className={`sn-capability__icon-box sn-capability__icon-box--${card.color}`}>
                  <span className="sn-capability__icon">{card.icon}</span>
                </div>
                <div className="sn-capability__info">
                  <h3 className="sn-capability__title">{card.title}</h3>
                  <p className="sn-capability__desc">{card.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Sentinel System Status panel ── */}
        <aside className="sn-network">
          <div className="sn-network__header">
            <span className="sn-network__icon">📡</span>
            <h3 className="sn-network__title">Sentinel System Status</h3>
            <span className="sn-network__live">
              <span className="sn-network__live-dot" />
              DEMO
            </span>
          </div>

          <div className="sn-network__items">
            {/* AI Status */}
            <div className="sn-network__item">
              <div className="sn-network__item-icon sn-network__item-icon--blue">
                🤖
              </div>
              <div className="sn-network__item-info">
                <span className="sn-network__item-label">AI Status</span>
                <span className="sn-network__item-value">Demo Mode</span>
              </div>
              <span className="sn-network__item-badge sn-network__item-badge--demo">
                DEMO
              </span>
            </div>

            {/* Backend */}
            <div className="sn-network__item">
              <div className="sn-network__item-icon sn-network__item-icon--orange">
                🌐
              </div>
              <div className="sn-network__item-info">
                <span className="sn-network__item-label">Backend</span>
                <span className="sn-network__item-value">Not connected yet</span>
              </div>
              <span className="sn-network__item-badge sn-network__item-badge--offline">
                OFFLINE
              </span>
            </div>

            {/* Gemini API */}
            <div className="sn-network__item">
              <div className="sn-network__item-icon sn-network__item-icon--purple">
                ✨
              </div>
              <div className="sn-network__item-info">
                <span className="sn-network__item-label">Gemini API</span>
                <span className="sn-network__item-value">Future integration</span>
              </div>
              <span className="sn-network__item-badge sn-network__item-badge--future">
                FUTURE
              </span>
            </div>

            {/* Privacy */}
            <div className="sn-network__item">
              <div className="sn-network__item-icon sn-network__item-icon--green">
                🔒
              </div>
              <div className="sn-network__item-info">
                <span className="sn-network__item-label">Privacy</span>
                <span className="sn-network__item-value">No real messages saved</span>
              </div>
              <span className="sn-network__item-badge sn-network__item-badge--safe">
                SAFE
              </span>
            </div>
          </div>

          {/* Sentinel info widget */}
          <div className="sn-network__about">
            <div className="sn-network__about-label">About Sentinel</div>
            <div className="sn-network__about-rows">
              <div className="sn-network__about-row">
                <span className="sn-network__about-key">Version</span>
                <span className="sn-network__about-val">0.1.0-demo</span>
              </div>
              <div className="sn-network__about-row">
                <span className="sn-network__about-key">Model</span>
                <span className="sn-network__about-val">Planned: Gemini</span>
              </div>
              <div className="sn-network__about-row">
                <span className="sn-network__about-key">Conversations</span>
                <span className="sn-network__about-val">Static Only</span>
              </div>
              <div className="sn-network__about-row">
                <span className="sn-network__about-key">Response Time</span>
                <span className="sn-network__about-val">N/A (Demo)</span>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}

export default Sentinel
