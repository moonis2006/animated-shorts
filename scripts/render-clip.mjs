// usage: node scripts/render-clip.mjs [startFrame] [endFrame] [scale] [outPath]
import fs from "node:fs";
import path from "node:path";
import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";

const [startFrame = "990", endFrame = "1130", scale = "0.5", outPath = "out/bridge/clip_5s.mp4"] = process.argv.slice(2);
fs.mkdirSync(path.dirname(path.resolve(outPath)), { recursive: true });

const browserExecutable = fs.existsSync("C:/Program Files/Google/Chrome/Application/chrome.exe")
  ? "C:/Program Files/Google/Chrome/Application/chrome.exe"
  : undefined;
const chromiumOptions = { gl: "angle" };
const inputProps = { post: { dpr: Number(scale) } };

console.log("Bundling project...");
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
    inputProps,
  });

  const totalFrames = Number(endFrame) - Number(startFrame) + 1;
  const t0 = Date.now();
  let lastLogged = -1;
  await renderMedia({
    composition,
    serveUrl,
    codec: "h264",
    crf: 18,
    frameRange: [Number(startFrame), Number(endFrame)],
    scale: Number(scale),
    inputProps,
    outputLocation: path.resolve(outPath),
    browserExecutable,
    chromiumOptions,
    concurrency: 2,
    timeoutInMilliseconds: 180000,
    onProgress: ({ renderedFrames }) => {
      if (renderedFrames % 25 === 0 && renderedFrames !== lastLogged) {
        lastLogged = renderedFrames;
        const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
        console.log(`Progress: ${renderedFrames}/${totalFrames} frames rendered (${elapsed}s)`);
      }
    },
  });
  console.log(`Done! Saved 5s video to ${outPath} in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
} finally {
  try {
    if (serveUrl && fs.existsSync(serveUrl)) {
      fs.rmSync(serveUrl, { recursive: true, force: true });
    }
  } catch {}
}
