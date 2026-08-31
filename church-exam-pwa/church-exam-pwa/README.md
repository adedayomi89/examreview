# RCCG Chapel of Resurrection, Zone 9 HQs — Sunday School Exam Portal

An installable, mobile-friendly (PWA) exam site for the quarterly review exam:
students sign up with just a name + password, take timed exams with a live
countdown, and see a nicely designed score screen with a full answer review.
Admins get a dashboard to manage students, build rich-text exams (with image
uploads), open/lock exams, and view/export results.

Built with **React + Vite + Tailwind**, data and auth via **Supabase**,
hosted on **Netlify** (including two small serverless functions used only
for admin student-management actions).

---

## 1. What's in this zip

```
church-exam-pwa/
  sql/schema.sql        <- run this once in Supabase
  netlify/functions/    <- admin-only student management (uses service role key)
  src/                  <- the React app
  public/               <- manifest, icons (generated from your logo), service worker
  .env.example           <- copy to .env for local dev
  netlify.toml
```

---

## 2. Set up Supabase (5–10 minutes)

1. Go to [supabase.com](https://supabase.com), create a free account and a
   **new project**. Pick a name (e.g. `cor-sunday-school`) and a strong
   database password (save it somewhere safe — you won't need it day-to-day).
2. Once the project is ready, open **SQL Editor** → **New query**, paste in
   the entire contents of `sql/schema.sql` from this zip, and click **Run**.
   This creates every table, security rule, and the image storage bucket.
3. Go to **Project settings → API**. You'll need three values shortly:
   - **Project URL**
   - **anon public** key
   - **service_role** key (⚠️ keep this one secret — never put it in the
     `VITE_` prefixed variables or it will end up in the browser bundle)

That's the entire database setup — no manual table clicking required.

---

## 3. Run it locally first (recommended)

```bash
cd church-exam-pwa
npm install
cp .env.example .env
```

Open `.env` and fill in:
```
VITE_SUPABASE_URL=https://YOUR-PROJECT-REF.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-public-key
```

```bash
npm run dev
```

Visit the local URL it prints. Try the student "First time" signup, then
create your admin account.

### Creating your admin account
Go to `/admin/signup` (there's a small link on the admin sign-in screen) and
fill in your name, email, and a password. That's it — the first person to
use that form becomes an admin. Because this route is easy to find, you can
optionally lock it with a setup code (see the deployment env vars below) or
simply stop linking to it / remove the route after you've created your one
admin account.

---

## 4. Deploy to Netlify

This app needs a **build step** (Vite) and includes two **serverless
functions**, so plain drag-and-drop of the folder into Netlify Drop won't
run the build or deploy the functions. Use one of these two instead — both
are just as easy:

### Option A — Netlify CLI (closest to "unzip and deploy")
```bash
npm install -g netlify-cli
cd church-exam-pwa
npm install
netlify login
netlify init        # choose "create & configure a new site"
netlify deploy --build --prod
```

### Option B — Push to GitHub, then "Import an existing project" in Netlify
1. Create a new GitHub repo and push this folder to it.
2. In Netlify: **Add new site → Import an existing project** → pick the repo.
   Build command and publish directory are already set via `netlify.toml`
   (`npm run build`, `dist`).

### Either way, set these environment variables in Netlify
**Site configuration → Environment variables**, then trigger a redeploy:

| Key | Value | Notes |
|---|---|---|
| `VITE_SUPABASE_URL` | your Supabase Project URL | used by the browser app |
| `VITE_SUPABASE_ANON_KEY` | your Supabase anon public key | used by the browser app |
| `SUPABASE_URL` | same Supabase Project URL | used by the server functions (no `VITE_` prefix) |
| `SUPABASE_SERVICE_ROLE_KEY` | your Supabase service_role key | server functions only — never exposed to the browser |
| `VITE_ADMIN_SETUP_CODE` | *(optional)* any phrase you choose | if set, `/admin/signup` requires it |

Once deployed, visit your Netlify URL, go to `/admin/signup`, and create your
admin account against production (same as the local step above).

---

## 5. Everyday use

**Admin** (`/admin`):
- **Students** — add a student (sets their username + a temporary password
  you share with them), reset a password, or remove a student.
- **Exams** — create an exam, add questions with the rich-text editor
  (bold/italic/lists, and an image button that uploads straight into the
  question or option), mark the correct answer(s), set the duration and
  pass mark, then hit **Open** when you want students to see it. **Lock** it
  again any time — locking does not erase existing submissions.
- **Results** — every submitted attempt, filterable by exam, with a CSV
  export for your records.
- **Site settings** — church name, department name, address, welcome text,
  and the logo shown across the app.

**Students** (`/student`): sign up once with their name, a username, and a
password (no email required); from then on they sign in the same way. Their
dashboard shows exams that are open now, any exam they're mid-way through,
completed exams with scores, and a heads-up on upcoming (locked) exams.

The countdown timer is based on when the student's attempt actually started,
so refreshing the page or losing connection never grants extra time — it
auto-submits the moment time runs out. Answers save automatically as
students work.

---

## 6. Notable design decisions & trade-offs

- **No email for students.** Supabase Auth requires an email under the
  hood, so the app generates one behind the scenes from the username (e.g.
  `tola.james` → `tola.james@students.corsundayschool.app`). Students never
  see or use this — they only ever type their username.
- **Admin-created students** go through a small Netlify serverless function
  (`netlify/functions/admin-create-student.js`) because creating another
  person's login can only be done with Supabase's service-role key, which
  must never live in browser code. The function double-checks the caller is
  really an admin before doing anything.
- **Question/option correctness visibility.** To keep the data model simple,
  the "correct answer" flag on an option is readable by the student's
  browser once an exam is open (the UI just doesn't display it until after
  submission). For a Sunday School quarterly review this is a reasonable
  trade-off; if you ever need it airtight against a technically curious
  student opening dev tools, that would mean moving grading into a
  server-side function instead of the client — happy to add that later if
  it matters to you.
- **PWA installability.** The manifest + service worker let students "Add to
  Home Screen" on their phone for an app-like icon and offline app shell;
  exam data itself always requires a live connection (by design, so scores
  can't be gamed offline).

---

## 7. Ideas for later (not built yet, but easy to add)

- Drag-and-drop question reordering (currently ordered by creation order)
- Per-class or per-age-group exam groups
- Email/SMS reminders when a new exam opens
- Printable certificate for passing students
- A "practice mode" separate from the graded quarterly review

If you'd like any of these, just ask.
