import { cp, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { build } from "esbuild";

const projectRoot = fileURLToPath(new URL("../", import.meta.url));
const webRoot = path.join(projectRoot, "www");

await mkdir(webRoot, { recursive: true });
await cp(path.join(projectRoot, "index.html"), path.join(webRoot, "index.html"));
await cp(path.join(projectRoot, "manifest.webmanifest"), path.join(webRoot, "manifest.webmanifest"));
await cp(path.join(projectRoot, "sw.js"), path.join(webRoot, "sw.js"));
await cp(path.join(projectRoot, "ASSETS"), path.join(webRoot, "ASSETS"), { recursive: true });
await cp(path.join(projectRoot, "DASHBOARD"), path.join(webRoot, "DASHBOARD"), { recursive: true });

await build({
  entryPoints: [path.join(projectRoot, "native", "native-bridge.js")],
  outfile: path.join(webRoot, "native-bridge.js"),
  bundle: true,
  format: "iife",
  target: ["es2022"]
});

console.log("LovePlay web assets prepared for Capacitor.");
