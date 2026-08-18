import { access, readFile, readdir, stat } from "node:fs/promises";
import { dirname, extname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const repositoryRoot = resolve(scriptDirectory, "..");
const outputDirectory = join(repositoryRoot, "dist");
const expectedTopLevel = new Set([
  "index.html",
  "province.html",
  "detail.html",
  "practice.html",
  "game.html",
  "about.html",
  "_headers",
  "assets",
  "css",
  "data",
  "js",
]);
const textExtensions = new Set(["", ".html", ".css", ".js", ".json", ".svg", ".txt"]);
const skippedSchemes = /^(?:https?:|data:|mailto:|tel:|javascript:|blob:)/i;

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function collectFiles(directory) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const entryPath = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await collectFiles(entryPath)));
    else if (entry.isFile()) files.push(entryPath);
  }
  return files;
}

function normalizeReference(reference) {
  const trimmed = reference.trim();
  if (!trimmed || trimmed.startsWith("#") || skippedSchemes.test(trimmed) || trimmed.startsWith("//")) {
    return null;
  }

  const withoutFragment = trimmed.split("#", 1)[0];
  const withoutQuery = withoutFragment.split("?", 1)[0];
  if (!withoutQuery) return null;

  try {
    return decodeURIComponent(withoutQuery);
  } catch {
    return withoutQuery;
  }
}

async function verifyReference(sourceFile, reference) {
  const normalized = normalizeReference(reference);
  if (!normalized) return;

  const target = normalized.startsWith("/")
    ? resolve(outputDirectory, `.${normalized}`)
    : resolve(dirname(sourceFile), normalized);
  const relativeTarget = relative(outputDirectory, target);

  assert(
    relativeTarget !== ".." && !relativeTarget.startsWith(`..\\`) && !relativeTarget.startsWith("../"),
    `${relative(outputDirectory, sourceFile)} references a path outside dist: ${reference}`,
  );

  try {
    await access(target);
  } catch {
    throw new Error(`${relative(outputDirectory, sourceFile)} is missing local reference: ${reference}`);
  }
}

async function verifySiteRootReference(sourceLabel, reference) {
  const normalized = normalizeReference(reference);
  if (!normalized) return;
  const target = resolve(outputDirectory, normalized.replace(/^\//, ""));
  const relativeTarget = relative(outputDirectory, target);
  assert(
    relativeTarget !== ".." && !relativeTarget.startsWith(`..\\`) && !relativeTarget.startsWith("../"),
    `${sourceLabel} references a path outside dist: ${reference}`,
  );
  try {
    await access(target);
  } catch {
    throw new Error(`${sourceLabel} is missing site-root reference: ${reference}`);
  }
}

const topLevelNames = new Set(await readdir(outputDirectory));
assert(topLevelNames.size === expectedTopLevel.size, "dist has an unexpected number of top-level entries");
for (const name of expectedTopLevel) {
  assert(topLevelNames.has(name), `dist is missing top-level entry: ${name}`);
}
for (const name of topLevelNames) {
  assert(expectedTopLevel.has(name), `dist contains unexpected top-level entry: ${name}`);
}

const files = await collectFiles(outputDirectory);
const jsonFiles = files.filter((file) => extname(file).toLowerCase() === ".json");
for (const jsonFile of jsonFiles) {
  try {
    JSON.parse(await readFile(jsonFile, "utf8"));
  } catch (error) {
    throw new Error(`Invalid JSON in ${relative(outputDirectory, jsonFile)}: ${error.message}`);
  }
}

const recipeFile = join(outputDirectory, "data", "recipes.json");
const recipeData = JSON.parse(await readFile(recipeFile, "utf8"));
const recipes = recipeData.recipes || [];
const recipeIds = new Set();
const recipeSignatures = new Map();
const ingredientSource = await readFile(join(outputDirectory, "js", "ingredients.js"), "utf8");
const knownIngredients = new Set(
  [...ingredientSource.matchAll(/\{\s*name:\s*'([^']+)'\s*,\s*icon:/g)].map(match => match[1]),
);
const provinceFiles = jsonFiles.filter(file =>
  dirname(file) === join(outputDirectory, "data", "provinces") && !file.endsWith("-practice.json")
);
const knownDishes = new Set();
for (const provinceFile of provinceFiles) {
  const province = JSON.parse(await readFile(provinceFile, "utf8"));
  for (const dish of province.dishes || []) knownDishes.add(`${province.id}/${dish.id}`);
}

for (const recipe of recipes) {
  assert(recipe.id && !recipeIds.has(recipe.id), `Duplicate or missing recipe id: ${recipe.id}`);
  recipeIds.add(recipe.id);
  assert(Array.isArray(recipe.ingredients) && recipe.ingredients.length > 0, `Recipe has no ingredients: ${recipe.id}`);
  for (const ingredient of recipe.ingredients) {
    assert(knownIngredients.has(ingredient), `Recipe ${recipe.id} uses unknown ingredient: ${ingredient}`);
  }
  await verifySiteRootReference(`Recipe ${recipe.id}`, recipe.thumbnail);

  const detailUrl = new URL(recipe.link, "https://static.example/");
  const provinceId = detailUrl.searchParams.get("province");
  const dishId = detailUrl.searchParams.get("dish");
  assert(
    detailUrl.pathname.endsWith("/detail.html") && knownDishes.has(`${provinceId}/${dishId}`),
    `Recipe ${recipe.id} has an invalid detail link: ${recipe.link}`,
  );

  const signature = `${recipe.utensil}|${[...new Set(recipe.ingredients)].sort().join(",")}`;
  const matchingIds = recipeSignatures.get(signature) || [];
  matchingIds.push(recipe.id);
  recipeSignatures.set(signature, matchingIds);
}

const repeatedSignatures = [...recipeSignatures.entries()].filter(([, ids]) => ids.length > 1);
if (repeatedSignatures.length > 0) {
  console.log(
    "Allowed multi-result recipe signatures:",
    repeatedSignatures.map(([signature, ids]) => `${signature} => ${ids.join(", ")}`).join("; "),
  );
}

const ingredientOutput = join(outputDirectory, "assets", "images", "ingredients");
const kitchenOutput = join(outputDirectory, "assets", "images", "kitchen");
const ingredientNames = await readdir(ingredientOutput);
const kitchenNames = await readdir(kitchenOutput);
assert(!ingredientNames.some(name => name.toLowerCase().endsWith(".png")), "dist contains source ingredient PNG files");
assert(!kitchenNames.some(name => name.toLowerCase().endsWith(".png")), "dist contains source kitchen PNG files");
assert(
  ingredientNames.filter(name => name.toLowerCase().endsWith(".webp")).length === knownIngredients.size,
  "dist ingredient WebP count does not match the ingredient catalog",
);

const fontFiles = files.filter((file) => extname(file).toLowerCase() === ".woff2");
assert(fontFiles.length === 3, `Expected 3 WOFF2 fonts, found ${fontFiles.length}`);
for (const fontFile of fontFiles) {
  const bytes = await readFile(fontFile);
  assert(bytes.length > 4 && bytes.subarray(0, 4).toString("ascii") === "wOF2", `Invalid WOFF2: ${fontFile}`);
}

for (const file of files) {
  if (!textExtensions.has(extname(file).toLowerCase())) continue;
  const content = await readFile(file, "utf8");
  assert(!/fonts\.(?:googleapis|gstatic)\.com/i.test(content), `Remote Google Font reference in ${file}`);

  if (extname(file).toLowerCase() === ".html") {
    for (const match of content.matchAll(/(?:src|href)\s*=\s*["']([^"']+)["']/gi)) {
      await verifyReference(file, match[1]);
    }
  }

  if (extname(file).toLowerCase() === ".css") {
    for (const match of content.matchAll(/url\(\s*(["']?)(.*?)\1\s*\)/gi)) {
      await verifyReference(file, match[2]);
    }
  }
}

let totalBytes = 0;
for (const file of files) totalBytes += (await stat(file)).size;
console.log(
  `Verified dist: ${files.length} files, ${(totalBytes / 1024 / 1024).toFixed(2)} MB, ${fontFiles.length} WOFF2 fonts, ${jsonFiles.length} JSON files.`,
);
