# Roles — who sees what and who can do what

This describes how access works across the **website** (`rv-uddipta-portal`) and the **phone app** (`rv-uddipta-mobile`). Behaviour comes from three layers:

1. **Active role** on the person’s profile (`profiles.role`, optional `flat_id`)
2. **Feature switches** (`community_features`) — a feature turned off is closed for everyone
3. **Per-role permissions** (`role_permissions`) — optional overrides set by super admin under **Account → Permissions**

For **Work list / Roles / People / Areas / Reminders** (duties, extra duty, authorable labels, period owners), see [EMPLOYEES_ROLES_TASKS.md](./EMPLOYEES_ROLES_TASKS.md). The Work list can link to live **Jobs** (suggested For role + preferred assignees). **Areas** set who looks after repairs/gate/notices for a period — Jobs follow the current repairs owner (seeded to builder until handover). Gate screens stay security-only.

If no override is saved for a feature, the **defaults** below apply.

```mermaid
flowchart TD
  A[Sign in] --> B[Active role + optional flat]
  B --> C{Feature enabled?}
  C -->|No| Z[Hidden for everyone]
  C -->|Yes| D{Permission for this role?}
  D -->|Saved row| E[none / view / manage]
  D -->|No row| F[Code defaults]
  E --> G[UI + RPC enforce]
  F --> G
```

Access levels for a feature:

| Level | Meaning |
| --- | --- |
| **No access** | Feature is hidden |
| **Can look** | Can open and read |
| **Can change** | Can create or update |

A person can hold **more than one role** (`person_roles`) and switch the active one. Flat-linked roles (owner / family / tenant) are tied to a home number.

```mermaid
flowchart LR
  P[One login] --> R1[Active role]
  P --> R2[Other held roles]
  R2 -->|Switch role| R1
  R1 --> H{Needs a home?}
  H -->|owner / family / tenant| F[flat_id]
  H -->|office roles| N[No flat required]
```

---

## Sign-in paths

| Who | How they sign in |
| --- | --- |
| Residents (owner, family, tenant), visitors, society admin, builder, committee | Google (website + phone) |
| Facility, staff, security (office team) | Usually **phone + PIN** on the app; provisioned by admin |
| Super admin | Google account listed in `ADMIN_EMAILS` / admin phones |

```mermaid
flowchart TD
  subgraph Google["Google sign-in"]
    O[Owner / Family / Tenant]
    V[Visitor]
    A[Society admin]
    B[Builder]
    C[Committee]
    S[Super admin]
  end
  subgraph PhonePIN["Phone + PIN"]
    F[Facility]
    ST[Staff]
    SE[Security]
  end
  Google --> W[Website + phone]
  PhonePIN --> M[Phone app]
```

---

## Role map (quick)

| Role | Home after login | Typical place |
| --- | --- | --- |
| **Super admin** | Admin desk only | Platform control — not a society flat |
| **Admin** (society) | `/account` / office on phone | Approvals, flats, billing, team |
| **Builder** | Building details (+ Jobs while repairs owner) | Public project facts; repairs desk until handover |
| **Owner** | Home / feed | That flat’s resident |
| **Family** (`co_owner`) | Home / feed | Same home as owner |
| **Tenant** | Home / feed | Lives in a home; fewer home edits |
| **Visitor** | Join / browse | Signed in, no flat yet |
| **Committee** | Committee | Society decisions |
| **Facility** | Jobs (+ home on phone) | Maintenance desk |
| **Staff** | My work | Assigned jobs only |
| **Security** | Gate | Gate + security ops |

```mermaid
flowchart TB
  SA[Super admin]
  SA -->|assigns| AD[Society admin]
  AD -->|assigns| BL[Builder]
  AD -->|assigns| CM[Committee]
  AD -->|assigns| FA[Facility]
  AD -->|assigns| ST[Staff]
  AD -->|assigns| SE[Security]
  AD -->|links to flat| OW[Owner]
  AD -->|links to flat| FM[Family]
  AD -->|links to flat| TN[Tenant]
  V[Visitor] -->|join approved| OW
  V -->|join approved| FM
  V -->|join approved| TN
```

---

## Super admin

Not a `profiles.role` value — detected from env (`ADMIN_EMAILS` / admin phones).

```mermaid
flowchart LR
  SA[Super admin]
  SA --> F[Features on/off]
  SA --> P[Permissions matrix]
  SA --> A[Assign society admin]
  SA --> D[All admin desks]
  SA --> O[Phone: office shell only]
  SA -.->|blocked| G[Gate desk]
  SA -.->|blocked| FL[Own a society flat]
```

**Can**

- Turn features on/off
- Edit **Permissions** for every role
- Assign **society admin**
- Full admin desks (flats, join requests, reports, audit, categories, …)
- Use the phone **office** shell only (not resident / gate / staff shells)
- Manage everything except the **gate desk** (gate stays security-only)

**Cannot**

- Own or link a society flat on that same login
- Run the security gate as gate staff

---

## Admin (society admin)

Assigned by super admin. Active role `admin`.

```mermaid
flowchart TB
  AD[Society admin]
  AD --> M[Members + flats + roles]
  AD --> B[Billing ledger + proof confirm]
  AD --> J[Jobs / parking / docs / NOCs]
  AD --> C[Circulars / ops / assets]
  AD --> S[Security ops desk]
  AD -.->|not unless switched| G[Gate entry desk]
  AD -.->|not| PF[Platform Features / Permissions]
```

**Can see / do**

- Admin desks: new members, flats, roles (facility / security / committee / staff / builder), requests, forms, jobs, categories, reports, home records, parking, billing, NOCs, workforce, ops, assets, circulars, security ops
- Community features with **manage** by default (when the feature is on)
- Post dues, confirm/reject payment proofs, record office ledger entries
- Publish circulars, ops logs, assets/AMC
- Committee and facility tools as admin

**Cannot**

- Change platform feature toggles / permission matrix (super admin)
- Operate the gate as security (unless they switch to a security role they hold)

**Phone:** office / admin surfaces; may also hold other roles and switch.

---

## Builder

```mermaid
flowchart LR
  B[Builder]
  B --> BD[Building / project details]
  B --> J[Jobs while repairs area owner]
  B --> CF[Community features if granted]
  B -.->|no| AP[Approve owners]
  B -.->|no| BL[Billing / flats / roles desks]
```

**Can**

- Edit **building / project details** (brochure-style facts the public site shows)
- Run the **Jobs** desk while Areas → Repairs names Builder as the period owner (default seed; change to Facility after handover)
- Use community features that are enabled and granted (default: manage for catalog features, same community fallback as other society roles)

**Cannot**

- Approve owners or assign society admin
- Run billing / flats / roles desks (those are admin)
- Keep Jobs after repairs ownership moves to Facility (or another role)

**Home:** `/account/builder`

---

## Owner

Linked to one sold flat. Primary resident account for that home.

```mermaid
flowchart TB
  O[Owner of a flat]
  O --> C[Community: feed, events, polls, forms, inbox]
  O --> S[Services: complaints, amenities, parking, dues]
  O --> V[Visitors: gate passes + helper passes]
  O --> P[Papers: home records + NOCs manage]
  O --> U[Upload payment proof]
  O -.->|no| AD[Admin desks]
  O -.->|no| G[Gate desk]
```

**Can**

- Community: feed, announcements, events, polls, forms, neighbours, inbox (when features are on)
- Services: complaints/requests, amenities booking, parking vehicles, maintenance notices, dues (view invoices + upload payment proof)
- Visitors: create gate passes, approve visitors for their home, helpers/vendors passes
- Papers: home records + NOC requests (**manage**)
- Building ops / circulars when those features are on
- Update flat household details they are allowed to edit

**Cannot**

- Admin desks (flats, roles, dues posting, feature toggles)
- Gate desk
- Edit another home’s records

**Phone home:** resident tabs (Home, Services, …)

---

## Family (`co_owner`)

Family on the same flat as an owner.

```mermaid
flowchart LR
  F[Family on flat]
  F --> H[Same home services as owner]
  F --> N[NOCs / records: manage]
  F -.->|no| OR[Owner-of-record sale admin]
  F -.->|no| AD[Admin / gate desks]
```

**Can**

- Same community and home services as owner for that flat (passes, parking, dues proof, complaints, etc.)
- Home records / NOCs: **manage** (same as owner by default)

**Cannot**

- Act as the brochure “owner of record” for sale/ownership admin flows
- Admin / gate desks

---

## Tenant

Lives in a flat; not the owner.

```mermaid
flowchart LR
  T[Tenant]
  T --> D[Day-to-day: passes, complaints, dues proof]
  T --> R[Home records: view only]
  T -.->|no| E[Edit possession / verification]
  T -.->|no| AD[Admin / gate desks]
```

**Can**

- Community and day-to-day services for that home (passes, complaints, amenities, dues view + proof upload, helpers, circulars, …) when features allow
- Home records: **look** only by default (not edit possession/verification notes)

**Cannot**

- Change owner journey / possession-style home record edits (default)
- Admin / gate desks

---

## Visitor (signed in, no flat)

```mermaid
flowchart TD
  V[Visitor signed in]
  V --> J[Request to join a flat]
  V --> B[Browse while pending]
  J -->|Admin approves| R[Owner / Family / Tenant]
  V -.->|blocked until linked| C[Community home]
  V -.->|blocked| P[Passes / parking / dues]
  V -.->|blocked| O[Office desks]
```

**Can**

- Sign in and request to join a flat (or browse while pending, depending on join state)
- Very limited community until approved and linked

**Cannot**

- See owner directories / private community as a resident
- Create passes, pay-proof, parking, complaints tied to a home
- Any office desk

Until an admin (or join flow) links them as owner / family / tenant, they stay outside the home.

---

## Committee

Society committee member. Not required to be tied to a home (may still hold a home role separately and switch).

```mermaid
flowchart LR
  C[Committee]
  C --> D[Decisions / policies / votes]
  C --> X[Circulars + community if granted]
  C -.->|no| F[Flats / roles / billing]
  C -.->|no| G[Gate]
  C -.->|no| J[Assign facility jobs]
```

**Can**

- Committee desk: decisions, policies, votes (**manage** on `committee` by default)
- Community features granted by permissions (defaults follow the feature catalog for community roles)
- Circulars / other community tools when enabled

**Cannot**

- Flats / roles / billing admin desks (unless also admin)
- Gate
- Facility job assignment (unless also facility/admin)

**Home:** `/committee` (website); committee entry on phone Services when active.

---

## Facility manager

```mermaid
flowchart LR
  F[Facility]
  F --> J[Jobs desk: open + assign]
  F --> W[Phone: work + home shells]
  F -.->|no| A[Flats / roles / billing]
  F -.->|no| G[Gate]
```

**Can**

- Maintenance **jobs** desk: open work, assign staff (**manage** on `maintenance`)
- Phone: work shell + home (for Manage bookings/jobs under resident routes)
- Other features per permissions defaults

**Cannot**

- Society admin flats/roles/billing (unless also admin)
- Gate

**Home:** `/account/jobs`

---

## Staff (service staff)

```mermaid
flowchart LR
  S[Staff]
  S --> M[My work: assigned jobs]
  S --> U[Update own job status]
  S --> A[Appear on attendance list]
  S -.->|no| AS[Assign jobs to others]
  S -.->|no| G[Gate / billing admin]
```

**Can**

- **My work** — jobs assigned to them; update status on their jobs
- Attendance flows used by staff/facility (security marks attendance; staff appear on the list)

**Cannot**

- Assign work to others (facility/admin)
- Resident home services unless they also hold a home role and switch to it
- Gate / billing admin

**Home:** `/work` (website), staff shell on phone

---

## Security

```mermaid
flowchart TB
  SE[Security]
  SE --> G[Gate: scan / walk-in / entry / exit]
  SE --> H[Helper pass lookup]
  SE --> O[Security ops: blacklist / material / incidents]
  SE --> A[Mark staff attendance]
  SE -.->|no| R[Resident community as security]
  SE -.->|no| AD[Admin desks / dues]
```

**Can**

- **Gate only** for visitor entry/exit: expected / waiting / inside / left, walk-ins, scan codes
- Look up **helper / vendor pass** codes at the gate
- **Security ops** (when feature on): blacklist, material exit, incidents
- Staff attendance marking at the gate (staff/facility list; security is not listed as attendees)

**Cannot**

- Resident community as their active security role
- Society admin desks
- Record dues / confirm payment proofs

**Hard rule:** `gate` is **security-only**. Society admin and super admin do not get the gate desk while acting as admin.

**Home:** `/gate` (website), security tabs on phone

```mermaid
sequenceDiagram
  participant R as Resident
  participant G as Security gate
  R->>R: Create gate pass
  R->>G: Visitor shows QR / code
  G->>G: Scan / lookup
  alt Needs host approval
    G-->>R: Notify home
    R->>G: Allow / refuse
  end
  G->>G: Record entry / exit
```

---

## Default feature access (when no permission row is saved)

These are the code defaults in `fallbackDeskAccess`. Super admin can override per role on **Permissions**. A feature switched **off** under Features is closed for everyone.

| Feature | Admin | Owner / Family | Tenant | Committee | Facility | Staff | Security | Builder | Visitor |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Gate | — | — | — | — | — | — | **manage** | — | — |
| Maintenance | manage | —* | —* | —* | **manage** | **manage** | —* | —* | — |
| Committee | manage | —* | —* | **manage** | —* | —* | —* | —* | — |
| Documents / NOCs | manage | **manage** | **view** | —* | —* | —* | —* | —* | — |
| Other catalog features (feed, passes, parking, billing, workforce, ops, assets, circulars, security_ops, …) | manage | **manage**† | **manage**† | **manage**† | **manage**† | **manage**† | **manage**† | **manage**† | — |

\* Falls through to “none” for that special case, unless a catalog catch-all applies.  
† For roles in the community set, any feature key that exists in `FEATURE_CATALOG` defaults to **manage** unless a special rule above says otherwise. In practice, UI still hides desks that are office-only (billing post, jobs assign, …) behind admin/facility checks even when the feature key is visible.

**Always check the product UI + Permissions page** for the live society: overrides and disabled features win over this table.

```mermaid
flowchart TD
  Q[Open a feature] --> E{Enabled in Features?}
  E -->|No| X[Hidden]
  E -->|Yes| G{Gate feature?}
  G -->|Yes| S{Role = security?}
  S -->|No| X
  S -->|Yes| M[Manage]
  G -->|No| P{role_permissions row?}
  P -->|Yes| L[Use saved none/view/manage]
  P -->|No| D[Use fallbackDeskAccess]
```

---

## Desks that stay role-locked (even if a feature is on)

| Desk / action | Who |
| --- | --- |
| Gate entry/exit | Security only |
| Post dues / confirm payment proof / fee heads | Society admin (or super) |
| Assign maintenance jobs | Facility or admin |
| Update “my job” | Staff (own jobs), facility/admin |
| Committee decisions | Committee or admin |
| Feature toggles + permission matrix | Super admin |
| Assign society admin | Super admin |
| Assign facility / security / committee / staff / builder | Society admin or super |
| Link owner / family / tenant to a flat | Society admin or super |

```mermaid
flowchart TB
  subgraph Locked["Always role-locked"]
    G[Gate] --> SE[Security]
    Dues[Post / confirm dues] --> AD[Admin / Super]
    Jobs[Assign jobs] --> FA[Facility / Admin]
    MyJob[Update my job] --> ST[Staff]
    Feat[Features + Permissions] --> SA[Super admin]
  end
```

---

## Billing (no online payment)

| Action | Who |
| --- | --- |
| See invoices for own flat | Owner, family, tenant (billing feature on) |
| Upload screenshot/PDF proof | Same; stays **pending** |
| Confirm or reject proof; record office ledger | Society admin |
| Post a dues run / fee heads | Society admin |

There is **no** in-app checkout or payment gateway.

```mermaid
sequenceDiagram
  participant A as Admin
  participant R as Resident
  participant L as Office ledger
  A->>L: Post dues run
  L-->>R: Open invoice visible
  R->>R: Pay outside the app
  R->>L: Upload screenshot / PDF proof
  Note over L: status = pending
  A->>L: Open proof → Confirm or Reject
  alt Confirmed
    L->>L: Recorded + balance updated
  else Rejected
    L->>L: Failed + reason
  end
```

---

## Phone app shells

| Shell | Roles |
| --- | --- |
| `(resident)` home | Owner, family, tenant, admin, builder, committee, facility, visitor (limited) |
| `(security)` gate | Security |
| `(staff)` work | Staff, facility, admin |
| `(super)` office | Super admin only |
| `(public)` join/browse | Visitor join flow |

Switching roles on the account changes the active shell and API access.

```mermaid
flowchart TD
  Login[Account loads] --> Role{Active role}
  Role -->|super admin| Super["(super) office"]
  Role -->|security| Gate["(security) gate"]
  Role -->|staff| Work["(staff) work"]
  Role -->|facility| Both["work + home"]
  Role -->|owner / family / tenant / …| Home["(resident) home"]
  Role -->|visitor join| Public["(public) join / browse"]
```

---

## Practical examples

1. **Owner of A101** creates a gate pass → security scans it at the gate → owner gets “approve visitor” if required → security records entry/exit.
2. **Tenant** uploads a UPI screenshot on Dues → admin opens proof → Confirm → invoice balance updates.
3. **Facility** assigns a plumbing job → **staff** sees it under My work and marks progress.
4. **Security** looks up helper code `W…` → if active and not blacklisted, allow entry (no visitor-pass status machine).
5. **Super admin** turns off Amenities → nobody can book, regardless of role.

```mermaid
flowchart LR
  subgraph Example_maintenance["Maintenance job"]
    FA[Facility] -->|assign| ST[Staff]
    ST -->|update status| JOB[Work order]
  end
```

```mermaid
flowchart LR
  subgraph Example_helper["Helper at gate"]
    OW[Owner] -->|add helper pass| W[Code W…]
    SE[Security] -->|lookup| W
    W -->|allowed| IN[Entry]
  end
```

---

## Where this is configured in the product

| Setting | Where |
| --- | --- |
| Turn features on/off | Account → Features (super admin) |
| Per-role view/manage/none | Account → Permissions (super admin) |
| Assign society roles | Account → Roles |
| Link people to flats | Account → Flats / New members |
| Env super admins | `ADMIN_EMAILS` / `ADMIN_PHONES` |

```mermaid
flowchart LR
  SA[Super admin] --> Feat[Features]
  SA --> Perm[Permissions]
  SA --> Adm[Society admin]
  Adm --> Roles[Roles desk]
  Adm --> Flats[Flats / members]
  Roles --> Team[Facility / Staff / Security / …]
  Flats --> Homes[Owner / Family / Tenant]
```

Code references: `lib/roles.ts`, `lib/deskAccess.ts`, `lib/roleLabels.ts`, `lib/features.ts`, mobile `lib/place.ts`.
