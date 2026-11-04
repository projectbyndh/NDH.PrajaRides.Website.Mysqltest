import { block, type BlockDef, type Field } from "../types";

// The privacy policy and terms of use. Starting content; the live content is in content_blocks.
// Section text: paragraphs separated by a blank line; lines starting with "- " become a bullet
// list; **bold** for emphasis.

const legal: Field[] = [
  { key: "eyebrow", label: "Small label above the title", type: "text", max: 40 },
  { key: "title", label: "Title", type: "text", max: 80 },
  { key: "updated", label: "Last updated (date)", type: "text", max: 40, hint: "Change this whenever you change the text." },
  { key: "intro", label: "Opening paragraph", type: "textarea", max: 1200, rows: 3 },
  {
    key: "sections",
    label: "Sections",
    type: "list",
    itemLabel: "Section",
    max: 20,
    item: [
      { key: "heading", label: "Heading", type: "text", max: 100 },
      { key: "body", label: "Text", type: "textarea", max: 4000, rows: 6, hint: 'Blank line between paragraphs. Start a line with "- " for a bullet, **bold** for emphasis.' },
    ],
  },
  { key: "seoDescription", label: "Search result description", type: "textarea", max: 300, rows: 2 },
];

export const LEGAL_BLOCKS = {
  "legal.privacy": block({
    key: "legal.privacy",
    page: "legal",
    title: "Privacy policy",
    fields: legal,
    defaults: {
      eyebrow: "Legal",
      title: "Privacy policy",
      updated: "9 October 2026",
      intro:
        'This policy explains what information {company} ("we") collects through this website, why, and how we protect it. It covers this website, the driver portal and our referral links and QR codes. The NepCab app has its own privacy policy.',
      sections: [
        {
          heading: "What we collect",
          body: [
            "- **When you scan a QR code or open a referral link:** the time, device type (Android, iPhone or computer), a browser identifier cookie, IP address and browser details. We use this to count referrals once per phone.",
            "- **When you apply to drive:** the details you enter, such as name, mobile number, date of birth, address, vehicle and license details.",
            "- **Registered drivers:** profile, document and payout details entered by our office, and the browsers you log in from.",
            "- **When you contact us** (contact, business, careers, safety or lost-item forms): your name, contact details, organization if given, and message.",
            "- **When you check an application status:** the mobile number and date of birth you enter, only to look up your application.",
            "- **Website visits:** we don't use any third-party analytics. Apart from the referral counts above (which use our own first-party device cookie), our server keeps standard logs, such as IP address, browser and pages requested, for security and troubleshooting.",
          ].join("\n"),
        },
        {
          heading: "How we use it",
          body: [
            "- To count referrals and pay driver rewards fairly, and to prevent fraud.",
            "- To review driver applications and contact applicants.",
            "- To answer your messages and handle safety reports and lost items.",
            "- To understand which pages are useful and improve the website.",
            "",
            "We do not sell your information. We share it only with NepCab where needed to run the service, or when required by law.",
          ].join("\n"),
        },
        {
          heading: "Cookies",
          body: "We use a small number of necessary cookies: one to recognise a phone so it is counted once, and login cookies for the admin and driver portal.",
        },
        {
          heading: "Keeping it safe",
          body: "Data is stored with secure cloud providers. Driver PINs are stored in scrambled (hashed) form. Access to personal data is limited to authorised staff.",
        },
        { heading: "Your choices", body: "You can ask us to see, correct or delete your information by contacting us at {phone}." },
        { heading: "Contact", body: "{company}, {city}, Rupandehi · Call / WhatsApp {phone} · Toll free {tollFree}" },
      ],
      seoDescription: "How {company} collects, uses and protects your information on this website, the driver portal and our referral links.",
    },
  }),
  "legal.terms": block({
    key: "legal.terms",
    page: "legal",
    title: "Terms of use",
    fields: legal,
    defaults: {
      eyebrow: "Legal",
      title: "Terms of use",
      updated: "9 October 2026",
      intro:
        "These terms apply to this website, operated by {company}, the official NepCab franchise for {city}. Rides booked in the NepCab app are covered by NepCab's own terms.",
      sections: [
        { heading: "Using this website", body: "Use the site for lawful purposes only. Don't attempt to disrupt it, access other people's accounts, or submit false information." },
        {
          heading: "Driver referral program",
          body: [
            "- Each registered driver receives a personal referral link and QR code.",
            "- A referral counts when a new phone opens the driver's link and taps a store button; each phone counts once, for the first driver who referred it.",
            "- Taps from a driver's own devices do not count.",
            "- Monthly reward targets and amounts are set by {company} and may change. Rewards are reviewed before payment.",
            "- We may cancel rewards or suspend a driver account in cases of fraud or misuse.",
          ].join("\n"),
        },
        { heading: "Driver applications", body: "Submitting an application does not guarantee acceptance. We verify documents before a driver can start." },
        { heading: "Changes", body: "We may update these terms; the date at the top shows the latest version." },
        { heading: "Contact", body: "Call / WhatsApp {phone} · Toll free {tollFree}" },
      ],
      seoDescription: "Terms of use for the {company} website, driver referral program and driver applications.",
    },
  }),
} satisfies Record<string, BlockDef<unknown>>;
