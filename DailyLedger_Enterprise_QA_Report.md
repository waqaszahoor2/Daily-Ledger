# DailyLedger Enterprise Production-Readiness Audit

**Target:** <https://daily-ledger-snowy.vercel.app/>  
**Audit date:** 30 July 2026  
**Release decision:** **NOT PRODUCTION READY**  
**Production fixes applied:** **0** — the source package available for review is not the source of the deployed Next.js application, so changing it would not remediate the audited production site.

## Executive summary

DailyLedger must not be released as a production financial application in its current state. The deployed application contains four Critical and eight High-severity findings. The most serious problems are a complete email-authentication bypass, cross-account exposure of locally stored financial records, a nonfunctional Google OAuth configuration, and a Google Drive workflow that reports successful connection/backup without actually connecting to or uploading to Drive.

The application has a polished desktop visual layer and several useful client-side transaction/reporting components, but its privacy, authentication, encryption, backup, offline, and account-management claims do not match observed behavior. Core requirements—including yearly reports, CSV/Excel/PDF export, account details, Drive restore/disconnect/folder selection, undo delete, and robust combined filtering—are absent or incomplete.

No production code was changed because the available `DailyLedger_Vercel_Ready.zip` is a dependency-free JavaScript/localStorage application, while the deployed site is a different Next.js/Dexie/Auth.js application. Applying fixes to the former would create false assurance and would not change production.

## Scorecard

| Area | Score | Release assessment |
|---|---:|---|
| Overall | **32/100** | Release blocked |
| Security | **15/100** | Critical controls fail |
| Performance | **58/100** | Heavy first-load bundles; lab Web Vitals not certifiable |
| Accessibility | **41/100** | WCAG 2.2 AA not met |
| Code quality | **35/100** | Client trust, mixed boundaries, duplicated logic |
| UI/UX | **63/100** | Visually polished desktop experience; major flow and state defects |
| Maintainability | **33/100** | Missing authoritative source/docs/tests and weak separation |
| Scalability | **27/100** | Full-table client processing and main-thread backup/restore |

## Scope and evidence

The audit included:

- Live navigation, landing, login/registration, session persistence, dashboard, transaction create/read/update/search/filter, reports, settings, and routing.
- A safe login-bypass test using nonexistent credentials.
- Safe local transaction creation/editing and an escaped-XSS payload in the notes field.
- Google OAuth initiation, Auth.js provider/CSRF/session endpoints, generated OAuth URL, cookie attributes, scope, and PKCE inspection.
- Download and static review of every JavaScript/CSS chunk referenced by the audited routes.
- IndexedDB schema, data repositories, encryption, backup/restore, Drive, session, transaction, debt, and report logic review from the deployed client bundles.
- Response headers, public assets, SEO/PWA endpoints, 404 handling, bundle transfer sizes, semantics, keyboard visibility, form metadata, dialog behavior, reduced-motion support, and representative color contrast checks.
- Desktop visual inspection at 1363×936 and static breakpoint review.
- Search for an authoritative public source repository and inspection of the only available DailyLedger source ZIP.

The following cannot be certified without the actual deployed source, test accounts, Google Cloud/Vercel configuration access, and a clean browser harness:

- A successful OAuth consent/callback/refresh flow, because production emits a blank `client_id`.
- Real Drive upload, overwrite, quota, denial, restore, reconnect, and API-failure tests, because the UI does not perform these operations.
- Exact FCP, LCP, INP/TTI, CLS, long-task, and memory-leak measurements. A PageSpeed run was quota-blocked, and proxy timing is not representative of an end user.
- Complete screen-reader matrix and screenshots at every requested width. The browser harness became blocked by the application’s native delete-confirmation dialog; unexecuted widths are recorded as unverified, not passed.
- Dependency CVE certification, because no matching `package.json` or lockfile was available.

## Release blockers

### Critical

| ID | Issue and evidence | Impact | Required remediation |
|---|---|---|---|
| C-01 | **Email authentication is completely bypassable.** Any non-empty email/password combination writes a `dl_user` object to `localStorage` and opens the dashboard. The password is not verified, hashed, or sent to an authentication service. This was reproduced with a nonexistent address. | Anyone can impersonate any email identity. Authentication, authorization, auditability, and all account claims are invalid. | Replace the cosmetic flow with a server-validated identity provider. Never authorize from client-written localStorage. Add brute-force/rate-limit controls, verified-email policy, password rules, secure reset, and negative integration tests. |
| C-02 | **Financial data crosses local “accounts.”** The Dexie database is global (`dailyledger-db`) and transactions have no `userId`/profile partition key. Switching the client-written identity exposes the same transaction set. | A shared browser or changed localStorage identity can expose another user’s financial records. | Bind storage to a cryptographically verified subject, isolate databases per subject, encrypt records, clear/lock data at logout, and add multi-account isolation tests. |
| C-03 | **Google OAuth is broken and not integrated.** The production authorization request contains an empty `client_id` and Google returns error 400. The app uses Auth.js for initiation but the dashboard never consumes the Auth.js session. | Google login cannot succeed. Even a configuration-only client ID fix would still leave the dashboard disconnected from the authenticated session. | Configure validated production OAuth credentials, use the server/Auth.js session as the only identity source, implement callback/error/refresh/revocation paths, and test account picker, denial, consent, expiry, refresh, and logout. |
| C-04 | **Google Drive success is simulated.** “Connect Google Drive” sets local flags and shows success without OAuth or a Drive call. Auto-backup uses a `"demo-access-token"` path that updates `lastBackupAt` without uploading a file. | Users may believe financial backups exist when no backup was created, creating a severe data-loss and trust risk. | Remove simulated success from production. Confirm folder/file IDs from Google responses, verify upload checksums/revisions, record failure distinctly, expose last verified backup, and test the real Drive lifecycle end to end. |

### High

| ID | Issue and evidence | Impact | Required remediation |
|---|---|---|---|
| H-01 | **Local financial records are plaintext despite “Encrypted Local Storage” claims.** Dexie stores transaction objects directly; encryption is only used for exported backup files. | Any same-origin script compromise, local profile access, or vulnerable extension can read finance data. Product claims are misleading. | Encrypt sensitive fields at rest with a properly managed key, minimize retained plaintext, add CSP, and make product copy exactly match the threat model. |
| H-02 | **Automatic-backup key management is weak and unrecoverable.** A passphrase is generated with `Math.random()` and stored in plaintext in IndexedDB. It is not presented as a recovery key. | Local compromise exposes the backup key; loss of the browser profile can make a Drive backup impossible to restore on another device. | Use Web Crypto CSPRNG, a user-controlled/recoverable key design, secure wrapping, confirmation, key-rotation/versioning, and a tested new-device recovery flow. |
| H-03 | **Restore can destroy good data before a backup is validated.** Restore clears transactions/settings and then bulk-adds imported content without schema/version/size validation or an atomic Dexie transaction. Plain JSON is also accepted. | A corrupt, malicious, or wrong-password backup can cause partial or total irreversible loss. | Parse, authenticate/decrypt, validate schema/version/limits, preview, and back up current state first. Apply replacement in a single atomic transaction with rollback and post-restore verification. |
| H-04 | **Debt repayment direction is wrong when the user owes money.** The primary repayment action always creates `money_received/repaid_in`; for a negative balance this increases the amount owed instead of reducing it. | Financial balances become materially incorrect. | Select `money_given/repaid_out` when the user owes and `money_received/repaid_in` when owed to the user. Add ledger invariants and tests for both directions, partial repayment, overpayment, edits, and deletes. |
| H-05 | **Session lifecycle and logout are unsafe/incomplete.** Dashboard access depends on indefinite client localStorage. Logout removes only `dl_user` and does not call Auth.js sign-out/revocation. | Stale sessions and identity confusion persist; a future functional Google session could remain active after apparent logout. | Use secure server session state, defined idle/absolute expiry, rotation, Auth.js sign-out, token revocation where applicable, cross-tab invalidation, and storage locking/cleanup. |
| H-06 | **No Content-Security-Policy is deployed.** Other baseline headers are present, but CSP and cross-origin isolation controls are absent. | An XSS or compromised dependency has an easier path to exfiltrate plaintext finance data or tokens. | Deploy a nonce/hash-based CSP with restrictive `default-src`, `script-src`, `connect-src`, `frame-ancestors`, and `base-uri`; add report-only monitoring before enforcement. |
| H-07 | **Required core features are missing.** `/dashboard/account` returns 404. Yearly reports, CSV/Excel/PDF exports, Drive restore/disconnect/reconnect/folder selection, backup overwrite protection, and undo delete are absent. | The product does not satisfy its defined acceptance criteria and users cannot complete key account, portability, recovery, or correction workflows. | Implement each requirement against an approved specification and add unit, integration, E2E, and negative tests before release. |
| H-08 | **WCAG AA cannot be met with the current interaction model.** Icon-only navigation/edit/delete/close/password controls lack accessible names; form labels are not associated; dialogs have no `role="dialog"`, accessible name, focus trap, Escape handling, or inert background; hover-only actions are not reliably visible to keyboard/touch users; several light-theme colors fail normal-text contrast. | Keyboard, screen-reader, low-vision, and touch users cannot reliably operate core financial workflows. | Apply native semantics and accessible names, restore visible focus/action states, implement an accessible dialog primitive, fix contrast tokens, add chart summaries/tables, and pass automated plus manual keyboard/screen-reader testing. |

## Medium-severity findings

| ID | Finding | Required remediation |
|---|---|---|
| M-01 | Search and type filters do not compose. Each independently replaces the full result list; stale search/filter state can display records that should be excluded. | Derive one result set from a single query state and cover combinations, edits, deletes, and empty results with tests. |
| M-02 | Required sorting and date/category/person/amount filters are absent. Search covers only notes and person name. | Implement a documented query model, stable sorting, indexed fields where useful, filter chips, reset behavior, and URL/state persistence as appropriate. |
| M-03 | Delete uses a blocking native `confirm()` and immediately removes data; there is no undo. | Use an accessible confirmation/undo pattern and a recoverable tombstone or short undo window. |
| M-04 | Transaction validation only checks a positive parsed amount. It lacks finite/max/precision constraints, robust date/time validation, and practical input length limits. | Define domain constraints, validate at the repository boundary, reject `Infinity`/unsafe precision, normalize currency, and test malformed/extreme input. |
| M-05 | “Offline Ready” is not supported by a service worker or web manifest; `/manifest.webmanifest`, `/manifest.json`, and `/sw.js` return 404. | Implement and test an explicit offline strategy or remove the claim. Provide safe stale-data and reconnect behavior. |
| M-06 | Drive/API/offline/quota failures are not surfaced with actionable states; some sync failures are logged only to the console and simulated paths report success. | Add typed error states, retry/backoff, idempotency, cancellation, quota guidance, and truthful last-success versus last-attempt timestamps. |
| M-07 | Transaction action buttons are opacity-hidden until hover and still consume narrow-row space. Small modal grid text/actions are likely cramped at 320–425 px. | Keep essential actions visible on touch/keyboard, add `focus-within` handling, and complete real-device tests at all target widths. |
| M-08 | No `prefers-reduced-motion` handling was found, while multiple Framer Motion transitions are used. | Respect reduced-motion preferences and ensure content is visible without animation. |
| M-09 | Server-rendered landing content is emitted with `opacity:0` until animation/hydration/scroll activates it. | Render meaningful content visible by default and progressively enhance motion; test no-JS, slow-JS, and back/forward cache. |
| M-10 | First-load assets are heavy for a personal ledger: reports load approximately **1.40 MB raw / 410 KB gzip**, dashboard **1.04 MB / 308 KB gzip**, and login **866 KB / 255 KB gzip**, excluding fonts. | Add route/component splitting, reduce chart-library cost, remove duplicated route code, and enforce bundle budgets in CI. |
| M-11 | Full-table reads, client-side recomputation, per-keystroke search, and repeated hooks do not scale. Backup/restore buffers and encrypts the whole dataset on the main thread without progress/cancel. | Use indexed/paged queries, debounce/cancellation, shared data state, Web Workers/streaming where practical, and large-dataset stress tests. |
| M-12 | The reports chart tooltip hardcodes `PKR` instead of using the configured currency. | Use the centralized currency formatter and test every supported currency/locale. |
| M-13 | Manual backup passwords permit only four characters and have no confirmation/strength feedback. | Require a stronger passphrase policy, confirmation, visibility controls with labels, and clear recovery warnings. |
| M-14 | SEO/PWA/release assets are incomplete: no robots.txt, sitemap, canonical, Open Graph/Twitter metadata, manifest, or branded error page. The default 404 contains conflicting title metadata. | Add route-appropriate metadata, branded 404/error boundaries, robots/sitemap decisions, and deployment smoke tests. |
| M-15 | Data and infrastructure boundaries are mixed: UI components call Dexie and Google APIs directly, and repeated repository/modal/category logic appears across route bundles. | Introduce tested domain/application adapters, centralize repositories and formatting, and remove duplicated/dead code using source-level analysis. |
| M-16 | The matching source manifest, lockfile, tests, runbook, environment guide, OAuth/Drive setup, and deployment documentation were not available. The available ZIP documents a different app. | Establish one authoritative repository and commit exact dependencies, test suites, configuration schema, threat model, privacy model, backup recovery guide, and release runbook. |

## Low-severity findings

| ID | Finding | Required remediation |
|---|---|---|
| L-01 | `X-XSS-Protection: 1; mode=block` is obsolete, while static HTML is served with `Access-Control-Allow-Origin: *` without an evidenced need. | Remove obsolete policy and scope CORS per resource/API requirements. |
| L-02 | The default 404 is not branded and contains both framework and global title metadata. | Add an accessible custom not-found page and verify one deterministic title/description. |
| L-03 | Native confirmation, mixed modal patterns, tiny secondary text, and inconsistent action discoverability reduce interface consistency. | Standardize dialogs, action placement, typography minimums, and touch targets in the design system. |

## Functional coverage result

| Area | Result | Key evidence |
|---|---|---|
| Landing/navigation/footer/theme/CTA | Partial pass | Primary navigation and CTA work; animated content visibility and reduced-motion/offline claims fail. |
| Email login/registration/logout/session | **Fail** | Cosmetic login accepts any credentials; unsafe localStorage session; incomplete logout. |
| Google OAuth | **Fail** | Blank `client_id`; callback/session integration cannot work; failed attempt leaves loading state until reload. |
| Google Drive | **Fail** | Connection and backup success are simulated; required Drive lifecycle features absent. |
| Dashboard KPIs/charts/actions | Partial pass | KPIs and quick actions render; account/session/data integrity defects invalidate production use. |
| Transaction CRUD | Partial pass | Create/read/update work locally; delete is irreversible; filters conflict; validation and required query features are incomplete. |
| Reports | **Fail** | Daily/weekly/monthly charts exist; yearly and CSV/Excel/PDF export are absent. |
| Settings | Partial pass | Theme and local encrypted export exist; restore is destructive; Drive/profile features incomplete. |
| Account page | **Fail** | Required route returns 404. |
| Error handling | **Fail** | OAuth/Drive/offline/quota and destructive-restore paths are not resilient or truthful. |
| Security/privacy | **Fail** | Authentication, isolation, encryption claims, session lifecycle, and CSP fail. |
| Accessibility | **Fail** | Core semantic, focus, contrast, keyboard/touch, and reduced-motion defects remain. |
| Responsive matrix | Not certified | Desktop visual check passed basic layout; requested widths require rerun after dialog/harness and accessibility fixes. |

## Controls that passed or were positively observed

- Auth.js CSRF cookies observed with Secure, HttpOnly, and SameSite=Lax attributes.
- OAuth initiation uses PKCE S256 and requests the minimum Google Drive `drive.file` scope, plus OpenID profile/email.
- Backup cryptography uses AES-256-GCM with a random salt/IV and PBKDF2-SHA-256 at 200,000 iterations; the principal weakness is key lifecycle and restore safety.
- The tested React notes rendering escaped an `<img onerror>` payload; no alert executed.
- No financial-record upload to a company API was found in the audited client bundles. Records remain local unless a real Google Drive upload path is eventually supplied.
- Baseline headers include HSTS, X-Frame-Options DENY, X-Content-Type-Options, Referrer-Policy, and a restrictive Permissions-Policy.
- No third-party analytics/tracking integration was found in the audited client bundles.
- The inspected Next and Dexie versions match their current package versions at the audit date; this is not a substitute for a lockfile-based vulnerability audit.

## Performance evidence

| Route | Referenced JS/CSS raw | Gzip |
|---|---:|---:|
| Landing | 852 KB | 249 KB |
| Login | 866 KB | 255 KB |
| Dashboard | 1.04 MB | 308 KB |
| Transactions | 1.03 MB | 307 KB |
| Debts | 1.04 MB | 306 KB |
| Reports | 1.40 MB | 410 KB |
| Settings | 991 KB | 295 KB |

These figures are asset-transfer evidence, not Web Vitals. FCP, LCP, INP/TTI, CLS, heap growth, and long tasks must be measured in CI and on representative mobile hardware after the authoritative source can be built. Recommended release budgets: LCP ≤2.5 s at p75, INP ≤200 ms at p75, CLS ≤0.1 at p75, no unbounded heap growth across 100 modal/route cycles, and route-specific compressed-JS budgets enforced in CI.

## Required remediation and retest gate

Release approval requires all of the following:

1. Provide the exact source/lockfile that produced the audited Vercel deployment and documented non-production Google test credentials/configuration.
2. Replace client-trusted authentication and partition/encrypt data by a verified subject.
3. Implement and test real OAuth, token refresh/revocation, Drive folder/upload/restore/disconnect/reconnect, truthful status, overwrite/versioning, and recovery-key management.
4. Correct debt invariants and make restore atomic, validated, versioned, and recoverable.
5. Complete the missing account, yearly report, exports, undo, sorting, and filter features.
6. Close CSP, accessibility, error-handling, responsive, large-dataset, and bundle-budget findings.
7. Run source-level typecheck/lint/unit/integration/E2E tests, lockfile vulnerability and license scans, secret scanning, SAST, dependency review, and a clean production build.
8. Execute the requested 320/375/425/768/1024/1280/1440/1920 visual matrix, keyboard and screen-reader matrix, offline/quota/API-failure tests, and measured Web Vitals.
9. Deploy to a staging environment matching production, rerun the complete regression suite, then perform a production smoke test with rollback rehearsed.
10. Show **zero open Critical or High findings** before changing the release verdict.

## Fix and retest ledger

| Item | Status |
|---|---|
| Production code fixes applied | **None** |
| Reason | The only available source ZIP is a different implementation from the deployed Next.js site. |
| Live production data changed | No company/user production data was changed. Test entries were confined to the auditor’s local browser storage. |
| Retest after fixes | Blocked pending the authoritative source and deployment configuration. |

## Final verdict

**NOT PRODUCTION READY**

DailyLedger cannot be approved while any Critical or High issue remains. The next audit iteration should begin from the exact production source repository; it must not treat the mismatched ZIP as the deployable application.
