const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const { buildFlats } = require('./seed');

const dataDir = path.join(__dirname, 'data');
const dbPath = path.join(dataDir, 'uddipta.db');

function ensureDb() {
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL');

  db.exec(`
    CREATE TABLE IF NOT EXISTS flats (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      flat_number TEXT NOT NULL UNIQUE,
      floor INTEGER NOT NULL,
      unit INTEGER NOT NULL,
      type TEXT NOT NULL,
      owner_name TEXT NOT NULL,
      phone TEXT NOT NULL,
      registration TEXT NOT NULL DEFAULT 'pending',
      interior TEXT NOT NULL DEFAULT 'not_started',
      ceremony TEXT NOT NULL DEFAULT 'pending',
      moving TEXT NOT NULL DEFAULT 'pending',
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS sessions (
      token TEXT PRIMARY KEY,
      phone TEXT NOT NULL,
      flat_number TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  const count = db.prepare('SELECT COUNT(*) AS c FROM flats').get().c;
  if (count === 0) {
    const insert = db.prepare(`
      INSERT INTO flats (
        flat_number, floor, unit, type, owner_name, phone,
        registration, interior, ceremony, moving
      ) VALUES (
        @flatNumber, @floor, @unit, @type, @ownerName, @phone,
        @registration, @interior, @ceremony, @moving
      )
    `);

    const seed = db.transaction((flats) => {
      for (const flat of flats) {
        insert.run(flat);
      }
    });

    seed(buildFlats());
  }

  return db;
}

function mapFlat(row) {
  if (!row) return null;
  return {
    id: row.id,
    flatNumber: row.flat_number,
    floor: row.floor,
    unit: row.unit,
    type: row.type,
    ownerName: row.owner_name,
    phone: row.phone,
    registration: row.registration,
    interior: row.interior,
    ceremony: row.ceremony,
    moving: row.moving,
    updatedAt: row.updated_at,
  };
}

module.exports = { ensureDb, mapFlat, dbPath };
