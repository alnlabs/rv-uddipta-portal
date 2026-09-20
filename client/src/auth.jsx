import { createContext, useContext, useEffect, useState } from 'react'

const AuthContext = createContext(null)
const TOKEN_KEY = 'uddipta_token'

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY))
  const [owner, setOwner] = useState(null)
  const [flat, setFlat] = useState(null)
  const [loading, setLoading] = useState(Boolean(localStorage.getItem(TOKEN_KEY)))

  useEffect(() => {
    if (!token) {
      setOwner(null)
      setFlat(null)
      setLoading(false)
      return
    }

    let cancelled = false
    setLoading(true)

    fetch('/api/me', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async (res) => {
        if (!res.ok) throw new Error('Session expired')
        return res.json()
      })
      .then((data) => {
        if (cancelled) return
        setOwner(data.owner)
        setFlat(data.flat)
      })
      .catch(() => {
        if (cancelled) return
        localStorage.removeItem(TOKEN_KEY)
        setToken(null)
        setOwner(null)
        setFlat(null)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [token])

  async function requestOtp(phone) {
    const res = await fetch('/api/auth/request-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Could not send OTP')
    return data
  }

  async function verifyOtp(phone, otp) {
    const res = await fetch('/api/auth/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, otp }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Login failed')
    localStorage.setItem(TOKEN_KEY, data.token)
    setToken(data.token)
    setOwner(data.owner)
    setFlat(data.flat)
    return data
  }

  async function logout() {
    if (token) {
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => {})
    }
    localStorage.removeItem(TOKEN_KEY)
    setToken(null)
    setOwner(null)
    setFlat(null)
  }

  async function updateFlat(payload) {
    if (!token || !flat) throw new Error('Not logged in')
    const res = await fetch(`/api/flats/${flat.flatNumber}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Update failed')
    setFlat(data)
    return data
  }

  return (
    <AuthContext.Provider
      value={{
        token,
        owner,
        flat,
        loading,
        requestOtp,
        verifyOtp,
        logout,
        updateFlat,
        setFlat,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
