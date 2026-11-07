/**
 * 阅读器：打开文章、加载 Markdown、统计信息
 * 依赖：core/utils.js, core/sanitize.js, render/markdown.js, articles/config.js, reader/toc.js
 * 暴露：App.reader.open(filename, title, info) / resetInfo()
 */
(function (global) {
  'use strict';
  const App = global.App || (global.App = {});
  const U = App.utils;
  const S = App.sanitize;
  const C = App.config;

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

  async function open(filename, title, articleInfo) {
    const viewer = document.getElementById('markdownViewer');
    const titleEl = document.getElementById('markdownTitle');
    const content = document.getElementById('markdownContent');
    if (!content) return;

    if (!filename) {
      S.setInnerHTML(content, `<div class="error-message"><i class="fas fa-exclamation-triangle"></i><h3>文件错误</h3><p>文章文件名为空或无效。</p></div>`);
      return;
    }

    const start = Date.now();
    App.reader.currentStats = { fileName: filename, originalArticle: articleInfo, wordCount: (articleInfo && articleInfo.wordCount) || 0, loadStartTime: start, loadSuccess: false };

    S.setInnerHTML(content, '<div style="text-align:center;padding:3rem;"><div class="loading-spinner"></div><p style="margin-top:1rem;">加载文章中...</p></div>');
    if (viewer) viewer.style.display = 'flex';
    if (titleEl) titleEl.textContent = title || '文章阅读';
    if (window.innerWidth <= 768) {
      const sb = document.getElementById('markdownSidebar');
      if (sb) sb.classList.add('hidden');
    }

    try {
      const head = await U.safeFetch(`${C.ARTICLES_BASE_URL}${filename}`, { method: 'HEAD' });
      const size = head && head.headers ? (+head.headers.get('content-length') || 0) : 0;
      const timeout = size > 1024 * 1024 ? 60000 : size > 500 * 1024 ? 45000 : size > 100 * 1024 ? 30000 : 15000;
      const resp = await U.safeFetch(`${C.ARTICLES_BASE_URL}${filename}`, { timeout });
      if (!resp.ok) throw new Error(`HTTP错误! 状态: ${resp.status}`);
      const md = await resp.text();
      const loadTime = Date.now() - start;
      const wc = countWords(md);
      App.reader.currentStats = Object.assign(App.reader.currentStats, {
        wordCount: wc, loadTime, readTime: readTime(wc), fileSize: fileSize(md.length), loadSuccess: true
      });
      updateInfo(App.reader.currentStats);

      const htmlStr = App.render.markdown(md);
      S.setInnerHTML(content, htmlStr);
      App.toc.generate();
      if (window.hljs) { try { hljs.highlightAll(); } catch (e) { console.warn('高亮失败:', e); } }
      if (window.innerWidth <= 768) optimizeMobile(content);
    } catch (e) {
      console.error('加载Markdown失败:', e);
      App.reader.currentStats = Object.assign(App.reader.currentStats, { loadSuccess: false, loadTime: Date.now() - start });
      updateInfo(App.reader.currentStats);
      S.setInnerHTML(content, `
        <div class="error-message">
          <i class="fas fa-exclamation-triangle"></i>
          <h3>加载失败</h3>
          <p>无法加载文章内容: ${U.escapeHtml(e.message)}</p>
          <p>文件路径: ${U.escapeHtml(C.ARTICLES_BASE_URL + filename)}</p>
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

  App.reader = { open, resetInfo, currentStats: null, countWords, readTime, fileSize };
})(window);