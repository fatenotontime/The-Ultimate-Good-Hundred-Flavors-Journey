import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";

const source = await readFile(new URL("../js/recipe-matcher.js", import.meta.url), "utf8");
const sandbox = { window: {} };
vm.runInNewContext(source, sandbox, { filename: "js/recipe-matcher.js" });

const { findMatches } = sandbox.window.RecipeMatcher;
const recipes = [
  { id: "exact-a", utensil: "wok", ingredients: ["面粉", "鸡蛋"] },
  { id: "exact-b", utensil: "wok", ingredients: ["鸡蛋", "面粉"] },
  { id: "subset", utensil: "wok", ingredients: ["面粉"] },
  { id: "other-utensil", utensil: "steamer", ingredients: ["面粉", "鸡蛋"] },
];

assert.deepEqual(
  findMatches(recipes, "wok", { 面粉: 1, 鸡蛋: 1 }).map(recipe => recipe.id),
  ["exact-a", "exact-b"],
  "identical signatures should all be returned",
);
assert.deepEqual(
  findMatches(recipes, "wok", { 面粉: 1, 鸡蛋: 1, 葱: 1 }),
  [],
  "extra ingredient names should reject an otherwise matching recipe",
);
assert.deepEqual(
  findMatches(recipes, "wok", { 面粉: 2 }),
  [recipes[2]],
  "duplicate quantities should not change set equality",
);
assert.deepEqual(
  findMatches(recipes, "wok", { 鸡蛋: 1 }),
  [],
  "missing ingredients should reject a recipe",
);

const actualRecipeData = JSON.parse(
  await readFile(new URL("../data/recipes.json", import.meta.url), "utf8"),
);
assert.equal(actualRecipeData.recipes.length, 17, "the approved recipe list should contain 17 dishes");
assert.equal(
  actualRecipeData.recipes.some(recipe => recipe.id === "er-yue-er-zhou"),
  false,
  "二月二杂粮粥 should be removed from the game",
);
for (const recipe of actualRecipeData.recipes) {
  const items = Object.fromEntries(recipe.ingredients.map(name => [name, 1]));
  const matchedIds = findMatches(actualRecipeData.recipes, recipe.utensil, items).map(match => match.id);
  assert(
    matchedIds.includes(recipe.id),
    `${recipe.id} should be returned for its documented utensil and exact ingredient set`,
  );
}

console.log("Recipe matcher tests passed: fixtures and all 17 production recipes.");
