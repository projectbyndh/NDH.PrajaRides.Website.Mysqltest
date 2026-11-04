# Praja Ride website + NepCab referral system

Website of **Praja Ride Pvt. Ltd.**, the official NepCab franchise for Butwal, together with the NepCab
driver referral and QR tracking system.

## Website pages

| URL | What it is |
| --- | --- |
| `/` | Praja Ride home: NepCab as the featured service, how it works, why Praja Ride, drive-with-us banner, FAQ |
| `/nepcab` | NepCab rides: tracked store buttons, share QR, features, how to book |
| `/drive` | Drive with us: benefits, requirements, steps and the **online driver application** |
| `/about`, `/contact` | Company page (story, mission, timeline, team, photos); contact details and **contact form** |
| `/safety` | Safety & support: driver checks, rider tips, emergency numbers, lost & found, **report form** |
| `/business`, `/careers` | Business enquiries and job openings, each with its own **enquiry form** |
| `/news`, `/news/<slug>` | News & offers written in Admin → News |
| `/gallery` | Photo gallery with albums and a full-screen viewer (Admin → Gallery) |
| `/drive/status` | Drivers check their application with mobile number + date of birth |
| `/press` | Media kit: company description, logo downloads, colours, press contact |
| `/privacy`, `/terms` | Privacy policy and terms (review with your lawyer before launch) |
| `/sitemap.xml`, `/robots.txt` | Search engines (published news posts included); admin, portal and tracking links are excluded |

Applications land in the admin under **Applications** (approve → driver created → WhatsApp login). All website
forms (contact, business, careers, safety, lost item) land in **Messages**, filterable by topic. Driver
profiles hold DOB, address, emergency contact, citizenship, license, vehicle, bluebook/insurance dates,
payout details and onboarding notes; the Overview warns about documents expiring within 30 days, and
drivers see their own document dates in the portal.

**Admin → Website** edits the site without code: announcement bar, home headline, contact numbers,
address, office hours, social links (incl. Google Business Profile), About content (story, mission,
vision, company numbers, milestones, team), testimonials, job openings and FAQs. **Admin → News** and
**Admin → Gallery** manage posts and photos. Saving publishes instantly (cached pages are refreshed by tag).
Photos are resized in the browser (WebP, max 1600px + a 640px thumbnail) and stored in object storage
(Contabo, S3-compatible), served from `/media/<id>` with long-lived caching. Every text on the public
pages is editable in **Admin → Page content** (one editor per page) and **Admin → Services**. Sections without content (photos, testimonials, news, team)
stay hidden.

Every public page also has a floating call / WhatsApp button and schema.org `LocalBusiness` data for
Google. Brand type: Poppins (titles) + Lora (text); the Praja Ride emblem lives
in `public/brand/` and is also the site icon.

The database schema is versioned (`SCHEMA_VERSION` in `src/lib/schema.ts`): bump it whenever the schema
changes; it is applied once, not on every cold start.

Smart referral links and QR codes for NepCab drivers. Every scan is logged
(driver, platform, IP, referrer, time). Riders land on a branded page with Play Store
and App Store buttons, and an admin dashboard shows which driver brought in how many riders.

| URL | What it does |
| --- | --- |
| `/r/DRV101` or `/r?driver=DRV101` | Logs the scan, detects Android / iOS / desktop, redirects to the landing page (or straight to the store with `AUTO_REDIRECT=true`) |
| `/download?driver=DRV101` | Branded landing page: "Referred by Driver" badge plus store buttons. The rider's own platform is highlighted. Desktop visitors get a QR code to continue on their phone |
| `/api/track-click` | `POST {driverId, store, visitId}`. Store-button taps, sent with `navigator.sendBeacon` so the redirect isn't delayed |
| `/admin` | Password-protected dashboard: totals, platform split, 14-day chart, leaderboard, QR sticker generator, CSV export |
| `/admin/drivers` | Register drivers (name and phone required; email, age, address, vehicle optional), set login PINs, view each driver's referrals and rewards |
| `/admin/rewards` | Edit the monthly reward tiers; review, pay or cancel earned rewards month by month |
| `/driver` | Driver portal (phone + PIN): this month's referrals, progress to the next reward, rank, reward history, own QR sticker and share link |
| `/` | Redirects to `/r` and counts the visit as `DIRECT` |

Store links carry the driver ID:
- **Play Store:** `&referrer=utm_source=driver_referral&utm_medium=qr&utm_campaign=DRV101`. Once the app ships, read it with the [Play Install Referrer API](https://developer.android.com/google/play/installreferrer) to attribute actual installs.
- **App Store:** `?ct=DRV101`. This appears under App Store Connect → App Analytics → Campaigns. Set `NEXT_PUBLIC_APP_STORE_PROVIDER_TOKEN` (`pt`) to enable it.

Link-preview bots (WhatsApp, Messenger, Viber, Telegram…) are not counted, so pasting a link into a chat doesn't inflate a driver's numbers.

## Driver rewards: what counts

A **qualified referral** is a rider's phone that opened a driver's link and tapped Google Play or App Store.

- **One phone counts once.** Each rider's browser gets a cookie (`nc_dev`); IP plus user agent is the fallback. The phone is credited to the *first* driver who referred it, in the month of that first tap.
- **No self-referrals.** Any browser a driver logs into `/driver` from is marked as theirs, and taps from it never count, including earlier ones.
- **Only registered, active drivers earn.** Scans of unregistered IDs are still recorded and shown on the leaderboard with an "add" link, so registering an ID later keeps its history.
- **Monthly tiers.** Counts reset on the 1st (Nepal time). Reaching a tier creates a **pending** reward automatically. Admin checks it, pays it (cash, eSewa, Khalti…), and marks it **paid**, or **cancels** it if it looks like fraud. Drivers see the status in their portal.
- **PIN brute-force protection.** After 5 wrong PINs, the account locks for 15 minutes. Resetting the PIN in admin also unlocks it.

## Folder structure

```
db/schema.sql                    SQL schema (generated from src/lib/schema.ts; auto-applied on first request)
src/
  proxy.ts                       Guards /admin and /api/admin with the admin cookie
  lib/
    schema.ts                    Database schema (tables: referral_clicks, drivers, driver_devices, reward_tiers, driver_rewards)
    drivers.ts                   Driver CRUD, phone normalizing, scrypt PIN hashing, login lockout
    rewards.ts                   Qualified-referral counting (first touch, per device), tiers, reward sync and payouts
    period.ts                    Nepal-time month helpers
    session.ts                   requireAdmin / requireDriver for pages and server actions
    config.ts                    Brand info, store URLs, store-link builders, driver-ID normalizing
    tracking.ts                  User-Agent → platform, bot filter, client IP
    mysql.ts                     MySQL pool + tagged-template client (parameters, fragments, transactions)
    db.ts                        Auto-migration, click logging and the analytics queries
    referral.ts                  Shared /r handler (log after response, redirect)
    auth.ts                      Signed admin and driver session cookies
  components/
    Logo.tsx                     NepCab SVG mark + wordmark
    StoreBadges.tsx              Play / Apple glyphs
  app/
    r/route.ts                   /r?driver=…
    r/[driverId]/route.ts        /r/DRV101
    download/page.tsx            Landing page (server)
    download/DownloadButtons.tsx Store buttons + click beacon (client)
    download/DesktopQr.tsx       "Scan with your phone" QR for desktop visitors
    api/track-click/route.ts     Store-button click logging
    api/admin/export/route.ts    Leaderboard CSV
    admin/(panel)/layout.tsx     Admin header and tabs (Overview, Drivers, Rewards)
    admin/(panel)/page.tsx       Overview: stats, platform split, daily chart, leaderboard
    admin/(panel)/drivers/       Driver list, add/edit forms, detail page with PIN reset and QR
    admin/(panel)/rewards/       Payouts per month and the tier editor
    admin/actions.ts             Server actions: admin login / logout
    admin/login/                 Admin login page
    driver/page.tsx              Driver portal
    driver/login/                Driver login (phone + PIN)
  components/QrGenerator.tsx     Live QR preview, sticker PNG and plain-QR PNG export, share button
  components/SubmitButton.tsx    Submit buttons stay disabled until the page has loaded (see note below)
```

## Database

Five tables (see `db/schema.sql`): `referral_clicks`, `drivers`, `driver_devices`, `reward_tiers` and `driver_rewards`. The main one is `referral_clicks`:

| column | notes |
| --- | --- |
| `id` | UUID |
| `driver_id` | Normalized to `A–Z 0–9 - _`, max 32 chars. `DIRECT` if none |
| `event_type` | `scan` (link opened or QR scanned) or `store_click` |
| `platform` | `android`, `ios` or `desktop` |
| `store` | `play` or `appstore` (store clicks only) |
| `visit_id` | Links a store click to the scan it came from |
| `device_id` | Rider's browser cookie, used for one-referral-per-phone |
| `ip_address`, `user_agent`, `referrer`, `created_at` | |

Works with MySQL 8.0+ or MariaDB 10.4+ (window functions and recursive CTEs are used by the
analytics queries, so older versions will not do). The tables and indexes are created automatically
on the first request; `db/schema.mysql.sql` is the same SQL, generated by `npm run schema`.

## Deploy to Hostinger (VPS)

The site is a standard Node.js app (`next build`, then `next start`) behind nginx. Files: `ecosystem.config.cjs` (PM2)
and `deploy/nginx.conf`.

1. **Server.** Ubuntu VPS with Node.js 22 LTS, nginx, PM2 (`npm i -g pm2`) and certbot. Point the domain's A record at it.
2. **Code.** `git clone <repo> /var/www/prajaride && cd /var/www/prajaride`
3. **Settings.** Create `.env.production` with every variable from `.env.example`:
   - `MYSQL_HOST`, `MYSQL_PORT`, `MYSQL_DATABASE`, `MYSQL_USER`, `MYSQL_PASSWORD`: the MySQL server (or one `MYSQL_URL`). TLS is on unless `MYSQL_SSL=false`; leave it on whenever the database is not on this same machine, because passwords and driver details would otherwise cross the internet in the clear. On shared hosting the app and MySQL share a server, so the host is `localhost`.
   - `OBJECT_STORAGE_*`: the Contabo bucket for every image.
   - `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `SESSION_SECRET` (a long random string).
   - `NEXT_PUBLIC_SITE_URL=https://<domain>`: set **before the first build** — QR codes, links and the sitemap use it.
4. **Build and start.** `npm ci && npm run build && pm2 start ecosystem.config.cjs && pm2 save && pm2 startup`
   Then fill the image cache once: `node --env-file=.env.production scripts/warm-cache.mjs` (object storage is slow to
   start sending; the server keeps a copy of every image in `.cache/storage`, so only this first read waits).
5. **nginx + HTTPS.** Copy `deploy/nginx.conf` to `/etc/nginx/sites-available/prajaride` (set the domain), link it into
   `sites-enabled`, `nginx -t && systemctl reload nginx`, then `certbot --nginx -d <domain> -d www.<domain>`.
6. **Check.** `https://<domain>/api/health` returns `{"ok":true,...}` when the database and storage answer. Sign in at `/admin`.

### When the site answers 504 Gateway Time-out

504 comes from nginx, and it means the app was reached but sent nothing back in time (a dead app
process gives **502** instead). Three checks, in order, on the server:

```bash
curl -s localhost:3000/api/live        # the app itself: touches nothing
curl -s localhost:3000/api/db-check    # names the database error, and what to do about it
pm2 logs prajaride --lines 50
```

- `/api/live` answers, `/api/db-check` reports a failure → the database is unreachable. `CONNECT_TIMEOUT`
  means its host is dropping packets (open port 3306 to this server's IP; on shared hosting that is the
  Remote MySQL page, which needs this server's IP allow-listed); `ECONNREFUSED` means MySQL is not
  listening, or is bound to localhost only (`bind-address`); `ER_ACCESS_DENIED_ERROR` means either the
  password is wrong **or** connections from this IP are not permitted — MySQL reports both the same way,
  and names the IP it saw; `ER_BAD_DB_ERROR` means the database name does not exist (on shared hosting it
  is prefixed, e.g. `u123456_name`).
- Neither answers → the app is hung or not running: `pm2 restart prajaride`, then read `pm2 logs`.
- Both answer but the site is still 504 → nginx is not reaching port 3000 (`pm2 status`, and the
  `proxy_pass` in `deploy/nginx.conf`).

A reachable database is not required for the public site to render: every page falls back to its
starting content, and the waits are bounded (`DATABASE_CONNECT_TIMEOUT`). `/api/db-check` answers
only to requests made on the server itself unless `DIAGNOSTICS_TOKEN` is set, because it names the
error; `/api/health` is public and reports ok/failed only.

**Updates:** `git pull && npm ci && npm run build && pm2 reload prajaride` (the image cache in `.cache/` is kept).

`npm run build` uses webpack (`next build --webpack`): Turbopack runs PostCSS/Tailwind in a helper process that it
reaches over a local socket, which Hostinger's build sandbox doesn't allow (the build fails on `globals.css`). Local
`npm run dev` still uses Turbopack.

Run **one** app process (as in `ecosystem.config.cjs`): saving in admin refreshes the cache of the process that
handled the save, so a second process would keep serving old pages. The database schema updates itself on the
first request after a deploy (`SCHEMA_VERSION`). Starter images and blog guides for an empty database and bucket:
`node --env-file=.env.production scripts/seed-content.mjs`.

*Hostinger "Node.js Web App" (hPanel) also works: build command `npm run build`, start command `npm start`, Node 22,
and the same environment variables. Keep it at one instance.*

## Local development

```bash
cp .env.example .env.local   # set the MYSQL_* settings, ADMIN_EMAIL and ADMIN_PASSWORD
npm install
npm run seed:demo            # optional: demo driver accounts (below)
npm run dev                  # http://localhost:3000/r/DRV101
```

### Local demo accounts

For local testing only. There are no default accounts in production.

| Login | URL | Credentials |
| --- | --- | --- |
| Admin | `/admin` | `ADMIN_EMAIL` / `ADMIN_PASSWORD` from your `.env.local` |
| Driver DRV101 | `/driver` | Phone `9800000001`, PIN `1111` |
| Driver DRV102 | `/driver` | Phone `9800000002`, PIN `2222` |

Running `npm run seed:demo` again resets these PINs and unlocks the accounts.

### Production accounts

- **Admin:** sign in with the `ADMIN_EMAIL` and `ADMIN_PASSWORD` environment variables on the server. Changing either one signs out every admin session. Anyone with them can see all driver data.
- **Drivers:** create each one in **Admin → Drivers → Add driver**. The phone and PIN are shown once after saving, for you to give to the driver. Don't run the demo seed against production.

## Notes

- **Before printing stickers**, make sure the QR codes point at your final domain (`NEXT_PUBLIC_SITE_URL`, see Deploy).
- **Submit buttons wait for the page to load.** In Next.js 16.4, a form submitted before the page's JavaScript loads gets a blank page back. On slow phones that's a real risk, so every submit button stays disabled until the page is ready.
- **Gregorian months.** Reward periods use Gregorian months in Nepal time. If drivers think in Bikram Sambat months, `src/lib/period.ts` is the one place to change that.
