// Applied automatically when the database is behind SCHEMA_VERSION (idempotent).
// Bump SCHEMA_VERSION whenever SCHEMA changes, so existing databases pick it up.
// Keep db/schema.mysql.sql in sync — regenerate it with: npm run schema
//
// MySQL 8.0 / MariaDB 10.4+. How the types were chosen, and why:
//   UUID        -> CHAR(36)     the app generates text UUIDs (crypto.randomUUID), and CHAR(36)
//                               keeps them readable in phpMyAdmin and comparable without a function
//   TIMESTAMPTZ -> DATETIME(3)  always UTC. MySQL's TIMESTAMP would convert on the way in and out
//                               (session time zone) and stops at 2038; DATETIME does neither, and
//                               the pool runs in UTC (timezone "Z" in lib/mysql.ts)
//   BOOLEAN     -> TINYINT(1)   1 = true, 0 = false; read back through bool() in lib/mysql.ts
//   BYTEA       -> LONGBLOB     image bytes of rows made before the move to object storage
//   JSONB       -> JSON         no DEFAULT: MySQL cannot default a JSON column portably, so every
//                               INSERT passes a value. lib/ always does
//   TEXT NOT NULL DEFAULT ''    MySQL refuses a DEFAULT on TEXT/BLOB, so the short ones are VARCHAR
//                               with the same default; posts.body stays MEDIUMTEXT with no default
//
// Statements are split on ";" at end of line and run one at a time, so no statement may contain a
// semicolon inside a string literal.
export const SCHEMA_VERSION = 18;

export const SCHEMA = `
CREATE TABLE IF NOT EXISTS \`referral_clicks\` (
  \`id\`          CHAR(36)     NOT NULL,
  \`driver_id\`   VARCHAR(32)  NOT NULL,
  \`event_type\`  VARCHAR(16)  NOT NULL DEFAULT 'scan',
  \`platform\`    VARCHAR(10)  NOT NULL,
  \`store\`       VARCHAR(10)      NULL,
  \`visit_id\`    CHAR(36)         NULL,
  \`ip_address\`  VARCHAR(64)      NULL,
  \`user_agent\`  TEXT             NULL,
  \`referrer\`    TEXT             NULL,
  \`created_at\`  DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  \`device_id\`   CHAR(36)         NULL,
  PRIMARY KEY (\`id\`),
  KEY \`referral_clicks_driver_idx\`  (\`driver_id\`, \`created_at\`),
  KEY \`referral_clicks_created_idx\` (\`created_at\`),
  KEY \`referral_clicks_store_idx\`   (\`event_type\`, \`created_at\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS \`drivers\` (
  \`id\`                VARCHAR(32)  NOT NULL,
  \`name\`              TEXT         NOT NULL,
  \`phone\`             VARCHAR(10)  NOT NULL,
  \`vehicle_no\`        TEXT             NULL,
  \`vehicle_type\`      VARCHAR(10)  NOT NULL DEFAULT 'car',
  \`pin_hash\`          TEXT         NOT NULL,
  \`active\`            TINYINT(1)   NOT NULL DEFAULT 1,
  \`failed_logins\`     INT          NOT NULL DEFAULT 0,
  \`locked_until\`      DATETIME(3)      NULL,
  \`created_at\`        DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  \`email\`             TEXT             NULL,
  \`age\`               INT              NULL,
  \`address\`           TEXT             NULL,
  \`ref_code\`          VARCHAR(16)      NULL,
  \`date_of_birth\`     DATE             NULL,
  \`province\`          VARCHAR(40)      NULL,
  \`district\`          VARCHAR(60)      NULL,
  \`municipality\`      VARCHAR(80)      NULL,
  \`ward\`              SMALLINT         NULL,
  \`emergency_name\`    TEXT             NULL,
  \`emergency_phone\`   VARCHAR(10)      NULL,
  \`citizenship_no\`    VARCHAR(30)      NULL,
  \`license_no\`        VARCHAR(30)      NULL,
  \`license_category\`  VARCHAR(10)      NULL,
  \`license_expiry\`    DATE             NULL,
  \`vehicle_brand\`     VARCHAR(40)      NULL,
  \`vehicle_model\`     VARCHAR(40)      NULL,
  \`vehicle_color\`     VARCHAR(30)      NULL,
  \`vehicle_year\`      SMALLINT         NULL,
  \`bluebook_no\`       VARCHAR(30)      NULL,
  \`bluebook_expiry\`   DATE             NULL,
  \`insurance_expiry\`  DATE             NULL,
  \`payout_method\`     VARCHAR(10)      NULL,
  \`payout_account\`    VARCHAR(40)      NULL,
  \`payout_bank\`       VARCHAR(80)      NULL,
  \`sticker_given_on\`  DATE             NULL,
  \`training_done\`     TINYINT(1)   NOT NULL DEFAULT 0,
  \`notes\`             TEXT             NULL,
  \`profile_complete\`  TINYINT(1)   NOT NULL DEFAULT 1,
  \`verified\`          TINYINT(1)   NOT NULL DEFAULT 1,
  \`photo_key\`         TEXT             NULL,
  \`photo_thumb_key\`   TEXT             NULL,
  \`pin_enc\`           TEXT             NULL,
  \`license_photo_key\` TEXT             NULL,
  \`license_photo_thumb_key\` TEXT       NULL,
  \`profile_full\`      TINYINT(1)   NOT NULL DEFAULT 0,
  PRIMARY KEY (\`id\`),
  UNIQUE KEY \`drivers_phone_key\`    (\`phone\`),
  UNIQUE KEY \`drivers_ref_code_idx\` (\`ref_code\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS \`driver_applications\` (
  \`id\`                CHAR(36)     NOT NULL,
  \`name\`              TEXT         NOT NULL,
  \`phone\`             VARCHAR(10)  NOT NULL,
  \`email\`             TEXT             NULL,
  \`date_of_birth\`     DATE             NULL,
  \`district\`          VARCHAR(60)      NULL,
  \`municipality\`      VARCHAR(80)      NULL,
  \`ward\`              SMALLINT         NULL,
  \`vehicle_type\`      VARCHAR(10)  NOT NULL DEFAULT 'car',
  \`vehicle_no\`        TEXT             NULL,
  \`vehicle_brand\`     VARCHAR(40)      NULL,
  \`license_no\`        VARCHAR(30)      NULL,
  \`license_category\`  VARCHAR(10)      NULL,
  \`license_expiry\`    DATE             NULL,
  \`message\`           TEXT             NULL,
  \`status\`            VARCHAR(10)  NOT NULL DEFAULT 'pending',
  \`review_note\`       TEXT             NULL,
  \`driver_id\`         VARCHAR(32)      NULL,
  \`ip_address\`        VARCHAR(64)      NULL,
  \`created_at\`        DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  \`reviewed_at\`       DATETIME(3)      NULL,
  \`citizenship_no\`    VARCHAR(30)      NULL,
  \`emergency_name\`    TEXT             NULL,
  \`emergency_phone\`   VARCHAR(10)      NULL,
  \`vehicle_model\`     VARCHAR(40)      NULL,
  \`vehicle_color\`     VARCHAR(30)      NULL,
  \`vehicle_year\`      SMALLINT         NULL,
  \`ownership\`         VARCHAR(10)      NULL,
  \`bluebook_no\`       VARCHAR(30)      NULL,
  \`insurance_expiry\`  DATE             NULL,
  \`availability\`      VARCHAR(10)      NULL,
  \`address\`           TEXT             NULL,
  PRIMARY KEY (\`id\`),
  KEY \`driver_applications_status_idx\` (\`status\`, \`created_at\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS \`application_photos\` (
  \`id\`              CHAR(36)     NOT NULL,
  \`application_id\`  CHAR(36)     NOT NULL,
  \`kind\`            VARCHAR(10)  NOT NULL,
  \`mime\`            VARCHAR(30)  NOT NULL,
  \`data\`            LONGBLOB         NULL,
  \`thumb\`           LONGBLOB         NULL,
  \`width\`           INT          NOT NULL,
  \`height\`          INT          NOT NULL,
  \`created_at\`      DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  \`storage_key\`     TEXT             NULL,
  \`thumb_key\`       TEXT             NULL,
  PRIMARY KEY (\`id\`),
  KEY \`application_photos_app_idx\` (\`application_id\`),
  CONSTRAINT \`application_photos_application_id_fkey\`
    FOREIGN KEY (\`application_id\`) REFERENCES \`driver_applications\` (\`id\`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS \`driver_vehicle_photos\` (
  \`id\`           CHAR(36)     NOT NULL,
  \`driver_id\`    VARCHAR(32)  NOT NULL,
  \`storage_key\`  TEXT         NOT NULL,
  \`thumb_key\`    TEXT         NOT NULL,
  \`mime\`         VARCHAR(30)  NOT NULL,
  \`sort\`         INT          NOT NULL DEFAULT 0,
  \`created_at\`   DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (\`id\`),
  KEY \`driver_vehicle_photos_driver_idx\` (\`driver_id\`, \`sort\`, \`created_at\`),
  CONSTRAINT \`driver_vehicle_photos_driver_id_fkey\`
    FOREIGN KEY (\`driver_id\`) REFERENCES \`drivers\` (\`id\`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS \`site_images\` (
  \`slot\`         VARCHAR(80)   NOT NULL,
  \`storage_key\`  TEXT          NOT NULL,
  \`thumb_key\`    TEXT              NULL,
  \`mime\`         VARCHAR(30)   NOT NULL,
  \`width\`        INT           NOT NULL,
  \`height\`       INT           NOT NULL,
  \`alt\`          VARCHAR(1000) NOT NULL DEFAULT '',
  \`version\`      INT           NOT NULL DEFAULT 1,
  \`updated_at\`   DATETIME(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  \`label\`        TEXT              NULL,
  \`group_name\`   TEXT              NULL,
  \`custom\`       TINYINT(1)    NOT NULL DEFAULT 0,
  PRIMARY KEY (\`slot\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS \`contact_messages\` (
  \`id\`            CHAR(36)     NOT NULL,
  \`name\`          TEXT         NOT NULL,
  \`phone\`         VARCHAR(10)      NULL,
  \`email\`         TEXT             NULL,
  \`topic\`         VARCHAR(20)  NOT NULL DEFAULT 'general',
  \`message\`       TEXT         NOT NULL,
  \`ip_address\`    VARCHAR(64)      NULL,
  \`read\`          TINYINT(1)   NOT NULL DEFAULT 0,
  \`created_at\`    DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  \`organization\`  TEXT             NULL,
  \`subject\`       TEXT             NULL,
  PRIMARY KEY (\`id\`),
  KEY \`contact_messages_created_idx\` (\`created_at\`),
  KEY \`contact_messages_topic_idx\`   (\`topic\`, \`created_at\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS \`ride_bookings\` (
  \`id\`            CHAR(36)     NOT NULL,
  \`name\`          TEXT         NOT NULL,
  \`phone\`         VARCHAR(10)  NOT NULL,
  \`pickup\`        TEXT         NOT NULL,
  \`dropoff\`       TEXT         NOT NULL,
  \`vehicle_type\`  VARCHAR(10)  NOT NULL DEFAULT 'car',
  \`ride_at\`       DATETIME(3)      NULL,
  \`note\`          TEXT             NULL,
  \`status\`        VARCHAR(12)  NOT NULL DEFAULT 'new',
  \`ip_address\`    VARCHAR(64)      NULL,
  \`created_at\`    DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  \`updated_at\`    DATETIME(3)      NULL,
  \`share_pref\`    VARCHAR(10)      NULL,
  \`availability\`  VARCHAR(10)      NULL,
  PRIMARY KEY (\`id\`),
  KEY \`ride_bookings_status_idx\` (\`status\`, \`created_at\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS \`photos\` (
  \`id\`           CHAR(36)      NOT NULL,
  \`album\`        VARCHAR(20)   NOT NULL DEFAULT 'other',
  \`caption\`      VARCHAR(1000) NOT NULL DEFAULT '',
  \`mime\`         VARCHAR(30)   NOT NULL,
  \`data\`         LONGBLOB          NULL,
  \`thumb\`        LONGBLOB          NULL,
  \`width\`        INT           NOT NULL,
  \`height\`       INT           NOT NULL,
  \`featured\`     TINYINT(1)    NOT NULL DEFAULT 0,
  \`sort\`         INT           NOT NULL DEFAULT 0,
  \`created_at\`   DATETIME(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  \`service\`      VARCHAR(30)       NULL,
  \`storage_key\`  TEXT              NULL,
  \`thumb_key\`    TEXT              NULL,
  PRIMARY KEY (\`id\`),
  KEY \`photos_album_idx\` (\`album\`, \`sort\`, \`created_at\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS \`posts\` (
  \`id\`            CHAR(36)      NOT NULL,
  \`slug\`          VARCHAR(90)   NOT NULL,
  \`kind\`          VARCHAR(10)   NOT NULL DEFAULT 'news',
  \`title\`         TEXT          NOT NULL,
  \`excerpt\`       VARCHAR(2000) NOT NULL DEFAULT '',
  \`body\`          MEDIUMTEXT    NOT NULL,
  \`cover_id\`      CHAR(36)          NULL,
  \`published\`     TINYINT(1)    NOT NULL DEFAULT 0,
  \`published_at\`  DATETIME(3)       NULL,
  \`ends_on\`       DATE              NULL,
  \`created_at\`    DATETIME(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  \`updated_at\`    DATETIME(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  \`topic\`         VARCHAR(30)       NULL,
  PRIMARY KEY (\`id\`),
  UNIQUE KEY \`posts_slug_key\` (\`slug\`),
  KEY \`posts_published_idx\` (\`published\`, \`published_at\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS \`site_settings\` (
  \`id\`          INT          NOT NULL,
  \`content\`     JSON         NOT NULL,
  \`updated_at\`  DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (\`id\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS \`driver_devices\` (
  \`device_id\`   CHAR(36)     NOT NULL,
  \`driver_id\`   VARCHAR(32)  NOT NULL,
  \`created_at\`  DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (\`device_id\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS \`reward_tiers\` (
  \`id\`          INT          NOT NULL AUTO_INCREMENT,
  \`target\`      INT          NOT NULL,
  \`reward\`      TEXT         NOT NULL,
  \`amount_npr\`  INT          NOT NULL DEFAULT 0,
  \`active\`      TINYINT(1)   NOT NULL DEFAULT 1,
  \`created_at\`  DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (\`id\`),
  CONSTRAINT \`reward_tiers_target_check\` CHECK (\`target\` > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS \`driver_rewards\` (
  \`id\`          CHAR(36)     NOT NULL,
  \`driver_id\`   VARCHAR(32)  NOT NULL,
  \`period\`      CHAR(7)      NOT NULL,
  \`tier_id\`     INT          NOT NULL,
  \`target\`      INT          NOT NULL,
  \`reward\`      TEXT         NOT NULL,
  \`amount_npr\`  INT          NOT NULL DEFAULT 0,
  \`status\`      VARCHAR(10)  NOT NULL DEFAULT 'pending',
  \`created_at\`  DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  \`paid_at\`     DATETIME(3)      NULL,
  PRIMARY KEY (\`id\`),
  UNIQUE KEY \`driver_rewards_driver_period_tier_key\` (\`driver_id\`, \`period\`, \`tier_id\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS \`services\` (
  \`slug\`        VARCHAR(40)  NOT NULL,
  \`sort\`        INT          NOT NULL DEFAULT 0,
  \`name\`        TEXT         NOT NULL,
  \`tag\`         TEXT         NOT NULL,
  \`summary\`     TEXT         NOT NULL,
  \`headline\`    TEXT         NOT NULL,
  \`intro\`       TEXT         NOT NULL,
  \`features\`    JSON         NOT NULL,
  \`steps\`       JSON         NOT NULL,
  \`faqs\`        JSON         NOT NULL,
  \`whatsapp\`    VARCHAR(1000) NOT NULL DEFAULT '',
  \`updated_at\`  DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  \`icon\`        VARCHAR(30)  NOT NULL DEFAULT 'car',
  \`via_nepcab\`  TINYINT(1)   NOT NULL DEFAULT 0,
  \`created_at\`  DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  \`image\`       VARCHAR(80)      NULL,
  \`gallery\`     JSON         NOT NULL,
  PRIMARY KEY (\`slug\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS \`content_blocks\` (
  \`key\`         VARCHAR(80)  NOT NULL,
  \`data\`        JSON         NOT NULL,
  \`updated_at\`  DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (\`key\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS \`schema_meta\` (
  \`id\`       INT NOT NULL,
  \`version\`  INT NOT NULL,
  PRIMARY KEY (\`id\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
`;

/** The schema as single statements: MySQL runs one per round trip (no multipleStatements). */
export function schemaStatements(): string[] {
  return SCHEMA.split(/;\s*$/m)
    .map((s) =>
      s
        .split("\n")
        .filter((line) => !/^\s*--/.test(line))
        .join("\n")
        .trim(),
    )
    .filter(Boolean);
}

/** Example tiers so the driver portal is not empty on day one; edited in /admin/rewards. */
export const STARTING_TIERS: { target: number; reward: string; amount_npr: number }[] = [
  { target: 10, reward: "Rs 500 bonus", amount_npr: 500 },
  { target: 25, reward: "Rs 1,500 bonus", amount_npr: 1500 },
  { target: 50, reward: "Rs 4,000 bonus + NepCab T-shirt", amount_npr: 4000 },
];
