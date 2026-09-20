import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../auth.jsx'

export default function LoginPage() {
  const { requestOtp, verifyOtp } = useAuth()
  const navigate = useNavigate()
  const [phone, setPhone] = useState('')
  const [otp, setOtp] = useState('')
  const [step, setStep] = useState('phone')
  const [hint, setHint] = useState(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function onRequest(e) {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      const data = await requestOtp(phone)
      setHint(data)
      setStep('otp')
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  async function onVerify(e) {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      await verifyOtp(phone.trim(), otp.trim())
      navigate('/update')
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="auth-page">
      <div className="auth-panel">
        <p className="eyebrow">Owner access</p>
        <h1>Phone login</h1>
        <p className="lede">
          Sign in with the mobile number on the owners list to add or update
          your flat’s registration, interior, ceremony, and moving status.
        </p>

        {step === 'phone' ? (
          <form onSubmit={onRequest} className="auth-form">
            <label>
              Mobile number
              <input
                type="tel"
                inputMode="numeric"
                autoComplete="tel"
                placeholder="10-digit number"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
              />
            </label>
            {error && <p className="form-error">{error}</p>}
            <button className="btn btn--primary" type="submit" disabled={busy}>
              {busy ? 'Checking…' : 'Send OTP'}
            </button>
          </form>
        ) : (
          <form onSubmit={onVerify} className="auth-form">
            <p className="otp-hint">
              OTP sent to {hint?.phoneMasked} for flat{' '}
              <strong>{hint?.flatNumber}</strong> ({hint?.ownerName}). Demo OTP:{' '}
              <code>1234</code>
            </p>
            <label>
              OTP
              <input
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="1234"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                required
              />
            </label>
            {error && <p className="form-error">{error}</p>}
            <div className="form-row">
              <button
                type="button"
                className="btn btn--ghost"
                onClick={() => {
                  setStep('phone')
                  setOtp('')
                  setError('')
                }}
              >
                Back
              </button>
              <button className="btn btn--primary" type="submit" disabled={busy}>
                {busy ? 'Verifying…' : 'Continue'}
              </button>
            </div>
          </form>
        )}

        <p className="demo-note">
          Try a seeded number such as <code>9000000042</code> (flat 101).
        </p>
      </div>
    </section>
  )
}
