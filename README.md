# Productivity & Execution Planning Dashboard

A premium, high-fidelity single-user productivity and habit-tracking suite styled with state-of-the-art **Dark Glassmorphism**, cut-glass edge glare highlights, and high-vibrancy color backlighting.

---

## 🔒 Security & Privacy: Glassmorphism Password Gate

To prevent search engines from index-crawling your personal data and to block random passersby from seeing your dashboard, a secure **client-side password gate** has been integrated.

### 🛡️ How the Security Works
1. **Search Engine Crawler Gating (SEO Blocking)**:
   - **robots.txt**: Standard robots rules at the public root explicitly tell search crawlers (Googlebot, Bingbot, etc.) to ignore all pathways (`Disallow: /`).
   - **Render-Gated State**: If you are not logged in, the application blocks the rendering of all tabs, lists, calendars, habits, and goals. Crawlers will scan a blank glass panel with a password prompt and find zero indexable text or user data.
2. **Session Auto-Locking**:
   - The app uses `sessionStorage` (`xp_session_active = true`) instead of `localStorage` to manage your access window. 
   - **tab-session lock**: You remain authenticated as long as the browser tab is open. Once you close the tab, the session instantly expires, auto-locking the dashboard for your privacy.
3. **Double cut-glass premium aesthetic**:
   - The password gate features a stunning, centered glassmorphism prompt matching the visual depth of the main categories, complete with eye toggles to show/hide keys, focused neon indigo glows, and error-shake animations.

---

## ⚙️ Environment Configuration & Deployment

Your access key is loaded securely from a Vite build variable:
`const ACCESS_KEY = import.meta.env.VITE_ACCESS_KEY || "productivity2026";`

### 1. Local Configuration (Changing Local Password)
If you want to use a custom password locally:
1. Create a file named `.env.local` in the root folder (`C:\Users\Bryan\Documents\_xProductivity Planning`).
2. Add your custom password inside:
   ```env
   VITE_ACCESS_KEY=your_secret_local_password
   ```
3. Restart your local development server (`npm run dev`).

### 2. Deploying to Vercel (100% Secure Environment Keys)
When deploying your project to Vercel, you can customize your access key securely **without hardcoding it in the source files**:

1. Log into your **Vercel Dashboard** and go to your Project Settings.
2. In the left navigation, click on **Environment Variables**.
3. Create a new variable:
   - **Key**: `VITE_ACCESS_KEY`
   - **Value**: `your_ultra_secure_custom_password`
4. Click **Save**.
5. During the Vercel build phase, Vite will securely inject this key. Passersby inspecting your repository on GitHub or looking at raw code will never see your password!

---

## 🚀 Local Quickstart

### Prerequisites
Make sure you have Node.js installed (v18+ recommended).

### Setup & Launch
1. Open a terminal in the root directory:
   ```powershell
   cd "C:\Users\Bryan\Documents\_xProductivity Planning"
   ```
2. Install dependencies:
   ```powershell
   npm install
   ```
3. Run the development server:
   ```powershell
   npm run dev
   ```
4. Open the displayed local address (usually `http://localhost:5173/`) in your browser.
5. Enter the access key **`productivity2026`** (or your `.env.local` custom value) to unlock your premium planner.

---

## 🗂️ Application Architecture & States

* **Vite + React + TS**: Instant compilation and highly responsive state updates.
* **Vibrant Backlighting**: Localized high-vibrancy glow nodes (`box-shadow` spreads with `0.18 - 0.22` opacity) match category themes (Work-cyan, Career-purple, Family-green, Health-orange).
* **LocalStorage Database**: Synchronizes all active tasks, weekly scorecard habit grids, monthly progress rate checks, and historical completions logs locally. (Fully modularized for simple migration to Supabase Client SDK hooks later).
* **Detailed checklists**:
  - **Dashboard**: Compact columns with inline Targets editor and delete buttons (checkbox-free), Near Term and Medium/Long Term checklists with satisfying delayed float-down animations on completion.
  - **Health Scorecard**: Interactive Sunday-to-Saturday daily metrics, WTD counts vs. targets, rolling 28-day monthly compliance grids. Renamed default `No alcohol` ➔ `Avoid alcohol` and added the `Take Supplements` metric with safe database migrations.
  - **Goals & Targets**: High-level vision grids segmented by medium/long terms.

---

## 📴 Offline Mode (installable PWA)

The dashboard runs with no network connection at all.

* **Service worker** (`public/sw.js`) caches the app shell and the hashed
  `/assets/*` bundles, so a cold load with no connection still boots the full
  app. Navigations are network-first (you always get the newest deploy when
  online) and fall back to the cached shell when offline; bundles are
  cache-first; the Google Fonts stylesheet and woff2 files are cached too so
  offline typography matches.
* **Never cached**: `/api/state`. Serving a stale cloud blob could let an old
  copy overwrite newer local edits — `localStorage` is the offline data source.
* **Install to home screen / desktop** via `public/manifest.webmanifest`
  (standalone display, dark theme color).
* **Sync behavior offline**: the header badge shows **Offline**, every change
  is written to `localStorage` as usual, and pushes are held rather than
  attempted. On reconnect the queued changes are pushed automatically. If the
  app was opened with no connection, the first cloud pull is retried once
  connectivity returns — but it is skipped if you edited anything in the
  meantime, so offline work is never overwritten by an older cloud copy.
* Updates take over as soon as a new deploy is fetched; an already-open tab
  reloads itself once so it never runs a stale bundle against a fresh cache.

## 🕒 Last-Edit Ticker

The strip under the header shows when the app itself last changed and which
model made the change, with the recent history scrolling beside it (hover to
pause, hidden under `prefers-reduced-motion` and on phones).

The data is read from `git log` at **build time** by `vite.config.ts` and baked
into the bundle (no API call, so it works offline). The model name comes from
the commit trailer — `Co-authored-by: Claude Opus 5 <…>`, or an explicit
`Model: <name>` line — so keeping that trailer on commits is what keeps the
attribution accurate. Commits without one are attributed to their git author.

---

## 🏗️ Production Build Commands
To check for TypeScript compiler validity and build production static files, run:
```powershell
npm run build
```
The compiled build output will be stored inside the `/dist` folder, fully optimized and ready to deploy to any CDN or host.
