/* ============================================================
   js/practice.js — 社会实践展示页渲染
   ----------------------------------------------------------
   功能：
   1. 读取 URL 参数 ?province=xxx
   2. 加载 data/provinces/{id}-practice.json
   3. 渲染：横幅（标题/副标题）→ 简介 → 竖向图片画廊 → 文案段落
   4. GSAP 错峰入场动画
   ============================================================ */

(() => {
  'use strict';

  const nav = qs('#site-nav');

  /* ---------- 导航栏滚动吸附（与全站一致） ---------- */
  window.addEventListener('scroll', () => {
    nav.classList.toggle('is-scrolled', window.scrollY > 8);
  }, { passive: true });

  /* ---------- 渲染横幅 ---------- */
  function renderBanner(data) {
    const sub = qs('#practice-banner-sub');
    if (sub) sub.textContent = `${data.place} · ${data.subtitle || ''}`;
  }

  /* ---------- 渲染面包屑（首页 › 省名 › 美味背后的故事） ---------- */
  function renderBreadcrumb(provId, data) {
    const crumb = qs('#practice-breadcrumb');
    if (crumb) crumb.textContent = data.title || '美味背后的故事';
    // 返回省页链接
    const backLink = qs('#practice-back-link');
    if (backLink) backLink.href = `province.html?id=${esc(provId)}`;
  }

  /* ---------- 渲染简介 ---------- */
  function renderIntro(data) {
    const el = qs('#practice-intro');
    if (el) el.textContent = data.intro || '';
  }

  /* ---------- 渲染图文左右排版 ----------
     结构：每 2 段文字为一组（左侧），配 1 张图（右侧），
           形成"左文字右图片"的横排行，逐行向下。
     ---------------------------------------------------- */
  function renderFlow(data) {
    const flow = qs('#practice-flow');
    if (!flow) return;

    const paras = data.paragraphs || [];
    const imgs  = data.images || [];

    const html = [];
    let imgIdx = 0;
    // 每 2 段一组
    for (let i = 0; i < paras.length; i += 2) {
      const group = paras.slice(i, i + 2);
      const img = imgIdx < imgs.length ? imgs[imgIdx++] : null;

      html.push(`
        <div class="practice-flow__row">
          <!-- 左：文字（1~2 段） -->
          <div class="practice-flow__text">
            ${group.map(p => `<p>${esc(p)}</p>`).join('')}
          </div>
          <!-- 右：图片（有图时显示） -->
          ${img ? `
            <figure class="practice-flow__figure">
              <img src="${esc(img.src)}" alt="${esc(img.caption)}"
                   loading="lazy" decoding="async">
              <figcaption class="practice-flow__caption">${esc(img.caption)}</figcaption>
            </figure>
          ` : ''}
        </div>
      `);
    }
    // 若图比"每2段1图"更多，剩余图补在末尾
    while (imgIdx < imgs.length) {
      const img = imgs[imgIdx++];
      html.push(`
        <div class="practice-flow__row">
          <div class="practice-flow__text"></div>
          <figure class="practice-flow__figure">
            <img src="${esc(img.src)}" alt="${esc(img.caption)}"
                 loading="lazy" decoding="async">
            <figcaption class="practice-flow__caption">${esc(img.caption)}</figcaption>
          </figure>
        </div>
      `);
    }

    flow.innerHTML = html.join('');
  }

  /* ---------- 入场动画（GSAP 错峰） ---------- */
  function playEntrance() {
    if (!window.gsap) return;
    // 横幅
    gsap.from('.practice-banner__inner', {
      opacity: 0, y: -24, duration: 0.8, ease: 'power2.out'
    });
    // 简介 + 左右行依次淡入
    gsap.from('.practice-intro', {
      opacity: 0, y: 20, duration: 0.6, ease: 'power2.out', delay: 0.25
    });
    gsap.from('.practice-flow__row', {
      opacity: 0, y: 26,
      duration: 0.6, stagger: 0.15, ease: 'power2.out', delay: 0.35
    });
  }

  /* ---------- 主流程 ---------- */
  async function init() {
    const provId = getUrlParam('province');
    if (!provId) {
      const el = qs('#practice-flow');
      if (el) el.innerHTML = '<p style="color:var(--yanzhi);">缺少省份参数，请从省页进入。</p>';
      return;
    }

    let data = null;
    try {
      data = await fetchJSON(`data/provinces/${provId}-practice.json`);
    } catch (e) {
      const el = qs('#practice-flow');
      if (el) el.innerHTML = '<p style="color:var(--yanzhi);">社会实践资料尚未整理完成，敬请期待。</p>';
      return;
    }

    document.title = `${data.title || '美味背后的故事'} · 至善百味行`;

    renderBanner(data);
    renderBreadcrumb(provId, data);
    renderIntro(data);
    renderFlow(data);
    playEntrance();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
