/**
 * 分享对话框
 * 依赖：core/utils.js, core/sanitize.js
 * 暴露：App.share.open(article)
 *
 * 注意：分享链接通过 input.value 赋值，而不是写在 HTML 属性里，
 *       避免 DOMPurify 白名单未包含 value 时被剥离。
 */
(function (global) {
  'use strict';
  const App = global.App || (global.App = {});
  const U = App.utils;
  const S = App.sanitize;

  function open(article) {
    if (!article || !article.file) {
      console.warn('share: article.file 为空');
      return;
    }

    const base = window.location.origin + window.location.pathname;
    const url = `${base}?article=${encodeURIComponent(article.file)}`;

    const dialog = document.createElement('div');
    dialog.className = 'share-dialog';

    S.setInnerHTML(dialog, `
      <div class="share-dialog-content">
        <h3><i class="fas fa-share-alt"></i> 分享文章</h3>
        <p>分享链接给其他人，点击链接即可直接打开这篇文章</p>
        <div class="share-url-container">
          <input type="text" readonly class="share-url-input" id="shareUrlInput">
          <button class="copy-url-btn" id="copyUrlBtn"><i class="far fa-copy"></i> 复制</button>
        </div>
        <div class="share-actions">
          <button class="share-action-btn" id="shareWhatsapp" title="WhatsApp"><i class="fab fa-whatsapp"></i></button>
          <button class="share-action-btn" id="shareTelegram" title="Telegram"><i class="fab fa-telegram"></i></button>
          <button class="share-action-btn" id="shareTwitter" title="Twitter"><i class="fab fa-twitter"></i></button>
          <button class="share-action-btn" id="shareEmail" title="Email"><i class="fas fa-envelope"></i></button>
        </div>
        <div class="share-dialog-footer"><button class="share-close-btn" id="shareCloseBtn">关闭</button></div>
      </div>
    `);

    document.body.appendChild(dialog);
    setTimeout(() => dialog.classList.add('show'), 10);

    // 关键：setInnerHTML 之后再赋值，避免 value 属性被 sanitize 剥离
    const input = dialog.querySelector('#shareUrlInput');
    if (input) input.value = url;

    const copyBtn = dialog.querySelector('#copyUrlBtn');
    if (copyBtn && input) {
      copyBtn.addEventListener('click', () => {
        input.select();
        input.setSelectionRange(0, 99999);
        U.copyText(url).then(ok => {
          copyBtn.innerHTML = ok ? '<i class="fas fa-check"></i> 已复制' : '<i class="fas fa-times"></i> 失败';
          copyBtn.classList.add(ok ? 'success' : 'error');
          setTimeout(() => {
            copyBtn.innerHTML = '<i class="far fa-copy"></i> 复制';
            copyBtn.classList.remove('success', 'error');
          }, 2000);
        });
      });
    }

    const text = encodeURIComponent(`查看文章: ${article.title}`);
    const wa = dialog.querySelector('#shareWhatsapp');
    if (wa) wa.addEventListener('click', () => window.open(`https://wa.me/?text=${text}%20${url}`, '_blank'));
    const tg = dialog.querySelector('#shareTelegram');
    if (tg) tg.addEventListener('click', () => window.open(`https://t.me/share/url?url=${url}&text=${text}`, '_blank'));
    const tw = dialog.querySelector('#shareTwitter');
    if (tw) tw.addEventListener('click', () => window.open(`https://twitter.com/intent/tweet?text=${text}&url=${url}`, '_blank'));
    const em = dialog.querySelector('#shareEmail');
    if (em) em.addEventListener('click', () => window.open(`mailto:?subject=${encodeURIComponent(article.title)}&body=${text}%20${url}`));

    function close() {
      dialog.classList.remove('show');
      setTimeout(() => { if (dialog.parentNode) dialog.remove(); }, 300);
      document.removeEventListener('keydown', esc);
    }
    function esc(e) { if (e.key === 'Escape') close(); }

    const closeBtn = dialog.querySelector('#shareCloseBtn');
    if (closeBtn) closeBtn.addEventListener('click', close);
    dialog.addEventListener('click', e => { if (e.target === dialog) close(); });
    document.addEventListener('keydown', esc);
  }

  App.share = { open };
})(window);