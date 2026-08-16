# 至善小当家 · 游戏设计文档

> 依据《至善百味行网站设计思路书》第五章「至善小当家交互游戏设计」扩展细化

---

## 一、游戏愿景与定位

「至善小当家」是一款融合中华饮食文化的轻量级拖拽配对游戏。玩家在卡通风格的灶台上，将食材拖入对应的烹饪器具中——当食材组合恰好匹配一道经典菜肴时，即触发成功动画并解锁该菜品的详情介绍。核心体验：**寓教于乐，在搭配的乐趣中记住中国各地风味**。

目标用户：对饮食文化感兴趣的普通访客，无需烹饪知识。

---

## 二、配方数据结构

### 2.1 配方数据（data/recipes.json）

```json
{
  "recipes": [
    {
      "id": "diguoji- DIGUOJI",
      "name": "地锅鸡",
      "province": "anhui",
      "provinceName": "安徽",
      "difficulty": 2,
      "utensil": "铁锅",
      "ingredients": ["鸡肉", "面粉", "青椒", "葱", "姜"],
      "description": "铁锅炖鸡，锅边贴面饼，一锅两吃是皖北冬日暖心菜。",
      "discoveryText": "皖北人家，一锅两吃！地锅鸡配锅贴，酥脆+鲜嫩",
      "unlockDishId": "diguoji"
    }
  ]
}
```

**字段说明：**

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | string | 全局唯一配方 ID |
| `name` | string | 菜名（展示用） |
| `province` | string | 所属省份 ID（关联省份数据） |
| `difficulty` | number | 难度 1-3（1=简单，3=困难） |
| `utensil` | string | 对应烹饪器具（决定放置哪个灶台） |
| `ingredients` | string[] | 必需食材列表（全部放入才成功） |
| `extraIngredients` | string[] | 可选额外食材（放入不影响成功，用于迷惑） |
| `description` | string | 解锁后展示的菜品简介 |
| `discoveryText` | string | 配对成功时的欢呼文案 |
| `unlockDishId` | string | 解锁的菜品 ID（跳转详情页） |

### 2.2 器具类型

```json
{
  "utensils": [
    {
      "id": "tiegua",
      "name": "铁锅",
      "icon": "assets/images/utensils/tiegua.svg",
      "color": "#C04040",
      "description": "大火快炒，爆香代表",
      "tip": "将食材投入锅中，听那一声滋啦"
    },
    {
      "id": "baozilong",
      "name": "蒸笼",
      "icon": "assets/images/utensils/baozi.svg",
      "color": "#D4A44C",
      "description": "文火慢蒸，粉糯软绵",
      "tip": "食材入笼，炊烟起时味正浓"
    },
    {
      "id": "shaokaojia",
      "name": "烧烤架",
      "icon": "assets/images/utensils/shaokao.svg",
      "color": "#C04851",
      "description": "猛火炙烤，外焦里嫩",
      "tip": "炭火之上，翻转之间见真章"
    },
    {
      "id": "guo",
      "name": "砂锅",
      "icon": "assets/images/utensils/shaguo.svg",
      "color": "#8B7355",
      "description": "煲炖入味，温润绵长",
      "tip": "砂锅煲汤，鲜香慢慢渗出"
    },
    {
      "id": "wok",
      "name": "蒸锅",
      "icon": "assets/images/utensils/zhengg.svg",
      "color": "#789262",
      "description": "水汽弥漫，清鲜本味",
      "tip": "水沸气腾，食材在其中慢慢交融"
    }
  ]
}
```

---

## 三、游戏交互流程

### 3.1 关卡结构

```
游戏首页
  └─ 选择省份关卡（如：安徽篇 / 四川篇 / 广东篇）
        └─ 每省 3-5 道菜
              └─ 拖拽食材 → 放入器具
                    ├─ 食材数量正确 + 器具正确 → 解锁菜品 + 得分
                    ├─ 器具正确但食材不全 → 提示"还差…"
                    └─ 器具错误 → 提示"这个器具不太对哦"
```

### 3.2 拖拽交互（设计文档 5.2 / 5.4）

核心使用 GSAP Draggable + InertiaPlugin（均已免费开源）：

```
食材拖拽手感：
- Draggable 拖拽时轻微放大 1.1x，阴影加深
- 释放时若在器具上方：吸附动画（spring ease）
- 释放时不在器具上方：弹回原位（inertia）
- 放入正确器具：成功动画（GSAP burst + 蒸汽升腾）

器具反馈：
- 悬停时轻微发光边框
- 正确食材放入：边框变绿 + 蒸汽粒子特效
- 错误食材放入：边框变红 + 抖动动画
```

### 3.3 成功解锁动画

```js
// 配对成功时（设计文档 5.2 蒸汽动画）
gsap.fromTo('#steam-particles',
  { opacity: 0, scale: 0.5, y: 20 },
  { opacity: 1, scale: 1.5, y: -40, duration: 1.2, stagger: 0.15, ease: 'power2.out' }
);
// 菜品卡片翻转揭示
gsap.fromTo('.dish-unlock-card',
  { rotateY: 90, opacity: 0 },
  { rotateY: 0, opacity: 1, duration: 0.8, ease: 'back.out(1.2)' }
);
```

---

## 四、免费而风格统一的食材图标获取方案

### 4.1 方案对比

| 方案 | 费用 | 风格统一性 | 获取难度 | 推荐度 |
|------|------|-----------|---------|--------|
| **iconify.design** | 免费 | 高（同一套 SVG） | 低 | ⭐⭐⭐⭐⭐ |
| **AI 生成（Stable Diffusion）** | 算力成本 | 高（可定制） | 中 | ⭐⭐⭐⭐ |
| **Heroicons + 手绘** | 免费 | 中 | 高 | ⭐⭐⭐ |
| **FlatIcon 免费区** | 免费（需署名） | 中 | 低 | ⭐⭐ |

### 4.2 推荐方案：iconify.design

iconify.design 收录了 100+ 套图标集，其中：

- **Noto Emoji** — 食物类 emoji 风格图标，风格统一
- **Carbon** — IBM 开源图标集，含大量厨房/烹饪图标
- **Tabler Icons** — 细线风格，厨房器具图标丰富
- **MingCute** — 开源国产 SVG 图标库，国风适配

**使用方法（以 Tabler Icons 为例）：**

```html
<!-- 方式1：CDN 按需引入单个图标 -->
<img src="https://api.iconify.design/tabler/meat.svg?color=%23789262"
     width="48" height="48" alt="肉">

<!-- 方式2：CSS background-image -->
.icon-meat {
  background-image: url('https://api.iconify.design/tabler/meat.svg?color=%23789262');
}
```

> **注意**：Iconify API 的正确 URL 格式为 `https://api.iconify.design/{prefix}/{name}.svg`，
> 不要在 `{prefix}` 和 `{name}` 之间加 `/icons/` 路径，否则返回 404。

**优势：**
- 全部免费，无需注册
- SVG 矢量，任意缩放不失真
- 支持通过 URL 参数修改颜色（与国风配色完美契合）
- 同一图标集风格 100% 统一

### 4.3 实际采集图标清单（已验证可用）

已通过 `collect_icons.py` 脚本实际采集，**34 个 SVG + 1 个合并 Sprite**，总计 28.6KB：

| 图标 ID | 文件名 | 用途 | 来源 |
|---------|--------|------|------|
| tabler:meat | meat.svg | 鸡肉/红肉 | Tabler |
| tabler:fish | fish.svg | 鱼/海鲜 | Tabler |
| tabler:egg | egg.svg | 鸡蛋 | Tabler |
| tabler:carrot | carrot.svg | 根茎蔬菜 | Tabler |
| tabler:pepper | pepper.svg | 辣椒 | Tabler |
| tabler:leaf | leaf.svg | 青菜/绿叶 | Tabler |
| tabler:apple | apple.svg | 水果 | Tabler |
| tabler:grain | grain.svg | 米/谷物 | Tabler |
| tabler:wheat | wheat.svg | 小麦/面粉 | Tabler |
| tabler:bread | bread.svg | 面食/饺子 | Tabler |
| tabler:cake | cake.svg | 点心/糕点 | Tabler |
| tabler:flame | flame.svg | 灶火 | Tabler |
| tabler:campfire | campfire.svg | 炭火/烧烤 | Tabler |
| tabler:steam | steam.svg | 蒸汽/蒸菜 | Tabler |
| tabler:bowl | bowl.svg | 碗/汤碗 | Tabler |
| tabler:cup | cup.svg | 茶杯 | Tabler |
| tabler:glass | glass.svg | 玻璃杯 | Tabler |
| tabler:mug | mug.svg | 大杯/汤盅 | Tabler |
| tabler:bottle | bottle.svg | 瓶子/调料瓶 | Tabler |
| tabler:beer | beer.svg | 料酒 | Tabler |
| tabler:droplet | droplet.svg | 油/水滴 | Tabler |
| tabler:soup | soup.svg | 汤品 | Tabler |
| tabler:tools-kitchen | tools-kitchen.svg | 厨房工具组 | Tabler |
| tabler:tools-kitchen-2 | tools-kitchen-2.svg | 厨房工具组2 | Tabler |
| tabler:tools-kitchen-3 | tools-kitchen-3.svg | 厨房工具组3 | Tabler |
| tabler:axe | axe.svg | 剁肉斧（替代） | Tabler |
| tabler:pin | pin.svg | 擀面杖（面食） | Tabler |
| tabler:salt | salt.svg | 盐 | Tabler |
| tabler:chef-hat | chef-hat.svg | 厨师帽 | Tabler |
| mingcute:egg-line | egg-line.svg | 鸡蛋（MingCute） | MingCute |
| mingcute:pot-line | pot-line.svg | 锅/砂锅 | MingCute |
| mingcute:knife-line | knife-line.svg | 菜刀 | MingCute |
| mingcute:chopsticks-line | chopsticks.svg | 筷子 | MingCute |
| mingcute:steam-line | steam-line.svg | 蒸汽（MingCute） | MingCute |

**存储位置：** `assets/images/ingredients/`
**合并文件：** `ingredients-sprite.svg`（将所有图标合并为单一 SVG sprite，减少 HTTP 请求）
**图标颜色：** 竹青色 `#789262`（国风主色统一）

> 如需扩充，运行 `python collect_icons.py` 即可自动采集更多图标。

### 4.4 AI 生成方案（进阶，高质量自定义）

使用 Stable Diffusion + **ControlNet tile** 或 **IP-Adapter** 生成一致风格的食材插图：

```
提示词模板：
"a flat illustration of [食材名], Chinese food style,
 no background, soft pastel colors #789262 #C04851,
 clean vector art style, white workspace"

参数：
- Model: RealisticVision /anylora（写实风格）
         或者：Flat illustration model（扁平插画风格）
- ControlNet: tile + invert（保持一致性）
- 输出: 512×512 PNG → 用 Python PIL 批量统一尺寸
```

**优势：**完全自定义风格，可融入品牌配色，视觉效果最好
**劣势：**需要 GPU 算力，需后期批量处理

### 4.5 图标目录结构（推荐）

```
assets/images/ingredients/
├── icons/                          ← SVG 图标（来源：iconify 或 AI）
│   ├── meat.svg
│   ├── egg.svg
│   ├── tofu.svg
│   └── ...
└── sprites/
    └── ingredients.svg             ← SVG sprite（合并所有图标，减少请求）
```

---

## 五、技术实现要点

### 5.1 GSAP Draggable 配置

```js
// 设计文档 5.4 核心技术
const ingDraggables = Draggable.create('.ingredient', {
  type: 'x,y',
  inertia: true,                    // 拖拽惯性
  onDragStart() {
    gsap.to(this.element, { scale: 1.12, zIndex: 100, boxShadow: '0 12px 28px rgba(0,0,0,0.22)' });
  },
  onDragEnd() {
    // 检测是否落在器具上方
    const utensilEl = checkDropOnUtensil(this.x, this.y);
    if (utensilEl) {
      // 吸附进器具
      gsap.to(this.element, { x: utensilEl.x, y: utensilEl.y, scale: 1, duration: 0.4, ease: 'back.out(2)' });
      // 检查配方匹配
      checkRecipe(utensilEl.dataset.utensil, this.element.dataset.ingredient);
    } else {
      // 弹回原位
      gsap.to(this.element, { x: 0, y: 0, scale: 1, duration: 0.5, ease: 'elastic.out(1, 0.5)' });
    }
  }
});
```

### 5.2 性能优化要点（设计文档 5.5）

- 图标使用 SVG sprite 合并，减少 HTTP 请求
- 器具仅 5 个 DOM 节点，动画性能无忧
- 食材 DOM 节点按需创建（只渲染当前关卡所需的食材）
- 成功解锁动画完成后才加载菜品大图（懒加载）

---

## 六、数据流转

```
data/recipes.json          ← 全局配方库
data/provinces.json        ← 省份基础数据（含 dishCount）
data/provinces/{id}.json   ← 省份菜品详情（含 ingredients[]）

       ┌─ 游戏 JS 读取
       ↓
  recipes[] + provinces[] → 生成当前关卡
       ↓
  拖拽食材 → 匹配 recipe.ingredients
       ↓
  成功 → unlockDishId → 跳转 detail.html?province=xx&dish=yy
```

---

## 七、待实现清单

- [ ] `data/recipes.json` — 汇总各省代表性菜肴配方（每省 3-5 道）
- [ ] 器具 SVG 图标（5 种，可用 iconify Tabler Icons 方案）
- [ ] 食材 SVG 图标（按配方所需食材采购，可用 iconify 方案）
- [ ] `js/game.js` — 游戏主逻辑（关卡选择、拖拽判定、得分系统）
- [ ] `css/game.css` — 游戏页面样式（灶台、器具、食材托盘布局）
- [ ] 成功/失败动画（GSAP burst + 蒸汽粒子 + 卡片翻转）
- [ ] 游戏存档（localStorage，记住已解锁菜品）

---

*文档版本：V1.0 | 编制日期：2025年8月 | 依据：《至善百味行网站设计思路书》第五章扩展*
