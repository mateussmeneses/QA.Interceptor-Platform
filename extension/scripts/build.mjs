import { build, context } from "esbuild";
import { copyFile, cp, mkdir } from "node:fs/promises";
import path from "node:path";

const isWatch = process.argv.includes("--watch");
const rootDir = path.resolve(process.cwd());
const distDir = path.join(rootDir, "dist");

const sharedOptions = {
  bundle: true,
  format: "esm",
  sourcemap: true,
  target: "es2022",
  logLevel: "info"
};

const tasks = [
  {
    entryPoints: [path.join(rootDir, "src", "background", "index.ts")],
    outfile: path.join(distDir, "background.js")
  },
  {
    entryPoints: [path.join(rootDir, "src", "sidepanel", "main.ts")],
    outfile: path.join(distDir, "sidepanel.js")
  },
  {
    entryPoints: [path.join(rootDir, "src", "content", "injector.ts")],
    outfile: path.join(distDir, "content-injector.js")
  },
  {
    entryPoints: [path.join(rootDir, "src", "content", "mock-bridge.ts")],
    outfile: path.join(distDir, "mock-bridge.js")
  }
];

await mkdir(distDir, { recursive: true });
await copyFile(
  path.join(rootDir, "src", "sidepanel", "index.html"),
  path.join(distDir, "sidepanel.html")
);
await cp(path.join(rootDir, "src", "sidepanel", "styles"), path.join(distDir, "styles"), {
  recursive: true,
  force: true
});

if (isWatch) {
  for (const task of tasks) {
    const ctx = await context({ ...sharedOptions, ...task });
    await ctx.watch();
  }
  console.log("Watching extension bundles...");
} else {
  await Promise.all(tasks.map((task) => build({ ...sharedOptions, ...task })));
}
