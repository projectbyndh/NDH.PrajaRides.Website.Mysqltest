import "server-only";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import QRCode from "qrcode";
import { BRAND } from "./config";
import { getIdentity } from "./identity";

// Server-rendered QR sticker (PNG). One design for admin downloads, the public /qr page
// and WhatsApp link previews.
//
// ImageResponse is imported at call time, not at the top of the file, because of how it has to be
// built on some hosts. Where the native SWC compiler cannot load (a build container with glibc
// older than 2.29), Next falls back to its WebAssembly compiler, and webpack then cannot resolve
// the re-exported name through next/og:
//   Cannot get final name for export 'ImageResponse' of next/dist/server/og/image-response.js
// A call-time import keeps that module out of the statically concatenated graph, so the name never
// has to be hoisted. Nothing else changes: the module is cached after the first call, and these
// routes already do async work (fonts, identity) before rendering.
const imageResponse = async () => (await import("next/og")).ImageResponse;

const INK = "#1f2124";
const BRAND_YELLOW = "#f5b81c";
const PIN = "#e0322f";

const asset = (f: string) => readFile(join(process.cwd(), "assets", f));

let fontsPromise: Promise<{ name: string; data: Buffer; weight: 600 | 800; style: "normal" }[]> | undefined;
function fonts() {
  fontsPromise ??= Promise.all([asset("fonts/Poppins-SemiBold.woff"), asset("fonts/Poppins-ExtraBold.woff")]).then(([semi, extra]) => [
    { name: "Poppins", data: semi, weight: 600, style: "normal" },
    { name: "Poppins", data: extra, weight: 800, style: "normal" },
  ]);
  return fontsPromise;
}

// "यात्राको साथी" pre-shaped with HarfBuzz into outlines (assets/tagline.svg): the image
// renderer can't join Devanagari conjuncts like त्र, so the text is drawn as paths.
const TAGLINE_RATIO = 4801 / 1380;
let taglinePromise: Promise<string> | undefined;
const taglineUri = () => (taglinePromise ??= asset("tagline.svg").then((b) => `data:image/svg+xml;base64,${b.toString("base64")}`));

/** QR code as an SVG data URI (high error correction, 2-module quiet zone). */
function qrDataUri(text: string): string {
  const { modules } = QRCode.create(text, { errorCorrectionLevel: "H" });
  const n = modules.size;
  const m = 2;
  let d = "";
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) if (modules.get(x, y)) d += `M${x + m} ${y + m}h1v1h-1z`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${n + 2 * m} ${n + 2 * m}" shape-rendering="crispEdges"><rect width="100%" height="100%" fill="#fff"/><path d="${d}" fill="#000"/></svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}

const PIN_SVG = `data:image/svg+xml;base64,${Buffer.from(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 54"><path d="M20 1C9.5 1 2 8.6 2 18c0 12.4 18 33 18 33s18-20.6 18-33C38 8.6 30.5 1 20 1z" fill="${PIN}" stroke="#fff" stroke-width="2.5"/><circle cx="20" cy="18" r="8.5" fill="#fff"/><circle cx="20" cy="18" r="4.5" fill="${PIN}"/></svg>`,
).toString("base64")}`;

/** The NepCab mark built from boxes (text inside SVG images has no fonts in the renderer). */
function Logo({ size }: { size: number }) {
  const ring = size * 0.8;
  return (
    <div style={{ display: "flex", position: "relative", width: size, height: size }}>
      <div
        style={{
          position: "absolute",
          right: 0,
          bottom: 0,
          width: ring,
          height: ring,
          borderRadius: ring,
          background: "#fff",
          border: `${size * 0.055}px solid ${INK}`,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div style={{ fontSize: size * 0.28, fontWeight: 800, color: INK, lineHeight: 1, letterSpacing: -2 }}>NC</div>
        <div style={{ fontSize: size * 0.065, fontWeight: 800, color: INK, marginTop: size * 0.02 }}>NEPCAB</div>
      </div>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={PIN_SVG} width={size * 0.36} height={size * 0.486} style={{ position: "absolute", left: size * 0.02, top: 0 }} alt="" />
    </div>
  );
}

function Tagline({ size, src }: { size: number; src: string }) {
  const h = size * 1.3;
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} width={h * TAGLINE_RATIO} height={h} alt={BRAND.tagline} />
      <div style={{ width: size * 3.8, height: size * 0.12, background: PIN, borderRadius: 4, marginTop: -size * 0.05 }} />
    </div>
  );
}

export type QrVariant = "sticker" | "og";

export const STICKER_H = 1760;

/** `driverId` null renders the general NepCab QR (no driver attached). */
export async function qrImage(driverId: string | null, link: string, variant: QrVariant, headers?: Record<string, string>) {
  const { city, company } = await getIdentity();
  const pill = driverId ? `Driver: ${driverId}` : link.replace(/^https?:\/\//, "").replace(/\/r$/, "");
  const qr = qrDataUri(link);
  const tagline = await taglineUri();

  const ImageResponse = await imageResponse();

  if (variant === "og") {
    // 1200×630 link preview (WhatsApp, Facebook)
    return new ImageResponse(
      (
        <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", background: BRAND_YELLOW, fontFamily: "Poppins", padding: 50, gap: 56 }}>
          <div style={{ display: "flex", background: "#fff", borderRadius: 36, padding: 18 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qr} width={494} height={494} alt="" />
          </div>
          <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
              <Logo size={110} />
              <div style={{ display: "flex", flexDirection: "column" }}>
                <div style={{ fontSize: 64, fontWeight: 800, color: INK, lineHeight: 1 }}>NEPCAB</div>
                <Tagline size={34} src={tagline} />
              </div>
            </div>
            <div style={{ fontSize: 52, fontWeight: 800, color: INK, lineHeight: 1.1, marginTop: 40 }}>Scan to download the app</div>
            <div style={{ fontSize: 28, fontWeight: 600, color: INK, opacity: 0.75, marginTop: 10 }}>{`Android & iPhone · ${city}`}</div>
            <div style={{ display: "flex", marginTop: 34 }}>
              <div style={{ background: INK, color: "#fff", fontSize: 34, fontWeight: 800, borderRadius: 40, padding: "12px 34px" }}>{pill}</div>
            </div>
            <div style={{ fontSize: 26, fontWeight: 600, color: INK, marginTop: 22 }}>{`NepCab ${city} · By ${company}`}</div>
          </div>
        </div>
      ),
      { width: 1200, height: 630, fonts: await fonts(), headers },
    );
  }

  // 1200×1760 printable sticker: QR is 85% of the width, company line at the bottom
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", background: BRAND_YELLOW, fontFamily: "Poppins" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 30, marginTop: 40 }}>
          <Logo size={180} />
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 104, fontWeight: 800, color: INK, lineHeight: 1 }}>NEPCAB</div>
            <Tagline size={52} src={tagline} />
          </div>
        </div>
        <div style={{ display: "flex", marginTop: 30, background: "#fff", borderRadius: 56, padding: 30 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qr} width={1020} height={1020} alt="" />
        </div>
        <div style={{ fontSize: 64, fontWeight: 800, color: INK, marginTop: 44, lineHeight: 1 }}>Scan to download the app</div>
        <div style={{ fontSize: 40, fontWeight: 600, color: INK, marginTop: 14 }}>Android & iPhone</div>
        <div style={{ display: "flex", marginTop: 26, background: INK, color: "#fff", fontSize: 46, fontWeight: 800, borderRadius: 50, padding: "14px 46px" }}>
          {pill}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 30, fontSize: 34, fontWeight: 600, color: INK }}>
          <span style={{ fontWeight: 800 }}>{`NEPCAB ${city.toUpperCase()}`}</span>
          <span style={{ width: 8, height: 8, borderRadius: 8, background: INK, opacity: 0.5 }} />
          <span>{`By ${company}`}</span>
        </div>
      </div>
    ),
    { width: 1200, height: STICKER_H, fonts: await fonts(), headers },
  );
}
