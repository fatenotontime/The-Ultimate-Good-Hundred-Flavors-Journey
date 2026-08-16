/* ============================================================
   js/province.js — 省份美食列表页渲染
   依据《至善百味行网站设计思路书》2.4 第二层 / 3.3 / 4.1 / 4.4 编写

   功能：
   1. 读取 URL 参数 ?id=xxx 获取省份 id
   2. 从 provinces.json 获取省份基础信息（名称、颜色）
   3. 尝试加载 data/provinces/{id}.json 的菜品数据
   4. 有数据：渲染横幅 + 卡片网格（GSAP 错峰入场）
   5. 无数据：以烹饪美食语气展示「未完待续」占位
   ============================================================ */

(() => {
  'use strict';

  const PROVINCES_URL = 'data/provinces.json';
  const grid   = qs('#dish-grid');
  const banner = qs('.province-banner');
  const nav    = qs('#site-nav');

  /* ---------- 导航栏滚动吸附（与首页一致，2.5） ---------- */
  window.addEventListener('scroll', () => {
    nav.classList.toggle('is-scrolled', window.scrollY > 8);
  }, { passive: true });

  /* ---------- 渲染卡片（设计文档 2.4：缩略图 + 菜名 + 口味小标签） ---------- */
  function renderCards(dishes) {
    const html = dishes.map((dish, i) => `
      <article class="dish-card" data-dish="${esc(dish.id)}"
               style="animation-delay:${i * 0.09}s">
        <div class="dish-card__img">
          <img src="${esc(dish.thumbnail)}" alt="${esc(dish.name)}"
               loading="lazy" decoding="async">
        </div>
        <div class="dish-card__body">
          <h3 class="dish-card__name">${esc(dish.name)}</h3>
          <p class="dish-card__subtitle">${esc(dish.subtitle || '')}</p>
          <div class="dish-card__tags">
            ${(dish.tags || []).map(t => `<span class="dish-card__tag">${esc(t)}</span>`).join('')}
          </div>
        </div>
      </article>
    `).join('');
    grid.innerHTML = html;

    // 卡片入场动画：错峰依次弹出（设计文档 2.6 列表页入场）
    if (window.gsap) {
      gsap.from('.dish-card', {
        opacity: 0, y: 26, scale: 0.94,
        duration: 0.6, stagger: 0.1, ease: 'back.out(1.5)'
      });
    }

    // 点击卡片 → 详情页（第三层 detail.html，设计文档 3.3）
    qsa('.dish-card', grid).forEach(card => {
      card.addEventListener('click', () => {
        const dishId = card.dataset.dish;
        const provId = getUrlParam('id');
        window.location.href = `detail.html?province=${provId}&dish=${dishId}`;
      });
      card.setAttribute('role', 'button');
      card.setAttribute('tabindex', '0');
      card.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); card.click(); }
      });
    });
  }

  /* ---------- 「未完待续」空状态（烹饪美食语气） ---------- */
  function renderEmpty(provName) {
    const emptyHtml = `
      <div class="dish-empty">
        <div class="dish-empty__icon">🍲</div>
        <h2 class="dish-empty__title">${esc(provName)}风味 · 未完待续</h2>
        <p class="dish-empty__text">
          ${esc(provName)}的灶台还在咕嘟咕嘟冒着热气，
          大厨正在案板上细细备料——这道风味尚在文火慢炖之中。
        </p>
        <p class="dish-empty__text">
          待食材齐备、火候正好，我们将把这方水土的滋味
          盛盘呈上，邀您再品一箸。
        </p>
        <p class="dish-empty__hint">敬请期待 · 下次再来赴这场宴席 ✨</p>
        <a class="back-home" href="index.html">返回地图，继续漫游</a>
      </div>
    `;
    grid.innerHTML = emptyHtml;
  }

  /* ---------- 渲染横幅（省名书法字 + 简介） ---------- */
  function renderBanner(prov, provData) {
    const bg = provData && provData.banner
      ? provData.banner
      : 'assets/images/decorations/paper-texture.png';
    banner.innerHTML = `
      <img class="province-banner__bg" src="${esc(bg)}" alt="" aria-hidden="true">
      <div class="province-banner__inner">
        <span class="province-banner__short">${esc(prov.shortName)}</span>
        <h1 class="province-banner__title">${esc(prov.name)}</h1>
        <p class="province-banner__intro">${esc(provData ? provData.intro : prov.description)}</p>
      </div>
    `;
    // 横幅淡入（GSAP）
    if (window.gsap) {
      gsap.from('.province-banner__inner', {
        opacity: 0, y: 24, duration: 0.8, ease: 'power2.out'
      });
    }
  }

  /* ---------- 设置面包屑（首页 > 省名） ---------- */
  function renderBreadcrumb(prov) {
    qs('.breadcrumb').innerHTML = `
      <a href="index.html">首页</a>
      <span class="sep">›</span>
      <span class="current">${esc(prov.name)}</span>
    `;
  }

  /* ---------- 社会实践竖排入口（右侧） ----------
     入口 HTML 已写死在 province.html（保证一定显示），
     此处只做两件事：
       1. 按省份更新跳转链接 practice.html?province={id}
       2. 数据探测：无实践数据的省份隐藏入口
     ---------------------------------------------------- */
  function renderPractice(provId) {
    const entry = qs('#practice-entry');
    if (!entry) return;

    // 1. 更新跳转链接（指向该省社会实践展示页）
    const link = entry.querySelector('.practice-entry__link');
    if (link) link.href = `practice.html?province=${esc(provId)}`;

    // 2. 数据探测：有数据加角标（仅装饰），无数据也不隐藏入口——
    //    展示页自身有"敬请期待"兜底，入口始终可见
    fetchJSON(`data/provinces/${provId}-practice.json`)
      .then(() => { entry.classList.add('has-data'); })
      .catch(() => { entry.classList.add('no-data'); });
  }

  /* ---------- 主流程 ---------- */
  async function init() {
    const provId = getUrlParam('id');
    if (!provId) {
      grid.innerHTML = '<div class="dish-empty"><p class="dish-empty__hint">缺少省份参数，请从首页地图进入。</p><a class="back-home" href="index.html">返回首页</a></div>';
      return;
    }

    // 1. 省份基础信息
    let prov = null;
    try {
      const all = await fetchJSON(PROVINCES_URL);
      prov = all.provinces.find(p => p.id === provId);
    } catch (e) { /* 继续，prov 可能为 null */ }

    if (!prov) {
      grid.innerHTML = '<div class="dish-empty"><p class="dish-empty__hint">未找到该省份信息。</p><a class="back-home" href="index.html">返回首页</a></div>';
      return;
    }

    // 2. 尝试加载该省菜品数据
    let provData = null;
    try {
      provData = await fetchJSON(`data/provinces/${provId}.json`);
    } catch (e) {
      provData = null;   // 素材未齐备 → 未完待续
    }

    // 3. 渲染横幅 + 面包屑（两个分支共用）
    renderBreadcrumb(prov);
    renderBanner(prov, provData);
    document.title = `${prov.name} · 至善百味行`;

    // 4. 渲染内容区
    const dishes = (provData && provData.dishes) || [];
    if (dishes.length > 0) {
      renderCards(dishes);
    } else {
      renderEmpty(prov.name);
    }

    // 5. 渲染社会实践（右侧竖向面板）
    renderPractice(provId);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
