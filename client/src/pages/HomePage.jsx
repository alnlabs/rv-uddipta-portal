import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import FlatGrid from '../components/FlatGrid.jsx'
import StatusLegend from '../components/StatusLegend.jsx'

export default function HomePage() {
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [activeFloor, setActiveFloor] = useState(null)

  useEffect(() => {
    let cancelled = false
    fetch('/api/flats')
      .then(async (res) => {
        if (!res.ok) throw new Error('Could not load flats')
        return res.json()
      })
      .then((json) => {
        if (cancelled) return
        setData(json)
        setActiveFloor(json.floors[0]?.floor ?? null)
      })
      .catch((err) => {
        if (!cancelled) setError(err.message)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const selected = data?.floors.find((f) => f.floor === activeFloor)

  return (
    <>
      <section className="hero">
        <div className="hero__atmosphere" aria-hidden="true" />
        <div className="hero__content">
          <p className="hero__eyebrow">Karmanghat · Owners community</p>
          <h1 className="hero__brand">R V UDDIIPTA</h1>
          <p className="hero__lede">
            Floor-wise view of registration, interior, ceremony, and moving-in
            status across the owners list.
          </p>
          <div className="hero__actions">
            <a href="#floors" className="btn btn--primary">
              Browse floors
            </a>
            <Link to="/login" className="btn btn--ghost">
              Update with phone
            </Link>
          </div>
        </div>
      </section>

      <section className="pulse" aria-label="Possession snapshot">
        {data ? (
          <ul className="pulse__list">
            <li>
              <strong>{data.total}</strong>
              <span>Flats seeded</span>
            </li>
            <li>
              <strong>{data.summary.registrationCompleted}</strong>
              <span>Registered</span>
            </li>
            <li>
              <strong>{data.summary.interiorCompleted}</strong>
              <span>Interior done</span>
            </li>
            <li>
              <strong>{data.summary.ceremonyCompleted}</strong>
              <span>Ceremony done</span>
            </li>
            <li>
              <strong>{data.summary.movedIn}</strong>
              <span>Moved in</span>
            </li>
          </ul>
        ) : (
          <p className="muted">{error || 'Gathering floor data…'}</p>
        )}
      </section>

      <section id="floors" className="floors">
        <div className="section-head">
          <h2>Floor-wise flats</h2>
          <p>Select a floor to see each flat’s possession progress.</p>
        </div>

        <StatusLegend />

        {error && <p className="error-banner">{error}</p>}

        {data && (
          <>
            <div className="floor-tabs" role="tablist" aria-label="Floors">
              {data.floors.map((floor) => (
                <button
                  key={floor.floor}
                  type="button"
                  role="tab"
                  aria-selected={activeFloor === floor.floor}
                  className={
                    activeFloor === floor.floor
                      ? 'floor-tab is-active'
                      : 'floor-tab'
                  }
                  onClick={() => setActiveFloor(floor.floor)}
                >
                  <span>Floor</span>
                  <strong>{floor.floor}</strong>
                </button>
              ))}
            </div>

            {selected && (
              <FlatGrid floor={selected.floor} flats={selected.flats} />
            )}
          </>
        )}
      </section>
    </>
  )
}
