/**
 * 通用工具模块
 * 暴露：App.utils.escapeHtml / formatWordCount / formatNumber / debounce
 *       App.utils.copyText / fallbackCopy / safeFetch
 */
(function (global) {
  'use strict';
  const App = global.App || (global.App = {});

  function escapeHtml(text) {
    if (typeof text !== 'string') text = String(text);
    const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
    return text.replace(/[&<>"']/g, m => map[m]);
  }

  function formatWordCount(wordCount) {
    if (wordCount >= 10000) return `${(wordCount / 10000).toFixed(1)}万`;
    if (wordCount >= 1000) return `${(wordCount / 1000).toFixed(1)}千`;
    return formatNumber(wordCount);
  }

  function formatNumber(num) {
    return String(num).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }

  function debounce(fn, ms) {
    let timer = null;
    return function (...args) {
      clearTimeout(timer);
      timer = setTimeout(() => fn.apply(this, args), ms);
    };
  }

  function copyText(text) {
    return new Promise(resolve => {
      const str = String(text || '');
      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(str).then(() => resolve(true)).catch(() => resolve(fallbackCopy(str)));
      } else {
        resolve(fallbackCopy(str));
      }
    });
  }

  function fallbackCopy(text) {
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.left = '-999999px';
      ta.style.top = '-999999px';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      if (/ipad|ipod|iphone/i.test(navigator.userAgent)) {
        const range = document.createRange();
        range.selectNodeContents(ta);
        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
        ta.setSelectionRange(0, 999999);
      } else {
        ta.select();
      }
      const ok = document.execCommand('copy');
      setTimeout(() => { if (ta.parentNode) ta.parentNode.removeChild(ta); }, 100);
      return ok;
    } catch (e) {
      console.error('复制失败:', e);
      return false;
    }
  }

  function safeFetch(url, options) {
    options = options || {};
    if (typeof fetch === 'undefined') {
      return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open(options.method || 'GET', url, true);
        if (options.headers) {
          for (const h in options.headers) {
            if (options.headers.hasOwnProperty(h)) xhr.setRequestHeader(h, options.headers[h]);
          }
        }
        xhr.onreadystatechange = function () {
          if (xhr.readyState === 4) {
            if (xhr.status >= 200 && xhr.status < 300) {
              resolve({
                ok: true,
                status: xhr.status,
                headers: { get: n => xhr.getResponseHeader(n) },
                text: () => Promise.resolve(xhr.responseText),
                json: () => { try { return Promise.resolve(JSON.parse(xhr.responseText)); } catch (e) { return Promise.reject(e); } }
              });
            } else {
              reject(new Error('HTTP错误! 状态: ' + xhr.status));
            }
          }
        };
        xhr.onerror = () => reject(new Error('网络错误'));
        xhr.ontimeout = () => reject(new Error('请求超时'));
        if (options.timeout) xhr.timeout = options.timeout;
        xhr.send(options.body);
      });
    }
    return fetch(url, options);
  }

  App.utils = { escapeHtml, formatWordCount, formatNumber, debounce, copyText, fallbackCopy, safeFetch };
})(window);