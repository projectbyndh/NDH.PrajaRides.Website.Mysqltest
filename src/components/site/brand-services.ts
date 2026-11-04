import { BatteryCharging, CalendarCheck, Car, Handshake, KeyRound, TrafficCone } from "lucide-react";
import { BRAND } from "@/lib/config";
import { iconFor } from "@/lib/icons";
import { siteImage, type SiteImage } from "@/lib/site-images";

// Every service Praja Ride runs, under one brand. This list holds each service's slug, icon and
// STARTING text: the live text lives in the database (services table, edited in /admin/services)
// and is read with getServices() in src/lib/services.ts. Only ride sharing is NepCab's (the app).

type Icon = typeof Car;

export type BrandService = {
  slug: string;
  /** Plain service name, used everywhere: "Vehicle Rental". */
  name: string;
  /** Short label under the Praja Ride logo (signage, cards, page hero): "RENTALS". */
  tag: string;
  icon: Icon;
  /** One line for cards and menus. */
  summary: string;
  /** Page hero headline. */
  headline: string;
  /** Page hero paragraph. */
  intro: string;
  /** What you get. */
  features: { title: string; text: string }[];
  /** How it works, in order. */
  steps: { title: string; text: string }[];
  faqs: { q: string; a: string }[];
  /** Pre-filled WhatsApp message for this service. */
  whatsapp: string;
  /** Set for the one service that runs on a partner's app. */
  poweredBy?: { name: string; href: string };
};

export const PRAJA_SERVICES: BrandService[] = [
  {
    slug: "ride-sharing",
    name: "Ride Sharing",
    tag: "Rides",
    icon: Car,
    summary: `Cars and bikes on demand across ${BRAND.serviceArea}, booked in the NepCab app.`,
    headline: "A ride whenever you need one",
    intro: `Book everyday rides, shared pools, intercity trips and electric rides across ${BRAND.serviceArea}. Ride sharing runs on the NepCab app; Praja Ride runs it on the ground in ${BRAND.city}.`,
    features: [
      { title: "Cars and bikes", text: "Pick the vehicle that suits the trip and your budget." },
      { title: "Pool and intercity", text: "Share a ride, or travel between Butwal and Bhairahawa." },
      { title: "Checked local drivers", text: "We check every driver partner's documents before they start." },
    ],
    steps: [
      { title: "Get the NepCab app", text: "Free on Google Play and the App Store." },
      { title: "Set pickup and drop-off", text: "Choose a ride type and confirm." },
      { title: "Ride", text: "A local driver partner picks you up." },
    ],
    faqs: [
      { q: "Do I need the app?", a: "The app is quickest, but you can also book by phone, WhatsApp or at our office (see Offline Booking)." },
      { q: "Why does it say NepCab?", a: `NepCab is the ride-hailing app. ${BRAND.company} is its official franchise in ${BRAND.city} and runs the service here.` },
    ],
    whatsapp: "Hello Praja Ride, I'd like to book a ride.\nPickup: \nDrop-off: \nTime: ",
    poweredBy: { name: "NepCab", href: "/nepcab" },
  },
  {
    slug: "vehicle-rental",
    name: "Vehicle Rental",
    tag: "Rentals",
    icon: KeyRound,
    summary: "Hire a car or bike by the hour, day or trip, with or without a driver.",
    headline: "Rent a vehicle, your way",
    intro: "Weddings, family trips, office visits or a day of errands: hire a vehicle from Praja Ride for as long as you need it.",
    features: [
      { title: "Hourly, daily or per trip", text: "Pay for the time or the trip that fits your plan." },
      { title: "With a driver", text: "Sit back while one of our checked drivers takes you." },
      { title: "Clean, insured vehicles", text: "Every vehicle is checked before it goes out." },
    ],
    steps: [
      { title: "Tell us your plan", text: "Dates, places and the kind of vehicle you need." },
      { title: "Get a price", text: "We confirm the vehicle and the rate before you book." },
      { title: "Pick up or get picked up", text: "Collect from our office, or we bring it to you." },
    ],
    faqs: [
      { q: "How much does a rental cost?", a: "It depends on the vehicle, the time and the distance. Call or WhatsApp us and we'll quote you before you book." },
      { q: "What documents do I need?", a: "To drive yourself you need a valid driving licence and citizenship or another photo ID. With a driver, just your ID." },
    ],
    whatsapp: "Hello Praja Ride, I'd like to rent a vehicle.\nVehicle (car/bike): \nFrom date: \nTo date: \nWith driver? ",
  },
  {
    slug: "offline-booking",
    name: "Offline Booking",
    tag: "Booking Desk",
    icon: CalendarCheck,
    summary: "No app needed: book any service by phone, WhatsApp or at our office.",
    headline: "Book without a smartphone",
    intro: `Call, WhatsApp or walk in at our office in Tilottama-5, ${BRAND.city}. Our booking desk arranges rides, rentals, charging slots and trial practice for you.`,
    features: [
      { title: "Call", text: "Tell us what you need; we book it and call you back to confirm." },
      { title: "WhatsApp", text: "Send a message any time; we reply with your booking." },
      { title: "Walk in", text: "Visit our office and book on the spot." },
    ],
    steps: [
      { title: "Contact the booking desk", text: "By phone, WhatsApp or in person." },
      { title: "Share the details", text: "Service, place, date and time." },
      { title: "Get a confirmation", text: "We confirm by phone or SMS." },
    ],
    faqs: [
      { q: "Can I book for someone else?", a: "Yes. Give us their name and phone number and we'll coordinate with them." },
      { q: "Is offline booking more expensive?", a: "No. You pay the same as booking in the app." },
    ],
    whatsapp: "Hello Praja Ride, I'd like to make a booking.\nService: \nPlace: \nDate and time: ",
  },
  {
    slug: "buy-sell",
    name: "Buy & Sell",
    tag: "Buy & Sell",
    icon: Handshake,
    summary: "Buy or sell a used car or bike through a local team you can trust.",
    headline: "Buy and sell vehicles with confidence",
    intro: `Selling your vehicle or looking for a good used one? Praja Ride connects buyers and sellers in ${BRAND.city}, checks the vehicle and its papers, and helps with the transfer.`,
    features: [
      { title: "Checked vehicles", text: "We inspect the vehicle and its papers before listing." },
      { title: "Fair price guidance", text: "We help both sides agree on a fair market price." },
      { title: "Paperwork help", text: "Ownership transfer and bluebook support." },
    ],
    steps: [
      { title: "Tell us what you have or want", text: "Make, model, year and budget." },
      { title: "We check and match", text: "We inspect and connect you with a buyer or seller." },
      { title: "Close the deal", text: "Meet at our office and complete the transfer." },
    ],
    faqs: [
      { q: "Which vehicles do you deal in?", a: "Used cars, bikes and scooters, including electric vehicles." },
      { q: "Can driver partners buy a vehicle to drive with us?", a: "Yes. Tell us and we'll help you find a vehicle that suits ride sharing." },
    ],
    whatsapp: "Hello Praja Ride, I'd like to buy / sell a vehicle.\nBuy or sell: \nVehicle: \nBudget / asking price: ",
  },
  {
    slug: "charging-station",
    name: "Charging Station",
    tag: "Charge",
    icon: BatteryCharging,
    summary: "Charge your electric car, bike or scooter at the Praja Ride station.",
    headline: "Charge your EV with Praja Ride",
    intro: `Electric vehicles are growing in ${BRAND.city}. Charge your car, bike or scooter at the Praja Ride charging station while you wait or run errands nearby.`,
    features: [
      { title: "Cars, bikes and scooters", text: "Charging for the common electric vehicles in Nepal." },
      { title: "Book a slot", text: "Call or WhatsApp to reserve a time and skip the wait." },
      { title: "Driver partner rates", text: "Special rates for Praja Ride driver partners." },
    ],
    steps: [
      { title: "Book or drive in", text: "Reserve a slot, or come by and check availability." },
      { title: "Plug in", text: "Our staff help you connect." },
      { title: "Pay and go", text: "Pay in cash, eSewa or Khalti." },
    ],
    faqs: [
      { q: "Where is the charging station?", a: `At our office in Tilottama-5, ${BRAND.city}. Call us for directions.` },
      { q: "How much does charging cost?", a: "Charging is billed per unit used. Call or WhatsApp us for today's rate." },
    ],
    whatsapp: "Hello Praja Ride, I'd like to book a charging slot.\nVehicle: \nDate and time: ",
  },
  {
    slug: "trial-center",
    name: "Trial Center",
    tag: "Trial Center",
    icon: TrafficCone,
    summary: "Practise on a trial track and get ready for your driving licence test.",
    headline: "Pass your driving trial, first time",
    intro: `Get ready for your driving licence trial at the Praja Ride Trial Center: practise on a track laid out like the official test, with trainers to guide you.`,
    features: [
      { title: "Test-style track", text: "Practise the same layout you'll face in the licence trial." },
      { title: "Bike and car", text: "Practice sessions for two-wheelers and four-wheelers." },
      { title: "Friendly trainers", text: "Get tips on the moves people most often fail." },
    ],
    steps: [
      { title: "Book a session", text: "Choose bike or car, a date and a time." },
      { title: "Practise", text: "Train on the track with a trainer." },
      { title: "Take your trial", text: "Go into your licence test confident." },
    ],
    faqs: [
      { q: "Do I need my own vehicle?", a: "No. You can practise on our vehicle, or bring your own." },
      { q: "How many sessions do I need?", a: "It depends on your experience. Most people are ready after a few sessions; your trainer will tell you." },
    ],
    whatsapp: "Hello Praja Ride, I'd like to book a trial practice session.\nBike or car: \nPreferred date and time: ",
  },
];

export const serviceHref = (s: { slug: string }) => `/services/${s.slug}`;

/** A service as stored in the database and passed to the browser: icon by name, photos by slot. */
export type ServiceData = Omit<BrandService, "icon"> & {
  iconName: string;
  /** Cover photo: a website image slot. */
  image: string | null;
  /** Photos for the service page: website image slots. */
  gallery: string[];
};

/** Starting icon names for the built-in services (see src/lib/icons.ts). */
export const DEFAULT_ICON_NAMES: Record<string, string> = {
  "ride-sharing": "car",
  "vehicle-rental": "key",
  "offline-booking": "calendar-check",
  "buy-sell": "handshake",
  "charging-station": "battery",
  "trial-center": "cone",
};

export const NEPCAB_LINK = { name: "NepCab", href: "/nepcab" };

/** A service with its icon component, for server-rendered pages. */
export type ServiceWithIcon = ServiceData & { icon: Icon };
export const withIcon = (s: ServiceData): ServiceWithIcon => ({ ...s, icon: iconFor(s.iconName) });

/** A service's cover photo (null if none is set). */
export const serviceCover = (s: Pick<ServiceData, "image" | "name">): SiteImage | null => {
  const img = siteImage(s.image);
  return img && { ...img, alt: img.alt || s.name };
};

/** A service's page photos, cover first if the gallery is empty. */
export const servicePhotos = (s: Pick<ServiceData, "image" | "gallery" | "name">): SiteImage[] => {
  const photos = s.gallery.map(siteImage).filter((x): x is SiteImage => !!x);
  const cover = serviceCover(s);
  return photos.length ? photos : cover ? [cover] : [];
};

/** WhatsApp chat pre-filled with a service's enquiry (Nepal numbers, +977). */
export function serviceWhatsAppUrl(phone: string, s: { whatsapp: string }): string {
  return `https://wa.me/977${phone}?text=${encodeURIComponent(s.whatsapp)}`;
}
