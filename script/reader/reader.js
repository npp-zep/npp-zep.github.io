/**
 * 阅读器：打开文章、加载 Markdown、统计信息、字体缩放、滚动控制
 * 依赖：core/utils.js, core/sanitize.js, render/markdown.js, articles/config.js, reader/toc.js
 * 暴露：App.reader.open(filename, title, info) / resetInfo() / closeReaderUI()
 *       App.reader.setFontScale(n) / getFontScale() / bindZoom()
 *
 * 滚动规则：
 * - 普通滚轮 / 单指滑动：不拦截，正文正常滚动。
 * - Ctrl/Cmd + 滚轮、双指捏合：preventDefault，仅缩放字号。
 * - 阅读器打开时 body 加 reader-open 锁背景滚动，关闭时移除。
 */
(function (global) {
  'use strict';
  const App = global.App || (global.App = {});
  const U = App.utils;
  const S = App.sanitize;
  const C = App.config;

  const FONT_KEY = 'readerFontScale';
  const FONT_MIN = 0.7;
  const FONT_MAX = 2.2;
  const FONT_STEP = 0.1;
  const FONT_BASE_PC = 1.05;
  const FONT_BASE_MOBILE = 1;

  let currentScale = 1;
  let bindingsReady = false;

  function clamp(n) { return Math.min(FONT_MAX, Math.max(FONT_MIN, n)); }
  function baseFontSize() { return window.innerWidth <= 768 ? FONT_BASE_MOBILE : FONT_BASE_PC; }

  function applyScale(scale) {
    currentScale = clamp(scale);
    const content = document.getElementById('markdownContent');
    if (content) {
      content.style.fontSize = (baseFontSize() * currentScale).toFixed(3) + 'rem';
    }
    try { localStorage.setItem(FONT_KEY, String(currentScale)); } catch (e) { /* ignore */ }
  }

  function setFontScale(scale) { applyScale(scale); }
  function getFontScale() { return currentScale; }

  function isReaderOpen() {
    const v = document.getElementById('markdownViewer');
    return v && v.style.display === 'flex';
  }

  // PC：仅 Ctrl/Cmd 时拦截滚轮与快捷键
  function bindDesktop() {
    document.addEventListener('keydown', function (e) {
      if (!isReaderOpen()) return;
      const mod = e.ctrlKey || e.metaKey;
      if (!mod) return;

      if (e.key === '+' || e.key === '=') {
        e.preventDefault();
        applyScale(currentScale + FONT_STEP);
      } else if (e.key === '-') {
        e.preventDefault();
        applyScale(currentScale - FONT_STEP);
      } else if (e.key === '0') {
        e.preventDefault();
        applyScale(1);
      }
    });

    document.addEventListener('wheel', function (e) {
      if (!isReaderOpen()) return;
      // 只有 Ctrl/Cmd 才拦截，普通滚轮放行
      if (!(e.ctrlKey || e.metaKey)) return;
      e.preventDefault();
      if (e.deltaY < 0) applyScale(currentScale + FONT_STEP);
      else if (e.deltaY > 0) applyScale(currentScale - FONT_STEP);
    }, { passive: false });
  }

  // 移动端：仅双指捏合时拦截 touchmove，单指滑动放行
  function bindMobilePinch() {
    const viewer = document.getElementById('markdownViewer');
    if (!viewer) return;

    let startDist = 0;
    let startScale = 1;
    let pinching = false;

    function dist(t1, t2) {
      const dx = t1.clientX - t2.clientX;
      const dy = t1.clientY - t2.clientY;
      return Math.hypot(dx, dy);
    }

    viewer.addEventListener('touchstart', function (e) {
      if (e.touches.length === 2) {
        pinching = true;
        startDist = dist(e.touches[0], e.touches[1]);
        startScale = currentScale;
      }
    }, { passive: true });

    viewer.addEventListener('touchmove', function (e) {
      // 非双指捏合时直接返回，不拦截单指滑动
      if (!pinching || e.touches.length !== 2) return;
      e.preventDefault();
      const d = dist(e.touches[0], e.touches[1]);
      if (startDist > 0) {
        applyScale(startScale * (d / startDist));
      }
    }, { passive: false });

    viewer.addEventListener('touchend', function (e) {
      if (e.touches.length < 2) {
        pinching = false;
        startDist = 0;
      }
    }, { passive: true });

    viewer.addEventListener('touchcancel', function () {
      pinching = false;
      startDist = 0;
    }, { passive: true });
  }

  function bindZoom() {
    if (bindingsReady) return;
    bindingsReady = true;

    let saved = 1;
    try { saved = parseFloat(localStorage.getItem(FONT_KEY)) || 1; } catch (e) { /* ignore */ }
    applyScale(saved);

    bindDesktop();
    bindMobilePinch();

    window.addEventListener('resize', function () {
      if (isReaderOpen()) applyScale(currentScale);
    });
  }

  function countWords(text) {
    if (!text) return 0;
    const clean = String(text).replace(/```[\s\S]*?```/g, '').replace(/`[^`]+`/g, '').replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
    const cn = clean.match(/[\u4e00-\u9fa5]/g) || [];
    const en = clean.replace(/[\u4e00-\u9fa5]/g, ' ').split(/\s+/).filter(Boolean);
    return cn.length + en.length;
  }

  function readTime(wc) {
    const m = Math.ceil(wc / 300);
    if (m < 1) return '<1分钟';
    if (m < 60) return `${m}分钟`;
    const h = Math.floor(m / 60), r = m % 60;
    return r ? `${h}小时${r}分钟` : `${h}小时`;
  }

  function fileSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }

  function updateInfo(stats) {
    const rt = document.getElementById('articleReadTime');
    const fs = document.getElementById('articleFileSize');
    if (rt) rt.textContent = stats.readTime;
    if (fs) fs.textContent = stats.fileSize;
  }

  function resetInfo() {
    const rt = document.getElementById('articleReadTime');
    const fs = document.getElementById('articleFileSize');
    if (rt) rt.textContent = '--';
    if (fs) fs.textContent = '--';
    App.reader.currentStats = null;
  }

  function renderMd(md) {
    if (App.render && typeof App.render.markdown === 'function') return App.render.markdown(md);
    if (App.render && typeof App.render.simple === 'function') return App.render.simple(md);
    return String(md || '');
  }

  function openReaderUI() {
    const viewer = document.getElementById('markdownViewer');
    if (viewer) viewer.style.display = 'flex';
    document.body.classList.add('reader-open');
  }

  function closeReaderUI() {
    const viewer = document.getElementById('markdownViewer');
    if (viewer) viewer.style.display = 'none';
    document.body.classList.remove('reader-open');
    resetInfo();
  }

  async function open(filename, title, articleInfo) {
    const viewer = document.getElementById('markdownViewer');
    const titleEl = document.getElementById('markdownTitle');
    const content = document.getElementById('markdownContent');
    if (!content) return;

    if (!filename) {
      S.setInnerHTML(content, '<div class="error-message"><i class="fas fa-exclamation-triangle"></i><h3>文件错误</h3><p>文章文件名为空或无效。</p></div>');
      return;
    }

    bindZoom();

    const start = Date.now();
    App.reader.currentStats = { fileName: filename, originalArticle: articleInfo, wordCount: (articleInfo && articleInfo.wordCount) || 0, loadStartTime: start, loadSuccess: false };

    S.setInnerHTML(content, '<div style="text-align:center;padding:3rem;"><div class="loading-spinner"></div><p style="margin-top:1rem;">加载文章中...</p></div>');
    openReaderUI();
    if (titleEl) titleEl.textContent = title || '文章阅读';
    if (window.innerWidth <= 768) {
      const sb = document.getElementById('markdownSidebar');
      if (sb) sb.classList.add('hidden');
    }

    try {
      const base = (C && C.ARTICLES_BASE_URL) || 'assets/passage/';
      const head = await U.safeFetch(`${base}${filename}`, { method: 'HEAD' });
      const size = head && head.headers ? (+head.headers.get('content-length') || 0) : 0;
      const timeout = size > 1024 * 1024 ? 60000 : size > 500 * 1024 ? 45000 : size > 100 * 1024 ? 30000 : 15000;
      const resp = await U.safeFetch(`${base}${filename}`, { timeout });
      if (!resp.ok) throw new Error(`HTTP错误! 状态: ${resp.status}`);
      const md = await resp.text();
      const loadTime = Date.now() - start;
      const wc = countWords(md);
      App.reader.currentStats = Object.assign(App.reader.currentStats, {
        wordCount: wc,
        loadTime,
        readTime: readTime(wc),
        fileSize: fileSize(new Blob([md]).size),
        loadSuccess: true
      });
      updateInfo(App.reader.currentStats);

      S.setInnerHTML(content, renderMd(md));
      applyScale(currentScale);

      if (App.toc && typeof App.toc.generate === 'function') {
        try { App.toc.generate(); } catch (e) { console.warn('生成目录失败:', e); }
      }
      if (window.hljs) { try { hljs.highlightAll(); } catch (e) { console.warn('高亮失败:', e); } }
      if (window.innerWidth <= 768) optimizeMobile(content);
    } catch (e) {
      console.error('加载Markdown失败:', e);
      App.reader.currentStats = Object.assign(App.reader.currentStats, { loadSuccess: false, loadTime: Date.now() - start });
      updateInfo(App.reader.currentStats);
      const base = (C && C.ARTICLES_BASE_URL) || 'assets/passage/';
      S.setInnerHTML(content, `
        <div class="error-message">
          <i class="fas fa-exclamation-triangle"></i>
          <h3>加载失败</h3>
          <p>无法加载文章内容: ${U.escapeHtml(e.message)}</p>
          <p>文件路径: ${U.escapeHtml(base + filename)}</p>
          <div style="margin-top:1rem;display:flex;gap:0.5rem;justify-content:center;">
            <button data-action="retry-open" data-file="${U.escapeHtml(filename)}" data-title="${U.escapeHtml(title || '')}" class="action-btn"><i class="fas fa-redo"></i> 重试</button>
            <button data-action="download" data-file="${U.escapeHtml(filename)}" class="action-btn"><i class="fas fa-download"></i> 下载原始文件</button>
          </div>
        </div>`);
    }
  }

  function optimizeMobile(content) {
    content.querySelectorAll('pre').forEach(b => { b.style.overflowX = 'auto'; b.style.maxWidth = '100%'; });
    content.querySelectorAll('table').forEach(t => {
      const w = document.createElement('div');
      w.style.overflowX = 'auto'; w.style.margin = '1rem 0';
      t.parentNode.insertBefore(w, t); w.appendChild(t);
    });
    content.querySelectorAll('img').forEach(i => { i.style.maxWidth = '100%'; i.style.height = 'auto'; });
  }

  App.reader = {
    open, resetInfo, currentStats: null,
    countWords, readTime, fileSize,
    setFontScale, getFontScale, bindZoom,
    openReaderUI, closeReaderUI
  };
})(window);