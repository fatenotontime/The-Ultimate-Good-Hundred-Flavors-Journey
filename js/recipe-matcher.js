/* ============================================================
   js/recipe-matcher.js — 纯配方匹配逻辑
   ============================================================ */

(() => {
  'use strict';

  function ingredientSetFromItems(items) {
    return new Set(
      Object.entries(items || {})
        .filter(([, count]) => Number(count) > 0)
        .map(([name]) => name)
    );
  }

  function hasExactIngredients(recipe, actualIngredients) {
    const required = new Set(recipe.ingredients || []);
    if (required.size !== actualIngredients.size) return false;
    return [...required].every(name => actualIngredients.has(name));
  }

  function findMatches(recipes, stationId, items) {
    const actualIngredients = ingredientSetFromItems(items);
    return (recipes || []).filter(recipe =>
      recipe.utensil === stationId && hasExactIngredients(recipe, actualIngredients)
    );
  }

  window.RecipeMatcher = Object.freeze({ findMatches });
})();
