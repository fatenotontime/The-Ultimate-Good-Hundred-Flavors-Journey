# 至善百味行：GitHub + Netlify 部署指南

本项目已经配置为“源码与发布目录分离”：源码保留在当前 GitHub 仓库中，`npm run build` 会临时生成可直接发布的 `dist/`。`dist/` 已加入 `.gitignore`，不需要、也不应该再次上传到 GitHub。

## 已经为部署完成的准备

- 六个 HTML 页面、CSS、JavaScript、JSON、图片和本地依赖均为静态文件，无服务器端运行环境。
- 三套中文字体已本地化为 WOFF2 字符子集，合计约 1.02 MB；页面不再请求 Google Fonts。
- `package.json` 提供无第三方 npm 依赖的生产构建命令。
- `scripts/build.mjs` 只复制网站运行所需文件，不会把 `docs/`、本地启动脚本、日志或源素材放入发布目录。
- `scripts/verify-dist.mjs` 自动检查 JSON、页面/CSS 相对路径、WOFF2 文件和远程字体残留。
- `netlify.toml` 已指定构建命令、`dist/` 发布目录和 Node.js 22。
- `_headers` 会进入 `dist/`，让自动部署和拖拽部署使用相同的安全头与缓存规则。

当前 GitHub 远程仓库：

```text
https://github.com/fatenotontime/The-Ultimate-Good-Hundred-Flavors-Journey.git
```

## 发布前统一检查

在项目根目录运行：

```powershell
npm run build
```

成功时会显示类似：

```text
Built dist: 177 files, 33.58 MB ...
Verified dist: 177 files, 33.58 MB, 3 WOFF2 fonts, 14 JSON files.
```

每次修改网站内容后都可以重新运行。脚本会安全地删除旧 `dist/`，再完整生成新目录。

## 方式一：连接现有 GitHub 仓库（推荐）

这种方式只需设置一次。以后推送 `main` 分支，Netlify 会自动重建并发布。

### 你需要手动完成

1. 确认本地改动已经提交，然后将 `main` 推送到现有 GitHub 远程：

   ```powershell
   git push github main
   ```

2. 登录 [Netlify](https://app.netlify.com/)，选择 **Add new project → Import an existing project**。
3. 选择 GitHub，并授权 Netlify 读取仓库。
4. 选择 `fatenotontime/The-Ultimate-Good-Hundred-Flavors-Journey`。
5. Netlify 应从 `netlify.toml` 自动读到以下设置：

   | 设置 | 值 |
   |---|---|
   | Base directory | 留空（仓库根目录） |
   | Build command | `npm run build` |
   | Publish directory | `dist` |
   | Production branch | `main` |
   | Node.js | `22` |

6. 点击 **Deploy**。构建日志同时出现 `Built dist` 和 `Verified dist` 即表示发布文件已通过检查。

不要在 Netlify 中添加 SPA 重定向规则。本项目使用真实的 `province.html`、`detail.html` 等页面和查询参数；把所有路径重写到 `index.html` 会掩盖文件错误。

## 方式二：直接拖拽 dist

适合首次演示或不想授权 GitHub 时使用。

1. 在项目根目录运行：

   ```powershell
   npm run build
   ```

2. 打开 [Netlify Drop](https://app.netlify.com/drop)。
3. 将项目里的整个 `dist` 文件夹拖入网页。
4. 等待 Netlify 给出站点地址。

以后更新时，再运行一次 `npm run build`，把新生成的整个 `dist/` 重新拖入该站点的 Deploys 页面。`dist/` 只是发布成品，不是第二个仓库，也不上传到 GitHub。

## 上线后必须检查

用 Netlify 提供的域名逐一打开：

- `/` 或 `/index.html`
- `/province.html?id=anhui`
- `/detail.html?province=anhui&dish=diguoji`
- `/practice.html?id=anhui`
- `/game.html`
- `/about.html`

重点操作：

1. 首页地图能完整绘制。
2. 点击省份进入省份页时，不出现黑底白框图样。
3. 使用浏览器后退返回首页时，地图立即显示且可再次点击。
4. 浏览器开发者工具的 Network 中能看到 `.woff2` 来自当前 Netlify 域名。
5. Network 中没有 `fonts.googleapis.com` 或 `fonts.gstatic.com` 请求。
6. 安徽菜品、社会实践图片、小游戏器具和 JSON 数据没有 404。

## 更新字体时的注意事项

当前 WOFF2 是根据网站现有 HTML、JavaScript 和 JSON 中的 1446 个字符裁剪的。新增汉字时，系统字体回退仍能显示文字，但样式可能不完全一致。新增大量文案后，应重新生成三个字体子集，再运行 `npm run build`；不要把完整的 17–25 MB Noto 原字体直接放进仓库。

## 自定义域名（可选，手动）

在 Netlify 站点中打开 **Domain management**：

1. 可先修改 Netlify 提供的站点子域名。
2. 如有自有域名，选择 **Add a domain**。
3. 按 Netlify 给出的记录修改域名服务商 DNS。
4. 等待 DNS 生效和 HTTPS 证书签发。

域名、DNS 和账号授权都涉及外部账户，需由你本人操作。

## 回滚

Netlify 会保留历史发布。在站点的 **Deploys** 页面选择最近一次正常版本，再选择 **Publish deploy** 即可回滚。GitHub 源码不会因为 Netlify 回滚而改变。

## 常见问题

### dist 要不要提交到已有仓库？

不要。源码、字体子集、构建脚本、`netlify.toml` 和 `_headers` 需要提交；`dist/` 由本地或 Netlify 根据这些源码生成，已经被 `.gitignore` 忽略。

### 为什么还要 dist？

它隔离了“开发资料”和“真正上线的文件”。Netlify 最终只收到约 33.58 MB 的网站运行文件，不会发布 Word 文档、设计记录、本地批处理、日志和以后可能加入的处理脚本。

### 拖拽部署和 GitHub 自动部署选哪个？

长期使用选择 GitHub 自动部署；临时展示选择拖拽。两种方式使用同一份构建结果和校验规则。
