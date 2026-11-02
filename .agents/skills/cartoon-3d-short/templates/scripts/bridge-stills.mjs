// usage: node scripts/bridge-stills.mjs <outPrefix> <frame,frame,...> [scale]  (bundles once, GPU via ANGLE, jpeg)
// BRIDGE_ENTRY=src/sandboxes/<name>/index.tsx renders a sandbox copy instead of the main project entry.
import fs from "node:fs";
import path from "node:path";
if (process.env.REMOTION_TMP) {
  fs.mkdirSync(process.env.REMOTION_TMP, { recursive: true });
  process.env.TEMP = process.env.TMP = process.env.REMOTION_TMP;
}
import { bundle } from "@remotion/bundler";
import { renderStill, selectComposition } from "@remotion/renderer";

const [prefix, frames = "100", scale = "0.5"] = process.argv.slice(2);
fs.mkdirSync(path.dirname(path.resolve(prefix + "0.jpg")), { recursive: true });
const browserExecutable = fs.existsSync("C:/Program Files/Google/Chrome/Application/chrome.exe")
  ? "C:/Program Files/Google/Chrome/Application/chrome.exe"
  : undefined;
const chromiumOptions = { gl: "angle" };
const serveUrl = await bundle({
  entryPoint: path.resolve(process.env.BRIDGE_ENTRY || "src/index.ts"),
  publicDir: path.resolve("public"),
});
try {
  const composition = await selectComposition({
    serveUrl,
    id: process.env.COMP_ID || "BridgeShort",
    browserExecutable,
    chromiumOptions,
  });
  const onBrowserLog = (l) => {
    if (l.type === "error" || l.type === "warning") console.log(`[${l.type}]`, l.text.slice(0, 300));
  };
  for (const f of frames.split(",").map(Number)) {
    const t0 = Date.now();
    await renderStill({
      composition,
      serveUrl,
      frame: f,
      output: `${prefix}${f}.jpg`,
      imageFormat: "jpeg",
      jpegQuality: 88,
      scale: Number(scale),
      browserExecutable,
      chromiumOptions,
      timeoutInMilliseconds: 180000,
      onBrowserLog,
    });
    console.log("still", f, ((Date.now() - t0) / 1000).toFixed(1) + "s");
  }
} finally {
  try {
    if (serveUrl && fs.existsSync(serveUrl)) {
      fs.rmSync(serveUrl, { recursive: true, force: true });
    }
  } catch {}
}
