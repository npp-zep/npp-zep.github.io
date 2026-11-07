/**
 * 代码复制事件委托（document 级，只绑一次）
 * 依赖：core/utils.js, render/markdown.js（copyFeedback 在 markdown.js 内部）
 * 暴露：App.codeCopy.init()
 */
(function (global) {
  'use strict';
  const App = global.App || (global.App = {});
  let bound = false;

  function init() {
    if (bound) return;
    bound = true;
    document.addEventListener('click', e => {
      const codeBtn = e.target.closest('.copy-code-btn');
      if (codeBtn) {
        const wrapper = codeBtn.closest('.code-block-wrapper');
        if (wrapper) {
          const code = wrapper.querySelector('code');
          if (code) { App.render.copyCodeBlock(wrapper.dataset.codeId, codeBtn); return; }
        }
      }
      const inlineBtn = e.target.closest('.inline-copy-btn');
      if (inlineBtn) {
        const wrapper = inlineBtn.closest('.code-inline-wrapper');
        if (wrapper) { App.render.copyInlineCode(wrapper.dataset.inlineId, inlineBtn); }
      }
    });
  }

  App.codeCopy = { init };
})(window);