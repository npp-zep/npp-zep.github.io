/**
 * 筛选：按钮动态生成 + 点击委托
 * 依赖：core/utils.js, articles/config.js
 * 暴露：App.filter.render(allArticles) / App.filter.init(onChange)
 *
 * 规则：
 * - 「全部文章」始终保留。
 * - 其余按钮按 articles 里实际出现的标签生成（去重、按出现次数降序、最多 12 个）。
 * - 标签中文名映射：已知标签用中文，未知标签原样显示。
 * - 标签大小写不敏感去重，显示用首次出现的写法。
 */
(function (global) {
  'use strict';
  const App = global.App || (global.App = {});
  const U = App.utils;

  let bound = false;
  let onChangeCb = null;

  // 已知标签中文名
  const LABEL_NAMES = {
    web: 'Web开发',
    lua: 'Lua开发',
    python: 'Python',
    tutorial: '教程',
    note: '笔记',
    project: '项目',
    document: '文档',
    api: 'API文档',
    guide: '指南',
    history: '历史',
    game: '游戏',
    c: 'C',
    java: 'Java',
    rust: 'Rust'
  };

  function labelOf(tag) {
    const key = String(tag).toLowerCase();
    return LABEL_NAMES[key] || String(tag);
  }

  /**
   * 统计 articles 里出现的标签：
   * 返回 [{ key, label, count }]，按 count 降序、label 字典序。
   * key 为小写（用于 data-filter 与匹配）。
   */
  function collectTags(articles) {
    const map = new Map(); // key -> { key, label, count, firstCase }
    (articles || []).forEach(a => {
      (a.tags || []).forEach(t => {
        const raw = String(t).trim();
        if (!raw) return;
        const key = raw.toLowerCase();
        if (map.has(key)) {
          map.get(key).count++;
        } else {
          map.set(key, { key, label: labelOf(raw), count: 1, firstCase: raw });
        }
      });
    });
    return Array.from(map.values())
      .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, 'zh-CN'))
      .slice(0, 12);
  }

  /**
   * 渲染筛选按钮到 .filter-buttons。
   * 保留「全部文章」为第一个，active 状态保持当前选中（若有）。
   */
  function render(articles) {
    const container = document.querySelector('.filter-buttons');
    if (!container) return;

    const tags = collectTags(articles);
    const current = (App.search && App.search.state && App.search.state.filter) || 'all';

    const allBtn = `<button class="filter-btn${current === 'all' ? ' active' : ''}" data-filter="all">全部文章</button>`;
    const tagBtns = tags.map(t =>
      `<button class="filter-btn${current === t.key ? ' active' : ''}" data-filter="${U.escapeHtml(t.key)}">${U.escapeHtml(t.label)}</button>`
    ).join('');

    container.innerHTML = allBtn + tagBtns;
  }

  function init(onChange) {
    onChangeCb = onChange;
    if (bound) return;
    const container = document.querySelector('.filter-buttons');
    if (!container) return;
    bound = true;

    container.addEventListener('click', e => {
      const btn = e.target.closest('.filter-btn');
      if (!btn) return;
      container.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const val = btn.dataset.filter || btn.getAttribute('data-filter') || 'all';
      if (App.search) App.search.setFilter(val);
      if (typeof onChangeCb === 'function') onChangeCb(val);
      const list = document.getElementById('articlesList');
      if (list) {
        list.style.opacity = '0.5';
        setTimeout(() => { list.style.opacity = '1'; }, 300);
      }
    });
  }

  App.filter = { render, init, collectTags, labelOf };
})(window);