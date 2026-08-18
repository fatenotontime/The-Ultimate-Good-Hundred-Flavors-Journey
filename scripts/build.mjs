import { cp, mkdir, readdir, rm, stat } from "node:fs/promises";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const repositoryRoot = resolve(scriptDirectory, "..");
const outputDirectory = join(repositoryRoot, "dist");

const rootFiles = [
  "index.html",
  "province.html",
  "detail.html",
  "practice.html",
  "game.html",
  "about.html",
  "_headers",
];
const directories = ["assets", "css", "data", "js"];

if (dirname(outputDirectory) !== repositoryRoot || basename(outputDirectory) !== "dist") {
  throw new Error(`Refusing to replace unexpected output directory: ${outputDirectory}`);
}

await rm(outputDirectory, { recursive: true, force: true });
await mkdir(outputDirectory, { recursive: true });

for (const rootFile of rootFiles) {
  await cp(join(repositoryRoot, rootFile), join(outputDirectory, rootFile));
}

for (const directory of directories) {
  await cp(join(repositoryRoot, directory), join(outputDirectory, directory), {
    recursive: true,
  });
}

async function removeSourcePngs(relativeDirectory) {
  const directory = join(outputDirectory, relativeDirectory);
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (entry.isFile() && entry.name.toLowerCase().endsWith(".png")) {
      await rm(join(directory, entry.name));
    }
  }
}

await removeSourcePngs(join("assets", "images", "ingredients"));
await removeSourcePngs(join("assets", "images", "kitchen"));

async function summarize(directory) {
  let fileCount = 0;
  let totalBytes = 0;

  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const entryPath = join(directory, entry.name);
    if (entry.isDirectory()) {
      const child = await summarize(entryPath);
      fileCount += child.fileCount;
      totalBytes += child.totalBytes;
    } else if (entry.isFile()) {
      fileCount += 1;
      totalBytes += (await stat(entryPath)).size;
    }
  }

  return { fileCount, totalBytes };
}

const { fileCount, totalBytes } = await summarize(outputDirectory);
console.log(
  `Built dist: ${fileCount} files, ${(totalBytes / 1024 / 1024).toFixed(2)} MB at ${outputDirectory}`,
);
