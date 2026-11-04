-- Row counts in MySQL against what the Postgres source held on 2026-11-04.
-- Run in phpMyAdmin (database u763937081_prajamysqldb) -> SQL tab.
SELECT t, rows_now, expected, IF(rows_now = expected, 'ok', 'DIFF') AS status FROM (
  SELECT 'application_photos'    t, COUNT(*) rows_now,  48 expected FROM application_photos
  UNION ALL SELECT 'contact_messages',      COUNT(*),    2 FROM contact_messages
  UNION ALL SELECT 'content_blocks',        COUNT(*),   74 FROM content_blocks
  UNION ALL SELECT 'driver_applications',   COUNT(*),   19 FROM driver_applications
  UNION ALL SELECT 'driver_devices',        COUNT(*),    9 FROM driver_devices
  UNION ALL SELECT 'driver_rewards',        COUNT(*),    0 FROM driver_rewards
  UNION ALL SELECT 'driver_vehicle_photos', COUNT(*),    2 FROM driver_vehicle_photos
  UNION ALL SELECT 'drivers',               COUNT(*),    9 FROM drivers
  UNION ALL SELECT 'photos',                COUNT(*),   11 FROM photos
  UNION ALL SELECT 'posts',                 COUNT(*),    4 FROM posts
  UNION ALL SELECT 'referral_clicks',       COUNT(*),  123 FROM referral_clicks
  UNION ALL SELECT 'reward_tiers',          COUNT(*),    3 FROM reward_tiers
  UNION ALL SELECT 'ride_bookings',         COUNT(*),    4 FROM ride_bookings
  UNION ALL SELECT 'schema_meta',           COUNT(*),    1 FROM schema_meta
  UNION ALL SELECT 'services',              COUNT(*),    5 FROM services
  UNION ALL SELECT 'site_images',           COUNT(*),   62 FROM site_images
  UNION ALL SELECT 'site_settings',         COUNT(*),    1 FROM site_settings
) x ORDER BY status DESC, t;
