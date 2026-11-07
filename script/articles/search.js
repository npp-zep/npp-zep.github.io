/**
 * 搜索：状态 + 执行 + 高亮
 * 依赖：core/utils.js, articles/data.js
 * 暴露：App.search.setQuery / getQuery / setFilter / perform / highlight / updateStats / clear
 */
(function (global) {
  'use strict';
  const App = global.App || (global.App = {});
  const U = App.utils;

  const state = {
    query: '',
    filter: 'all',
    sort: 'date',
    fields: { title: true, description: true, tags: true },
    caseSensitive: false,
    useRegex: false
  };

  function getQuery() { return state.query; }
  function setQuery(q) { state.query = String(q || '').trim(); }
  function setFilter(f) { state.filter = f || 'all'; }
  function setSort(s) { state.sort = s || 'date'; }
  function setFields(f) { state.fields = Object.assign({}, state.fields, f); }
  function setFlags(cs, rx) { state.caseSensitive = !!cs; state.useRegex = !!rx; }

  function updateStats(count, ms) {
    const box = document.getElementById('searchStats');
    const cnt = document.getElementById('resultsCount');
    const time = document.getElementById('searchTimeInfo');
    if (cnt) cnt.textContent = count;
    if (state.query) { if (box) box.classList.add('show'); if (time) time.textContent = ` · 搜索用时 ${ms}ms`; }
    else if (box) box.classList.remove('show');
  }

  function highlight(text) {
    if (!state.query || !text) return U.escapeHtml(text);
    try {
      if (state.useRegex) {
        const flags = state.caseSensitive ? 'g' : 'gi';
        const re = new RegExp(state.query, flags);
        return U.escapeHtml(text).replace(re, m => `<span class="search-highlight">${U.escapeHtml(m)}</span>`);
      }
      const q = state.caseSensitive ? state.query : state.query.toLowerCase();
      const t = state.caseSensitive ? String(text) : String(text).toLowerCase();
      let out = '', last = 0, i = t.indexOf(q);
      while (i !== -1) {
        out += U.escapeHtml(String(text).slice(last, i));
        out += `<span class="search-highlight">${U.escapeHtml(String(text).slice(i, i + q.length))}</span>`;
        last = i + q.length;
        i = t.indexOf(q, last);
      }
      out += U.escapeHtml(String(text).slice(last));
      return out;
    } catch (e) {
      console.error('高亮失败:', e);
      return U.escapeHtml(text);
    }
  }

  function perform(allArticles) {
    const start = performance.now();
    if (!Array.isArray(allArticles) || !allArticles.length) return [];
    let res = allArticles;

    if (state.filter !== 'all') {
      const f = state.filter.toLowerCase();
      res = res.filter(a => (a.tags || []).some(t => t.toLowerCase().includes(f)));
    }

    if (state.query) {
      let re = null;
      if (state.useRegex) {
        try { re = new RegExp(state.query, state.caseSensitive ? 'g' : 'gi'); }
        catch (e) { re = null; console.warn('无效正则:', e.message); }
      }
      res = res.filter(a => {
        const hit = (str) => {
          if (!str) return false;
          if (state.useRegex && re) return re.test(str);
          const s = state.caseSensitive ? String(str) : String(str).toLowerCase();
          const q = state.caseSensitive ? state.query : state.query.toLowerCase();
          return s.includes(q);
        };
        if (state.fields.title && hit(a.title)) return true;
        if (state.fields.description && hit(a.description)) return true;
        if (state.fields.tags && (a.tags || []).some(hit)) return true;
        return false;
      });
    }

    res = App.data.sort(res, state.sort);
    updateStats(res.length, Math.round(performance.now() - start));
    return res;
  }

  function clear() {
    state.query = '';
    const input = document.getElementById('searchInput');
    const clr = document.getElementById('searchClear');
    if (input) input.value = '';
    if (clr) clr.style.display = 'none';
  }

  App.search = { getQuery, setQuery, setFilter, setSort, setFields, setFlags, updateStats, highlight, perform, clear, state };
})(window);