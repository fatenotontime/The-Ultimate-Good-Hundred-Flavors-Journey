/* ============================================================
   js/cursor.js — 国风自定义光标（仿 seu.edu.cn 圆形跟随光标）
   配色与至善百味行一致：胭脂 #C04851、竹青 #789262、天青 #68B0AB
   ============================================================ */

(() => {
  'use strict';

  /* ---------- 创建光标 DOM ---------- */
  const dot  = document.createElement('div');
  const ring = document.createElement('div');
  dot.className  = 'cursor-dot';
  ring.className = 'cursor-ring';
  document.body.appendChild(dot);
  document.body.appendChild(ring);

  /* ---------- 状态 ---------- */
  let mx = window.innerWidth  / 2;
  let my = window.innerHeight / 2;
  let rx = mx, ry = my;          // ring 当前位置（带延迟跟随）
  const LERP = 0.06;             // ring 跟随速度（越小越慢，0.06 ≈ 柔和拖尾）

  /* ---------- 鼠标跟踪 ---------- */
  document.addEventListener('mousemove', e => {
    mx = e.clientX;
    my = e.clientY;
    // dot 立即跟随
    dot.style.left = mx + 'px';
    dot.style.top  = my + 'px';
  });

  /* ---------- ring 平滑跟随（requestAnimationFrame） ---------- */
  function animate() {
    rx += (mx - rx) * LERP;
    ry += (my - ry) * LERP;
    ring.style.left = rx + 'px';
    ring.style.top  = ry + 'px';
    requestAnimationFrame(animate);
  }
  requestAnimationFrame(animate);

  /* ---------- 交互元素悬停效果 ---------- */
  // 匹配：链接、按钮、省份 path、可点击元素
  const INTERACTIVE = 'a, button, [role="button"], .province, .nav-logo, .nav-links a, [tabindex]';

  document.addEventListener('mouseover', e => {
    if (e.target.closest(INTERACTIVE)) {
      ring.classList.add('cursor-hover');
      dot.classList.add('cursor-hover');
    }
  });

  document.addEventListener('mouseout', e => {
    if (e.target.closest(INTERACTIVE)) {
      ring.classList.remove('cursor-hover');
      dot.classList.remove('cursor-hover');
    }
  });

  /* ---------- 点击反馈 ---------- */
  document.addEventListener('mousedown', () => {
    ring.classList.add('cursor-click');
    dot.classList.add('cursor-click');
  });
  document.addEventListener('mouseup', () => {
    ring.classList.remove('cursor-click');
    dot.classList.remove('cursor-click');
  });

  /* ---------- 光标离开/进入页面 ---------- */
  document.addEventListener('mouseleave', () => {
    dot.style.opacity  = '0';
    ring.style.opacity = '0';
  });
  document.addEventListener('mouseenter', () => {
    dot.style.opacity  = '1';
    ring.style.opacity = '1';
  });
})();
