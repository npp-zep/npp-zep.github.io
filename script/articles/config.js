(function (global) {
  'use strict';
  const App = global.App || (global.App = {});
  App.config = {
    ARTICLES_CONFIG_URL: 'assets/passage/articles.json',
    ARTICLES_BASE_URL: 'assets/passage/',
    DOC_TYPES: ['project', 'document', 'api', 'guide', 'tutorial', 'note', 'web', 'python', 'lua']
  };
})(window);