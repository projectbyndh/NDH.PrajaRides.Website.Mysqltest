-- NepCab referral schema (PostgreSQL 13+). Generated from src/lib/schema.ts.
-- The app applies this automatically; running it by hand is optional.

CREATE TABLE IF NOT EXISTS referral_clicks (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id   VARCHAR(32)  NOT NULL,
  event_type  VARCHAR(16)  NOT NULL DEFAULT 'scan',   -- 'scan' | 'store_click'
  platform    VARCHAR(10)  NOT NULL,                  -- 'android' | 'ios' | 'desktop'
  store       VARCHAR(10),                            -- 'play' | 'appstore' (store_click only)
  visit_id    UUID,                                   -- store_click -> the scan it came from
  ip_address  VARCHAR(64),
  user_agent  TEXT,
  referrer    TEXT,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
);
-- Long-lived first-party cookie identifying the rider's browser (one referral per device).
ALTER TABLE referral_clicks ADD COLUMN IF NOT EXISTS device_id UUID;
CREATE INDEX IF NOT EXISTS referral_clicks_driver_idx  ON referral_clicks (driver_id, created_at DESC);
CREATE INDEX IF NOT EXISTS referral_clicks_created_idx ON referral_clicks (created_at DESC);
CREATE INDEX IF NOT EXISTS referral_clicks_store_idx   ON referral_clicks (event_type, created_at);

CREATE TABLE IF NOT EXISTS drivers (
  id              VARCHAR(32)  PRIMARY KEY,           -- the ID printed on the QR, e.g. DRV101
  name            TEXT         NOT NULL,
  phone           VARCHAR(10)  NOT NULL UNIQUE,       -- 10-digit Nepali mobile, used to log in
  vehicle_no      TEXT,
  vehicle_type    VARCHAR(10)  NOT NULL DEFAULT 'car', -- 'car' | 'bike' | 'other'
  pin_hash        TEXT         NOT NULL,
  active          BOOLEAN      NOT NULL DEFAULT true,
  failed_logins   INT          NOT NULL DEFAULT 0,
  locked_until    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT now()
);

ALTER TABLE drivers ADD COLUMN IF NOT EXISTS email   TEXT;
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS age     INT;
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS address TEXT;
-- Random, unguessable code used in referral links and QR codes (/r/K7QM2XPA).
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS ref_code VARCHAR(16);
CREATE UNIQUE INDEX IF NOT EXISTS drivers_ref_code_idx ON drivers (ref_code);

-- Extended driver profile (all optional except name + phone).
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS date_of_birth    DATE;
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS province         VARCHAR(40);
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS district         VARCHAR(60);
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS municipality     VARCHAR(80);
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS ward             SMALLINT;
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS emergency_name   TEXT;
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS emergency_phone  VARCHAR(10);
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS citizenship_no   VARCHAR(30);
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS license_no       VARCHAR(30);
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS license_category VARCHAR(10);  -- 'A' bike | 'B' car | 'AB' | 'other'
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS license_expiry   DATE;
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS vehicle_brand    VARCHAR(40);
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS vehicle_model    VARCHAR(40);
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS vehicle_color    VARCHAR(30);
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS vehicle_year     SMALLINT;
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS bluebook_no      VARCHAR(30);
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS bluebook_expiry  DATE;
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS insurance_expiry DATE;
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS payout_method    VARCHAR(10);  -- 'esewa' | 'khalti' | 'bank'
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS payout_account   VARCHAR(40);
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS payout_bank      VARCHAR(80);
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS sticker_given_on DATE;
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS training_done    BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS notes            TEXT;

-- "Drive with us" applications from the public website, reviewed in /admin/applications.
CREATE TABLE IF NOT EXISTS driver_applications (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name             TEXT         NOT NULL,
  phone            VARCHAR(10)  NOT NULL,
  email            TEXT,
  date_of_birth    DATE,
  district         VARCHAR(60),
  municipality     VARCHAR(80),
  ward             SMALLINT,
  vehicle_type     VARCHAR(10)  NOT NULL DEFAULT 'car',
  vehicle_no       TEXT,
  vehicle_brand    VARCHAR(40),
  license_no       VARCHAR(30),
  license_category VARCHAR(10),
  license_expiry   DATE,
  message          TEXT,
  status           VARCHAR(10)  NOT NULL DEFAULT 'pending',  -- 'pending' | 'approved' | 'rejected'
  review_note      TEXT,
  driver_id        VARCHAR(32),                              -- set when approved
  ip_address       VARCHAR(64),
  created_at       TIMESTAMPTZ  NOT NULL DEFAULT now(),
  reviewed_at      TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS driver_applications_status_idx ON driver_applications (status, created_at DESC);
-- More details from the "Drive with us" form (all optional at the database level).
ALTER TABLE driver_applications ADD COLUMN IF NOT EXISTS citizenship_no   VARCHAR(30);
ALTER TABLE driver_applications ADD COLUMN IF NOT EXISTS emergency_name   TEXT;
ALTER TABLE driver_applications ADD COLUMN IF NOT EXISTS emergency_phone  VARCHAR(10);
ALTER TABLE driver_applications ADD COLUMN IF NOT EXISTS vehicle_model    VARCHAR(40);
ALTER TABLE driver_applications ADD COLUMN IF NOT EXISTS vehicle_color    VARCHAR(30);
ALTER TABLE driver_applications ADD COLUMN IF NOT EXISTS vehicle_year     SMALLINT;
ALTER TABLE driver_applications ADD COLUMN IF NOT EXISTS ownership        VARCHAR(10);  -- 'own' | 'family' | 'other'
ALTER TABLE driver_applications ADD COLUMN IF NOT EXISTS bluebook_no      VARCHAR(30);
ALTER TABLE driver_applications ADD COLUMN IF NOT EXISTS insurance_expiry DATE;
ALTER TABLE driver_applications ADD COLUMN IF NOT EXISTS availability     VARCHAR(10);  -- 'full' | 'part' | 'weekends'

-- Photos sent with an application (vehicle, license, bluebook). Resized in the browser; admin only.
CREATE TABLE IF NOT EXISTS application_photos (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id  UUID         NOT NULL REFERENCES driver_applications (id) ON DELETE CASCADE,
  kind            VARCHAR(10)  NOT NULL,   -- 'vehicle' | 'license' | 'bluebook'
  mime            VARCHAR(30)  NOT NULL,
  data            BYTEA        NOT NULL,
  thumb           BYTEA        NOT NULL,
  width           INT          NOT NULL,
  height          INT          NOT NULL,
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS application_photos_app_idx ON application_photos (application_id);

-- Image files live in object storage (Contabo). Rows keep the storage keys; the old in-database
-- bytes stay readable for rows created before the move, and are cleared when copied to storage.
ALTER TABLE application_photos ADD COLUMN IF NOT EXISTS storage_key TEXT;
ALTER TABLE application_photos ADD COLUMN IF NOT EXISTS thumb_key   TEXT;
ALTER TABLE application_photos ALTER COLUMN data  DROP NOT NULL;
ALTER TABLE application_photos ALTER COLUMN thumb DROP NOT NULL;

-- Two-step sign-up: the website form asks only for name, mobile, address and photos. Drivers
-- approved from it fill in the rest in the driver portal (profile_complete = false until then).
ALTER TABLE driver_applications ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS profile_complete BOOLEAN NOT NULL DEFAULT true;
-- The office checks what the driver filled in before their QR code and referral link unlock.
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS verified         BOOLEAN NOT NULL DEFAULT true;

-- The website's own images (hero, service covers and galleries, page photos), one per slot,
-- managed in /admin/website-images. Files in object storage.
CREATE TABLE IF NOT EXISTS site_images (
  slot         VARCHAR(80)  PRIMARY KEY,               -- e.g. 'hero', 'service:vehicle-rental', 'service-gallery:vehicle-rental:2'
  storage_key  TEXT         NOT NULL,
  thumb_key    TEXT,
  mime         VARCHAR(30)  NOT NULL,
  width        INT          NOT NULL,
  height       INT          NOT NULL,
  alt          TEXT         NOT NULL DEFAULT '',
  version      INT          NOT NULL DEFAULT 1,         -- bumps on replace, so cached URLs change
  updated_at   TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- Messages from the public contact form, read in /admin/messages.
CREATE TABLE IF NOT EXISTS contact_messages (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT         NOT NULL,
  phone       VARCHAR(10),
  email       TEXT,
  topic       VARCHAR(20)  NOT NULL DEFAULT 'general',  -- 'general' | 'rider' | 'driver' | 'business'
  message     TEXT         NOT NULL,
  ip_address  VARCHAR(64),
  read        BOOLEAN      NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS contact_messages_created_idx ON contact_messages (created_at DESC);

-- Ride requests from the website (/nepcab). The app's dispatch belongs to NepCab head office, so
-- these go to the Butwal booking desk, which calls the customer and books the ride. /admin/bookings.
CREATE TABLE IF NOT EXISTS ride_bookings (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT         NOT NULL,
  phone         VARCHAR(10)  NOT NULL,
  pickup        TEXT         NOT NULL,
  dropoff       TEXT         NOT NULL,
  vehicle_type  VARCHAR(10)  NOT NULL DEFAULT 'car',   -- 'car' | 'bike'
  ride_at       TIMESTAMPTZ,                           -- NULL = as soon as possible
  note          TEXT,
  status        VARCHAR(12)  NOT NULL DEFAULT 'new',   -- 'new' | 'confirmed' | 'completed' | 'cancelled'
  ip_address    VARCHAR(64),
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS ride_bookings_status_idx ON ride_bookings (status, created_at DESC);
-- Two optional quick questions on the booking card, summed up in /admin/bookings (rider insights).
ALTER TABLE ride_bookings ADD COLUMN IF NOT EXISTS share_pref   VARCHAR(10);  -- 'yes' | 'maybe' | 'no'
ALTER TABLE ride_bookings ADD COLUMN IF NOT EXISTS availability VARCHAR(10);  -- 'easy' | 'sometimes' | 'hard'

-- Extra details for business, careers and support enquiries.
ALTER TABLE contact_messages ADD COLUMN IF NOT EXISTS organization TEXT;
ALTER TABLE contact_messages ADD COLUMN IF NOT EXISTS subject      TEXT;
CREATE INDEX IF NOT EXISTS contact_messages_topic_idx ON contact_messages (topic, created_at DESC);

-- Website photos (gallery and news covers). Resized in the browser before upload, so rows stay
-- small: a large WebP (max 1600px) and a thumbnail (max 640px). Served from /media/<id>.
CREATE TABLE IF NOT EXISTS photos (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  album       VARCHAR(20)  NOT NULL DEFAULT 'other',   -- gallery album, or 'news' (cover only)
  caption     TEXT         NOT NULL DEFAULT '',
  mime        VARCHAR(30)  NOT NULL,
  data        BYTEA        NOT NULL,
  thumb       BYTEA        NOT NULL,
  width       INT          NOT NULL,
  height      INT          NOT NULL,
  featured    BOOLEAN      NOT NULL DEFAULT false,      -- also shown on the home and About pages
  sort        INT          NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS photos_album_idx ON photos (album, sort, created_at DESC);
-- Optional link to a Praja Ride service (its slug), for the photos on that service's page.
ALTER TABLE photos ADD COLUMN IF NOT EXISTS service VARCHAR(30);
-- Files in object storage (see the note at application_photos); older rows keep their bytes here.
ALTER TABLE photos ADD COLUMN IF NOT EXISTS storage_key TEXT;
ALTER TABLE photos ADD COLUMN IF NOT EXISTS thumb_key   TEXT;
ALTER TABLE photos ALTER COLUMN data  DROP NOT NULL;
ALTER TABLE photos ALTER COLUMN thumb DROP NOT NULL;

-- News and offers, managed in /admin/news.
CREATE TABLE IF NOT EXISTS posts (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug          VARCHAR(90)  NOT NULL UNIQUE,
  kind          VARCHAR(10)  NOT NULL DEFAULT 'news',   -- 'news' | 'offer'
  title         TEXT         NOT NULL,
  excerpt       TEXT         NOT NULL DEFAULT '',
  body          TEXT         NOT NULL DEFAULT '',
  cover_id      UUID,
  published     BOOLEAN      NOT NULL DEFAULT false,
  published_at  TIMESTAMPTZ,
  ends_on       DATE,                                   -- offers: last valid day
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS posts_published_idx ON posts (published, published_at DESC);
-- Blog articles: a short topic shown on the card (e.g. Guides, Safety, Drivers).
ALTER TABLE posts ADD COLUMN IF NOT EXISTS topic VARCHAR(30);

-- Editable website content (one JSON document), managed in /admin/website.
CREATE TABLE IF NOT EXISTS site_settings (
  id          INT          PRIMARY KEY,
  content     JSONB        NOT NULL DEFAULT '{}'::jsonb,
  updated_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- Browsers a driver has logged into the portal from. Store taps from these never count,
-- so drivers can't earn by scanning their own QR.
CREATE TABLE IF NOT EXISTS driver_devices (
  device_id   UUID         PRIMARY KEY,
  driver_id   VARCHAR(32)  NOT NULL,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS reward_tiers (
  id          SERIAL       PRIMARY KEY,
  target      INT          NOT NULL CHECK (target > 0), -- qualified referrals in one month
  reward      TEXT         NOT NULL,                    -- what the driver sees, e.g. "Rs 500 bonus"
  amount_npr  INT          NOT NULL DEFAULT 0,          -- for payout totals
  active      BOOLEAN      NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- One row per tier a driver reached in a month. Created automatically, paid by admin.
CREATE TABLE IF NOT EXISTS driver_rewards (
  id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id   VARCHAR(32)  NOT NULL,
  period      CHAR(7)      NOT NULL,                    -- 'YYYY-MM' (Nepal time)
  tier_id     INT          NOT NULL,
  target      INT          NOT NULL,                    -- snapshot of the tier when earned
  reward      TEXT         NOT NULL,
  amount_npr  INT          NOT NULL DEFAULT 0,
  status      VARCHAR(10)  NOT NULL DEFAULT 'pending',  -- 'pending' | 'paid' | 'cancelled'
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),
  paid_at     TIMESTAMPTZ,
  UNIQUE (driver_id, period, tier_id)
);

-- Example tiers so the portal isn't empty on day one; edit them in /admin/rewards.
INSERT INTO reward_tiers (target, reward, amount_npr)
SELECT * FROM (VALUES (10, 'Rs 500 bonus', 500), (25, 'Rs 1,500 bonus', 1500), (50, 'Rs 4,000 bonus + NepCab T-shirt', 4000)) v
WHERE NOT EXISTS (SELECT 1 FROM reward_tiers);

-- Text of each Praja Ride service (name, summary, page copy, features, steps, FAQs), edited in
-- /admin/services, where services can also be added, reordered and removed. Filled with the
-- starting six on first use.
CREATE TABLE IF NOT EXISTS services (
  slug        VARCHAR(40)  PRIMARY KEY,
  sort        INT          NOT NULL DEFAULT 0,
  name        TEXT         NOT NULL,
  tag         TEXT         NOT NULL,
  summary     TEXT         NOT NULL,
  headline    TEXT         NOT NULL,
  intro       TEXT         NOT NULL,
  features    JSONB        NOT NULL DEFAULT '[]'::jsonb,   -- [{ title, text }]
  steps       JSONB        NOT NULL DEFAULT '[]'::jsonb,   -- [{ title, text }]
  faqs        JSONB        NOT NULL DEFAULT '[]'::jsonb,   -- [{ q, a }]
  whatsapp    TEXT         NOT NULL DEFAULT '',
  updated_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- Services can be created, reordered and removed in admin: icon name and options per service.
ALTER TABLE services ADD COLUMN IF NOT EXISTS icon       VARCHAR(30) NOT NULL DEFAULT 'car';
ALTER TABLE services ADD COLUMN IF NOT EXISTS via_nepcab BOOLEAN     NOT NULL DEFAULT false;  -- booked in the NepCab app
ALTER TABLE services ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now();
ALTER TABLE services ADD COLUMN IF NOT EXISTS image      VARCHAR(80);                          -- cover: a website image slot
ALTER TABLE services ADD COLUMN IF NOT EXISTS gallery    JSONB       NOT NULL DEFAULT '[]'::jsonb; -- photo slots for the service page
-- Services stored before icons/photos were editable: give them their original icon and photos
UPDATE services SET icon = CASE slug
    WHEN 'vehicle-rental' THEN 'key' WHEN 'offline-booking' THEN 'calendar-check' WHEN 'buy-sell' THEN 'handshake'
    WHEN 'charging-station' THEN 'battery' WHEN 'trial-center' THEN 'cone' ELSE icon END
  WHERE icon = 'car';
UPDATE services SET via_nepcab = true WHERE slug = 'ride-sharing' AND image IS NULL;
UPDATE services SET image = 'service-' || slug WHERE image IS NULL;
UPDATE services SET gallery = CASE slug
    WHEN 'ride-sharing'     THEN '["service-ride-sharing","hero","gallery-taxi-street","gallery-taxi-night","scooter"]'::jsonb
    WHEN 'vehicle-rental'   THEN '["service-vehicle-rental","gallery-key-handover","drivers","gallery-parked-cars"]'::jsonb
    WHEN 'offline-booking'  THEN '["service-offline-booking","gallery-office-phone","gallery-desk-call","business"]'::jsonb
    WHEN 'buy-sell'         THEN '["service-buy-sell","gallery-parked-cars","gallery-key-handover","business"]'::jsonb
    WHEN 'charging-station' THEN '["service-charging-station","gallery-ev-charger-1","gallery-ev-charger-2","gallery-ev-charger-3"]'::jsonb
    WHEN 'trial-center'     THEN '["service-trial-center","gallery-cones-1","gallery-cones-2","drivers"]'::jsonb
    ELSE gallery END
  WHERE gallery = '[]'::jsonb;

-- Website images: admins can add their own (not just the built-in slots) and name them.
ALTER TABLE site_images ADD COLUMN IF NOT EXISTS label      TEXT;
ALTER TABLE site_images ADD COLUMN IF NOT EXISTS group_name TEXT;
ALTER TABLE site_images ADD COLUMN IF NOT EXISTS custom     BOOLEAN NOT NULL DEFAULT false;

-- Page content: every editable section of every public page, as JSON (headlines, intros, cards,
-- steps, lists...). Managed in /admin/content; filled with the starting text on first use.
CREATE TABLE IF NOT EXISTS content_blocks (
  key         VARCHAR(80)  PRIMARY KEY,              -- e.g. 'home.hero', 'drive.steps'
  data        JSONB        NOT NULL,
  updated_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- Two-step sign-up: the status check now asks for the name instead of the date of birth, and
-- approved drivers complete their profile in the portal. Fix saved text that still says otherwise.
UPDATE content_blocks
  SET data = replace(data::text, 'mobile number and date of birth', 'mobile number and name')::jsonb
  WHERE key LIKE 'drive.%' AND data::text LIKE '%mobile number and date of birth%';
UPDATE content_blocks
  SET data = jsonb_set(data, '{doneText}', to_jsonb('Thank you. Our {city} team will call you within a few working days. Once you''re approved, you get your driver portal login: log in to complete your profile (documents, vehicle and payout details) and get your own referral link and QR code.'::text))
  WHERE key = 'drive.form'
    AND data->>'doneText' = 'Thank you. Our {city} team will call you within a few working days to check your documents. Once you''re approved, you get your driver ID, portal login, and your own referral link and QR code.';
