/**
 * HTML 清理与安全插入
 * 依赖：core/utils.js（escapeHtml）
 * 暴露：App.sanitize.ready / html / setInnerHTML / insertHTML / basicHTMLSanitize
 */
(function (global) {
  'use strict';
  const App = global.App || (global.App = {});
  const U = App.utils;

  function ready() {
    return typeof DOMPurify !== 'undefined' && !!DOMPurify.sanitize;
  }

  function basicHTMLSanitize(html) {
    if (typeof html !== 'string') return '';
    let clean = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
    clean = clean.replace(/\s(on\w+)=["'][^"']*["']/gi, '');
    clean = clean.replace(/\s(href|src)=["']javascript:[^"']*["']/gi, '');
    return clean;
  }

  function html(str, config) {
    if (!ready()) return basicHTMLSanitize(str);
    try {
      return DOMPurify.sanitize(str, Object.assign({
        ADD_ATTR: [
          'data-code-id', 'data-copy-target', 'data-inline-id', 'data-copy-inline',
          'data-code', 'data-action', 'data-file', 'data-title',
          'value', 'readonly', 'type', 'placeholder', 'name', 'disabled', 'checked', 'for'
        ],
        ADD_TAGS: ['pre', 'code', 'span'],
        ALLOW_DATA_ATTR: true,
        ALLOWED_ATTR: [
          // 基础
          'class', 'id', 'style', 'title',
          // 链接
          'href', 'target', 'rel',
          // 图片
          'src', 'alt', 'width', 'height', 'loading',
          // 代码块/内联复制
          'data-code-id', 'data-copy-target', 'data-inline-id', 'data-copy-inline', 'data-code',
          // 自定义动作
          'data-action', 'data-file', 'data-title',
          // 无障碍
          'aria-hidden',
          // 表单（分享对话框的 input）
          'value', 'readonly', 'type', 'placeholder', 'name', 'disabled', 'checked', 'for'
        ],
        FORBID_ATTR: ['onclick', 'onload', 'onerror', 'onmouseover', 'onmouseout']
      }, config || {}));
    } catch (e) {
      console.error('HTML清理错误:', e);
      return basicHTMLSanitize(str);
    }
  }

  function setInnerHTML(el, str) {
    if (!el) return;
    el.innerHTML = html(str);
  }

  function insertHTML(el, str, pos) {
    if (!el) return;
    el.insertAdjacentHTML(pos || 'beforeend', html(str));
  }

  App.sanitize = { ready, html, setInnerHTML, insertHTML, basicHTMLSanitize };
})(window);