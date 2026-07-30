# DailyLedger — Complete Error Fix and Production Remediation Plan

**Application:** <https://daily-ledger-snowy.vercel.app/>  
**Prepared:** 30 July 2026  
**Current verdict:** **NOT PRODUCTION READY**  
**Open release blockers:** 4 Critical and 8 High-severity issues

## Purpose

Use this file as the implementation specification for repairing the exact source code deployed at the URL above. It combines the confirmed audit findings with the required technical fixes, tests, and release gates.

Do not mark an issue fixed merely because the UI changed. Every fix must be implemented in the authoritative production source, covered by tests, deployed to staging, and verified through the real integration.

The source package previously available for review does not match the deployed Next.js application. Before implementation, obtain the exact repository, `package.json`, lockfile, environment-variable template, and Vercel project that produced the live deployment.

---

## Immediate release rules

1. Do not accept new production users while any Critical issue remains.
2. Do not display “verified,” “connected,” “synced,” “backed up,” or similar success messages unless the relevant server/provider response has been verified.
3. Never generate, store, or validate authentication codes only in browser code.
4. Never display an email verification code in a toast, alert, console message, HTML, URL, or client storage.
5. Financial records must never be stored as plaintext on a DailyLedger/company server.
6. Client-controlled values such as `localStorage`, IndexedDB flags, query parameters, or React state must never be treated as proof of identity or Google Drive connection.
7. Production approval is allowed only when there are zero open Critical and High-severity findings.

---

# Phase 1 — Critical fixes

## C-01: Email verification code is not sent by email and authentication is bypassable

### Confirmed error

The application accepts a nonexistent Gmail address, generates a six-digit code inside the browser, shows the code in an on-screen notification, and grants dashboard access when that exposed code is entered. No email is sent and ownership of the mailbox is never proven.

### Why the user receives no email

There is no real server-side email delivery integration. The current flow is a client-side demonstration, not email authentication.

### Required fix

Remove the entire client-generated verification flow and replace it with a server-authoritative authentication flow.

Recommended implementation:

1. Use one identity system for all sign-in methods. Do not maintain a separate localStorage identity alongside Auth.js.
2. Keep Google login in Auth.js and implement email registration/login through a server-side authentication service or Auth.js-compatible server flow.
3. For password accounts:
   - Store only an Argon2id password hash in the authentication database.
   - Never store or log plaintext passwords.
   - Require email ownership verification before creating an authenticated application session.
4. Generate verification codes on the server with a cryptographically secure random generator.
5. Store only a keyed hash of the code, associated with:
   - normalized email;
   - verification transaction ID;
   - purpose, such as registration or password reset;
   - creation and expiration time;
   - remaining attempts;
   - consumed/revoked status.
6. Send the code through a real transactional email provider such as Resend, Postmark, Amazon SES, or SendGrid.
7. Expire the code after 10 minutes or less.
8. Make the code single-use and invalidate it immediately after successful verification.
9. Permit no more than five verification attempts per code.
10. Rate-limit code requests by email, IP, device/session, and verification transaction.
11. Add a resend cooldown and revoke the previous code when a new code is issued.
12. Return generic responses so attackers cannot enumerate registered email addresses.
13. Establish the session only after the server validates the code.
14. Store the session in a `Secure`, `HttpOnly`, `SameSite=Lax` or stricter cookie. Do not use localStorage as the authentication authority.
15. Remove the verification code from toasts, console output, API responses, analytics, monitoring events, error traces, and URLs.

### Required API behavior

The exact route names may follow the existing project convention, but the responsibilities must be equivalent to:

- `POST /api/auth/register`: validate input, create or update a pending verification, hash the password, generate and send a code, and return only a transaction identifier.
- `POST /api/auth/verify-email`: validate the transaction and submitted code on the server, consume the code atomically, verify the account, and establish the session.
- `POST /api/auth/resend-code`: enforce cooldown/rate limits, revoke the old code, and send a new one.
- `POST /api/auth/login`: validate credentials on the server and reject unverified accounts.
- `POST /api/auth/logout`: terminate the real server session and revoke relevant provider tokens.

### Email configuration

Create server-only Vercel environment variables using the names expected by the selected libraries. A typical configuration includes:

```dotenv
AUTH_SECRET=
AUTH_URL=https://daily-ledger-snowy.vercel.app
AUTH_GOOGLE_ID=
AUTH_GOOGLE_SECRET=
DATABASE_URL=
EMAIL_FROM=DailyLedger <no-reply@your-verified-domain.example>
EMAIL_PROVIDER_API_KEY=
```

Rules:

- Never prefix secrets with `NEXT_PUBLIC_`.
- Never commit real values to Git.
- Verify the sending domain with SPF, DKIM, and DMARC.
- Configure separate development, preview, and production credentials.
- Rotate any credential previously exposed to browser code or source control.

### Acceptance tests

- A real test mailbox receives the code.
- A nonexistent/uncontrolled mailbox cannot be verified.
- No code appears in the UI, HTML, console, network response body, URL, localStorage, sessionStorage, or IndexedDB.
- Wrong, expired, consumed, revoked, and replayed codes fail.
- A sixth failed attempt is blocked.
- Rapid resend attempts are rate-limited.
- Changing the email or transaction ID invalidates the code.
- Client-side state modification cannot create an authenticated session.
- Logout invalidates the session in the current tab and other tabs.
- Authentication tests run successfully in Playwright against staging.

---

## C-02: Financial records are exposed across locally created identities

### Confirmed error

The deployed IndexedDB database is shared and transaction records do not have a trustworthy user partition. Changing the client-written identity can expose the same financial records to another apparent account in the same browser.

### Required fix

1. Use the cryptographically verified server-session subject as the only account identifier.
2. Create a separate encrypted local database namespace for each verified subject, using a non-reversible stable identifier rather than an email address.
3. Add the verified owner ID to every locally stored entity and enforce it at the repository boundary.
4. Never accept an owner ID supplied by a form, URL, localStorage, or request body when the session already supplies the subject.
5. Lock or unload the active database on logout.
6. Prevent one account from opening another account’s database, even after localStorage or IndexedDB values are manually altered.
7. Define an explicit shared-device policy:
   - keep each account cryptographically isolated; or
   - delete local decrypted data on logout when the user selects a private-session option.
8. Add migration logic for existing unpartitioned records. Do not silently assign legacy records to a newly authenticated user without informed confirmation.

### Acceptance tests

- Account A creates records, logs out, and Account B cannot read, search, report, export, back up, or restore Account A records.
- Editing localStorage, IndexedDB owner fields, cookies, route parameters, or React state does not bypass isolation.
- Cross-tab login/logout switches database access safely.
- Legacy-data migration is recoverable and tested.

---

## C-03: Google OAuth is misconfigured and disconnected from the application session

### Confirmed error

The production Google authorization request has an empty `client_id`. Google returns error 400. The dashboard also relies on a separate client identity rather than the Auth.js session.

### Required fix

1. Configure valid production Google OAuth credentials in Vercel.
2. Register the exact authorized JavaScript origin and callback URI shown by the selected Auth.js version.
3. Use the Auth.js server session as the only Google identity source.
4. Remove every fallback that creates a local user when Google OAuth fails.
5. Validate `state`, PKCE, nonce, issuer, audience, callback URI, and token signature through the framework/provider.
6. Implement consent denial, callback error, expired session, token refresh, revoked access, and account-switching behavior.
7. Call the real Auth.js sign-out path on logout.
8. Keep OAuth client secrets and refresh tokens server-only.
9. Do not log authorization codes, access tokens, refresh tokens, ID tokens, or session cookies.

### Acceptance tests

- Google Account Picker opens with the correct application name.
- Consent requests only OpenID profile/email plus the minimum required Drive scope.
- A selected account returns to the correct production callback and creates one verified session.
- Permission denial returns a useful error without creating a session.
- Refresh, revocation, logout, and account switching work.
- No blank `client_id`, redirect mismatch, infinite spinner, popup leak, or local fallback remains.

---

## C-04: Google Drive connection, sync, and backup success are simulated

### Confirmed error

The application can display “Google Drive connected,” “Auto-Sync Active,” and a new last-sync timestamp without successful Google authorization or a confirmed Drive API upload. A demo-token path was also found.

### Required fix

1. Delete all demo tokens, fake delays, simulated connection flags, and unconditional success notifications from production.
2. Complete real Google authentication before enabling Drive controls.
3. Request only the `drive.file` scope unless an approved requirement proves a broader scope is necessary.
4. Create or find the DailyLedger folder through the real Drive API.
5. Store the returned folder ID and backup file ID against the verified user.
6. Encrypt and authenticate the backup in the browser before upload.
7. If a server route relays the upload:
   - accept ciphertext only;
   - never log request bodies;
   - never persist backup content;
   - disable body capture in monitoring;
   - stream the response where practical.
8. Mark the Drive account Connected only after a verified provider response.
9. Mark a backup Successful only after verifying the returned file ID, revision/modified time, expected size, and checksum or authenticated backup metadata.
10. Track `lastAttemptAt`, `lastSuccessAt`, and `lastError` separately.
11. Implement folder selection, existing-folder handling, reconnect, disconnect, token revocation, overwrite protection, backup version history, restore preview, conflict handling, and retry.
12. Never overwrite the only known-good backup without preserving a recoverable version.

### Acceptance tests

- Popup blocked, consent denied, offline, expired token, revoked token, quota exceeded, Drive 4xx/5xx, timeout, and aborted upload never display success.
- Reloading every route shows the same truthful Drive state.
- Backup bytes exist in the expected Drive account and folder.
- Restore on a clean browser reproduces the verified dataset after the correct recovery key is entered.
- A corrupted or modified backup is rejected before local data changes.

---

# Phase 2 — High-severity fixes

## H-01: Plaintext local financial data contradicts “Encrypted Local Storage”

### Required fix

- Encrypt sensitive record fields before writing to IndexedDB.
- Use Web Crypto only; do not implement custom cryptography.
- Use AES-256-GCM with unique nonces and authenticated metadata.
- Use a versioned envelope format so algorithms and key derivation can be migrated.
- Derive or unwrap keys through a documented recovery-key design.
- Keep decrypted data in memory only as long as required.
- If complete at-rest encryption is not implemented, remove the encryption claim before release.

### Acceptance tests

- IndexedDB inspection does not reveal plaintext amounts, notes, people, categories, or descriptions.
- Modified ciphertext fails authentication and is never partially accepted.
- Lock/logout removes usable key material from application memory.

## H-02: Weak and unrecoverable backup-key lifecycle

### Required fix

- Replace `Math.random()` with Web Crypto CSPRNG.
- Give the user a recovery key or strong passphrase and require confirmation.
- Never store an unwrapped recovery secret beside the encrypted backup.
- Support key-version metadata, rotation, and a tested new-device restore.
- Explain clearly that losing the recovery key may make the backup unrecoverable.

## H-03: Restore can delete valid data before validation

### Required fix

1. Read and authenticate/decrypt the complete backup first.
2. Validate format version, schema, types, ownership metadata, size limits, record limits, dates, numeric precision, and referential integrity.
3. Show a restore preview with record counts and backup date.
4. Create a recoverable snapshot of current data.
5. Apply the restore inside one atomic Dexie transaction.
6. Roll back on any failure.
7. Verify counts and invariants after commit.
8. Reject unencrypted plain JSON in production unless it is an explicitly labeled import feature with separate safeguards.

## H-04: Debt repayment direction produces incorrect balances

### Required fix

- When the user owes money, repayment must reduce the negative balance using the correct outgoing ledger direction.
- When money is owed to the user, repayment must reduce the positive balance using the correct incoming direction.
- Centralize balance calculation in one tested domain function.
- Prevent overpayment unless the product explicitly supports converting the remainder into the opposite balance.

### Acceptance tests

- Positive and negative starting balances.
- Partial, full, and attempted overpayment.
- Multiple repayments.
- Edit and delete of the original debt or repayment.
- Currency precision and rounding.
- Ledger sum always matches the displayed balance.

## H-05: Unsafe session persistence and incomplete logout

### Required fix

- Remove localStorage as proof of authentication.
- Use server-validated session cookies with idle and absolute expiry.
- Rotate sessions after login, verification, privilege change, and sensitive recovery actions.
- Call provider sign-out/revocation where appropriate.
- Broadcast logout across tabs.
- Lock the encrypted local database and clear sensitive in-memory state.
- Add CSRF protection to state-changing endpoints.

## H-06: Missing Content Security Policy

### Required fix

Deploy a nonce- or hash-based CSP. Start in Report-Only mode, remove violations, and then enforce it. The final policy must restrict at least:

- `default-src 'self'`;
- scripts to trusted nonce/hash sources;
- `object-src 'none'`;
- `base-uri 'self'`;
- `frame-ancestors 'none'`;
- `form-action 'self'` and approved auth endpoints;
- `connect-src` to DailyLedger plus required Google/email/auth endpoints;
- images and fonts to explicitly approved sources.

Also review HSTS, Referrer-Policy, Permissions-Policy, COOP, CORP, CORS, and caching for authenticated responses. Do not rely on obsolete `X-XSS-Protection`.

## H-07: Missing or misleading core product features

Implement and test:

- yearly reporting;
- CSV export with spreadsheet-formula injection protection;
- real `.xlsx` export;
- accessible PDF export;
- undo delete or recoverable deletion;
- complete sorting;
- date, category, person, type, and amount filters;
- real Drive folder selection/reconnect/disconnect/restore;
- overwrite protection and backup versions;
- Account values sourced only from the verified session and confirmed Drive API state.

Hide unfinished actions or label them clearly as unavailable. Never simulate completion.

## H-08: WCAG 2.2 AA failures

### Required fix

- Give every icon-only control an accessible name.
- Associate every input with a visible label or valid accessible name.
- Use an accessible dialog component with role, name, description, focus trap, initial focus, Escape handling, focus restoration, and inert background.
- Make transaction actions visible and operable by keyboard and touch, not hover only.
- Provide visible `:focus-visible` states.
- Meet AA contrast requirements in light and dark themes.
- Respect `prefers-reduced-motion`.
- Provide text/table equivalents for charts.
- Announce async errors and success through appropriate live regions without exposing secrets.
- Ensure zoom to 200–400% and reflow at 320 CSS pixels.

---

# Phase 3 — Medium and Low fixes

| ID | Error | Required solution |
|---|---|---|
| M-01 | Search and filters replace one another instead of composing. | Maintain one query-state object and derive one filtered/sorted result set. Test every combination. |
| M-02 | Sorting and date/category/person/amount filters are missing. | Implement stable sorting, clear/reset behavior, indexed queries where useful, and accessible filter controls. |
| M-03 | Delete uses native `confirm()` and has no undo. | Use the accessible dialog system plus a recoverable tombstone/undo window. |
| M-04 | Amount/date/text validation is incomplete. | Validate finite decimal amounts, currency precision, ranges, dates/times, length limits, normalization, and repository-level invariants. |
| M-05 | “Offline Ready” is claimed without a service worker or manifest. | Implement a tested PWA/offline strategy or remove the claim. Never cache authenticated secrets or unsafe responses. |
| M-06 | Provider/offline/quota failures lack truthful actionable states. | Add typed errors, retry/backoff, cancellation, idempotency, and separate last-attempt/last-success values. |
| M-07 | Hover-hidden actions and small modal layouts are unreliable on mobile. | Keep essential actions visible on touch/keyboard and test all required widths on real devices/emulation. |
| M-08 | Reduced-motion preference is ignored. | Disable or simplify nonessential animation when reduced motion is requested. |
| M-09 | Server-rendered content starts at `opacity:0`. | Render meaningful content visible by default and progressively enhance motion. Test no-JS and slow-JS. |
| M-10 | Route bundles are too large. | Add route/component splitting, lazy-load charts/exports, remove duplicate code, and enforce CI bundle budgets. |
| M-11 | Full-table reads and main-thread backup/restore will not scale. | Use indexed/paged queries, debounced search, shared query state, progress/cancel, and Web Workers/streaming where appropriate. |
| M-12 | Report tooltip hardcodes PKR. | Use the centralized currency/locale formatter everywhere. |
| M-13 | Four-character backup passwords are allowed. | Require a strong passphrase, confirmation, labeled visibility control, recovery warning, and rate-limited attempts. |
| M-14 | SEO, PWA, 404, and error assets are incomplete. | Add correct metadata, canonical, robots/sitemap policy, manifest if supported, and accessible branded 404/500 boundaries. |
| M-15 | UI, database, domain, and Google logic are mixed and duplicated. | Separate domain, application, repository, provider, and UI layers. Centralize ledger math, formatting, and error mapping. |
| M-16 | Matching source, lockfile, tests, configuration guide, and runbook are unavailable. | Establish one authoritative repository and document installation, environment variables, OAuth, Drive, privacy, recovery, deployment, rollback, and incident response. |
| L-01 | Obsolete security header and overbroad static CORS. | Remove `X-XSS-Protection`; scope CORS only to resources that require it. |
| L-02 | Default framework 404 and conflicting metadata. | Add one branded accessible not-found page with deterministic metadata. |
| L-03 | Dialogs, action placement, typography, and touch targets are inconsistent. | Standardize them in the design system and meet minimum readable text/touch-target requirements. |

---

# Architecture requirements

Use this trust flow:

1. The server verifies the identity.
2. A secure cookie represents the authenticated session.
3. The verified session subject selects the user’s encrypted local database.
4. Financial data is encrypted in the browser.
5. Only encrypted backup bytes are uploaded to Google Drive.
6. Google Drive status is updated only from verified provider responses.

Do not allow this unsafe flow:

1. The browser writes an email to localStorage.
2. The UI treats that value as a verified user.
3. A local flag marks Drive connected.
4. A timer marks a backup successful.

Recommended source boundaries:

```text
app/
  api/                 Server-only auth and provider routes
  (public)/            Landing and public pages
  (authenticated)/     Session-protected application pages
domain/
  ledger/              Transaction and debt invariants
  backup/              Versioned backup schema and validation
application/
  services/            Use cases and orchestration
infrastructure/
  auth/                Auth.js and email provider adapters
  drive/               Google Drive adapter
  storage/             Encrypted IndexedDB repositories
components/
  ui/                  Accessible reusable UI primitives
tests/
  unit/
  integration/
  e2e/
```

Adapt these names to the real repository rather than duplicating an established structure.

---

# Mandatory automated tests

## Unit tests

- Ledger and debt invariants.
- Money parsing, decimal precision, currency formatting, dates, and filters.
- Backup encryption/decryption, tamper rejection, schema migration, and validation.
- OTP hashing, expiry, attempt limits, single-use behavior, and rate-limit decisions.
- Repository owner isolation.

## Integration tests

- Auth registration, email delivery provider mock, verification, login, logout, expiry, and CSRF.
- Google OAuth callback/session mapping.
- Drive folder creation/find, upload, versioning, failure mapping, disconnect, reconnect, and restore.
- Atomic restore rollback.
- Encrypted IndexedDB migration and per-user isolation.

## End-to-end tests

Test Chromium, Firefox, and WebKit with desktop and mobile projects:

- landing navigation and themes;
- email registration with a captured test email;
- invalid, expired, replayed, and rate-limited verification codes;
- Google login, denial, callback, refresh, and logout;
- transaction CRUD, undo, search, sorting, and combined filters;
- debts in both repayment directions;
- daily, weekly, monthly, and yearly reports;
- CSV, Excel, and PDF exports;
- Drive connect, backup, overwrite protection, restore, disconnect, and reconnect;
- offline, timeout, quota, malformed data, large dataset, and unexpected-exception behavior;
- Account page accuracy;
- keyboard-only operation and automated axe checks.

## Responsive matrix

Verify at:

- 320 px
- 375 px
- 425 px
- 768 px
- 1024 px
- 1280 px
- 1440 px
- 1920 px

At every width verify no horizontal overflow, clipped text, unreachable controls, hover-only actions, broken dialogs, obscured focus, or unusable charts.

---

# Build, dependency, security, and performance gates

Run the repository-equivalent commands and make all of them pass:

```bash
npm ci
npm run lint
npm run typecheck
npm run test
npm run test:e2e
npm run build
npm audit --omit=dev
```

Also run:

- lockfile-based dependency and license review;
- secret scanning;
- SAST;
- authenticated route/authorization tests;
- security-header verification;
- CSP tests;
- OWASP XSS, CSRF, injection, session, and authorization checks;
- Lighthouse CI and real-device performance tests;
- bundle-size budgets;
- memory tests across repeated route and modal cycles.

Recommended performance release targets:

- LCP at p75: no more than 2.5 seconds;
- INP at p75: no more than 200 milliseconds;
- CLS at p75: no more than 0.1;
- no unbounded heap growth across 100 repeated route/modal cycles;
- route-specific compressed JavaScript budgets enforced in CI.

---

# Documentation that must be included in the repository

1. `README.md`
2. installation and local-development guide
3. `.env.example` containing names only, never values
4. Google OAuth configuration guide
5. email-provider and verified-domain setup
6. Google Drive integration and scope explanation
7. privacy and data-flow architecture
8. encryption and recovery-key design
9. backup/restore and disaster-recovery guide
10. Vercel deployment guide
11. staging, production, rollback, and incident-response runbook
12. test execution and release checklist

---

# Final release checklist

The release manager must verify all statements below:

- [ ] The exact deployed repository and lockfile are available.
- [ ] Real email verification works and no code is exposed client-side.
- [ ] Google OAuth works with the correct production client ID and callback.
- [ ] No authentication path trusts localStorage or client-generated identity.
- [ ] Account A cannot access Account B data on a shared browser.
- [ ] Local financial data is encrypted or all contrary product claims have been removed.
- [ ] Google Drive connection and backup status come only from real API responses.
- [ ] A clean-browser restore from Drive has succeeded.
- [ ] Corrupt/tampered restore files cannot alter current data.
- [ ] Debt balances pass all invariant tests.
- [ ] Logout terminates the real session and locks local data.
- [ ] CSP is enforced without required-functionality violations.
- [ ] WCAG 2.2 AA manual and automated checks pass.
- [ ] All required reports, exports, filters, sorting, undo, and account functions work.
- [ ] Every requested responsive width passes.
- [ ] Offline, quota, denial, timeout, and provider-failure tests pass without crashes or false success.
- [ ] Lint, typecheck, unit, integration, E2E, build, dependency, secret, and security scans pass.
- [ ] No Critical or High finding remains open.
- [ ] Staging regression, production smoke test, monitoring, and rollback rehearsal are complete.

## Approval wording

State **“Production Ready”** only after every Critical and High issue has been closed with implementation evidence and successful retest results.

Until then, the correct verdict is:

**NOT PRODUCTION READY**
