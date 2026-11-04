import { heading, iconCard, step } from "./fields";
import { block, type BlockDef, type PageDef } from "./types";
import { SERVICES_BLOCKS } from "./pages/services";
import { NEPCAB_BLOCKS } from "./pages/nepcab";
import { DRIVE_BLOCKS } from "./pages/drive";
import { SAFETY_BLOCKS } from "./pages/safety";
import { ABOUT_BLOCKS } from "./pages/about";
import { BUSINESS_BLOCKS } from "./pages/business";
import { CONTACT_BLOCKS } from "./pages/contact";
import { CAREERS_BLOCKS } from "./pages/careers";
import { LISTINGS_BLOCKS } from "./pages/listings";
import { LEGAL_BLOCKS } from "./pages/legal";
import { PRESS_BLOCKS } from "./pages/press";
import { SITE_BLOCKS } from "./pages/site";

// Every editable section of every public page, with its STARTING content. The live content is in
// the database (content_blocks), edited in /admin/content; these defaults are stored there the
// first time a block is read. Text can use placeholders, filled from the contact details:
//   {phone} {tollFree} {email} {address} {city} {area} {company}

export const PAGES: PageDef[] = [
  { key: "home", label: "Home", path: "/" },
  { key: "services", label: "Services", path: "/services" },
  { key: "nepcab", label: "NepCab app", path: "/nepcab" },
  { key: "drive", label: "Drive with us", path: "/drive" },
  { key: "safety", label: "Safety", path: "/safety" },
  { key: "about", label: "About", path: "/about" },
  { key: "business", label: "For business", path: "/business" },
  { key: "contact", label: "Contact", path: "/contact" },
  { key: "careers", label: "Careers", path: "/careers" },
  { key: "listings", label: "Blog, news & gallery", path: "/blog" },
  { key: "press", label: "Media kit", path: "/press" },
  { key: "legal", label: "Privacy & terms", path: "/privacy" },
  { key: "site", label: "Every page (footer)", path: "/" },
];

export const BLOCKS = {
  // ---------------- Home ----------------
  "home.seo": block({
    key: "home.seo",
    page: "home",
    title: "Search engines",
    description: "How the home page appears in Google results and link previews.",
    fields: [
      { key: "seoTitle", label: "Browser tab / Google title", type: "text", max: 70 },
      { key: "seoDescription", label: "Google description", type: "textarea", max: 200, rows: 2 },
    ],
    defaults: {
      seoTitle: "{company} — Rides, rentals, EV charging & more in {city}",
      seoDescription: "{company}, {city}: ride sharing (official NepCab franchise), vehicle rental, offline booking, vehicle buy & sell, EV charging station and driving trial center.",
    },
  }),
  "home.hero": block({
    key: "home.hero",
    page: "home",
    title: "Hero slideshow",
    description: "The top of the home page: slides change every few seconds. The buttons and app links stay the same on every slide.",
    fields: [
      {
        key: "slides",
        label: "Slides",
        type: "list",
        itemLabel: "Slide",
        max: 8,
        item: [
          { key: "title", label: "Headline", type: "text", max: 80 },
          { key: "line", label: "Line under it", type: "textarea", max: 200, rows: 2 },
          { key: "image", label: "Photo", type: "image" },
        ],
      },
      { key: "primaryLabel", label: "Main button", type: "text", max: 40 },
      { key: "primaryHref", label: "Main button link", type: "url" },
      { key: "secondaryLabel", label: "Second button", type: "text", max: 40 },
      { key: "secondaryHref", label: "Second button link", type: "url" },
      { key: "appLabel", label: "Label above the app store buttons", type: "text", max: 60 },
      { key: "qrTitle", label: "QR card title", type: "text", max: 60 },
      { key: "qrText", label: "QR card text", type: "text", max: 120 },
    ],
    defaults: {
      slides: [
        { title: "Your ride in {city}, a tap away.", line: "Book a car or bike in the NepCab app, with local drivers checked by our office.", image: "hero" },
        { title: "Going the same way? Share the ride.", line: "NepCab Pool matches you with riders heading your way.", image: "riders" },
        { title: "{area}, in one app.", line: "Travel between Butwal and Bhairahawa with NepCab Intercity.", image: "city" },
        { title: "Offer your fare. Pick your driver.", line: "Name your price and choose the driver who accepts it.", image: "scooter" },
        { title: "Drivers we know by name.", line: "Every driver partner is checked by our {city} office.", image: "drivers" },
      ],
      primaryLabel: "Book a ride",
      primaryHref: "/nepcab",
      secondaryLabel: "Register as a driver",
      secondaryHref: "/drive#apply",
      appLabel: "Get the NepCab app",
      qrTitle: "Scan to book a ride",
      qrText: "Point your phone camera at the code",
    },
  }),
  "home.about": block({
    key: "home.about",
    page: "home",
    title: "About us (home)",
    description: "The short About section under the hero. The story, mission and vision come from Website → About.",
    fields: [...heading, { key: "image", label: "Large photo", type: "image" }, { key: "inset", label: "Small photo", type: "image" }, { key: "buttonLabel", label: "Button", type: "text", max: 40 }],
    defaults: { eyebrow: "About Praja Ride", title: "A local company for everything on wheels", image: "city", inset: "drivers", buttonLabel: "Read our story" },
  }),
  "home.services": block({
    key: "home.services",
    page: "home",
    title: "Services section (home)",
    description: "The services themselves are edited in admin → Services.",
    fields: [...heading, { key: "intro", label: "Intro", type: "textarea", max: 300, rows: 2 }, { key: "buttonLabel", label: "Button", type: "text", max: 40 }],
    defaults: { eyebrow: "Our services", title: "Everything on wheels, one trusted name", intro: "Six services, one local team and one phone number, across {area}.", buttonLabel: "All services" },
  }),
  "home.audiences": block({
    key: "home.audiences",
    page: "home",
    title: "Who we serve",
    fields: [
      ...heading,
      {
        key: "cards",
        label: "Cards",
        type: "list",
        itemLabel: "Card",
        max: 4,
        item: [
          { key: "icon", label: "Icon", type: "icon" },
          { key: "who", label: "Label on the photo", type: "text", max: 30 },
          { key: "title", label: "Title", type: "text", max: 60 },
          { key: "text", label: "Text", type: "textarea", max: 200, rows: 2 },
          { key: "points", label: "Points", type: "lines", max: 5 },
          { key: "cta", label: "Link text", type: "text", max: 40 },
          { key: "href", label: "Link", type: "url" },
          { key: "image", label: "Photo", type: "image" },
          { key: "featured", label: "Highlight in amber", type: "toggle" },
        ],
      },
    ],
    defaults: {
      eyebrow: "Who we serve",
      title: "Built for the whole city",
      cards: [
        { icon: "smartphone", who: "Customers", title: "Use our services", text: "Rides, rentals, EV charging, vehicles to buy or sell, and driving trials across {area}.", points: ["Ride sharing & rentals", "Buy & sell, EV charging", "Driving trial center"], cta: "See all services", href: "/services", image: "riders", featured: false },
        { icon: "car", who: "Drivers", title: "Drive and earn", text: "Use your own vehicle, on your own time, with a local team behind you.", points: ["Document support", "Personal QR code", "Monthly referral rewards"], cta: "Apply to drive", href: "/drive", image: "drivers", featured: true },
        { icon: "briefcase", who: "Business", title: "Partner with us", text: "Transport and promotions for companies, hotels, colleges and events.", points: ["Staff rides", "Hotel guests", "Events & QR partners"], cta: "For business", href: "/business", image: "business", featured: false },
      ],
    },
  }),
  "home.booking": block({
    key: "home.booking",
    page: "home",
    title: "How to book",
    fields: [
      ...heading,
      { key: "intro", label: "Intro", type: "textarea", max: 300, rows: 2 },
      { key: "appSteps", label: "In the app: steps", type: "list", itemLabel: "Step", max: 5, item: step },
      { key: "appCardTitle", label: "In the app: card title", type: "text", max: 60 },
      {
        key: "offline",
        label: "Without the app: ways to book",
        type: "list",
        itemLabel: "Way",
        max: 4,
        hint: "Links can use {phone}, {tollFree} and {whatsapp}, e.g. tel:{phone}.",
        item: [...iconCard, { key: "cta", label: "Link text", type: "text", max: 60 }, { key: "href", label: "Link", type: "url" }],
      },
      { key: "offlineNote", label: "Without the app: note", type: "text", max: 160 },
    ],
    defaults: {
      eyebrow: "How to book",
      title: "Book your way, online or off",
      intro: "Book rides in the NepCab app, or book any Praja Ride service through our team. No smartphone needed.",
      appSteps: [
        { title: "Download NepCab", text: "Free on Google Play and the App Store." },
        { title: "Choose your ride", text: "Pick a ride type, then set your pickup and destination." },
        { title: "Ride with a local driver", text: "A checked driver partner picks you up." },
      ],
      appCardTitle: "Get it free on your phone",
      offline: [
        { icon: "phone", title: "Call us", text: "Tell us the service, place and time. We book it for you.", cta: "{phone}", href: "tel:{phone}" },
        { icon: "chat", title: "WhatsApp us", text: "Send a message; we fill in the booking for you.", cta: "Open WhatsApp", href: "{whatsapp}" },
        { icon: "map-pin", title: "Walk in", text: "Visit our office at {address} and we book it on the spot.", cta: "Get directions", href: "/contact" },
      ],
      offlineNote: "We book rides, rentals, charging slots and trial practice for you.",
    },
  }),
  "home.whyus": block({
    key: "home.whyus",
    page: "home",
    title: "Why Praja Ride",
    fields: [
      ...heading,
      { key: "intro", label: "Intro", type: "textarea", max: 300, rows: 2 },
      { key: "image", label: "Photo", type: "image" },
      { key: "supportLabel", label: "Support card label", type: "text", max: 40 },
      { key: "reasons", label: "Reasons", type: "list", itemLabel: "Reason", max: 6, item: iconCard },
    ],
    defaults: {
      eyebrow: "Why Praja Ride",
      title: "Services you can trust",
      intro: "Every Praja Ride service has the same local team, office and phone number behind it.",
      image: "support",
      supportLabel: "Toll-free support",
      reasons: [
        { icon: "shield", title: "Checked people", text: "We check every driver's licence, bluebook and insurance before they start." },
        { icon: "building", title: "A real local office", text: "Visit us in Tilottama-5, {city}. Real people, close by." },
        { icon: "phone", title: "One number for everything", text: "Rides, rentals, charging and more, all through one phone number." },
        { icon: "search", title: "Every report followed up", text: "Lost items and safety reports are followed up by our own team." },
      ],
    },
  }),
  "home.drive": block({
    key: "home.drive",
    page: "home",
    title: "Drive with us banner",
    fields: [...heading, { key: "perks", label: "Points", type: "lines", max: 6 }, { key: "buttonLabel", label: "Button", type: "text", max: 40 }, { key: "loginLabel", label: "Login link text", type: "text", max: 60 }],
    defaults: {
      eyebrow: "Drive with Praja Ride",
      title: "Earn with your own vehicle, on your own time.",
      perks: ["Help with your documents", "A personal QR code to share", "Monthly referral rewards", "Paid to eSewa, Khalti or your bank"],
      buttonLabel: "Apply to drive",
      loginLabel: "Already a partner? Log in",
    },
  }),
  "home.sections": block({
    key: "home.sections",
    page: "home",
    title: "Other home section titles",
    fields: [
      { key: "galleryEyebrow", label: "Gallery: label", type: "text", max: 60 },
      { key: "galleryTitle", label: "Gallery: title", type: "text", max: 120 },
      { key: "newsEyebrow", label: "News: label", type: "text", max: 60 },
      { key: "newsTitle", label: "News: title", type: "text", max: 120 },
      { key: "faqEyebrow", label: "Questions: label", type: "text", max: 60 },
      { key: "faqTitle", label: "Questions: title", type: "text", max: 120 },
      { key: "blogEyebrow", label: "Blog: label", type: "text", max: 60 },
      { key: "blogTitle", label: "Blog: title", type: "text", max: 120 },
    ],
    defaults: {
      galleryEyebrow: "On the road",
      galleryTitle: "Praja Ride around {city}",
      newsEyebrow: "News & offers",
      newsTitle: "Latest from Praja Ride",
      faqEyebrow: "Questions",
      faqTitle: "Good to know",
      blogEyebrow: "From the blog",
      blogTitle: "Guides and stories from the road",
    },
  }),
  // Other pages: one file each in ./pages
  ...SERVICES_BLOCKS,
  ...NEPCAB_BLOCKS,
  ...DRIVE_BLOCKS,
  ...SAFETY_BLOCKS,
  ...ABOUT_BLOCKS,
  ...BUSINESS_BLOCKS,
  ...CONTACT_BLOCKS,
  ...CAREERS_BLOCKS,
  ...LISTINGS_BLOCKS,
  ...LEGAL_BLOCKS,
  ...PRESS_BLOCKS,
  ...SITE_BLOCKS,
} satisfies Record<string, BlockDef<unknown>>;

export type BlockKey = keyof typeof BLOCKS;
export type BlockData<K extends BlockKey> = (typeof BLOCKS)[K]["defaults"];

export const blocksForPage = (page: string) => (Object.values(BLOCKS) as BlockDef<unknown>[]).filter((b) => b.page === page);
export const isBlockKey = (k: string): k is BlockKey => k in BLOCKS;

