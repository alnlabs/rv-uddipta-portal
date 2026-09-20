const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const { ensureDb, mapFlat } = require('./db');

const app = express();
const PORT = process.env.PORT || 3001;
const DEMO_OTP = '1234';

const db = ensureDb();

app.use(cors());
app.use(express.json());

function publicFlat(flat) {
  if (!flat) return null;
  return {
    id: flat.id,
    flatNumber: flat.flatNumber,
    floor: flat.floor,
    unit: flat.unit,
    type: flat.type,
    ownerName: flat.ownerName,
    phoneMasked: maskPhone(flat.phone),
    registration: flat.registration,
    interior: flat.interior,
    ceremony: flat.ceremony,
    moving: flat.moving,
    updatedAt: flat.updatedAt,
  };
}

function maskPhone(phone) {
  if (!phone || phone.length < 4) return '****';
  return `${phone.slice(0, 2)}******${phone.slice(-2)}`;
}

function getSession(req) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return null;
  return db.prepare('SELECT * FROM sessions WHERE token = ?').get(token) || null;
}

app.get('/api/health', (_req, res) => {
  const count = db.prepare('SELECT COUNT(*) AS c FROM flats').get().c;
  res.json({ ok: true, flats: count, brand: 'R V UDDIIPTA' });
});

app.get('/api/flats', (_req, res) => {
  const rows = db
    .prepare('SELECT * FROM flats ORDER BY floor ASC, unit ASC')
    .all()
    .map(mapFlat)
    .map(publicFlat);

  const byFloor = {};
  for (const flat of rows) {
    const key = String(flat.floor);
    if (!byFloor[key]) byFloor[key] = [];
    byFloor[key].push(flat);
  }

  const floors = Object.keys(byFloor)
    .map(Number)
    .sort((a, b) => a - b)
    .map((floor) => ({
      floor,
      flats: byFloor[String(floor)],
    }));

  res.json({
    total: rows.length,
    floors,
    flats: rows,
    summary: summarize(rows),
  });
});

app.get('/api/flats/:flatNumber', (req, res) => {
  const row = db
    .prepare('SELECT * FROM flats WHERE flat_number = ?')
    .get(req.params.flatNumber);
  const flat = publicFlat(mapFlat(row));
  if (!flat) {
    return res.status(404).json({ error: 'Flat not found' });
  }
  res.json(flat);
});

app.post('/api/auth/request-otp', (req, res) => {
  const phone = normalizePhone(req.body?.phone);
  if (!phone) {
    return res.status(400).json({ error: 'Enter a valid 10-digit phone number' });
  }

  const flat = mapFlat(
    db.prepare('SELECT * FROM flats WHERE phone = ?').get(phone),
  );

  if (!flat) {
    return res.status(404).json({
      error: 'No owner found for this phone. Use a seeded owners-list number.',
    });
  }

  res.json({
    ok: true,
    message: 'OTP sent (demo). Use 1234 to continue.',
    phoneMasked: maskPhone(phone),
    flatNumber: flat.flatNumber,
    ownerName: flat.ownerName,
  });
});

app.post('/api/auth/verify', (req, res) => {
  const phone = normalizePhone(req.body?.phone);
  const otp = String(req.body?.otp || '').trim();

  if (!phone) {
    return res.status(400).json({ error: 'Enter a valid 10-digit phone number' });
  }
  if (otp !== DEMO_OTP) {
    return res.status(401).json({ error: 'Invalid OTP. Demo OTP is 1234.' });
  }

  const flat = mapFlat(
    db.prepare('SELECT * FROM flats WHERE phone = ?').get(phone),
  );
  if (!flat) {
    return res.status(404).json({ error: 'No owner found for this phone' });
  }

  const token = crypto.randomBytes(24).toString('hex');
  db.prepare(
    'INSERT INTO sessions (token, phone, flat_number) VALUES (?, ?, ?)',
  ).run(token, phone, flat.flatNumber);

  res.json({
    token,
    owner: {
      phone,
      phoneMasked: maskPhone(phone),
      ownerName: flat.ownerName,
      flatNumber: flat.flatNumber,
    },
    flat: {
      ...publicFlat(flat),
      phone,
    },
  });
});

app.get('/api/me', (req, res) => {
  const session = getSession(req);
  if (!session) {
    return res.status(401).json({ error: 'Not logged in' });
  }

  const flat = mapFlat(
    db.prepare('SELECT * FROM flats WHERE flat_number = ?').get(session.flat_number),
  );
  if (!flat) {
    return res.status(404).json({ error: 'Flat not found' });
  }

  res.json({
    owner: {
      phone: session.phone,
      phoneMasked: maskPhone(session.phone),
      ownerName: flat.ownerName,
      flatNumber: flat.flatNumber,
    },
    flat: {
      ...publicFlat(flat),
      phone: flat.phone,
    },
  });
});

app.patch('/api/flats/:flatNumber', (req, res) => {
  const session = getSession(req);
  if (!session) {
    return res.status(401).json({ error: 'Login with your phone to update status' });
  }

  if (session.flat_number !== req.params.flatNumber) {
    return res.status(403).json({ error: 'You can only update your own flat' });
  }

  const allowed = {
    registration: ['pending', 'completed'],
    interior: ['not_started', 'in_progress', 'completed'],
    ceremony: ['pending', 'completed'],
    moving: ['pending', 'moved_in'],
  };

  const updates = [];
  const values = [];

  for (const key of Object.keys(allowed)) {
    if (req.body?.[key] !== undefined) {
      if (!allowed[key].includes(req.body[key])) {
        return res.status(400).json({
          error: `Invalid ${key} value`,
          allowed: allowed[key],
        });
      }
      updates.push(`${key} = ?`);
      values.push(req.body[key]);
    }
  }

  if (req.body?.ownerName !== undefined) {
    const name = String(req.body.ownerName).trim();
    if (name.length < 2) {
      return res.status(400).json({ error: 'Owner name is too short' });
    }
    updates.push('owner_name = ?');
    values.push(name);
  }

  if (updates.length === 0) {
    return res.status(400).json({ error: 'No valid fields to update' });
  }

  updates.push("updated_at = datetime('now')");
  values.push(req.params.flatNumber);

  db.prepare(
    `UPDATE flats SET ${updates.join(', ')} WHERE flat_number = ?`,
  ).run(...values);

  const flat = mapFlat(
    db.prepare('SELECT * FROM flats WHERE flat_number = ?').get(req.params.flatNumber),
  );

  res.json({
    ...publicFlat(flat),
    phone: flat.phone,
  });
});

app.post('/api/auth/logout', (req, res) => {
  const session = getSession(req);
  if (session) {
    db.prepare('DELETE FROM sessions WHERE token = ?').run(session.token);
  }
  res.json({ ok: true });
});

function normalizePhone(raw) {
  if (!raw) return null;
  const digits = String(raw).replace(/\D/g, '');
  const phone = digits.length === 12 && digits.startsWith('91')
    ? digits.slice(2)
    : digits.length === 11 && digits.startsWith('0')
      ? digits.slice(1)
      : digits;
  return /^\d{10}$/.test(phone) ? phone : null;
}

function summarize(flats) {
  return {
    registrationCompleted: flats.filter((f) => f.registration === 'completed').length,
    interiorInProgress: flats.filter((f) => f.interior === 'in_progress').length,
    interiorCompleted: flats.filter((f) => f.interior === 'completed').length,
    ceremonyCompleted: flats.filter((f) => f.ceremony === 'completed').length,
    movedIn: flats.filter((f) => f.moving === 'moved_in').length,
  };
}

app.listen(PORT, () => {
  const count = db.prepare('SELECT COUNT(*) AS c FROM flats').get().c;
  console.log(`R V UDDIIPTA API on http://localhost:${PORT} (${count} flats seeded)`);
});
