/**
 * 目录生成
 * 依赖：core/sanitize.js
 * 暴露：App.toc.generate()
 */
(function (global) {
  'use strict';
  const App = global.App || (global.App = {});
  const S = App.sanitize;

  function generate() {
    const content = document.getElementById('markdownContent');
    const list = document.getElementById('tocList');
    if (!content || !list) return;

    const headings = content.querySelectorAll('h1, h2, h3, h4');
    list.innerHTML = '';
    if (!headings.length) {
      S.setInnerHTML(list, '<li class="toc-item"><span class="toc-link">暂无目录</span></li>');
      return;
    }

    headings.forEach((h, i) => {
      if (!h.id) h.id = 'heading-' + i;
      const level = +h.tagName[1];
      const li = document.createElement('li');
      li.className = 'toc-item toc-level-' + level;
      const a = document.createElement('a');
      a.href = '#' + h.id;
      a.className = 'toc-link';
      const clone = h.cloneNode(true);
      clone.querySelectorAll('.anchor').forEach(n => n.remove());
      a.textContent = clone.textContent.trim();
      a.addEventListener('click', e => {
        e.preventDefault();
        try { h.scrollIntoView({ behavior: 'smooth' }); } catch (e2) { h.scrollIntoView(); }
        if (window.innerWidth <= 768) {
          const sb = document.getElementById('markdownSidebar');
          if (sb) sb.classList.add('hidden');
        }
      });
      li.appendChild(a);
      list.appendChild(li);
    });
  }

  App.toc = { generate };
})(window);