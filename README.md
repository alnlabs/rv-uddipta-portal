# R V UDDIIPTA Owners Portal

Floor-wise owners portal for **R V UDDIIPTA** (Karmanghat): view registration, interior, ceremony, and moving status across 58 seeded flats. Owners sign in with their phone number to add or update their flat’s status.

## Stack

- **Client:** Vite + React
- **Server:** Express + SQLite (`better-sqlite3`)

## Quick start

```bash
npm install
npm install --prefix server
npm install --prefix client
npm run dev
```

- Portal: http://localhost:5173  
- API: http://localhost:3001  

## Seed data

On first launch the API seeds **58 flats**:

- Floors **1–14**: 4 flats each (`101`–`104` … `1401`–`1404`)
- Floor **15**: 2 flats (`1501`, `1502`)

Each flat has an owner name and phone from the owners list.

## Phone login (demo)

1. Open **Phone login**
2. Use a seeded number, e.g. `9000000042` (flat `101`)
3. Enter OTP `1234`
4. Update registration / interior / ceremony / moving

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | API + Vite together |
| `npm run seed` | Wipe DB and reseed 58 flats |
| `npm run build` | Build the React client |
