/* ============================================================
   js/ingredients.js — 左侧食材选择栏
   ----------------------------------------------------------
   功能：
     1. 固定于页面左侧，竖排显示食材列表
     2. 食材按中文拼音字母顺序排列
        （用 String.prototype.localeCompare('zh-CN') 排序）
     3. 顶部分类 + 放大镜搜索按钮
     4. 点击放大镜 → 展开输入框 → 输入中文实时过滤食材
     5. 点击食材项 → 高亮选中
   ============================================================ */

(() => {
  'use strict';

  /* ==========================================================
     食材数据
     ----------------------------------------------------------
     完全按指定清单（不允许增删）：
       肉类：鸡肉、猪肉、绵羊肉
       水产：-
       蛋类：鸡蛋
       粮食：面粉、糯米、大米
       蔬菜：葱
       果干：红枣
     每项 = { name: 食材名, icon: 图标文件名（PNG，无扩展名） }
     图标来自 assets/images/ingredients/（手绘线稿，120x120 透明）
     ========================================================== */
  const INGREDIENTS = [
    { name: '鸡肉',   icon: 'chicken' },
    { name: '猪肉',   icon: 'pork' },
    { name: '绵羊肉', icon: 'lamb' },
    { name: '牛肉',   icon: 'beef' },
    { name: '鸡蛋',   icon: 'egg' },
    { name: '面粉',   icon: 'flour' },
    { name: '糯米',   icon: 'glutinous-rice' },
    { name: '大米',   icon: 'rice' },
    { name: '葱',     icon: 'scallion' },
    { name: '红枣',   icon: 'red-date' },
    { name: '鱼肉',   icon: 'fish' },
  ];

  /* 图标文件的基础路径 */
  const ICON_DIR = 'assets/images/ingredients/';

  /* ---------- 元素引用 ---------- */
  const qs = (s, c = document) => c.querySelector(s);

  /* ---------- HTML 转义 ---------- */
  function esc(str) {
    const d = document.createElement('div');
    d.textContent = String(str ?? '');
    return d.innerHTML;
  }

  /* ==========================================================
     渲染食材列表
     ----------------------------------------------------------
     filter（可选）：搜索关键词，非空时只显示匹配项。
     每次调用都重新排序（拼音）+ 重建 DOM。
     ========================================================== */
  function renderList(filter = '') {
    const listEl = qs('#ingredients-list');
    if (!listEl) return;

    /* 先按拼音排序（中文 localeCompare，按 name 字段） */
    const sorted = [...INGREDIENTS].sort((a, b) =>
      a.name.localeCompare(b.name, 'zh-CN')
    );

    /* 过滤：名称包含关键词（不区分大小写） */
    const kw = filter.trim().toLowerCase();
    const items = kw
      ? sorted.filter(it => it.name.toLowerCase().includes(kw))
      : sorted;

    /* 渲染：每个食材 = PNG 图标 + 名称 */
    listEl.innerHTML = items.map(it => `
      <li class="ingredients-panel__item" data-name="${esc(it.name)}">
        <img class="ingredients-panel__item-icon"
             src="${ICON_DIR}${it.icon}.png"
             alt="" aria-hidden="true"
             width="30" height="30">
        <span class="ingredients-panel__item-name">${esc(it.name)}</span>
      </li>
    `).join('');

    /* 空结果提示 */
    if (items.length === 0) {
      listEl.innerHTML = '<li class="ingredients-panel__empty">未找到：“' + esc(filter) + '”</li>';
    }

    /* 绑定点击选中 */
    listEl.querySelectorAll('.ingredients-panel__item').forEach(li => {
      li.addEventListener('click', () => {
        if (li._wasDragged) { li._wasDragged = false; return; }  // 拖拽后不触发选中
        /* 取消其他选中，只保留当前 */
        listEl.querySelectorAll('.is-picked').forEach(x => x.classList.remove('is-picked'));
        li.classList.add('is-picked');
      });
    });

    /* 绑定 GSAP 拖拽（设计文档 5.1） */
    setupDrag(listEl);
  }

  /* ==========================================================
     【拖拽】食材图标拖拽（原生鼠标事件 + GSAP 动画）
     ----------------------------------------------------------
     需求：
       - 只拖动【图标】，食材栏里的图标始终不动（原样保留）
       - 拖起时克隆图标跟随鼠标，放大 2.2 倍 + 酒红色
       - 释放落在器具上：吸附动画 + 通知 game.js 记录食材
       - 释放落空：图标飞回食材栏原位后消失（食材栏图标恢复）
     ----------------------------------------------------------
     实现方式（原生 mousedown/mousemove/mouseup）：
       不依赖 Draggable 插件，彻底避免 transform 冲突与
       插件加载问题。克隆图标 fixed 跟随鼠标，
       释放时用 elementFromPoint 检测是否落在器具上。
     ========================================================== */
  function setupDrag(listEl) {
    listEl.querySelectorAll('.ingredients-panel__item').forEach(li => {
      const icon = li.querySelector('.ingredients-panel__item-icon');
      if (!icon) return;

      /* 禁用 img 原生拖拽 */
      icon.draggable = false;
      icon.style.webkitUserDrag = 'none';

      /* 拖拽状态 */
      let clone = null;
      let startRect = null;
      let offsetX = 0, offsetY = 0;
      let dragging = false;
      let moved = false;

      /* ---- 按下：准备拖拽 ---- */
      const onPointerDown = (e) => {
        if (e.button !== undefined && e.button !== 0) return;  // 仅左键/触摸
        dragging = true;
        moved = false;
        startRect = icon.getBoundingClientRect();
        offsetX = e.clientX - startRect.left;
        offsetY = e.clientY - startRect.top;

        /* 克隆图标（原列表保持不动） */
        clone = icon.cloneNode(true);
        clone.classList.add('is-dragging');   // 显眼样式（放大/变色）
        clone.style.position = 'fixed';
        clone.style.left = (e.clientX - offsetX) + 'px';
        clone.style.top  = (e.clientY - offsetY) + 'px';
        clone.style.zIndex = '9999';
        clone.style.pointerEvents = 'none';   // 让 elementFromPoint 穿透
        clone.style.margin = '0';
        document.body.appendChild(clone);
        gsap.fromTo(clone, { scale: 1 }, { scale: 2.2, duration: 0.15, ease: 'power2.out' });
      };

      /* ---- 移动：克隆体跟随鼠标 ---- */
      const onPointerMove = (e) => {
        if (!dragging || !clone) return;
        if (!moved) {
          /* 记录位移阈值：超过 5px 才算拖拽 */
          const dx = e.clientX - offsetX - startRect.left;
          const dy = e.clientY - offsetY - startRect.top;
          if (Math.abs(dx) < 5 && Math.abs(dy) < 5) return;
          moved = true;
        }
        clone.style.left = (e.clientX - offsetX) + 'px';
        clone.style.top  = (e.clientY - offsetY) + 'px';
      };

      /* ---- 释放：检测落点 ---- */
      const onPointerUp = (e) => {
        if (!dragging) return;
        dragging = false;
        if (!moved) {
          /* 未拖动：视为点击，交给 click 事件处理 */
          if (clone) { clone.remove(); clone = null; }
          return;
        }
        li._wasDragged = true;               // 标记拖过，避免触发点击选中

        /* 克隆体中心点 */
        const rect = clone.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top  + rect.height / 2;

        /* 检测中心点下方是否有器具 */
        const target = document.elementFromPoint(cx, cy);
        const station = target ? target.closest('.station') : null;

        if (station) {
          /* ---- 落在器具上：吸附动画 ---- */
          const tr = station.getBoundingClientRect();
          gsap.to(clone, {
            x: tr.left + tr.width / 2 - rect.left - rect.width / 2,
            y: tr.top  + tr.height / 2 - rect.top  - rect.height / 2,
            scale: 1,
            duration: 0.4,
            ease: 'back.out(2)',        // 过冲回弹（吸附感）
            onComplete: () => { clone.remove(); clone = null; }
          });
          /* 通知 game.js：食材投入器具（由游戏逻辑记录/判定） */
          const name = li.dataset.name || '';
          const stationId = station.dataset.station;
          const evt = new CustomEvent('ingredient-dropped', {
            detail: { stationId, name }
          });
          document.dispatchEvent(evt);
        } else {
          /* ---- 落空：克隆体飞回食材栏原位后消失 ---- */
          gsap.to(clone, {
            left: startRect.left, top: startRect.top, scale: 1,
            duration: 0.5,
            ease: 'elastic.out(1, 0.5)', // 橡皮筋回弹
            onComplete: () => { clone.remove(); clone = null; }
          });
        }
      };

      /* 绑定事件：li 为触发区（Pointer Events 兼容鼠标+触摸） */
      li.addEventListener('pointerdown', onPointerDown);
      document.addEventListener('pointermove', onPointerMove);
      document.addEventListener('pointerup', onPointerUp);
    });
  }

  /* ==========================================================
     搜索框开合
     ----------------------------------------------------------
     点击放大镜按钮 → 展开/收起输入框。
     展开后自动聚焦，输入时实时过滤列表。
     ========================================================== */
  function setupSearch() {
    const btn = qs('#ingredients-search-btn');
    const box = qs('#ingredients-searchbox');
    const input = qs('#ingredients-search-input');
    if (!btn || !box || !input) return;

    btn.addEventListener('click', () => {
      const opening = box.hidden;
      box.hidden = !opening;
      btn.classList.toggle('is-active', opening);
      if (opening) {
        input.value = '';
        input.focus();
        renderList('');
      } else {
        renderList('');
      }
    });

    /* 实时过滤：输入即搜索 */
    input.addEventListener('input', () => {
      renderList(input.value);
    });

    /* 按 Esc 收起搜索框并恢复全列表 */
    input.addEventListener('keydown', e => {
      if (e.key === 'Escape') {
        box.hidden = true;
        btn.classList.remove('is-active');
        renderList('');
      }
    });
  }

  /* ---------- 初始化 ---------- */
  function init() {
    /* 暴露食材名→图标映射（供 game.js 在器具托盘渲染图标） */
    window.INGREDIENT_ICONS = {};
    INGREDIENTS.forEach(it => {
      window.INGREDIENT_ICONS[it.name] = it.icon;
    });
    renderList('');
    setupSearch();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();