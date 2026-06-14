# Session Handoff — Vesta

> **Read this first** when starting a new session (then `git pull`). This is the
> living status + next-steps file that travels across laptops/sessions via git.
> Claude updates it at the end of each session and pushes it.

**Last updated:** 2026-06-14 (fourth session). `main` = #45–#84 merged, tree clean.
**OPEN NOW — PR A `feat/user-guide-site`:** the public, themed `/user-guide` doc
site. Renders `docs/guides/*.md` as a static doc site (deps added: react-markdown
+ remark-gfm + rehype-slug + github-slugger). New: `lib/guides/{registry,markdown,
load}.ts`, `components/guide/{DocsShell,GuideMarkdown,GuideToc}.tsx`,
`app/user-guide/[[...slug]]/page.tsx` (SSG — overview + 17 guides = 18 paths) +
`app/user-guide/loading.tsx`; `.guide-prose` in globals.css (both themes,
shot-verified via `scripts/guide-shots.mjs`). `/user-guide` added to middleware
`PUBLIC_PATHS` (+ test); `next.config.mjs` traces `docs/guides/*.md`. Landing nav
+ footer got a **Guide** link. admin-panel.md deliberately excluded from the
registry (operator-only, never public). 22 new unit tests; full suite green;
`npm run build` OK (route shows ● SSG); lint + typecheck clean. **AWAITING owner
review/merge.** After merge → **PR B (small, planned):** dashboard
`app/loading.tsx` skeleton + manager-alias fix in `isAddressedToManager`
(use all mailbox addresses, not just the single mailbox_email). Mobile = manual
device verify (no code change). News must never appear above Today's Radar.
**Prior session:** 2026-06-12 END OF DAY (third session, work laptop).
`main` = **#45–#84 ALL MERGED, no PRs open, all branches deleted, tree
clean.** (Note: #81 was merged into #80's branch by mistake — stacked-PR
lesson #2: NEVER stack again; #82 = its clean cherry-pick.)
**#84** (`feat/ops-automation`, MERGED): lib/system-mail (Resend;
RESEND_API_KEY in Vercel; recipients = admin email, ALERT_EMAIL overrides;
until a domain is verified Resend only delivers to the Resend account
owner's address), /api/cron/ops: cost-cap alarm (pure detectCapBreaches;
pause already in getEffectiveAi), self-healing (stale-sync retry ×2/run +
renewAllSubscriptions; email only on failure), morning digest at
DIGEST_HOUR_UTC (default 05 UTC ≈ 8am Beirut) sharing lib/admin/attention
with the Overview strip; deduped/audited via audit_logs
system_alert/system_digest. **Owner CREATED the vesta-ops pg_cron job
(every 15 min) — all FIVE cron jobs live** (docs/reference/cron-setup.md).
**NEXT SESSION — pick one:** (1) briefing-search token diet (the 19k-token
whale, biggest AI cost line), (2) AI Decision Desk (Phase 12, discuss
scope), (3) Teams radar (Phase 13), (4) notifications bell. Also verify in
prod when convenient: /admin/settings 2FA enroll (TOTP enabled in
Supabase), maintenance switch round-trip, a forced cost-cap alert email,
and the first morning digest arriving ~8am Beirut on an unhealthy day.
Merged this session: #74 (chat meeting link/reminder/starters/@-mention),
#75 (meetings calendar), #76 (compact week blocks), #77 (reading room),
#78 (native email render + quote splitter), #79 (admin mission control),
#80 (thread reply composer + signature-native render), #82 (=#81:
attachments on demand + inline cid images + Forward), #83 (SUPER-ADMIN
IDENTITY: admins hidden from Users/counts, /admin/settings page with
password change + OPTIONAL TOTP 2FA [Supabase MFA toggle: owner enabled
it] + maintenance switch [app_settings.feature_flags.maintenance,
enforced in requireUser, /maintenance page] + own activity log; 12h admin
sessions via lib/admin/session + middleware, login error=admin_session).
Owner state: TOTP enabled in Supabase ✓, RESEND_API_KEY in Vercel ✓,
admin stays ali.alzein.eng@gmail.com (rotate later via grant-admin.mjs).
**DB finding (2026-06-12):** ONE brief/briefing_search call = 19,159 tokens
(~30× a briefing_rank) — cap its search context next optimization pass.
Owner goal to honor everywhere: "the user must feel AI everywhere — a
space of AI".
**#75** (`feat/meetings-calendar`): /meetings is a real calendar — WEEK
time-grid (manager-tz day columns, overlap side-by-side via
lib/meetings/calendar layoutDay, glowing today, gradient now-line/minute,
all-day violet strip; all-day events keep RAW date via eventDayKey),
MONTH 6×7 grid (pills + day-jump-to-week), AGENDA (v1 list, client-derived);
remembered toggle (phones default agenda); window = week+month→4wks
(initialWindow), nav past it fetches via getCalendarRange action; one
detail overlay (Join/Outlook/Prep) everywhere. Landing got the missing
"Meetings & calendar" card (both themes shot-verified). Tests 523.
**In flight this session — owner's 5-point batch (2026-06-12):**
PR #74 (merged) = points 1–3 · PR #75 (merged) = calendar · PR #76 (open)
= week-grid text fix · PR 3 (building) = reading room.
**#74** (`feat/chat-meeting-link-and-starters`): (a) meeting LINK now
visible — chat confirm card gets "Open the meeting link" (stored on the
action: `link` on StoredChatAction/ChatActionView), /meetings Join reads
Graph's legacy `onlineMeetingUrl` (personal accounts hide the Skype link
there) + always-on "Open in Outlook" (webLink added to CalendarEventView);
(b) confirming a chat meeting auto-schedules a reminder EMAIL 15 min before
start via the reminders engine (best-effort, cancellable in Settings);
(c) starters reorganized: 4 ask (send) + 3 act (PREFILL composer) + tap
"What can Vesta do?" capability panel; (d) **@-mention people autocomplete**
in both composers (lib/chat/mention.ts pure + useAttendeeMention/MentionMenu
in chat/parts) — suggestions from the manager's own senders. Tests 508.
Merged earlier this session (latest):
`feat/meetings-and-mobile-fixes` = **MEETINGS v1 + real AI Meeting Prep +
mobile bug sweep**. (a) `/meetings` (sidebar Workspace → Meetings; phone
Menu): Outlook calendarView today+7d via Phase C plumbing (`lib/meetings/
data.ts`, pure day-grouping `lib/meetings/group.ts` — manager-tz buckets,
Today always first), Join button, live Now badge, honest no_mailbox/
needs_reconnect/error states; read-only (creation stays in chat).
(b) **Prep with Vesta** (Phase 12 Meeting Prep, real): `lib/ai/meeting-prep`
(meeting-prep-v1, grounded-only, honest-blank rule) + `app/actions/meetings`
generateMeetingPrep (attendee threads filtered case-safe in JS, open
work_items via conversation ids, ai_usage feature **'prep'** added).
(c) Mobile fixes (owner-reported): login/update-password/onboarding were
UNSCROLLABLE (min-h-screen+overflow-hidden under overflow:hidden body) → own
100dvh scroll containers w/ min-h-full wrapper (scrolls from top); tab-bar
pad now includes safe-area-inset (72px hid last rows on notched phones);
item sheet closes by DRAGGING the grab-handle down (90px threshold); thread
view 100dvh + safe-area bottom pad; **inbox slowness**: capped at 60 newest
threads (was 150 × 2 client islands per row) + honest footer.
Tests **499**; NEW guide docs/guides/meetings.md + README + phone guide.
**⚠️ Meetings page needs the Outlook RECONNECT (calendar scope) — same one
pending from the Phase C list. Verify after merge (phone + desktop, both
themes): /meetings times in your tz + Join + Prep (admits when no email
history); login scrolls on phone; inbox faster + last row visible; sheet
drag-down closes; thread last message readable.**
Previous entry: The whole
design-audit arc shipped today: #69 declutter ("one fact, one place") →
#70 truthful brief + AI motion (GSAP FocusThread, TypeIn, FLIP) + light-mode
surfaces → #71 mobile action sheet + color tokens → #72 **Vesta Mobile**
(bottom tab bar, app-style dense rows, phone-collapsed brief, installable
PWA — no offline by design, icons via scripts/generate-pwa-icons.mjs;
"How the assistant works" strip removed).
**Owner verify on a REAL phone after the Vercel deploy (both themes):**
install via Safari Share → Add to Home Screen (flame icon, full-screen);
tab bar Today·Inbox·Vesta·Briefing·Menu; 5-6 dense rows per screen; tap row
→ action sheet (Done/Snooze/Draft); brief expands via "Full brief & actions".
Guide: docs/guides/vesta-on-your-phone.md.
**Next session: pick the next feature track — AI Decision Desk (Phase 12,
discuss scope) / Teams radar (Phase 13) / notifications bell (reminders
engine already powers it). Also still pending from earlier: owner to walk
the Phase C calendar test list (below) after the Outlook reconnect.**
**PR #72** (`feat/vesta-mobile`, stacked on #71) = **Vesta Mobile** (owner Q&A,
all recommended options chosen): (a) **bottom tab bar**
`components/app/MobileTabBar` (lg:hidden, rendered by BOTH shells): Today ·
Inbox · **Ask Vesta raised center bubble** · Briefing · Menu (opens the
drawer); corner FAB now desktop-only; content pads pb-[72px] <lg;
(b) **app-style radar rows <sm** — no summary/chips/source on the card (they
live in #71's tap-sheet), smaller badge → 5-6 items per phone screen;
(c) **brief phone-collapsed** — headline + live numbers + Start here; a
"Full brief & actions" toggle (aria-expanded) reveals summary + buttons;
(d) **installable PWA, NO offline by design** (owner choice — no service
worker; live console must never serve a stale build): `app/manifest.ts`
(standalone), appleWebApp metadata, viewportFit:'cover' (safe-area insets in
standalone iOS), scheme-aware themeColor, NEW `public/icons/*` generated by
`scripts/generate-pwa-icons.mjs` (playwright renders the brand orb+flame;
maskable variant included); (e) **"How the assistant works" strip REMOVED**
(owner call) — HowItWorks.tsx deleted. Tests **484**; NEW guide
`docs/guides/vesta-on-your-phone.md` (install steps iPhone/Android) + README
index; project-structure.md updated. **Verify on a REAL phone (both
themes):** Share→Add to Home Screen → flame icon opens full-screen; tab bar
navigates + Menu opens the drawer; dense rows + tap-sheet actions; brief
expands; desktop unchanged minus the explainer strip.
**PR #71 OPEN — merge FIRST**:
`feat/mobile-rail-and-color-polish` = the design-audit leftovers + the phone
pass the owner asked for: (a) **MobileRailSheet** — below xl tapping a radar
card slides up a bottom sheet hosting the SAME AiAssistantRail (phones could
not act on items at all: no side rail, no hover); dvh + safe-area-inset,
Esc/backdrop close, auto-closes on action/composer; (b) color tokens —
`--card-selected` (selected card was identical to hover in light),
`--violet/--violet-soft` (Soon pill was hardcoded #8b7cf6), light `--amber`
deepened #d99a26→#a87413 (+ stronger soft fill); (c) micro-text floor 10.5px
(labels at 9–10px bumped); (d) brief's 3-bar waveform trimmed (animation
budget — dot + sheen carry "live"); (e) phone CSS: brief buttons =
equal-width thumb targets, panel paddings p-4→sm:p-5, FAB smaller/tucked
below sm. Tests **483**; checks clean; guide priorities-and-dashboard.md
gains "On your phone or tablet". **Verify on a real phone (both themes):**
tap card → sheet → Mark done works + sheet closes; Draft reply opens
composer; light mode amber/Soon/selected-card all clearly visible.
Previously merged same day — **#70**: `feat/brief-truth-and-motion` =
declutter **PR 2+3 together** (owner asked) + two owner-reported fixes:
(a) **brief that can't lie** — NEW pure `lib/dashboard/brief-guard.ts`
(fingerprint {open,overdue} stored in daily_briefs.sections.state at write
time; stale when overdue increased / focus pick gone / pre-v2 cache → overlay
skipped, `brief.stale`, dashboard regenerates ONCE via
`generateDailyBrief({force:true})`); prompt **brief-v2** bans queue-wide
claims (no counts / "nothing is overdue"); LIVE facts line in the brief
("5 open · 1 overdue · 2 waiting on you") computed from current optimistic
items; ONE voice — dashboard opens with the brief's focus item selected;
(b) **AI motion layer** — `TypeIn` (brief writes itself in word-by-word),
`FocusThread` (GSAP, lazy `next/dynamic` chunk: glow thread draws from
"Start here" to its radar card; hover replays; auto once/session via
sessionStorage `vesta-thread-shown`), FLIP re-sort in TodaysRadar (WAAPI),
count-up score badges; (c) **rail meta line wraps** (long sender emails were
truncating the date to "Jun …"); (d) **light-mode surface rework** (owner:
"all very white") — bg #e9f1fb, sidebar gray-white gradient #f6f9fd→#ecf3fb,
panel-2/card a step grayer, borders a step stronger, chip count bubble
bg-panel→bg-line (was white-on-white). Tests **482**; typecheck/lint/build
clean; guide daily-brief-and-focus.md updated. **Verify per PR #70 body —
especially LIGHT theme zones + the stale-brief rewrite.**
Previous entry (#69, merged): `feat/dashboard-declutter`,
PR 1 of the dashboard declutter plan ("one fact, one place", −396 lines): cards
lose the duplicate suggested-action pill + "High priority" chip + get 1-line
summaries; KPI strip DELETED — counts moved inside the radar filter chips
(only non-empty chips render); rail loses the 2nd LIVE badge, the context grid,
"94/100", and the dead Delegate button; brief loses the "Top priority" chip +
demo Meeting Prep button and gains a calm headline aurora sheen
(`vesta-headline-sheen`, both themes, reduced-motion safe); ONE vocabulary —
"Waiting on you" (was Waiting on Me / Blockers); dead components deleted
(MetricsStrip, KpiCards, MeetingPrepDrawer + demoKpis/KpiMetric/
WorkItem.suggestedAction). Tests 469 green. **Queued next: declutter PR 2 — a
brief that can't lie** (live counts computed at render, never from the cached
AI text; stale-claim guard — the brief said "no overdue item" next to a red
Overdue card; merge "Start here" + rail "Next Best Action" into ONE
recommendation) — **and PR 3: AI motion layer** (brief types itself in, glow
thread from "Start here" to its radar card, FLIP re-sort + count-up badges).
**GitHub branch cleanup done (owner asked):** 78 merged remote branches + 3
local deleted. Two UNMERGED stale branches remain (deletion needs owner call):
`docs/session-update` (old handoff text, superseded) and
`feature/phase-0-dashboard-shell` (Phase 0 era).
A clear Phase C walkthrough (reconnect first, 8 numbered tests) was given in
chat 2026-06-12 — owner still to run it.
Today: radar-wipe fix (#63), chat quick-actions + cron doc (#64), due-time
PROMPT v4 (#65), **PHASE C calendar & meetings, chat-v5** (#66, landed on
main via rescue PR **#67** — #66 was a stacked PR merged into its base
branch by mistake; lesson: DELETE branches after merging so stacked PRs
retarget), and #68 (chat-v6 + PROMPT v5): reminders can go to OTHER people
(known-people gate, never invented emails), "email me" reminders default
to the CONNECTED MAILBOX (the dev@vesta.app bounce), and relative deadline
words ("today or tomorrow?") now anchor to the MESSAGE's date — thread
context lines carry [YYYY-MM-DD] prefixes.
**All four pg_cron jobs are LIVE** (owner created vesta-reminders +
vesta-purge; vesta-sync */1 and vesta-renew-subscriptions daily existed).
Reminders end-to-end VERIFIED by owner (email arrived; bounce fixed in #68).
**Re-analysis under v5 triggered 2026-06-12** (script run twice — second
run after the Vercel deploy window so v5, not v4, stamps the items).
**⚠️ Owner still to do: (1) RECONNECT Outlook once (Settings → Email
connection → Reconnect) to grant the calendar scope — until then Settings
shows "Calendar & meetings: Reconnect to enable" and chat declines meeting
orders; (2) walk the Phase C test list below.**
**Owner verify (both themes):** Settings → Calendar & meetings: Enabled
(after reconnect); chat "What meetings do I have today?" answers from the
real calendar; "Set up a meeting with <a known sender> tomorrow 3pm" →
card with EDITABLE attendees (suggestions after 2 letters) → Confirm →
event in Outlook calendar + invite sent; "Send a reminder to Zahraa
tomorrow 11am" → card shows her real address; "email me a reminder at
<time>" arrives at alielzyn@hotmail.com (not dev@vesta.app); "Techinal
Meeting" item shows **Overdue — was due Jun 10** after v5 re-analysis;
a 3 PM-deadline email is NOT overdue in the morning, and overdue shows
"was due <date>, <time>".
**Next session: pick next track — AI Decision Desk (Phase 12, discuss
scope) / Teams radar (Phase 13) / notifications bell. Decision recorded:
deleting a chat does NOT delete learned memories. Pre-launch checklist
standing (rotate keys/passwords, re-enable email confirmation, remove dev
user, Mail.Send + Calendars.ReadWrite on prod Azure app).**

## 📰 Personal Intelligence Brief v1 (built 2026-06-11, `feat/personal-briefing`)

The plan's phases B+C+D+E shipped together (owner choice). **Migration
required** (approved in chat): `briefing_preferences` + `briefing_items`,
own-rows RLS — run `20260611190001_personal_briefing.sql` in Supabase.

- **Page:** `/briefing` (sidebar → Intelligence → Briefing, between Memory &
  Rules and Weekly Review; in the app shell). First run = inline preferences
  ("What should Vesta watch for you?"): topic chips (suggested + custom),
  tracked companies, region, items/day (5–15), style, and the **news engine
  radio** (Google News / AI web search). Privacy line everywhere: only topic
  keywords leave the app, never mailbox content.
- **Engines:** `lib/briefing/rss.ts` (pure, tested — Google News search-RSS
  per query, entity/CDATA-safe parser, title-hash dedupe, blocked-source +
  72h-staleness merge) and `lib/briefing/ai-search.ts` (OpenAI Responses API
  `web_search` tool returning structured candidates; ANY failure → null →
  silent RSS fallback).
- **AI ranking:** `lib/ai/briefing.ts` (`briefing-v1`, tested) — model picks
  from given candidates ONLY (candidateIndex validated; invented items
  dropped), de-clickbaits, writes manager-specific why-it-matters + suggested
  action, categories (must_know / regulation_risk / client_competitor / …).
- **Actions:** `app/actions/briefing.ts` — generateBriefing (once per
  manager-tz day; Refresh forces, keeping saved items), cross-day dedupe via
  `(user_id, dedupe_key)` unique index, save/dismiss/unread, preferences
  upsert. AI usage → ledger feature `brief` (kinds briefing_rank /
  briefing_search). Loader in `lib/briefing/data.ts` ('use server' files
  can't export non-functions).
- **Cards:** category chip, relevance, source + LocalTime, headline, summary,
  ⭐why-it-matters, →suggested action, Read source (new tab), Save (→ "Saved
  for later" shelf, persists across days), Dismiss (optimistic).
- Landing grid gains "Personal Briefing" (10 cards, shots re-verified);
  guide `docs/guides/briefing.md` + README; plan doc + phases.md marked v1
  built (Phase F company-wide remains future).
- Tests 394: rss suite, briefing prompt/parser suite, BriefingView component
  suite (first-run, auto-build-once, dismiss optimistic, refresh-forces),
  AppShell/landing nav assertions.
- ⚠️ **Verify live (both themes) after migration:** first visit → preferences
  → save → briefing builds in seconds; items match your topics with real
  source links; Refresh rebuilds; Save survives to tomorrow's "Saved for
  later"; Dismiss removes; switch engine to AI web search → still works (or
  silently falls back); reload = instant (cached); admin AI page shows
  `brief` rows (briefing_rank).

## 🕐 Manager-timezone pass (built 2026-06-11, `fix/manager-timezone`)

Everything time-based now follows `profiles.timezone` instead of UTC:

- **Detection:** `TimezoneSync` (mounted on the dashboard + shell layout)
  reports the device's IANA zone → `reportDetectedTimezone` updates the
  profile unless pinned. **Settings → Preferences → Timezone** card:
  Automatic (default) or pin manually (`setTimezonePreference`; pin recorded
  as `tz_manual` in auth user metadata — no schema change).
- **Pure helpers** `lib/time/zone.ts` (tested): todayInTz, zonedTimeToUtc
  (two-pass DST-safe), calendarDaysAgo, day/received/long-today labels,
  lastCalendarDays, weekdayShortOf.
- **due_at:** AI analysis deadlines → 9:00 AM manager time (store.ts; was
  9:00 UTC); quick-add tasks now parse in the BROWSER (same pure parser) so
  "tomorrow 3pm" is the manager's 3pm — server re-parse is the fallback,
  client values validated.
- **Weekly Review:** window = last 7 calendar days from tz midnight; bars
  bucket by the manager's dates (new tz test: 22:00 UTC = next-day Beirut).
- **Daily brief:** brief_date + the prompt's "Today" follow the manager's
  calendar — the cache rolls over at THEIR midnight (data.ts now also returns
  `timezone`).
- **Draft labels (draft-v4):** today/received/[Jun 9] labels in manager tz
  (helpers moved to lib/time/zone).
- Guides: settings-and-themes (new Timezone section), weekly-review,
  daily-brief-and-focus.
- ⚠️ **Verify live:** Settings shows the Timezone card with your real zone
  (auto-detected after first dashboard load — was 'UTC' default); add a task
  "tomorrow 9am" → due shows YOUR 9 AM; mark something done late evening →
  Weekly Review counts it on the right day; pin a different zone → labels
  follow; switch back to Automatic.
**Owner decisions (2026-06-11 Q&A):** AI-written brief once/morning (cached);
storage = `daily_briefs` — **already existed from Phase 1, NO migration
needed**; Focus Mode = full-screen. Also clarified: Phase 11 is about the
manager's OWN inbox — the internet-news idea is the separate Personal
Intelligence Brief track (later).
**Next: 1) owner merges the Phase 11 PR after testing (see Verify below) →
2) pick next: Phase 12 candidates (AI Decision Desk / Teams / Promise
tracker) or polish. Remaining honest placeholders (all toast/labelled): rail
"Delegate" (Phase 8 toast), "Ask Vesta" chat (demo shell), Meeting Prep
(Phase 12 toast), CleanInbox drawer (flag-gated off). Smaller queued: due_at
+ Weekly Review day-buckets + brief_date in manager timezone
(profiles.timezone); chat assistant reads 'personal' memories.**

## 🌅 Phase 11 — Daily Brief & Focus Mode (built 2026-06-11, on branch)

**No migration** — `daily_briefs` existed since Phase 1 (own-rows RLS already
granted; `ai_usage.feature` already had `'brief'`).

- **AI daily brief:** `lib/ai/brief.ts` (prompt `brief-v1` + parser; focus id
  validated against given items — the model can't invent one) +
  `app/actions/brief.ts` `generateDailyBrief()` — reads the SAME enriched
  items the radar shows (getDashboardData), calls `getEffectiveAi(user,
  'analysis')` (admin model/caps/pause respected), caches to `daily_briefs`
  upsert on `(user_id, brief_date)` (UTC date — tz queued), records ai_usage
  feature `brief` with cost. Every failure → ok:false and the deterministic
  brief stays (the feature can never break the morning).
- **Dashboard flow:** getDashboardData overlays today's cached brief
  (headline/summaryLine + focus pick, only while the focus item is still
  open); DashboardClient fires generateDailyBrief ONCE on mount when no
  cache + AI enabled + items exist, showing "Vesta is writing today's
  brief…" under the deterministic brief; MorningBrief card gained the
  **"Start here: <item> — reason"** row (click = select item + open rail).
- **Focus Mode (real, full-screen):** `components/dashboard/FocusMode.tsx`
  replaces the demo drawer (deleted). Queue = open items by priority, brief's
  pick first; per item: Mark done / Draft reply (follow-up label for
  waiting_on_them; composer z-100 opens above) / Tomorrow (9 AM snooze) /
  Skip; progress bar; "Go through skips" second pass; "Day cleared." end
  state; Esc exits; same optimistic applyItemAction handlers as the radar.
- **Landing sync (5b):** "Daily Brief & Focus Mode" REMOVED from the roadmap
  Soon strip (2 cards left) and the grid card upgraded (was "Morning Brief");
  scene already had the shipped MORNING BRIEF island — no scene change.
- Tests 366: lib/ai/brief suite, FocusMode suite, DashboardClient Clear-My-Day
  test now asserts the real dialog; guides: NEW
  `docs/guides/daily-brief-and-focus.md` + README + dashboard guide;
  phases.md Phase 11 → Done.
- ⚠️ **Verify live (both themes):** morning dashboard → "writing today's
  brief…" → headline becomes personal within seconds (reload = instant, same
  brief; check ai_usage in admin shows ONE `brief` row for today); "Start
  here" selects that item; **Clear My Day** → full-screen pass: Done slides
  on, Draft opens composer above it, Tomorrow snoozes, Skip cycles, finish →
  "Day cleared."; with AI paused (admin) the card quietly keeps the standard
  brief.

## 🖼️ App shell everywhere (built 2026-06-11, `feat/app-shell-pages`)

Owner (after merging #49): remove the Follow-ups button; make routed pages
full-screen. Chose "App shell everywhere" via Q&A. Built:

- **New `app/(shell)/` route group** (URLs unchanged) holding Inbox,
  Priorities, Drafts, Hidden, Weekly Review, **Settings** (added for
  consistency; the full-screen thread reader stays standalone on purpose).
  Its `layout.tsx` renders the persistent frame ONCE — navigation only swaps
  the content column (each route's `loading.tsx` is now an in-shell skeleton
  via `PageSkeleton inShell`), so the sidebar never blinks.
- **`components/app/AppShell.tsx`** (client): Sidebar + Topbar + scrollable
  content column; `usePathname` highlights the current route in the nav;
  Today/Memory buttons `router.push('/')` / `'/?view=memory'` (dashboard
  prefetched on mount). Topbar gained `title`/`subtitle` props — shell pages
  show the page name instead of the greeting (route→title map in AppShell).
- **`lib/dashboard/nav-counts.ts`**: real badge counts (today / waiting /
  drafts) for shell pages, mirroring getDashboardData's snooze-visibility
  rules. Layout fetches account + counts in parallel after one requireUser.
- **Pages stripped of their own chrome** (back-chevron headers, max-width
  centered mains) — content is full width; Weekly Review got a 2-column lg
  layout (rhythm + senders side by side). AutoSync moved into the shell
  layout (was per-page). Settings actions moved with the route — imports are
  now `@/app/(shell)/settings/actions`.
- **Follow-ups nav button removed** (sidebar = Today · Inbox · Waiting on Me ·
  Draft Replies · Hidden · Delegation(Soon) · Memory & Rules · Weekly Review);
  the followup slice lives in the radar chips. Sidebar's filter plumbing
  reverted; href items highlight by route (`activePath`). Clicking Today still
  resets the radar filter to All. `/?view=memory` deep link added so Memory &
  Rules works from any shell page.
- Tests 354 (new AppShell suite; DashboardClient nav tests updated: no
  Follow-ups button, Today resets filter, memory deep link). Guides:
  priorities-and-dashboard sidebar section rewritten (persistent shell).
- ⚠️ **Verify live (both themes, desktop + mobile):** every sidebar page keeps
  the sidebar/topbar (current page highlighted, badges real); Memory & Rules
  works from /inbox; navigation between shell pages swaps only the content
  (no frame blink); Settings still connects/disconnects Outlook fine
  (actions path moved!); /drafts deep-link → composer still opens; sidebar
  collapse + mobile drawer work on shell pages.

## 🧭 Left-sidebar button pass (built 2026-06-11, `feat/sidebar-button-pass`)

Owner asked for a button-by-button pass on the LEFT panel — found 4 of 9 nav
items were dead clicks (no href/view): Follow-ups, Draft Replies, Delegation,
Weekly Review. All fixed (owner-confirmed directions via Q&A):

- **Follow-ups** → switches to Today with the radar pre-filtered to the
  `followup` chip (badge already real). Sidebar highlight is filter-aware:
  Follow-ups lights up when the followup filter is active, Today otherwise;
  clicking Today resets the filter to All.
- **Draft Replies** → new **`/drafts` route**: every live draft (AI draft /
  Edited by you / Approved / Send failed) with recipients + preview + time;
  badge = open items with a saved draft. Click a row → **deep-link
  `/?item=<id>&compose=1`** lands on the dashboard with that item selected and
  the composer open (DashboardClient gained `initialItemId`/`initialComposer`;
  one-shot params stripped from the URL like ?splash). Drafts whose item is no
  longer open are kept + explained, not hidden.
- **Weekly Review** → real v1 at **`/weekly-review`**: KPIs (completed,
  replies sent, dismissed, inbound), day-by-day completion bars (last 7 days,
  UTC buckets — manager-timezone is queued), carry-over count, "Completed this
  week" list, "Who took your attention" top-5 senders (initials avatars).
  Aggregation is pure + tested: `lib/review/weekly.ts` (reads
  work_items.metadata.resolved_at/resolved_kind, draft_replies status=sent,
  inbound email_messages). No migration.
- **Delegation** → honest violet **Soon** pill (landing's roadmap language),
  non-clickable row, tooltip "Delegation · Soon" when collapsed.
- Also: `hidden/loading.tsx` was missing (nav rule) — added; both new routes
  have PageSkeleton loading states + prefetch links.
- **Landing sync (rule 5b):** Weekly Review added to the toolkit grid (8
  cards) — verified via landing-shots in both themes; nothing advertised it as
  "Soon" before, so no roadmap card to retire.
- Guides: **new `docs/guides/weekly-review.md`**; draft-replies.md gained "All
  your drafts in one place"; priorities-and-dashboard.md gained "The left
  sidebar — every button does something"; README index updated.
- Tests 349 (weekly builder suite + 5 new DashboardClient nav tests + landing
  grid check).
- ⚠️ **Verify live (both themes):** sidebar **Follow-ups** → radar shows only
  follow-ups + chip selected (Today resets); **Draft Replies** → save a draft
  on an item, see it listed with the badge, click it → composer reopens with
  your text; **Weekly Review** → numbers match what you did this week (mark
  something done → today's bar + Completed move); **Delegation** shows Soon
  and does nothing; Hidden navigation shows an instant skeleton.

## 🧠 Phase 10 — Memory & Rules (built 2026-06-11, on branch)

The manager teaches Vesta once; it applies everywhere. **No migration** —
approval state rides on `manager_memories.is_active` + `metadata.status`.

- **Retrieval (the core):** new pure `lib/ai/memory.ts` (type/scope selection,
  person-scoped memories fire only on that sender, capped lines, unit-tested).
  **Analysis prompt v3**: manager's standing notes (VIP / delegation /
  do-not-do / project / company / preference) + "this sender is a VIP" signal;
  loaded ONCE per sync run. **Draft prompt draft-v3**: hard "never do" rules in
  the system prompt (absolute) + saved context notes + tone (was tone-only).
- **VIP senders:** VIP memory naming an email → `people.is_vip` flips
  (stamped `vip_reason='memory:<id>'`; deleting/pausing the memory un-VIPs
  exactly that flag, hand-set VIPs untouched). **Gap fixed:** sync now passes
  `isVip` into `scoreThread` — the engine's +20 VIP boost existed but was
  never wired into the orchestrator.
- **UI real:** `MemoryView` backed by `app/actions/memories.ts`
  (add/pause/resume/forget/approve/reject, optimistic rows + toasts +
  revalidate); approval queue "Vesta suggests — waiting for your approval";
  rail Memory tab shows the memories actually applied to the selected item +
  real quick-add scoped to the sender's email.
- **Approval flow:** anything not typed by the manager lands pending
  (`is_active=false`, does nothing). First producer: **sendDraft** with a
  custom instruction files a deterministic, deduped per-recipient preference
  suggestion (`source='ai_suggested'`).
- Tests 337 (memory helpers, prompt v3/draft-v3 blocks, MemoryView component);
  guide `docs/guides/memory-and-rules.md` + ai-analysis/draft-replies/README
  updates; phases.md Phase 10 → Done.
- ⚠️ **After merge + deploy:** run `node scripts/reanalyze-work-items.mjs` so
  open items re-analyze with prompt v3 (memory applied). **Verify live:** add
  a VIP memory with an email → that sender's item climbs after next sync and
  the rail's Memory tab lists the memory; a "Do NOT do" rule shows up obeyed
  in a fresh draft; steer a draft with an instruction → send → a suggestion
  appears in Memory & Rules → approve it.

## 🔭 Landing v4 — labeled journey + fan-out finale (MERGED #45, 2026-06-11)

Owner asked (after reviewing v3 live): words ON the 3D objects, an AI-analysis
beat, a NEW post-radar scene showing what comes after the send ("advanced and
special, multi flowing glow"), all features represented below the scene with
special per-feature animations + a special card-open style, and advice on
full-screen (decision: hybrid — full-bleed bands + wide 1320px grid, not
full-screen text). Owner confirmed via Q&A: finale = built features + SOON
horizon; labels = mono tags + micro-labels; 6 beats incl. AI station.

Built on `feat/landing-v4-journey` (all in `components/landing/`):
- **Scene v4 (`VestaScene.tsx`):** six labeled beats — 01 INBOX (envelope) →
  02 FILTERING (gate + HIDDEN TRAY/NOISE micro-labels) → **03 AI ANALYSIS (new
  station:** breathing icosahedron core + orbiting thought-sheets, red/amber/
  green priority tokens flying back onto the path, SCORE 0–100 pylon, "REASONS
  YOU CAN READ" slab) → 04 TODAY'S RADAR (OVERDUE/RANKED micros) → 05 APPROVE &
  SEND → **06 fan-out finale:** the single path SPLITS into colored streams
  (amber→WAITING ON THEM clock island, green→TASKS checklist, cyan→MORNING
  BRIEF sunrise) + violet streams to **wireframe SOON monuments** (MEMORY &
  RULES, DECISION DESK, TEAMS) while the camera pulls up/back for the wide
  delta reveal. Labels are canvas-sprite JetBrains Mono, theme-redrawn, fade
  with arrival, shrink 0.62× on narrow screens; path labels fade out as the
  finale takes over.
- **Page (`LandingPage.tsx`):** 6-step rail (new steps 03 "AI that shows its
  work", 06 "It keeps working"), STORY_VH 450→600, new stepAt boundaries;
  sections widened to 1320px; feature-card grid gets a **clip-path "card-open"
  reveal + icon pop**; new **roadmap strip** (4 dashed SOON cards, violet,
  honesty note); connector-line draw generalized (`data-drawline`).
- **`FeatureSpotlights.tsx` (new):** 3 full-bleed bands with looping GSAP UI
  mocks — radar rows stagger in + the red OVERDUE row climbs to the top;
  the AI reason card assembles (score dial fills to 87); the draft types
  itself → Approve & Send glows → paper plane flies → "Sent ✓".
- **Real bug found & fixed:** scene pointer-parallax NDC wasn't clamped — with
  the scene host scrolled far off-screen the camera target could be shoved ~10
  world units (this was silently mis-framing things whenever the pointer moved
  while below the story). Clamped to [-1,1].
- `scripts/landing-shots.mjs`: v4 beats + per-section heading shots; re-centers
  the mouse after every scroll so parallax never biases screenshots.
- Guide updated: `getting-started.md` "The front door". Tests: LandingPage suite
  covers 6 steps, bands, grid, roadmap + Soon badges (317 total).
- ⚠️ **Owner verify on production after deploy (both themes):** scroll the full
  journey — labels appear per station, AI station reads, fan-out finale + SOON
  wireframes, 6-step captions stay synced; bands' mocks loop; card-open reveal;
  roadmap; mobile (390px) labels fit.
- Note for this laptop's twin: after pulling, run `npm install` (gh CLI is NOT
  installed on the work laptop — PR #45 was created via the GitHub API using
  the git credential; `winget install GitHub.cli` in an elevated terminal if
  wanted).

## 🔁 Landing v3 — journey FIXED + workflow stations (2026-06-10, round 2)

Owner round-2 feedback on v2: camera STILL didn't move on scroll; objects didn't
read as Vesta's workflow. Root cause found: **`next/dynamic` does not forward
refs in Next 14** — `ref={sceneRef}` on the dynamic VestaScene stayed `null`, so
`setProgress()` never reached the scene (the step rail advanced because it's
plain React state from the same handler). v2's travel system existed but never
got the scroll signal. Fixes on `feat/landing-journey`:
- **Wiring:** scene now hands its handle up via an `onReady` callback prop;
  LandingPage replays the latest progress when the chunk loads. New test asserts
  the contract (mock mirrors onReady).
- **Visual verification is now real:** added `playwright` (devDependency) +
  `scripts/landing-shots.mjs` — drives Chromium through the scroll story and
  saves screenshots (7 dark + 3 light + 3 mobile) to gitignored
  `.landing-shots/`. All iterated against actual WebGL renders.
- **Scene v3 — stations are now literal workflow objects:** 01 floating paper
  ENVELOPE monument with glowing accent flap + drifting letter sheets → 02
  scanner GATE straddling the path, grey spur into an open **Hidden tray** bin
  (grey packets sink in) + container yard → 03 big RADAR DIAL with rotating
  sweep, **colored priority blips** (red/amber/green/accent octahedra) + ranked
  **score bar-chart** + HQ slab → 04 send ANTENNA with broadcast rings and a
  **paper plane that launches** (the approved reply).
- **No more dead space:** stations pulled closer, 22 corridor blocks hug the
  route (deterministic placement), dotted ground patches light up as the path
  passes, brighter dark palette (buildings/fog), far landmarks for depth.
- **Camera:** progress→path mapping is now LINEAR so captions stay synced with
  arrivals (was double-eased and drifted); station fractions computed
  numerically from the curve; zoom breathes in at each arrival; per-frame
  renderer.setSize waste removed.
- 314 tests, typecheck/lint clean; screenshots verified at p0–p1 dark, p.1/.5/.9
  light + mobile (390px).

### Round 3 (same day, owner-approved directions via Q&A)

Owner liked v3; asked for: faster scroll, new header, animated lower half, giant
VESTA ending. Confirmed choices: floating-minimal header / "path draws VESTA"
finale / all lower-section animations. Shipped:
- **~20% faster journey:** STORY_VH 560→450.
- **Floating minimal header:** no bar/border/tagline — wordmark + theme toggle
  + pill buttons float over the scene; translucent blur backdrop (color-mix)
  fades in only past the story (scroll listener sets `pastStory`).
- **Lower-half animation:** feature cards + safety bullets + step cards cascade
  in (`data-stagger` groups), section headings parallax (`data-parallax`
  scrub), an accent connector line draws across the 3-step section (clip-path
  scrub), CTA radial glow breathes (existing animate-vesta-breathe).
- **Finale:** footer replaced — the glowing line arrives from the page and
  **draws giant VESTA letters stroke-by-stroke** (per-letter SVG text
  dashoffset in a scrubbed GSAP timeline), then letters fill with an
  accent→accent-2 userSpaceOnUse gradient + drop-shadow glow; footer links fold
  in under the wordmark. Reduced-motion renders the final state statically.
- 315 tests (finale wordmark test added; gsap mock gained timeline/to);
  screenshots re-verified incl. dark-steps, dark/light/mobile finale.

## ✅ MERGED — public 3D scroll landing at `/welcome` (2026-06-10)

VECTR-style scroll story, fully Vesta-themed: an isometric Three.js world where a
**glowing path carries an email through the real pipeline** — Outlook tower → noise
gate (grey packets diverted into a Hidden vault) → radar platform (rotating sweep +
rising score pylons) → send antenna (ripples on approval). GSAP ScrollTrigger
(scrub) drives camera dolly + path reveal + a VECTR-style numbered step rail
(01 One connection · 02 Noise never reaches you · 03 A radar, not an inbox ·
04 Reply with one approval). Then classic sections: features grid (6 real shipped
features), "Built on approval, not autopilot" safety strip, 3-step start, CTA,
footer.

- **Route:** `/welcome` (public). Middleware: signed-out `/` → `/welcome` (deep
  links still → /login?redirectedFrom); signed-in users hitting /welcome bounce to
  the app/admin. `isPublicPath` updated + tested.
- **Files:** `components/landing/VestaScene.tsx` (Three.js, ~theme-reactive
  palettes, DPR cap 1.75, IntersectionObserver+visibility pause, full dispose),
  `components/landing/LandingPage.tsx` (own scroll container — app body is
  overflow:hidden; CSS-sticky canvas, GSAP scrub, data-reveal section animations),
  `app/welcome/page.tsx`. Deps added: `three`, `gsap` (+`@types/three`); three.js
  is a lazy chunk — only /welcome pays for it (148 kB first load, dashboard
  unchanged).
- **Both themes** (scene re-tints live on toggle; all DOM uses tokens), **mobile**
  (wider ortho frustum on narrow screens, compact step rail), **reduced motion**
  (static fully-revealed scene, no scrub/reveals).
- **Verified:** 313 tests; typecheck/lint/build clean; dev server: `/` (signed out)
  307→/welcome, /welcome 200 with hero+steps, /login 200; no compile/runtime errors
  in the dev log. ⚠️ WebGL itself can't be exercised from the CLI — owner should
  eyeball: scene renders in BOTH themes, scroll story syncs with the step rail,
  packets divert at the gate, pylons rise, antenna ripples; phone check.
- Guide: getting-started.md "The front door" + README index line.

## ✅ MERGED `feat/radar-quick-actions` — radar polish (2026-06-10, #43)

- **Overdue KPI (real + clickable):** metrics strip leads with **Overdue** (count of
  `overdue` items, red); ALL primary tiles now filter the radar on click
  (`MetricsStrip onSelect` → `radarFilter`); KPI order: Overdue · Waiting · High ·
  Open (followups + top → secondary); FYI tile dropped. New radar filter chip
  **Overdue** (`filterWorkItems` accepts `'overdue'`); "Open Items" filter = `all`.
- **Hover quick-actions on cards:** ✓ done · ✕ dismiss · 💤 snooze-til-tomorrow
  appear on row hover (desktop, `sm:`+); one click, same server actions + slide-out;
  row restructured to wrapper-div + sibling buttons (no nested-interactive HTML).
- **Click sender → filter:** clicking a card's avatar/name filters the radar to that
  person (keyed by personEmail; "From: X ✕" chip clears it; stacks with category
  filter). stopPropagation span (not a nested button) — keyboard path is the rail.
- **Rail honesty for waiting_on_them:** buttons/copy say **Draft follow-up** /
  "AI follow-up nudge"; `handleSent` keeps a nudged waiting_on_them item on the
  radar (matches the server fix) with a "still tracking" toast.
- 308 tests; typecheck/lint/build clean.
- **Guides current (post-merge pass):** `priorities-and-dashboard.md` (clickable
  metric tiles incl. Overdue, card anatomy + sender filter, hover quick-actions,
  follow-up nudge in "Waiting on them"); `draft-replies.md` (Draft follow-up button,
  nudge keeps item tracked, both-direction context); `ai-analysis.md` (conversation
  + today's date in the prompt, follow-up drafting); `README.md` index lines.
- ⚠️ Verify live (both themes): Overdue tile + chip filter; hover buttons resolve
  with slide-out; sender chip filters/clears; waiting_on_them rail says
  "Draft follow-up" and a sent nudge keeps the card visible.

## ✅ MERGED `fix/draft-direction` — AI pipeline audit fixes (2026-06-10, `73b8267`)

Owner found a backwards draft on a "waiting on them" item ("create new user": the
draft said "we're looking into it" when ALI owes the manager the update). Full
pipeline audit done (sync → engine → analysis → store → dashboard → drafts → send).
Fixed on this branch:

1. **Draft direction** — `buildDraftPrompt` gains `purpose: 'reply'|'follow_up'`
   (waiting_on_them ⇒ follow-up NUDGE instruction) + a both-direction
   `threadContext` block (the model never saw the manager's own replies before —
   root cause). `DRAFT_PROMPT_VERSION='draft-v2'`. (`lib/ai/draft.ts`,
   `app/actions/drafts.ts` loadReplyContext now pulls category + last 6 msgs.)
2. **Nudge ≠ done** — `sendDraft` no longer marks waiting_on_them items done; a
   follow-up send keeps them on the radar (metadata.last_nudged_at) until the
   other side replies.
3. **Admin reply-intent mode now gates the engine** — `processStoredMail` used
   env-only `getReplyIntentMode()`; now `getEffectiveReplyIntentMode(userId)`
   (user → global → env, new in `lib/ai/runtime.ts`).
4. **Waiting-on-them scores un-frozen** — aging priority is engine-owned even
   after reply-intent AI runs (was frozen at creation; guide promised it climbs).
5. **Analysis sees the conversation + today's date** — `buildPrompt` gains
   `today` + both-direction `threadContext` (earlier asks/deadlines + the
   manager's replies were invisible); `PROMPT_VERSION='v2'`. (`lib/ai/context.ts`,
   `lib/ai/store.ts`.)
- Guides updated: `draft-replies.md`, `ai-analysis.md`. 288 tests green.
- **Noted, not built (post-merge polish):** rail copy "Draft follow-up" for
  waiting_on_them (AiAssistantRail is touched by the radar branch — avoid
  conflicts); due_at at 9:00 **UTC** could use profiles.timezone; reply-intent
  pre-gate reads only bodyPreview (~255 chars).
- ⚠️ Verify live after merge: a waiting_on_them item → Draft → should be a
  follow-up nudge; send it → item STAYS on radar; re-analyze items
  (`node scripts/reanalyze-work-items.mjs`) so PROMPT_VERSION v2 applies.

## ✅ Dashboard radar UI/UX fixes — MERGED (#41, branch `fix/dashboard-radar-uiux`)

All approved findings from the 2026-06-10 diagnostic implemented (P0+P1+P2, one
branch, no migrations):

- **Card contrast (P0):** new `--card` theme token (dark `rgba(120,170,230,0.09)`,
  light `#f2f7ff`) + permanent `border-line` on unselected rows
  (`WorkItemRow.tsx`); hover/selected remain the stronger states. Both themes.
- **Real sender (P0):** the latest-inbound query in `getDashboardData` now also
  selects `sender_name`/`sender_email` (zero extra round-trips) → `person` is the
  real sender (AI-parsed name is only a fallback for manual items); new
  `WorkItem.personEmail`. Card shows avatar + name; rail's **From** cell shows the
  email under the name.
- **Overdue (P0):** `dueOf()` (now in `lib/dashboard/present.ts`, tested) compares
  `due_at` to now → red **Overdue** label + "was due Jun 9" detail on card +
  Activity tab.
- **Avatar + muted pills (P1):** stable-hue initials avatar on cards — helpers
  extracted to `lib/avatar.ts` (shared with admin UsersTable, deduped);
  suggested-action pill is ghost/outline on unselected rows, accent only on the
  selected row (and hover).
- **Micro-motion (P1):** staggered `animate-rise` entry (45 ms/row, capped, replays
  on filter switch via list `key={filter}`); Done/Dismiss/Snooze/Sent rows play a
  220 ms fade/slide-out before leaving (`leavingIds` in `DashboardClient`; server
  action fires in parallel — no added latency). Reduced-motion respected.
- **Vocabulary (P2):** "Top risk" chip → **"Top priority"**; "High priority"
  chip/KPI now means the **red band (85+)** everywhere (was 80+, contradicting the
  amber badge); brief headline "1 of 5 need you today" (was "1 thing needs your
  attention" next to "5 Open Items").
- **Pure helpers extracted** for testability: `lib/dashboard/present.ts`
  (cleanPreview/personFrom/senderDisplay/dueOf/chipsFor) + `lib/avatar.ts`, with
  new test suites (302 total). Guide updated:
  `docs/guides/priorities-and-dashboard.md` (card anatomy, overdue, 85+).
- ⚠️ **Owner verify live (both themes):** unselected cards clearly visible; real
  sender names + avatars on cards; an overdue item shows red "Overdue"; Mark done
  slides the row out; filter switch re-staggers; brief chip says "Top priority".
- Deferred (judgment call from the diagnostic, not built): hover quick-actions on
  cards (done/snooze without selecting) — rail-centric design kept for now.

## Reset-link fix + guides (merged `e167aef`)

- **Reset-link fix:** the browser Supabase client runs in PKCE mode and refuses to
  auto-consume the implicit-flow `#access_token` hash that recovery links deliver —
  so even valid links showed "didn't verify". The update-password page now reads the
  hash itself and calls `auth.setSession()` directly, and it surfaces `otp_expired`
  with a specific explanation (Outlook/Hotmail link scanners pre-click one-time
  links; the admin **Set password** is the fallback).
  ⚠️ **Verify on Vercel after deploy: request a FRESH reset email** → link →
  "Choose a new password" → save → signed in.
- **Guides brought current (rule 5a catch-up):** `docs/guides/admin-panel.md` covers
  Waves 3–5; `getting-started.md` gains a "Forgot your password?" section.
**Supabase URL config done** (Site URL = production; Redirect URLs incl. `/**`
wildcards for prod + localhost) — reset-password links should now work end to end.
**The admin-panel plan is fully built** except impersonation (deliberately deferred)
and an MFA enrollment flow (optional, on request).
**Next: Phase 10 — Memory & Rules** (the next core product phase).

### ✅ Verify when convenient (Wave 4+5, on Vercel)
- Reset password (admin or dev user) → email link → update-password page → new
  password works. Sign in → Users tab shows last sign-in **location** (city on Vercel).
- Overview: range pills (default this month); AI page costs now show dollars.
- Set a tiny daily cost cap ($0.01) → draft generation reports the cap; remove it.
- Schedule `/api/cron/purge` daily in pg_cron alongside `/api/cron/sync`.

## Admin Wave 5 (merged `26bd54c`)

- **Overview date filter** — Today / 7 days / **This month (default)** / 30 days pills
  drive the AI spend + usage cards (`getHealthOverview(sinceIso)`); cards are labeled
  with the range so "today vs month" numbers can't be confused again.
- **Triage user picker** — searchable combobox (type email/name → pick) replaces the
  plain dropdown; default view stays "10 newest rules/memories across users".
- **Login location** — sign-ins now record IP + city/country (Vercel geo headers) +
  user agent into the login audit row; Users table shows *when + where* the latest
  sign-in happened; user detail page gets a "Last sign-in from" field. Locally
  (no Vercel edge) only the IP is available; old logins show "location unknown".
- **Users & Accounts redesign** — avatar initials (stable per-user color), stacked
  email/name/role identity cell linking to the detail page, merged status badges,
  synced-dot mailbox cell, row hover, location under last sign-in.
- ⚠️ **Supabase URL config (user action, told in chat):** Site URL →
  `https://vesta-ai-radar.vercel.app`; Redirect URLs → add
  `https://vesta-ai-radar.vercel.app/**` and `http://localhost:3000/**` (the bare
  domain without `/**` only matches the homepage, which is why the reset link fell
  back to the Site URL).

## Admin Wave 4 (merged `3016c60`)

**Settings are now real levers (the Wave 3 gap):**
- `lib/ai/runtime.ts` — `getEffectiveAi(userId, task)`: env overlaid with
  app/user_settings → per-task **model** (analysis/draft), **provider override**,
  **max per run/day**, **prices**, **reply-intent mode** (user → global → env),
  **ai_paused**, and **daily cost caps** (user + global, checked against today's
  ledger). Wired into analysis (`lib/ai/store.ts`), drafts, and ✨ capture (falls
  back to the deterministic parser when blocked). `getEffectiveSendMode(userId)`
  drives sendDraft + capabilities (user → global → env `DRAFT_SEND_MODE`).
- **Scan-back enforced**: first enumeration of a mailbox (no delta_link yet) skips
  mail older than the admin window (default 7d) — `lib/sync/scanback.ts` (tested).
- **Scheduled purge**: `GET/POST /api/cron/purge` (CRON_SECRET) = soft-delete grace
  purge + per-user retention; records purge_jobs + an audit row. Schedule daily in
  pg_cron alongside /api/cron/sync.
- **Webhook subscriptions**: Mailboxes tab shows each sub's state
  (active/expiring/expired/none + expiry) with a **Renew webhook** button.
- **Users**: **Export data** (JSON download, audit-logged) +
  **Re-trigger onboarding** on the user detail page.

**Feedback fixes (from live testing):**
- **Reset-password link fixed** — it used to 404/dead-end: recovery tokens arrive
  in the URL #hash (implicit flow) and Supabase fell back to the Site URL. Now the
  email lands directly on `/auth/update-password`, which consumes the hash
  client-side (verifying → form → expired states); `/login` also rescues stranded
  recovery hashes. ⚠️ **Supabase setting needed:** Authentication → URL
  Configuration → add `http://localhost:3000/**` and the production domain to
  **Redirect URLs**, or Supabase keeps ignoring the redirect.
- **Triage tab**: default shows the **10 newest rules/memories** across users +
  a **user dropdown** for the full per-user set.
- **AI page**: glossary removed → **hover tooltips** on every KPI and settings
  field (ⓘ dots); cost rollups now **estimate from tokens × configured rates when
  a row has no stored cost** (so backfilled history shows real dollars).
- Native `<select>` options were white-on-white in dark mode → themed globally.

## Admin Wave 3 (merged `c2d5605`)

- **AI usage fixed (was all zeros):** the panel reads the `ai_usage` ledger, but only
  analysis/reply-intent wrote to it → wired **drafts** + **✨ quick-capture** in (success
  + failure rows); **admin-panel token prices now drive cost estimates**
  (`estimateCostUsd(model, usage, rates)`; `getConfiguredAiRates()`); **backfill**:
  `node scripts/backfill-ai-usage.mjs` copies historical `ai_analyses` → `ai_usage`
  (idempotent, preserves timestamps). Set prices in AI Control Center → Model & budgets.
- **Admin lockdown:** "Back to app" + `?app=1` removed; middleware keeps admins inside
  `/admin` (any app route redirects there). Claim-based — no extra DB read.
- **Suspension now ENFORCED:** Suspend = Supabase ban (`ban_duration`) +
  `app_metadata.suspended` claim; middleware signs the session out (cookie-safe) →
  `/login?error=suspended` shows a notice. Previously cosmetic.
- **Users:** **Set password** (manual, ≥8 chars, never logged) beside the email reset;
  reset email now lands on a real **`/auth/update-password`** page (was a dead end);
  **per-user detail page `/admin/users/[id]`** (identity, **timezone editor** →
  `profiles.timezone`, mailbox/sync, counts, overrides, recent drafts, AI month,
  **activity history**); **logins recorded** to `audit_logs` (password + OAuth paths).
- **Tables everywhere:** shared `components/admin/DataTable.tsx` (search, facet
  filters, sortable headers, pagination) applied to Users / Mailboxes / Email storage /
  Drafts (500-row window + status/model facets) / Audit (500, action/actor facets,
  tones) / Triage. **Rules & memories are search-first** (type a user's email ≥2 chars).
- **AI Control Center:** glossary panel ("what these numbers mean") + an amber banner
  when token prices are unset ($0.00 explanation).
- ⚠️ Verify after merge: suspend the dev user → confirm blocked + notice; set prices →
  generate a draft → AI page shows the call + cost; run the backfill script once.

## 🛠️ Admin Panel (Operator Console) — DONE

`/admin`, gated on the Supabase **`app_metadata.is_admin`** auth claim — NOT
`profiles.role` (onboarding writes the job title there, which was clobbering admin;
fixed). Non-admins get a 404. Reuses login + splash + theme; both light/dark; nav
prefetch + loading skeletons; every mutating action behind a typed confirm + audit-log.

- **Wave 1:** Overview/Health · Users (reset pw, make/revoke admin via auth API,
  suspend, hard-delete) · Mailboxes & Sync (force sync, re-process) · Email & Retention
  (scan-back/retention/grace, purge soft-deleted, apply retention, per-user wipe,
  storage-by-user) · AI Control Center (usage ledger, spend by feature/user, model +
  budget overrides, re-analyze, key status).
- **Wave 2:** Triage & Rules (manager_rules/memories toggle+delete, feedback stream) ·
  Drafts & Sending (oversight + KPIs + send mode, delete stuck drafts) · Audit &
  Security (audit-log viewer + action filter, secrets presence status, admins list).
- **Deferred:** impersonation ("view as user").
- Code: `lib/admin/*`, `app/(admin)/admin/*`, `components/admin/*`. Migration
  `supabase/migrations/20260609170001_admin_panel.sql` (applied). AI usage recorded to
  `ai_usage` from `lib/ai/store.ts`.

**Admin account:** `ali.alzein.eng@gmail.com` (app_metadata.is_admin=true). Manage
admins from the Users tab, or `node scripts/grant-admin.mjs <email>` /
`node scripts/create-admin-user.mjs <email>` (both set the app_metadata claim).
Admins logging in are auto-forwarded from `/` to `/admin` (escape hatch: `/?app=1`).

> ⚠️ Change the admin password (it was shown in chat). The stale role-based
> `is_admin()` SQL function in the migration is harmless (panel uses the service role);
> optionally realign it to app_metadata later.

## Where we are

- **Phases 0–6.5: done** — dashboard, auth + SSO, onboarding, Outlook connect, email
  sync (delta + webhooks + background), follow-up engine, email triage. (See
  `docs/plans/phases.md` for the master status.)
- **Phase 7 (AI Analysis): DONE.** After each sync, AI reads each "waiting on you"
  thread and fills its summary / category / refined priority / deadline / next action
  / user-visible reason → the rail's **Next Best Action**, **Why this matters**,
  summary, and ranking are real AI output. Token + cost tracked in `ai_analyses`;
  bounded by `AI_MAX_PER_RUN` (20) / `AI_MAX_PER_DAY` (200); analyzed once per change.
  - Provider abstraction in `lib/ai/` — provider/model/key from env
    (`AI_PROVIDER`/`AI_MODEL`/`AI_API_KEY`). **Currently OpenAI `gpt-5.4-mini`.**
    Swappable later from the admin panel; an Anthropic adapter slots in unchanged.
  - Latest fix: corrected category direction (a person waiting on the manager →
    `waiting`; automated/no-reply/closed-ticket → `fyi`). Verified live.

## 🆕 Phase 9 — Draft Replies (merged to `main`, commit `bcc93c2`)

Generate → edit → **approve** → send a threaded Outlook reply; draft-first, never
auto-sent; every send audit-logged. **No migration** (reused Phase 1 `draft_replies`
+ `audit_logs`).

- **AI**: `lib/ai/draft.ts` (prompt + parser: subject/body/tone/warnings/
  requires_human_review; tone pulled from onboarding `manager_memories`). Pure helpers
  `lib/email/reply.ts` (reply/reply-all recipients, HTML body compose, deterministic
  sensitive-topic net). Graph send `lib/graph/send.ts` (createReply→PATCH body→send).
- **Actions** `app/actions/drafts.ts`: `generateDraft` / `ensureBlankDraft` (manual /
  AI-off path) / `saveDraft` / `sendDraft` / `discardDraft` / `loadDraftForItem`. Send
  writes `audit_logs` (`email_sent`, service role) and marks the work item **done**
  (resurfaces on reply).
- **UI**: `components/dashboard/DraftComposer.tsx` (slide-over: recipients, reply-all,
  subject, tone chips, instruction, editor, cautions, safety copy, Regenerate / Save /
  Approve & Send). Opened from the AI rail Action/Draft tabs + the Morning Brief
  "Draft Replies" quick action. Dashboard loads existing drafts (`canDraft` / `draft`
  on `WorkItem`).
  - **Editable recipients**: To/Cc/Bcc show as chips with the real addresses — remove
    any, add more (incl. Bcc); reply-all toggle re-seeds To/Cc. Send goes to exactly
    the final list.
- **Sending (`fix 6a7aa2f`)**: uses the Graph **`reply` action** (needs only
  **`Mail.Send`**) with our composed HTML (reply + quoted original built from the
  stored message) + the exact edited To/Cc/Bcc — one call, threaded, saved to Sent.
  ⚠️ **Do NOT switch back to `createReply` for sending** — it creates a draft and needs
  `Mail.ReadWrite` (that was the original "Outlook refused to send" 403). `createReply`
  is used only by `DRAFT_SEND_MODE=draft_only` (which then needs `Mail.ReadWrite`).
- **Scopes**: `Mail.Read` + `Mail.Send` (`lib/graph/oauth.ts`); `hasSendScope` gates the
  UI; Settings + composer show **"Reconnect to enable sending"** for mailboxes connected
  pre-Phase 9.
- **Tests**: `lib/ai/__tests__/draft`, `lib/email/__tests__/reply`,
  `lib/graph/__tests__/send`, `components/__tests__/DraftComposer`; updated the rail +
  dashboard tests (old "Approve Draft" placeholder removed). Guide:
  `docs/guides/draft-replies.md`.

### ✅ Verified live (Phase 9) — done on the work laptop 2026-06-09
- Reconnected Outlook (granted `Mail.Send`) → Settings shows **"Sending replies:
  Enabled"**. Generated a draft, edited it, **Approve & Send** → arrived in Outlook as a
  threaded reply; item left the radar. Working end to end.
- Optional re-checks on the home laptop if you want: a **sensitive-topic** thread
  (expect the "Check before sending" caution) and **Bcc**/recipient removal.

## 🆕 Shipped earlier (all merged to `main`)

- **Sync flag fix (`bb3cb74`)** — Graph delta updates (flag/read/importance) now land
  on already-stored messages; the insert-only upsert used to drop them, so a newly
  flagged email stayed hidden in flagged-only mode. Volatile fields updated per
  message after the insert. Verified live (re-flagging an email now surfaces it).
- **Phase 8 Slice A** — radar **Unread** dot; **Done / Dismiss / Snooze** actions in
  the AI rail (`app/actions/work-items.ts`); a *dismissed OR done* thread **resurfaces**
  when the sender replies again (sync compares `metadata.resolved_at` vs latest
  inbound). Snooze presets + the dashboard re-surfaces snoozed items when due.
- **Phase 8 Slice B** — **quick-add manual tasks** with deterministic NL date parsing
  (`lib/tasks/parse.ts`, no AI), stored as `source='manual'`, new `task` category +
  radar filter. Add-a-task box above the radar.
- **Done vs Dismiss:** both clear the radar and both reopen on a new reply; *Done*
  records a completion (for Weekly Review), *Dismiss* = "didn't need me".

## ✅ Verify first (next session)

- The Phase 8 actions on the live dashboard: select a card → rail → **Mark done /
  Dismiss / Snooze**; add a task ("Call vendor tomorrow 3pm") and confirm it lands on
  the radar under **Tasks** with the right due time.

## ✅ Phase 8 Slice C: "Waiting on them" (Q3) — DONE

When the manager replies asking for something, the thread now becomes a **Waiting on
them** item (own category + Radar filter chip) instead of vanishing; it flips back to
**Waiting on you** when the recipient replies.
- **Detection:** pure pre-gate `lib/engine/replies.ts` gates creation in
  `buildWorkItemDrafts` (`isWaitingOnOther`); scored so older = higher.
- **AI confirm (part 2):** `lib/ai/reply-intent.ts` + the branch in `lib/ai/store.ts`
  read the **manager's own reply**, confirm it expects a response (writes summary /
  next-action) or **demote** (`status='dismissed'`, resurfaces if the recipient later
  replies — the sync also re-adopts the engine category on resurface).
- **Mode** `AI_REPLY_INTENT_MODE` = `pregate_ai` (default) | `ai_always` | `heuristic`
  | `off`. Env now; per-user admin-panel control is in `admin-panel-plan.md`.
- ⚠️ **Verify live:** reply to a thread asking a question → it should appear under the
  **Waiting on them** filter; a "thanks" reply should not.

## Other open tracks (pick next)

- **Phase 9 — Draft replies — DONE + verified live.** ✅
- **Phase 10 — Memory & Rules** (recommended next; drafting already reads tone
  memories, so deeper memory retrieval + a control UI fit here).
- **Admin panel — Wave 1** (retention/purge, **initial-sync scan window** — default
  last 7 days, see `admin-panel-plan.md` §2 — AI usage UI + budgets + **reply-intent
  mode per user**, sync/cron health).
- **AI polish** — show `ai_analyses` cost in the UI; a "Re-analyze" button.

## ⚠️ Open reminders / TODO

- ✅ **Reconnect Outlook for sending — DONE** (work laptop, 2026-06-09; `Mail.Send`
  granted, send verified live). For **deployment**, ensure `Mail.Send` is on the Azure
  app's delegated permissions so production can send too.
- 🔑 **Rotate the OpenAI API key** — it appeared in chat (treat as exposed). Then
  update `.env.local` and Vercel.
- 💲 Set `AI_PRICE_INPUT` / `AI_PRICE_OUTPUT` (gpt-5.4-mini USD per 1M tokens) so
  `ai_analyses.cost_estimate_usd` populates (tokens are already tracked).
- ☁️ Vercel env vars: ensure `AI_PROVIDER` / `AI_MODEL` / `AI_API_KEY` (+ all
  Supabase / MS Graph / `CRON_SECRET` / `MS_GRAPH_WEBHOOK_URL`) are set in the Vercel
  project for the deployed app.
- 🔐 Pre-launch: rotate Supabase service-role key + DB password + MS Graph secret
  (shared in chat); re-enable Supabase "Confirm email"; remove the dev user.
- ⏰ Schedule `pg_cron` + set `MS_GRAPH_WEBHOOK_URL` for live background sync/webhooks
  (Phase 5 config).

## 🆕 New-laptop setup (per machine)

- `.env.local` is gitignored and does **not** travel. Recreate it on each laptop:
  Supabase URL/keys, MS Graph client id/secret, `TOKEN_ENCRYPTION_KEY`,
  `AI_PROVIDER` / `AI_MODEL` / `AI_API_KEY`. Template: `.env.example`.
- `npm install` (installs deps incl. `openai`).

## 🔧 Handy commands

- Re-analyze items: `node scripts/reanalyze-work-items.mjs` → then open the dashboard.
- Smoke-test AI: `node scripts/test-ai.mjs`.
- Wipe synced mail for a clean re-sync: `node scripts/clear-synced-mail.mjs`.
- Checks: `npm run typecheck` · `npm test` · `npm run lint` · `npm run build`.

---

*Maintained by Claude per `CLAUDE.md` — updated at the end of each session and pushed.*
