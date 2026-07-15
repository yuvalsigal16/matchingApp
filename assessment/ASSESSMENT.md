# Tzemed Hemed (צמד חמד) — Engineering Assessment Report

> **Mode: READ-ONLY.** This document is the *only* artifact this assessment produces. No source file is modified, no commit is made, no dependency is touched, nothing is deleted or renamed. Every "fix" is a costed recommendation, never an action. Governing plan: [`REVIEW_PLAN.md`](../REVIEW_PLAN.md).

---

## 1. Snapshot identity

The assessed state is the working tree **as-is** (uncommitted work on `liel_branch` is part of the assessed state, listed here so findings are reproducible).

| Field | Value |
|---|---|
| **Date** | 2026-07-14 |
| **Commit (HEAD)** | `349549c548a5ed85fcb656c102d1367d32ac64e2` |
| **Branch** | `liel_branch` |
| **HEAD subject** | `Merge pull request #62 from yuvalsigal16/liel_branch` |
| **Working tree** | Dirty (see below) |

**Dirty-file list at assessment start (`git status --porcelain`):**

```
 M app/(tabs)/Home.jsx
 M app/(tabs)/TripDetails/[id].jsx
 M app/(tabs)/myTrips.jsx
 M app/SplashScreen.jsx
 M app/src/api/notificationService.js
?? Code-review                      (existing FILE: prior backend security report — see §6)
?? REVIEW_PLAN.md                   (the governing plan)
?? app/src/api/homeData.js          (SWR + warm-prefetch startup layer)
?? components/ui/Card.jsx
?? components/ui/EmptyState.jsx
?? components/ui/ListRow.jsx
?? components/ui/ScreenHeader.jsx
```

> **Recommendation (not performed):** commit this working tree before any future *remediation* work begins, so remediation diffs are clean against a known baseline. This is advisory only — the assessment reads the dirty tree as the subject.

### Toolchain / environment (from `package.json`)

| Item | Value | Note |
|---|---|---|
| Expo SDK | `~54.0.33` | current |
| React / React Native | `19.1.0` / `0.81.5` | React 19 → StrictMode double-invokes effects in dev (relevant to Phase 4 dedup / Phase 9) |
| Reanimated / Worklets | `~4.1.1` / `0.5.1` | new Reanimated 4 architecture |
| Router | `expo-router ~6.0.23` | file-based routing under `app/` |
| Storage | `expo-secure-store ~15.0.8` **and** `@react-native-async-storage/async-storage 2.2.0` | both installed — Phase 5 determines which holds the token |
| **Test runner** | **none** | no jest / testing-library in `devDependencies` — confirms "zero tests" |
| Lint | `eslint ^9.25.0` + `eslint-config-expo ~10.0.0` | flat-config expo preset |
| TypeScript | `~5.9.2` | present; only `_layout.tsx` files use it (JS/TS drift → Phase 1) |
| **Dependency flags** (confirmed present) | `@expo/ngrok ^4.1.3` (prod dep), `@lottiefiles/dotlottie-react ^0.13.5` (web pkg), `lucide-react ^1.11.0` (web) alongside `lucide-react-native ^1.11.0`, `firebase ^12.15.0` (usage TBD) | all flagged for Phase 10 dead-code / Phase 13 dependency hygiene |

---

## Executive summary

**Overall verdict: a genuinely strong capstone with concentrated, fixable risk — roughly B‑ as an engineering project, but gated by security (D) that must be closed before any real use.**

Tzemed Hemed's intellectual core is sound: four matching algorithms that are normalized, cold-start-safe, NaN-free, and — rare for student work — *genuinely explainable* (the displayed reasons derive from the same signals the scorers use). The frontend shows professional instincts uncommon at this level: SecureStore-backed tokens with **no plaintext password**, a global 401 interceptor, an exemplary SWR / warm-prefetch data layer (`homeData`), app-wide double-submit guards, and leak-free chat polling via `useFocusEffect`. The risk is concentrated in **security** and is largely *already documented in the repo's own backend report*: three Criticals — IDOR/BOLA, secrets committed to git, and a weak JWT key — mean the server trusts client-supplied identity, a posture the frontend's pervasive "send my own `userId`" pattern confirms. Beneath that sits a cluster of cheap-to-close Highs (timeouts on only **2 of 16** services, **no root ErrorBoundary**, push tokens never deregistered on logout, an unauthenticated PII endpoint, a hardcoded Geoapify key) and one dominant **systemic theme — *"the right abstraction exists but isn't adopted"*** — where timeouts, auth headers, endpoint ownership, and the service boundary itself are each built once and then bypassed by screens and services alike. The highest-leverage moves are small and high-visibility: rotate the committed secrets and enforce token-derived identity server-side, add an ErrorBoundary and universal timeouts, ship a ~13-case Jest suite for the four pure scorers, and replace the boilerplate README with one page of ARCHITECTURE + ALGORITHMS — together these convert an impressive build into a defensible one.

> **Compression note:** this review was run in the 3-pass capstone-compressed form (see the Scope note under §5). Phases P3/P9/P12 are folded (spot-check only) and all runtime-only checks (two-account IDOR repro, on-device leak/offline walkthroughs) await the owner booting the app with two test accounts (§3).

## 2. ESLint baseline (quality metric)

Command: `npx expo lint` (read-only static analysis), run 2026-07-14 against the snapshot above.

**Result: 13 problems — 0 errors, 13 warnings.** (exit code 0)

| Rule | Count |
|---|---|
| `react-hooks/exhaustive-deps` | 12 |
| `no-unused-vars` | 1 |

Full per-file breakdown in **Appendix A**. This is the Phase 0 quantitative baseline; Phase 13 re-runs lint and compares. Note: the exhaustive-deps cluster is a **preview of Phase 2** (React Native correctness) — several warnings sit on real data-loading callbacks (`loadCommunities`, `loadUsers`, `loadRecommendations`), not just animation refs, and will be triaged there (a lint warning is a lead, not yet a finding).

---

## 3. Runtime-verification status (boot confirmation)

Phase 0 asks to confirm the app boots (login → Home) so runtime phases are executable.

**Status: NOT verified in this automated session.** Booting on an emulator/device and performing an interactive login is outside what this session can drive. This is stated honestly rather than assumed.

- **Static readiness signals are green:** `expo lint` completes with 0 errors; dependency versions are internally consistent for SDK 54.
- **Impact:** does **not** block the static / read-only phases — **1 (Architecture), 4 (API code), 5 (auth code), 6 (security code + backend review), 7 (Matching), 8 (business-logic code), 10 (Code Quality), 13, 14 (docs)** all proceed from source.
- **Blocked until the owner boots the app** (needs device + two disposable test accounts): the runtime portions of **2** (leak/nav on-device checks), **5** (two-account logout-leak test), **6** (two-account IDOR test), **9** (device profiling), **11** (airplane-mode walkthrough), **12** (full on-device UX walkthrough).

> **Action for owner:** confirm `npx expo start` → login → Home succeeds on a device/emulator, and provision two disposable test accounts, before the runtime phases run. Code-level proofs (file:line + failure trace) will be used wherever runtime execution isn't available.

---

## 4. Methodology (applies to every phase)

**Severity scale**

| Severity | Definition |
|---|---|
| **Critical** | Security hole, data exposure, crash on a main flow, silently wrong core results |
| **High** | Bug a normal user will hit; leak; race; broken error path on a core flow |
| **Medium** | Maintainability debt; inconsistency; missing states on secondary screens |
| **Low** | Polish (naming, dead code, comments, minor animation timing) |

**Evidence rules**
- Every finding cites `file:line` and a failure scenario (input/state → wrong outcome). "This looks bad" is not a finding.
- Runtime claims need a reproduction path **or** a code-level proof.
- Systemic patterns (same bug in 3+ places) are logged once as systemic, with the instance list.
- UI/UX judgments defer to the `tzemed-hemed-design` bible, not personal taste.

**Pre-logged known items — referenced, NOT re-discovered:**
1. App-wide title-alignment standardization (owner wants centered) is a deferred owner decision.
2. Home hero "unknown/loading state" on matches-error-without-cache is a known deferred UX task.

**Finding format** (used in §7):

```
## [P4-003] High — tripService swallows errors on create
- File: app/src/api/tripService.js:112
- Scenario: POST fails (timeout) → catch returns null → myTrips shows success snackbar, trip doesn't exist
- Remediation (recommendation only): throw normalized error; screen shows retry — est. 0.5h
```

---

> **Scope note (2026-07-14, owner decision):** This is a **capstone project, not production-bound**, so the review was compressed from the 15-phase release-gate plan into **3 focused passes**: **A — correctness core** (Matching P7 · API/Auth headlines P4/P5 · Security P6, referencing the existing backend report), **B — demo survival** (crash / leak / double-submit / empty-error on core flows, from P2/P11/P12), **C — capstone framing + final report** (giant files & tests P10/P14). Deliberately dropped or lightened: production-gate conformance (P13), deep on-device performance profiling (P9), and the full 40-screen UI-token audit (P3 → spot-check only). Severity and evidence rules are unchanged. Scorecard rows for dropped phases are marked _folded_.

## 5. Scorecard (skeleton — filled as phases complete)

Rows are in **recommended execution order**. Grades A–F assigned at each phase's exit; counts are finding tallies. `—` = not yet started.

| # | Phase | Grade | Crit | High | Med | Low | One-line verdict |
|---|---|:---:|:---:|:---:|:---:|:---:|---|
| 1 | **P0** Baseline & Setup | N/A | — | — | — | — | Setup complete; snapshot + lint baseline recorded; boot unverified (see §3) |
| 2 | **P1** Architecture | **C+** | 0 | 1 | 5 | 2 | Dependency direction is clean (no cycles/reverse edges) & homeData is exemplary, but 9 screens bypass services with raw `fetch`, and `app/src/**` yields ~35 phantom routes |
| 3 | **P4** API Layer | **C+** | 0 | 1 | 1 | 1 | Decent error contract (most services throw normalized Hebrew errors) undermined by near-absent timeouts (2/16) |
| 4 | **P5** Authentication | **B-** | 0 | 1 | 1 | 2 | Strong storage (SecureStore, global 401, no plaintext password), but logout is incomplete: push token + homeData cache not cleared |
| 5 | **P6** Security | **D** | 3 | 2 | 1 | 0 | Worst area: 3 backend Criticals (IDOR, committed secrets, weak JWT) + unauth-PII + hardcoded Geoapify key + unverified Firestore rules; two-account IDOR repro pending boot |
| 6 | **P7** Matching Algorithms | **B+** | 0 | 0 | 2 | 2 | Sound, normalized, cold-start-safe & genuinely explainable core; a latent unguarded-`interests` crash and the wheel's null==null inflation are the only real gaps |
| 7 | **P2** React Native Correctness | **B** ⚠partial | 0 | 0 | 0 | 1 | Leak audit clean (chat poll = `useFocusEffect`+`clearInterval`); double-submit guarded app-wide; full hooks/RTL/a11y sweep folded (capstone); 12 lint exhaustive-deps leads remain |
| 8 | **P8** Business Logic | — | — | — | — | — | _pending_ |
| 9 | **P11** Reliability & Resilience | **B-** | 0 | 1 | 0 | 0 | No root ErrorBoundary (High); but double-submit + chat-leak safe, services return `[]` so lists don't crash; offline walkthrough needs device |
| 10 | **P9** Performance | _folded_ | — | — | — | — | Folded (capstone). Light note: scorers memoized (`useMemo`), `reactCompiler` on, `homeData` warm-prefetch + SWR; no on-device profiling done |
| 11 | **P3** UI System | _folded_ | — | — | — | — | Folded → spot-check only (capstone). Token system + primitives (Card/ListRow/ScreenHeader/EmptyState/Button) exist; full 40-screen token audit not run |
| 12 | **P12** User Experience | _folded_ | — | — | — | — | Folded (capstone). Verified in Pass B: double-submit guards + Hebrew error alerts + optimistic-send rollback; full on-device walkthrough needs device |
| 13 | **P10** Code Quality | **C+** | 0 | 0 | 1 | 1 | Readable with good comments + named constants, but 3 giant files (1.3k–1.8k lines), dead web deps, template leftovers, boilerplate README, 86 console calls in api/ |
| 14 | **P13** Production Gate | _folded_ | — | — | — | — | Folded (capstone). Partial coverage elsewhere: lint baseline (§2), dead-deps/console inventory (P10-002, P4-003), stale `MatchingAppServer/` copy in repo flagged (B.1) |
| 15 | **P14** Capstone Evaluation | **C** | 0 | 1 | 1 | 0 | Strong matching IP + real explainability, undermined by zero tests, boilerplate README/no docs, and the unresolved backend Criticals — all fixable & high-visibility |
| | **TOTALS** | | **3** | **7** | **12** | **9** | |

---

## 6. Prior art: existing backend security report

An untracked **file** named `Code-review` (no extension, at repo root — not to be confused with a folder) already contains a focused Hebrew security report against the backend (`MatchingAppServer`). It is left **untouched** by this assessment and will be **cited as prior art in Phase 6**, not re-discovered. Its four findings:

| # | Severity | Finding | OWASP |
|---|---|---|---|
| 1 | 🔴 Critical | **IDOR / BOLA** across controllers — `[Authorize]` (authn) without ownership check (authz); server trusts client-supplied `id`/`userId` | API1:2023 |
| 2 | 🔴 Critical | **Secrets committed to git** — `appsettings.json` (commit `bb70a2b`): Azure SQL password, JWT signing key, Brevo + Anthropic API keys in cleartext | API5 / Misconfig |
| 3 | 🔴 Critical | **Weak/predictable JWT signing key** (`THIS_IS_A_SUPER_SECRET_KEY_...`) — offline brute-forceable → forge tokens for any user | API2:2023 |
| 4 | 🟠 High | **`GetAllUsers` unauthenticated + full-PII payload** — anonymous caller can dump every user's email, full DOB, city, questionnaire answers | API3:2023 |

These corroborate the plan's top prediction (IDOR = the most common Critical in client-server student projects). Phase 6 will verify each against the current deployed backend, extend to the endpoints not yet covered (chats, matches, todos, planner, communities), and fold verified items into §7 with `P6-*` IDs.

---

## 7. Findings by severity

_(Populated as phases run. Critical first, then High, Medium, Low. Each uses the Finding format from §4.)_

### Critical

> Phase 6's three Criticals are **backend** findings already documented in the untracked `Code-review` file (§6). They are represented here so the scorecard, executive summary, and roadmap reflect them, and were flagged to the owner at assessment start. **Referenced, not re-discovered** (per the pre-logged-items rule).

## [P6-001] Critical — IDOR / BOLA across backend controllers (server trusts client-supplied IDs)
- Source: `Code-review` backend report; corroborated frontend-side. File: `MatchingAppServer` controllers (e.g., `UserController.Delete(int id)`).
- Frontend corroboration: every private call ships a client-controlled id — `authService.apiDeleteAccount(userId)`, `tripService.getUserTrips(userId)`, `userProfileService.getUserProfile(userId)`, `notificationService.getMyMatches(userId)`, etc.
- Scenario: `[Authorize]` proves the caller is logged in but nothing ties the resource to the caller, so changing the `id` operates on another user's data (delete user 15; read another user's matches/profile/todos). The frontend's pervasive "pass my userId as a parameter" pattern is exactly what a BOLA backend trusts.
- Remediation (recommendation only): derive identity from the JWT `NameIdentifier` claim server-side and `Forbid()` on mismatch; never trust a client id for identity. — est. backend 3–5h.

## [P6-002] Critical — Secrets committed to git in `appsettings.json`
- Source: `Code-review` backend report, commit `bb70a2b`.
- Scenario: Azure SQL admin password, JWT signing key, and Brevo + Anthropic API keys sit in cleartext in a committed file → anyone with repo access connects to the cloud DB, forges tokens, or bills the external APIs on your account.
- Remediation (recommendation only): rotate ALL exposed secrets now (treat as fully compromised); move to Azure Key Vault / App Config + env vars; `.gitignore` the file; purge from history. — est. 2–3h + rotation.

## [P6-003] Critical — Weak, guessable JWT signing key
- Source: `Code-review` backend report, `appsettings.json` `Jwt:Key` = `THIS_IS_A_SUPER_SECRET_KEY_1234567890!@#`.
- Scenario: a short predictable key is offline brute-forceable → an attacker mints valid tokens for any user (full auth bypass, defeats P6-001's fix too).
- Remediation (recommendation only): replace with a ≥256-bit CSPRNG secret in an env var; combine with the P6-002 rotation. — est. 0.5h (forces re-login).

### High

## [P1-001] High — Screens bypass the service layer and call `fetch()` directly (systemic)
- Files (9 screens, ~16 call sites): `app/(tabs)/community.jsx:91,174`; `app/(tabs)/myTrips.jsx:29`; `app/(tabs)/EditTrip/[id].jsx:54,85`; `app/(quiz)/PreferencesQuiz.jsx:352,685`; `app/(tabs)/PersonalProfile.jsx:66-68`; `app/(quiz)/MatchProfileDetails.jsx:120`; `app/(tabs)/TripDetails/[id].jsx:78,99,133,152`; `app/(tabs)/TripMatches/[id].jsx:129`; `app/matching/MatchingSuccess.jsx:222`. (Plus `app/(quiz)/Quiz.jsx:119` → external Geoapify.)
- Scenario: these screens import `BASE_URL` from `config`, hand-build `Bearer` headers, and call raw `fetch` — bypassing `app/src/api`. Consequence: they inherit none of the service layer's guarantees. Concretely, these raw calls do **not** route through `fetchWithTimeout` (Phase 4/11: a hung Azure cold-start on TripDetails/myTrips never times out), and each reimplements `.ok`-check / parse / error handling divergently, so the same endpoint behaves differently depending on who calls it. The declared UI→API→REST layering is real for the services but **not enforced at the screen boundary**.
- Systemic: same class of violation in 9 files — treat as one work package. This is the mechanism behind P1-005 (duplicated endpoints).
- Remediation (recommendation only): add the missing service functions (`getTripById`, `getCommunities`, profile-image getter) and route every screen fetch through `app/src/api`; screens import service fns, never `BASE_URL`. Extends existing services (no new primitive) — simplicity-compliant. — est. 3–4h (mechanical, one screen at a time)

## [P4-001] High — Client timeout on ~1 of 16 services; the rest can hang forever
- Files: `fetchWithTimeout` (20s) is imported only by `homeData.js` and `notificationService.js` (`getMyMatchesStrict`). All other services — `tripService`, `userProfileService`, `chatService`, `communityService`, `communityChatService`, `interestService`, `questionnaireService`, `recommendationService`, `todoService`, `blockService`, `authService`, `userService`, `interactionService`, `tripPlannerService` — call raw `fetch` with no timeout; `installFetchInterceptor` adds none either.
- Scenario: Azure Free dynos cold-start slowly; a stalled request on login, trip-create, profile-save, load-chats, or send-message never rejects → infinite spinner, no error, no retry (compounds P1-001's direct-fetch screens, also timeout-less). The mitigation primitive exists and is proven in `homeData` — simply not adopted.
- Remediation (recommendation only): route every service call through `fetchWithTimeout` (per-op timeout: short GETs, longer uploads). Mechanical. — est. 1.5–2h

## [P5-001] High — Push token never deregistered on logout (notifications follow a logged-out account)
- Files: register at `pushNotifications.js:57` (`saveExpoPushToken` after login); logout at `PersonalProfile.jsx:198,212` and `DeleteAccount.jsx:66` call only `clearAuth` (`authStore.js:51`), which never deregisters the Expo token server-side.
- Scenario: after A logs out, A's token stays mapped to A on the server, so A's notifications ("new match request from …") keep arriving on that device until someone else logs in and overwrites the mapping. On a shared/returned device this leaks A's notification content. (Same-device re-login by B overwrites the mapping, narrowing the cross-session variant → rated **High**; the priority matrix classes "push to logged-out users" as Critical, so **elevate to Critical if this ships**.)
- Remediation (recommendation only): add a server deregister endpoint and call it in `clearAuth`/logout (+ server-side cascade on DeleteAccount). — est. 1h (+ backend endpoint)

## [P6-004] High — `GetAllUsers` is unauthenticated and returns full PII
- Source: `Code-review` backend report — `UserController.GetAllUsers` (`GET /api/User`).
- Scenario: no `[Authorize]`, returns the full user row (email, full DOB, city, questionnaire answers) → an anonymous caller dumps every registered user's PII.
- Remediation (recommendation only): add `[Authorize]` + return a minimal DTO (id, display name, age-band, city, bio) — no email/DOB/hash. — est. 1h

## [P6-005] High — Live Geoapify API key hardcoded in client source
- File: `app/(quiz)/Quiz.jsx:85` — `GEOAPIFY_API_KEY = "b7fddb151bdd4eae8f4afe871bff1da1"`, committed in cleartext and shipped in the JS bundle.
- Scenario: trivially extractable from source/bundle; with no referrer/IP restriction anyone can reuse it to exhaust your Geoapify quota (autocomplete breaks) or run up billing. Same "committed secret" class as P6-002 but lower blast radius (geocoding quota, not DB/JWT) → **High**.
- Remediation (recommendation only): restrict the key (allowed referrers/IPs) and/or proxy geocoding through the backend so the key never ships to the client; move to env config; rotate the exposed key. — est. 1–2h

## [P11-001] High — No root ErrorBoundary anywhere in the app (no crash safety net)
- Evidence: repo-wide grep for `ErrorBoundary` → **0 matches** in app code. Expo Router supports an `ErrorBoundary` export from any layout (`app/_layout.tsx`); none exists.
- Scenario: a single uncaught render error — the latent `tripPreferenceScore` crash (P7-001) if a future caller passes raw data, or any unguarded access on malformed API data — propagates to the root with no recovery UI: a redbox in dev, blank/whitescreen or hard crash in a release/demo build, and no Hebrew "something went wrong, retry" screen. The absence **amplifies every unguarded-access bug in this report into a full-app crash**.
- Remediation (recommendation only): export a root `ErrorBoundary` from `app/_layout.tsx` (Expo Router convention) rendering a recoverable Hebrew screen with retry/reload. — est. 1h

## [P14-001] High (evaluation-risk) — Zero automated tests, despite four ideal pure-function targets
- Evidence: no test runner in `package.json` (no jest / testing-library); 0 test files in the repo.
- Scenario: senior-engineer evaluators notice "no tests" within the first 10 minutes; concretely, the four matching scorers (the showpiece) are pure functions whose edge cases (P7-001 null interests, P7-002 null-boolean, P7-003 dup-interests, behavioral cold-start) are exactly the bugs this review found by hand — a suite would have caught them and would let a maintainer change the algorithms safely.
- Remediation (recommendation only): add Jest + the ~13-case suite from Appendix B.2 (the 4 scorers only). Highest credibility-per-hour in the report. — est. 2–3h

### Medium

## [P1-002] Medium — ~35 phantom routes: `app/src/**` and `app/firebase/**` registered as Expo Router routes
- Evidence: `.expo/types/router.d.ts` (typedRoutes output) lists `/src/api/tripService`, `/src/api/config`, `/src/auth/authStore`, `/src/matching/matchContext`, `/src/theme`, `/src/utils/image`, `/firebase/firebase`, … as valid pathnames. Root cause: `app.json` uses the default router root (`extra.router:{}`), so every file under `app/` — including `app/src/**` — is a route candidate, and `experiments.typedRoutes:true` registers them.
- Scenario: these modules export named fns only (**0** `export default` in `app/src` — verified), so they aren't navigable to content, but they (a) pollute the typed-routes `href` union (autocomplete noise), (b) appear in `/_sitemap` (exposed on web since `web.output:"static"`), and (c) resolve to an error screen if deep-linked (`matchingapp://src/api/config`). Not a core-flow crash → **Medium** (the plan anticipated *High* for **navigable** phantom routes, which don't exist here because there are no default exports).
- Remediation (recommendation only): move `src/` (and `firebase/`) out of `app/` to repo root (`/src`, `/firebase`); a jsconfig path alias absorbs most import churn. All ~35 phantom routes + sitemap/deep-link surface vanish in one move. — est. 1–1.5h

## [P1-003] Medium — Auth-header construction duplicated ~15×; canonical helper unused; interceptor injects no header
- Evidence: `authHeaders()` is defined **8 times** — canonical export at `app/src/auth/authStore.js:65` plus 7 private copies (`homeData.js:28`, `notificationService.js:6`, `todoService.js:7`, `communityService.js:8`, `communityChatService.js:10`, `chatService.js:11`, `blockService.js:7`); `tripService.js`, `userProfileService.js` and 9 screens inline `Authorization: Bearer …` instead. `installFetchInterceptor.js` wraps `global.fetch` but only handles **401 egress** — it does not inject the Authorization header.
- Scenario: changing the auth scheme (header name, token prefix, adding a refresh header) means editing 15+ sites; miss one and that call silently 401s. The natural single source (the global fetch interceptor, or `authStore.authHeaders`) is bypassed.
- Remediation (recommendation only): inject the header once in `installFetchInterceptor` (or have every service import `authStore.authHeaders`); delete the 7 private copies. Enhances an existing primitive — simplicity-compliant. — est. 1h

## [P1-004] Medium — Service cohesion: `notificationService` is a grab-bag; community ops split; thin single-fn services
- Evidence: `app/src/api/notificationService.js` mixes four domains — the **match-request state machine** (`getPendingRequests`/`sendChatRequest`/`approveRequest`/`rejectRequest`/`cancelRequest`, `/MatchRequest/*`), **match fetching** (`getMyMatches`/`getMyMatchesStrict`, consumed by `homeData` as the matches source), **notifications** (`/Notification/*`), and **push-token registration** (`saveExpoPushToken` → `/User/pushToken`). Community membership (`getCommunityMembers`, `leaveCommunity`) lives in `communityChatService.js`, not `communityService.js` (which owns only `createCommunity`). `userService.js` owns a single function (`getAllUsers`).
- Scenario: Phase 8's match-request logic lives in a file named "notification", so a maintainer won't find it there; push-token code buried in notifications complicates the Phase 5 logout-deregistration audit.
- Remediation (recommendation only): document each service's boundary in a header comment now (cheap win); optionally regroup match-request + match-fetch into a `matchService` and push-token into `push/` later. — est. 0.5h (document) / +2h (regroup, optional)

## [P1-005] Medium — Endpoint strings duplicated across layers; some endpoints have no service at all
- Evidence: `/Trip/user/{id}` is issued from `tripService.getUserTrips:16`, `homeData.fetchTrips:74`, **and** screens `myTrips.jsx:29` / `PersonalProfile.jsx:68` / `MatchProfileDetails.jsx:120`. `/Trip/{id}` (GET) is issued from `TripDetails:78,133,152` / `EditTrip:54` / `PreferencesQuiz:352` / `TripMatches:129` — but **no** `tripService` function exposes it. `GET /Community` is issued from `community.jsx:91` — `communityService` has only `createCommunity` (POST).
- Scenario: the REST contract is authored in multiple places; a backend route rename (`/Trip/user` → `/Trips/byUser`) means hunting every string across services + screens.
- Remediation (recommendation only): each endpoint string lives in exactly one service function; screens/homeData call the function. Folds into the P1-001 work package. — est. included in P1-001

## [P1-006] Medium — Blob image-upload logic duplicated across services
- Evidence: `app/src/api/userProfileService.js:118` (`uploadProfileImage` → `fetch(localUri).blob()` → multipart POST) and `app/src/api/recommendationService.js:49` (`uploadRecommendationImage`, same blob-then-POST shape).
- Scenario: two copies of the upload dance diverge over time (one adds a size guard, the other doesn't); a third media feature (trip photos — see scalability answer, Appendix B.1) would add a third copy.
- Remediation (recommendation only): extract a single `uploadImage(endpoint, localUri, field)` helper once a **3rd** caller appears (respects the 3+-uses rule; currently 2 → log now, extract when trip photos land). — est. 0.5h when triggered

## [P7-001] Medium — `tripPreferenceScore` crashes on a candidate with no `interests` (latent; currently defended by callers)
- File: `app/src/matching/tripPreferenceScore.js:66-69`
- Scenario: `if (wantedInterests.length > 0 && user.interests.length > 0)` and `user.interests.map(...)` read `user.interests` **unguarded**. If a trip specifies wanted interests and any candidate's `interests` is null/undefined, this throws `Cannot read property 'length' of undefined`, crashing the whole `scoreByUser` memo (`TripMatches/[id].jsx:180`) and taking down trip matching. Both sibling scorers guard this — `introQuestionnaireScore.js:44` and `wheelMatchScore.js:18` use `(x.interests || [])`.
- Current status: **not reachable today** — both call sites pre-sanitize (`parseInterestNames`, which always returns an array — `TripMatches:111`; or a `[]` fallback — `MatchProfileDetails.jsx:311`). So it is a **latent robustness gap**: the function is unsafe in isolation and relies entirely on caller discipline. A future caller passing raw backend data would crash. Hence **Medium**, not Critical.
- Remediation (recommendation only): `(user.interests || [])` at line 66-67 — one line, matching the sibling scorers. First case in the P14 Jest suite. — est. 0.1h

## [P7-002] Medium — `wheelMatchScore` counts unknown==unknown as a positive match, inflating incomplete profiles
- File: `app/src/matching/wheelMatchScore.js:24-26`
- Scenario: `if (user.isSmoker === me.isSmoker) score += 10` (also kosher, shabbat) — when BOTH values are null/undefined (neither user answered), `null === null` / `undefined === undefined` is `true`, so a pair of blank profiles earns **+30 free "compatibility"**. The file's own comment acknowledges it ("does NOT filter null — kept as-was"). The wheel is the novelty feature examiners probe, so it ranks two un-answered profiles as a strong match. `matchReasons.js:82-91` does this correctly (fires only when both are positively true/false), proving the intended semantics.
- Remediation (recommendation only): only score a boolean when both sides are non-null and equal (mirror the other three scorers). Changes wheel results by design → flag to owner. — est. 0.25h

## [P4-002] Medium — Inconsistent error contract: mutations throw (good), but 5 reads swallow failures → `[]`
- Swallowing reads: `blockService.getBlockedUsers:20`, `notificationService.getPendingRequests:22` / `getMyMatches:83` / `getNotifications:145`, `interactionService.getEngagementPairs:30` — each `catch`es and `return []`.
- Scenario: for these reads a network failure is indistinguishable from "genuinely empty", so the UI shows an empty state instead of an error + retry (cross-ref Pass B state coverage). Positives worth noting: most services **throw** normalized Hebrew errors on `!res.ok` and on network error (auth/trip/profile/interest/questionnaire/userProfile), mutations throw correctly, and `homeData` deliberately consumes the throwing `getMyMatchesStrict` (not the swallowing `getMyMatches`) to keep fail≠empty — good awareness.
- Remediation (recommendation only): reads that back primary content should throw (or return `{data,error}`) so screens can retry; keep silent `[]` only for truly optional signals (`getEngagementPairs`, telemetry). — est. 1h

## [P5-002] Medium — Logout leaves the `homeData` snapshot (with PII) on disk
- Files: `clearAuth` (`authStore.js:51`) clears SecureStore token/user + `saved_email` but not the AsyncStorage key `home_snapshot_v1_{userId}` written by `homeData.updateSnapshot` (name, profile image, matches, trips).
- Scenario: after logout the previous user's snapshot lingers in device storage. It is **userId-guarded** (`getSnapshot` returns it only for the matching id), so **not** an active cross-user *display* leak, but it is residual PII at rest (readable by device-level inspection) and isn't cleared on account deletion either.
- Remediation (recommendation only): export `homeData.clearCache(userId)` and call it from `clearAuth`/logout and DeleteAccount. — est. 0.5h

## [P10-001] Medium — Three giant screen files (decomposition plan)
- Files: `app/(quiz)/Quiz.jsx` (1,788), `app/(quiz)/PreferencesQuiz.jsx` (1,674), `app/(tabs)/recommendations.jsx` (1,313) — each does fetch + transform + multi-step render + animation in one body.
- Scenario: these block safe change (the P2 exhaustive-deps leads and the P1-001 direct-fetch violations cluster here) and are the first thing a hiring engineer skims. Quiz and PreferencesQuiz are near-sibling step-driven flows (a likely copy-pair); a shared step-engine hook + the existing `QuizShell` primitive would absorb much of both.
- Remediation (recommendation only, plan not executed): per screen, extract (a) presentational sub-components and (b) one data/logic hook; target ≤ ~400 lines/screen; factor a shared `useQuizFlow` hook for the two quiz siblings (justified by 2 reuse sites + `QuizShell`). Execute incrementally per simplicity rules. — est. plan now; ~2–3h/screen later

## [P14-002] Medium (evaluation-risk) — README is default Expo boilerplate; no ARCHITECTURE/ALGORITHMS docs
- Evidence: `README.md` is the verbatim create-expo-app template ("Welcome to your Expo app 👋", `reset-project`, `app-example`) — zero project-specific content; no `ARCHITECTURE.md` / `ALGORITHMS.md` anywhere.
- Scenario: professors and engineers open the README first; it says nothing about Tzemed Hemed, the matching algorithms, or the architecture, so the project's real strengths are invisible. Mitigant: the matching code is well-commented (formulas derivable), and this report's B.1 diagram + B.2 spec sheets seed the docs directly.
- Remediation (recommendation only): replace the README with a real overview; add `ARCHITECTURE.md` (B.1 diagram) + `ALGORITHMS.md` (B.2 formulas + one worked example). — est. 2h

## [P6-006] Medium — Firestore security rules unverified (open rules = IDOR-equivalent on planner data)
- Evidence: Firebase v12 = Firestore realtime for the trip planner (`tripPlannerService.js` `onSnapshot`; `app/firebase/firebase.js` holds the client config — public by design, not a secret). Planner reads/writes bypass the ASP.NET backend entirely and rely solely on Firestore rules for authorization.
- Scenario: if Firestore is in test-mode/open rules (a common student default), any client can read or write any trip's planner events directly, independent of the backend's (already broken) auth. Unverifiable from the repo — needs the Firebase console.
- Remediation (recommendation only): verify rules restrict planner docs to trip participants; if open, **elevate to Critical** and lock down. — est. 0.5h verify + rules work

### Low

## [P1-007] Low — JS/TS drift: one layout is JSX among TSX siblings
- Evidence: `app/matching/_layout.jsx` is JSX while `app/_layout.tsx`, `app/index.tsx`, and the `(auth)`/`(quiz)`/`(tabs)`/`chat` layouts are TSX; all screens are JS/JSX.
- Scenario: no runtime impact; signals the TS/JS split is drift, not policy.
- Remediation (recommendation only): decide + document the policy (layouts TS, screens JS) and rename `matching/_layout.jsx` → `.tsx`. — est. 0.25h

## [P1-008] Low — Dead config in `config.js`
- Evidence: `app/src/api/config.js:3` `LOCAL_IP = "192.168.7.6"` is unused (also the lint `no-unused-vars` hit) and line 6 is a commented-out local `BASE_URL`.
- Scenario: a private LAN IP lingering in source is a mild info leak and obscures which `BASE_URL` is live.
- Remediation (recommendation only): delete `LOCAL_IP` + the commented line; a dev override belongs in an env var. — est. 0.1h

## [P7-003] Low — `introQuestionnaireScore` can exceed 100% when a profile has duplicate interests
- File: `app/src/matching/introQuestionnaireScore.js:48-51`
- Scenario: `shared` counts entries of the un-deduped `theirInterests` array that are in my set, while `union` uses a `Set` (deduped). If `other.interests` has duplicates I also hold (e.g., `["hiking","hiking"]`), `shared > union`, so `jaccard > 1`, the interests term exceeds its weight, and `Math.round((earned/maxPossible)*100)` can print e.g. **104%**. Likelihood depends on whether the backend permits duplicate interests per user.
- Remediation (recommendation only): dedupe both sides first, or `shared = [...mySet].filter(i => theirSet.has(i)).length`. — est. 0.1h

## [P7-004] Low — `wheelMatchScore` uses a non-normalized (additive, capped) scale unlike the other three 0–100 scorers
- File: `app/src/matching/wheelMatchScore.js:9-28`
- Scenario: intro/trip/behavioral normalize to a true percentage; the wheel sums fixed points and clamps at 100, so "70" on the wheel is not comparable to "70" on the intro screen. Fine while the wheel score drives only in-wheel ranking (its stated purpose), but misleading if any UI ever shows a wheel % beside a normalized %.
- Remediation (recommendation only): document it as an in-wheel ordinal, or normalize to `maxPossible` like the others if ever shown as a headline %. — est. 0.25h (or doc-only)

## [P4-003] Low — 86 `console.*` calls in `app/src/api/` alone
- Files: e.g. `tripService` (36), `userProfileService` (15), `interestService` (12), `questionnaireService` (9), `userService` (7) — mostly diagnostic `console.error` in catch blocks.
- Scenario: acceptable while debugging, but noisy for a "reads like one professional wrote it" bar, and some log full errors/URLs. Inventory for Pass C (P10/P13).
- Remediation (recommendation only): route through a tiny `log` util gated by `__DEV__`; drop per-call success logs. — est. 0.5h

## [P5-003] Low — Legacy `saved_password` key: removed on logout, never written (confirms NO plaintext password)
- File: `authStore.js:58` removes `["saved_email","saved_password"]`, but a repo-wide grep finds **no writer** of `saved_password`; only `saved_email` is persisted (`Login.jsx:60`, for prefill). So **no plaintext password is stored** — a positive (the common student Critical is absent); the removal is defensive cleanup of a key a prior version wrote.
- Remediation (recommendation only): drop the dead `saved_password` reference; document that only email is cached. — est. 0.1h

## [P5-004] Low — `window.confirm` used in a native logout path
- File: `PersonalProfile.jsx:197` — `if (window.confirm("…"))` for logout confirmation (with an `Alert.alert` fallback for native).
- Scenario: `window.confirm` is a web API (undefined on native); works if branched by `Platform.OS === "web"`, but it's a web idiom in an RN screen.
- Remediation (recommendation only): use one `Alert.alert` confirm (or a shared confirm helper) across platforms. — est. 0.2h

## [P2-001] Low — 1:1 chat send lacks an explicit in-flight guard (incidentally covered)
- File: `app/chat/[matchId].jsx:201-212` — `send` disables its button only via `disabled={!text.trim()}` (line 527), with no `sending` state, unlike `community-chat` (`sending` guard, line 230).
- Scenario: double-submit is *incidentally* prevented because `send` calls `setText("")` synchronously (line 204) → the button disables on the now-empty input. Robust in practice; a very fast double-tap before re-render is a theoretical duplicate-send, and it relies on the optimistic-clear side effect rather than an explicit guard. (Positives: optimistic append + rollback-on-failure + Hebrew error alert.)
- Remediation (recommendation only): add a `sending` state guard mirroring community-chat. — est. 0.2h

## [P10-002] Low — Dead dependencies + template leftovers
- Evidence: `lucide-react` and `@lottiefiles/dotlottie-react` have **0 imports** (the app uses `lucide-react-native` + `lottie-react-native`); `@expo/ngrok` is a tunnel CLI sitting in `dependencies` (source-unused); `scripts/reset-project.js` + the `app-example` template scaffolding (referenced by the boilerplate README) remain.
- Scenario: unused web packages bloat install and muddy the dependency story; `@expo/ngrok` in prod deps is a mis-placement; the template leftovers signal unfinished cleanup.
- Remediation (recommendation only): remove the two dead web deps, move/drop `@expo/ngrok`, delete `reset-project.js` + `app-example`; verify with `npx expo install --check`. — est. 0.5h

---

## 8. Remediation Roadmap

Work packages ordered by priority, simplicity-rules-compliant (reuse primitives, no new primitive without 3+ uses, no big refactors). **Plan only — nothing here is executed by this assessment.** Rough total ≈ 22–30h; the security tier (WP1–WP3) is ≈ 8–11h and is the gate for any real use.

**Tier 0 — Security Criticals (do first; mostly backend):**
- **WP1 — Rotate & relocate secrets** (P6-002, P6-003): rotate the Azure SQL password, JWT key, Brevo + Anthropic keys; move to Key Vault / env; `.gitignore` + purge history; replace the JWT key with a ≥256-bit CSPRNG secret. — ~3h + rotation.
- **WP2 — Token-derived identity + ownership checks** on every controller; stop trusting client IDs (P6-001). — ~3–5h.
- **WP3 — Close data exposure** (P6-004 `[Authorize]`+DTO on GetAllUsers · P6-005 restrict/proxy the Geoapify key · P6-006 verify/lock Firestore rules). — ~2–3h.

**Tier 1 — High reliability (cheap, high-visibility):**
- **WP4 — Root ErrorBoundary** in `app/_layout.tsx` (P11-001). — 1h.
- **WP5 — Universal timeouts**: route all services through `fetchWithTimeout` (P4-001). — 1.5–2h.
- **WP6 — Logout completeness**: deregister push token + clear the homeData cache (P5-001, P5-002). — 1.5h.

**Tier 2 — Correctness & capstone credibility:**
- **WP7 — Scorer hardening + tests** (P7-001 guard interests · P7-002 wheel null-match · P7-003 dup-interests · P14-001 ~13-case Jest suite). — 2–3h. *Highest credibility-per-hour in the report.*
- **WP8 — Enforce the service boundary**: route the 9 direct-fetch screens through services, add the missing service fns, centralize `authHeaders` (P1-001, P1-003, P1-005). — 4–5h.

**Tier 3 — Docs & hygiene (polish):**
- **WP9 — Docs**: real README + `ARCHITECTURE.md` (from B.1) + `ALGORITHMS.md` (from B.2) (P14-002). — 2h.
- **WP10 — Structure & cleanup**: move `src/` + `firebase/` out of `app/` (kills ~35 phantom routes, P1-002); remove dead deps + template leftovers (P10-002); dead config (P1-008); a `__DEV__` log util (P4-003). — 2–3h.
- **WP11 — Giant-file decomposition** (P10-001): plan documented (Appendix B.5); execute incrementally (~2–3h/screen), not urgent.

---

## 9. Appendices

### Appendix A — ESLint baseline, per-file breakdown (2026-07-14)

| File | Line | Rule | Detail |
|---|---|---|---|
| `app/(quiz)/MatchProfileDetails.jsx` | 175 | exhaustive-deps | missing: `matchContext.score/tripId/type`, `matchUser.userID`, `params.matchContext/me` |
| `app/(quiz)/PreferencesQuiz.jsx` | 446 | exhaustive-deps | missing: `fadeAnim`, `slideAnim` (useCallback) |
| `app/(quiz)/Quiz.jsx` | 474 | exhaustive-deps | missing: `answers.city` (useEffect) |
| `app/(quiz)/Quiz.jsx` | 621 | exhaustive-deps | missing: `fadeAnim`, `slideAnim` (useCallback) |
| `app/(quiz)/QuizStartScreen.jsx` | 76 | exhaustive-deps | missing: `opacity`, `translateY` |
| `app/(quiz)/QuizStartScreen.jsx` | 166 | exhaustive-deps | missing: `progress`, `router` |
| `app/(tabs)/PersonalProfile.jsx` | 116 | exhaustive-deps | missing: `cachedUser?.email` |
| `app/(tabs)/community.jsx` | 72 | exhaustive-deps | missing: `loadCommunities` (useEffect) |
| `app/(tabs)/community.jsx` | 78 | exhaustive-deps | missing: `loadCommunities` (useCallback) |
| `app/(tabs)/matchesForYou.jsx` | 94 | exhaustive-deps | missing: `loadUsers` (useEffect) |
| `app/(tabs)/recommendations.jsx` | 212 | exhaustive-deps | missing: `loadRecommendations` (useEffect) |
| `app/chat/[matchId].jsx` | 128 | exhaustive-deps | missing: `kb` (useEffect) |
| `app/src/api/config.js` | 3 | no-unused-vars | `LOCAL_IP` assigned but never used |

**Total: 13 warnings, 0 errors.**

### Appendix B — per-phase deliverables
_(state-coverage matrix, authorization matrix, scorer spec sheets, transition tables, walkthrough logs — added as each phase produces them.)_

#### B.1 — Phase 1: Architecture

**Dependency diagram (verified — no cycles, no reverse edges):**

```
  LEAF        theme/  (colors, spacing, typography, shadows, fonts)
                ▲
                │ imported by
  PRESENTATION  components/ (ui/*, BottomNav, Snackbar, HeaderMenu)   ── pure; import NOTHING from api/screens ✔
                ▲
                │
  SCREENS   app/(tabs) (quiz) (auth) chat/ community-*/ matching/ …
     │  ✔ import components + theme
     │  ✔ import services (app/src/api)
     │  ✘ 9 screens ALSO import BASE_URL and fetch() directly ───────────► REST   ◄── P1-001 (the one boundary breach)
     ▼
  SERVICES  app/src/api/* (16) + homeData + fetchWithTimeout + installFetchInterceptor
     │  ✔ import config, authStore, fetchWithTimeout
     │  ✔ NEVER import components or screens (clean upward direction) ────► REST (Azure HTTPS)
     ▼
  matching/ (4 scorers + matchContext)   ◄─ consumed by screens/api
  auth/ authStore  (token in SecureStore) ◄─ consumed by services/screens

  CROSS-CUTTING: installFetchInterceptor wraps global.fetch → 401 → clearAuth + Login.
                 It is the ONE justified api→nav/UI edge (imports router + Alert). Contained; acceptable.
```

**Direction verdict:** Clean. `theme` is a true leaf; `components/` are pure presentational (verified: zero imports of `api/`, `Service`, `homeData`, `matching`); services never import up into components/screens; `matching`/`auth` are leaf-ish shared modules. The only boundary violation is **screens → REST** (P1-001), which is a *missing hop*, not a cycle.

**`homeData.js` verdict:** **PURE** ✔ — data/cache/SWR/prefetch/warm-startup only, no React/UI/nav/alerts (self-documented at top). Model citizen of the layer (uses `fetchWithTimeout`, in-flight dedup, SWR snapshot, justified 20s timeout). No God-object drift. Minor: it inlines `/Trip`, `/UserProfile`, `/Questionnaire` endpoints rather than composing the existing service fns (feeds P1-005), but that stays within the data layer.

**Scalability answer — "add feature #15 (trip photos): which files change?"**
More than 4, scattered across layers, and it **compounds existing debt**:
1. Backend endpoint (out of frontend scope).
2. A service upload fn — but image upload is duplicated today (P1-006), so this adds a **3rd** copy unless extracted first.
3. `app/src/utils/image.js` (`buildImageUri`) for the display URL — **1 clean touch-point** ✔ (the one well-centralized part).
4. Screens `TripDetails/[id]`, `EditTrip/[id]`, `myTrips`, `TripMatches` — each fetches Trip via **direct** `fetch` (P1-001), so each grows its own inline photo fetch/display → 3–4 screens.
5. `homeData` if photos surface on Home.
→ **~5–6 frontend files across 3 layers**, replicating P1-001 + P1-006. Growth cost is dominated by the **unenforced service boundary**, not by folder structure. Bright spot: image-URL construction is centralized, so *display* is a single touch-point.

**Positives recorded (not all debt):** clean dependency direction; `homeData` pure; global 401 handling exists and is universal (wraps `global.fetch`); token in **SecureStore** (not AsyncStorage); consistent `fetch` (no axios/fetch mix); a real token/theme system; sensible route groups `(auth)/(quiz)/(tabs)`.

**Cross-references seeded for later phases (not re-logged here):**
- **Phase 4:** most services use raw `fetch`, not `fetchWithTimeout` → timeout-coverage finding (homeData is the exception).
- **Phase 5:** `authStore.clearAuth()` clears token/user/saved-creds but **not** the `homeData` snapshot (`home_snapshot_v1_*`) in AsyncStorage → lingering-PII-on-device (userId-guarded, so not an active cross-user *display* leak, but audit at logout). Token-in-SecureStore is a positive to confirm.
- **Phase 6:** `Quiz.jsx:119` calls Geoapify directly — check for an embedded API key; `app.json` requests Android `RECORD_AUDIO` — justify or drop (over-broad for a travel app).
- **Phase 13:** the stale backend copy `MatchingAppServer/` is present **inside this repo** (confirmed via `Bearer` grep hitting `MatchingAppServer/Program.cs`) — flag as misleading, recommend archive/remove.

#### B.2 — Phase 7: Matching scorer spec sheets

| # | Scorer (file) | Inputs | Formula → range | Edge-case behavior | Verdict |
|---|---|---|---|---|---|
| 1 | Intro / general compatibility (`introQuestionnaireScore.js`) | `(me, other)` | `Σ(weight × fraction) / Σ(comparable weights) × 100` → **0–100** (null if a side missing) | null side→null; no comparable field→0; Jaccard union-guarded; age/levels/booleans null-guarded; **symmetric** `score(A,B)=score(B,A)` ✓ | Sound. Lows: dup-interests→>100 (P7-003); score 0 conflates "no data" with "bad match" |
| 2 | Behavioral / collaborative filtering (`behavioralMatch.js`) | `(me, users, engagementPairs, dismissed)` | `cosine(myTargets, other) × weight`, summed, `raw/max × 100` → **0–100** | empty inputs→[]; **cold start** (no activity)→[] (intentional); cosine div-guarded; `max=0`→[]; string/number id keys reconciled | Sound. Legit CF; cold-start handled cleanly |
| 3 | Trip preference (`tripPreferenceScore.js`) | `(user, pref, prefInterests, priorityFactors)` | `Σ(base × priorityMult × fraction) / Σ(...) × 100` → **0–100** | `!pref`→0; age-decay bounded (`AGE_DECAY=10`); gender exact; priority mult `[2,1.5,1.2]`; **`user.interests` UNGUARDED (P7-001)** | Sound except P7-001; asymmetric by design (user vs trip) ✓ |
| 4 | Wheel "best match" (`wheelMatchScore.js`) | `(me, user)` | additive points, **`min(Σ,100)`** → 0–100 **capped, not normalized** | interests guarded; age falsy-guarded; **booleans: `null===null` scores (P7-002)** | Functional; P7-002 fairness quirk + non-normalized scale (P7-004) |
| — | Reasons (`matchReasons.js`) | `(me, other, {limit})` | derives human reasons from the **same signals** as #1 | null-safe; a boolean reason fires only when **both** sides are positively true/false | **Explainability is real** — reasons map to actual scoring inputs; travel-themed, not decorative ✓ |

**Module-level notes (positives + cross-refs):**
- **No NaN anywhere** across the four scorers (all divisions guarded); weights are **named constants with rationale comments** (`INTRO_WEIGHTS`, `TRIP_WEIGHTS`, `PRIORITY_MULTIPLIERS`, `AGE_DECAY`, `LEVEL_RANGE`).
- All four were **extracted from their screens into pure functions** for reuse — good structure — and are invoked inside `useMemo` (per-dataset, not per-render; `TripMatches:180`, `matchesForYou:241`). `reactCompiler:true` further reduces re-score cost.
- **Explainability verdict (examiners' "why did these two match?"):** `matchReasons` keys (interests/age/spontaneity/lifestyle/shabbat/kosher/smoker) and thresholds (`AGE_CLOSE=2` = the intro scorer's full-score band; `LEVEL_CLOSE=1`) are aligned with the intro scorer's signals → the app can **truthfully** explain a match. Strong capstone asset.
- **Cross-refs:** `parseInterestNames` is **duplicated** (`TripMatches/[id].jsx:48`, `matchesForYou.jsx:61`) → Phase 10 duplication item. The engagement `weight` semantics come from the backend (`interactionService.getEngagementPairs`); the client treats them as opaque positive weights.
- **P14 test targets (~13 cases, ready to hand off):** intro → symmetry + partial-profile normalization + dup-interests(P7-003); behavioral → cold-start + empty + ranking order; trip → null-interests(P7-001) + age-decay + priority-mult + no-pref; wheel → null-boolean(P7-002) + 100-cap.

#### B.3 — Pass A: API / Auth / Security headlines (P4 / P5 / P6)

**API contract (P4):** timeout coverage **2 of 16** (`homeData` + `getMyMatchesStrict`); error handling **mostly throws** normalized Hebrew errors (auth/trip/profile/interest/questionnaire/userProfile) with `!res.ok` checks and non-JSON-safe parse — good — but **5 reads swallow → []** (P4-002). No axios; single `BASE_URL`. Verdict: a solid contract undermined by near-absent timeouts.

**Token lifecycle (P5):** issue → `setAuth` → **SecureStore** (token + user), in-memory mirror for sync reads ✓ · attach → per-call `authHeaders`/inline `Bearer` (duplicated, P1-003) · expire → **no client-side expiry**; relies on server 401 → global interceptor → `clearAuth` + Login ✓ · logout → clears token/user/email but **not** push token (P5-001) or homeData cache (P5-002). Storage verdict **strong** (SecureStore, no plaintext password — P5-003); completeness verdict **two logout gaps**.

**Security (P6):** the backend authorization model is the weak point — **3 Criticals** (IDOR/BOLA P6-001, committed secrets P6-002, weak JWT P6-003) + **1 High PII** (P6-004), all from the existing `Code-review` backend report and corroborated by the frontend's "send my userId" pattern; plus **1 frontend High** (Geoapify key P6-005). **Blocking enforcement** (server-side vs client-only) and the **two-account IDOR reproduction** need the owner's runtime test with two accounts (boot pending, §3) — flagged, not yet verified. Transport is HTTPS (Azure) ✓.

#### B.4 — Pass B: Demo-survival (P2 / P11 / P12 essentials)

Demo-breakers only; full sweeps folded per scope note.
- **Crash safety net:** ❌ **No root ErrorBoundary** (P11-001) — the one real demo-breaker. Any render throw = full crash, no recovery screen.
- **Effect leaks (chat poll):** ✅ clean. `chat/[matchId]` uses `useFocusEffect` + `clearInterval` (starts on focus, stops on blur — best practice, self-documented at line 168); `community-chat` clears its 4s poll on cleanup (line 224). No background-polling leak.
- **Double-submit:** ✅ consistently guarded — `sending`/`submitting`/`saving` state + disabled buttons across MatchProfileDetails (match request), Quiz, PreferencesQuiz, Wheel, community-chat, community-create (even guards re-create via a `created` flag), ChangePassword, reset-password, TripPlanner, EditTrip. Only the 1:1 chat send relies on incidental optimistic-clear (P2-001, Low).
- **Malformed-data safety:** mostly OK — services return `[]` on read failure (P4-002), so list `.map`s don't crash on null; residual risks are the latent `tripPreferenceScore` (P7-001) and the missing ErrorBoundary that would make any slip fatal.
- **Offline walkthrough / stuck-navigation / font-scaling:** require the app booted on a device + 2 accounts (§3) — deferred to the owner; not verified this session.

#### B.5 — Pass C: Capstone framing (P10 / P14)

- **Giant files (P10-001):** Quiz 1,788 · PreferencesQuiz 1,674 · recommendations 1,313. Plan: per screen → presentational sub-components + one logic hook; shared `useQuizFlow` for the two quiz siblings (+ existing `QuizShell`); target ≤ 400 lines. Plan only, executed later.
- **Tests (P14-001):** none today. Ship the ~13 Jest cases for the 4 pure scorers listed in B.2 — highest credibility-per-hour.
- **Docs (P14-002):** README is create-expo-app boilerplate; no ARCHITECTURE/ALGORITHMS. Seed both directly from B.1 (layer diagram) + B.2 (scorer formulas + a worked example).
- **Deps/hygiene (P10-002):** remove `lucide-react` + `@lottiefiles/dotlottie-react` (0 imports), relocate `@expo/ngrok`, delete `scripts/reset-project.js` + `app-example`.
- **Firebase (usage established):** Firebase v12 = Firestore realtime for the trip planner (`tripPlannerService.onSnapshot`); the only security question is the Firestore rules (P6-006, console check).
