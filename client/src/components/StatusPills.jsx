const LABELS = {
  registration: {
    pending: 'Reg pending',
    completed: 'Registered',
  },
  interior: {
    not_started: 'Interior soon',
    in_progress: 'Interior on',
    completed: 'Interior done',
  },
  ceremony: {
    pending: 'Ceremony soon',
    completed: 'Ceremony done',
  },
  moving: {
    pending: 'Not moved',
    moved_in: 'Moved in',
  },
}

export default function StatusPills({ flat }) {
  return (
    <ul className="status-pills" aria-label={`Status for flat ${flat.flatNumber}`}>
      <li className={`pill pill--reg pill--${flat.registration}`}>
        {LABELS.registration[flat.registration]}
      </li>
      <li className={`pill pill--int pill--${flat.interior}`}>
        {LABELS.interior[flat.interior]}
      </li>
      <li className={`pill pill--cer pill--${flat.ceremony}`}>
        {LABELS.ceremony[flat.ceremony]}
      </li>
      <li className={`pill pill--mov pill--${flat.moving}`}>
        {LABELS.moving[flat.moving]}
      </li>
    </ul>
  )
}
