import { faq, heading, iconCard, step } from "../fields";
import { block, type BlockDef } from "../types";

// Editable sections of the Safety & support page (/safety). Starting content; the live content is
// in content_blocks.

export const SAFETY_BLOCKS = {
  "safety.hero": block({
    key: "safety.hero",
    page: "safety",
    title: "Top of the page",
    fields: [
      { key: "seoTitle", label: "Browser tab / Google title", type: "text", max: 70 },
      { key: "seoDescription", label: "Google description", type: "textarea", max: 300, rows: 2 },
      { key: "eyebrow", label: "Small label above the headline", type: "text", max: 60 },
      { key: "titleLines", label: "Headline", type: "lines", max: 3, hint: "One line per row." },
      { key: "intro", label: "Paragraph", type: "textarea", max: 400 },
      { key: "image", label: "Photo", type: "image" },
      { key: "reportLabel", label: "Report button", type: "text", max: 40 },
    ],
    defaults: {
      seoTitle: "Safety & support",
      seoDescription: "How {company} checks NepCab driver partners in {area}, ride safety tips, emergency numbers, lost items and how to report a concern.",
      eyebrow: "Safety & support",
      titleLines: ["Your safety comes first,", "on every ride."],
      intro: "How we look after riders and driver partners across {area}, and how to reach us when you need help.",
      image: "riders",
      reportLabel: "Report a concern",
    },
  }),
  "safety.emergency": block({
    key: "safety.emergency",
    page: "safety",
    title: "Emergency numbers",
    fields: [
      { key: "label", label: "Label", type: "text", max: 60 },
      {
        key: "numbers",
        label: "Numbers",
        type: "list",
        itemLabel: "Number",
        max: 8,
        item: [
          { key: "icon", label: "Icon", type: "icon" },
          { key: "label", label: "Name", type: "text", max: 40 },
          { key: "number", label: "Number", type: "text", max: 20 },
        ],
      },
      { key: "after", label: "Line under the numbers", type: "text", max: 120, hint: "Followed by your phone and toll-free numbers." },
    ],
    defaults: {
      label: "In an emergency, call first",
      numbers: [
        { icon: "siren", label: "Nepal Police", number: "100" },
        { icon: "ambulance", label: "Ambulance", number: "102" },
        { icon: "flame", label: "Fire brigade", number: "101" },
        { icon: "map-pinned", label: "Traffic police", number: "103" },
      ],
      after: "Then tell us: call or WhatsApp",
    },
  }),
  "safety.checks": block({
    key: "safety.checks",
    page: "safety",
    title: "How we check drivers",
    fields: [...heading, { key: "intro", label: "Intro", type: "textarea", max: 300 }, { key: "items", label: "Checks", type: "list", itemLabel: "Check", max: 8, item: iconCard }],
    defaults: {
      eyebrow: "Driver partners",
      title: "How we check every driver",
      intro: "Every NepCab driver partner in our area joins through our office, not just an app sign-up.",
      items: [
        { icon: "file-check", title: "Documents verified", text: "Our office checks every driver partner's driving license, vehicle bluebook and insurance before they join." },
        { icon: "user-check", title: "Known to our office", text: "Each driver partner is registered with us, with their contact and vehicle details on file." },
        { icon: "badge-check", title: "Expiry dates tracked", text: "We keep track of license, bluebook and insurance expiry dates and follow up before they run out." },
        { icon: "headphones", title: "A local team", text: "Our office is in {city}. Real people answer when you call or WhatsApp." },
      ],
    },
  }),
  "safety.tips": block({
    key: "safety.tips",
    page: "safety",
    title: "Tips for riders",
    fields: [...heading, { key: "items", label: "Tips", type: "list", itemLabel: "Tip", max: 8, item: iconCard }],
    defaults: {
      eyebrow: "For riders",
      title: "Ride smart",
      items: [
        { icon: "car-front", title: "Check before you get in", text: "Make sure the vehicle number and the driver match what the NepCab app shows." },
        { icon: "users", title: "Tell someone", text: "Let a friend or family member know where you're going and when you expect to arrive." },
        { icon: "eye", title: "Trust your instincts", text: "If something doesn't feel right, ask to stop in a busy, well-lit place and call us." },
        { icon: "shield-plain", title: "Buckle up", text: "Wear your seatbelt, and keep your phone and belongings with you." },
      ],
    },
  }),
  "safety.lost": block({
    key: "safety.lost",
    page: "safety",
    title: "Lost and found, and what happens after a report",
    fields: [
      ...heading,
      { key: "paragraphs", label: "Lost and found: paragraphs", type: "lines", max: 4, hint: "One paragraph per row." },
      { key: "formNote", label: "Lost and found: note", type: "text", max: 120 },
      { key: "afterEyebrow", label: "After a report: label", type: "text", max: 60 },
      { key: "afterTitle", label: "After a report: title", type: "text", max: 120 },
      { key: "afterSteps", label: "After a report: steps", type: "list", itemLabel: "Step", max: 6, item: step },
    ],
    defaults: {
      eyebrow: "Lost something?",
      title: "Lost and found",
      paragraphs: [
        "Left something in a NepCab vehicle? Tell us as soon as you can, with the date and time of the ride, where you went, and the vehicle number if you have it.",
        "We'll contact the driver partner and help arrange for you to get it back.",
      ],
      formNote: "Use the form below and choose “Lost item”.",
      afterEyebrow: "After you report",
      afterTitle: "What happens next",
      afterSteps: [
        { title: "We log it", text: "Every report is recorded and kept confidential." },
        { title: "We call you", text: "Our team contacts you to understand what happened." },
        { title: "We follow up", text: "We speak with the driver partner and take action where needed." },
      ],
    },
  }),
  "safety.report": block({
    key: "safety.report",
    page: "safety",
    title: "Report form",
    fields: [
      ...heading,
      { key: "intro", label: "Intro", type: "textarea", max: 200 },
      { key: "phoneLabel", label: "Phone card: label", type: "text", max: 40 },
      { key: "tollFreeLabel", label: "Toll-free card: label", type: "text", max: 40 },
      { key: "submitLabel", label: "Send button", type: "text", max: 40 },
    ],
    defaults: {
      eyebrow: "Get help",
      title: "Report a concern or lost item",
      intro: "For anything urgent, please call us instead.",
      phoneLabel: "Call / WhatsApp",
      tollFreeLabel: "Toll free",
      submitLabel: "Send report",
    },
  }),
  "safety.faq": block({
    key: "safety.faq",
    page: "safety",
    title: "Questions",
    fields: [...heading, { key: "items", label: "Questions", type: "list", itemLabel: "Question", max: 15, item: faq }],
    defaults: {
      eyebrow: "FAQ",
      title: "Safety questions",
      items: [
        { q: "How do I know my driver is registered?", a: "Check that the vehicle number and driver match what the NepCab app shows. If anything doesn't match, don't get in, and let us know." },
        { q: "Is my report kept private?", a: "Yes. Reports are only seen by our team, and we don't share your details with the driver without your permission." },
        { q: "I'm a driver partner. How do I report a problem with a rider?", a: "Call or WhatsApp our office on {phone}, or use the form on this page." },
        { q: "Who handles safety for NepCab in Butwal?", a: "{company}, the official NepCab franchise for {city}, handles driver partners and rider support across {area}." },
      ],
    },
  }),
} satisfies Record<string, BlockDef<unknown>>;
