# 至善百味行 — 搭建进度说明

本文件记录依据《至善百味行网站设计思路书.docx》搭建网站的进度。

## 部署

项目已配置本地 WOFF2 字体、独立 `dist/` 发布目录和 Netlify 构建校验。完整操作见 [Netlify 部署指南](docs/NETLIFY_DEPLOYMENT.md)。

```powershell
npm run build
```

`dist/` 是可重复生成的发布成品，已被 Git 忽略，不需要提交到现有 GitHub 仓库；连接 GitHub 后由 Netlify 自动生成，手动部署时则直接拖拽该目录。

## 已完成（严格遵循设计文档）

### 第一层 · 首页地图

| 文件 | 对应设计文档章节 | 说明 |
| --- | --- | --- |
| `index.html` | 2.4 第一层 / 2.5 公共元素 / 2.6 动效 | 首页结构：导航栏、地图容器、卷轴浮窗、页脚 |
| `css/global.css` | 2.2 色彩体系 / 2.3 字体方案 / 2.5 | 国风 CSS 变量、宣纸纹理、磨砂导航、页脚、占位页样式 |
| `css/map.css` | 2.1 / 2.2 / 2.4 / 2.6 | 地图容器、省份悬停效果、卷轴浮窗、装饰元素 |
| `js/map.js` | 2.6 GSAP 动效 / 4.1 / 4.4 | 分三波描绘动画、悬停高亮+浮窗、点击淡出跳转 |
| `js/cursor.js` | 2.1 视觉基调 | 国风圆形跟随光标（仿 seu.edu.cn，竹青/杏黄配色） |
| `js/utils.js` | 3.2 目录结构 | 通用工具函数（fetchJSON、懒加载、URL 参数等） |
| `data/provinces.json` | 4.1 省份索引字段 | 34 个省级行政区：id、名称、简称、填充/悬停色、标签、特征、菜品数 |
| `fetch_map_data.py` | 3.2 assets/map/china.svg | 从 DataV GeoAtlas 获取 GeoJSON 生成 china.svg（动态贴合 viewBox） |
| `assets/map/china.svg` | 2.4 第一层 | 34 省完整地理数据（投影 Y 轴已修正、viewBox 精确贴合） |

### 第二层 · 省份美食列表页

| 文件 | 对应设计文档章节 | 说明 |
| --- | --- | --- |
| `province.html` | 2.4 第二层 / 3.3 路由 | 省份美食列表页（通用模板，URL 参数 ?id=xxx 驱动） |
| `css/province.css` | 2.4 / 2.5 / 2.6 | 横幅、卡片网格（2~4 列自适应）、面包屑、未完待续空状态 |
| `js/province.js` | 2.4 / 3.3 / 4.1 / 4.4 | 加载省份数据渲染横幅+卡片；无数据时以烹饪语气展示「未完待续」 |
| `data/provinces/anhui.json` | 4.1 省份详细数据 | 安徽 3 道菜：地锅鸡配锅贴、煎饺抱蛋、蛋花汤 |
| `process_images.py` | 4.2 图片处理流程 | 裁剪 4:3、生成 WebP 缩略图（400×300）/大图（1200×800）/横幅（1920×400） |
| `collect_icons.py` | 第五章图标采集 | 纯标准库批量从 Iconify 下载 SVG 图标（Tabler+MingCute），无需 API Key |
| `docs/game-design.md` | 第五章游戏设计 | 配方结构、器具、图标获取方案（已实际采集 34 个图标） |

### 图片素材（assets/images/provinces/anhui/）

| 文件 | 规格 | 对应菜品 |
| --- | --- | --- |
| `diguoji-thumb.webp` / `diguoji-full.webp` | 400×300 / 1200×800 | 地锅鸡配锅贴 |
| `jianjiao-baodan-thumb.webp` / `jianjiao-baodan-full.webp` | 400×300 / 1200×800 | 煎饺抱蛋 |
| `danhuatang-thumb.webp` / `danhuatang-full.webp` | 400×300 / 1200×800 | 蛋花汤 |
| `banner.webp` | 1920×400 | 省份横幅 |

### 游戏图标（assets/images/ingredients/）

| 文件 | 说明 |
| --- | --- |
| `*.svg` | 34 个 SVG 图标（竹青色 #789262，已验证可用） |
| `ingredients-sprite.svg` | SVG Sprite 合并文件（减少 HTTP 请求） |
| `collect_report.json` | 本次采集详细报告 |

### 第四层 · 至善小当家 & 关于（占位）

| 文件 | 对应设计文档章节 | 说明 |
| --- | --- | --- |
| `game.html` | 2.4 第四层 / 2.5 | 「至善小当家」占位页：正在开发，风格与全局统一 |
| `about.html` | 2.5 | 「关于」占位页：正在开发，风格与全局统一 |
| `detail.html` | 2.4 第三层 / 2.5 | 「美食详情页」占位页：动态面包屑（首页>省名>菜名），风格统一 |
| `css/detail.css` | 2.4 第三层 / 2.5 | 详情页占位样式 |

## 待完成

- `data/provinces/{其余省份}.json`：仅安徽有图片素材，其余省份展示「未完待续」
- `data/recipes.json`：小游戏配方表（第五章）
- `assets/images/utensils/`：器具 SVG 图标（铁锅/蒸笼/砂锅/烧烤架/蒸锅）

## 如何继续

```bash
python process_images.py    # 处理 image/ 下的新图片素材（自动生成 WebP）
python fetch_map_data.py    # 重新生成 assets/map/china.svg
# 本地预览：
python -m http.server 8080  # 或双击「启动网页.bat」
# 浏览器打开 http://localhost:8080
```

## 预览入口

- 首页地图：`http://localhost:8080/index.html`
- 省份页（有数据）：`http://localhost:8080/province.html?id=anhui`
- 省份页（未完待续）：`http://localhost:8080/province.html?id=beijing`
- 菜品详情页（占位）：`http://localhost:8080/detail.html?province=anhui&dish=diguoji`
- 至善小当家：`http://localhost:8080/game.html`
- 关于：`http://localhost:8080/about.html`
