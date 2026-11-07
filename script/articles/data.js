/**
 * 文章数据：加载 / 清洗 / 排序
 * 依赖：core/utils.js, articles/config.js
 * 暴露：App.data.load / clean / sort / parseDate
 */
(function (global) {
  'use strict';
  const App = global.App || (global.App = {});
  const U = App.utils;
  const C = App.config;

  function parseDate(str) {
    if (!str) return new Date(0);
    const formats = ['YYYY-MM-DD', 'YYYY/MM/DD', 'MM-DD-YYYY', 'MM/DD/YYYY'];
    for (const f of formats) {
      const p = String(str).split(/[-/]/);
      if (p.length !== 3) continue;
      let y, m, d;
      if (f === 'YYYY-MM-DD' || f === 'YYYY/MM/DD') { y = +p[0]; m = +p[1] - 1; d = +p[2]; }
      else { m = +p[0] - 1; d = +p[1]; y = +p[2]; }
      if (!isNaN(y) && !isNaN(m) && !isNaN(d)) return new Date(y, m, d);
    }
    return new Date(0);
  }

  function clean(list) {
    return list.map(a => {
      const c = {
        title: String(a.title || '无标题').trim() || '无标题',
        date: String(a.date || '未知日期').trim() || '未知日期',
        readTime: String(a.readTime || '未知').trim() || '未知',
        description: String(a.description || '暂无描述').trim() || '暂无描述',
        file: String(a.file || '').trim(),
        tags: Array.isArray(a.tags) ? a.tags.map(t => String(t).trim()).filter(Boolean)
             : typeof a.tags === 'string' ? a.tags.split(',').map(t => t.trim()).filter(Boolean)
             : []
      };
      if (a.wordCount !== undefined) c.wordCount = parseInt(a.wordCount) || 0;
      else if (a.words !== undefined) c.wordCount = parseInt(a.words) || 0;
      else c.wordCount = Math.max(c.description.length * 3, 800);

      if (c.description === '[object Object]') c.description = '暂无描述';
      if (c.description.includes('[project]')) c.description = c.description.replace(/\[project\]\s*:\s*project/g, '项目说明');
      return c;
    });
  }

  function sort(list, by) {
    const arr = [...list];
    if (by === 'title') {
      arr.sort((a, b) => String(a.title || '').localeCompare(String(b.title || ''), 'zh-CN'));
    } else {
      arr.sort((a, b) => { try { return parseDate(b.date) - parseDate(a.date); } catch (e) { return 0; } });
    }
    return arr;
  }

  async function load() {
    const timeout = (function (size) {
      if (size > 1024 * 1024) return 60000;
      if (size > 500 * 1024) return 45000;
      if (size > 100 * 1024) return 30000;
      return 15000;
    })(0);

    const resp = await U.safeFetch(C.ARTICLES_CONFIG_URL, {
      headers: { Accept: 'application/json', 'Cache-Control': 'no-cache' },
      cache: 'no-cache',
      timeout
    });
    if (!resp.ok) throw new Error(`HTTP错误! 状态: ${resp.status} - ${resp.statusText}`);
    const text = (await resp.text()).trim().replace(/^\uFEFF/, '');
    let data;
    try { data = JSON.parse(text); }
    catch (e) {
      const fixed = text.replace(/(['"])?([a-zA-Z0-9_]+)(['"])?:/g, '"$2":').replace(/,\s*}/g, '}').replace(/,\s*]/g, ']');
      data = JSON.parse(fixed);
    }
    const articles = data.articles || [];
    if (!Array.isArray(articles) || !articles.length) throw new Error('文章数据格式错误或为空');
    return clean(articles);
  }

  App.data = { load, clean, sort, parseDate };
})(window);