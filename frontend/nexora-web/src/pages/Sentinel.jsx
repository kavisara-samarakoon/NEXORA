/**
 * Sentinel — NEXORA's AI-powered gaming assistant.
 *
 * This is a FRONTEND DEMO page only.
 * Real Gemini API integration will be added in a future update.
 * No messages are saved or sent anywhere.
 */

/* ── Static sample chat messages ── */
const SAMPLE_MESSAGES = [
  {
    id: 1,
    role: 'ai',
    text: 'Welcome to NEXORA Sentinel! I\'m your AI gaming assistant. Ask me about games, deals, giveaways, or account security. How can I help you today?',
    time: '10:30 AM',
  },
  {
    id: 2,
    role: 'user',
    text: 'Find me open-world RPGs under $25 on Steam',
    time: '10:31 AM',
  },
  {
    id: 3,
    role: 'ai',
    text: 'I found **8 open-world RPGs** under $25 on Steam right now:\n\n• **The Witcher 3: Wild Hunt** — $9.99 (−80%)\n• **Skyrim Special Edition** — $15.99 (−60%)\n• **Dragon\'s Dogma 2** — $23.99 (−40%)\n• **Kingdoms of Amalur** — $11.99 (−70%)\n\nWant me to add any of these to your wishlist or check prices on other stores?',
    time: '10:31 AM',
  },
  {
    id: 4,
    role: 'user',
    text: 'Add The Witcher 3 to my wishlist and set a price alert for $7.99',
    time: '10:32 AM',
  },
  {
    id: 5,
    role: 'ai',
    text: '✅ Done! **The Witcher 3: Wild Hunt** has been added to your wishlist.\n\n🔔 Price alert set for **$7.99** — I\'ll notify you instantly when it drops to that price on any supported store.\n\nThe historical low for this game is **$5.99** (Steam Summer Sale 2025), so your target is very achievable!',
    time: '10:32 AM',
  },
]

/* ── Capability info cards ── */
const CAPABILITY_CARDS = [
  {
    id: 1,
    icon: '🎮',
    title: 'Game Discovery Assistant',
    description: 'Search across 50,000+ titles by genre, price, rating, and platform. Get personalized recommendations based on your play history.',
    accentColor: 'orange',
  },
  {
    id: 2,
    icon: '💰',
    title: 'Deal Recommendation Support',
    description: 'Real-time deal tracking across Steam, Epic, GOG, Humble Bundle, and more. Never miss a price drop on games you love.',
    accentColor: 'blue',
  },
  {
    id: 3,
    icon: '🛡️',
    title: 'Account Safety Guidance',
    description: 'Check your account security status, manage sessions, review suspicious activity, and get recommendations to stay safe.',
    accentColor: 'green',
  },
  {
    id: 4,
    icon: '🔐',
    title: 'Cyber Security Awareness',
    description: 'Learn about phishing scams, fake game key sellers, and social engineering attacks targeting gamers.',
    accentColor: 'purple',
  },
]

/* ── Quick suggestion chips ── */
const QUICK_SUGGESTIONS = [
  'Find free games this week',
  'Best deals under $10',
  'Is my account secure?',
  'Upcoming game releases',
  'Compare prices for Elden Ring',
  'Steam sale predictions',
]

/**
 * Sentinel page component.
 *
 * Renders a premium AI chatbot interface with:
 * - Hero header with animated gradient title
 * - Glass chat panel with static sample messages
 * - Chat input with send button
 * - Capability info cards
 * - Status panel explaining the demo
 */
function Sentinel() {
  return (
    <div className="nx-content">

      {/* ── HERO HEADER ── */}
      <div className="sn-hero">
        {/* Decorative orbs */}
        <div className="sn-hero__orb sn-hero__orb--orange" />
        <div className="sn-hero__orb sn-hero__orb--blue" />

        <div className="sn-hero__inner">
          <div className="sn-hero__icon-wrap">
            <span className="sn-hero__icon">🤖</span>
            <span className="sn-hero__pulse" />
          </div>

          <div className="sn-hero__text">
            <h1 className="sn-hero__title">
              NEXORA <span>Sentinel</span>
            </h1>
            <p className="sn-hero__subtitle">
              AI assistant for game discovery, deal guidance and account safety
            </p>
          </div>

          {/* Demo badge */}
          <div className="sn-hero__demo-badge">
            <span className="sn-hero__demo-dot" />
            Frontend Demo
          </div>
        </div>
      </div>

      {/* ── MAIN LAYOUT: Chat + Sidebar ── */}
      <div className="sn-layout">

        {/* ── CHAT PANEL ── */}
        <div className="sn-chat">
          {/* Chat header */}
          <div className="sn-chat__header">
            <div className="sn-chat__header-left">
              <span className="sn-chat__header-icon">🤖</span>
              <div>
                <div className="sn-chat__header-name">Sentinel AI</div>
                <div className="sn-chat__header-status">
                  <span className="sn-chat__status-dot" />
                  Demo Mode — No real AI connected
                </div>
              </div>
            </div>
            <div className="sn-chat__header-actions">
              <button className="sn-chat__header-btn" title="Clear chat">🗑️</button>
              <button className="sn-chat__header-btn" title="Settings">⚙️</button>
            </div>
          </div>

          {/* Chat messages */}
          <div className="sn-chat__messages">
            {SAMPLE_MESSAGES.map((msg) => (
              <div
                key={msg.id}
                className={`sn-msg ${msg.role === 'user' ? 'sn-msg--user' : 'sn-msg--ai'}`}
              >
                {/* Avatar */}
                {msg.role === 'ai' && (
                  <div className="sn-msg__avatar sn-msg__avatar--ai">🤖</div>
                )}

                <div className="sn-msg__content">
                  <div className="sn-msg__bubble">
                    {/* Render text with basic markdown bold */}
                    {msg.text.split('\n').map((line, i) => (
                      <p key={i} className="sn-msg__line">
                        {line.split(/(\*\*.*?\*\*)/).map((part, j) =>
                          part.startsWith('**') && part.endsWith('**')
                            ? <strong key={j}>{part.slice(2, -2)}</strong>
                            : part
                        )}
                      </p>
                    ))}
                  </div>
                  <span className="sn-msg__time">{msg.time}</span>
                </div>

                {msg.role === 'user' && (
                  <div className="sn-msg__avatar sn-msg__avatar--user">You</div>
                )}
              </div>
            ))}

            {/* Typing indicator (static decoration) */}
            <div className="sn-msg sn-msg--ai">
              <div className="sn-msg__avatar sn-msg__avatar--ai">🤖</div>
              <div className="sn-msg__content">
                <div className="sn-msg__bubble sn-msg__bubble--typing">
                  <span className="sn-typing-dot" />
                  <span className="sn-typing-dot" />
                  <span className="sn-typing-dot" />
                </div>
              </div>
            </div>
          </div>

          {/* Quick suggestions */}
          <div className="sn-chat__suggestions">
            {QUICK_SUGGESTIONS.map((s, i) => (
              <button key={i} className="sn-suggestion-chip">
                {s}
              </button>
            ))}
          </div>

          {/* Chat input */}
          <div className="sn-chat__input-area">
            <div className="sn-chat__input-wrap">
              <input
                type="text"
                className="sn-chat__input"
                placeholder="Ask Sentinel about games, deals, giveaways or account security..."
                readOnly
              />
              <button className="sn-chat__send-btn" title="Send message">
                <span className="sn-chat__send-icon">➤</span>
              </button>
            </div>
            <p className="sn-chat__disclaimer">
              ⚡ This is a UI demo — messages are static samples. Real Gemini API integration coming soon.
            </p>
          </div>
        </div>

        {/* ── RIGHT SIDEBAR ── */}
        <div className="sn-sidebar">

          {/* Capability cards */}
          {CAPABILITY_CARDS.map((card) => (
            <div
              key={card.id}
              className={`sn-capability sn-capability--${card.accentColor}`}
            >
              <div className="sn-capability__icon-wrap">
                <span className="sn-capability__icon">{card.icon}</span>
              </div>
              <h3 className="sn-capability__title">{card.title}</h3>
              <p className="sn-capability__desc">{card.description}</p>
            </div>
          ))}

          {/* Status panel */}
          <div className="sn-status-panel">
            <h4 className="sn-status-panel__title">
              📡 System Status
            </h4>

            <div className="sn-status-row">
              <span className="sn-status-row__label">AI Status</span>
              <span className="sn-status-row__value sn-status-row__value--demo">
                <span className="sn-status-row__dot sn-status-row__dot--yellow" />
                Demo Mode
              </span>
            </div>

            <div className="sn-status-row">
              <span className="sn-status-row__label">Backend</span>
              <span className="sn-status-row__value sn-status-row__value--offline">
                <span className="sn-status-row__dot sn-status-row__dot--red" />
                Not Connected Yet
              </span>
            </div>

            <div className="sn-status-row">
              <span className="sn-status-row__label">Privacy</span>
              <span className="sn-status-row__value sn-status-row__value--safe">
                <span className="sn-status-row__dot sn-status-row__dot--green" />
                No real messages saved
              </span>
            </div>

            <div className="sn-status-panel__footer">
              <p>
                🔒 This page is a frontend prototype. No data is collected,
                stored, or transmitted. Real-time AI responses via Gemini API
                will be integrated in a future update.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Sentinel
