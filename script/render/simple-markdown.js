(function (global) {
  'use strict';
  const App = global.App || (global.App = {});
  const U = App.utils;

  // 防御：确保 App.render 存在，且不覆盖已有属性
  App.render = App.render || {};

  function uid(prefix) {
    return (prefix || 'id') + '-' + Date.now() + '-' + Math.random().toString(36).slice(2, 9);
  }

  function getLanguageName(lang) {
    if (!lang) return '代码';
    const map = {
      js: 'JavaScript', javascript: 'JavaScript', py: 'Python', python: 'Python',
      lua: 'Lua', html: 'HTML', css: 'CSS', json: 'JSON', xml: 'XML',
      bash: 'Bash', sh: 'Shell', md: 'Markdown', cpp: 'C++', c: 'C',
      java: 'Java', php: 'PHP', ruby: 'Ruby', go: 'Go', rust: 'Rust',
      ts: 'TypeScript', typescript: 'TypeScript', sql: 'SQL', yaml: 'YAML',
      yml: 'YAML', txt: 'Text', plaintext: 'Text'
    };
    return map[lang.toLowerCase()] || lang.charAt(0).toUpperCase() + lang.slice(1);
  }

  function simple(markdown) {
    if (!markdown || typeof markdown !== 'string') return '<p>内容为空</p>';
    let html = markdown;

    html = html.replace(/```(\w+)?\n([\s\S]*?)```/g, (m, lang, code) => {
      const codeId = uid('code');
      return `
        <div class="code-block-wrapper" data-code-id="${codeId}">
          <div class="code-block-header">
            <span class="code-language">${U.escapeHtml(getLanguageName(lang))}</span>
            <button class="copy-code-btn" data-copy-target="${codeId}">
              <i class="far fa-copy"></i><span>复制</span>
            </button>
          </div>
          <pre><code class="${U.escapeHtml(lang || '')}">${U.escapeHtml(code)}</code></pre>
        </div>`;
    });

    html = html
      .replace(/^# (.*$)/gm, '<h1>$1</h1>')
      .replace(/^## (.*$)/gm, '<h2>$1</h2>')
      .replace(/^### (.*$)/gm, '<h3>$1</h3>')
      .replace(/^#### (.*$)/gm, '<h4>$1</h4>')
      .replace(/^##### (.*$)/gm, '<h5>$1</h5>')
      .replace(/^###### (.*$)/gm, '<h6>$1</h6>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/__(.*?)__/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/_(.*?)_/g, '<em>$1</em>')
      .replace(/`([^`]+)`/g, (m, code) => {
        if (code.length > 10) {
          const inlineId = uid('inline');
          return `<span class="code-inline-wrapper" data-inline-id="${inlineId}" data-code="${U.escapeHtml(code)}">
            <code>${U.escapeHtml(code)}</code>
            <button class="inline-copy-btn" data-copy-inline="${inlineId}"><i class="far fa-copy"></i></button>
          </span>`;
        }
        return `<code>${U.escapeHtml(code)}</code>`;
      })
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, (m, text, href) => {
        const t = U.escapeHtml(text), h = U.escapeHtml(href);
        if (/^https?:\/\//i.test(href)) return `<a href="${h}" target="_blank" rel="noopener noreferrer">${t}</a>`;
        if (/^javascript:/i.test(href)) return `<span>${t}</span>`;
        return `<a href="${h}">${t}</a>`;
      })
      .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (m, alt, src) =>
        `<img src="${U.escapeHtml(src)}" alt="${U.escapeHtml(alt)}" style="max-width:100%;height:auto;" loading="lazy">`)
      .replace(/^\s*[\*\-\+]\s+(.*$)/gm, '<li>$1</li>')
      .replace(/^>\s*(.*$)/gm, '<blockquote>$1</blockquote>')
      .replace(/\n\n+/g, '</p><p>')
      .replace(/^([^<\n].*)/gm, '<p>$1</p>');

    html = html.replace(/<li>.*?<\/li>/g, m => /<\/ul>|<\/ol>/.test(m) ? m : '<ul>' + m + '</ul>');

    return (App.sanitize && App.sanitize.html) ? App.sanitize.html(html) : html;
  }

  // 只在未定义时赋值，避免覆盖 markdown.js 已设置的属性
  if (!App.render.simple) App.render.simple = simple;
  if (!App.render.getLanguageName) App.render.getLanguageName = getLanguageName;
  if (!App.render.uid) App.render.uid = uid;
})(window);