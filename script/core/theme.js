/**
 * 主题 + 背景 + 快捷键
 * 依赖：无
 * 暴露：App.theme.init()
 *
 * 背景模式（bg-only）：
 * - 默认：显示内容，背景图作为底层装饰。
 * - 点击眼睛按钮：进入 bg-only，隐藏 .container 与 .markdown-viewer，只显示背景图。
 * - 再点一次 / 按 Esc：退出 bg-only，恢复内容。
 * - 状态持久化到 localStorage.bgOnly（'1' / '0'）。
 * - 迁移旧脏数据 bgVisible（旧版自动写入），避免“有的浏览器没背景”。
 */
(function (global) {
  'use strict';
  const App = global.App || (global.App = {});

  const BG_ONLY_KEY = 'bgOnly';
  const LEGACY_BG_KEY = 'bgVisible';
  const LEGACY_BG_USER_KEY = 'bgUserSet';

  function migrateLegacyBg() {
    try {
      const v = localStorage.getItem(LEGACY_BG_KEY);
      const userSet = localStorage.getItem(LEGACY_BG_USER_KEY);
      // 旧版自动写入的 false 视为脏数据；用户主动设置的（有 bgUserSet）不动
      if (v === 'false' && !userSet) {
        localStorage.removeItem(LEGACY_BG_KEY);
      }
    } catch (e) { /* ignore */ }
  }

  function initTheme() {
    const btn = document.getElementById('themeSwitcher');
    const icon = document.getElementById('themeIcon');
    const html = document.documentElement;
    if (!btn || !icon) return;

    const saved = localStorage.getItem('theme') || 'dark';
    html.setAttribute('data-theme', saved);
    icon.className = saved === 'dark' ? 'fas fa-moon' : 'fas fa-sun';

    btn.addEventListener('click', () => {
      const cur = html.getAttribute('data-theme');
      const next = cur === 'dark' ? 'light' : 'dark';
      html.setAttribute('data-theme', next);
      localStorage.setItem('theme', next);
      icon.className = next === 'dark' ? 'fas fa-moon' : 'fas fa-sun';
      btn.style.transform = 'scale(0.9)';
      setTimeout(() => { btn.style.transform = ''; }, 200);
    });
  }

  function initBg() {
    const btn = document.getElementById('bgToggle');
    const body = document.body;
    if (!btn) return;

    migrateLegacyBg();

    function applyBgOnly(on) {
      const icon = btn.querySelector('i');
      if (on) {
        body.classList.add('bg-only');
        btn.title = '显示内容（Esc 退出）';
        if (icon) icon.className = 'fas fa-eye-slash';
      } else {
        body.classList.remove('bg-only');
        btn.title = '只看背景';
        if (icon) icon.className = 'fas fa-eye';
      }
    }

    // 恢复上次状态
    const saved = localStorage.getItem(BG_ONLY_KEY);
    applyBgOnly(saved === '1');

    btn.addEventListener('click', () => {
      const next = !body.classList.contains('bg-only');
      applyBgOnly(next);
      localStorage.setItem(BG_ONLY_KEY, next ? '1' : '0');
    });
  }

  function initShortcuts() {
    document.addEventListener('keydown', e => {
      if (!e) return;
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        const input = document.getElementById('searchInput');
        if (input) { e.preventDefault(); input.focus(); input.select(); }
      }
      if (e.altKey && e.key === 't') { const b = document.getElementById('themeSwitcher'); if (b) b.click(); }
      if (e.altKey && e.key === 'b') { const b = document.getElementById('bgToggle'); if (b) b.click(); }
      if (e.altKey && e.key === 'h') { window.location.href = 'index.html'; }
      if (e.altKey && e.key === 'r') {
        if (App.articles && typeof App.articles.reload === 'function') App.articles.reload();
        else { const b = document.getElementById('refreshBtn'); if (b) b.click(); }
      }
      if (e.key === 'Escape') {
        // 优先退出 bg-only
        if (document.body.classList.contains('bg-only')) {
          const b = document.getElementById('bgToggle');
          if (b) b.click();
          return;
        }
        const input = document.getElementById('searchInput');
        if (document.activeElement === input && input && input.value) {
          if (App.search) App.search.clear();
          const clr = document.getElementById('searchClear');
          if (clr) clr.style.display = 'none';
          if (App.articles && typeof App.articles.performSearch === 'function') App.articles.performSearch();
        } else {
          const viewer = document.getElementById('markdownViewer');
          if (viewer && viewer.style.display === 'flex') { const b = document.getElementById('backBtn'); if (b) b.click(); }
        }
      }
    });
  }

  App.theme = {
    init() { initTheme(); initBg(); initShortcuts(); },
    initTheme, initBg, initShortcuts
  };
})(window);