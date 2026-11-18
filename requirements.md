# SyncVet Mobile App — Pet Owner Onboarding Requirements

## 1. Scope

This document defines the requirements for reusing the existing web onboarding flow
in a mobile app for **pet owners**. It is derived from the current implementation:

- `src/app/(auth)/onboarding/page.tsx` — route guard / completion check
- `src/components/auth/onboarding-wizard.tsx` — the 3-step form and submit handler
- `src/components/auth/user-sync-provider.tsx` — secondary writer to Supabase
- `src/components/dashboard/register-pet-dialog.tsx` — pet registration (after onboarding)
- `supabase/migrations/20261028_syncvet_complete_schema.sql` — `users` / `pets` schema + RLS

**Out of scope:** Administrator / Veterinarian staff onboarding. Staff bypass onboarding
in the web app and go straight to `/dashboard`.

## 2. Authentication

- Authentication is **Google SSO only**, handled by Clerk. There is no email/password
  signup and no `auth.signUp()` call in the web app.
- After SSO, the user is sent to onboarding; after completion, pet owners are sent to
  the pet-owner portal (`/pet-owner` on web).
- The mobile app must obtain a Clerk session and pass the Clerk-issued JWT to Supabase
  so Row-Level Security can identify the user (`auth.jwt() ->> 'sub'`).
- Do **not** rely on `getPublicSupabaseClient()` (anon key, no JWT) for writes.

## 3. Onboarding Inputs

### Step 1 — Resident Profile & Contact

| Field | Required | Rules / notes |
|---|---|---|
| First name | Yes | Prefilled from Clerk; trimmed; must be non-empty |
| Last name | No | Prefilled from Clerk; trimmed; still saved |
| Google email | N/A | Read-only from Clerk `primaryEmailAddress`; never typed |
| Mobile number | Yes | PH only: digits only; accepts `09…`, normalizes `639…` / `9…` to `09…`; must start `09`; exactly 11 digits; carrier detected (Globe / Smart / DITO) |

### Step 2 — Cagayan de Oro Residence

| Field | Required | Rules / notes |
|---|---|---|
| Barangay in CDO | Yes | Must match an entry in `cvoBarangays` (case-insensitive); no free-text value accepted |
| Street / House No. | Yes | Free text; trimmed; non-empty |
| Landmark | No | Appended to address as `(Near <landmark>)` |

### Step 3 — Emergency Contact & Pet Info

| Field | Required | Rules / notes |
|---|---|---|
| Emergency contact person | No | Free text; trimmed |
| Relationship | No | Default `"Spouse"`; options: Spouse / Partner, Parent, Sibling, Child, Relative, Friend / Neighbor, Other. No free-text detail for "Other" |
| Emergency contact phone | No | If filled, must be a valid 11-digit `09…` PH number; blank is valid |
| Animals cared for | Yes (at least 1) | Dogs / Cats toggles only; default `Dogs`; cannot deselect the last one |

### Derived values (not typed)

- `full_name` = `first_name + " " + last_name` (trimmed)
- `address` = `street (+ " (Near <landmark>)"), barangay, Cagayan de Oro City, Misamis Oriental`

### Not an input (must be fixed for mobile)

- `smsConsent` is currently hardcoded to `true` (`onboarding-wizard.tsx:154, 341`) with
  no UI. Mobile must present a real, explicit consent checkbox and store the answer
  with a timestamp. Do not silently assume consent.

## 4. Completion Criteria

A pet owner is considered onboarded when either:

- Supabase `public.users` has `profile_completed = true` AND `phone_number` AND `address`; or
- Clerk `unsafeMetadata` has `profileCompleted = true` AND `phoneNumber` AND `address`.

On app launch, check this before showing onboarding; skip it for already-complete users.
Do not copy the hardcoded staff-email bypass (`dime.neil03@gmail.com`) into mobile —
derive role from server-controlled data (Clerk `publicMetadata` or DB).

## 5. Data Written to Supabase

On submit, the web app writes to Clerk `unsafeMetadata` first, then upserts into
`public.users` with `onConflict: "id"` using these **12 columns only**:

```
id, email, first_name, last_name, full_name, avatar_url,
role, address, phone_number, profile_completed,
raw_user_meta_data, updated_at
```

### Not stored as dedicated columns today

These currently live only inside `raw_user_meta_data` JSONB (and Clerk metadata):

- `barangay`, `street_address`, `landmark`
- `emergency_contact_name`, `emergency_contact_phone`, `emergency_contact_relation`
- `pet_types`, `sms_consent`, `account_type`, `role_title`

**Requirement for mobile:** promote these to real columns with appropriate types so
they can be queried and protected by RLS. Stop dumping all PII into a single JSONB blob.

### Pets are not part of onboarding

Actual pet records are registered later (web: `register-pet-dialog.tsx`) into
`public.pets` with:

```
name, species, breed, gender, photo_url, birth_year, weight_category,
is_spayed_neutered, rabies_vaccinated, is_vaccinated, vaccination_doses,
last_vaccination_date, next_vaccination_date, microchip_number (auto-generated),
notes, owner_id
```

The table also supports `birth_date`, `color`, `distinctive_features`. The mobile app
should keep pet registration as a separate step after onboarding and always set
`owner_id` to the authenticated Clerk user id.

## 6. Do Not Send / Store

- Clerk session tokens or any credentials in Supabase rows
- Any password (none exists; Google SSO only)
- Google refresh tokens
- Duplicate email inside `raw_user_meta_data` (already a top-level column)
- A fabricated `smsConsent = true` value
- Emergency-contact PII without an explicit purpose and RLS protection

## 7. Security Requirements (blocking for mobile)

1. **Replace the permissive RLS policies.** The current migration
   (`20261028_syncvet_complete_schema.sql:313–325`) creates `allow_all_*` policies
   with `USING (true)` / `WITH CHECK (true)` on every table, including `users`.
   Anyone with the anon key can read and modify all pet owners. Mobile must use:
   - Clerk-JWT-authenticated Supabase client with RLS such as
     `auth.jwt() ->> 'sub' = id` for `users`, and `owner_id = auth.jwt() ->> 'sub'` for `pets`; **or**
   - a server-side API using the service-role key, with the user id derived from the
     verified Clerk token (never from the request body).
2. **Never ship write access via the anon/public client.** Enforce writes through the
   authenticated path above.
3. **Role must not be client-writable.** The web app derives `role` from
   `unsafeMetadata.roleTitle`, which a client can set to `"Administrator"`. On mobile,
   read role from server-controlled data only.
4. **Single authoritative write path.** `UserSyncProvider` re-upserts `users` on every
   dashboard mount and can overwrite onboarding fields. Mobile should avoid two
   competing writers; if a sync provider is needed, make it read-only or merge safely.
5. Validate all PH mobile numbers server-side/edge as well as in the UI (11 digits,
   `09…` prefix).

## 8. Suggested Mobile Flow

1. Launch → check Clerk session; if absent, Google SSO.
2. Check onboarding completion (Supabase `users` or Clerk metadata).
3. If incomplete → show 3-step onboarding (sections 3 + consent checkbox).
4. Submit → validate → write via authenticated API → persist `public.users`.
5. Mark `profile_completed = true`, `updated_at = now()`.
6. Navigate to pet-owner home; offer "Register a pet" as the next action.

## 9. Open Decisions

- Should onboarding collect the first pet too, or stay strictly owner-only (current web behavior)?
- Should emergency contact info be required for minors / senior owners?
- Should notification preferences (SMS vs push, reminder lead time) be added, given `smsConsent` is being made real?
- Should "Other" relationship and non-Dog/Cat species be supported (the `pets` schema already allows `"Other"` / livestock species)?
