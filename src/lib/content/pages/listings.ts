import { block, type BlockDef, type Field } from "../types";

// Editable sections of the blog, news and gallery pages (the posts and photos themselves are
// managed in admin → News & offers and Gallery). Starting content; the live content is in content_blocks.

const hero: Field[] = [
  { key: "eyebrow", label: "Small label above the title", type: "text", max: 60 },
  { key: "title", label: "Title", type: "text", max: 120 },
  { key: "intro", label: "Intro", type: "textarea", max: 400, rows: 2 },
  { key: "seoTitle", label: "Search result title", type: "text", max: 70, hint: "Shown in the browser tab and Google." },
  { key: "seoDescription", label: "Search result description", type: "textarea", max: 300, rows: 2 },
];

export const LISTINGS_BLOCKS = {
  "listings.blog": block({
    key: "listings.blog",
    page: "listings",
    title: "Blog page",
    fields: hero,
    defaults: {
      eyebrow: "Praja Ride blog",
      title: "Guides and stories from the road",
      intro: "How-tos for riders, tips for driver partners and news on getting around {area}.",
      seoTitle: "Blog",
      seoDescription: "Guides, tips and stories from {company}: booking rides, riding safely and driving with NepCab in {area}.",
    },
  }),
  "listings.article": block({
    key: "listings.article",
    page: "listings",
    title: "Blog article: labels",
    description: "The fixed text around every blog article.",
    fields: [
      { key: "shareTitle", label: "Share box title", type: "text", max: 60 },
      { key: "appEyebrow", label: "App box label", type: "text", max: 40 },
      { key: "appTitle", label: "App box title", type: "text", max: 100 },
      { key: "helpTitle", label: "Help box title", type: "text", max: 60 },
      { key: "helpText", label: "Help box text", type: "text", max: 120 },
      { key: "moreTitle", label: "More articles: title", type: "text", max: 80 },
      { key: "moreButton", label: "More articles: button", type: "text", max: 40 },
    ],
    defaults: {
      shareTitle: "Share this article",
      appEyebrow: "NepCab app",
      appTitle: "Book your next ride in {city}",
      helpTitle: "Questions?",
      helpText: "Our {city} team is happy to help.",
      moreTitle: "More from the blog",
      moreButton: "All articles",
    },
  }),
  "listings.news": block({
    key: "listings.news",
    page: "listings",
    title: "News & offers page",
    fields: [
      ...hero,
      { key: "emptyTitle", label: "When there are no posts: title", type: "text", max: 80 },
      { key: "emptyText", label: "When there are no posts: text", type: "text", max: 200 },
      { key: "offersEyebrow", label: "Offers: label", type: "text", max: 60 },
      { key: "offersTitle", label: "Offers: title", type: "text", max: 120 },
      { key: "newsEyebrow", label: "News: label", type: "text", max: 60 },
      { key: "newsTitle", label: "News: title", type: "text", max: 120 },
      { key: "backLabel", label: "News post: back link", type: "text", max: 40 },
      { key: "validUntil", label: "News post: offer end date label", type: "text", max: 40 },
      { key: "moreTitle", label: "News post: more posts title", type: "text", max: 80 },
    ],
    defaults: {
      eyebrow: "News & offers",
      title: "What's new at Praja Ride",
      intro: "Updates on NepCab in {area}: new services, launches, and offers for riders and drivers.",
      seoTitle: "News & offers",
      seoDescription: "Latest news and offers from {company} and NepCab in {area}.",
      emptyTitle: "No news yet",
      emptyText: "Check back soon for updates and offers.",
      offersEyebrow: "Offers",
      offersTitle: "Current offers",
      newsEyebrow: "News",
      newsTitle: "Latest news",
      backLabel: "News & offers",
      validUntil: "Valid until",
      moreTitle: "More from Praja Ride",
    },
  }),
  "listings.gallery": block({
    key: "listings.gallery",
    page: "listings",
    title: "Gallery page",
    fields: [
      ...hero,
      { key: "emptyTitle", label: "When there are no photos: title", type: "text", max: 80 },
      { key: "emptyText", label: "When there are no photos: text", type: "textarea", max: 300, rows: 2 },
      { key: "emptyButton", label: "When there are no photos: button", type: "text", max: 40 },
      { key: "emptyLink", label: "When there are no photos: button link", type: "url" },
    ],
    defaults: {
      eyebrow: "Gallery",
      title: "Praja Ride on the road",
      intro: "Our vehicles, driver partners, office and events across {area}.",
      seoTitle: "Gallery",
      seoDescription: "Photos of {company} and NepCab in {area}: vehicles, driver partners, our office and events.",
      emptyTitle: "Photos coming soon",
      emptyText: "We're putting together photos from the road. Follow us on social media for the latest.",
      emptyButton: "Contact us",
      emptyLink: "/contact",
    },
  }),
} satisfies Record<string, BlockDef<unknown>>;
