(function (global) {
  'use strict';
  const App = global.App || (global.App = {});
  let bound = false;

  function init(onChange) {
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
      App.search.setFilter(val);
      if (typeof onChange === 'function') onChange(val);
      const list = document.getElementById('articlesList');
      if (list) {
        list.style.opacity = '0.5';
        setTimeout(() => { list.style.opacity = '1'; }, 300);
      }
    });
  }

  App.filter = { init };
})(window);