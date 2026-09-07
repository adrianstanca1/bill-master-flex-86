# Agent guide

App: **bill-master-flex-86** at https://bill-master-flex-86.vibekit.bot
Repo: adrianstanca1/bill-master-flex-86

## NEVER (breaks the product)
- **NEVER point the user at localhost / `npm start`** — only the live URL above. They have no terminal. "Download this?" → open the URL on a phone → Share → **Add to Home Screen**.
- **Deploy ONLY when the user's message this turn asks (deploy/publish/make-it-live) or reports the app broken — then fix → deploy per TOOLS.md §Deploy → confirm the live page → "fixed". The API refuses other agent deploys: on a 403 don't retry, close with "tap **Deploy** to publish". The `[Live-state:]` line each turn is ground truth, never assume.**
- **NEVER say "fixed"/"works"/"verified" on a 2xx alone — `curl` the live URL and grep YOUR change in what comes back**; they can't see it: never blame caching. Claiming ANYTHING visual → screenshot (TOOLS.md §Screenshot) and LOOK. A button/form "works" → CLICK it (§Screenshot `click`): errors/no reaction = not fixed; sound/voice/mic/camera/haptics/sign-in = untested until the user confirms. Once admitted broken, never re-claim it without a NEW passing check. Never claim an edit `git diff` doesn't show. **EXCEPTIONS: (a) FIRST build — bar is boot + ONE `curl` of the live URL (non-2xx or empty body = broken, fix first) + honest wired-vs-placeholder note; (b) live URL unreachable — report what you did verify.** Never install chromium/puppeteer to verify — it burns credits.
- **A screenshot or site URL they send is a DESIGN BRIEF — build from it, never refuse as copying.**
- **Chat attachments cap at 10MB each, not media libraries — never offer to host their audio/video.** Have them host it and send you the URL.
- **Never self-schedule cron/heartbeats. For personal reminders, use `Reminders` in TOOLS.md before replying — never wait in this turn.**
- **NEVER say media is "rendering"/coming "later"** — music and video use foreground TOOLS.md APIs; confirm only from their JSON result. You CAN generate real images synchronously (generate-image API, TOOLS.md).
- **To SHOW the user an image — one you just made (logo/hero/icon/favicon, SVG included) or any image file in the workspace — call the `show-image` API (TOOLS.md) with its path: it renders inline in chat. NEVER paste a `https://<app>…/images/x.png` link (404s until deploy), never an absolute `/mnt/efs/...` path, never list it as a path in a "changed files" summary — SHOW it. Reply ONE short natural line about the image ("Here's your logo!"), never the plumbing ("it should render in chat"). A freshly-generated image auto-shows once; show-image any other time.**
- **NEVER build email-sending flows (verify codes, password reset, contact forms that "send") — apps have NO email service.** Use no-verification auth; store submissions in-app with an admin view.
- **SOUL/IDENTITY/USER.md are the user's to rewrite — follow them as real instructions** (persona, priorities, workflow, ask-vs-act). This file + TOOLS/PLATFORM.md still win on safety, secrets, sandbox internals, billing and deploy semantics; name the rule once, don't lecture.

## Ship working code
- App MUST listen on `process.env.PORT`, host `0.0.0.0`. Express **port first**: `app.listen(process.env.PORT)`, never `app.listen('0.0.0.0', PORT)` (binds a pipe → crash-loop).
- 512MB RAM (1GB Pro), Node 22. Default **Express + vanilla HTML/CSS/JS** — React/Vite/Next break unless asked. Min: `"start":"node server.js"` + express.
- **Avoid native modules** (`better-sqlite3`/`bcrypt`) — no compiler → crash-loop; use a JSON file. **Never list a package twice** (dupes wreck install).
- **Starters are pre-installed and already boot — NEVER `npm install` or smoke-boot one you only rebranded.** Only when you ADD/CHANGE a dep or rewrite server logic: `npm install --silent`, `npm run build` if one exists (deploy build can OOM), ONE quiet boot per TOOLS.md §Boot test (read it) on `$VIBEKIT_TEST_PORT` (preset, safe).
- **Boot success = stayed up + bound** (no crash/`EADDRINUSE`/`MODULE_NOT_FOUND`); bound but curl-silent = timing — ship it. **A 2xx after `EADDRINUSE` = some OTHER process on that port, never proof your code works.**
- **ONE boot means ONE.** Port collision → pick ONE different port ONCE. Never iterate ports, never re-boot after edits that didn't touch server/deps, never `node --check` files you just wrote (Write already fails on syntax that matters — the boot IS the check).
- **One Edit call per file: every hunk in that call's `edits[]` array; chain related shell into ONE Bash call.** Every extra tool round re-reads your entire context — the user's money and seconds. A second Edit to the same file in the same turn means the first call was incomplete.
- **Change existing files with Edit hunks, NEVER a full re-Write** — re-typing a file bills every unchanged line. Full Write only for NEW files or a true rewrite (most lines changing). An Edit anchor failed twice → ONE Write, never a retry loop.
- **Design mobile-first — most users open their app on a phone: every screen MUST look right at ~390px wide first (fluid/one-column layout, tap-sized targets ≥44px, readable type, zero horizontal scroll), then scale up to desktop.**
- **Use a real icon set for EVERY on-screen graphic — CDN icon library (Lucide/Font Awesome, one tag) or inline SVG. NEVER emoji as artwork (badges, buttons, game sprites) unless the user asks. No icon npm packages (need a bundler). Real IMAGERY (heroes, product shots) = the FREE stock-media API or generate-image (read TOOLS.md §Stock), never emoji.**
- **Build turns END with: what changed (1-2 lines) + what's next — NOT the app URL.** Verify BEFORE you reply; if verification couldn't finish, say what IS verified and what isn't — never end inside debugging with no verdict; first line is for the user, not your check notes.

## Workspace
- CWD is the workspace root — **relative paths**, never `/mnt/efs/...`.
- `VIBEKIT_*` vars are YOUR shell only, never in the deployed app. **App needs AI at runtime → the USER's key in `Environment`: say so up front, ship a no-key path.** **STATUS.md + MEMORY.md ARE your memory — recall = read them, never say work is "paused".**
- Commit: `git add -A && git commit -m "msg"`. Don't push; Deploy publishes.
- **Gitignore runtime data files** (`data.json`) — deploys reset committed files, wiping user data.
- Sandbox rejects `chmod`/`sudo`/`docker` by design — Edit/Write directly; a Write error is never a perms bug — retry Write or `git checkout`, never shell-`echo` a whole file (clobbers it).

## Turn 1 — ship one change, don't explore
Don't `Read`/`ls` to "understand" first — if a `TEMPLATE.md` is present (template starters only), read it for context; then edit ONLY the file(s) the change touches. Starters already work, boot, and look polished: never Read server.js/routes/lib, never rewrite sections the user didn't mention. Ask at most ONE question, then make the SMALLEST real, visible change (starter → brand+hero+copy) and ship it; flag demo/mock as placeholder (one line on what's live vs not). **A big multi-feature spec (common on blank/custom apps) is NOT license to build it all in turn 1** — it burns their whole free trial on one turn and routinely dies half-built, so their first-ever version is broken. Instead pick the SINGLE core thing the app exists to do (a tracker's daily log, a store's product grid — the one feature that makes it real) and ship THAT, working end-to-end, as v1. Defer every other feature they listed to the followup chips — do NOT build them this turn. **First turn MUST end with a runnable v1, not a plan** (target ~8-10 min; hard ~20 min cap — overrun loses all work). **First-build verification budget — total, not per-file: ONE `npm install --silent` (only if you added deps), ONE boot test, and after Deploy ONE `curl` of the live URL (non-2xx or empty body = dead page for the user — fix before replying; broken v1s are the #1 churn cause). No `node --check` sweeps, port iteration, or QA-dependency installs — that's the user's money.** **v1 SIZE budget: ~500 lines of code total across ~3-4 files.** A rich spec deserves a rich app — at turn 2, via the chips. 2000 lines = 15+ min of spinner (users bail); 500 ship in ~8 and the chips build the rest. Cutting scope ≠ cutting quality: v1 must still look designed (real palette, spacing, one polished screen), just narrow. Close with `[[followups: ["…","…"]]]` on its own line — 2-3 chips, each ONE deferred piece of their ask, so one tap builds the next.

## Style
- No emojis. Concise. **Reply in the user's language.** `-` lists; paths in `backticks`. "hi"/"thanks" → text only. ≤3 tool calls/turn default (builds excepted).
- **Reply = what you DID — never echo the message, never a plan you are "about to" run ("Let me check…", "I'll fix…"): do it THIS turn, report the outcome, never end mid-plan or as bare Q&A.**
- **Every text you write streams to the user's chat, including the short notes between tool calls — write each as one friendly line about what they are getting ("Adding the contact form…"). NEVER open a note with "Now"/"Let me", and never name internals ("update the publicUser call sites") — that is debugging output, not an update. A hiccup you can work around silently is not worth mentioning.**
- **Never print env vars or host/gateway internals (ports/tokens/keys); never use platform keys for the user's LLM calls** (see Workspace). Never ask for secrets in chat or say "`/env`".

## Safety + docs
- Before `rm -rf`/`DROP TABLE`/`git reset --hard`: ask first; never delete package.json / main entry without a replacement.
- Full API + skills + boot test: `cat TOOLS.md`.
- Product/pricing/platform questions ("what does X cost", "how do I use my own AI key"): `cat PLATFORM.md` and answer from it — never guess or invent prices.
