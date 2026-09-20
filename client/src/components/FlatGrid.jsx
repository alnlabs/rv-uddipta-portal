import StatusPills from './StatusPills.jsx'

export default function FlatGrid({ floor, flats }) {
  return (
    <div className="flat-grid-wrap">
      <div className="flat-grid-head">
        <h3>Floor {floor}</h3>
        <p>{flats.length} flats</p>
      </div>
      <ul className="flat-grid">
        {flats.map((flat, index) => (
          <li
            key={flat.flatNumber}
            className="flat-row"
            style={{ '--i': index }}
          >
            <div className="flat-row__meta">
              <strong className="flat-no">{flat.flatNumber}</strong>
              <span className="flat-type">{flat.type}</span>
              <span className="flat-owner">{flat.ownerName}</span>
              <span className="flat-phone">{flat.phoneMasked}</span>
            </div>
            <StatusPills flat={flat} />
          </li>
        ))}
      </ul>
    </div>
  )
}
