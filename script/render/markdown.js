/**
 * Markdown 渲染（marked + highlight.js + DOMPurify）
 * 依赖：core/utils.js, core/sanitize.js, render/simple-markdown.js, vendor/marked, vendor/purify, highlight.js
 * 暴露：App.render.markdown / safeHtml / copyCodeBlock / copyInlineCode
 *
 * 注意：本文件不依赖 simple-markdown.js 先加载。若 App.render 不存在，本文件会自行创建。
 *       simple-markdown.js 若后加载，会复用同一个 App.render 对象。
 */
(function (global) {
  'use strict';
  const App = global.App || (global.App = {});
  const U = App.utils;
  const S = App.sanitize;

  // 防御：确保 App.render 存在（simple-markdown.js 未加载时也能工作）
  App.render = App.render || {};

  // 惰性读取 simple-markdown.js 提供的工具；若缺失，提供本地兜底
  function uid(prefix) {
    if (typeof App.render.uid === 'function') return App.render.uid(prefix);
    return (prefix || 'id') + '-' + Date.now() + '-' + Math.random().toString(36).slice(2, 9);
  }

  function getLang(lang) {
    if (typeof App.render.getLanguageName === 'function') return App.render.getLanguageName(lang);
    if (!lang) return '代码';
    const map = {
      js: 'JavaScript', javascript: 'JavaScript', py: 'Python', python: 'Python',
      lua: 'Lua', html: 'HTML', css: 'CSS', json: 'JSON', xml: 'XML',
      bash: 'Bash', sh: 'Shell', md: 'Markdown', cpp: 'C++', c: 'C',
      java: 'Java', php: 'PHP', ruby: 'Ruby', go: 'Go', rust: 'Rust',
      ts: 'TypeScript', typescript: 'TypeScript', sql: 'SQL', yaml: 'YAML',
      yml: 'YAML', txt: 'Text', plaintext: 'Text'
    };
    return map[String(lang).toLowerCase()] || String(lang).charAt(0).toUpperCase() + String(lang).slice(1);
  }

  // 兜底 simple 渲染：若 simple-markdown.js 未加载，用极简实现
  function fallbackSimple(md) {
    if (typeof App.render.simple === 'function') return App.render.simple(md);
    if (!md) return '<p>内容为空</p>';
    let html = String(md)
      .replace(/^# (.*$)/gm, '<h1>$1</h1>')
      .replace(/^## (.*$)/gm, '<h2>$1</h2>')
      .replace(/^### (.*$)/gm, '<h3>$1</h3>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/\n\n+/g, '</p><p>')
      .replace(/^([^<\n].*)/gm, '<p>$1</p>');
    return S && S.html ? S.html(html) : html;
  }

  function safeHtml(str, cfg) {
    if (S && typeof S.html === 'function') return S.html(str, cfg);
    return str;
  }

  function copyFeedback(btn, ok, isInline) {
    if (!btn) return;
    const orig = btn.innerHTML;
    const origClass = btn.className;
    if (isInline) {
      btn.innerHTML = ok ? '<i class="fas fa-check"></i>' : '<i class="fas fa-times"></i>';
      btn.style.color = ok ? '#00ff00' : '#ff0000';
      setTimeout(() => { btn.innerHTML = orig; btn.style.color = ''; }, 2000);
    } else {
      btn.innerHTML = ok ? '<i class="fas fa-check"></i><span>已复制</span>' : '<i class="fas fa-times"></i><span>失败</span>';
      btn.className = origClass + (ok ? ' success' : ' error');
      setTimeout(() => { btn.innerHTML = orig; btn.className = origClass; }, 2000);
    }
  }

  function copyCodeBlock(id, btn) {
    let wrapper = typeof id === 'string' ? document.querySelector(`.code-block-wrapper[data-code-id="${id}"]`) : null;
    if (!wrapper && btn) wrapper = btn.closest('.code-block-wrapper');
    const code = wrapper && wrapper.querySelector('code');
    if (!code) { copyFeedback(btn, false); return; }
    U.copyText(code.textContent).then(ok => copyFeedback(btn, ok));
  }

  function copyInlineCode(id, btn) {
    let wrapper = typeof id === 'string' ? document.querySelector(`.code-inline-wrapper[data-inline-id="${id}"]`) : null;
    if (!wrapper && btn) wrapper = btn.closest('.code-inline-wrapper');
    const code = wrapper && wrapper.querySelector('code');
    const text = code ? code.textContent : (wrapper && wrapper.dataset.code) || '';
    if (!text) { copyFeedback(btn, false, true); return; }
    U.copyText(text).then(ok => copyFeedback(btn, ok, true));
  }

  function buildRenderer() {
    const renderer = new marked.Renderer();

    renderer.heading = function (text, level) {
      const id = String(text).toLowerCase().replace(/[^\w\u4e00-\u9fa5]+/g, '-').replace(/^-+|-+$/g, '') || uid('h');
      return `<h${level} id="${id}">${U.escapeHtml(text)}<a href="#${id}" class="anchor" aria-hidden="true">#</a></h${level}>`;
    };

    renderer.link = function (href, title, text) {
      let h = U.escapeHtml(href);
      if (/^javascript:/i.test(h)) h = '#';
      const t = U.escapeHtml(text);
      const tAttr = title ? ` title="${U.escapeHtml(title)}"` : '';
      if (/^https?:\/\//i.test(h)) return `<a href="${h}" target="_blank" rel="noopener noreferrer"${tAttr}>${t}</a>`;
      return `<a href="${h}"${tAttr}>${t}</a>`;
    };

    renderer.code = function (code, language) {
      const codeStr = String(code || '');
      const valid = language && typeof hljs !== 'undefined' && hljs.getLanguage(language) ? language : '';
      let highlighted = U.escapeHtml(codeStr);
      if (valid) {
        try { highlighted = safeHtml(hljs.highlight(codeStr, { language: valid }).value); }
        catch (e) { highlighted = U.escapeHtml(codeStr); }
      }
      const codeId = uid('code');
      const htmlStr = `<div class="code-block-wrapper" data-code-id="${codeId}">
        <div class="code-block-header">
          <span class="code-language">${U.escapeHtml(getLang(valid))}</span>
          <button class="copy-code-btn" data-copy-target="${codeId}"><i class="far fa-copy"></i><span>复制</span></button>
        </div>
        <pre><code class="hljs ${U.escapeHtml(valid)}">${highlighted}</code></pre>
      </div>`;
      return safeHtml(htmlStr);
    };

    renderer.codespan = function (code) {
      const s = String(code || '');
      if (s.length > 10) {
        const id = uid('inline');
        return safeHtml(`<span class="code-inline-wrapper" data-inline-id="${id}" data-code="${U.escapeHtml(s)}">
          <code>${U.escapeHtml(s)}</code>
          <button class="inline-copy-btn" data-copy-inline="${id}"><i class="far fa-copy"></i></button>
        </span>`);
      }
      return `<code>${U.escapeHtml(s)}</code>`;
    };

    renderer.table = function (header, body) {
      return safeHtml(`<div class="table-container"><table><thead>${header}</thead><tbody>${body}</tbody></table></div>`);
    };

    renderer.image = function (href, title, text) {
      let h = U.escapeHtml(href);
      if (/^javascript:/i.test(h)) h = '';
      const t = U.escapeHtml(text);
      const tAttr = title ? ` title="${U.escapeHtml(title)}"` : '';
      return safeHtml(`<div class="image-container"><img src="${h}" alt="${t}"${tAttr} loading="lazy">${text ? `<div class="image-caption">${t}</div>` : ''}</div>`);
    };

    renderer.blockquote = function (quote) {
      return safeHtml(`<blockquote><div class="quote-content">${quote}</div></blockquote>`);
    };

    return renderer;
  }

  function markdown(md, options) {
    options = options || {};
    if (typeof marked === 'undefined') return fallbackSimple(md);

    if (!marked.__luaJavaNE_configured) {
      marked.setOptions({ gfm: true, breaks: true, pedantic: false, sanitize: false, smartLists: true, smartypants: true });
      marked.__luaJavaNE_configured = true;
    }
    const renderer = marked.__luaJavaNE_renderer || (marked.__luaJavaNE_renderer = buildRenderer());

    try {
      const raw = marked.parse(md ? String(md) : '', { renderer });
      return options.sanitize === false ? raw : safeHtml(raw);
    } catch (e) {
      console.error('渲染Markdown错误:', e);
      return fallbackSimple(md);
    }
  }

  App.render.markdown = markdown;
  App.render.safeHtml = safeHtml;
  App.render.copyCodeBlock = copyCodeBlock;
  App.render.copyInlineCode = copyInlineCode;

  // 兼容旧全局名
  global.renderMarkdown = markdown;
  global.renderSimpleMarkdown = function (md) {
    return typeof App.render.simple === 'function' ? App.render.simple(md) : fallbackSimple(md);
  };
  global.safeSanitizeHTML = safeHtml;
  global.copyCodeBlock = copyCodeBlock;
  global.copyInlineCode = copyInlineCode;
  global.copyTextToClipboard = function (text, btn, isInline) {
    U.copyText(text).then(ok => copyFeedback(btn, ok, isInline));
  };

  console.log('Markdown渲染器已加载（S3 模块版，simple-markdown=' + (typeof App.render.simple === 'function' ? '已加载' : '未加载') + '）');
})(window);