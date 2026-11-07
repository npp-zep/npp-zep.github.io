/**
 * 首页入口（S3）
 * 依赖：script/core/theme.js
 * 职责：主题、背景、快捷键初始化
 */
(function (global) {
  'use strict';
  const App = global.App || (global.App = {});

  function init() {
    if (App.theme && typeof App.theme.init === 'function') {
      App.theme.init();
    }
    const loading = document.getElementById('loading');
    if (loading) {
      setTimeout(() => {
        loading.style.opacity = '0';
        setTimeout(() => { loading.style.display = 'none'; }, 500);
      }, 800);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})(window);