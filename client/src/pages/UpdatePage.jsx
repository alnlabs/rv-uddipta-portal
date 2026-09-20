import { useEffect, useState } from 'react'
import { useAuth } from '../auth.jsx'
import StatusPills from '../components/StatusPills.jsx'

const FIELDS = [
  {
    key: 'registration',
    label: 'Registration',
    options: [
      { value: 'pending', label: 'Pending' },
      { value: 'completed', label: 'Completed' },
    ],
  },
  {
    key: 'interior',
    label: 'Interior',
    options: [
      { value: 'not_started', label: 'Not started' },
      { value: 'in_progress', label: 'In progress' },
      { value: 'completed', label: 'Completed' },
    ],
  },
  {
    key: 'ceremony',
    label: 'Ceremony',
    options: [
      { value: 'pending', label: 'Pending' },
      { value: 'completed', label: 'Completed' },
    ],
  },
  {
    key: 'moving',
    label: 'Moving',
    options: [
      { value: 'pending', label: 'Pending' },
      { value: 'moved_in', label: 'Moved in' },
    ],
  },
]

export default function UpdatePage() {
  const { owner, flat, updateFlat } = useAuth()
  const [form, setForm] = useState(null)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!flat) return
    setForm({
      ownerName: flat.ownerName,
      registration: flat.registration,
      interior: flat.interior,
      ceremony: flat.ceremony,
      moving: flat.moving,
    })
  }, [flat])

  if (!flat || !form) {
    return <div className="page-loading">Loading your flat…</div>
  }

  async function onSubmit(e) {
    e.preventDefault()
    setBusy(true)
    setError('')
    setMessage('')
    try {
      await updateFlat(form)
      setMessage('Status saved for your flat.')
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="update-page">
      <div className="update-hero">
        <p className="eyebrow">Signed in as {owner.phoneMasked}</p>
        <h1>
          Flat <span>{flat.flatNumber}</span>
        </h1>
        <p className="lede">
          Floor {flat.floor} · {flat.type} · Update possession milestones for
          the owners board.
        </p>
        <StatusPills flat={flat} />
      </div>

      <form className="update-form" onSubmit={onSubmit}>
        <label>
          Owner name
          <input
            type="text"
            value={form.ownerName}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, ownerName: e.target.value }))
            }
            required
          />
        </label>

        <div className="status-fields">
          {FIELDS.map((field) => (
            <fieldset key={field.key}>
              <legend>{field.label}</legend>
              <div className="option-row">
                {field.options.map((opt) => (
                  <label key={opt.value} className="radio-chip">
                    <input
                      type="radio"
                      name={field.key}
                      value={opt.value}
                      checked={form[field.key] === opt.value}
                      onChange={() =>
                        setForm((prev) => ({ ...prev, [field.key]: opt.value }))
                      }
                    />
                    <span>{opt.label}</span>
                  </label>
                ))}
              </div>
            </fieldset>
          ))}
        </div>

        {error && <p className="form-error">{error}</p>}
        {message && <p className="form-ok">{message}</p>}

        <button className="btn btn--primary" type="submit" disabled={busy}>
          {busy ? 'Saving…' : 'Save status'}
        </button>
      </form>
    </section>
  )
}
