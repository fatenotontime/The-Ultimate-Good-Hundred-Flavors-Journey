/* ============================================================
   js/detail.js — 美食详情页交互逻辑
   依据《至善百味行网站设计思路书》2.4 第三层 / 2.6 / 3.3 / 4.1 编写

   功能：
   1. 读取 URL 参数 province + dish
   2. 加载省份 JSON → 定位菜品数据
   3. 渲染大图轮播（多图支持）
   4. 渲染文字区（菜名书法、产地、标签、介绍）
   5. GSAP 视差 + 文字逐行揭示动画
   ============================================================ */

(() => {
  'use strict';

  /* ---------- 轮播控制器 ---------- */
  class Carousel {
    constructor(container) {
      this.main    = container.querySelector('.carousel__main');
      this.imgs    = [...container.querySelectorAll('.carousel__img')];
      this.dots    = [...container.querySelectorAll('.carousel__dot')];
      this.btnPrev = container.querySelector('.carousel__btn--prev');
      this.btnNext = container.querySelector('.carousel__btn--next');
      this.current = 0;
      if (this.imgs.length <= 1) {
        // 单图：隐藏所有控制
        this.btnPrev.style.display = 'none';
        this.btnNext.style.display = 'none';
        this.dots.forEach(d => d.style.display = 'none');
        if (this.imgs[0]) this.imgs[0].classList.add('is-active');
        return;
      }
      this.imgs[0].classList.add('is-active');
      this.dots[0].classList.add('is-active');
      this.btnPrev.addEventListener('click', () => this.prev());
      this.btnNext.addEventListener('click', () => this.next());
      this.dots.forEach((dot, i) => dot.addEventListener('click', () => this.goTo(i)));
      // 触摸滑动支持
      let startX = 0;
      this.main.addEventListener('touchstart', e => { startX = e.touches[0].clientX; }, { passive: true });
      this.main.addEventListener('touchend', e => {
        const dx = e.changedTouches[0].clientX - startX;
        if (Math.abs(dx) > 50) dx < 0 ? this.next() : this.prev();
      });
    }

    goTo(index) {
      this.imgs[this.current].classList.remove('is-active');
      this.dots[this.current].classList.remove('is-active');
      this.current = (index + this.imgs.length) % this.imgs.length;
      this.imgs[this.current].classList.add('is-active');
      this.dots[this.current].classList.add('is-active');
    }
    prev() { this.goTo(this.current - 1); }
    next() { this.goTo(this.current + 1); }
  }

  /* ---------- 空状态（菜品不存在）---------- */
  function renderEmpty() {
    const main = qs('.detail-main');
    if (main) { main.style.display = 'none'; }
    const empty = qs('.detail-empty');
    if (empty) empty.style.display = 'block';
    // 隐藏面包屑中的菜名
    const dishBreadcrumb = qs('#dish-name');
    if (dishBreadcrumb) dishBreadcrumb.textContent = '未找到';
  }

  /* ---------- 渲染完整内容 ---------- */
  function renderDetail(dish, province) {
    // 面包屑
    const provLink = qs('#province-link');
    const dishBreadcrumb = qs('#dish-name');
    if (province) {
      if (provLink) {
        provLink.href = `province.html?id=${province.id}`;
        provLink.textContent = province.name;
      }
      document.title = `${dish.name} · ${province.name} · 至善百味行`;
    }
    if (dishBreadcrumb) dishBreadcrumb.textContent = dish.name;

    // 轮播图
    const carousel = qs('.detail-carousel');
    const images = dish.images && dish.images.length > 0 ? dish.images : [dish.thumbnail || ''];
    const imgsHtml = images.map(src =>
      `<img class="carousel__img" src="${esc(src)}" alt="${esc(dish.name)}" loading="lazy" decoding="async">`
    ).join('');
    const dotsHtml = images.map((_, i) =>
      `<div class="carousel__dot${i === 0 ? ' is-active' : ''}" data-index="${i}"></div>`
    ).join('');

    carousel.innerHTML = `
      <div class="carousel__main">
        ${imgsHtml}
        <button class="carousel__btn carousel__btn--prev" aria-label="上一张">‹</button>
        <button class="carousel__btn carousel__btn--next" aria-label="下一张">›</button>
      </div>
      <div class="carousel__dots">${dotsHtml}</div>
    `;

    // 初始化轮播
    new Carousel(carousel);

    // 文字区
    const content = qs('.detail-content');
    content.innerHTML = `
      <h1 class="detail-content__name">${esc(dish.name)}</h1>
      ${dish.subtitle ? `<p class="detail-content__subtitle">${esc(dish.subtitle)}</p>` : ''}
      <div class="detail-content__meta">
        ${dish.origin ? `<span class="detail-content__origin">${esc(dish.origin)}</span>` : ''}
        ${(dish.tags || []).map(t => `<span class="detail-content__tag">${esc(t)}</span>`).join('')}
      </div>
      <div class="detail-content__divider"></div>
      ${dish.description ? `<p class="detail-content__desc">${esc(dish.description).replace(/\n/g, '<br>')}</p>` : ''}
      ${(dish.ingredients || []).length > 0 ? `
        <div class="detail-content__ingredients">
          <div class="detail-content__ingredients-label">主要食材</div>
          <div class="detail-content__ingredient-list">
            ${dish.ingredients.map(i => `<span class="detail-content__ingredient">${esc(i)}</span>`).join('')}
          </div>
        </div>
      ` : ''}
      <a class="detail-content__back" href="${province ? `province.html?id=${province.id}` : 'index.html'}">
        ← 返回${province ? province.name : '首页'}
      </a>
    `;

    // GSAP 动画：轮播图淡入、右侧文字逐段落滑入（设计文档 2.6 详情页文字逐行揭示）
    if (window.gsap) {
      gsap.from(carousel, { opacity: 0, x: -30, duration: 0.8, ease: 'power2.out' });
      gsap.from(content.children, {
        opacity: 0, y: 20, duration: 0.65,
        stagger: 0.1, ease: 'power2.out', delay: 0.2
      });
    }
  }

  /* ---------- 主流程 ---------- */
  async function init() {
    const provId = getUrlParam('province');
    const dishId = getUrlParam('dish');

    if (!provId || !dishId) {
      renderEmpty();
      return;
    }

    let province = null;
    let dish = null;

    try {
      // 获取省份基础信息（for breadcrumb）
      const allProvs = await fetchJSON('data/provinces.json');
      province = allProvs.provinces.find(p => p.id === provId);
    } catch (e) {}

    try {
      // 获取省份菜品数据
      const provData = await fetchJSON(`data/provinces/${provId}.json`);
      dish = (provData.dishes || []).find(d => d.id === dishId);
    } catch (e) {}

    if (!dish) {
      renderEmpty();
      return;
    }

    // 隐藏空状态，显示主内容
    const empty = qs('.detail-empty');
    if (empty) empty.style.display = 'none';

    renderDetail(dish, province);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
