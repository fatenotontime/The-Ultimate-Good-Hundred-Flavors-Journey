# 厨房背景图 AI 生成提示词

> 将以下提示词粘贴至 Midjourney / DALL-E / Stable Diffusion / 通义万相 / 硅基流动 等 AI 生图工具

---

## 主题：中国风卡通厨房背景

## 提示词（英文，适合大多数 AI 生图工具）

```
A flat illustration of a cozy Chinese kitchen, warm and inviting atmosphere.
Center: a traditional Chinese gas stove with a large iron wok on the left burner,
a bamboo steamer stack in the middle, a clay pot on the right.
Above the stove: wall-mounted wooden shelf with small bowls, dried chili peppers,
garlic braids, and hanging ladles.
Background: warm cream-colored wall with a small window showing afternoon sunlight,
a red paper lucky banner on the wall.
Color palette: warm cream #F5F0E8, bamboo green #789262,
golden yellow #F9C116, deep red #C04851, ink black #2C2C2C.
Flat design, clean vector style, no gradients, subtle shadows,
Chinese folk art aesthetic, illustration for a casual cooking game.
16:9 aspect ratio, high detail, game asset background.
```

---

## 中文提示词（适合通义万相 / 百度文心 / 国产 AI 生图）

```
一幅扁平风格的中国厨房插画，温馨可爱。
画面中央是一台传统中式灶台：左侧灶眼上架着大铁锅，
中间放置竹制蒸笼（大蒸笼有两层屉），右侧是砂锅。
灶台上方：木制壁挂搁板，搁板上放着小碗、干辣椒、大蒜串、悬挂的汤勺。
墙面：暖米色墙纸，右上角有一扇小窗透进午后阳光，
墙上贴着一张红色春联风格的福字装饰。
配色：暖米色 #F5F0E8、竹青色 #789262、杏黄色 #F9C116、胭脂红 #C04851、墨黑 #2C2C2C。
扁平插画风格，干净矢量感，微妙的投影，中国民间美术氛围，
游戏道具背景素材，16:9宽屏比例。
```

---

## 画面元素清单（确保 AI 覆盖）

| 元素 | 位置 | 说明 |
|------|------|------|
| 大铁锅 + 灶台 | 中央 | 游戏主要操作区 |
| 两层竹蒸笼 | 中央偏右 | 蒸菜器具 |
| 砂锅 | 右侧 | 煲汤/炖菜 |
| 木制壁挂搁板 | 灶台上方 | 存放调料/碗碟 |
| 干辣椒/大蒜串 | 搁板上 | 装饰细节 |
| 红色福字/春联 | 墙上 | 中国风点缀 |
| 小窗+阳光 | 右上背景 | 光影氛围 |
| 暖米色墙面 | 全背景 | 主背景色 |

---

## 技术参数建议

| 参数 | 建议值 |
|------|--------|
| 分辨率 | 1920 × 1080（16:9）或 1920 × 640（横幅） |
| 格式 | PNG（透明背景）或 JPG |
| 风格 | Flat illustration / Vector art / 游戏背景 |
| 后期处理 | 适度模糊边缘，用于游戏时可叠加滤镜 |

---

## API 调用示例（如果使用 OpenAI 兼容 API）

> 注意：以下代码仅作参考，无法在本环境直接调用

```python
import openai

client = openai.OpenAI(
    api_key="sk-50T1BpRGOSSeTR7OTrZLlLiUBt9TkAGH4uWIM5j8cG6Uor4E",
    base_url="https://api.agens.ai/v1"  # 如 AGens 有自定义端点
)

response = client.images.generate(
    model="dall-e-3",  # 或实际模型名
    prompt="A flat illustration of a cozy Chinese kitchen...",
    size="1792x1024",
    n=1
)
print(response.data[0].url)
```

---

## 文件保存位置建议

```
assets/images/kitchen/
├── kitchen-bg.png       # 主背景 1920×1080
└── kitchen-banner.png   # 横幅版本 1920×400（用于游戏页顶部）
```

> **推荐工具顺序**：Midjourney（质量最优）> DALL-E 3（细节好）> 国产（通义万相、百度文心一格、360鸿图）> Stable Diffusion（本地部署，免费）
