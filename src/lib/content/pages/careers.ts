import { heading, iconCard } from "../fields";
import { block, type BlockDef } from "../types";

// Editable sections of the careers page (the job openings themselves are in Website → Jobs).
// Starting content; the live content is in content_blocks.
export const CAREERS_BLOCKS = {
  "careers.hero": block({
    key: "careers.hero",
    page: "careers",
    title: "Top of the page",
    fields: [
      { key: "seoTitle", label: "Search title", type: "text", max: 70 },
      { key: "seoDescription", label: "Search description", type: "textarea", max: 200, rows: 2 },
      { key: "eyebrow", label: "Small label above the title", type: "text", max: 60 },
      { key: "titleLines", label: "Headline (one line per row)", type: "lines", max: 3 },
      { key: "intro", label: "Intro", type: "textarea", max: 400, rows: 3 },
      { key: "image", label: "Photo", type: "image" },
      { key: "rolesButton", label: "Button when there are open roles", type: "text", max: 40 },
      { key: "applyButton", label: "Button when there are none", type: "text", max: 40 },
    ],
    defaults: {
      seoTitle: "Careers",
      seoDescription: "Jobs at {company}, in {city}. See open roles and apply online.",
      eyebrow: "Careers",
      titleLines: ["Help move", "{city} forward."],
      intro: "Join the Praja Ride team across {area}: operations, driver support, customer care, sales and marketing.",
      image: "support",
      rolesButton: "See open roles",
      applyButton: "Send your application",
    },
  }),
  "careers.why": block({
    key: "careers.why",
    page: "careers",
    title: "Why work with us",
    fields: [...heading, { key: "items", label: "Reasons", type: "list", itemLabel: "Reason", max: 8, item: iconCard }],
    defaults: {
      eyebrow: "Why Praja Ride",
      title: "Work that moves the city",
      items: [
        { icon: "rocket", title: "Build something new", text: "Help grow Praja Ride's services across {area}." },
        { icon: "map-pin", title: "Work close to home", text: "A {city} company, with our office in Tilottama." },
        { icon: "users", title: "A small, close team", text: "Your work is seen and makes a difference from day one." },
        { icon: "sprout", title: "Grow with us", text: "As the service grows, so do the roles and responsibilities." },
      ],
    },
  }),
  "careers.apply": block({
    key: "careers.apply",
    page: "careers",
    title: "Open roles and application",
    description: "{count} in a title is replaced by the number of open roles.",
    fields: [
      { key: "eyebrow", label: "Small label above the title", type: "text", max: 60 },
      { key: "titleOne", label: "Title with one open role", type: "text", max: 80 },
      { key: "titleMany", label: "Title with several open roles", type: "text", max: 80 },
      { key: "titleNone", label: "Title with no open roles", type: "text", max: 80 },
      { key: "noneText", label: "Text with no open roles (one paragraph per row)", type: "lines", max: 4 },
      { key: "driveTitle", label: "Drivers box: title", type: "text", max: 80 },
      { key: "driveText", label: "Drivers box: text", type: "text", max: 160 },
      { key: "driveLink", label: "Drivers box: link text", type: "text", max: 40 },
      { key: "cvText", label: "CV note (before the email address)", type: "text", max: 120 },
      { key: "submitLabel", label: "Send button", type: "text", max: 40 },
    ],
    defaults: {
      eyebrow: "Open roles",
      titleOne: "{count} open role",
      titleMany: "{count} open roles",
      titleNone: "No open roles right now",
      noneText: [
        "We don't have any openings at the moment, but we're always happy to hear from good people in {city}.",
        "Send us a general application and we'll be in touch when a suitable role opens.",
      ],
      driveTitle: "Want to drive with NepCab?",
      driveText: "Driver partners apply separately.",
      driveLink: "Drive with us",
      cvText: "Please also email your CV to",
      submitLabel: "Send application",
    },
  }),
} satisfies Record<string, BlockDef<unknown>>;
