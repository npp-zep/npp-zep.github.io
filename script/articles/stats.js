/**
 * 统计卡片
 * 依赖：core/utils.js, core/sanitize.js, articles/config.js
 * 暴露：App.stats.update(allArticles)
 *
 * 规则：
 * - 值为 0（或非数字）的统计项不生成 DOM。
 * - 每次 update 先清空容器（replaceChildren），避免多次调用叠加出两份。
 */
(function (global) {
  'use strict';
  const App = global.App || (global.App = {});
  const U = App.utils;
  const S = App.sanitize;
  const C = App.config;

  function countByTag(list, tag) {
    return list.filter(a => (a.tags || []).some(t => t.toLowerCase().includes(tag))).length;
  }

  // 值为 0 / 非数字时返回 null，由调用方过滤
  function statItem(value, label) {
    const n = Number(value);
    if (!Number.isFinite(n) || n === 0) return null;
    return `<div class="stat-item"><span class="stat-number">${n}</span><span class="stat-label">${label}</span></div>`;
  }

  function update(allArticles) {
    const box = document.getElementById('statsSection');
    if (!box) return;

    // 关键：先清空，防止重复调用叠加
    box.replaceChildren();

    if (!allArticles || !allArticles.length) return;

    const total = allArticles.length;
    let totalWords = 0, valid = 0;
    allArticles.forEach(a => {
      if (a.wordCount > 0) { totalWords += a.wordCount; valid++; }
    });
    if (!totalWords) totalWords = total * 800;

    const months = Math.floor(Math.max(total * 3, 30) / 30);
    const avg = Math.round(totalWords / Math.max(total, 1));
    const maxW = allArticles.reduce((m, a) => Math.max(m, a.wordCount || 0), 0);

    const docStats = {};
    allArticles.forEach(a => (a.tags || []).forEach(t => {
      const lt = t.toLowerCase();
      const hit = C.DOC_TYPES.find(d => lt.includes(d) || lt === d);
      if (hit) docStats[hit] = (docStats[hit] || 0) + 1;
    }));
    const names = {
      project: '项目', document: '文档', api: 'API', guide: '指南',
      tutorial: '教程', note: '笔记', web: 'Web', python: 'Python', lua: 'Lua'
    };
    const badges = Object.entries(docStats)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([k, v]) => `<span class="doc-type-badge"><span class="badge-count">${v}</span>${U.escapeHtml(names[k] || k)}</span>`)
      .join('');

    const items = [
      statItem(total, '总文章数'),
      statItem(totalWords, '总字数'),
      statItem(avg, '平均字数'),
      statItem(countByTag(allArticles, 'web'), 'Web开发'),
      statItem(countByTag(allArticles, 'lua'), 'Lua开发'),
      statItem(countByTag(allArticles, 'python'), 'Python'),
      statItem(countByTag(allArticles, 'tutorial'), '教程'),
      statItem(countByTag(allArticles, 'note'), '笔记'),
      statItem(countByTag(allArticles, 'project'), '项目'),
      statItem(countByTag(allArticles, 'document'), '文档'),
      statItem(months, `持续${months}个月`),
      statItem(maxW, '最长文章')
    ].filter(x => x !== null).join('');

    if (!items && !badges) return;

    S.setInnerHTML(box, `
      <div class="stats-card">
        <h4><i class="fas fa-chart-bar"></i> 文章统计</h4>
        <div class="stats-grid">${items}</div>
        <div class="word-count-details">
          <p style="font-size:0.85rem;color:var(--text-muted);margin-top:0.8rem;">
            <i class="fas fa-info-circle"></i> 统计了 ${valid}/${total} 篇文章的实际字数
          </p>
        </div>
        ${badges ? `<div class="stats-doc-types"><h4><i class="fas fa-tags"></i> 热门标签</h4><div class="doc-type-badges">${badges}</div></div>` : ''}
      </div>
    `);
  }

  App.stats = { update };
})(window);