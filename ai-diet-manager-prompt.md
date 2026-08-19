You are an expert full-stack developer specializing in Cloudflare Workers,
Cloudflare Pages, Cloudflare D1, Wrangler, React, TypeScript, responsive web
applications, data visualisation, and the OpenAI Responses API.

Create a complete, working, **polished** personal AI diet manager website, then
build it, test it, and deploy it to Cloudflare for me.

Do not give me only code snippets. Create the complete project folder with all
source files, configuration files, database files, build scripts, tests, and
deployment automation.

Assume my machine is brand new and that I have set nothing up. Do the setup
yourself — see Phase 0 below. Do not hand me a list of things to install and
wait; check, install, and verify as much as you can on your own, and interrupt
me only for the two things that genuinely need a human.

---

# Phase 0 — Prepare the machine, before writing any code

Do this first, in order, and report what you actually found at each step. Do
not assume anything is already installed.

## 0.1 Node.js

Run `node --version`.

* If it reports **20.19.0 or newer**, say so and continue.
* If Node is missing or too old, install it, preferring the option that does
  **not** need administrator rights:
  1. If `nvm` is available, use it: install the current LTS and make it the
     default.
  2. On macOS, if Homebrew is already installed, `brew install node`.
  3. On Windows, `winget install OpenJS.NodeJS.LTS`.
  4. Otherwise install `nvm` first (its installer is user-local and needs no
     password), then use it.

**If any install step asks for a password or needs administrator elevation,
stop and tell me the exact command to run.** You cannot type my password and
must not try. Say plainly which step you reached and what you need from me.

Re-run `node --version` afterwards and show me the real output. Do not claim it
is installed without verifying.

## 0.2 npm

Run `npm --version` and confirm it works. It ships with Node; if it is missing,
the Node install did not complete — say so rather than working around it.

## 0.3 Create the project and install dependencies

Create the project (per the rest of this prompt), then run `npm install`.

Confirm `npm audit` reports **zero vulnerabilities**. If it does not, upgrade
the offending dependencies until it does, and tell me what you changed.

## 0.4 Check whether Cloudflare is already authorised

Resolve the Wrangler binary from `node_modules` and run `whoami` with
`process.execPath`. Do **not** use `npx`, and do not rely on a global install.

* If it reports a logged-in account, say which account, and continue.
* If it reports that I am not authenticated, go to 0.5.

Do not use a live health check to decide this. A health endpoint on a
predictable hostname may belong to somebody else's deployment and will report
their configuration as though it were mine.

## 0.5 Authorise Cloudflare — start it for me

If I am not authenticated:

1. Tell me clearly that a browser window is about to open and that I need to
   click **Allow**.
2. Start `npm run cf:login` yourself, in the background so it does not block
   you. It opens Cloudflare's OAuth consent page and waits for the callback.
3. If a URL is printed instead of a browser opening, show me the URL.
4. Poll `wrangler whoami` every few seconds until it succeeds, for up to about
   three minutes.
5. When it succeeds, tell me which account I authorised and carry on
   automatically without asking me anything further.
6. If it times out, stop and tell me exactly what to run.

Do not ask me to run the login command myself if you are able to start it. The
only thing I should have to do is click **Allow**.

I also need a Cloudflare account to exist in the first place. If the login
fails because I have no account, tell me to create one — the free tier covers
Pages and D1 — and then retry.

## 0.6 What you must never do in Phase 0 or afterwards

* Never type, read, print, store or transmit `OPENAI_API_KEY`, `APP_PASSWORD`
  or `SESSION_SECRET`. Those are mine to enter.
* Never run the `cf:secrets` prompts on my behalf, and never ask me to paste a
  secret value into the chat.
* Never claim a check, install, test or deployment succeeded unless you ran it
  and saw it succeed. If something failed, show me the actual output.

---

# The application

## Final deliverable

Create one folder named:

```text
my-ai-diet-manager
```

Do not create a ZIP or any other archive.

Inside it, create:

```text
deploy-folder
```

The `deploy-folder` must contain the complete production-ready website.

## Environment and portability

The project must work on both Windows and macOS, and must build correctly
regardless of where the project folder is located.

The standard commands must be:

```text
npm install
npm run build
npm test
```

Do not use operating-system-specific commands such as `rm`, `cp`, `sed`,
`chmod`, Bash-only scripts, PowerShell-only scripts, hardcoded Windows paths,
or hardcoded macOS paths. Use cross-platform Node.js scripts (`scripts/*.mjs`)
for cleaning, copying, building, and verifying files. Derive every path from
the script's own location with `fileURLToPath(import.meta.url)`.

Where you must run another tool, resolve its entry point from `node_modules`
and run it with `process.execPath`. Do not shell out, do not use `npx` at build
time, and do not rely on `.cmd` shims.

Target Node.js 20.19 or newer and say so in `package.json` `engines`. Use
current, non-vulnerable versions of every dependency: `npm audit` must report
zero vulnerabilities after `npm install`.

## Architecture

Use:

* React
* TypeScript
* Vite
* **Cloudflare Pages** (not a Worker — see the deployment section)
* A bundled Cloudflare `_worker.js`
* Cloudflare D1 database
* Wrangler, for deployment automation only
* OpenAI Responses API
* `gpt-5-nano` for every AI operation

Do not use: any nutrition or food database, any external calorie database, any
secondary AI model, any fallback model, any fallback nutrition API, Supabase,
Firebase, a separately hosted backend, or client-side OpenAI requests.

The application must use this exact model:

```text
gpt-5-nano
```

Hardcode the model name as a server-side constant:

```typescript
const OPENAI_MODEL = "gpt-5-nano";
```

Do not allow the model to be changed through the frontend. Do not create an
`OPENAI_MODEL` Cloudflare environment variable, and do not read the model from
`env` anywhere. Do not fall back to another model if `gpt-5-nano` fails: return
a friendly error and allow the user to try again.

## AI nutrition system

Use `gpt-5-nano` for: understanding written meal descriptions; identifying
foods in meal photos; estimating portion sizes; estimating weights in grams;
estimating calories, protein, carbohydrates, fat and fiber; identifying
preparation methods; identifying likely sauces, oils, dressings and toppings;
generating meal names; and generating structured nutrition results.

Use the OpenAI Responses API (`POST https://api.openai.com/v1/responses`) with
strict structured outputs. Follow the current official OpenAI documentation for
`gpt-5-nano`, images and vision, and structured outputs.

The OpenAI API request must occur only inside the Cloudflare backend. Never
expose `OPENAI_API_KEY` in the frontend, and never let the browser call OpenAI.

### Nutrition estimation behaviour

The application must clearly communicate that nutrition values are estimates.
Display this message on the meal-review screen:

```text
AI-generated nutrition estimates may not be exact. Ingredients, portion sizes, oils, sauces, and preparation methods can significantly change the result. Review and edit the values before saving.
```

Never automatically save an AI-analyzed meal. The user must review and confirm
the result first. Every detected item must be editable.

The AI response should include:

```json
{
  "mealName": "Vegetable rice bowl",
  "mealType": "lunch",
  "items": [
    {
      "foodName": "Cooked white rice",
      "amount": 1,
      "unit": "cup",
      "estimatedGrams": 158,
      "calories": 205,
      "proteinGrams": 4.3,
      "carbohydrateGrams": 44.5,
      "fatGrams": 0.4,
      "fiberGrams": 0.6,
      "preparation": "boiled",
      "confidence": 0.85,
      "assumptions": "Estimated as one standard cup of cooked rice."
    }
  ],
  "totals": {
    "calories": 205,
    "proteinGrams": 4.3,
    "carbohydrateGrams": 44.5,
    "fatGrams": 0.4,
    "fiberGrams": 0.6
  },
  "overallConfidence": 0.85,
  "warnings": ["Serving size was estimated from the photo."]
}
```

Use strict structured outputs so the backend receives predictable JSON: every
property in `required`, `additionalProperties: false` at every level.

Validate the returned data before sending it to the frontend. **Recalculate the
totals in code from the individual food items — never store or return the
model's own `totals` object.** Reject unreasonable values: negative calories,
negative macros, impossible confidence values, missing food names, non-numeric
quantities, and anything outside configured safety limits.

### Text meal entry

Allow the user to type natural descriptions such as:

```text
Two idlis with one bowl of sambar and coconut chutney.
One cup of rice, dal, mixed vegetable curry, yogurt, and one teaspoon of ghee.
A grilled cheese sandwich and a small latte.
```

Ask the model to separate the meal into individual food items, estimate each
portion and its weight in grams, estimate calories and macros, mention
important assumptions, return strict structured JSON, and never claim the
estimates are exact.

### Meal photo analysis

Allow users to take a meal photo from a phone, upload an existing image,
preview it, remove and replace it, add optional written context, and submit it
for analysis. Optional context examples:

```text
The curry was made with coconut milk.
This is a large restaurant portion.
There is paneer underneath the sauce.
```

Resize and compress large images in the browser before upload (longest edge
1024px, JPEG, stepping quality down until under the size limit). Support JPEG,
PNG and WebP. Validate MIME type and file size on both the client and the
server. Do not permanently save meal images: use the photo only for the
analysis request and then discard it.

### Meal review screen

After AI analysis, show a review page. Allow the user to edit the meal name,
meal type, date and time; edit every food name, quantity, serving unit,
estimated grams, calories, protein, carbohydrates, fat and fiber; delete
detected items; add missing items manually; add notes; see totals recalculate
live; cancel without saving; and confirm and save.

Clearly mark the nutrition result as:

```text
Estimated by GPT-5 Nano
```

Do not use terms such as "verified", "exact", or "database confirmed" anywhere
in the interface.

## Pages

Create these pages: Login, Today, Add Meal, Meal Review, History, Progress,
Settings.

**Today** — current date; total calories consumed; remaining calories; protein,
carbohydrate, fat and fiber consumed against target; today's meals grouped into
Breakfast, Lunch, Dinner and Snack; latest weight; Add Meal and Add Weight
buttons; edit and delete on any saved meal.

**History** — browse previous dates, search meals, filter by meal type, open a
meal, edit a meal, delete a meal (with a confirmation dialog), view daily
totals, and see days with no entries.

**Weight tracking** — record weight, unit (kilograms or pounds), date and
optional notes; edit and delete entries.

**Progress** — seven-day calorie chart, thirty-day calorie chart, protein,
carbohydrate, fat and fiber trends, weight trend, average daily calories,
average daily protein, number of days logged.

**Settings** — display name, time zone, weight unit, daily calorie / protein /
carbohydrate / fat / fiber targets, export data, logout. Do not generate
medical targets automatically; let the user enter their own. Display this
disclaimer:

```text
This application is a general food-tracking tool and does not provide medical advice. AI-generated calorie and nutrition estimates may be inaccurate. Consult a qualified healthcare professional for medical or dietary guidance.
```

## Visual design and polish

This must not look like a prototype. Build a genuinely polished, modern
health-dashboard interface.

* A proper design-token system in CSS custom properties: spacing scale, radius
  scale, layered shadows, typography scale, and a full colour palette.
* Calm neutral background with a subtle tint, green or teal accent, rounded
  cards, clear typography, consistent spacing, accessible contrast, subtle
  shadows.
* **A complete dark theme** driven by `prefers-color-scheme`, using the same
  tokens so every chart and component follows it automatically.
* **Inline SVG icons, not emoji**, for navigation, actions, meal types and
  empty states. They must inherit `currentColor`.
* Tabular figures for all numbers.
* Skeleton loading placeholders rather than bare spinners for page loads.
* Clear, specific empty states and error states.
* Subtle transitions only, all disabled under `prefers-reduced-motion`.

Avoid clutter, excessive animation, medical-looking design, food shaming, red
warning colours for normal eating behaviour, complicated menus, tiny text, and
desktop-only hover interactions.

## Graphs — include them wherever they help

Write your own dependency-free SVG chart components. Every chart must draw into
a fixed `viewBox`, be styled `width: 100%; height: auto`, take its colours from
CSS custom properties so it works in both themes, and degrade to a friendly
message rather than an empty frame when there is no data.

Cap the rendered width of a chart so that a full-width card on a large monitor
does not scale the axis labels up to headline size. Choose gridline bounds with
a fine-grained "nice number" scale, so a 2,592 kcal maximum does not round the
axis up to 5,000 and leave half the chart empty.

Build at least: a bar chart with an optional dashed target line, a multi-series
line chart with an optional area fill, a stacked bar chart, a proportional
donut with a centred caption and a percentage key, a sparkline, a progress
ring, a proportional macro strip, and a calendar-style consistency heatmap.

Place them at least here:

* **Today** — calorie progress ring; per-macro progress meters; a seven-day
  calorie bar chart with the target line; a donut of where today's calories
  came from by macronutrient; a donut of calories by meal; a macro strip on
  every meal card.
* **Meal Review** — a macro-split donut that updates live as values are edited.
* **History** — a stacked bar chart of calories per day split by meal type
  across the selected range, plus summary tiles.
* **Progress** — seven-day and thirty-day calorie bar charts; a thirty-day
  consistency heatmap; macro trend lines; an average macro split donut; a
  calories-by-meal donut; an area-filled weight trend with the signed change.

Split calories by macro using 4/4/9 kcal per gram, not by gram weight.

Extend the API where the charts need data the endpoints do not already return
(for example a seven-day trend on the dashboard, and meal-type totals, average
macros and weight change on progress).

## Responsive design

The website must be fully responsive and work well on iPhone, Android phones,
iPad, Android tablets, small laptops and large desktop monitors. Verify layouts
at approximately 360px, 390px, 430px, 768px, 1024px and 1440px.

Mobile: no horizontal scrolling; large touch-friendly buttons; minimum touch
target around 44px; bottom navigation; camera-friendly photo upload; forms that
fit within the screen; charts that resize correctly; modals that fit small
displays (bottom sheets); safe-area support for modern phones; readable font
sizes; a sticky Add Meal button where helpful. Use 16px form inputs so iOS
Safari does not zoom on focus.

Desktop: sidebar navigation; centred content area; useful dashboard layout;
multi-column cards when space allows; a maximum readable content width; no
oversized empty sections. Cap the width of any element that would otherwise
stretch absurdly (the heatmap especially). Do not split the dashboard into two
columns so early that the charts become cramped — check how it actually looks
at 1024px before committing to the breakpoint.

Use mobile-first responsive CSS, with CSS Grid and Flexbox. Build one
responsive website, not separate mobile and desktop applications.

Avoid `background-attachment: fixed`; iOS Safari handles it badly. Use a fixed
pseudo-element layer instead.

## Database

Use Cloudflare D1. Create `database/schema.sql` with tables for profiles,
meals, meal items, weight entries, sessions and login attempts.

profiles: `id`, `display_name`, `timezone`, `weight_unit`, `calorie_target`,
`protein_target`, `carbohydrate_target`, `fat_target`, `fiber_target`,
`created_at`, `updated_at`.

meals: `id`, `profile_id`, `meal_name`, `meal_type`, `meal_date`, `meal_time`,
`input_method`, `original_text`, `notes`, `ai_model`, `overall_confidence`,
`created_at`, `updated_at`.

meal_items: `id`, `meal_id`, `food_name`, `amount`, `unit`, `estimated_grams`,
`calories`, `protein_grams`, `carbohydrate_grams`, `fat_grams`, `fiber_grams`,
`preparation`, `confidence`, `assumptions`, `nutrition_source`, `created_at`,
`updated_at`.

weights: `id`, `profile_id`, `weight_value`, `weight_unit`, `recorded_date`,
`notes`, `created_at`, `updated_at`.

sessions: `id`, `token_hash`, `expires_at`, `created_at`, `last_used_at`.

login_attempts: `id`, `ip_hash`, `attempted_at`, `successful`.

Store `gpt-5-nano` in `ai_model` and `gpt-5-nano-estimate` in
`nutrition_source`.

Add primary keys, foreign keys, useful indexes, date indexes, and cascade
deletion where appropriate. Write it with `CREATE TABLE IF NOT EXISTS` and
`INSERT OR IGNORE` so it is safe to run more than once.

Use parameterized SQL queries. Never create SQL by concatenating user input.

## Authentication

This is a single-user personal application. Use encrypted Cloudflare secrets
named `APP_PASSWORD` and `SESSION_SECRET`.

On successful login: create a secure random session token; save only its hash
in D1; store the original token in a secure cookie; set `HttpOnly`, `Secure`
and `SameSite=Strict`; add session expiration; support logout; and rate-limit
repeated login attempts. Compare passwords in constant time. Store only a hash
of the IP address, never the address itself.

Use `SESSION_SECRET` as the HMAC key for the session token hashes, the IP
hashes and the constant-time password comparison. Do not derive that key from
`APP_PASSWORD`: a human-chosen password is weak key material, and an unkeyed
hash of an IP address can be brute-forced across the whole IPv4 space.

Never log passwords, API keys, cookies, or meal photos.

## Required Cloudflare resources

The application must require only:

```text
DB
OPENAI_API_KEY
APP_PASSWORD
SESSION_SECRET
```

`DB` is a Cloudflare D1 binding; the other three are encrypted secrets. Do not
require an `OPENAI_MODEL` variable or any food-database API key, and do not
include food-database code, setup instructions or configuration anywhere in the
project — not even in comments or documentation.

## API endpoints

```text
GET    /api/health

POST   /api/auth/login
POST   /api/auth/logout
GET    /api/auth/session

GET    /api/profile
PUT    /api/profile

POST   /api/analyze/text
POST   /api/analyze/image

GET    /api/meals
POST   /api/meals
GET    /api/meals/:id
PUT    /api/meals/:id
DELETE /api/meals/:id

GET    /api/weights
POST   /api/weights
PUT    /api/weights/:id
DELETE /api/weights/:id

GET    /api/dashboard
GET    /api/progress
GET    /api/export
```

Validate all API inputs. Use a consistent JSON envelope for every response.
Require authentication for all personal-data routes. Return 404 for unknown API
routes *before* checking configuration, so a mistyped URL never looks like a
Cloudflare setup problem.

Make `GET /api/health` report, without authentication, which of the four
resources are configured. It is the only reliable way to tell what the running
deployment actually has.

## Worker routing

The bundled worker must be `deploy-folder/_worker.js`. It must handle `/api/*`
requests, send static requests to `env.ASSETS.fetch(request)`, support React
frontend routes, return `index.html` for valid client routes, avoid returning
`index.html` for missing image, CSS or JavaScript files, and return JSON errors
for API failures.

**Important, and easy to get wrong:** Cloudflare's asset server performs its own
single-page-app fallback. A request for a missing `/assets/app.js` comes back
as `index.html` with status **200**, not a 404, so checking
`assetResponse.status === 404` is not enough. Treat any request for a
non-HTML file that is answered with `Content-Type: text/html` as missing and
return a real 404. Test this with a mock asset server that reproduces the
fallback behaviour, not one that returns honest 404s.

The same fallback catches unknown extensionless paths: `/definitely-not-a-page`
also comes back as `index.html` with a 200. Only the app's own client routes
may resolve that way; anything else must be a real 404.

Serve every HTML document with a no-cache directive. The HTML names the hashed
asset bundle, so a cached copy will keep loading the previous deployment's
JavaScript after a deploy. Hashed assets themselves stay immutable.

Bundle the worker into one self-contained JavaScript file with esbuild's
JavaScript API. Do not leave unresolved local imports.

## Error handling

Show clear, user-friendly errors for: missing OpenAI API key, missing D1
binding, incorrect password, invalid image, image too large, AI response
failure, invalid structured AI response, network interruption, Cloudflare
database failure, missing database tables, and session expiration. Each message
should say what to do next.

If `gpt-5-nano` fails, say exactly:

```text
We couldn’t analyze this meal right now. Please try again or enter the nutrition details manually.
```

Do not call another model. Do not call an external nutrition service.

## Deployment: Cloudflare Pages, with Wrangler automation

Use **Cloudflare Pages**. This is not optional and it is the single most
important thing to get right:

**Do not create a Cloudflare Worker.** A Worker does not provide the `ASSETS`
binding that `_worker.js` needs to serve `index.html`, the CSS and the JS. If
the project is created as a Worker, the site cannot work and the bindings UI
will look completely different. Create the Pages project with
`wrangler pages project create`, and verify with `wrangler pages project list`.

Add `wrangler` as a devDependency and a `wrangler.toml` that declares the D1
binding as code, for both production and preview:

```toml
name = "my-ai-diet-manager"
pages_build_output_dir = "deploy-folder"
compatibility_date = "<today>"

[[d1_databases]]
binding       = "DB"
database_name = "my-ai-diet-manager-db"
database_id   = "<filled in automatically>"
```

Declaring the binding in `wrangler.toml` matters: the Cloudflare dashboard's
bindings screen frequently refuses to save the binding with no visible error,
and this bypasses it entirely.

Provide these npm scripts, implemented in a single cross-platform Node script:

```text
npm run cf:login     sign in to Cloudflare
npm run cf:whoami    report which Cloudflare account is authorised
npm run cf:setup     create the database, apply the schema, create the Pages
                     project, write the binding, build and deploy
npm run cf:deploy    build and deploy with the binding attached
npm run cf:secrets   prompt for the three secrets, then redeploy
npm run cf:schema    re-apply database/schema.sql to the remote database
npm run cf:status    report what the live site actually has configured
```

`cf:setup` must be idempotent and must, in order: verify authentication with a
clear message if not signed in; create the D1 database only if it does not
exist; **write the real `database_id` into `wrangler.toml` before running any
other D1 command**, because Wrangler resolves the database from that config and
a placeholder id will fail; apply `database/schema.sql` remotely and verify all
six tables exist; create the Pages project only if it does not exist; build;
deploy; then read `/api/health` and print exactly which secrets are still
missing.

The Pages project-creation API returns transient failures often enough to be
worth retrying two or three times before giving up.

`cf:status` must fail loudly when I am not signed in, rather than reporting the
health of whatever happens to be answering at the predictable hostname — that
could be somebody else's deployment.

Resolve the Wrangler binary from `node_modules` and run it with
`process.execPath`. Note that Wrangler's `package.json` `exports` map blocks
`require.resolve('wrangler/bin/wrangler.js')`, so read its manifest and follow
the `bin` entry instead.

**`cf:secrets` must redeploy afterwards.** Cloudflare Pages binds secrets at
deployment time: a secret added to an existing project does not reach the
already-running deployment. This is a real trap — the dashboard will list the
secret while the site still reports it as missing.

Your setup script must never read, print, store or transmit a secret value. It
hands the terminal to Wrangler so I type the value into Wrangler's own prompt.

The Direct Upload path through the dashboard must keep working as an
alternative, and the documentation must cover both.

## Deployment structure

```text
my-ai-diet-manager/
  README.md
  CLOUDFLARE_SETUP.md
  package.json
  package-lock.json
  tsconfig.json
  vite.config.ts
  vitest.config.ts
  wrangler.toml
  .gitignore
  .env.example

  database/schema.sql

  src/
    shared/
    frontend/
    worker/

  scripts/
    paths.mjs
    clean.mjs
    build.mjs
    build-worker.mjs
    assemble-deployment.mjs
    verify-deployment.mjs
    cloudflare.mjs

  tests/

  public/
    manifest.webmanifest
    icons/
    _headers

  deploy-folder/
    index.html
    _worker.js
    manifest.webmanifest
    _headers
    assets/
    icons/
```

The final `deploy-folder` must not contain source code, TypeScript files, API
keys, `.env` files, the database schema, tests, README, `node_modules`,
development configuration, or secret values.

Generate the PWA icons as real PNG files from a Node script using only built-in
`zlib` — no image libraries, no binary assets checked in by hand.

## Testing

Create automated tests for: AI response validation; macro-total calculation;
meal input validation; authentication; session handling; login rate limiting;
database request validation; responsive component behaviour; chart components
and their empty states; API error responses; missing binding handling; missing
OpenAI key handling; and the Cloudflare SPA-fallback routing case described
above.

Run the API tests against the real `database/schema.sql` using Node's built-in
`node:sqlite` through a small D1-compatible shim, and skip those suites
gracefully if `node:sqlite` is unavailable. Load `node:sqlite` through a
variable specifier so the project still type-checks on Node versions whose type
definitions do not include it.

Also write project-level tests that assert: `gpt-5-nano` is the only model
mentioned anywhere; no other model or fallback appears in any file; no external
food-database integration exists anywhere; the model is never read from `env`;
no secrets are committed; the frontend never references the OpenAI key or
endpoint; the schema has every required table, index and cascade; and the build
scripts contain no OS-specific commands or hardcoded paths.

Strip comments before scanning source for forbidden strings — a comment
explaining why something is avoided must not read as a use of it. Exclude the
test file and the verifier from their own scans, since they necessarily contain
the forbidden strings.

## Before you tell me you are done

1. Confirm Phase 0 completed: show me the real `node --version` output, the
   `npm audit` result, and which Cloudflare account is authorised.
2. Run `npm install` and confirm `npm audit` reports zero vulnerabilities.
3. Run `npm test`. Every test must pass.
4. Run `npm run build`.
5. Confirm `deploy-folder`, `_worker.js` and `index.html` exist.
6. Confirm no secrets, no nutrition-database code, and no fallback model.
7. Run `npm run cf:setup` and deploy it for real.
8. Verify the live site: `/api/health` must report `database: true`; `/` and
   client routes must return HTML; a missing `/assets/*.js` must return a real
   404, not HTML; an unknown `/api/*` route must return a JSON 404.
9. **Actually look at the running site.** Load it in a browser at 360px and at
   1440px, in light and dark themes, and confirm there is no horizontal
   scrolling, the charts render, and the layout holds. Since you cannot sign in
   without my password, serve the real production build locally against fixture
   data so you can inspect the signed-in pages too — and say clearly which
   screenshots came from the live site and which from the local harness.
10. Do not claim tests passed unless they were actually executed.

Interrupt me only for these two things:

* an install step that needs my password or administrator rights;
* clicking **Allow** on Cloudflare's OAuth consent screen.

Do not ask me to paste `OPENAI_API_KEY`, `APP_PASSWORD` or `SESSION_SECRET`
into the chat, and do not run the `cf:secrets` prompts on my behalf. I will
enter those myself at the end.

## Completion response

When you are done, print: the exact project-folder location; the exact
`deploy-folder` location; the live site URL; confirmation that no ZIP was
created; which Cloudflare account is authorised; the tests that were run and
their results; the build results; the output of `/api/health`; confirmation
that only `gpt-5-nano` is used; confirmation that no external
nutrition-database integration or fallback model exists; and the exact
remaining commands I need to run to finish the secrets.

## Final restrictions

* Use `gpt-5-nano` for every AI request.
* Do not use any external nutrition or food database.
* Do not use a fallback AI model.
* Do not create a ZIP.
* Do not expose the OpenAI API key.
* Do not automatically save AI results.
* Do not omit manual correction controls.
* Do not omit mobile or desktop responsiveness.
* Do not claim AI nutrition estimates are exact.
* Do not create a Worker instead of a Pages project.
* Do not omit the D1 setup automation or instructions.
* Do not handle my secret values yourself.
* Do not stop until the site is deployed and `/api/health` reports the database
  as configured.
