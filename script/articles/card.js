/**
 * 文章卡片生成 + 列表渲染
 * 依赖：core/utils.js, core/sanitize.js, articles/search.js, articles/stats.js(可选)
 * 暴露：App.card.create(article) / App.card.renderList(container, list, opts)
 */
(function (global) {
  'use strict';
  const App = global.App || (global.App = {});
  const U = App.utils;
  const S = App.sanitize;

  function create(a) {
    const el = document.createElement('div');
    el.className = 'article-card';
    const tags = Array.isArray(a.tags) ? a.tags : [];
    el.dataset.tags = tags.join(' ');
    el.dataset.file = a.file;
    el.dataset.title = a.title;

    const tagsHtml = tags.map(t =>
      `<span class="article-tag tag-${U.escapeHtml(t.toLowerCase())}">${U.escapeHtml(t)}</span>`
    ).join('');

    const q = App.search.getQuery();
    const titleHtml = q ? App.search.highlight(a.title || '无标题') : U.escapeHtml(a.title || '无标题');
    const descHtml = q ? App.search.highlight(a.description || '暂无描述') : U.escapeHtml(a.description || '暂无描述');
    const wc = U.escapeHtml(U.formatWordCount(a.wordCount || 0));

    S.setInnerHTML(el, `
      <div class="article-header">
        <h4 class="article-title">${titleHtml}</h4>
        <div class="article-meta">
          <span class="article-date"><i class="far fa-calendar"></i> ${U.escapeHtml(a.date || '未知日期')}</span>
          <span class="article-read-time"><i class="far fa-clock"></i> ${U.escapeHtml(a.readTime || '未知')}</span>
          <span class="article-word-count"><i class="fas fa-file-word"></i> ${wc}</span>
        </div>
      </div>
      <p class="article-description">${descHtml}</p>
      <div class="article-footer">
        <div class="article-tags">${tagsHtml}</div>
        <div class="article-actions">
          <button class="article-btn read-btn"><i class="fas fa-book-open"></i> 阅读</button>
          <button class="article-btn share-btn" title="分享文章"><i class="fas fa-share-alt"></i></button>
          <button class="article-btn download-btn"><i class="fas fa-download"></i> 下载</button>
        </div>
      </div>
    `);
    return el;
  }

  function renderList(container, list, opts) {
    opts = opts || {};
    const batch = opts.batch || 5;
    const onDone = opts.onDone;
    container.innerHTML = '';

    function step(start) {
      const end = Math.min(start + batch, list.length);
      for (let i = start; i < end; i++) container.appendChild(create(list[i]));
      if (end < list.length) setTimeout(() => step(end), 50);
      else if (typeof onDone === 'function') onDone();
    }
    step(0);
  }

  App.card = { create, renderList };
})(window);