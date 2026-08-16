/* ============================================================
   js/map.js — 首页地图交互逻辑
   依据《至善百味行网站设计思路书》2.6 / 4.1 / 4.4 编写

   功能：
   1. 加载 data/provinces.json，为 SVG 各省 path 注入填充色与悬停色
   2. a. 地图描边动画（DrawSVGPlugin）：轮廓如笔画出
   3. b. 悬停浮窗动画：填充高亮 + scale 放大 + 浮窗滑入
   4. c. 点击过渡动画（方案A：淡出 + 滚动，方案B预留）
   ============================================================ */

(() => {
  'use strict';

  const DATA_URL = 'data/provinces.json';
  const SVG_URL  = 'assets/map/china.svg';

  const mapSvg    = document.getElementById('china-map');
  const tooltip   = document.getElementById('map-tooltip');
  const ttProv    = document.getElementById('tt-province');
  const ttTags    = document.getElementById('tt-tags');
  const ttDesc    = document.getElementById('tt-desc');
  const nav       = document.getElementById('site-nav');

  const provinceMeta = new Map();   // id -> 省份数据
  const pathEls      = new Map();   // id -> path 元素

  let mapReady = false;

  /* ----------------------------------------------------------
     加载 china.svg 并注入到 #china-map
     ---------------------------------------------------------- */
  async function loadMapSvg() {
    try {
      console.log('[map] 开始加载 SVG:', SVG_URL);
      const resp = await fetch(SVG_URL);
      console.log('[map] fetch 响应:', resp.status, resp.statusText, resp.url);
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const svgText = await resp.text();
      console.log('[map] SVG 文本长度:', svgText.length);
      const parser = new DOMParser();
      const doc = parser.parseFromString(svgText, 'image/svg+xml');
      const parseErr = doc.querySelector('parsererror');
      if (parseErr) throw new Error('SVG 解析错误: ' + parseErr.textContent.slice(0, 100));
      const svgEl = doc.documentElement;
      // 同步 viewBox 到页内 #china-map（与 china.svg 一致）
      const vb = svgEl.getAttribute('viewBox');
      if (vb) mapSvg.setAttribute('viewBox', vb);
      // 提取 <g id="china-provinces"> 并 appendChild 到页内 #china-map
      const group = svgEl.querySelector('#china-provinces');
      if (!group) throw new Error('china-provinces group not found in SVG');
      console.log('[map] 找到 provinces group，子元素数量:', group.children.length);
      // 保留原有子元素（loading 文字等），只插入省份组
      mapSvg.appendChild(group);
      // 移除 loading 提示
      const loading = mapSvg.querySelector('#map-loading');
      if (loading) loading.remove();
      console.log('[map] SVG 注入成功');
    } catch (err) {
      console.error('[map] SVG 加载失败:', err);
      const loading = mapSvg.querySelector('#map-loading');
      if (loading) {
        loading.textContent = '地图加载失败: ' + err.message.slice(0, 50);
        loading.setAttribute('fill', '#C04851');
      }
    }
  }

  /* ----------------------------------------------------------
     导航栏滚动吸附（2.5）
     ---------------------------------------------------------- */
  window.addEventListener('scroll', () => {
    nav.classList.toggle('is-scrolled', window.scrollY > 8);
  }, { passive: true });

  /* ----------------------------------------------------------
     为 SVG 注入省份 path 与配色
     ---------------------------------------------------------- */
  function injectProvinces(provinces) {
    provinces.forEach(p => {
      const path = mapSvg.querySelector(`path[data-province="${p.id}"]`);
      if (!path) return;
      path.setAttribute('fill', p.fill);
      path.dataset.fill = p.fill;
      path.dataset.hover = p.hover || darken(p.fill, 15);   // 2.2 悬停加深约 15%
      path.setAttribute('stroke', '#FDFBF8');
      provinceMeta.set(p.id, p);
      pathEls.set(p.id, path);
    });
    mapReady = true;
  }

  /** 颜色加深工具：将 hex 颜色加深 percent% */
  function darken(hex, percent) {
    const n = parseInt(hex.replace('#', ''), 16);
    const r = Math.max(0, Math.round(((n >> 16) & 0xFF) * (1 - percent / 100)));
    const g = Math.max(0, Math.round(((n >> 8) & 0xFF) * (1 - percent / 100)));
    const b = Math.max(0, Math.round((n & 0xFF) * (1 - percent / 100)));
    return `rgb(${r}, ${g}, ${b})`;
  }

  /* ----------------------------------------------------------
     2.6-b 悬停浮窗动画
     ---------------------------------------------------------- */
  function bindHover(path, meta) {
    const onEnter = () => {
      // 高亮填充 + 轻微放大（代码示例：fill 高亮, scale 1.04）
      gsap.to(path, {
        fill: path.dataset.hover,
        scale: 1.04,
        transformOrigin: '50% 50%',
        duration: 0.2,
        ease: 'power1.out'
      });
      // 浮窗内容
      ttProv.textContent = meta.name;
      ttTags.innerHTML = (meta.tasteTags || []).map(t =>
        `<span class="tt-tag">${t}</span>`).join('');
      ttDesc.textContent = meta.description || '';
      positionTooltip(path, meta);
      // 浮窗从透明度 0 平滑过渡到 1，伴随 y 轴位移滑入
      gsap.fromTo(tooltip,
        { opacity: 0, y: 12 },
        { opacity: 1, y: 0, duration: 0.3, ease: 'power2.out' }
      );
    };

    const onLeave = () => {
      // 恢复原填充色（代码示例：'#A8623F' 为示意，此处用各省原色）
      gsap.to(path, {
        fill: path.dataset.fill,
        scale: 1,
        duration: 0.3,
        ease: 'power1.out'
      });
      gsap.to(tooltip, {
        opacity: 0, y: 12, duration: 0.2,
        onComplete: () => { tooltip.style.opacity = ''; }
      });
    };

    path.addEventListener('mouseenter', onEnter);
    path.addEventListener('mouseleave', onLeave);
    path.addEventListener('focus', onEnter, true);
    path.addEventListener('blur', onLeave, true);
    path.setAttribute('tabindex', '0');
    path.setAttribute('role', 'button');
    path.setAttribute('aria-label', `${meta.name}，点击进入该省美食列表`);
  }

  /** 让浮窗贴靠在省份旁边（右侧优先，越界则移到左侧） */
  function positionTooltip(path, meta) {
    // 从当前 #china-map 的 viewBox 动态读取（与 china.svg 一致）
    const vb = mapSvg.viewBox.baseVal;   // {x, y, width, height}
    const VB_X = vb.x, VB_Y = vb.y, VB_W = vb.width, VB_H = vb.height;
    const mapRect = mapSvg.closest('#map-container').getBoundingClientRect();
    const scaleX  = mapRect.width  / VB_W;
    const scaleY  = mapRect.height / VB_H;
    const bbox    = path.getBBox();

    // path 中心点 → 页面绝对坐标（viewBox 有偏移，需减去 VB_X/VB_Y）
    const cx = mapRect.left + (bbox.x - VB_X + bbox.width  / 2) * scaleX;
    const cy = mapRect.top  + (bbox.y - VB_Y + bbox.height / 2) * scaleY;

    const tipW = tooltip.offsetWidth;
    const tipH = tooltip.offsetHeight;

    let left = cx + 60;
    let top  = cy - tipH / 2;
    if (left + tipW > mapRect.right  - 12) left = cx - tipW - 60;
    if (left < mapRect.left + 12)        left = mapRect.left + 12;
    left = Math.max(12, left);
    top  = Math.max(12, Math.min(top, mapRect.bottom - tipH - 12));

    tooltip.style.left = `${left - mapRect.left}px`;
    tooltip.style.top  = `${top - mapRect.top}px`;
  }

  /* ----------------------------------------------------------
     2.6-c 点击过渡动画（方案A：淡出 + 滚动）
     ---------------------------------------------------------- */
  function bindClick(path, meta) {
    path.addEventListener('click', () => {
      if (!mapReady) return;
      // 方案A（极简）：地图淡出后跳转（代码示例）
      gsap.to('#map-container', {
        opacity: 0,
        duration: 0.4,
        ease: 'power1.in',
        onComplete: () => {
          window.location.href = `province.html?id=${meta.id}`;
        }
      });
    });
    path.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        path.click();
      }
    });
  }

  /* ==========================================================
     2.6-a 地图浮现动画（完全重写版）
     ----------------------------------------------------------
     设计思路书 2.6-a 要求："让中国地图的轮廓像用笔画出来
     一样逐渐显现，营造庄重而富有仪式感的第一印象。"
     ----------------------------------------------------------
     实现方式：
       - 按地理位置从西北往东南排列全部 34 个省（单一数组）
       - 用 GSAP 一个 fromTo + 均匀 stagger：
         每个省独立淡入（opacity 0→1）+ 轻微缩放（0.92→1）
       - 省份之间间隔完全相同（stagger 恒定），
         无波次、无分组、无特殊定位，节奏干净均匀
     ========================================================== */

  // 全部省份出现顺序（从西北往东南，按地理位置排布）
  // 黑龙江和四川提前，避免等待过久
  const PROVINCE_ORDER = [
    // 黑龙江最先（东北），四川第二（西部），紧随西北之后
    'heilongjiang', 'sichuan',
    // 西北边疆
    'xinjiang', 'xizang', 'qinghai', 'gansu', 'ningxia', 'neimenggu',
    // 北部（东北 + 华北）
    'jilin', 'liaoning', 'beijing', 'tianjin',
    'hebei', 'shanxi', 'shaanxi',
    // 中部（西南 + 中原 + 华东）
    'chongqing', 'guizhou', 'yunnan', 'hubei', 'henan',
    'shandong', 'anhui', 'jiangsu', 'shanghai',
    // 东南沿海（长江以南 + 岛屿）
    'hunan', 'jiangxi', 'zhejiang', 'fujian', 'guangxi', 'guangdong',
    'hainan', 'taiwan', 'xianggang', 'aomen'
  ];

  // 浮现参数（集中在此调整）
  const REVEAL_DURATION = 0.5;   // 每个省淡入耗时（秒）
  const REVEAL_STAGGER  = 0.08;  // 省与省之间的间隔（秒，恒定均匀）
  const REVEAL_DELAY    = 0.2;   // 页面加载后延迟开始（秒）

  function playDrawAnimation() {
    // 按顺序收集省份 path 元素（保持从西北到东南的次序）
    const paths = PROVINCE_ORDER
      .map(id => document.querySelector(`#china-map .province[data-province="${id}"]`))
      .filter(Boolean);

    // 初始：所有省份透明 + 轻微缩小（隐藏状态）
    gsap.set(paths, {
      opacity: 0,
      scale: 0.92,
      transformOrigin: '50% 50%'
    });

    // 单个 fromTo + 均匀 stagger：一个省一个省依次浮现
    return gsap.fromTo(paths,
      { opacity: 0, scale: 0.92, transformOrigin: '50% 50%' },
      {
        opacity: 1,
        scale: 1,
        duration: REVEAL_DURATION,
        stagger: REVEAL_STAGGER,   // 每个省间隔完全相同
        ease: 'power2.out',        // 淡入缓动（先快后慢，如水墨晕开）
        delay: REVEAL_DELAY
      }
    );
  }

  /* ----------------------------------------------------------
     主流程
     ---------------------------------------------------------- */
  async function init() {
    // 1. 加载 china.svg 并注入省份 path
    await loadMapSvg();

    // 2. 加载省份元数据
    let provinces;
    try {
      provinces = (await fetchJSON(DATA_URL)).provinces;
    } catch (e) {
      const errP = document.createElement('p');
      errP.style.cssText = 'text-align:center;color:#C04851;margin-top:16px;';
      errP.textContent = '地图数据加载失败，请检查 data/provinces.json 是否存在。';
      mapSvg.insertAdjacentElement('afterend', errP);
      return;
    }

    injectProvinces(provinces);

    // 绑定交互
    provinces.forEach(p => {
      const path = pathEls.get(p.id);
      if (!path) return;
      bindHover(path, p);
      bindClick(path, p);
    });

    // 动画期间禁用交互，动画完成后恢复
    document.querySelectorAll('#china-map .province').forEach(p => {
      p.style.pointerEvents = 'none';
    });

    const anim = playDrawAnimation();
    // 动画完成后恢复交互
    anim.eventCallback('onComplete', () => {
      document.querySelectorAll('#china-map .province').forEach(p => {
        p.style.pointerEvents = '';
      });
      mapSvg.classList.add('map-ready');
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
