# Netlify Deployment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为“至善百味行”建立可重复的 `dist/` 发布流程、本地字体、Netlify 配置与中文部署指南，同时保持 `dist/` 不进入现有 GitHub 仓库。

**Architecture:** 源码继续保存在仓库根目录，零第三方运行依赖的 Node 脚本按白名单复制六个页面及 `assets/`、`css/`、`data/`、`js/` 到临时生成的 `dist/`。Netlify 读取 `netlify.toml` 自动运行同一构建命令；手动拖拽部署也使用同一个 `dist/`，避免两套发布逻辑。

**Tech Stack:** HTML、CSS、原生 JavaScript、Node.js 22 标准库、Netlify、WOFF2、Google Fonts OFL 字体许可。

---

## File structure

- Create `assets/fonts/noto-sans-sc-variable-subset.woff2`: 当前网站字符子集，保留 400–700 字重。
- Create `assets/fonts/noto-serif-sc-variable-subset.woff2`: 当前网站字符子集，保留 400–700 字重。
- Create `assets/fonts/zcool-kuaile-regular-subset.woff2`: 当前网站字符子集，400 字重。
- Create `assets/fonts/LICENSE-*.txt`: 三套字体各自的 OFL 许可证。
- Modify `css/global.css`: 声明本地字体，不再依赖 Google Fonts 网络请求。
- Modify six root `*.html` pages: 删除 Google Fonts 的 `preconnect` 和远程样式表。
- Create `assets/images/decorations/favicon.svg`: 避免浏览器默认请求 `/favicon.ico` 产生 404。
- Create `scripts/build.mjs`: 只将网站运行必需文件复制到 `dist/`。
- Create `scripts/verify-dist.mjs`: 校验发布文件、JSON、相对资源引用、字体签名与远程字体残留。
- Create `package.json`: 提供 `npm run build` 与 `npm run verify:dist`，不引入 npm 依赖。
- Create `netlify.toml`: 指定构建命令、发布目录、Node 版本和安全/缓存响应头。
- Create `_headers`: 让 GitHub 构建和直接拖拽 `dist/` 使用相同的安全/缓存响应头。
- Modify `.gitignore`: 忽略可重复生成的 `dist/`。
- Create `docs/NETLIFY_DEPLOYMENT.md`: 项目专用的 GitHub 连续部署和拖拽部署步骤。
- Modify `README.md`: 增加部署入口并纠正过时的项目状态说明。

### Task 1: Generate and connect local fonts

**Files:**
- Create: `assets/fonts/*.woff2`
- Create: `assets/fonts/LICENSE-*.txt`
- Modify: `css/global.css`
- Modify: `about.html`, `detail.html`, `game.html`, `index.html`, `practice.html`, `province.html`

- [ ] **Step 1: Generate three local WOFF2 files**

Collect unique non-whitespace characters from tracked HTML, JavaScript and JSON files. Subset the installed `NotoSansSC-VF.ttf` and `NotoSerifSC-VF.ttf` to `wght=400:400:700`; download the public full ZCOOL KuaiLe TTF; write three WOFF2 outputs and retain the OFL files.

- [ ] **Step 2: Verify each font is a WOFF2 file**

Run:

```powershell
Get-ChildItem assets/fonts/*.woff2 | ForEach-Object {
  $bytes = [IO.File]::ReadAllBytes($_.FullName)
  [pscustomobject]@{ Name = $_.Name; Signature = [Text.Encoding]::ASCII.GetString($bytes, 0, 4); Bytes = $_.Length }
}
```

Expected: three rows with signature `wOF2` and non-zero sizes.

- [ ] **Step 3: Add local font declarations**

Insert at the top of `css/global.css`:

```css
@font-face {
  font-family: "Noto Sans SC";
  src: url("../assets/fonts/noto-sans-sc-variable-subset.woff2") format("woff2-variations");
  font-style: normal;
  font-weight: 400 700;
  font-display: swap;
}

@font-face {
  font-family: "Noto Serif SC";
  src: url("../assets/fonts/noto-serif-sc-variable-subset.woff2") format("woff2-variations");
  font-style: normal;
  font-weight: 400 700;
  font-display: swap;
}

@font-face {
  font-family: "ZCOOL KuaiLe";
  src: url("../assets/fonts/zcool-kuaile-regular-subset.woff2") format("woff2");
  font-style: normal;
  font-weight: 400;
  font-display: swap;
}
```

- [ ] **Step 4: Remove remote font links**

Delete the two Google preconnect links and the Google Fonts stylesheet link from all six HTML files. Keep `css/global.css` as the first project stylesheet.

- [ ] **Step 5: Verify no deployable source references Google Fonts**

Run:

```powershell
Get-ChildItem *.html,css/*.css | Select-String "fonts.googleapis.com|fonts.gstatic.com"
```

Expected: no output.

### Task 2: Add a deterministic dist build

**Files:**
- Create: `package.json`
- Create: `scripts/build.mjs`
- Modify: `.gitignore`

- [ ] **Step 1: Add dependency-free npm commands**

Create `package.json`:

```json
{
  "name": "zhishan-baiweixing",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "engines": { "node": ">=20" },
  "scripts": {
    "build": "node scripts/build.mjs && node scripts/verify-dist.mjs",
    "verify:dist": "node scripts/verify-dist.mjs"
  }
}
```

- [ ] **Step 2: Implement the allowlist build**

Create `scripts/build.mjs` using `node:fs/promises`. Resolve the repository root from `import.meta.url`, verify that the deletion target is exactly `<repo>/dist`, remove that directory, recreate it, then copy:

```js
const rootFiles = ["index.html", "province.html", "detail.html", "practice.html", "game.html", "about.html", "_headers"];
const directories = ["assets", "css", "data", "js"];
```

Copy nothing else. Print the output file count, byte size and absolute `dist` path.

- [ ] **Step 3: Ignore generated output**

Append to `.gitignore`:

```gitignore
# Netlify/手动部署的可重复生成目录
dist/
```

- [ ] **Step 4: Build once**

Run: `npm run build`

Expected: `dist/index.html` exists; `docs/`, `scripts/`, `README.md`, `启动网页.bat` and logs are absent from `dist/`.

### Task 3: Verify deploy artifacts

**Files:**
- Create: `scripts/verify-dist.mjs`

- [ ] **Step 1: Validate the output boundary**

Assert that `dist/` contains exactly these top-level names:

```js
new Set(["index.html", "province.html", "detail.html", "practice.html", "game.html", "about.html", "_headers", "assets", "css", "data", "js"])
```

- [ ] **Step 2: Validate data and fonts**

Recursively parse every `dist/data/**/*.json`. Read every `dist/assets/fonts/*.woff2` and assert that the first four bytes are `wOF2`.

- [ ] **Step 3: Validate static references**

Read all built HTML and CSS files. Resolve local `src=`, `href=` and CSS `url(...)` references after stripping query strings and fragments. Skip `http:`, `https:`, `data:`, `mailto:`, `tel:`, `javascript:` and fragment-only references. Fail when a resolved local file does not exist.

- [ ] **Step 4: Reject remote fonts**

Fail when any deploy file includes `fonts.googleapis.com` or `fonts.gstatic.com`.

- [ ] **Step 5: Print a concise success report**

Expected format:

```text
Verified dist: <file count> files, <size> MB, 3 WOFF2 fonts, <JSON count> JSON files.
```

### Task 4: Configure Netlify

**Files:**
- Create: `netlify.toml`
- Create: `_headers`

- [ ] **Step 1: Define build settings**

```toml
[build]
  command = "npm run build"
  publish = "dist"

[build.environment]
  NODE_VERSION = "22"
```

- [ ] **Step 2: Add safe response headers**

Create root `_headers`, copy it into `dist/`, and add `X-Content-Type-Options = "nosniff"`, `X-Frame-Options = "SAMEORIGIN"`, `Referrer-Policy = "strict-origin-when-cross-origin"` and a permissions policy disabling camera, microphone and geolocation. Set HTML to `max-age=0, must-revalidate`; set images and fonts to a seven-day public cache because filenames are currently not content-hashed. Keeping `_headers` inside the publish directory makes these rules work for both connected-repository builds and drag-and-drop deployment.

- [ ] **Step 3: Avoid an SPA redirect**

Do not add `/* /index.html 200`: the site uses real HTML files and query parameters, so an SPA fallback would hide missing-file mistakes.

### Task 5: Write the project-specific guide

**Files:**
- Create: `docs/NETLIFY_DEPLOYMENT.md`
- Modify: `README.md`

- [ ] **Step 1: Document the recommended GitHub flow**

Use the existing remote `https://github.com/fatenotontime/The-Ultimate-Good-Hundred-Flavors-Journey.git`. Explain that source files, font artifacts, scripts and `netlify.toml` are committed; `dist/` is not committed. The user manually pushes `main`, imports the repository in Netlify, and confirms the values read from `netlify.toml`.

- [ ] **Step 2: Document drag-and-drop deployment**

Run `npm run build`, open `https://app.netlify.com/drop`, and drag only the generated `dist/` directory. Explain that a later rebuild replaces `dist/` locally; it does not create a second GitHub repository.

- [ ] **Step 3: Document manual account steps**

List GitHub push/authentication, Netlify repository authorization, optional site rename/custom domain/DNS, and post-deploy visual checks as manual actions.

- [ ] **Step 4: Add validation and rollback steps**

Include `npm run build`, the six important URLs, browser back-navigation on the map, Network verification for local WOFF2, and Netlify’s deploy rollback UI.

- [ ] **Step 5: Link the guide from README**

Add a short “部署” section that links to `docs/NETLIFY_DEPLOYMENT.md` and states that `dist/` is generated, ignored, and should not be pushed.

### Task 6: Final verification and commit

**Files:** all files above

- [ ] **Step 1: Run the production build twice**

Run `npm run build` twice. Expected: both passes succeed and produce the same file count; the second pass proves `dist/` replacement is deterministic.

- [ ] **Step 2: Check repository boundaries**

Run `git status --short --ignored`. Expected: source/config/font changes are visible; `dist/` appears only as ignored; no temporary download or Python package directory remains.

- [ ] **Step 3: Inspect the generated site over HTTP**

Serve `dist/` locally and load `index.html`, `province.html?id=anhui`, `detail.html?province=anhui&dish=diguoji`, `practice.html?id=anhui`, `game.html` and `about.html`. Confirm HTTP 200 for pages, CSS, JSON, images, SVG, vendor scripts and fonts.

- [ ] **Step 4: Commit without pushing**

```bash
git add .gitignore package.json netlify.toml scripts assets/fonts css/global.css *.html docs/NETLIFY_DEPLOYMENT.md README.md docs/superpowers/plans/2026-08-18-netlify-deployment.md
git commit -m "build: prepare Netlify deployment"
```

Do not push; GitHub authentication and the external deployment remain manual user actions.
