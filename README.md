# R V UDDIIPTA Owners Portal

Floor-wise owners portal for **R V UDDIIPTA** (Karmanghat). Next.js talks to Supabase directly. Sign-in is **Google only**.

Schema lives in `supabase/migrations/` and is synced with `npm run db:push`.

## Setup

```bash
npm install
npx supabase login
npm run db:link
npm run db:push
```

Add to `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=https://obhqikckxbfhsekanymv.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_publishable_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
ADMIN_EMAILS=you@gmail.com
```

`ADMIN_EMAILS` are **super admins**. They manage the portal from their account (Approvals, Owners, Builder, Roles). Deletes are type-to-confirm (unlink login, release a unit to unsold, or wipe household rows) and never remove brochure inventory.

## Enable Google login (required)

1. [Google Cloud Console](https://console.cloud.google.com/) → APIs & Services → Credentials → Create OAuth client (Web).
2. Authorized redirect URI:

   `https://obhqikckxbfhsekanymv.supabase.co/auth/v1/callback`

3. Supabase → Authentication → Providers → Google → turn on, paste Client ID and Client Secret.
4. Authentication → URL Configuration:
   - Site URL: `http://localhost:4800`
   - Redirect URLs: `http://localhost:4800/auth/callback`

The phone uses its own Google clients, and the same Google account still opens this community.

1. In the same Google project, create an **iOS** client with bundle ID `com.alnlabs.rvuddipta`.
2. Create an **Android** client with package `com.alnlabs.rvuddipta` and the app signing SHA-1.
3. Supabase → Authentication → Providers → Google → Client IDs: keep the website Web client id first, then add the iOS and Android client ids, separated by commas. Turn on **Skip nonce check**.
4. In `rv-uddipta-mobile/.env`, set `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` to the website Web client id, and `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID` to the iOS client id.
5. Build the phone app (`npx expo run:ios` or `npx expo run:android`). Expo Go keeps the website sign-in screen.

Then:

```bash
npm run seed
npm run dev
```

The app listens on **http://localhost:4800**.

`npm run seed` loads the 238 brochure flats (wings A/B, floors 1–10) as vacant units.
`npm run import:owners` applies the floor-wise owners PDF (`data/owners-floor-wise.json`) — names, phones, and co-owners as household members. Linked Google accounts are preserved.
Owners who are not on that list claim a vacant flat after admin approval.

## How access works

1. Owner taps **Continue with Google**.
2. If they have no approved flat, they submit name, phone, and a brochure flat such as `A101` or `B1004`.
3. A super admin listed in `ADMIN_EMAILS` opens **Approvals** on their account and approves.
4. Only then can they see owner names, phones, and possession progress.
5. On **My flat**, owners set registration / interior / ceremony / moving status **and dates**, and can add household members.

Brochure facts (address, RERA, amenities, flat types and sizes) are **public** on the home page before login.

Signed-in owners can open **3D** for an interactive Three.js schematic of the 238 flats. It is a massing model from the masterplan, not a photoreal tour.

## Deploy to Vercel

Set the same env vars, plus `SUPABASE_SERVICE_ROLE_KEY` and `ADMIN_EMAILS` (super admins). Add `https://your-app.vercel.app/auth/callback` to Supabase redirect URLs and set Site URL to the Vercel domain.
