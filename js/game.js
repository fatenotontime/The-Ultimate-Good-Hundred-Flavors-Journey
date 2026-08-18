/* ============================================================
   js/game.js — 至善小当家厨房交互逻辑
   ------------------------------------------------------------
   三个器具：锅 / 蒸屉 / 砂锅
   交互行为：
     默认状态   → 显示完整器具图（盖与体合为一体）
     hover进入  → 主体不动，盖子浮起一点点，倾斜30度，抖动两下
     hover离开  → 盖子回落归位，恢复完整图
     点击       → 盖子大幅弹开（或铁锅整体晃动），解锁随机菜品
   动画引擎    → GSAP 3.12（CDN 引入，window.gsap 全局可用）
   ============================================================ */

(() => {
  'use strict';

  /* ==========================================================
     常量：素材图片的基路径
     ----------------------------------------------------------
     所有器具图片（完整图/主体/盖子）都存放在该目录下，
     以 WebP 格式提供（含透明通道，用于叠加在背景上）。
     ========================================================== */
  const BASE = 'assets/images/kitchen/';

  /* ==========================================================
     器具配置数组 STATIONS
     ----------------------------------------------------------
     每项描述一个器具的完整信息：
       id      : 唯一标识，与 CSS 类名 .station--{id} 对应
       name    : 中文名称（显示在器具下方）
       cls     : CSS 定位类名（决定器具在背景上的位置）
       tip     : 鼠标悬停时的提示文字（title 属性）
       fullImg : 完整图（盖+体一体，默认显示）
       bodyImg : 主体图（hover/开盖时显示；铁锅为 null 表示无拆分）
       lidImg  : 盖子图（hover/开盖时显示；铁锅为 null 表示无盖子）
       dishes  : 该器具可解锁的随机菜品池
     ========================================================== */
  const STATIONS = [
    {
      id: 'wok',                       // 铁锅：无盖，不可拆分
      name: '铁锅',
      cls: 'station--wok',
      tip: '大火爆炒，滋啦一声',
      fullImg: 'wok-full.webp',        // 完整图（锅体）
      bodyImg: null,                   // 无主体拆分 → null
      lidImg: null,                    // 无盖子 → null
      dishes: ['铁锅鸡', '爆炒腰花', '酸菜鱼', '宫保鸡丁', '干煸四季豆', '铁板牛肉'],
    },
    {
      id: 'steamer',                   // 蒸屉：有盖，可拆分
      name: '蒸屉',
      cls: 'station--steamer',
      tip: '文火慢蒸，蒸汽袅袅',
      fullImg: 'steamer-full.webp',    // 完整图（盖+体合体）
      bodyImg: 'steamer-body.webp',    // 主体图（去盖后的屉身）
      lidImg: 'steamer-lid.webp',      // 盖子图（独立可动）
      dishes: ['粉蒸肉', '清蒸鲈鱼', '小笼包', '糯米丸子', '香菇蒸鸡', '梅菜扣肉'],
    },
    {
      id: 'claypot',                   // 砂锅：有盖，可拆分
      name: '砂锅',
      cls: 'station--claypot',
      tip: '砂锅煲汤，温润入味',
      fullImg: 'claypot-full.webp',    // 完整图（盖+体合体）
      bodyImg: 'claypot-body.webp',    // 主体图（去盖后的锅身）
      lidImg: 'claypot-lid.webp',      // 盖子图（独立可动）
      dishes: ['砂锅煲仔饭', '酸汤肥牛', '砂锅豆腐', '羊肉砂锅煲', '番茄牛腩', '砂锅鱼头'],
    },
  ];

  /* ==========================================================
     运行时状态对象
     ----------------------------------------------------------
     stationItems : 各器具已投入的食材记录，
                    { stationId: { 食材名: 数量 } }
                    规则：同种可重复放，总数不超过 MAX_ITEMS
     isHovering   : 悬停状态表，{ stationId: true/false }。
     recipes      : 配方表（从 data/recipes.json 加载）
     ========================================================== */
  const stationItems = {};  // stationId -> { 食材名: 数量 }
  const isHovering = {};    // stationId -> boolean
  let recipes = [];         // 配方数组

  /* 每器具最多可投入的食材总数（防卡死上限） */
  const MAX_ITEMS = 5;

  /* 提示浮层引用 */
  const hintEl = () => qs('#drop-hint');

  /* ==========================================================
     加载配方表（data/recipes.json）
     ----------------------------------------------------------
     三道皖菜配方，每道含：器具、必需食材（种类）、
     详情跳转链接。种类符合即算配方匹配（数量不要求）。
     ========================================================== */
  async function loadRecipes() {
    try {
      const data = await fetchJSON('data/recipes.json');
      recipes = data.recipes || [];
    } catch (e) {
      recipes = [];
    }
  }

  /* ==========================================================
     食材投入记录（由 ingredients.js 拖拽触发）
     ----------------------------------------------------------
     规则：
       - 同种食材可重复放入（数量 +1）
       - 器具内总数量不超过 MAX_ITEMS（5），超出拒绝
     ========================================================== */
  function onIngredientDropped(e) {
    const { stationId, name } = e.detail || {};
    if (!stationId || !name) return;
    const cfg = STATIONS.find(s => s.id === stationId);
    if (!cfg) return;

    /* 初始化该器具记录 */
    if (!stationItems[stationId]) stationItems[stationId] = {};

    /* 计算当前总数量 */
    const items = stationItems[stationId];
    const total = Object.values(items).reduce((s, n) => s + n, 0);

    if (total >= MAX_ITEMS) {
      showHint(`${cfg.name}已经装满了（最多${MAX_ITEMS}样）`, 'info');
      return;
    }

    /* 记录：同种累加 */
    items[name] = (items[name] || 0) + 1;
    renderStationItems(stationId);
    showHint(`${name} 已投入${cfg.name}`, 'info');
    /* 投入反馈动画：铁锅晃动一下，其他器具弹跳 */
    const stationEl = qs(`.station[data-station="${stationId}"]`);
    if (stationId === 'wok') {
      wobbleOnce(stationEl);
    } else {
      bounceIcon(stationEl);
    }
  }

  /* ==========================================================
     渲染器具内的食材标记
     ----------------------------------------------------------
     在器具下方显示已投入的食材（图标 + 数量），
     便于玩家知道锅里有什么。
     ========================================================== */
  /* ==========================================================
     渲染器具内的食材槽位
     ----------------------------------------------------------
     每个器具显示固定 5 个槽（MAX_ITEMS），
     已投入的食材填入对应槽，空槽显示虚线框。
     托盘定位在 .stations-layer（舞台覆盖层）上，
     top 用统一的舞台百分比 → 三个器具槽位水平对齐。
     ========================================================== */
  function renderStationItems(stationId) {
    const station = qs(`.station[data-station="${stationId}"]`);
    if (!station) return;
    const layer = qs('#stations-layer') || document.body;

    /* 托盘挂舞台覆盖层，用固定舞台百分比定位 → 三个器具绝对水平对齐 */
    let tray = layer.querySelector(`.station__tray[data-station="${stationId}"]`);
    if (!tray) {
      tray = document.createElement('div');
      tray.className = 'station__tray';
      tray.dataset.station = stationId;
      layer.appendChild(tray);
    }

    /* left：器具中心（舞台百分比，与 CSS 中 .station--xxx 一致） */
    const leftMap = { wok: 31.5, steamer: 49.3, claypot: 66.4 };
    tray.style.left = (leftMap[stationId] || 50) + '%';
    /* top：统一固定值 → 三排槽位绝对水平对齐 */
    tray.style.top = '72%';

    const items = stationItems[stationId] || {};
    const entries = Object.entries(items);
    const INGREDIENT_ICONS = window.INGREDIENT_ICONS || {};

    /* 渲染 5 个固定槽位 */
    let html = '';
    for (let i = 0; i < MAX_ITEMS; i++) {
      const [name, count] = entries[i] || [null, null];
      if (name) {
        html += `
          <span class="station__tray-slot is-filled" title="${esc(name)} ×${count}">
            <img src="assets/images/ingredients/${INGREDIENT_ICONS[name] || 'chicken'}.webp"
                 alt="${esc(name)}" width="20" height="20">
            <i>×${count}</i>
          </span>`;
      } else {
        html += `<span class="station__tray-slot"></span>`;
      }
    }
    tray.innerHTML = html;
  }

  /* ==========================================================
     清空某器具的食材
     ========================================================== */
  function clearStationItems(stationId) {
    stationItems[stationId] = {};
    renderStationItems(stationId);
  }

  /* ==========================================================
     工具函数
     ----------------------------------------------------------
     qs  : 单元素选择器（简化 document.querySelector）
     qsa : 多元素选择器（返回数组而非 NodeList，便于遍历）
     esc : HTML 转义，防止动态插入的内容被当作标签解析
     ========================================================== */
  const qs  = (s, c = document) => c.querySelector(s);
  const qsa = (s, c = document) => [...c.querySelectorAll(s)];

  function esc(str) {
    const d = document.createElement('div');
    d.textContent = String(str ?? '');
    return d.innerHTML;
  }

  /* ==========================================================
     渲染器具（renderStations）
     ----------------------------------------------------------
     1. 遍历 STATIONS 配置，生成每个器具的 HTML 结构；
     2. 有盖子的器具渲染三张 img：
          full-img（完整图，默认可见）
          body-img（主体，默认隐藏）
          lid-img（盖子，默认隐藏）
        无盖子的器具（铁锅）只渲染完整图；
     3. 为每个器具绑定三个事件：
          mouseenter → onHoverEnter（hover 进入动画）
          mouseleave → onHoverLeave（hover 离开动画）
          click      → onStationClick（点击出菜）
     ----------------------------------------------------------
     CSS 说明：三张 img 都通过 .station__icon 的绝对定位
     叠加在同一位置（见 css/game.css），
     因此默认只露出完整图，hover 时切换为主体+盖子。
     ========================================================== */
  function renderStations() {
    const layer = qs('#stations-layer');   // 器具叠加层容器

    /* ---- 生成 HTML ---- */
    layer.innerHTML = STATIONS.map(s => {
      const hasLid = !!s.lidImg;           // 该器具是否有盖子
      return `
      <div class="station ${s.cls}" data-station="${esc(s.id)}" title="${esc(s.tip)}">
        <div class="station__inner">
          <div class="station__icon">
            <!-- 完整图：默认显示 -->
            <img class="full-img" src="${BASE}${s.fullImg}" alt="${esc(s.name)}">
            <!-- 有盖器具：主体+盖子，默认隐藏，hover时显示 -->
            ${hasLid ? `
              <img class="body-img" src="${BASE}${s.bodyImg}" alt="${esc(s.name)}主体" style="display:none;">
              <img class="lid-img" src="${BASE}${s.lidImg}" alt="${esc(s.name)}盖" style="display:none;">
            ` : ''}
          </div>
        </div>
      </div>`;
    }).join('');

    /* ---- 绑定事件 + 初始化空食材托盘 ---- */
    qsa('.station').forEach(el => {
      const id = el.dataset.station;       // 读取 data-station 得到器具 id
      isHovering[id] = false;              // 初始化悬停状态
      el.addEventListener('mouseenter', () => onHoverEnter(el, id));
      el.addEventListener('mouseleave', () => onHoverLeave(el, id));
      el.addEventListener('click', () => onStationClick(el, id));
      /* 空托盘占位：固定高度，避免投入食材时器具视觉跳动 */
      renderStationItems(id);
    });
  }

  /* ==========================================================
     【动画①】hover 进入：盖子浮起 + 倾斜30度 + 抖动两下
     ----------------------------------------------------------
     触发：鼠标进入器具范围（.station 的 mouseenter）
     目标：仅移动"盖子"图层；主体保持原地不动
     流程：
       1. 铁锅无盖 → 直接返回（无动画）
       2. 若已在悬停中 → 返回（避免重复触发）
       3. 切换显示：隐藏完整图，显示主体+盖子
       4. 重置盖子：贴合在主体上（y=0, rotation=0）
       5. GSAP 时间线依次执行：
          a. 盖子向上浮起 6%（相对自身高度）
          b. 盖子从水平（0°）倾斜到 30°
          c. 盖子以 30° 为基准左右微摆 2 下（26°↔34°）
     ----------------------------------------------------------
     关键 GSAP 概念：
       gsap.killTweensOf(el)  → 终止目标上所有进行中的动画，
                                 防止旧动画与新动画冲突
       gsap.set(el, {...})    → 立即设置属性（无动画过渡）
       gsap.timeline()        → 时间线：按顺序播放多个动画
       .to(el, {...})         → 从当前值动画到目标值
       keyframes:[...]        → 关键帧序列（按数组顺序逐帧播放）
     ========================================================== */
  function onHoverEnter(el, id) {
    const cfg = STATIONS.find(s => s.id === id);   // 找到配置
    if (!cfg || !cfg.lidImg) return;               // 铁锅无盖，跳过
    if (isHovering[id]) return;                    // 防重复触发
    isHovering[id] = true;                         // 标记正在悬停

    /* 获取三个图层的 DOM 元素 */
    const full = el.querySelector('.full-img');    // 完整图
    const body = el.querySelector('.body-img');    // 主体
    const lid  = el.querySelector('.lid-img');     // 盖子
    if (!body || !lid) return;                     // 缺图层则放弃

    /* ---- 显示状态切换：完整图 → 主体+盖子 ---- */
    if (full) full.style.display = 'none';         // 隐藏完整图
    body.style.display = 'block';                  // 显示主体
    lid.style.display = 'block';                   // 显示盖子

    /* ---- 仅蒸屉：屉体右移 5%（不缩放，保持大小稳定） ----
       砂锅不做位移（保持原样） */
    if (id === 'steamer') {
      gsap.killTweensOf(body);                       // 清掉主体上的残留动画
      gsap.set(body, { scale: 1, x: '5%' });         // 屉体仅右移 5%，不放大
    }

    /* ---- 仅蒸屉：器具容器整体右移 2%（配合盖子掀开的动感） ----
       砂锅不做此位移（保持原位），只蒸屉右移 */
    if (id === 'steamer') {
      gsap.killTweensOf(el);                         // 清掉容器上的残留动画
      gsap.set(el, { x: '2%' });                     // 容器向右平移 2%
    }

    /* ---- 重置盖子状态：水平贴合在主体上 ---- */
    gsap.killTweensOf(lid);                        // 清掉残留动画
    gsap.set(lid, { y: 0, rotation: 0, opacity: 1 }); // 复位

    /* ---- 构建动画时间线（依次执行三段） ---- */
    const tl = gsap.timeline();

    /* 第1段：盖子向上浮起 15% 并向右平移 20%（y 负值=向上，x 正值=向右）
       数值越大浮起/右移越多；当前 15%/20% 让盖子明显离开主体 */
    tl.to(lid, {
      y: '-15%',                // 相对盖子自身高度的 15% 上移
      x: '20%',                 // 相对盖子自身宽度的 20% 右移
      duration: 0.25,           // 0.25 秒
      ease: 'power2.out'        // 缓出：开始快、结束慢（自然的弹起感）
    })

    /* 第2段：从水平状态倾斜到 30 度 */
    .to(lid, {
      rotation: 30,             // 绕中心旋转 30 度（CSS transform）
      duration: 0.3,            // 0.3 秒
      ease: 'power2.inOut'      // 缓入缓出：两端慢、中间快（平滑转向）
    })

    /* 第3段：抖动两下（以30度为基准左右微摆）
       关键帧依次为：26° → 34° → 30° → 33° → 30°
       即：左摆4° → 右摆4° → 回中 → 右摆3° → 回中
       形成"左右各一下"的抖动效果 */
    .to(lid, {
      keyframes: [
        { rotation: 26, duration: 0.07 },   // 第1摆：左摆到26°
        { rotation: 34, duration: 0.07 },   // 第1摆回弹：右摆到34°
        { rotation: 30, duration: 0.07 },   // 回中到30°
        { rotation: 33, duration: 0.07 },   // 第2摆：轻摆到33°
        { rotation: 30, duration: 0.07 },   // 回中到30°（结束）
      ],
      ease: 'none'              // 关键帧之间无额外缓动（机械抖动感）
    });
  }

  /* ==========================================================
     【动画②】hover 离开：盖子回落归位，恢复完整图
     ----------------------------------------------------------
     触发：鼠标离开器具范围（.station 的 mouseleave）
     流程：
       1. 铁锅无盖 → 返回
       2. 终止盖子上所有进行中的动画（防止抖动一半卡住）
       3. 盖子平滑回到 y=0、rotation=0（贴合状态）
       4. 归位完成后（onComplete 回调）：
          - 若期间鼠标又进入了（isHovering 为 true）→ 不恢复
          - 否则隐藏主体+盖子，恢复显示完整图
     ----------------------------------------------------------
     为什么用 onComplete 恢复显示？
       因为需要等"回落动画"播完再切换显示，
       否则盖子会在视觉上"跳"回完整图，不连贯。
     ========================================================== */
  function onHoverLeave(el, id) {
    const cfg = STATIONS.find(s => s.id === id);
    if (!cfg || !cfg.lidImg) return;       // 铁锅无盖，跳过
    isHovering[id] = false;                // 取消悬停标记

    const full = el.querySelector('.full-img');
    const body = el.querySelector('.body-img');
    const lid  = el.querySelector('.lid-img');
    if (!body || !lid) return;

    /* 终止盖子上的动画，避免与新动画叠加 */
    gsap.killTweensOf(lid);

    /* 盖子回落：平滑回到贴合位置 */
    gsap.to(lid, {
      y: 0,                               // 回到原位（无上浮）
      x: 0,                               // 回到原位（无右移）
      rotation: 0,                        // 回到水平（无倾斜）
      duration: 0.3,                      // 0.3 秒
      ease: 'power2.in',                  // 缓入：开始慢、结束快（落回贴合感）
      onComplete: () => {                 // 动画播完后的回调
        if (isHovering[id]) return;       // 期间鼠标又进入 → 保持拆分状态
        /* 恢复正常显示：隐藏拆分图层，显示完整图 */
        if (id === 'steamer') {
          gsap.set(body, { scale: 1, x: '0%' });  // 仅蒸屉：屉体恢复位置
          gsap.set(el, { x: '0%' });              // 仅蒸屉：容器回到原始位置
        }
        body.style.display = 'none';
        lid.style.display = 'none';
        if (full) full.style.display = 'block';
      }
    });
  }

  /* ==========================================================
     【动画③】点击器具：开盖出菜
     ----------------------------------------------------------
     触发：点击器具（.station 的 click）
     行为分两类：
       A. 有盖器具（蒸屉/砂锅）：
          盖子从当前状态大幅弹开（上飘40%、反向倾斜-20°、半透明）
       B. 无盖器具（铁锅）：
          整个图标左右晃动（调用 triggerShake）
     之后统一出菜（unlockDish）
     ----------------------------------------------------------
     注意：点击时若鼠标仍在器具上，盖子会被弹开；
     鼠标移开后 onHoverLeave 会尝试复位，
     但 unlockDish 的提示会覆盖掉视觉焦点，故无冲突。
     ========================================================== */
  function onStationClick(el, id) {
    const cfg = STATIONS.find(s => s.id === id);
    if (!cfg) return;

    /* 开盖/晃动动画 */
    const lid = el.querySelector('.lid-img');
    if (lid) {
      gsap.killTweensOf(lid);
      gsap.fromTo(lid,
        { y: '-15%', x: '20%', rotation: 30 },
        { y: '-40%', rotation: -20, opacity: 0.6, duration: 0.6, ease: 'power2.out' }
      );
    } else {
      const icon = el.querySelector('.station__icon');
      triggerShake(icon);
    }

    /* ---- 配方判定 ---- */
    const matches = checkRecipes(id);

    if (matches.length > 0) {
      /* 匹配成功 → 弹出菜品详情，清空该器具食材
         注意：clearStationItems 在弹窗动画之前执行，
         确保槽位立即清空（不等弹窗动画完成） */
      clearStationItems(id);
      showDishDetails(matches);
    } else {
      /* 不匹配 → 提示并清空该器具食材 */
      clearStationItems(id);
      showHint(`${cfg.name}里的食材搭不成菜，重新来过～`, 'info');
    }
  }

  /* ==========================================================
     配方判定（checkRecipes）
     ----------------------------------------------------------
     判定：器具相同，且实际食材名称集合与配方食材集合完全相等。
     数量不影响集合；如果多个配方组合完全相同，则全部返回。
     ========================================================== */
  function checkRecipes(stationId) {
    const items = stationItems[stationId] || {};
    return window.RecipeMatcher.findMatches(recipes, stationId, items);
  }

  /* ==========================================================
     弹出菜品详情（showDishDetails）
     ----------------------------------------------------------
     匹配成功时：在页面中央弹出菜品卡片，
     含缩略图、菜名、副标题、配方食材标签，
     点击"查看详情"跳转 detail.html。
     ========================================================== */
  function showDishDetails(matches) {
    /* 若已有弹窗则先关闭 */
    const old = qs('.dish-detail-overlay');
    if (old) old.remove();

    const overlay = document.createElement('div');
    overlay.className = 'dish-detail-overlay';
    const multiple = matches.length > 1;
    overlay.innerHTML = `
      <div class="dish-detail-dialog${multiple ? ' is-multiple' : ''}"
           role="dialog" aria-modal="true" aria-label="烹饪结果">
        <button class="dish-detail-card__close" type="button" aria-label="关闭">×</button>
        ${multiple ? `<h2 class="dish-detail-dialog__title">这组食材解锁了 ${matches.length} 道菜</h2>` : ''}
        <div class="dish-detail-grid">
          ${matches.map(recipe => `
            <article class="dish-detail-card">
              <div class="dish-detail-card__img">
                <img src="${esc(recipe.thumbnail)}" alt="${esc(recipe.name)}">
              </div>
              <div class="dish-detail-card__body">
                <h3 class="dish-detail-card__name">${esc(recipe.name)}</h3>
                <p class="dish-detail-card__subtitle">${esc(recipe.subtitle || '')}</p>
                <div class="dish-detail-card__tags">
                  ${(recipe.ingredients || []).map(i =>
                    `<span class="dish-detail-card__tag">${esc(i)}</span>`).join('')}
                </div>
                <a class="dish-detail-card__link" href="${esc(recipe.link)}">查看详情 →</a>
              </div>
            </article>
          `).join('')}
        </div>
      </div>
    `;
    document.body.appendChild(overlay);

    let closing = false;
    const onKeyDown = event => {
      if (event.key === 'Escape') close();
    };
    const close = () => {
      if (closing) return;
      closing = true;
      document.removeEventListener('keydown', onKeyDown);
      gsap.to(overlay, {
        opacity: 0, duration: 0.25, ease: 'power1.in',
        onComplete: () => overlay.remove()
      });
    };
    overlay.querySelector('.dish-detail-card__close').addEventListener('click', close);
    overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
    document.addEventListener('keydown', onKeyDown);

    /* 弹出动画 */
    gsap.fromTo(overlay,
      { opacity: 0 },
      { opacity: 1, duration: 0.25, ease: 'power1.out' }
    );
    gsap.fromTo(qsa('.dish-detail-card', overlay),
      { scale: 0.8, y: 30, opacity: 0 },
      {
        scale: 1, y: 0, opacity: 1, duration: 0.5,
        stagger: 0.08, ease: 'back.out(1.5)'
      }
    );
  }

  /* ==========================================================
     查看配方表（showRecipeBook）
     ----------------------------------------------------------
     弹出全屏配方表弹层：列出三道菜，
     每道含：器具名、菜名、必需食材（图标 + 名称）。
     让玩家知道每个器具该投什么食材。
     ========================================================== */
  function showRecipeBook() {
    if (recipes.length === 0) {
      showHint('配方表加载失败，请刷新重试', 'info');
      return;
    }
    const old = qs('.recipe-book-overlay');
    if (old) old.remove();

    const icons = window.INGREDIENT_ICONS || {};
    const overlay = document.createElement('div');
    overlay.className = 'recipe-book-overlay';
    overlay.innerHTML = `
      <div class="recipe-book">
        <button class="recipe-book__close" type="button" aria-label="关闭">×</button>
        <h2 class="recipe-book__title">至善食单</h2>
        <div class="recipe-book__list">
          ${recipes.map(r => `
            <div class="recipe-book__item" data-utensil="${esc(r.utensil)}">
              <div class="recipe-book__item-head">
                <span class="recipe-book__utensil">${esc(r.utensilName)}</span>
                <span class="recipe-book__name">${esc(r.name)}</span>
              </div>
              <div class="recipe-book__ings">
                ${r.ingredients.map(ing => `
                  <span class="recipe-book__ing">
                    <img src="assets/images/ingredients/${icons[ing] || 'chicken'}.webp"
                         alt="${esc(ing)}" width="26" height="26">
                    ${esc(ing)}
                  </span>`).join('')}
              </div>
            </div>
          `).join('')}
        </div>
        <p class="recipe-book__tip">把配方食材拖入对应器具，点击器具即可出菜</p>
      </div>
    `;
    document.body.appendChild(overlay);

    const close = () => {
      gsap.to(overlay, {
        opacity: 0, duration: 0.25, ease: 'power1.in',
        onComplete: () => overlay.remove()
      });
    };
    overlay.querySelector('.recipe-book__close').addEventListener('click', close);
    overlay.addEventListener('click', e => { if (e.target === overlay) close(); });

    gsap.fromTo(overlay, { opacity: 0 }, { opacity: 1, duration: 0.25 });
    gsap.fromTo('.recipe-book',
      { scale: 0.85, y: 24, opacity: 0 },
      { scale: 1, y: 0, opacity: 1, duration: 0.45, ease: 'back.out(1.5)' }
    );
  }

  /* ==========================================================
     【动画④】铁锅晃动（triggerShake）
     ----------------------------------------------------------
     触发：点击铁锅时调用
     效果：图标以 0° 为基准左右交替位移+旋转共 12 帧，
           形成"晃三下"的效果
     关键帧设计（rotation, x）分三组，振幅逐组衰减：
       第一下：-10°,-5 → +10°,+5（大幅）
       第二下：-8°,-4 → +8°,+4（中幅）
       第三下：-5°,-2 → +5°,+2 → -2°,-1 → 0°,0（小幅收尾）
     振幅递减（10→8→5→2）模拟真实物体
     "晃动后自然停下"的物理感。
     ========================================================== */
  function triggerShake(el) {
    if (!window.gsap) return;             // GSAP 未加载则跳过
    gsap.killTweensOf(el);                // 终止旧动画
    gsap.fromTo(el,                       // 从静止状态开始
      { rotation: 0, x: 0 },
      {
        keyframes: [
          /* ---- 第一下：大幅左右甩 ---- */
          { rotation: -10, x: -5, duration: 0.07 },  // 左甩
          { rotation:  10, x:  5, duration: 0.07 },  // 右甩
          /* ---- 第二下：中幅回摆 ---- */
          { rotation:  -8, x: -4, duration: 0.07 },  // 左回弹
          { rotation:   8, x:  4, duration: 0.07 },  // 右回弹
          /* ---- 第三下：小幅收尾 ---- */
          { rotation:  -5, x: -2, duration: 0.07 },  // 小左摆
          { rotation:   5, x:  2, duration: 0.07 },  // 小右摆
          { rotation:  -2, x: -1, duration: 0.07 },  // 微左摆
          { rotation:   0, x:  0, duration: 0.07 },  // 归位
        ],
        ease: 'none'          // 关键帧间无缓动（机械晃动感）
      }
    );
  }

  /* ==========================================================
     【动画④b】铁锅投入晃动（wobbleOnce）
     ----------------------------------------------------------
     触发：食材投入铁锅时调用
     效果：锅体轻微左右摆动一下（幅度小，像被食材砸了一下），
           快速回位，不打断游戏节奏。
     关键帧：0° → -8° → +6° → 0°（一次来回）
     ========================================================== */
  function wobbleOnce(el) {
    if (!window.gsap || !el) return;
    const icon = el.querySelector('.station__icon');
    if (!icon) return;
    gsap.killTweensOf(icon);
    gsap.fromTo(icon,
      { rotation: 0, x: 0 },
      {
        keyframes: [
          { rotation: -8, x: -4, duration: 0.08 },  // 左摆
          { rotation:  6, x:  3, duration: 0.08 },  // 右摆
          { rotation: -3, x: -1, duration: 0.06 },  // 微左
          { rotation:  0, x:  0, duration: 0.06 },  // 回位
        ],
        ease: 'none'
      }
    );
  }

  /* ==========================================================
     【动画⑤】图标弹跳（bounceIcon）
     ----------------------------------------------------------
     触发：食材投入蒸屉/砂锅后调用
     效果：图标上弹16px后回弹归位（yoyo + repeat）
           注意：不做 scale 缩放——保持器具大小稳定，
           避免每次投入时器具忽大忽小。
     ========================================================== */
  function bounceIcon(el) {
    if (!window.gsap) return;
    const icon = el.querySelector('.station__icon');
    gsap.fromTo(icon,
      { y: 0 },                                          // 起点：原位
      {
        y: -16,                                          // 上弹16px
        duration: 0.3,                                   // 0.3秒
        ease: 'power2.out',                              // 缓出
        yoyo: true,                                      // 自动往返（弹上去再落回）
        repeat: 1                                        // 往返次数：1（共2次动画）
      }
    );
  }

  /* ==========================================================
     提示浮层（showHint）
     ----------------------------------------------------------
     在页面中央显示一条提示文字，3.2秒后自动消失
     type 决定配色：success=绿 / info=竹青
     ========================================================== */
  function showHint(text, type = 'info') {
    const el = qs('#drop-hint');
    el.innerHTML = esc(text);                          // 安全转义
    el.className = `drop-hint is-${type} is-visible`;  // 显示
    clearTimeout(showHint._t);                         // 清掉旧计时器
    showHint._t = setTimeout(() => el.classList.remove('is-visible'), 3200);
  }

  /* ==========================================================
     导航栏滚动吸附（initNav）
     ----------------------------------------------------------
     页面滚动超过8px时给导航栏加 is-scrolled 类
     （触发磨砂背景效果，见 css/global.css）
     ========================================================== */
  function initNav() {
    const nav = qs('#site-nav');
    window.addEventListener('scroll', () => {
      nav.classList.toggle('is-scrolled', window.scrollY > 8);
    }, { passive: true });   // passive:true 提升滚动性能
  }

  /* ==========================================================
     【动画⑥】页面入场动画（playEntrance）
     ----------------------------------------------------------
     页面加载完成时播放一次：
       a. 横幅标题从上方滑入（y:-24 → 0，淡入）
       b. 三个器具依次弹出（缩放0.6→1、上移40px→0，淡入）
     ----------------------------------------------------------
     stagger: 0.18 → 器具之间间隔0.18秒依次入场
     back.out(1.8) → 过冲回弹缓动（先冲过目标再回弹，有弹性）
     delay: 0.25   → 横幅动画结束后再等0.25秒开始器具动画
     ========================================================== */
  function playEntrance() {
    if (!window.gsap) return;
    /* a. 横幅标题入场 */
    gsap.from('.game-banner__inner', {
      opacity: 0,          // 从透明开始
      y: -24,              // 从上方24px滑入
      duration: 0.7,       // 0.7秒
      ease: 'power2.out'   // 缓出
    });
    /* b. 器具依次入场 */
    gsap.from('.station', {
      opacity: 0,          // 从透明开始
      scale: 0.6,          // 从60%大小开始
      y: 40,               // 从下方40px弹入
      duration: 0.6,       // 每个0.6秒
      stagger: 0.18,       // 相邻器具间隔0.18秒
      ease: 'back.out(1.8)', // 过冲回弹
      delay: 0.25          // 等横幅动画播完0.25秒后开始
    });
  }

  /* ==========================================================
     主入口（init）
     ----------------------------------------------------------
     页面就绪后依次执行：
       1. initNav()        → 导航栏吸附
       2. renderStations() → 渲染器具+绑定事件
       3. loadRecipes()    → 加载配方表
       4. 绑定食材投入事件（来自 ingredients.js 拖拽）
       5. playEntrance()   → 入场动画
     ========================================================== */
  async function init() {
    initNav();
    renderStations();
    await loadRecipes();
    /* 暴露食材图标映射给 game.js 渲染使用 */
    window.INGREDIENT_ICONS = window.INGREDIENT_ICONS || {};
    /* 监听食材拖入事件 */
    document.addEventListener('ingredient-dropped', onIngredientDropped);
    /* 配方表按钮 */
    const recipeBtn = qs('#recipe-btn');
    if (recipeBtn) recipeBtn.addEventListener('click', showRecipeBook);
    playEntrance();
  }

  /* ==========================================================
     自动启动
     ----------------------------------------------------------
     document.readyState：
       'loading'   → DOM 仍在解析，等 DOMContentLoaded 再初始化
       其他状态    → DOM 已就绪，立即初始化
     ========================================================== */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
