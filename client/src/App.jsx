import { Link, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { useAuth } from './auth.jsx'
import HomePage from './pages/HomePage.jsx'
import LoginPage from './pages/LoginPage.jsx'
import UpdatePage from './pages/UpdatePage.jsx'
import './App.css'

export default function App() {
  const { owner, logout, loading } = useAuth()
  const location = useLocation()

  return (
    <div className="app-shell">
      <header className="site-header">
        <Link to="/" className="brand-mark" aria-label="R V UDDIIPTA home">
          <span className="brand-mark__sigil">RV</span>
          <span className="brand-mark__text">
            <strong>R V UDDIIPTA</strong>
            <em>Owners Portal</em>
          </span>
        </Link>

        <nav className="site-nav">
          <Link
            to="/"
            className={location.pathname === '/' ? 'is-active' : undefined}
          >
            Floors
          </Link>
          {owner ? (
            <>
              <Link
                to="/update"
                className={location.pathname === '/update' ? 'is-active' : undefined}
              >
                My flat
              </Link>
              <button type="button" className="linkish" onClick={logout}>
                Sign out
              </button>
            </>
          ) : (
            <Link
              to="/login"
              className={
                location.pathname === '/login'
                  ? 'is-active nav-cta'
                  : 'nav-cta'
              }
            >
              Phone login
            </Link>
          )}
        </nav>
      </header>

      <main>
        {loading ? (
          <div className="page-loading">Loading portal…</div>
        ) : (
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route
              path="/login"
              element={owner ? <Navigate to="/update" replace /> : <LoginPage />}
            />
            <Route
              path="/update"
              element={owner ? <UpdatePage /> : <Navigate to="/login" replace />}
            />
          </Routes>
        )}
      </main>

      <footer className="site-footer">
        <p>R V UDDIIPTA · Karmanghat · Owners possession tracker</p>
      </footer>
    </div>
  )
}
