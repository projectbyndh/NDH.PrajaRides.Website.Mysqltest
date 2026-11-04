// Photos used across the public website. Every one is a "slot": the file lives in object storage
// (Contabo) and its record in the database (site_images), served at /media/site/<slot>.
// Replace any of them in admin → Website images; the page code never changes.
//
// `seed` is the free Unsplash photo (unsplash.com/license) each slot started with; it is only used
// once, by `npm run seed:images`, to fill an empty bucket. Keep the alt text accurate.

export type SiteImage = { src: string; alt: string };

/** `fallback`: a file in /public served while the slot is still empty, so the image never breaks. */
export type SiteImageSlot = { slot: string; label: string; group: string; alt: string; seed: string; fallback?: string };

export const SITE_IMAGE_SLOTS: SiteImageSlot[] = [
  // Brand: the official Praja Ride logo (header, footer, press kit, Google). Use a square image.
  { slot: "logo", group: "Brand", label: "Praja Ride logo", alt: "Praja Ride Pvt. Ltd. logo", seed: "", fallback: "/brand/praja-ride-logo.png" },

  // Page photos
  { slot: "hero", group: "Pages", label: "Home hero", alt: "A smiling passenger riding with a driver", seed: "photo-1773063449875-332dff62b6e3" },
  { slot: "riders", group: "Pages", label: "Riders", alt: "A passenger's view from an auto-rickshaw on a busy street", seed: "photo-1546554673-384fa6394fbf" },
  { slot: "drivers", group: "Pages", label: "Drivers", alt: "A woman driving a car", seed: "photo-1527593167147-e9c94a5883e6" },
  { slot: "business", group: "Pages", label: "For business", alt: "Two business partners shaking hands", seed: "photo-1752159400890-d906038f1b35" },
  { slot: "city", group: "Pages", label: "City / About", alt: "A busy street in Nepal with cars, bikes and scooters", seed: "photo-1723670123196-380f832172f4" },
  { slot: "support", group: "Pages", label: "Support desk", alt: "Support team members on a call", seed: "photo-1626863905121-3b0c0ed7b94c" },
  { slot: "scooter", group: "Pages", label: "Scooter in traffic", alt: "A scooter rider moving through city traffic", seed: "photo-1750635409988-a913186eecf4" },

  // One cover per service
  { slot: "service-ride-sharing", group: "Service covers", label: "Ride Sharing", alt: "A driver at the wheel of a car", seed: "photo-1516862523118-a3724eb136d7" },
  { slot: "service-vehicle-rental", group: "Service covers", label: "Vehicle Rental", alt: "Car keys being handed over", seed: "photo-1761014586544-53fe5e1f1e25" },
  { slot: "service-offline-booking", group: "Service covers", label: "Offline Booking", alt: "Booking desk team on a call, wearing headsets", seed: "photo-1626863905121-3b0c0ed7b94c" },
  { slot: "service-buy-sell", group: "Service covers", label: "Buy & Sell", alt: "A row of used vehicles parked outside a dealership", seed: "photo-1697652169110-558fd666a520" },
  { slot: "service-charging-station", group: "Service covers", label: "Charging Station", alt: "An electric car plugged into a charger", seed: "photo-1615829386703-e2bb66a7cb7d" },
  { slot: "service-trial-center", group: "Service covers", label: "Trial Center", alt: "A driving trial on a practice track with traffic cones", seed: "photo-1630406144797-821be1f35d75" },

  // Extra photos for the service pages (shown until photos are tagged with the service in Gallery)
  { slot: "gallery-taxi-street", group: "Service photos", label: "Taxi on a city street", alt: "A taxi driving down a busy city street", seed: "photo-1758904551936-a9ad1e9384da" },
  { slot: "gallery-taxi-night", group: "Service photos", label: "Getting into a car at night", alt: "A passenger getting into a car at night", seed: "photo-1777128248968-762739f9b7bd" },
  { slot: "gallery-key-handover", group: "Service photos", label: "Key handover", alt: "A car key being handed to a customer", seed: "photo-1727893512947-8bdc773ceb02" },
  { slot: "gallery-parked-cars", group: "Service photos", label: "Parked cars", alt: "A row of cars parked in a lot", seed: "photo-1630165356623-266076eaceb6" },
  { slot: "gallery-office-phone", group: "Service photos", label: "Office phone", alt: "A smiling woman using her phone in an office", seed: "photo-1758876201729-e60eaf5f9194" },
  { slot: "gallery-desk-call", group: "Service photos", label: "Desk call", alt: "A woman talking on the phone while working at a desk", seed: "photo-1758611974917-f7f7a58b74b0" },
  { slot: "gallery-ev-charger-1", group: "Service photos", label: "EV charger 1", alt: "An electric vehicle charging station with the cable plugged in", seed: "photo-1744973179090-73ec820176e9" },
  { slot: "gallery-ev-charger-2", group: "Service photos", label: "EV charger 2", alt: "An electric car being charged at a charging station", seed: "photo-1692061157268-b128a8f37d6d" },
  { slot: "gallery-ev-charger-3", group: "Service photos", label: "EV charger 3", alt: "An electric car plugged in to a charging station", seed: "photo-1738101001581-1f28116278f8" },
  { slot: "gallery-cones-1", group: "Service photos", label: "Practice cones 1", alt: "Parking cones set out on a practice lot", seed: "photo-1572881243605-74a3eaa5a588" },
  { slot: "gallery-cones-2", group: "Service photos", label: "Practice cones 2", alt: "A traffic cone in the middle of a parking lot", seed: "photo-1698993401250-3294c8bf8048" },
];

export const isSiteImageSlot = (slot: string) => SITE_IMAGE_SLOTS.some((s) => s.slot === slot);

const img = (slot: string): SiteImage => {
  const s = SITE_IMAGE_SLOTS.find((x) => x.slot === slot);
  if (!s) throw new Error(`Unknown site image slot: ${slot}`);
  return { src: `/media/site/${slot}`, alt: s.alt };
};

/** The photo in a slot chosen in admin (built-in or added in admin → Website images); null if empty. */
export const siteImage = (slot: string | null | undefined): SiteImage | null =>
  slot ? { src: `/media/site/${slot}`, alt: SITE_IMAGE_SLOTS.find((x) => x.slot === slot)?.alt ?? "" } : null;

/** The official logo, managed in admin → Website images → Brand. */
export const LOGO: SiteImage = img("logo");

/** One photo per service, keyed by the service slug. */
export const SERVICE_IMAGES: Record<string, SiteImage> = {
  "ride-sharing": img("service-ride-sharing"),
  "vehicle-rental": img("service-vehicle-rental"),
  "offline-booking": img("service-offline-booking"),
  "buy-sell": img("service-buy-sell"),
  "charging-station": img("service-charging-station"),
  "trial-center": img("service-trial-center"),
};

/** Other photos, by where they appear. */
export const IMAGES = {
  hero: img("hero"),
  riders: img("riders"),
  drivers: img("drivers"),
  business: img("business"),
  city: img("city"),
  support: img("support"),
  scooter: img("scooter"),
} satisfies Record<string, SiteImage>;

/** Photos for each service page (until photos are tagged with the service in admin → Gallery). */
export const SERVICE_GALLERY: Record<string, SiteImage[]> = {
  "ride-sharing": [SERVICE_IMAGES["ride-sharing"], IMAGES.hero, img("gallery-taxi-street"), img("gallery-taxi-night"), IMAGES.scooter],
  "vehicle-rental": [SERVICE_IMAGES["vehicle-rental"], img("gallery-key-handover"), IMAGES.drivers, img("gallery-parked-cars")],
  "offline-booking": [SERVICE_IMAGES["offline-booking"], img("gallery-office-phone"), img("gallery-desk-call"), IMAGES.business],
  "buy-sell": [SERVICE_IMAGES["buy-sell"], img("gallery-parked-cars"), img("gallery-key-handover"), IMAGES.business],
  "charging-station": [SERVICE_IMAGES["charging-station"], img("gallery-ev-charger-1"), img("gallery-ev-charger-2"), img("gallery-ev-charger-3")],
  "trial-center": [SERVICE_IMAGES["trial-center"], img("gallery-cones-1"), img("gallery-cones-2"), IMAGES.drivers],
};
