# Tzemed Hemed (צמד חמד) — Engineering Review Plan (Read-Only Assessment)

**Role:** Senior Staff Engineer / Tech Lead pre-release review.
**Mode:** **READ-ONLY.** The assessment observes, measures, and reports. No source file is modified, no commit is made, no dependency is touched, nothing is deleted or renamed. The only artifact produced is the assessment report. Every "fix" becomes a costed recommendation in the final Remediation Roadmap — never an action.
**Goal:** Engineering excellence, not deployment. The project stays local + Azure backend; we assess it as if it were going through a company release gate.
**Scope:** Frontend repo (`matchingApp`). Backend (ASP.NET, `Desktop\MatchingAppServer` — the deployed copy, NOT the stale copy in this repo) is inspected read-only where frontend claims depend on it (authorization, blocking, matching correctness).

---

## How to use this document

- Execute phases in the **Recommended Execution Order** (bottom of this doc), one phase per session (large phases split into two).
- Every finding goes into the assessment report (single document, created in Phase 0, outside the app source — e.g., `Code-review/ASSESSMENT.md`) using the Findings format below.
- **Nothing gets fixed during or between phases.** Findings are logged with severity, evidence, and a remediation recommendation (with effort estimate). Execution is a separate future decision, out of scope for this assessment.
- Runtime verification (running the app, two-account tests, airplane-mode walkthroughs) is allowed and encouraged — it exercises the app but never changes code. Use disposable test accounts; any test data created on the dev backend is acceptable QA residue. If runtime testing is not possible for a finding, a code-level proof (file:line + failure trace) suffices.
- Remediation recommendations must respect the project's migration simplicity rules: no big refactors, reuse existing primitives, no new primitive without 3+ call sites, simple over abstract.
- The `tzemed-hemed-design` skill (design bible) is the canonical authority for every UI/UX judgment in Phases 3 and 12. Findings that contradict the bible are wrong; gaps the bible doesn't cover get logged as proposed bible additions (not made).
- Each phase ends with a **grade (A–F)** for its area; grades roll up into the final scorecard.

## Global severity scale (used in every phase)

| Severity | Definition | Examples |
|---|---|---|
| **Critical** | Security hole, data exposure, crash on a main flow, silently wrong core results | IDOR on API, token in plaintext, matching score NaN, crash on Home |
| **High** | Bug a normal user will hit; leak; race; broken error path on a core flow | Missing effect cleanup in chat, double-submit creates duplicate trip, 401 not handled |
| **Medium** | Maintainability debt; inconsistency; missing states on secondary screens | Duplicated logic, hardcoded colors, no empty state on a settings list |
| **Low** | Polish | Naming, dead code, comments, minor animation timing |

## Evidence rules

- A finding must cite `file:line` and state the failure scenario (input/state → wrong outcome). "This looks bad" is not a finding.
- Runtime claims (leaks, re-renders, races) need either a reproduction path or a code-level proof (e.g., "subscription created in effect, no cleanup returned").
- Pre-logged known items (do NOT re-discover, just reference): (1) app-wide title alignment audit is deferred by owner decision; (2) Home hero "unknown state" on matches-error-without-cache is a known deferred UX task.

---

## Codebase inventory (measured 2026-07-14)

- **Screens:** 40 `.jsx` route files + 6 `.tsx` layouts under `app/`.
- **Largest files:** Quiz.jsx (1,788), PreferencesQuiz.jsx (1,674), recommendations.jsx (1,313), Wheel.jsx (843), matchesForYou.jsx (706), MatchingSuccess.jsx (706), UpdateTravelPreferences.jsx (697), community-chat/[communityID].jsx (686), chat/[matchId].jsx (659), MatchProfileDetails.jsx (648).
- **API layer:** 16 services + `config.js` (6 lines), `fetchWithTimeout.js` (17), `installFetchInterceptor.js` (34), `homeData.js` (139, SWR + warm-prefetch startup layer).
- **Matching:** 4 scorers (24–84 lines each) + `matchContext.js` + `utils/matchReasons.js`.
- **Theme:** `colors / typography / spacing / shadows / fonts / globalStyles` under `app/src/theme/`.
- **Components:** 19 (`components/ui/` has 15, incl. new Card / EmptyState / ListRow / ScreenHeader).
- **Auth:** `authStore.js` (61 lines). Both `expo-secure-store` AND `async-storage` are installed.
- **Tooling:** ESLint (expo config) present; **no test runner installed**; TypeScript present but only layouts use it.
- **Dependency flags:** `lucide-react` (web) alongside `lucide-react-native`; `@lottiefiles/dotlottie-react` (web package); `@expo/ngrok` in production deps; `firebase` v12 (usage unknown — inspect).
- **Working tree:** uncommitted changes on `liel_branch` (Home, TripDetails, myTrips, SplashScreen, notificationService, + new homeData.js and 4 new ui components).

---

# Phase 0 — Baseline & Setup (prerequisite)

**Goal:** Record an exact snapshot of what is being assessed and set up the report infrastructure — without touching the repo.
**Why it matters:** An assessment must state precisely what it covered; findings against an unrecorded state can't be re-verified later.
**Files involved:** git working tree (read-only), `package.json`, this document.
**What to inspect / do:**
- Record the snapshot identity in the report header: current commit hash (`git rev-parse HEAD`), branch, and the full `git status` dirty-file list. The uncommitted work on `liel_branch` is assessed **as-is** — the dirty files are part of the assessed state and are listed so the assessment is reproducible. (Recommend — do not perform — committing before any future remediation work.)
- Run `npx expo lint` once (read-only analysis); record the warning/error count as a quality metric.
- Confirm the app boots on a device/emulator (login → Home) so runtime phases are executable.
- Create the assessment report document (outside the app source, e.g., `Code-review/ASSESSMENT.md`) with the findings format below and a scorecard skeleton (one row per phase).
**Common mistakes to look for:** starting to assess without recording the snapshot; lint metric never captured so the final report has no quantitative baseline.
**Severity levels:** N/A (setup).
**Exit criteria:** Snapshot identity recorded (commit + dirty list); lint metric recorded; report document exists with scorecard skeleton; app boots.
**Estimated effort:** 1h.

---

# Phase 1 — Architecture

**Goal:** Verify the declared layering (UI → API services → REST → backend) actually holds, and that module boundaries, dependency direction, and folder structure will survive growth.
**Why it matters:** Every later phase assumes the layering is real. If screens call `fetch` directly or services import UI, findings in Phases 4–9 multiply.
**Files involved:** entire tree structure; `app/_layout.tsx`, `app/index.tsx`, all of `app/src/`, `components/`, `package.json`, `app.json`.
**What to inspect:**
- **Layer boundaries:** grep for `fetch(`/axios/URLs outside `app/src/api/` — screens must never talk to the network directly. Services must never import from `components/` or `app/(tabs)/`.
- **Dependency direction:** build a quick import graph: theme ← components ← screens; api ← screens; matching ← screens/api. Flag any cycle or reverse edge.
- **`app/src/` inside the router directory:** Expo Router treats everything under `app/` as route candidates. Verify `app/src/**` doesn't generate phantom routes or "missing default export" warnings; assess whether `src/` should live at repo root (log as finding with a recommendation — no move is performed).
- **Cohesion:** does each service own exactly one domain? Check for overlap (e.g., trip logic split across `tripService` / `tripPlannerService` / `todoService`; user data across `userService` / `userProfileService`). Overlap is fine if boundaries are documented; flag if the same endpoint is called from two services.
- **`homeData.js` boundary:** it must remain a pure data layer (SWR + prefetch orchestration). Flag any UI logic, navigation, or formatting inside it — God-object drift is a standing project risk.
- **SOLID/DRY/KISS applied pragmatically:** single responsibility at the file level (the 1,700-line quiz screens are Phase 10's problem, but note structural causes here); repeated screen scaffolding that `Screen`/`ScreenHeader`/`AuthShell`/`QuizShell` should absorb.
- **Mixed JS/TS strategy:** layouts are TS, everything else JS. Is this intentional and documented, or accidental drift?
- **Scalability question to answer in writing:** "If we add feature #15 (e.g., trip photos), which files change?" If the answer is >4 files scattered across layers, note why.
**Common mistakes to look for:** business logic living in screen components; components importing services directly (skipping screen orchestration); duplicated constants (API base URL, colors) outside their home module; utility functions defined inside screens and copy-pasted between them.
**Severity levels:** cycle in imports / screens fetching directly = High; phantom routes from `app/src` = High; cohesion overlaps = Medium; JS/TS drift = Low.
**Exit criteria:** One-page dependency diagram exists; every layer violation logged with file:line; written answer to the scalability question; homeData confirmed pure or drift logged.
**Estimated effort:** 3h.

---

# Phase 2 — React Native Correctness (Hooks, Renders, Navigation)

**Goal:** Find hook bugs, leaks, stale closures, re-render waste, and navigation/RTL/accessibility defects.
**Why it matters:** This is where student RN projects hide their worst runtime bugs — they surface as "sometimes it doesn't refresh" and "app slows down after 10 minutes".
**Files involved (priority order, by size × risk):** `app/(quiz)/Quiz.jsx`, `PreferencesQuiz.jsx`, `app/(tabs)/recommendations.jsx`, `app/(quiz)/Wheel.jsx`, `app/chat/[matchId].jsx`, `app/community-chat/[communityID].jsx`, `app/(tabs)/matchesForYou.jsx`, `app/matching/MatchingSuccess.jsx`, `app/(tabs)/Home.jsx`, `TripMatches/[id].jsx`, `activeChats.jsx`, `TripDetails/[id].jsx`, `PersonalProfile.jsx`, then the remaining screens in a faster sweep; all 6 `_layout.tsx` files; `matchContext.js`.
**What to inspect:**
- **useEffect:** dependency arrays complete and honest (no eslint-disable to silence them); cleanup returned for every subscription, `setInterval`/`setTimeout`, keyboard listener, notification listener, and chat poll; no setState after unmount; no effect that exists only to mirror props into state.
- **Chat screens specifically:** polling/subscription lifecycle across blur/focus — does leaving the chat stop the polling? Does re-entering create a second subscription?
- **useFocusEffect vs useEffect:** list screens (myTrips, matchesForYou, activeChats, notifications) — does data refresh on tab re-focus, and is that refetch deduplicated with homeData's cache?
- **useMemo/useCallback:** used where a measured re-render problem exists (renderItem, context values) — and NOT sprinkled meaninglessly. A `useCallback` with unstable deps is noise; flag both absence-where-needed and cargo-cult usage.
- **Re-render analysis:** inline object/array/function literals passed to memoized children or FlatList; context values recreated every render in `matchContext.js` (a context whose value is a fresh object re-renders every consumer).
- **State management:** derived state stored in state (e.g., filtered lists kept in useState instead of computed); giant multi-field useState objects in the quiz screens where a reducer or split state is warranted.
- **Navigation/Expo Router:** dynamic routes (`[id]`, `[matchId]`, `[communityID]`) — behavior on invalid/missing ID; params passed as strings but used as numbers; back-stack correctness after MatchingSuccess and quiz completion (can the user "back" into a completed quiz?); route groups `(auth)/(quiz)/(tabs)` gating.
- **RTL:** no reliance on physical `left/right` styles where `start/end` is meant; text alignment for Hebrew; icons/chevrons flipped correctly; `I18nManager` assumptions documented.
- **Accessibility:** `Tappable`/`Button` expose `accessibilityRole`/`Label`; touch targets ≥ 44pt; contrast per the design bible.
- **Responsiveness:** hardcoded widths/heights that break on small devices; keyboard avoidance in forms and chat input.
**Common mistakes to look for:** missing cleanup (top cause of student-project leaks); `async` function used directly as effect callback; fetch in effect without cancellation/ignore flag → state race when navigating fast; `key={index}` on mutable lists; alerts/navigation fired during render.
**Severity levels:** leak/race/setState-after-unmount on a core flow = High (Critical if it crashes); missing focus-refetch = Medium–High by flow importance; cargo-cult memoization = Low; missing a11y labels = Medium.
**Exit criteria:** Every priority screen reviewed against the checklist; leak audit table (screen → subscriptions → cleanup yes/no) complete; context re-render verdict on matchContext written; nav edge cases (invalid ID, double-tap, back-stack) tested on 5 dynamic routes.
**Estimated effort:** 6h (split: 2 sessions — quiz/chat/matching screens, then the rest).

---

# Phase 3 — UI System (Design Consistency)

**Goal:** Verify every screen speaks the design bible's language: tokens only, consistent primitives, complete state coverage (loading/empty/error).
**Why it matters:** Visual inconsistency is the #1 tell of a student project. The project already has a real token system and a design bible — the review checks adoption, not taste.
**Files involved:** `app/src/theme/*` (colors, typography, spacing, shadows, fonts, globalStyles), all `components/ui/*`, then every screen (grep-driven sweep, deep-dive on the 10 largest).
**What to inspect:**
- **Token adoption:** grep screens for hex literals (`#`), raw font sizes, and raw pixel margins; every hit is either a token gap or a violation. Count per screen.
- **Primitive adoption:** are Card / ListRow / ScreenHeader / EmptyState / Screen / Button / Input actually used everywhere their pattern appears, or do screens hand-roll copies? (Migration simplicity rule: reuse before create.)
- **State coverage matrix:** for each data-driven screen: loading state? empty state (with CTA per bible)? error state (with retry)? Build the matrix — this is a deliverable.
- **Skeletons vs spinners:** consistent choice per bible; no full-screen spinner where cached data could show (homeData supports stale-while-revalidate — do screens exploit it?).
- **Typography & hierarchy:** heading levels consistent across screens; known deferred item — title alignment standardization (owner wants centered) — reference, don't re-log.
- **Owner rules:** no emoji in UI text; calm palette (no Facebook blue); clean Hebrew RTL; professional feel.
- **Animations:** Reanimated/Lottie usage — purposeful and consistent durations, or decorative noise; completion overlays (CompletionOverlay) used uniformly for success moments.
- **globalStyles.js:** is it a coherent system or a dumping ground? Flag styles defined there but used once.
**Common mistakes to look for:** three slightly different card shadows; inconsistent spacing scale on the same screen; empty state = blank white screen; error state = raw `Alert.alert` with an English message in a Hebrew app; disabled-button style missing.
**Severity levels:** missing error/empty state on core screens = High; token violations = Medium (bulk-fixable); inconsistent animation timing = Low.
**Exit criteria:** State-coverage matrix complete for all 40 screens; token-violation count per screen recorded; primitive-adoption gaps listed; verdict per screen: "bible-compliant / needs pass / needs redesign".
**Estimated effort:** 3.5h.

---

# Phase 4 — API Layer

**Goal:** Verify the 16 services form one consistent, resilient contract layer: uniform errors, timeouts everywhere, no duplicate/orphan requests, sane caching.
**Why it matters:** Screens can only be as reliable as this layer. Inconsistency here (one service throws, another returns null) forces every screen to guess, and the guesses are the bugs.
**Files involved:** all of `app/src/api/` — the 16 services, `config.js`, `fetchWithTimeout.js`, `installFetchInterceptor.js`, `homeData.js`; consumers spot-checked per service.
**What to inspect:**
- **Uniform contract:** pick 5 services at random; do they all (a) return parsed data or throw, (b) throw the same error shape, (c) never return raw `Response`? Any service that `catch`es and returns `null`/`[]` silently is a finding.
- **Timeout coverage:** does every network call route through `fetchWithTimeout`? Grep for bare `fetch(` in api/. What is the timeout value and is it appropriate per operation (upload vs GET)?
- **Interceptor:** what does `installFetchInterceptor` do (auth header injection? 401 handling? logging)? Is it installed exactly once, before first call? Does it apply to ALL calls including Firebase/push?
- **Retry logic:** exists? If yes — bounded, idempotent-only (never retry POST-create)? If no — is that a deliberate decision for GETs?
- **Cancellation:** AbortController on screen unmount for slow lists/search; chat polling cancellation.
- **Duplicate requests:** rapid tab-switching or double-mount (React 19 StrictMode double-invokes effects in dev) — does homeData dedupe in-flight requests for the same key?
- **homeData.js deep-read (139 lines):** SWR semantics correct (serve stale, revalidate, notify); cache invalidation on logout (see Phase 5); warm-prefetch list justified; stays a pure data layer.
- **Network efficiency:** N+1 patterns (fetch list, then fetch details per item in a loop); over-fetching where the backend has a lighter endpoint; payloads parsed then mostly discarded.
- **Error propagation to UI:** how does a service error become user-facing Hebrew text? Is mapping centralized or copy-pasted per screen?
**Common mistakes to look for:** `console.log(error)` as the entire error strategy; `JSON.parse` without try/catch on non-JSON error bodies; hardcoded URLs bypassing `config.js`; response `.ok` never checked; the same endpoint string duplicated across services.
**Severity levels:** swallowed errors on mutations = High; missing timeout = High; no in-flight dedup = Medium; N+1 = Medium–High by screen; URL duplication = Low.
**Exit criteria:** Contract-consistency table (service × {error shape, timeout, auth, returns}) for all 16 services; homeData verdict written; every bare-fetch/swallowed-error logged.
**Estimated effort:** 3h.

---

# Phase 5 — Authentication

**Goal:** Verify the token's full lifecycle — issued, stored, attached, expired, revoked — with no gaps, and that auth state and caches can't leak across users.
**Why it matters:** Auth bugs are Critical by default: they either lock users out or let the wrong data show.
**Files involved:** `app/src/auth/authStore.js`, `app/src/api/authService.js`, `installFetchInterceptor.js`, `app/_layout.tsx`, `app/index.tsx`, `SplashScreen.jsx`, `(auth)/Login.jsx`, `Register.jsx`, `ForgotPassword.jsx`, `reset-password.jsx`, `ChangePassword.jsx`, `DeleteAccount.jsx`, `homeData.js`, `push/pushNotifications.js`.
**What to inspect:**
- **Storage:** both `expo-secure-store` and `async-storage` are installed — determine which one actually holds the token. Token or password in AsyncStorage = Critical. What else is persisted (user object? profile?) and does it belong in secure storage?
- **Token lifecycle:** expiry handling — is there any? What happens at minute 61 of a session: silent failure, crash, or clean re-login prompt? Refresh-token flow or hard expiry (either is acceptable for scope if handled explicitly)?
- **401 handling:** does the interceptor catch 401 globally → clear state → route to Login? Can a 401 during Login itself cause a redirect loop?
- **Logout completeness:** enumerate everything logout must clear — token, authStore state, homeData cache, push token (server-side deregistration?), any in-memory user context. Test: logout, login as user B — any flash of user A's data = Critical.
- **Startup gating:** splash → auth check → route decision. Race window where a protected screen renders before the check resolves? Deep link into a protected route while logged out?
- **Password flows:** ForgotPassword/reset-password — is the reset token single-use and validated server-side? ChangePassword — re-authentication required? DeleteAccount — confirmation + full local cleanup + server-side cascade?
- **Register edge cases:** duplicate email handling; partial registration (account created, questionnaire abandoned) — what state is the user in on next launch?
**Common mistakes to look for:** token in AsyncStorage; user object cached and never invalidated; logout that only navigates without clearing; auth check done per-screen instead of at layout level; push token still registered to a logged-out user (notifications for user A arrive on user B's session).
**Severity levels:** plaintext token storage, cross-user cache leak, push-token leak = Critical; no 401 handling / expiry crash = High; missing re-auth on ChangePassword = Medium.
**Exit criteria:** Token lifecycle diagram (issue → store → attach → expire → clear) with a verdict at each edge; logout-completeness checklist executed on device with two accounts; all password flows walked end-to-end.
**Estimated effort:** 2h.

---

# Phase 6 — Security

**Goal:** Find data-exposure and authorization holes — with the backend authorization model as the centerpiece.
**Why it matters:** The single most common Critical in student client-server projects is IDOR: the server trusts a client-sent user ID instead of deriving identity from the token.
**Files involved:** all `app/src/api/*` services (what IDs do they send?), `authStore.js`, `config.js`, `app.json`, `.env`/secrets check across repo, `push/pushNotifications.js`, Firebase usage sites; **backend:** controllers + auth middleware in `Desktop\MatchingAppServer` (the deployed copy).
**What to inspect:**
- **IDOR (top priority):** for every endpoint that takes a `userId`/`tripId`/`matchId`/`communityId` — does the backend verify the caller owns/participates in that resource, or does it trust the parameter? Test with two accounts: can user A fetch user B's chats, matches, todos, planner, profile edits by swapping IDs?
- **Blocking enforcement:** is blocking enforced server-side (blocked user's requests rejected) or only filtered client-side (blocked user still receives data)? Client-only = High.
- **Secrets scan:** grep repo for API keys, connection strings, passwords; check `app.json`/`config.js` for anything beyond the public API base URL; Firebase client config is public by design, but check Firebase security rules if Firestore/Storage is used — and first establish what Firebase v12 is even used for here.
- **Chat authorization:** can a non-participant read a chat by guessing `matchId`? Community chat: members-only enforced where?
- **Input validation:** client-side validation is UX; confirm the backend re-validates (spot-check 3 mutation endpoints: trip create, profile update, message send). SQL injection: confirm parameterized queries/EF in the sampled backend endpoints.
- **PII hygiene:** `console.log` of tokens/emails/profiles anywhere; PII in notification payloads (push content visible on lock screens).
- **Secure defaults:** new trip/profile visibility defaults; deleted/blocked account data still visible in old chats?
- **Transport:** API base URL is HTTPS (Azure default, verify config.js).
**Common mistakes to look for:** `GET /api/users/{id}/matches` with no ownership check; user ID stored client-side and sent as request body "identity"; block list applied in the frontend filter only; verbose backend errors (stack traces) reaching the client.
**Severity levels:** IDOR, secrets in repo, no server-side identity = Critical; client-only blocking, PII in logs = High; verbose errors = Medium.
**Exit criteria:** Endpoint authorization matrix (endpoint × "identity from token? ownership checked?") for all mutation + private-read endpoints; two-account IDOR test executed on chats/matches/todos; secrets scan clean or logged; blocking enforcement verdict written.
**Estimated effort:** 3h (requires backend repo access + two test accounts).

---

# Phase 7 — Matching Algorithms

**Goal:** Verify the four scorers are mathematically sound, normalized to comparable scales, edge-case-safe, and explainable.
**Why it matters:** This is the project's intellectual core and the #1 thing examiners will probe ("why did these two match?"). A NaN or a silently-skewed weight makes the flagship feature quietly wrong.
**Files involved:** `app/src/matching/introQuestionnaireScore.js` (73), `behavioralMatch.js` (60), `tripPreferenceScore.js` (84), `wheelMatchScore.js` (24), `matchContext.js`, `app/src/utils/matchReasons.js`, `recommendationService.js` + `interactionService.js` (data feeding behavioral); backend counterpart if any scoring is server-side (establish where each algorithm actually runs).
**What to inspect:**
- **Normalization:** does each scorer output a bounded, documented range (e.g., 0–100)? When scores combine, are components on comparable scales *before* weighting, or does one dominate by unit accident?
- **Weighting:** are weights named constants with a rationale comment, or magic numbers? Do they sum to 1 (or is the sum re-normalized)?
- **Division-by-zero / empty inputs:** no shared questionnaire answers; empty interaction history (cold start); trip with no preferences set; single-option wheel. Trace each: NaN, crash, or defined fallback?
- **Behavioral cold start:** what does a brand-new user see — empty recommendations, popular-items fallback, or garbage? Is the fallback intentional?
- **Symmetry:** should score(A,B) equal score(B,A)? Whichever the design intends, verify the code does it (asymmetric-by-accident is a classic).
- **Fairness:** does the algorithm systematically bury new users or users with sparse profiles? Is a "no data" score distinguishable from a "bad match" score (both showing as ~0 conflates them)?
- **Complexity:** scoring N candidates × M answers — measure with realistic N (e.g., 200 users). All client-side? Then Phase 9 cares about where it runs (main thread during render?).
- **Explainability:** `matchReasons.js` — do displayed reasons actually derive from the scoring inputs, or are they decorative? (Examiners ask this.)
- **Readability:** could a new engineer re-derive the formula from the code alone? Each scorer deserves a header comment with the formula.
**Common mistakes to look for:** averaging percentages of different denominators; `||` fallback turning legitimate 0 scores into defaults; float comparison with `===`; sorting comparator returning booleans; double-counting a signal that appears in two scorers.
**Severity levels:** NaN/crash on empty input, unnormalized combination = Critical (core feature wrong); accidental asymmetry, cold-start garbage = High; magic weights, missing formula docs = Medium.
**Exit criteria:** Per-scorer spec sheet (inputs, formula, range, edge-case behavior) written and verified against code; edge-case table (empty/zero/single/missing) executed for all 4 scorers; combination-weighting math checked by hand with 2 worked examples; these 4 pure functions nominated as the first unit-test targets (Phase 14).
**Estimated effort:** 2h.

---

# Phase 8 — Business Logic & Domain Correctness

**Goal:** Verify domain rules (trip lifecycle, match request state machine, blocking side effects, community membership) are complete, single-sourced, and edge-case-safe.
**Why it matters:** These bugs don't crash — they corrupt user-visible state ("I deleted the trip but they still see it", "the request shows pending forever").
**Files involved:** trip flow (`myTrips.jsx`, `TripDetails/[id].jsx`, `EditTrip/[id].jsx`, `TripMatches/[id].jsx`, `tripService.js`), match flow (`matchesForYou.jsx`, `requestStatus.jsx`, `MatchingSuccess.jsx`, `recommendationService.js`, `interactionService.js`), blocking (`BlockedUsers.jsx`, `blockService.js` + consumers), communities (`community.jsx`, `community-create.jsx`, `community-members/`, `communityService.js`), planner/todo (`TripPlanner/[id].jsx`, `TripToDo/[id].jsx` + services).
**What to inspect:**
- **Match request state machine:** enumerate every state (none / sent / received / accepted / declined / blocked / expired?) and draw the transition table. Every cell must be handled somewhere. What happens on: accept after the other side blocked you? Two users sending requests to each other simultaneously? Declining then re-sending?
- **Trip lifecycle:** delete a trip that has matches/chats/todos — what cascades, client and server? Edit a trip after matching — do existing matches recompute or keep stale scores? Past-dated trips — filtered, archived, or shown forever?
- **Blocking side effects:** block a user → their chats? existing matches? community co-membership? pending requests? List each and verify.
- **Duplicated logic:** date formatting, trip-status derivation ("upcoming/active/past"), user-display-name building, image URL construction — grep for each; every copy is a divergence waiting to happen (candidate for `utils/`, respecting the 3+ uses rule).
- **Hidden assumptions:** "every user completed the questionnaire", "every profile has a photo", "trip always has a destination" — grep consumers of these fields for unguarded access.
- **Dates & timezones:** trip date comparisons — local vs UTC; "today" boundary bugs; date math done with string comparison?
- **Extensibility spot-check:** "add a second wheel category" / "add trip capacity limit" — how many files change?
**Common mistakes to look for:** state machine holes (missing decline/cancel path); orphaned child records after delete; client computing a status the server also computes, differently; optimistic UI update without rollback on failure.
**Severity levels:** state machine hole on the match flow, cascade failure on delete = High (Critical if data corrupts); stale scores after edit = Medium–High; duplicated formatting = Medium.
**Exit criteria:** Match-request transition table complete with a verdict per cell; trip-lifecycle cascade list verified against backend; blocking side-effect list verified with a two-account test; duplication inventory logged.
**Estimated effort:** 3h.

---

# Phase 9 — Performance

**Goal:** Startup, lists, and heavy screens feel fast on a mid-range Android device; no accidental O(n²) or main-thread scoring stalls.
**Why it matters:** Perceived performance is what the demo audience feels in the first 10 seconds.
**Files involved:** startup path (`SplashScreen.jsx`, `app/_layout.tsx`, `homeData.js`, `Home.jsx`), all list screens (`matchesForYou`, `recommendations` (1,313 lines — prime suspect), `community`, `activeChats`, `notifications`, both chat screens, `myTrips`), `utils/image.js`, quiz screens (state-change re-render cost), matching scorers (where they run).
**What to inspect:**
- **Startup waterfall:** what blocks first paint of Home? Fonts + auth check + prefetch — sequential or parallel? Does homeData's warm-prefetch actually pre-populate before the user lands, and does Home render from cache instantly on second launch?
- **Lists:** FlatList (not ScrollView+map) for anything unbounded; stable `keyExtractor` (not index); memoized `renderItem`; pagination or windowing for recommendations/community lists — or is the whole dataset fetched and rendered?
- **Chat:** message list — inverted FlatList with pagination, or full-history re-render per new message? Polling interval cost.
- **Images:** `expo-image` used consistently (it's installed)? Remote images sized/resized server-side or full-resolution downloads? Avatars cached?
- **Expensive computation:** matching scorers run per-render or memoized per-dataset? Any `.filter().map().sort()` chains inside render on large arrays (recompute per keystroke in search inputs)?
- **Re-render hotspots:** quiz screens — does typing one answer re-render all 1,700 lines' worth of components? Slider drags (`@miblanchard/react-native-slider`) throttled?
- **API efficiency:** duplicate calls on mount (StrictMode double-effects unmasked); focus-refetch storms when rapidly switching tabs; payload sizes on the heaviest endpoints.
- **Memory:** chat/community screens over a long session (leak suspects from Phase 2 re-verified under profiler).
**Common mistakes to look for:** ScrollView rendering 200 cards; inline arrow renderItem recreating every row; full-res image uploads displayed as 40px avatars; Lottie animations left running off-screen.
**Severity levels:** startup > 4s on device, list jank on core screens, scoring stall on main thread = High; missing pagination = Medium–High by list size; unthrottled slider = Low–Medium.
**Exit criteria:** Startup timeline measured (cold + warm) and documented; list-implementation table (screen × {FlatList?, keyExtractor, memoized rows, paginated?}); top-3 slowest screens profiled with cause identified.
**Estimated effort:** 3h (device profiling included).

---

# Phase 10 — Code Quality

**Goal:** The code reads like one professional wrote it: consistent naming, right-sized files/functions, no dead weight.
**Why it matters:** This is what a hiring engineer skims first; it also determines whether anyone (including the authors in 6 months) can maintain it.
**Files involved:** all — but effort concentrates on: `Quiz.jsx` (1,788), `PreferencesQuiz.jsx` (1,674), `recommendations.jsx` (1,313), `Wheel.jsx` (843), plus a naming/dead-code sweep over the whole tree.
**What to inspect:**
- **File size:** the three 1,300+ line screens need a decomposition *plan* (extract sub-components + a hook per screen — plan it here, execute per simplicity rules; target ≤ ~400 lines/screen). Note whether Quiz and PreferencesQuiz share extractable structure (two 1,700-line siblings smell like a copy-pair).
- **Naming consistency:** file naming is currently mixed — `Home.jsx` vs `myTrips.jsx` vs `community-create.jsx` vs `requestStatus.jsx` (Pascal / camel / kebab in one router dir). Pick one convention for screens; log every deviation. Same for functions (`handleX` vs `onX`), booleans (`isX`), services (`getX`/`fetchX`).
- **Function size & complexity:** functions > ~50 lines or nesting > 3 deep in the priority files; components doing fetch + transform + render in one body.
- **Dead code:** commented-out blocks, unused imports/styles (StyleSheet entries nothing references), unreachable branches, unused deps (`lucide-react`, `@lottiefiles/dotlottie-react` — web packages in an RN app; `@expo/ngrok` in prod deps), leftover `scripts/reset-project.js`.
- **Magic numbers:** timeouts, page sizes, animation durations, score thresholds — named constants with units.
- **Console noise:** `console.log` count (should be ~0 outside a debug utility).
- **Comments & docs:** comments explain *why*, not *what*; the 4 matching scorers and homeData get header docs; misleading/stale comments are worse than none — flag them.
- **Language consistency:** Hebrew UI strings — centralized or scattered? (Full i18n is out of scope; a single strings module is the professional middle ground — assess feasibility, don't mandate.)
**Common mistakes to look for:** copy-paste blocks with one changed variable; `data`, `temp`, `info` as names; boolean params (`doThing(true, false)`); files that mix 3 unrelated exports.
**Severity levels:** all findings here are Medium or Low by definition — but the decomposition plan for the 3 giant files is Medium-High priority debt because it blocks safe future changes.
**Exit criteria:** Naming convention recommended + deviation list; decomposition plan (target component tree) documented for Quiz/PreferencesQuiz/recommendations as a remediation recommendation; dead-code and unused-dependency inventory logged; console.log count recorded; magic-number inventory for the priority files. (All are report items — nothing is renamed, deleted, or refactored.)
**Estimated effort:** 3h.

---

# Phase 11 — Reliability & Resilience

**Goal:** The app degrades gracefully: bad network, bad data, and bad luck produce messages and retries, not crashes or blank screens.
**Why it matters:** Reliability is the difference between "demo gods willing" and a demo you can run on conference WiFi.
**Files involved:** cross-cutting; test harness screens: Home (cache path), chat (network loss mid-conversation), trip creation (submit failure), quiz (progress loss), notifications; `homeData.js` error paths; any ErrorBoundary (verify one exists at all — check `_layout.tsx`).
**What to inspect:**
- **Offline walkthrough (airplane mode):** launch cold — what renders? Launch warm (cache present) — does homeData serve stale data with an offline indicator, or white-screen? Send a chat message offline — queued, error, or silently lost? Submit quiz answers offline — progress preserved?
- **Error recovery:** every failed load has a retry affordance (cross-check Phase 3's state matrix); retry actually re-triggers the fetch (not a dead button).
- **Malformed data tolerance:** null-safe access on API responses (`user?.profile?.photo` vs `user.profile.photo`); missing fields render fallbacks, not `undefined` text; unexpected enum values (a match status the client doesn't know) don't crash switch statements.
- **Crash safety net:** React ErrorBoundary at the root (Expo Router supports `ErrorBoundary` exports) — exists? Renders a recoverable screen in Hebrew?
- **Unhandled rejections:** fire-and-forget promises (`somethingAsync()` without catch) — grep and audit; global rejection handler?
- **Mid-flight interruptions:** kill the app during trip creation / quiz — on relaunch, is state consistent (no half-created trip visible)?
- **Known deferred item (reference, don't re-log):** Home hero should show a loading/unknown state — not a neutral default — on matches error with no cache.
**Common mistakes to look for:** `.map()` on a response that can be null; error state that requires app restart to clear; infinite spinner when the request failed silently; catch blocks that only log.
**Severity levels:** crash on malformed/missing data on core screens, no root ErrorBoundary = High; silent message loss offline = High; missing retry on secondary screens = Medium.
**Exit criteria:** Offline walkthrough executed and documented for 5 core flows; ErrorBoundary verdict; unhandled-promise audit done; malformed-data spot-check on the 5 most-consumed endpoints.
**Estimated effort:** 2h.

---

# Phase 12 — User Experience

**Goal:** Full-journey walkthrough as a real user; every interaction gives feedback, every dead end gives guidance, nothing double-fires.
**Why it matters:** UX defects are what professors and demo audiences actually *see*. Most are cheap to fix once listed.
**Files involved:** on-device walkthrough is primary; code checked as findings emerge. Script: Register → intro quiz → preferences quiz → wheel → matches → send request → requestStatus → chat → create trip → trip matches → planner/todo → community join/create/chat → notifications → profile edit → settings → block → logout → login.
**What to inspect:**
- **Feedback on every mutation:** Snackbar/confirmation on send/save/delete/block; failures show *actionable* Hebrew messages (not "Error" or English stack text).
- **Double-submit protection:** every submit button disables while pending — test by double-tapping: trip create, message send, match request, register. Duplicate side effect = High.
- **Navigation flow:** back behavior at every step (especially: post-MatchingSuccess, mid-quiz, chat → back); Android hardware back on modals; can you get stuck anywhere with no way back?
- **Guidance & empty states:** first-run experience — new user with no matches/trips/communities: does every empty state say what to *do* (CTA), per the bible?
- **Edge inputs:** very long names/messages (truncation vs overflow); rapid typing in search; date picker past-dates; RTL text mixed with English/numbers/emoji in chat.
- **Destructive-action confirmation:** delete trip, delete account, block user — confirmed with consequence stated; block is reversible from BlockedUsers.
- **Consistency:** same action = same gesture app-wide (tap vs long-press); pull-to-refresh available on all list screens or none.
- **Accessibility pass:** font-scaling (OS large text) on the 5 core screens — layouts survive?; contrast on muted text.
- **Keyboard:** chat input above keyboard; forms scroll to focused field; submit-on-enter where natural.
**Common mistakes to look for:** success with no feedback (user taps again); alert() dialogs in English; back-swipe re-entering a completed flow; keyboard covering the message input.
**Severity levels:** double-submit duplicates, stuck-state navigation = High; missing feedback/confirmation = Medium–High; font-scaling breakage = Medium; polish = Low.
**Exit criteria:** Full walkthrough script executed on device, every step scored pass/fail with notes; double-tap test on all 6 mutation buttons; empty-state CTA coverage cross-checked against Phase 3's matrix.
**Estimated effort:** 3h.

---

# Phase 13 — Production-Level Quality Gate

**Goal:** Synthesis: does the codebase, as a whole, meet the bar a company would require to merge to main? Consistency across everything the prior phases touched individually.
**Why it matters:** Individual phases find local issues; this phase finds *systemic* ones — the pattern that's right in 12 services and wrong in 4.
**Files involved:** all; plus `eslint.config.*`, `.gitignore`, `README`, `app.json`, git history.
**What to inspect:**
- **Pattern uniformity:** take the best-reviewed service and screen as the "house standard"; list every file that deviates from the standard patterns (error handling, state shape, styling approach). The deliverable is a conformance percentage.
- **Lint:** re-run `npx expo lint` (read-only); record error/warning counts and classify the recurring rules. Deliverable: lint report, not lint fixes.
- **Repo hygiene:** `.gitignore` covers env/build artifacts; no secrets in git history (quick scan); the stale backend copy inside this repo — flag it in the report as misleading, with a recommendation to remove or mark as archived.
- **README:** setup steps that actually work from clean clone (verify by following them in a scratch directory, not by editing); architecture overview + layer diagram presence; screenshots. Gaps are logged, not filled.
- **Dependency hygiene:** run `npx expo install --check` (read-only report); list unused deps identified in Phase 10 and version mismatches as remediation items.
- **Dev artifacts:** count console.log occurrences, mock/test data code paths, TODO comments without an owner — all logged as inventory.
- **Definition of Done going forward:** draft a 10-line PR checklist (derived from this assessment's recurring findings) inside the report — recommended for adoption, not committed to the repo.
**Common mistakes to look for:** README written once at project start and now wrong; lint disabled file-wide; "temporary" code with no removal path.
**Severity levels:** secrets in history = Critical; misleading README/stale backend copy = Medium; lint noise = Low–Medium.
**Exit criteria:** Lint report recorded and compared to the Phase 0 metric; README clean-clone verdict written; conformance list done; PR checklist drafted in the report; systemic-theme summary written (the patterns that repeat across phases).
**Estimated effort:** 2h.

---

# Phase 14 — Final Capstone Evaluation

**Goal:** Assess the project through the two audiences that will actually judge it — professors and senior engineers — and rank the gaps each one notices first.
**Why it matters:** Capstone evaluation rewards *communicated* engineering. Excellent code that can't be explained scores like mediocre code.
**Files involved:** README, docs, the matching module (as the showpiece), git history, demo build.
**What to inspect:**
- **What professors notice:** Does the documentation explain the 4 matching algorithms with formulas and a worked example? Is there an architecture diagram? Can the demo survive: empty account, full account, network flake, and the "swap these two users' IDs" security question? Is the wheel feature (the novelty) polished and explainable? Commit history — meaningful messages showing iterative work (current Hebrew messages are fine; garbage messages like "fix" are not).
- **What senior engineers notice (first 10 minutes of skimming):** the three 1,300+ line files (assess whether Phase 10's decomposition recommendation is documented as accepted debt); presence of *any* tests — the 4 matching scorers are pure functions, so a small Jest suite (~15 cases from Phase 7's edge-case table) is the highest-credibility-per-hour recommendation in the entire report; consistent error handling; secure token storage; naming consistency.
- **Weak areas common in student projects (verify each is NOT true here; where true, log with severity):** zero tests; secrets committed; alert()-driven UX; one God file per feature; no loading/empty/error states; client-side-only authorization; README that says "TODO"; unused boilerplate left from the template (`scripts/reset-project.js`, template files).
- **Professional polish opportunities (cheap, high-impact):** app icon + splash consistency; screenshots/GIF in README; a 1-page `ARCHITECTURE.md` with the layer diagram + matching-algorithm summary; `ALGORITHMS.md` with the four formulas; consistent Hebrew microcopy pass on the 5 most-visible screens.
- **Hidden quality issues to sweep for one last time:** timezone bugs around trip dates near midnight; the questionnaire-not-completed user state on every screen that assumes it; orphaned data after account deletion; push notifications after logout.
**Common mistakes to look for:** demoing only the happy path; docs describing the planned system instead of the built one; claiming "recommendation engine" without being able to explain cold start.
**Severity levels:** framed as evaluation-risk: no tests + no algorithm docs = High evaluation risk; missing diagrams/screenshots = Medium; microcopy = Low.
**Exit criteria:** Documentation-gap verdict written (whether `ARCHITECTURE.md` / `ALGORITHMS.md` equivalents exist, with recommended outlines in the report if not); unit-test plan specified (~15 named cases for the 4 scorers, ready to hand to whoever remediates); every "weak area" check has a pass/fail verdict; demo-risk assessment written (which flows would fail live, and how); final readiness summary written against the priority matrix.
**Estimated effort:** 2h.

---

# Recommended Execution Order

Risk-first, aesthetics later, synthesis last:

| Order | Phase | Rationale |
|---|---|---|
| 1 | **0** Baseline | Can't review a moving target |
| 2 | **1** Architecture | Produces the map every other phase navigates by |
| 3 | **4** API Layer | Everything downstream depends on this contract |
| 4 | **5** Authentication | Critical-severity class; small surface, review early |
| 5 | **6** Security | Highest-severity findings; needs backend access — schedule it |
| 6 | **7** Matching Algorithms | Core IP; small files, big correctness stakes |
| 7 | **2** React Native | Largest phase; informed by API/auth findings |
| 8 | **8** Business Logic | Builds on Phase 2's screen knowledge |
| 9 | **11** Reliability | Verifies error paths that 4/5/8 mapped |
| 10 | **9** Performance | Profile with the bug map already known, so slowness isn't misattributed to code that's simply broken |
| 11 | **3** UI System | Visual sweep once behavior is fully understood |
| 12 | **12** UX | On-device walkthrough with full context from all prior phases |
| 13 | **10** Code Quality | Assessed last among content phases — by then we know exactly which files generated findings, which calibrates the debt severity |
| 14 | **13** Production Gate | Systemic synthesis of all findings into conformance metrics |
| 15 | **14** Capstone Evaluation | Final framing for the actual audience |

**Cadence:** one phase per session; findings accumulate in the report untouched. Critical findings are flagged to the owner immediately (so they can decide whether to pause the assessment and remediate), but the assessment itself never applies changes. After Phase 14, the final report is compiled: executive summary, scorecard, findings by severity, and the costed Remediation Roadmap.

# Priority Matrix

| Priority | Finding classes |
|---|---|
| **Critical** | IDOR / server trusts client identity; token or PII in plaintext storage; secrets in repo; cross-user cache leak on logout; crash on a core flow; matching math producing NaN/unnormalized results; push notifications to logged-out users |
| **High** | Missing effect cleanup (leaks) in chat/lists; no global 401 handling; swallowed errors on mutations; double-submit duplicates; match state-machine holes; client-only blocking; missing timeout on requests; list jank / startup > 4s; no root ErrorBoundary; crash on malformed data |
| **Medium** | Duplicated business logic; token/primitive violations in UI; missing empty/error states on secondary screens; N+1 requests; magic numbers; file naming inconsistency; missing pagination; stale README; unused dependencies |
| **Low** | Dead code; comment quality; animation polish; microcopy; cargo-cult memoization; lint warnings |

# Effort Summary

| Phase | Hours |
|---|---|
| 0 Baseline | 1.0 |
| 1 Architecture | 3.0 |
| 4 API Layer | 3.0 |
| 5 Authentication | 2.0 |
| 6 Security | 3.0 |
| 7 Matching | 2.0 |
| 2 React Native | 6.0 |
| 8 Business Logic | 3.0 |
| 11 Reliability | 2.0 |
| 9 Performance | 3.0 |
| 3 UI System | 3.5 |
| 12 UX | 3.0 |
| 10 Code Quality | 3.0 |
| 13 Production Gate | 2.0 |
| 14 Capstone | 2.0 |
| Final report compilation | 2.0 |
| **Total assessment** | **≈ 43.5h** |

Executable as ~14–16 working sessions of one phase each (Phase 2 splits into two). **No fix time is included — this is assessment only.** The final report's Remediation Roadmap will carry per-finding effort estimates (typically totaling 0.5–1× the assessment time) for a separate, future remediation decision.

# Master Checklist (run at every phase)

**Entry:**
- [ ] Working tree still matches the Phase 0 snapshot (`git status` unchanged); if the code moved, re-record the snapshot and note the delta in the report
- [ ] Report open; phase section created
- [ ] Phase's "Files involved" list confirmed still accurate (files move)

**During:**
- [ ] Every finding has: severity, `file:line`, failure scenario, remediation recommendation + effort estimate
- [ ] Cross-check against pre-logged known items before logging (no duplicates)
- [ ] Systemic patterns (same bug in 3+ places) logged once as systemic, with the instance list
- [ ] **Read-only discipline: no edits, no commits, no dependency changes, no "quick fixes" — log and move on**
- [ ] Anything touching UI judged against the design bible, not personal taste
- [ ] Runtime tests use disposable test accounts only; no code changed to enable a test

**Exit:**
- [ ] Phase's exit criteria all met or explicitly waived with reason
- [ ] Findings triaged into the priority matrix
- [ ] Critical findings flagged to the owner immediately (don't wait for phase end)
- [ ] Phase grade (A–F) assigned and entered in the scorecard
- [ ] Phase summary written: 3 sentences — verdict, worst finding, systemic theme

# Assessment report structure (e.g., `Code-review/ASSESSMENT.md`)

1. **Snapshot identity** — commit hash, branch, dirty-file list, date (from Phase 0)
2. **Executive summary** — overall verdict in 5 sentences, written last
3. **Scorecard** — one row per phase: grade (A–F), #Critical/#High/#Medium/#Low, one-line verdict
4. **Findings by severity** — Critical first, using the format below
5. **Remediation Roadmap** — findings grouped into recommended work packages, ordered by priority, each with an effort estimate; simplicity-rules-compliant. This is a plan for a future decision — none of it is executed during the assessment.
6. **Appendices** — the per-phase deliverables (dependency diagram, state-coverage matrix, authorization matrix, scorer spec sheets, transition tables, walkthrough logs)

**Finding format:**

```
## [P4-003] High — tripService swallows errors on create
- File: app/src/api/tripService.js:112
- Scenario: POST fails (timeout) → catch returns null → myTrips shows success snackbar, trip doesn't exist
- Remediation (recommendation only): throw normalized error; screen shows retry — est. 0.5h
```
