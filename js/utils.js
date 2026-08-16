/* ============================================================
   js/utils.js — 工具函数
   依据《至善百味行网站设计思路书》3.2 目录结构编写
   ============================================================ */

/** 简洁的 DOM 选择器 */
const qs = (sel, scope = document) => scope.querySelector(sel);
const qsa = (sel, scope = document) => [...scope.querySelectorAll(sel)];

/** 读取 URL 查询参数 */
function getUrlParam(name) {
  return new URLSearchParams(window.location.search).get(name);
}

/**
 * 抓取 JSON 数据（Fetch API，设计文档 3.1 / 4.4）
 * 失败时抛出带清晰提示的错误
 */
async function fetchJSON(url) {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.error(`[数据加载失败] ${url}`, err);
    throw err;
  }
}

/**
 * 将字符串中的 \n 转为 HTML 段落
 * （设计文档 4.1 数据录入规范：description 中用 \n 表示换行）
 */
function nl2p(text) {
  return String(text)
    .split('\n')
    .map(seg => `<p>${esc(seg)}</p>`)
    .join('');
}

/** HTML 转义，防注入 */
function esc(str) {
  const div = document.createElement('div');
  div.textContent = String(str ?? '');
  return div.innerHTML;
}

/** 数字滚动格式化（TextPlugin 使用，设计文档 2.6） */
function formatCount(n) {
  return Number(n).toLocaleString('zh-CN');
}

/** 判断元素是否在视口内（Intersection Observer 懒加载，设计文档 3.1/6） */
function isInViewport(el, margin = 0) {
  const r = el.getBoundingClientRect();
  return r.top < window.innerHeight + margin && r.bottom > -margin;
}

/**
 * 图片懒加载观察器
 * 返回一个可复用的 IntersectionObserver（设计文档 4.2 第四步）
 */
function createLazyLoader(onLoad = () => {}) {
  if (!('IntersectionObserver' in window)) return null;
  const io = new IntersectionObserver(
    entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const img = entry.target;
          if (img.dataset.src) {
            img.src = img.dataset.src;
            img.removeAttribute('data-src');
          }
          onLoad(img);
          io.unobserve(img);
        }
      });
    },
    { rootMargin: '0px 0px 120px 0px' }
  );
  return io;
}
