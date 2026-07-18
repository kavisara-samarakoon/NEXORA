import { useState } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './App.css'

/* ── Components ── */
import Sidebar from './components/Sidebar'
import Topbar from './components/Topbar'
import SentinelButton from './components/SentinelButton'

/* ── Pages ── */
import Dashboard from './pages/Dashboard'
import Deals from './pages/Deals'
import Giveaways from './pages/Giveaways'
import Wishlist from './pages/Wishlist'
import Security from './pages/Security'
import Sentinel from './pages/Sentinel'
import Settings from './pages/Settings'

/**
 * App — Root layout that composes the sidebar shell + routed pages.
 *
 * Manages the mobile sidebar open/close state.
 * BrowserRouter wraps everything so sidebar NavLinks and page Routes work.
 */
function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const closeSidebar = () => setSidebarOpen(false)

  return (
    <BrowserRouter>
      <div className="nx-layout">
        {/* ── Mobile hamburger ── */}
        <button
          className="nx-hamburger"
          onClick={() => setSidebarOpen(!sidebarOpen)}
          aria-label="Toggle sidebar"
        >
          {sidebarOpen ? '✕' : '☰'}
        </button>

        {/* ── Mobile overlay ── */}
        {sidebarOpen && (
          <div className="nx-overlay nx-overlay--visible" onClick={closeSidebar} />
        )}

        {/* ── Sidebar ── */}
        <Sidebar isOpen={sidebarOpen} onClose={closeSidebar} />

        {/* ── Main content area ── */}
        <main className="nx-main">
          <Topbar />

          {/* Page routes */}
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/deals" element={<Deals />} />
            <Route path="/giveaways" element={<Giveaways />} />
            <Route path="/wishlist" element={<Wishlist />} />
            <Route path="/security" element={<Security />} />
            <Route path="/sentinel" element={<Sentinel />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </main>

        {/* ── Floating AI button ── */}
        <SentinelButton />
      </div>
    </BrowserRouter>
  )
}

export default App
