/**
 * 文章页入口（S3.16）
 * 依赖：所有 core/render/articles/reader 模块
 * 职责：初始化、全局委托、暴露 App.articles / App.passage
 */
(function (global) {
  'use strict';
  const App = global.App || (global.App = {});

  const state = { all: [], filtered: [], view: 'grid', sort: 'date', query: '', filter: 'all', fromUrl: null };
  let bound = false;
  let filterInited = false;

  function $(id) { return document.getElementById(id); }

  function init() {
    App.theme.init();
    initViewControls();
    initSearch();
    initMarkdownViewer();
    bindGlobalDelegates();

    const params = new URLSearchParams(location.search);
    const file = params.get('article');
    if (file) state.fromUrl = file;

    load().then(() => { if (state.fromUrl) setTimeout(openFromUrl, 500); });

    const loading = $('loading');
    if (loading) setTimeout(() => { loading.style.opacity = '0'; setTimeout(() => loading.style.display = 'none', 500); }, 500);
  }

  async function load() {
    const list = $('articlesList');
    try {
      App.sanitize.setInnerHTML(list, '<div class="loading-articles"><div class="loading-spinner"></div><p>正在加载文章列表...</p></div>');
      state.all = await App.data.load();
      state.filtered = state.all;
      performSearch();
      initFilter();
      console.log('成功加载', state.all.length, '篇文章');
    } catch (e) {
      console.error('加载文章失败:', e);
      showError('无法加载文章列表', e.message);
    }
  }

  function showError(title, msg) {
    const list = $('articlesList');
    App.sanitize.setInnerHTML(list, `
      <div class="error-message">
        <i class="fas fa-exclamation-triangle"></i>
        <h3>${App.utils.escapeHtml(title)}</h3>
        <p>${App.utils.escapeHtml(msg)}</p>
        <p style="font-size:0.85rem;margin-top:1rem;">请检查文件路径是否正确，并确保 <code>articles.json</code> 文件存在。</p>
        <button data-action="reload-articles" class="article-btn" style="margin-top:1rem;"><i class="fas fa-redo"></i> 重试加载</button>
      </div>`);
    const s = $('statsSection'); if (s) s.innerHTML = '';
  }

  function performSearch() {
    App.search.setQuery(state.query);
    App.search.setFilter(state.filter);
    App.search.setSort(state.sort);
    App.search.setFields({
      title: $('searchTitle') ? $('searchTitle').checked : true,
      description: $('searchDescription') ? $('searchDescription').checked : true,
      tags: $('searchTags') ? $('searchTags').checked : true
    });
    App.search.setFlags(
      $('searchCaseSensitive') ? $('searchCaseSensitive').checked : false,
      $('searchUseRegex') ? $('searchUseRegex').checked : false
    );
    state.filtered = App.search.perform(state.all);
    render();
  }

  function render() {
    const list = $('articlesList');
    if (!state.filtered.length) {
      App.sanitize.setInnerHTML(list, `
        <div class="no-results">
          <i class="fas fa-search"></i>
          <h3>没有找到匹配的文章</h3>
          <p>尝试使用不同的关键词或调整搜索选项</p>
          ${state.query ? '<button data-action="clear-search" class="article-btn" style="margin-top:1rem;"><i class="fas fa-times"></i> 清除搜索</button>' : ''}
        </div>`);
      return;
    }
    App.card.renderList(list, state.filtered, { batch: 5, onDone: () => App.stats.update(state.all) });
  }

  function initFilter() {
    if (filterInited) return;
    filterInited = true;
    App.filter.init(val => { state.filter = val; performSearch(); });
  }

  function initViewControls() {
    const grid = $('viewGridBtn'), list = $('viewListBtn'), sd = $('sortDateBtn'), st = $('sortTitleBtn'), rf = $('refreshBtn');
    function setView(v) {
      state.view = v; localStorage.setItem('articleView', v);
      const box = $('articlesList');
      if (!box) return;
      box.classList.toggle('grid-view', v === 'grid');
      box.classList.toggle('list-view', v === 'list');
    }
    function setSort(s) { state.sort = s; localStorage.setItem('articleSort', s); }
    if (grid) grid.addEventListener('click', () => { setView('grid'); grid.classList.add('active'); list.classList.remove('active'); });
    if (list) list.addEventListener('click', () => { setView('list'); list.classList.add('active'); grid.classList.remove('active'); });
    if (sd) sd.addEventListener('click', () => { setSort('date'); sd.classList.add('active'); st.classList.remove('active'); render(); });
    if (st) st.addEventListener('click', () => { setSort('title'); st.classList.add('active'); sd.classList.remove('active'); render(); });
    if (rf) rf.addEventListener('click', () => {
      load();
      rf.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 刷新中...'; rf.disabled = true;
      setTimeout(() => { rf.innerHTML = '<i class="fas fa-sync-alt"></i> 刷新'; rf.disabled = false; }, 1000);
    });

    const v = localStorage.getItem('articleView') || 'grid';
    const s = localStorage.getItem('articleSort') || 'date';
    setView(v); setSort(s);
    if (grid && list) { grid.classList.toggle('active', v === 'grid'); list.classList.toggle('active', v === 'list'); }
    if (sd && st) { sd.classList.toggle('active', s === 'date'); st.classList.toggle('active', s === 'title'); }
  }

  function initSearch() {
    const input = $('searchInput'), clr = $('searchClear');
    if (!input) return;
    const opts = ['searchTitle', 'searchDescription', 'searchTags', 'searchCaseSensitive', 'searchUseRegex'].map(id => $(id)).filter(Boolean);
    opts.forEach(o => {
      const k = o.id;
      if (localStorage.getItem(k) !== null) o.checked = localStorage.getItem(k) === 'true';
      o.addEventListener('change', () => { localStorage.setItem(k, o.checked); if (state.query) performSearch(); });
    });
    const debounced = App.utils.debounce(() => performSearch(), 300);
    input.addEventListener('input', e => {
      state.query = e.target.value.trim();
      if (clr) clr.style.display = state.query ? 'block' : 'none';
      debounced();
    });
    input.addEventListener('keydown', e => { if (e.key === 'Enter') performSearch(); });
    if (clr) clr.addEventListener('click', clearSearch);
  }

  function clearSearch() {
    state.query = '';
    App.search.clear();
    performSearch();
    const input = $('searchInput'); if (input) input.focus();
  }

  function initMarkdownViewer() {
    const back = $('backBtn'), toggle = $('toggleSidebarBtn'), copy = $('copyBtn'), themeBtn = $('themeToggleBtn');
    const sel = $('codeThemeSelect'), sb = $('markdownSidebar'), ov = $('sidebarOverlay');
    const fMinus = $('fontMinusBtn'), fReset = $('fontResetBtn'), fPlus = $('fontPlusBtn');

    if (back) back.addEventListener('click', () => {
      if (App.reader && typeof App.reader.closeReaderUI === 'function') {
        App.reader.closeReaderUI();
      } else {
        const v = $('markdownViewer'); if (v) v.style.display = 'none';
        document.body.classList.remove('reader-open');
        if (App.reader && App.reader.resetInfo) App.reader.resetInfo();
      }
    });

    if (toggle && sb) toggle.addEventListener('click', () => sb.classList.toggle('hidden'));
    if (ov && sb) ov.addEventListener('click', () => sb.classList.add('hidden'));
    if (copy) copy.addEventListener('click', () => {
      const c = $('markdownContent'); if (!c) return;
      const txt = c.innerText;
      if (!txt.trim()) return;
      App.utils.copyText(txt).then(ok => {
        const orig = copy.innerHTML;
        copy.innerHTML = ok ? '<i class="fas fa-check"></i> <span>已复制</span>' : '<i class="fas fa-times"></i> <span>失败</span>';
        setTimeout(() => { copy.innerHTML = orig; }, 2000);
      });
    });
    if (themeBtn && sb) themeBtn.addEventListener('click', () => sb.classList.remove('hidden'));
    if (sel) {
      const saved = localStorage.getItem('codeTheme') || 'github-dark';
      sel.value = saved;
      changeCodeTheme(saved);
      sel.addEventListener('change', e => { changeCodeTheme(e.target.value); localStorage.setItem('codeTheme', e.target.value); });
    }

    // 字体缩放按钮
    if (fMinus) fMinus.addEventListener('click', () => App.reader.setFontScale(App.reader.getFontScale() - 0.1));
    if (fReset) fReset.addEventListener('click', () => App.reader.setFontScale(1));
    if (fPlus)  fPlus.addEventListener('click',  () => App.reader.setFontScale(App.reader.getFontScale() + 0.1));

    window.addEventListener('resize', () => { if (window.innerWidth > 768 && sb) sb.classList.remove('hidden'); });
  }

  function changeCodeTheme(theme) {
    const link = document.querySelector('link[href*="highlight.js"]');
    if (link) {
      const name = theme === 'github' ? 'github.min.css' : `${theme}.min.css`;
      link.href = `https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.8.0/styles/${name}`;
    }
  }

  function bindGlobalDelegates() {
    if (bound) return;
    bound = true;
    App.codeCopy.init();

    const list = $('articlesList');
    if (list) list.addEventListener('click', e => {
      if (e.target.closest('[data-action="clear-search"]')) { clearSearch(); return; }
      if (e.target.closest('[data-action="reload-articles"]')) { load(); return; }
      const read = e.target.closest('.read-btn');
      if (read) { const c = read.closest('.article-card'); if (c) App.reader.open(c.dataset.file, c.dataset.title, null); return; }
      const share = e.target.closest('.share-btn');
      if (share) { const c = share.closest('.article-card'); const a = state.all.find(x => x.file === c.dataset.file); if (a) App.share.open(a); return; }
      const dl = e.target.closest('.download-btn');
      if (dl) { const c = dl.closest('.article-card'); if (c) download(c.dataset.file); return; }
      const tag = e.target.closest('.article-tag');
      if (tag) {
        e.stopPropagation();
        const t = tag.textContent.trim();
        const input = $('searchInput'), clr = $('searchClear');
        if (input) input.value = t;
        state.query = t;
        if (clr) clr.style.display = 'block';
        performSearch();
        return;
      }
      if (e.target.closest('.article-actions')) return;
      const card = e.target.closest('.article-card');
      if (card) App.reader.open(card.dataset.file, card.dataset.title, null);
    });

    const content = $('markdownContent');
    if (content) content.addEventListener('click', e => {
      const retry = e.target.closest('[data-action="retry-open"]');
      if (retry) { App.reader.open(retry.dataset.file, retry.dataset.title, null); return; }
      const dl = e.target.closest('[data-action="download"]');
      if (dl) { download(dl.dataset.file); }
    });
  }

  function download(file) {
    if (!file) return;
    const a = document.createElement('a');
    a.href = App.config.ARTICLES_BASE_URL + file;
    a.download = file;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
  }

  function openFromUrl() {
    if (!state.fromUrl) return;
    const a = state.all.find(x => x.file === state.fromUrl);
    if (a) App.reader.open(a.file, a.title, a);
    else console.warn('未找到文章:', state.fromUrl);
  }

  App.articles = {
    init, load, reload: load, performSearch, clearSearch,
    get state() { return state; }
  };
  App.passage = { init };

  window.addEventListener('load', () => App.passage.init());
})(window);