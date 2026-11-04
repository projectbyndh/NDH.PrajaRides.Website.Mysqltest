// Runs before every production build (npm "prebuild"). Fails with a clear message when a setting
// the build needs is missing, then prints the Next.js settings that will actually be used, so a
// host that changes or ignores next.config.mjs shows up in its build log.
import nextEnv from "@next/env";
import { PHASE_PRODUCTION_BUILD } from "next/constants.js";
import loadConfig from "next/dist/server/config.js";

const dir = process.cwd();
nextEnv.loadEnvConfig(dir, false, { info: () => {}, error: console.error });

if (!process.env.NEXT_PUBLIC_SITE_URL) {
  console.error(
    "\nNEXT_PUBLIC_SITE_URL is not set. Add NEXT_PUBLIC_SITE_URL=https://prajaride.com to the server's environment variables" +
      " (.env / .env.production, or the hosting panel) before building: QR codes, shared links and the sitemap use it.\n",
  );
  process.exit(1);
}

const config = await (loadConfig.default ?? loadConfig)(PHASE_PRODUCTION_BUILD, dir, { silent: true });
const checks = {
  cacheComponents: config.cacheComponents === true,
  "serverActions.bodySizeLimit 4mb": config.experimental?.serverActions?.bodySizeLimit === "4mb",
  "security headers": typeof config.headers === "function",
};
console.log(`Build check: site ${process.env.NEXT_PUBLIC_SITE_URL}; Next.js settings: ${Object.entries(checks).map(([k, ok]) => `${k} ${ok ? "ok" : "MISSING"}`).join(", ")}`);
// next.config.mjs does not set `output`, so a value here was added by the build environment.
// A standalone build is started by running its own server.js, which is not what `npm start` does:
// if a host launches both, two servers race for the same port and one of them dies.
if (config.output) {
  console.log(
    `Build check: this host set output: "${config.output}" - next.config.mjs does not. Start the app` +
      " one way only (its entry file, or npm start), or two servers will compete for the port.",
  );
}

if (Object.values(checks).includes(false)) {
  console.error("\nnext.config.mjs settings are not being applied by this build environment (see the list above).\n");
  process.exit(1);
}
