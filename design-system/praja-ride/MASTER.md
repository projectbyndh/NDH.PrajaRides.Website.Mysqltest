# Praja Ride — Design System (Master)

Source of truth for the public website (`src/app/(site)`, `src/components/site`). Built and audited with the
[ui-ux-pro-max](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill) skill. Page-specific deviations go in
`design-system/praja-ride/pages/<page>.md` and override this file. Tokens live in `src/app/globals.css`.

## Brand

- **Praja Ride Pvt. Ltd.** is the master brand: one company, six services, one phone number.
- Every service is named "Praja Ride + plain word" and uses the Praja Ride logo with the service tag under it.
- **NepCab** appears only on Ride Sharing, as "Powered by NepCab" (Praja Ride is its Butwal franchise).
- Services are defined once in `src/components/site/brand-services.ts`; menus, cards and pages read from it.

## Colour

| Token | Value | Use |
|---|---|---|
| white | `#ffffff` | Every page and section background (no grey or cream bands) |
| `navy` | `#01153e` | Headings, secondary buttons; the footer is the only full-width navy area |
| `accent` | `#ffa700` | Primary buttons, selected tabs, ticker, highlight panels |
| `accent-deep` | `#8f5400` | Amber text on white (6.1:1) |
| `accent-soft` | `#fff1d1` | Icon tiles |
| `paper` | `#f4f6f9` | Tiny fills only (tab bar, chips); never section backgrounds |
| `line` | `#e4e8ee` | Hairline borders between white sections and around cards |

Rules:
- Light first: hero, page headers, sections and cards are white; separate them with `line` hairlines.
- Navy is an accent, not a background (footer, secondary buttons, small badges).
- Amber text auto-switches by surface through `--accent-ink`; navy on amber surfaces.
- Muted text minimums (WCAG 4.5:1): `text-ink/65` on white, `text-white/55` on navy.
- No glows: no blurred colour blobs, glow shadows or gloss sweeps; shadows are small and neutral.

## Type

Loaded with `next/font`:
- **Plus Jakarta Sans**: headings, labels, buttons, numbers (sharp, modern geometric).
- **Inter**: body text (built for screens; clear at small sizes and in forms).
- **Mukta**: Nepali (Devanagari) text such as the tagline.
- Admin, driver portal and download pages keep **Poppins** (NepCab's logo face).

| Class | Use | Weight |
|---|---|---|
| `.type-display` | Home hero only (32–58px) | 800 |
| `.type-h1` | Inner page titles (30–48px) | 800 |
| `.type-h2` | Section titles (26–38px) | 700 |
| `.type-h3` | Card titles (17–19px) | 700 |
| `.type-eyebrow` | Label above a title (amber diamond + uppercase) | 600 |
| `.type-lead` | Intro paragraphs | Inter, fluid 17–19px |

- Headings are one colour: navy on light surfaces (white on navy). `*asterisks*` in a title no longer change the colour (`.type-em` inherits).
- Eyebrows have no index numbers and no rules. Numbers are used only for real sequences (steps).

## Photography

- All photos are listed in `src/lib/site-images.ts` (one per service, plus riders, drivers, business,
  city, support). They are Unsplash placeholders until Praja Ride's own photos arrive: drop real files in
  `/public/images/` and change `src` there.
- Cards frame photos inside a 8px white inset (`p-2`, radius 1.35rem) with the icon and tag as chips.
- Text over photos sits on a neutral black scrim, never a navy overlay.
- Inner page headers take a photo via `<PageHero image={...}>`.

## Layout & surfaces

- Container `max-w-6xl`, gutters 16px (mobile) / 24px. Sections `py-20 sm:py-28`.
- Light card: `.surface-card` (white, hairline `line` border, soft shadow), radius `1.75rem`.
- Page headers: `.bg-hero-light` (white) with the faint `.bg-grid-ink` street grid.
- Elevation: `--shadow-soft` (resting) and `--shadow-lift` (hover/raised) only.
- Services grid: bento (first service as a large full-photo card) via `ServiceGrid`.

## Components

- **Button** (`Button.tsx`): primary amber, secondary navy, light, outline, outline-dark. Solid buttons put the
  arrow inline in the text colour (it nudges on hover; no coloured chip). One primary action per section.
- **Links**: never underlined; marked by colour, weight and arrows.
- **SectionTitle / Eyebrow / PageHero / Faq** in `ui.tsx`.
- **Header**: full-width bar; transparent at the top, solid navy once scrolled. Current page = amber dot. Services opens a full-width panel (service photos + NepCab QR); mobile opens a full-screen sheet with a fixed Call / WhatsApp bar.
- **Hero** (`HeroShowcase`): ride sharing only. A slideshow changes the headline, line and photo every 6s (pauses on hover or keyboard focus; no auto-play with reduced motion). Fixed: "Book a ride" / "Register as a driver", NepCab store buttons, QR card and the turning NepCab badge. No slide dots or tabs.

## Motion

- Ease `cubic-bezier(0.22, 1, 0.36, 1)`; reveals 0.8–0.9s, hovers 200–300ms, transform/opacity only.
- Hero text animates in pure CSS (no JS wait). Scroll reveals via `Reveal` / `AnimatedText`.
- Every animation has a `prefers-reduced-motion` fallback; the ticker pauses on hover/focus.

## Accessibility checklist (pre-delivery)

- [ ] Text contrast ≥ 4.5:1 (see muted text minimums)
- [ ] Amber focus ring on every control (`:focus-visible`), skip link to `#main`
- [ ] Sticky header never covers focus or anchors (`scroll-padding-top`)
- [ ] One `h1` per page, no skipped heading levels
- [ ] Touch targets ≥ 44px for primary controls, ≥ 8px apart
- [ ] Forms: visible labels, inline errors, `role="alert"` summary, focus first invalid field
- [ ] No horizontal scroll at 390px, 768px, 1024px and 1440px
- [ ] Mobile first: layouts start stacked and add columns at `sm` (640), `lg` (1024); check tablets (768) and 1024 separately
- [ ] Touch targets: text links and small controls get a 44px tap area on touch screens (shared rule in globals.css)
- [ ] Header links stay on one line at 1024px (compact link spacing below `xl`)
- [ ] Reduced motion respected
