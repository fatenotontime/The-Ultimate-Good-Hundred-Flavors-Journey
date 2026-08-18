# Recipe and Netlify Deployment Finalization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Correct recipe matching and selected recipe data, ship tofu and lightweight ingredient images, and harden the Netlify production build.

**Architecture:** Extract exact-set recipe matching into a small browser-global module that is independently testable. Keep recipe content in JSON, let `game.js` render one or many matches, and make the build pipeline validate cross-file data plus remove source-only PNG assets from `dist`.

**Tech Stack:** Static HTML/CSS/JavaScript, JSON, Node.js 22 build scripts, Sharp for one-time image conversion, Playwright/Edge for browser regression.

---

### Task 1: Exact-set recipe matcher

**Files:**
- Create: `js/recipe-matcher.js`
- Create: `scripts/test-recipe-matcher.mjs`
- Modify: `game.html`
- Modify: `js/game.js`
- Modify: `css/game.css`

- [ ] Write a Node test that loads the browser-global matcher in a VM and asserts exact matching, rejection of extra/missing ingredients, and two returned results for duplicate signatures.
- [ ] Run `node scripts/test-recipe-matcher.mjs` and confirm it fails because the matcher file does not exist.
- [ ] Implement `RecipeMatcher.findMatches(recipes, stationId, stationItems)` using equality of unique ingredient-name sets and returning every match.
- [ ] Load `js/recipe-matcher.js` before `js/game.js` in `game.html`.
- [ ] Replace `checkRecipe()` with an all-result lookup and update `onStationClick()` to pass an array to the result renderer.
- [ ] Update the result overlay so one match uses the existing card and multiple matches render all cards in a scrollable responsive grid.
- [ ] Run the matcher test and `node --check js/recipe-matcher.js`.

### Task 2: Approved recipe and province-data changes

**Files:**
- Modify: `data/recipes.json`
- Modify: `data/provinces/shandong.json`
- Modify: `data/provinces/tianjin.json`

- [ ] Remove the `er-yue-er-zhou` recipe and the `yuer-sanbai`山东 dish entry.
- [ ] Change utensils: 煎饺抱蛋→铁锅、耳朵眼炸糕→铁锅、熟梨糕→蒸屉、红烧牛窝骨→砂锅.
- [ ] Change 煎饼果子 ingredients from 面粉/鸡蛋/猪肉 to 面粉/鸡蛋/葱 in both data files.
- [ ] Remove 糯米 from 王哥庄大馒头 in both data files.
- [ ] Add 豆腐 to 八珍豆腐 in both data files while retaining the existing supporting ingredients.
- [ ] Parse all modified JSON with Node and confirm the recipe count is 17 and山东 dish count is 2.

### Task 3: Tofu and lightweight ingredient assets

**Files:**
- Create: `assets/images/ingredients/*.webp` for all twelve ingredients
- Modify: `js/ingredients.js`
- Modify: `js/game.js`

- [ ] Use bundled Sharp to resize each source ingredient PNG to fit within 240×240, preserve alpha, and encode WebP.
- [ ] Register `{ name: '豆腐', icon: 'tofu' }` in the ingredient catalog.
- [ ] Change ingredient-list, tray and recipe-book paths from `.png` to `.webp`.
- [ ] Verify every ingredient WebP exists, is at most 240×240, and total bytes are substantially below the source PNG total.

### Task 4: Production asset pruning and cross-data verification

**Files:**
- Modify: `scripts/build.mjs`
- Modify: `scripts/verify-dist.mjs`
- Modify: `package.json`

- [ ] After copying assets, remove only `dist/assets/images/ingredients/*.png` and `dist/assets/images/kitchen/*.png`; keep source files untouched.
- [ ] Add recipe validation for unique IDs, known ingredient names, existing thumbnail/link targets, and duplicate utensil-plus-ingredient signatures.
- [ ] Assert that ingredient and kitchen PNG files are absent from `dist` and corresponding WebP ingredient files exist.
- [ ] Add `test:recipes` script for the pure matcher regression test and run it before the build in verification.

### Task 5: Netlify configuration and documentation

**Files:**
- Modify: `_headers`
- Modify: `docs/NETLIFY_DEPLOYMENT.md`
- Modify: `README.md` if generated size statements are stale

- [ ] Add an explicit `/` cache rule matching the HTML no-cache rule.
- [ ] Change the practice smoke-test URL to `/practice.html?province=anhui`.
- [ ] Update documented build size after the final production build.

### Task 6: Fresh verification

**Files:**
- Verify only; do not push or deploy.

- [ ] Run `npm run test:recipes` and require zero failures.
- [ ] Run `node --check` for changed JavaScript files.
- [ ] Run `npm run build` and require successful build and dist verification.
- [ ] Confirm `dist` contains no ingredient/kitchen PNG source assets and record old/new byte totals.
- [ ] Start a local server from `dist` and run browser smoke tests for homepage map, province navigation/back, game ingredients, recipe overlay, all retained recipe detail links, and 390px mobile layout.
- [ ] Run `git diff --check`, inspect `git diff --stat`, and report that changes remain local and unpushed.
