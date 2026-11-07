/**
 * 统计卡片
 * 依赖：core/utils.js, core/sanitize.js, articles/config.js
 * 暴露：App.stats.update(allArticles)
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

  function update(allArticles) {
    const box = document.getElementById('statsSection');
    if (!box) return;
    if (!allArticles || !allArticles.length) { box.innerHTML = ''; return; }

    const total = allArticles.length;
    let totalWords = 0, valid = 0;
    allArticles.forEach(a => { if (a.wordCount > 0) { totalWords += a.wordCount; valid++; } });
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
    const names = { project:'项目', document:'文档', api:'API', guide:'指南', tutorial:'教程', note:'笔记', web:'Web', python:'Python', lua:'Lua' };
    const badges = Object.entries(docStats).sort((a,b)=>b[1]-a[1]).slice(0,6).map(([k,v]) =>
      `<span class="doc-type-badge"><span class="badge-count">${v}</span>${U.escapeHtml(names[k]||k)}</span>`).join('');

    S.setInnerHTML(box, `
      <div class="stats-card">
        <h4><i class="fas fa-chart-bar"></i> 文章统计</h4>
        <div class="stats-grid">
          <div class="stat-item"><span class="stat-number">${total}</span><span class="stat-label">总文章数</span></div>
          <div class="stat-item"><span class="stat-number">${U.escapeHtml(U.formatWordCount(totalWords))}</span><span class="stat-label">总字数</span></div>
          <div class="stat-item"><span class="stat-number">${U.formatNumber(avg)}</span><span class="stat-label">平均字数</span></div>
          <div class="stat-item"><span class="stat-number">${countByTag(allArticles,'web')}</span><span class="stat-label">Web开发</span></div>
          <div class="stat-item"><span class="stat-number">${countByTag(allArticles,'lua')}</span><span class="stat-label">Lua开发</span></div>
          <div class="stat-item"><span class="stat-number">${countByTag(allArticles,'python')}</span><span class="stat-label">Python</span></div>
          <div class="stat-item"><span class="stat-number">${countByTag(allArticles,'tutorial')}</span><span class="stat-label">教程</span></div>
          <div class="stat-item"><span class="stat-number">${countByTag(allArticles,'note')}</span><span class="stat-label">笔记</span></div>
          <div class="stat-item"><span class="stat-number">${countByTag(allArticles,'project')}</span><span class="stat-label">项目</span></div>
          <div class="stat-item"><span class="stat-number">${countByTag(allArticles,'document')}</span><span class="stat-label">文档</span></div>
          <div class="stat-item"><span class="stat-number">${months}</span><span class="stat-label">持续${months}个月</span></div>
          <div class="stat-item"><span class="stat-number">${U.formatNumber(maxW)}</span><span class="stat-label">最长文章</span></div>
        </div>
        <div class="word-count-details">
          <p style="font-size:0.85rem;color:var(--text-secondary);margin-top:0.8rem;">
            <i class="fas fa-info-circle"></i> 统计了 ${valid}/${total} 篇文章的实际字数
          </p>
        </div>
        ${badges ? `<div class="stats-doc-types"><h4><i class="fas fa-tags"></i> 热门标签</h4><div class="doc-type-badges">${badges}</div></div>` : ''}
      </div>
    `);
  }

  App.stats = { update };
})(window);