// 全局变量
const ARTICLES_CONFIG_URL = 'assets/passage/articles.json';
const ARTICLES_BASE_URL = 'assets/passage/';
let allArticles = [];
let filteredArticles = [];
let currentArticleStats = null;
let currentSearchQuery = '';
let currentFilter = 'all';
let currentSort = 'date';
let currentView = 'grid';
let currentArticleFromUrl = null; // 新增：URL参数中的文章

// 搜索相关变量
let searchTimeout = null;
let lastSearchTime = 0;

// 页面初始化
window.addEventListener('load', function () {
  // 检查浏览器兼容性
  const compatibility = checkBrowserCompatibility();

  // 设置加载超时
  const loadingTimeout = setTimeout(function () {
    document.getElementById('loading').style.opacity = '0';
    setTimeout(function () {
      document.getElementById('loading').style.display = 'none';
    }, 500);
  }, 1000);

  // 加载文章数据
  initThemeSwitcher();
  initBackgroundToggle();
  initMarkdownViewer();
  initSearch();
  initViewControls();
  addKeyboardShortcuts();

  // 检查URL参数
  const urlParams = new URLSearchParams(window.location.search);
  const articleFile = urlParams.get('article');
  
  if (articleFile) {
    currentArticleFromUrl = articleFile;
    console.log('从URL获取文章:', articleFile);
  }

  // 加载文章
  loadArticles().then(() => {
    // 如果URL中有文章参数，自动打开
    if (currentArticleFromUrl) {
      setTimeout(() => openArticleFromUrl(), 500);
    }
  });

  // 如果加载完成，清除超时
  clearTimeout(loadingTimeout);
  setTimeout(function () {
    document.getElementById('loading').style.opacity = '0';
    setTimeout(function () {
      document.getElementById('loading').style.display = 'none';
    }, 500);
  }, 500);
});

// 新增：从URL打开文章
async function openArticleFromUrl() {
  if (!currentArticleFromUrl) return;
  
  // 在所有文章中查找匹配的文章
  const article = allArticles.find(a => a.file === currentArticleFromUrl);
  
  if (article) {
    console.log('自动打开文章:', article.title);
    openArticle(article.file, article.title, article);
  } else {
    console.warn('未找到文章文件:', currentArticleFromUrl);
    showNotification(`未找到文章: ${currentArticleFromUrl}`, 'warning');
  }
}

// 新增：显示通知 - 安全版
function showNotification(message, type = 'info') {
  // 移除现有的通知
  const existingNotification = document.querySelector('.notification');
  if (existingNotification) {
    existingNotification.remove();
  }
  
  // 转义消息内容，防止XSS
  const safeMessage = escapeHtml(message);
  
  // 使用安全的HTML插入
  if (window.safeInsertHTML) {
    const notificationHTML = `
      <div class="notification notification-${type}">
        <span>${safeMessage}</span>
        <button class="notification-close"><i class="fas fa-times"></i></button>
      </div>
    `;
    
    window.safeInsertHTML(document.body, notificationHTML);
  } else {
    // 备用方法
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
      <span>${safeMessage}</span>
      <button class="notification-close"><i class="fas fa-times"></i></button>
    `;
    
    document.body.appendChild(notification);
  }
  
  const notification = document.querySelector('.notification');
  
  // 显示动画
  setTimeout(() => {
    notification.classList.add('show');
  }, 10);
  
  // 自动隐藏
  setTimeout(() => {
    notification.classList.remove('show');
    setTimeout(() => {
      if (notification.parentNode) {
        notification.remove();
      }
    }, 300);
  }, 3000);
  
  // 关闭按钮事件
  notification.querySelector('.notification-close').addEventListener('click', () => {
    notification.classList.remove('show');
    setTimeout(() => {
      if (notification.parentNode) {
        notification.remove();
      }
    }, 300);
  });
}

// 浏览器兼容性检测
function checkBrowserCompatibility() {
  const warning = document.getElementById('browserWarning');
  const isOldIE = /*@cc_on!@*/false || !!document.documentMode; // IE 6-11
  const isEdge = /Edge\/\d+/.test(navigator.userAgent);
  const isOldChrome = /Chrome\/([0-9]+)/.test(navigator.userAgent) && parseInt(RegExp.$1) < 50;
  const isOldFirefox = /Firefox\/([0-9]+)/.test(navigator.userAgent) && parseInt(RegExp.$1) < 50;
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

  // 检测关键API支持
  const missingAPIs = [];
  if (typeof fetch === 'undefined') missingAPIs.push('fetch API');
  if (typeof Promise === 'undefined') missingAPIs.push('Promise');
  if (typeof Set === 'undefined') missingAPIs.push('Set');

  if (isOldIE || isOldChrome || isOldFirefox || missingAPIs.length > 0) {
    warning.style.display = 'block';
    console.warn('浏览器兼容性问题检测到:', {
      isOldIE: isOldIE,
      isOldChrome: isOldChrome,
      isOldFirefox: isOldFirefox,
      missingAPIs: missingAPIs,
      userAgent: navigator.userAgent
    });
  }

  // 移动端特定优化
  if (isMobile) {
    // 移动端减少动画
    document.documentElement.style.setProperty('--transition', '0.2s ease');
    // 移动端禁用部分效果
    localStorage.setItem('bgVisible', 'false');
    document.getElementById('bgContainer').style.opacity = '0';
  }

  return {
    isModern: !isOldIE && !isOldChrome && !isOldFirefox && missingAPIs.length === 0,
    isMobile: isMobile,
    isIE: isOldIE
  };
}

// 初始化视图控制
function initViewControls() {
  const viewGridBtn = document.getElementById('viewGridBtn');
  const viewListBtn = document.getElementById('viewListBtn');
  const sortDateBtn = document.getElementById('sortDateBtn');
  const sortTitleBtn = document.getElementById('sortTitleBtn');
  const refreshBtn = document.getElementById('refreshBtn');

  viewGridBtn.addEventListener('click', () => {
    setView('grid');
    viewGridBtn.classList.add('active');
    viewListBtn.classList.remove('active');
  });

  viewListBtn.addEventListener('click', () => {
    setView('list');
    viewListBtn.classList.add('active');
    viewGridBtn.classList.remove('active');
  });

  sortDateBtn.addEventListener('click', () => {
    setSort('date');
    sortDateBtn.classList.add('active');
    sortTitleBtn.classList.remove('active');
    renderArticles();
  });

  sortTitleBtn.addEventListener('click', () => {
    setSort('title');
    sortTitleBtn.classList.add('active');
    sortDateBtn.classList.remove('active');
    renderArticles();
  });

  refreshBtn.addEventListener('click', () => {
    loadArticles();
    refreshBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 刷新中...';
    refreshBtn.disabled = true;
    setTimeout(() => {
      refreshBtn.innerHTML = '<i class="fas fa-sync-alt"></i> 刷新';
      refreshBtn.disabled = false;
    }, 1000);
  });

  // 从本地存储加载设置
  const savedView = localStorage.getItem('articleView') || 'grid';
  const savedSort = localStorage.getItem('articleSort') || 'date';

  setView(savedView);
  setSort(savedSort);

  if (savedView === 'grid') {
    viewGridBtn.classList.add('active');
    viewListBtn.classList.remove('active');
  } else {
    viewListBtn.classList.add('active');
    viewGridBtn.classList.remove('active');
  }

  if (savedSort === 'date') {
    sortDateBtn.classList.add('active');
    sortTitleBtn.classList.remove('active');
  } else {
    sortTitleBtn.classList.add('active');
    sortDateBtn.classList.remove('active');
  }
}

function setView(view) {
  currentView = view;
  localStorage.setItem('articleView', view);
  const articlesList = document.getElementById('articlesList');
  if (view === 'grid') {
    articlesList.classList.remove('list-view');
    articlesList.classList.add('grid-view');
  } else {
    articlesList.classList.remove('grid-view');
    articlesList.classList.add('list-view');
  }
}

function setSort(sort) {
  currentSort = sort;
  localStorage.setItem('articleSort', sort);
}

// 初始化搜索功能
function initSearch() {
  const searchInput = document.getElementById('searchInput');
  const searchClear = document.getElementById('searchClear');
  const searchTitle = document.getElementById('searchTitle');
  const searchDescription = document.getElementById('searchDescription');
  const searchTags = document.getElementById('searchTags');
  const searchCaseSensitive = document.getElementById('searchCaseSensitive');
  const searchUseRegex = document.getElementById('searchUseRegex');

  // 从本地存储加载搜索设置
  const savedSearchTitle = localStorage.getItem('searchTitle') !== 'false';
  const savedSearchDescription = localStorage.getItem('searchDescription') !== 'false';
  const savedSearchTags = localStorage.getItem('searchTags') !== 'false';
  const savedSearchCaseSensitive = localStorage.getItem('searchCaseSensitive') === 'true';
  const savedSearchUseRegex = localStorage.getItem('searchUseRegex') === 'true';

  searchTitle.checked = savedSearchTitle;
  searchDescription.checked = savedSearchDescription;
  searchTags.checked = savedSearchTags;
  searchCaseSensitive.checked = savedSearchCaseSensitive;
  searchUseRegex.checked = savedSearchUseRegex;

  // 搜索输入事件
  searchInput.addEventListener('input', function (e) {
    currentSearchQuery = e.target.value.trim();

    // 显示/隐藏清除按钮
    if (currentSearchQuery.length > 0) {
      searchClear.style.display = 'block';
    } else {
      searchClear.style.display = 'none';
    }

    // 防抖处理
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      performSearch();
    }, 300);
  });

  // 清除搜索
  searchClear.addEventListener('click', function () {
    searchInput.value = '';
    currentSearchQuery = '';
    searchClear.style.display = 'none';
    performSearch();
    searchInput.focus();
  });

  // 搜索选项变化
  [searchTitle, searchDescription, searchTags, searchCaseSensitive, searchUseRegex].forEach(option => {
    option.addEventListener('change', function () {
      // 保存设置到本地存储
      localStorage.setItem('searchTitle', searchTitle.checked);
      localStorage.setItem('searchDescription', searchDescription.checked);
      localStorage.setItem('searchTags', searchTags.checked);
      localStorage.setItem('searchCaseSensitive', searchCaseSensitive.checked);
      localStorage.setItem('searchUseRegex', searchUseRegex.checked);

      if (currentSearchQuery.length > 0) {
        performSearch();
      }
    });
  });

  // 回车键搜索
  searchInput.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') {
      performSearch();
    }
  });

  // 点击标签时自动填充搜索
  document.addEventListener('click', function (e) {
    if (e.target.classList.contains('article-tag')) {
      const tagText = e.target.textContent.trim();
      searchInput.value = tagText;
      currentSearchQuery = tagText;
      searchClear.style.display = 'block';
      performSearch();
    }
  });
}

// 执行搜索
function performSearch() {
  const startTime = performance.now();

  if (!allArticles || allArticles.length === 0) {
    return;
  }

  const searchTitle = document.getElementById('searchTitle').checked;
  const searchDescription = document.getElementById('searchDescription').checked;
  const searchTags = document.getElementById('searchTags').checked;
  const searchCaseSensitive = document.getElementById('searchCaseSensitive').checked;
  const searchUseRegex = document.getElementById('searchUseRegex').checked;

  let results = allArticles;

  // 首先应用筛选
  if (currentFilter !== 'all') {
    results = results.filter(article => {
      return article.tags && article.tags.some(tag =>
        tag.toLowerCase().includes(currentFilter.toLowerCase())
      );
    });
  }

  // 然后应用搜索
  if (currentSearchQuery) {
    try {
      let searchPattern;

      if (searchUseRegex) {
        // 使用正则表达式
        try {
          const flags = searchCaseSensitive ? 'g' : 'gi';
          searchPattern = new RegExp(currentSearchQuery, flags);
        } catch (e) {
          // 正则表达式无效，回退到普通搜索
          console.warn('无效的正则表达式:', e.message);
          searchPattern = null;
        }
      }

      results = results.filter(article => {
        let found = false;

        // 搜索标题
        if (searchTitle && article.title) {
          if (searchUseRegex && searchPattern) {
            found = searchPattern.test(article.title);
          } else {
            const title = searchCaseSensitive ? article.title : article.title.toLowerCase();
            const query = searchCaseSensitive ? currentSearchQuery : currentSearchQuery.toLowerCase();
            found = title.includes(query);
          }
        }

        // 搜索描述
        if (!found && searchDescription && article.description) {
          if (searchUseRegex && searchPattern) {
            found = searchPattern.test(article.description);
          } else {
            const description = searchCaseSensitive ? article.description : article.description.toLowerCase();
            const query = searchCaseSensitive ? currentSearchQuery : currentSearchQuery.toLowerCase();
            found = description.includes(query);
          }
        }

        // 搜索标签
        if (!found && searchTags && article.tags) {
          if (searchUseRegex && searchPattern) {
            found = article.tags.some(tag => searchPattern.test(tag));
          } else {
            const query = searchCaseSensitive ? currentSearchQuery : currentSearchQuery.toLowerCase();
            found = article.tags.some(tag => {
              const tagText = searchCaseSensitive ? tag : tag.toLowerCase();
              return tagText.includes(query);
            });
          }
        }

        return found;
      });
    } catch (error) {
      console.error('搜索出错:', error);
    }
  }

  // 应用排序
  results = sortArticles(results, currentSort);

  filteredArticles = results;

  // 更新搜索统计
  const endTime = performance.now();
  const searchDuration = Math.round(endTime - startTime);
  lastSearchTime = searchDuration;

  updateSearchStats(results.length, searchDuration);

  // 渲染文章
  renderArticles();
}

// 更新搜索统计信息
function updateSearchStats(resultsCount, searchDuration) {
  const searchStats = document.getElementById('searchStats');
  const resultsCountElement = document.getElementById('resultsCount');
  const searchTimeInfo = document.getElementById('searchTimeInfo');

  resultsCountElement.textContent = resultsCount;

  if (currentSearchQuery) {
    searchStats.classList.add('show');
    searchTimeInfo.textContent = ` · 搜索用时 ${searchDuration}ms`;
  } else {
    searchStats.classList.remove('show');
  }
}

// 高亮搜索结果 - 安全版
function highlightSearchText(text) {
  if (!currentSearchQuery || !text) return escapeHtml(text);

  const searchTitle = document.getElementById('searchTitle').checked;
  const searchDescription = document.getElementById('searchDescription').checked;
  const searchTags = document.getElementById('searchTags').checked;
  const searchCaseSensitive = document.getElementById('searchCaseSensitive').checked;
  const searchUseRegex = document.getElementById('searchUseRegex').checked;

  try {
    if (searchUseRegex) {
      const flags = searchCaseSensitive ? 'g' : 'gi';
      const regex = new RegExp(currentSearchQuery, flags);
      return escapeHtml(text).replace(regex, match => `<span class="search-highlight">${escapeHtml(match)}</span>`);
    } else {
      const searchText = searchCaseSensitive ? currentSearchQuery : currentSearchQuery.toLowerCase();
      const lowerText = searchCaseSensitive ? text : text.toLowerCase();

      let result = '';
      let lastIndex = 0;
      let index = lowerText.indexOf(searchText);

      while (index !== -1) {
        result += escapeHtml(text.substring(lastIndex, index));
        result += `<span class="search-highlight">${escapeHtml(text.substring(index, index + searchText.length))}</span>`;
        lastIndex = index + searchText.length;
        index = lowerText.indexOf(searchText, lastIndex);
      }

      result += escapeHtml(text.substring(lastIndex));
      return result;
    }
  } catch (error) {
    console.error('高亮文本出错:', error);
    return escapeHtml(text);
  }
}

// 智能超时计算函数
function calculateTimeout(fileSize) {
  // 基础超时时间
  let baseTimeout = 15000; // 15秒

  // 根据文件大小动态调整超时时间
  if (fileSize > 1024 * 1024) { // 大于1MB
    return 60000; // 60秒
  } else if (fileSize > 500 * 1024) { // 大于500KB
    return 45000; // 45秒
  } else if (fileSize > 100 * 1024) { // 大于100KB
    return 30000; // 30秒
  } else {
    return baseTimeout;
  }
}

// 兼容性fetch函数
function safeFetch(url, options) {
  options = options || {};

  // 如果原生fetch不可用，使用XMLHttpRequest
  if (typeof fetch === 'undefined') {
    return new Promise(function (resolve, reject) {
      const xhr = new XMLHttpRequest();
      xhr.open(options.method || 'GET', url, true);

      // 设置请求头
      if (options.headers) {
        for (const header in options.headers) {
          if (options.headers.hasOwnProperty(header)) {
            xhr.setRequestHeader(header, options.headers[header]);
          }
        }
      }

      xhr.onreadystatechange = function () {
        if (xhr.readyState === 4) {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve({
              ok: true,
              status: xhr.status,
              text: function () {
                return Promise.resolve(xhr.responseText);
              },
              json: function () {
                try {
                  return Promise.resolve(JSON.parse(xhr.responseText));
                } catch (e) {
                  return Promise.reject(e);
                }
              }
            });
          } else {
            reject(new Error('HTTP错误! 状态: ' + xhr.status));
          }
        }
      };

      xhr.onerror = function () {
        reject(new Error('网络错误'));
      };

      xhr.ontimeout = function () {
        reject(new Error('请求超时'));
      };

      if (options.timeout) {
        xhr.timeout = options.timeout;
      }

      xhr.send(options.body);
    });
  }

  // 使用原生fetch
  return fetch(url, options);
}

async function loadArticles() {
  const articlesList = document.getElementById('articlesList');

  try {
    // 安全地设置加载状态
    const loadingHTML = `
      <div class="loading-articles">
        <div class="loading-spinner"></div>
        <p>正在加载文章列表...</p>
      </div>
    `;
    
    if (window.safeSetInnerHTML) {
      window.safeSetInnerHTML(articlesList, loadingHTML);
    } else {
      articlesList.innerHTML = loadingHTML;
    }

    console.log('正在加载文章配置文件:', ARTICLES_CONFIG_URL);

    // 自动调整超时时间
    const timeout = calculateTimeout(0);

    // 使用安全的fetch
    const response = await safeFetch(ARTICLES_CONFIG_URL, {
      headers: {
        'Accept': 'application/json',
        'Cache-Control': 'no-cache'
      },
      cache: 'no-cache',
      timeout: timeout
    });

    if (!response.ok) {
      throw new Error(`HTTP错误! 状态: ${response.status} - ${response.statusText}`);
    }

    const jsonText = await response.text();
    console.log('原始JSON数据:', jsonText.substring(0, 500) + '...');

    // 处理可能的BOM头
    const cleanJsonText = jsonText.trim().replace(/^\uFEFF/, '');
    let articlesData;

    // 安全的JSON解析
    try {
      articlesData = JSON.parse(cleanJsonText);
    } catch (e) {
      // 尝试修复常见的JSON格式问题
      const fixedJson = cleanJsonText
        .replace(/(['"])?([a-zA-Z0-9_]+)(['"])?:/g, '"$2":') // 修复键名引号
        .replace(/,\s*}/g, '}') // 修复尾部逗号
        .replace(/,\s*]/g, ']'); // 修复数组尾部逗号

      articlesData = JSON.parse(fixedJson);
    }

    allArticles = articlesData.articles || [];

    if (!Array.isArray(allArticles) || allArticles.length === 0) {
      throw new Error('文章数据格式错误或为空');
    }

    // 清理和验证文章数据
    allArticles = cleanArticlesData(allArticles);

    // 应用初始筛选和搜索
    filteredArticles = allArticles;
    performSearch();

    console.log('成功加载', allArticles.length, '篇文章');
    return Promise.resolve();

  } catch (error) {
    console.error('加载文章失败:', error);
    showError('无法加载文章列表', error.message);
    return Promise.reject(error);
  }
}

// 渲染文章列表 - 安全版
function renderArticles() {
  const articlesList = document.getElementById('articlesList');

  if (!filteredArticles || filteredArticles.length === 0) {
    const noResultsHTML = `
      <div class="no-results">
        <i class="fas fa-search"></i>
        <h3>没有找到匹配的文章</h3>
        <p>尝试使用不同的关键词或调整搜索选项</p>
        ${currentSearchQuery ? `<button onclick="document.getElementById('searchInput').value='';performSearch();" class="article-btn" style="margin-top: 1rem;">
          <i class="fas fa-times"></i> 清除搜索
        </button>` : ''}
      </div>
    `;
    
    if (window.safeSetInnerHTML) {
      window.safeSetInnerHTML(articlesList, noResultsHTML);
    } else {
      articlesList.innerHTML = noResultsHTML;
    }
    return;
  }

  // 清空列表
  articlesList.innerHTML = '';

  // 分批渲染文章卡片，避免阻塞UI
  function renderArticlesBatch(startIndex, batchSize) {
    const endIndex = Math.min(startIndex + batchSize, filteredArticles.length);

    for (let i = startIndex; i < endIndex; i++) {
      const article = filteredArticles[i];
      const articleElement = createArticleCard(article);
      articlesList.appendChild(articleElement);
    }

    // 如果还有更多文章，继续分批渲染
    if (endIndex < filteredArticles.length) {
      setTimeout(function () {
        renderArticlesBatch(endIndex, batchSize);
      }, 50);
    } else {
      // 所有文章渲染完成
      updateStats();
      initFilter();
      console.log('渲染完成，共', filteredArticles.length, '篇文章');
    }
  }

  // 开始分批渲染
  renderArticlesBatch(0, 5); // 每批渲染5篇文章
}

// 排序文章
function sortArticles(articles, sortBy) {
  const sorted = [...articles];

  switch (sortBy) {
    case 'title':
      sorted.sort((a, b) => {
        const titleA = a.title || '';
        const titleB = b.title || '';
        return titleA.localeCompare(titleB, 'zh-CN');
      });
      break;

    case 'date':
    default:
      // 尝试按日期排序，如果不能解析日期，则保持原顺序
      sorted.sort((a, b) => {
        try {
          const dateA = parseDate(a.date);
          const dateB = parseDate(b.date);
          return dateB - dateA; // 降序，最新的在前面
        } catch (e) {
          return 0;
        }
      });
      break;
  }

  return sorted;
}

// 解析日期字符串
function parseDate(dateStr) {
  if (!dateStr) return new Date(0);

  // 尝试多种日期格式
  const formats = [
    'YYYY-MM-DD',
    'YYYY/MM/DD',
    'MM-DD-YYYY',
    'MM/DD/YYYY'
  ];

  for (const format of formats) {
    const parts = dateStr.split(/[-/]/);
    if (parts.length === 3) {
      let year, month, day;

      if (format === 'YYYY-MM-DD' || format === 'YYYY/MM/DD') {
        year = parseInt(parts[0]);
        month = parseInt(parts[1]) - 1;
        day = parseInt(parts[2]);
      } else {
        month = parseInt(parts[0]) - 1;
        day = parseInt(parts[1]);
        year = parseInt(parts[2]);
      }

      if (!isNaN(year) && !isNaN(month) && !isNaN(day)) {
        return new Date(year, month, day);
      }
    }
  }

  // 如果无法解析，返回一个很旧的日期
  return new Date(0);
}

// 清理和验证文章数据
function cleanArticlesData(articles) {
  return articles.map(article => {
    const cleaned = {};

    // 确保所有字段都是字符串并转义
    cleaned.title = escapeHtml(String(article.title || '无标题'));
    cleaned.date = escapeHtml(String(article.date || '未知日期'));
    cleaned.readTime = escapeHtml(String(article.readTime || '未知'));
    cleaned.description = escapeHtml(String(article.description || '暂无描述'));
    cleaned.file = escapeHtml(String(article.file || ''));

    // 添加字数统计
    if (article.wordCount !== undefined) {
      cleaned.wordCount = parseInt(article.wordCount) || 0;
    } else if (article.words !== undefined) {
      cleaned.wordCount = parseInt(article.words) || 0;
    } else {
      cleaned.wordCount = Math.max(
        cleaned.description.length * 3,
        800
      );
    }

    // 处理tags - 转义每个标签
    if (Array.isArray(article.tags)) {
      cleaned.tags = article.tags.map(tag => escapeHtml(String(tag)));
    } else if (typeof article.tags === 'string') {
      cleaned.tags = article.tags.split(',').map(tag => escapeHtml(tag.trim())).filter(tag => tag);
    } else {
      cleaned.tags = [];
    }

    // 安全检查和清理
    if (cleaned.description === '[object Object]') {
      cleaned.description = '暂无描述';
    }

    if (cleaned.description && cleaned.description.includes('[project]')) {
      cleaned.description = cleaned.description.replace(/\[project\]\s*:\s*project/g, '项目说明');
    }

    return cleaned;
  });
}

function showError(title, message) {
  const articlesList = document.getElementById('articlesList');

  const errorHTML = `
    <div class="error-message">
      <i class="fas fa-exclamation-triangle"></i>
      <h3>${escapeHtml(title)}</h3>
      <p>${escapeHtml(message)}</p>
      <p style="font-size: 0.85rem; margin-top: 1rem;">请检查文件路径是否正确，并确保 <code>articles.json</code> 文件存在。</p>
      <button onclick="loadArticles()" class="article-btn" style="margin-top: 1rem;">
        <i class="fas fa-redo"></i> 重试加载
      </button>
    </div>
  `;

  if (window.safeSetInnerHTML) {
    window.safeSetInnerHTML(articlesList, errorHTML);
  } else {
    articlesList.innerHTML = errorHTML;
  }

  document.getElementById('statsSection').innerHTML = '';
}

function createArticleCard(article) {
  const articleCard = document.createElement('div');
  articleCard.className = `article-card ${currentView === 'list' ? 'list-view' : ''}`;

  // 确保tags是字符串数组
  const tagsArray = Array.isArray(article.tags) ? article.tags :
    (typeof article.tags === 'string' ?
      article.tags.split(',').map(tag => tag.trim()).filter(tag => tag) : []);

  articleCard.dataset.tags = tagsArray.join(' ');
  articleCard.dataset.file = article.file; // 新增：存储文件路径

  const tagsHtml = tagsArray.map(tag =>
    `<span class="article-tag tag-${tag.toLowerCase()}">${tag}</span>`
  ).join('');

  const safeFile = article.file || '';
  const safeTitle = article.title || '无标题';
  const safeDescription = article.description || '暂无描述';

  const finalDescription = typeof safeDescription === 'object' ? '暂无描述' : safeDescription;

  // 高亮搜索结果
  let highlightedTitle = safeTitle;
  let highlightedDescription = finalDescription;

  if (currentSearchQuery) {
    highlightedTitle = highlightSearchText(safeTitle);
    highlightedDescription = highlightSearchText(finalDescription);
  } else {
    highlightedTitle = escapeHtml(highlightedTitle);
    highlightedDescription = escapeHtml(highlightedDescription);
  }

  // 格式化字数显示
  const wordCount = article.wordCount || 0;
  const wordCountFormatted = formatWordCount(wordCount);

  // 构建卡片HTML
  const cardHTML = `
    <div class="article-header">
      <h4 class="article-title">${highlightedTitle}</h4>
      <div class="article-meta">
        <span class="article-date"><i class="far fa-calendar"></i> ${escapeHtml(article.date || '未知日期')}</span>
        <span class="article-read-time"><i class="far fa-clock"></i> ${escapeHtml(article.readTime || '未知')}</span>
        <span class="article-word-count"><i class="fas fa-file-word"></i> ${escapeHtml(wordCountFormatted)}</span>
      </div>
    </div>
    <p class="article-description">${highlightedDescription}</p>
    <div class="article-footer">
      <div class="article-tags">
        ${tagsHtml}
      </div>
      <div class="article-actions">
        <button class="article-btn read-btn">
          <i class="fas fa-book-open"></i> 阅读
        </button>
        <button class="article-btn share-btn" title="分享文章">
          <i class="fas fa-share-alt"></i>
        </button>
        <button class="article-btn download-btn">
          <i class="fas fa-download"></i> 下载
        </button>
      </div>
    </div>
  `;

  // 安全地设置innerHTML
  if (window.safeSetInnerHTML) {
    window.safeSetInnerHTML(articleCard, cardHTML);
  } else {
    articleCard.innerHTML = cardHTML;
  }

  // 使用事件委托添加点击事件
  const readBtn = articleCard.querySelector('.read-btn');
  const downloadBtn = articleCard.querySelector('.download-btn');
  const shareBtn = articleCard.querySelector('.share-btn'); // 新增：分享按钮

  readBtn.addEventListener('click', () => {
    openArticle(safeFile, safeTitle, article);
  });

  downloadBtn.addEventListener('click', () => {
    downloadArticle(safeFile);
  });

  // 新增：分享按钮事件
  shareBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    shareArticle(article);
  });

  // 新增：点击卡片任意位置（除按钮外）也可以查看文章
  articleCard.addEventListener('click', (e) => {
    if (!e.target.closest('.article-actions')) {
      openArticle(safeFile, safeTitle, article);
    }
  });

  return articleCard;
}

// 新增：分享文章功能 - 安全版
function shareArticle(article) {
  // 生成分享链接
  const currentUrl = window.location.origin + window.location.pathname;
  const shareUrl = `${currentUrl}?article=${encodeURIComponent(article.file)}`;
  
  // 创建分享对话框
  const shareDialog = document.createElement('div');
  shareDialog.className = 'share-dialog';
  
  // 安全地构建对话框内容
  const dialogContent = `
    <div class="share-dialog-content">
      <h3><i class="fas fa-share-alt"></i> 分享文章</h3>
      <p>分享链接给其他人，点击链接即可直接打开这篇文章</p>
      
      <div class="share-url-container">
        <input type="text" readonly value="${escapeHtml(shareUrl)}" class="share-url-input" id="shareUrlInput">
        <button class="copy-url-btn" id="copyUrlBtn">
          <i class="far fa-copy"></i> 复制
        </button>
      </div>
      
      <div class="share-actions">
        <button class="share-action-btn" id="shareWhatsapp" title="分享到WhatsApp">
          <i class="fab fa-whatsapp"></i>
        </button>
        <button class="share-action-btn" id="shareTelegram" title="分享到Telegram">
          <i class="fab fa-telegram"></i>
        </button>
        <button class="share-action-btn" id="shareTwitter" title="分享到Twitter">
          <i class="fab fa-twitter"></i>
        </button>
        <button class="share-action-btn" id="shareEmail" title="通过邮件分享">
          <i class="fas fa-envelope"></i>
        </button>
      </div>
      
      <div class="share-dialog-footer">
        <button class="share-close-btn" id="shareCloseBtn">关闭</button>
      </div>
    </div>
  `;
  
  if (window.safeSetInnerHTML) {
    window.safeSetInnerHTML(shareDialog, dialogContent);
  } else {
    shareDialog.innerHTML = dialogContent;
  }
  
  document.body.appendChild(shareDialog);
  
  // 显示动画
  setTimeout(() => {
    shareDialog.classList.add('show');
  }, 10);
  
  // 事件处理
  const copyUrlBtn = document.getElementById('copyUrlBtn');
  const shareUrlInput = document.getElementById('shareUrlInput');
  const shareCloseBtn = document.getElementById('shareCloseBtn');
  
  // 复制链接
  copyUrlBtn.addEventListener('click', () => {
    shareUrlInput.select();
    shareUrlInput.setSelectionRange(0, 99999);
    
    if (navigator.clipboard) {
      navigator.clipboard.writeText(shareUrl).then(() => {
        copyUrlBtn.innerHTML = '<i class="fas fa-check"></i> 已复制';
        copyUrlBtn.classList.add('success');
        setTimeout(() => {
          copyUrlBtn.innerHTML = '<i class="far fa-copy"></i> 复制';
          copyUrlBtn.classList.remove('success');
        }, 2000);
      });
    } else {
      document.execCommand('copy');
      copyUrlBtn.innerHTML = '<i class="fas fa-check"></i> 已复制';
      copyUrlBtn.classList.add('success');
      setTimeout(() => {
        copyUrlBtn.innerHTML = '<i class="far fa-copy"></i> 复制';
        copyUrlBtn.classList.remove('success');
      }, 2000);
    }
  });
  
  // 社交媒体分享
  const shareText = encodeURIComponent(`查看文章: ${article.title}`);
  
  document.getElementById('shareWhatsapp').addEventListener('click', () => {
    window.open(`https://wa.me/?text=${shareText}%20${shareUrl}`, '_blank');
  });
  
  document.getElementById('shareTelegram').addEventListener('click', () => {
    window.open(`https://t.me/share/url?url=${shareUrl}&text=${shareText}`, '_blank');
  });
  
  document.getElementById('shareTwitter').addEventListener('click', () => {
    window.open(`https://twitter.com/intent/tweet?text=${shareText}&url=${shareUrl}`, '_blank');
  });
  
  document.getElementById('shareEmail').addEventListener('click', () => {
    window.open(`mailto:?subject=${encodeURIComponent(article.title)}&body=${shareText}%20${shareUrl}`);
  });
  
  // 关闭对话框
  shareCloseBtn.addEventListener('click', () => {
    shareDialog.classList.remove('show');
    setTimeout(() => {
      if (shareDialog.parentNode) {
        shareDialog.remove();
      }
    }, 300);
  });
  
  // 点击外部关闭
  shareDialog.addEventListener('click', (e) => {
    if (e.target === shareDialog) {
      shareDialog.classList.remove('show');
      setTimeout(() => {
        if (shareDialog.parentNode) {
          shareDialog.remove();
        }
      }, 300);
    }
  });
  
  // ESC键关闭
  document.addEventListener('keydown', function closeOnEsc(e) {
    if (e.key === 'Escape') {
      shareDialog.classList.remove('show');
      setTimeout(() => {
        if (shareDialog.parentNode) {
          shareDialog.remove();
        }
      }, 300);
      document.removeEventListener('keydown', closeOnEsc);
    }
  });
}

function initFilter() {
  const filterButtons = document.querySelectorAll('.filter-btn');
  const articlesList = document.getElementById('articlesList');

  filterButtons.forEach(button => {
    // 使用兼容性事件绑定
    if (button.addEventListener) {
      button.addEventListener('click', filterHandler);
    } else if (button.attachEvent) { // 兼容IE8及以下
      button.attachEvent('onclick', filterHandler);
    }
  });

  function filterHandler() {
    filterButtons.forEach(btn => btn.classList.remove('active'));
    this.classList.add('active');

    currentFilter = this.dataset.filter || this.getAttribute('data-filter');
    performSearch();

    articlesList.style.opacity = '0.5';
    setTimeout(() => {
      articlesList.style.opacity = '1';
    }, 300);
  }
}

function updateStats() {
  const statsSection = document.getElementById('statsSection');

  if (!allArticles || allArticles.length === 0) {
    statsSection.innerHTML = '';
    return;
  }

  // 计算各类别文章数量
  const webArticles = allArticles.filter(a => a.tags && a.tags.some(tag =>
    tag.toLowerCase().includes('web') || tag.toLowerCase() === 'web'
  )).length;

  const luaArticles = allArticles.filter(a => a.tags && a.tags.some(tag =>
    tag.toLowerCase().includes('lua') || tag.toLowerCase() === 'lua'
  )).length;

  const pythonArticles = allArticles.filter(a => a.tags && a.tags.some(tag =>
    tag.toLowerCase().includes('python') || tag.toLowerCase() === 'python'
  )).length;

  const tutorialArticles = allArticles.filter(a => a.tags && a.tags.some(tag =>
    tag.toLowerCase().includes('tutorial') || tag.toLowerCase() === 'tutorial'
  )).length;

  const noteArticles = allArticles.filter(a => a.tags && a.tags.some(tag =>
    tag.toLowerCase().includes('note') || tag.toLowerCase() === 'note'
  )).length;

  const projectArticles = allArticles.filter(a => a.tags && a.tags.some(tag =>
    tag.toLowerCase().includes('project') || tag.toLowerCase() === 'project'
  )).length;

  const documentArticles = allArticles.filter(a => a.tags && a.tags.some(tag =>
    tag.toLowerCase().includes('document') || tag.toLowerCase() === 'document'
  )).length;

  // 计算总文章数和总字数
  const totalArticles = allArticles.length;
  let totalWords = 0;
  let validWordCountArticles = 0;

  allArticles.forEach(article => {
    if (article.wordCount && article.wordCount > 0) {
      totalWords += article.wordCount;
      validWordCountArticles++;
    }
  });

  if (totalWords === 0) {
    totalWords = allArticles.length * 800;
  }

  // 创建统计
  const totalDays = Math.max(totalArticles * 3, 30);
  const months = Math.floor(totalDays / 30);

  const wordsDisplay = formatWordCount(totalWords);

  // 统计文档类型
  const docTypeStats = {};
  allArticles.forEach(article => {
    if (article.tags && Array.isArray(article.tags)) {
      article.tags.forEach(tag => {
        const lowerTag = tag.toLowerCase();
        const docTypes = ['project', 'document', 'api', 'guide', 'tutorial', 'note', 'web', 'python', 'lua'];
        const matchedType = docTypes.find(type => lowerTag.includes(type) || lowerTag === type);

        if (matchedType) {
          docTypeStats[matchedType] = (docTypeStats[matchedType] || 0) + 1;
        }
      });
    }
  });

  let docTypeBadgesHtml = '';
  if (Object.keys(docTypeStats).length > 0) {
    const docTypeNames = {
      'project': '项目',
      'document': '文档',
      'api': 'API',
      'guide': '指南',
      'tutorial': '教程',
      'note': '笔记',
      'web': 'Web',
      'python': 'Python',
      'lua': 'Lua'
    };

    const sortedTypes = Object.entries(docTypeStats)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6);

    docTypeBadgesHtml = `
      <div class="stats-doc-types">
        <h4><i class="fas fa-tags"></i> 热门标签</h4>
        <div class="doc-type-badges">
          ${sortedTypes.map(([type, count]) => `
            <span class="doc-type-badge">
              <span class="badge-count">${count}</span>
              ${escapeHtml(docTypeNames[type] || type)}
            </span>
          `).join('')}
        </div>
      </div>
    `;
  }

  const avgWordsPerArticle = Math.round(totalWords / Math.max(totalArticles, 1));
  const maxWordsArticle = allArticles.reduce((max, article) =>
    Math.max(max, article.wordCount || 0), 0);

  const statsHTML = `
    <div class="stats-card">
      <h4><i class="fas fa-chart-bar"></i> 文章统计</h4>
      <div class="stats-grid">
        <div class="stat-item">
          <span class="stat-number">${totalArticles}</span>
          <span class="stat-label">总文章数</span>
        </div>
        <div class="stat-item">
          <span class="stat-number">${escapeHtml(wordsDisplay)}</span>
          <span class="stat-label">总字数</span>
        </div>
        <div class="stat-item">
          <span class="stat-number">${formatNumber(avgWordsPerArticle)}</span>
          <span class="stat-label">平均字数</span>
        </div>
        <div class="stat-item">
          <span class="stat-number">${webArticles}</span>
          <span class="stat-label">Web开发</span>
        </div>
        <div class="stat-item">
          <span class="stat-number">${luaArticles}</span>
          <span class="stat-label">Lua开发</span>
        </div>
        <div class="stat-item">
          <span class="stat-number">${pythonArticles}</span>
          <span class="stat-label">Python</span>
        </div>
        <div class="stat-item">
          <span class="stat-number">${tutorialArticles}</span>
          <span class="stat-label">教程</span>
        </div>
        <div class="stat-item">
          <span class="stat-number">${noteArticles}</span>
          <span class="stat-label">笔记</span>
        </div>
        <div class="stat-item">
          <span class="stat-number">${projectArticles}</span>
          <span class="stat-label">项目</span>
        </div>
        <div class="stat-item">
          <span class="stat-number">${documentArticles}</span>
          <span class="stat-label">文档</span>
        </div>
        <div class="stat-item">
          <span class="stat-number">${months}</span>
          <span class="stat-label">持续${months}个月</span>
        </div>
        <div class="stat-item">
          <span class="stat-number">${formatNumber(maxWordsArticle)}</span>
          <span class="stat-label">最长文章</span>
        </div>
      </div>
      <div class="word-count-details">
        <p style="font-size: 0.85rem; color: var(--text-secondary); margin-top: 0.8rem;">
          <i class="fas fa-info-circle"></i> 
          统计了 ${validWordCountArticles}/${totalArticles} 篇文章的实际字数
        </p>
      </div>
      ${docTypeBadgesHtml}
    </div>
  `;

  if (window.safeSetInnerHTML) {
    window.safeSetInnerHTML(statsSection, statsHTML);
  } else {
    statsSection.innerHTML = statsHTML;
  }
}

function formatWordCount(wordCount) {
  if (wordCount >= 10000) {
    return `${(wordCount / 10000).toFixed(1)}万`;
  } else if (wordCount >= 1000) {
    return `${(wordCount / 1000).toFixed(1)}千`;
  } else {
    return formatNumber(wordCount);
  }
}

function formatNumber(num) {
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function initMarkdownViewer() {
  const backBtn = document.getElementById('backBtn');
  const toggleSidebarBtn = document.getElementById('toggleSidebarBtn');
  const copyBtn = document.getElementById('copyBtn');
  const themeToggleBtn = document.getElementById('themeToggleBtn');
  const codeThemeSelect = document.getElementById('codeThemeSelect');
  const markdownViewer = document.getElementById('markdownViewer');
  const markdownSidebar = document.getElementById('markdownSidebar');
  const sidebarOverlay = document.getElementById('sidebarOverlay');

  // 兼容性事件绑定
  function addEvent(element, event, handler) {
    if (element.addEventListener) {
      element.addEventListener(event, handler);
    } else if (element.attachEvent) {
      element.attachEvent('on' + event, handler);
    }
  }

  addEvent(backBtn, 'click', function () {
    markdownViewer.style.display = 'none';
    resetArticleInfo();
  });

  addEvent(toggleSidebarBtn, 'click', function () {
    markdownSidebar.classList.toggle('hidden');
  });

  if (sidebarOverlay) {
    addEvent(sidebarOverlay, 'click', function () {
      markdownSidebar.classList.add('hidden');
    });
  }

  // 移动端优化
  if (window.innerWidth <= 768) {
    const markdownContent = document.getElementById('markdownContent');
    if (markdownContent) {
      addEvent(markdownContent, 'click', function (e) {
        if (!markdownSidebar.classList.contains('hidden')) {
          markdownSidebar.classList.add('hidden');
        }
      });
    }
  }

  addEvent(copyBtn, 'click', function () {
    const content = document.getElementById('markdownContent').innerText;
    if (!content || content.trim() === '') {
      showCopyStatus('内容为空，无法复制', false);
      return;
    }

    // 兼容性复制
    if (navigator.clipboard) {
      navigator.clipboard.writeText(content).then(() => {
        showCopyStatus('已复制到剪贴板', true);
      }).catch(err => {
        console.error('复制失败:', err);
        fallbackCopyToClipboard(content, copyBtn);
      });
    } else {
      fallbackCopyToClipboard(content, copyBtn);
    }
  });

  addEvent(codeThemeSelect, 'change', function (e) {
    const theme = e.target.value;
    changeCodeTheme(theme);
    localStorage.setItem('codeTheme', theme);
  });

  const savedTheme = localStorage.getItem('codeTheme') || 'github-dark';
  codeThemeSelect.value = savedTheme;
  changeCodeTheme(savedTheme);

  addEvent(themeToggleBtn, 'click', function () {
    markdownSidebar.classList.remove('hidden');
  });

  // 窗口大小变化监听
  addEvent(window, 'resize', function () {
    if (window.innerWidth > 768) {
      markdownSidebar.classList.remove('hidden');
    }
  });
}

function resetArticleInfo() {
  document.getElementById('articleReadTime').textContent = '--';
  document.getElementById('articleFileSize').textContent = '--';

  currentArticleStats = null;
}

function updateArticleInfo(stats) {
  const articleReadTime = document.getElementById('articleReadTime');
  const articleFileSize = document.getElementById('articleFileSize');

  articleReadTime.textContent = stats.readTime;
  articleFileSize.textContent = stats.fileSize;
}

function showCopyStatus(message, success) {
  const copyBtn = document.getElementById('copyBtn');
  const originalHTML = copyBtn.innerHTML;

  if (success) {
    copyBtn.innerHTML = '<i class="fas fa-check"></i> <span>已复制</span>';
    copyBtn.className = 'action-btn success';
  } else {
    copyBtn.innerHTML = '<i class="fas fa-times"></i> <span>失败</span>';
    copyBtn.className = 'action-btn error';
  }

  setTimeout(() => {
    copyBtn.innerHTML = originalHTML;
    copyBtn.className = 'action-btn';
  }, 2000);
}

// 兼容性复制函数
function fallbackCopyToClipboard(text, button) {
  try {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();

    const successful = document.execCommand('copy');
    document.body.removeChild(textArea);

    if (successful) {
      showCopyStatus('已复制到剪贴板', true);
    } else {
      showCopyStatus('复制失败，请手动复制', false);
    }
  } catch (err) {
    console.error('备用复制方法失败:', err);
    showCopyStatus('复制失败，请手动复制', false);
  }
}

function changeCodeTheme(theme) {
  const links = document.querySelectorAll('link[href*="highlight.js"]');
  if (links.length > 0) {
    const newTheme = theme === 'github' ? 'github.min.css' : `${theme}.min.css`;
    links[0].href = `https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.8.0/styles/${newTheme}`;
  }
}

async function openArticle(filename, title, articleInfo = null) {
  const markdownViewer = document.getElementById('markdownViewer');
  const markdownTitle = document.getElementById('markdownTitle');
  const markdownContent = document.getElementById('markdownContent');

  if (!filename) {
    console.error('文件名无效:', filename);
    const errorHTML = `
      <div class="error-message">
        <i class="fas fa-exclamation-triangle"></i>
        <h3>文件错误</h3>
        <p>文章文件名为空或无效。</p>
      </div>
    `;
    
    if (window.safeSetInnerHTML) {
      window.safeSetInnerHTML(markdownContent, errorHTML);
    } else {
      markdownContent.innerHTML = errorHTML;
    }
    return;
  }

  const loadStartTime = Date.now();

  // 更新文章信息面板
  currentArticleStats = {
    fileName: filename,
    originalArticle: articleInfo,
    wordCount: articleInfo?.wordCount || 0,
    loadStartTime: loadStartTime,
    loadSuccess: false
  };

  // 设置加载状态
  const loadingHTML = '<div style="text-align: center; padding: 3rem;"><div class="loading-spinner"></div><p style="margin-top: 1rem;">加载文章中...</p></div>';
  if (window.safeSetInnerHTML) {
    window.safeSetInnerHTML(markdownContent, loadingHTML);
  } else {
    markdownContent.innerHTML = loadingHTML;
  }
  
  markdownViewer.style.display = 'flex';
  markdownTitle.textContent = title || '文章阅读';

  // 移动端默认隐藏侧边栏
  if (window.innerWidth <= 768) {
    document.getElementById('markdownSidebar').classList.add('hidden');
  }

  try {
    // 先获取文件大小以动态调整超时时间
    const headResponse = await safeFetch(`${ARTICLES_BASE_URL}${filename}`, {method: 'HEAD'});
    const fileSize = headResponse.headers ? (headResponse.headers.get('content-length') || 0) : 0;
    const timeout = calculateTimeout(fileSize);

    // 加载文章内容
    const response = await safeFetch(`${ARTICLES_BASE_URL}${filename}`, {
      timeout: timeout
    });

    if (!response.ok) {
      throw new Error(`HTTP错误! 状态: ${response.status}`);
    }

    const markdown = await response.text();
    const loadTime = Date.now() - loadStartTime;

    console.log('加载Markdown成功，长度:', markdown.length);

    // 更新文章统计信息
    const actualFileSize = markdown.length;
    const wordCount = countWords(markdown);
    const readTime = calculateReadTime(wordCount);

    currentArticleStats = {
      ...currentArticleStats,
      wordCount: wordCount,
      loadTime: loadTime,
      readTime: readTime,
      fileSize: formatFileSize(actualFileSize),
      loadSuccess: true
    };

    updateArticleInfo(currentArticleStats);

    // 使用rendermd.js中的renderMarkdown函数
    let renderedHtml = '';
    if (window.renderMarkdown) {
      renderedHtml = window.renderMarkdown(markdown);
    } else {
      renderedHtml = renderSimpleMarkdown(markdown);
    }

    // 安全地设置内容
    if (window.safeSetInnerHTML) {
      window.safeSetInnerHTML(markdownContent, renderedHtml);
    } else {
      markdownContent.innerHTML = renderedHtml;
    }

    // 为代码块添加事件监听器
    initializeCodeCopyButtons();

    generateTOC();
    if (window.hljs) {
      try {
        hljs.highlightAll();
      } catch (e) {
        console.warn('代码高亮失败:', e);
      }
    }

    // 移动端：优化阅读体验
    if (window.innerWidth <= 768) {
      optimizeMobileReading();
    }

  } catch (error) {
    console.error('加载Markdown失败:', error);

    currentArticleStats = {
      ...currentArticleStats,
      loadSuccess: false,
      loadTime: Date.now() - loadStartTime
    };

    updateArticleInfo(currentArticleStats);

    // 安全地处理文件名中的引号
    const safeFilename = filename.replace(/'/g, "\\'").replace(/"/g, '&quot;');
    const safeTitle = title ? title.replace(/'/g, "\\'").replace(/"/g, '&quot;') : '';
    const safeArticleInfo = articleInfo ? JSON.stringify(articleInfo).replace(/"/g, '&quot;') : 'null';

    const errorHTML = `
      <div class="error-message">
        <i class="fas fa-exclamation-triangle"></i>
        <h3>加载失败</h3>
        <p>无法加载文章内容: ${escapeHtml(error.message)}</p>
        <p>文件路径: ${escapeHtml(ARTICLES_BASE_URL + filename)}</p>
        <p>已用时: ${currentArticleStats.loadTime}ms</p>
        <div style="margin-top: 1rem; display: flex; gap: 0.5rem; justify-content: center;">
          <button onclick="openArticle('${safeFilename}', '${safeTitle}', ${safeArticleInfo})" class="action-btn">
            <i class="fas fa-redo"></i> 重试
          </button>
          <button onclick="downloadArticle('${safeFilename}')" class="action-btn">
            <i class="fas fa-download"></i> 下载原始文件
          </button>
        </div>
      </div>
    `;

    if (window.safeSetInnerHTML) {
      window.safeSetInnerHTML(markdownContent, errorHTML);
    } else {
      markdownContent.innerHTML = errorHTML;
    }
  }
}

function countWords(text) {
  if (!text) return 0;
  // 移除代码块和HTML标签
  const cleanText = text.replace(/```[\s\S]*?```/g, '')
    .replace(/`[^`]+`/g, '')
    .replace(/<[^>]*>/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  // 中文字符按字计数，英文单词按空格分隔计数
  const chineseChars = cleanText.match(/[\u4e00-\u9fa5]/g) || [];
  const englishWords = cleanText.replace(/[\u4e00-\u9fa5]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 0);

  return chineseChars.length + englishWords.length;
}

function calculateReadTime(wordCount) {
  const wordsPerMinute = 300; // 平均阅读速度
  const minutes = Math.ceil(wordCount / wordsPerMinute);

  if (minutes < 1) return '<1分钟';
  if (minutes < 60) return `${minutes}分钟`;

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (remainingMinutes === 0) return `${hours}小时`;
  return `${hours}小时${remainingMinutes}分钟`;
}

function formatFileSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

// 简单的markdown渲染函数 - 备用方案
function renderSimpleMarkdown(markdown) {
  if (!markdown || typeof markdown !== 'string') {
    return '<p>内容为空</p>';
  }

  let html = markdown;

  // 首先处理代码块
  html = html.replace(/```(\w+)?\n([\s\S]*?)```/g, function (match, lang, code) {
    const languageName = escapeHtml(getLanguageName(lang));
    const escapedCode = escapeHtml(code);

    return `
      <div class="code-block-wrapper">
        <div class="code-block-header">
          <span class="code-language">${languageName}</span>
          <button class="copy-code-btn">
            <i class="far fa-copy"></i><span>复制</span>
          </button>
        </div>
        <pre><code class="${escapeHtml(lang || '')}">${escapedCode}</code></pre>
      </div>
    `;
  });

  // 转换标题
  html = html
    .replace(/^# (.*$)/gm, '<h1>$1</h1>')
    .replace(/^## (.*$)/gm, '<h2>$2</h2>')
    .replace(/^### (.*$)/gm, '<h3>$3</h3>')
    .replace(/^#### (.*$)/gm, '<h4>$4</h4>')
    .replace(/^##### (.*$)/gm, '<h5>$5</h5>')
    .replace(/^###### (.*$)/gm, '<h6>$6</h6>')
    // 转换加粗
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/__(.*?)__/g, '<strong>$1</strong>')
    // 转换斜体
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/_(.*?)_/g, '<em>$1</em>')
    // 转换行内代码
    .replace(/`([^`]+)`/g, function (match, code) {
      if (code.length > 10) {
        return `
          <span class="code-inline-wrapper">
            <code>${escapeHtml(code)}</code>
            <button class="inline-copy-btn">
              <i class="far fa-copy"></i>
            </button>
          </span>
        `;
      }
      return `<code>${escapeHtml(code)}</code>`;
    })
    // 转换链接
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, function (match, text, href) {
      const escapedText = escapeHtml(text);
      const escapedHref = escapeHtml(href);
      if (href.startsWith('http://') || href.startsWith('https://')) {
        return `<a href="${escapedHref}" target="_blank" rel="noopener noreferrer">${escapedText}</a>`;
      }
      return `<a href="${escapedHref}">${escapedText}</a>`;
    })
    // 转换图片
    .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, function (match, alt, src) {
      const escapedAlt = escapeHtml(alt);
      const escapedSrc = escapeHtml(src);
      return `<img src="${escapedSrc}" alt="${escapedAlt}" style="max-width: 100%; height: auto;">`;
    })
    // 转换列表
    .replace(/^\s*\*\s+(.*$)/gm, '<li>$1</li>')
    .replace(/^\s*-\s+(.*$)/gm, '<li>$1</li>')
    .replace(/^\s*\+\s+(.*$)/gm, '<li>$1</li>')
    // 转换引用
    .replace(/^>\s*(.*$)/gm, '<blockquote>$1</blockquote>')
    // 转换段落
    .replace(/\n\n+/g, '</p><p>')
    .replace(/^([^<\n].*)/gm, '<p>$1</p>');

  // 处理列表
  html = html.replace(/<li>.*?<\/li>/g, function (match) {
    if (!match.includes('</ul>') && !match.includes('</ol>')) {
      return '<ul>' + match + '</ul>';
    }
    return match;
  });

  // 清理HTML
  return window.safeSanitizeHTML ? window.safeSanitizeHTML(html) : html;
}

// 获取语言名称
function getLanguageName(lang) {
  if (!lang) return '代码';

  const languageMap = {
    'js': 'JavaScript', 'javascript': 'JavaScript',
    'py': 'Python', 'python': 'Python',
    'lua': 'Lua', 'html': 'HTML', 'css': 'CSS',
    'json': 'JSON', 'xml': 'XML', 'bash': 'Bash',
    'sh': 'Shell', 'md': 'Markdown', 'cpp': 'C++',
    'c': 'C', 'java': 'Java', 'php': 'PHP',
    'ruby': 'Ruby', 'go': 'Go', 'rust': 'Rust',
    'ts': 'TypeScript', 'typescript': 'TypeScript',
    'sql': 'SQL', 'yaml': 'YAML', 'yml': 'YAML',
    'txt': 'Text', 'plaintext': 'Text'
  };

  return languageMap[lang.toLowerCase()] || lang.charAt(0).toUpperCase() + lang.slice(1);
}

// 初始化代码复制按钮
function initializeCodeCopyButtons() {
  // 为代码块添加事件监听器
  const codeBlocks = document.querySelectorAll('.code-block-wrapper');
  codeBlocks.forEach(wrapper => {
    const copyBtn = wrapper.querySelector('.copy-code-btn');
    if (copyBtn) {
      copyBtn.onclick = null;
      copyBtn.addEventListener('click', function () {
        const codeElement = wrapper.querySelector('code');
        if (codeElement) {
          const text = codeElement.textContent;
          if (navigator.clipboard) {
            navigator.clipboard.writeText(text).then(() => {
              showCopySuccess(this, false);
            }).catch(() => {
              fallbackCopyToClipboard(text, this);
            });
          } else {
            fallbackCopyToClipboard(text, this);
          }
        }
      });
    }
  });

  // 为内联代码添加事件监听器
  const inlineCodeWrappers = document.querySelectorAll('.code-inline-wrapper');
  inlineCodeWrappers.forEach(wrapper => {
    const copyBtn = wrapper.querySelector('.inline-copy-btn');
    if (copyBtn) {
      copyBtn.onclick = null;
      copyBtn.addEventListener('click', function () {
        const codeElement = wrapper.querySelector('code');
        let codeText = '';

        if (codeElement) {
          codeText = codeElement.textContent;
        }

        if (codeText) {
          if (navigator.clipboard) {
            navigator.clipboard.writeText(codeText).then(() => {
              showCopySuccess(this, true);
            }).catch(() => {
              showCopyError(this, true);
            });
          } else {
            showCopyError(this, true);
          }
        } else {
          showCopyError(this, true);
        }
      });
    }
  });
}

// 显示复制成功状态
function showCopySuccess(button, isInline) {
  if (isInline) {
    const originalHTML = button.innerHTML;
    const originalColor = button.style.color;

    button.innerHTML = '<i class="fas fa-check"></i>';
    button.style.color = '#00ff00';

    setTimeout(() => {
      button.innerHTML = originalHTML;
      button.style.color = originalColor || '';
    }, 2000);
  } else {
    const originalHTML = button.innerHTML;
    const originalClass = button.className;

    button.innerHTML = '<i class="fas fa-check"></i><span>已复制</span>';
    button.className = originalClass + ' success';

    setTimeout(() => {
      button.innerHTML = originalHTML;
      button.className = originalClass;
    }, 2000);
  }
}

// 显示复制错误状态
function showCopyError(button, isInline) {
  if (isInline) {
    const originalHTML = button.innerHTML;
    const originalColor = button.style.color;

    button.innerHTML = '<i class="fas fa-times"></i>';
    button.style.color = '#ff0000';

    setTimeout(() => {
      button.innerHTML = originalHTML;
      button.style.color = originalColor || '';
    }, 2000);
  } else {
    const originalHTML = button.innerHTML;
    const originalClass = button.className;

    button.innerHTML = '<i class="fas fa-times"></i><span>失败</span>';
    button.className = originalClass + ' error';

    setTimeout(() => {
      button.innerHTML = originalHTML;
      button.className = originalClass;
    }, 2000);
  }
}

// 移动端阅读优化
function optimizeMobileReading() {
  const content = document.getElementById('markdownContent');

  // 为代码块添加移动端优化
  const codeBlocks = content.querySelectorAll('pre');
  codeBlocks.forEach(block => {
    block.style.overflowX = 'auto';
    block.style.WebkitOverflowScrolling = 'touch';
    block.style.maxWidth = '100%';
  });

  // 为表格添加滚动
  const tables = content.querySelectorAll('table');
  tables.forEach(table => {
    const wrapper = document.createElement('div');
    wrapper.style.overflowX = 'auto';
    wrapper.style.WebkitOverflowScrolling = 'touch';
    wrapper.style.margin = '1rem 0';
    table.parentNode.insertBefore(wrapper, table);
    wrapper.appendChild(table);
  });

  // 调整图片大小
  const images = content.querySelectorAll('img');
  images.forEach(img => {
    img.style.maxWidth = '100%';
    img.style.height = 'auto';
  });
}

function generateTOC() {
  const content = document.getElementById('markdownContent');
  const tocList = document.getElementById('tocList');
  const headings = content.querySelectorAll('h1, h2, h3, h4');

  tocList.innerHTML = '';

  if (headings.length === 0) {
    const noTocHTML = '<li class="toc-item"><span class="toc-link">暂无目录</span></li>';
    if (window.safeSetInnerHTML) {
      window.safeSetInnerHTML(tocList, noTocHTML);
    } else {
      tocList.innerHTML = noTocHTML;
    }
    return;
  }

  headings.forEach((heading, index) => {
    if (!heading.id) {
      heading.id = 'heading-' + index;
    }

    const level = parseInt(heading.tagName.substring(1));
    const listItem = document.createElement('li');
    listItem.className = 'toc-item toc-level-' + level;

    const link = document.createElement('a');
    link.href = '#' + heading.id;
    link.className = 'toc-link';
    link.textContent = heading.textContent;
    link.addEventListener('click', (e) => {
      e.preventDefault();
      try {
        heading.scrollIntoView({behavior: 'smooth'});
      } catch (e) {
        heading.scrollIntoView();
      }

      if (window.innerWidth <= 768) {
        document.getElementById('markdownSidebar').classList.add('hidden');
      }
    });

    listItem.appendChild(link);
    tocList.appendChild(listItem);
  });
}

function downloadArticle(filename) {
  if (!filename) {
    alert('文件名无效，无法下载');
    return;
  }

  const link = document.createElement('a');
  link.href = ARTICLES_BASE_URL + filename;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function initThemeSwitcher() {
  const themeSwitcher = document.getElementById('themeSwitcher');
  const themeIcon = document.getElementById('themeIcon');
  const html = document.documentElement;

  const savedTheme = localStorage.getItem('theme') || 'dark';
  html.setAttribute('data-theme', savedTheme);
  updateThemeIcon(savedTheme);

  // 兼容性事件绑定
  if (themeSwitcher.addEventListener) {
    themeSwitcher.addEventListener('click', toggleTheme);
  } else if (themeSwitcher.attachEvent) {
    themeSwitcher.attachEvent('onclick', toggleTheme);
  }

  function toggleTheme() {
    const currentTheme = html.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';

    html.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    updateThemeIcon(newTheme);

    themeSwitcher.style.transform = 'scale(0.9)';
    setTimeout(() => {
      themeSwitcher.style.transform = '';
    }, 200);
  }

  function updateThemeIcon(theme) {
    if (theme === 'dark') {
      themeIcon.className = 'fas fa-moon';
    } else {
      themeIcon.className = 'fas fa-sun';
    }
  }
}

function initBackgroundToggle() {
  const bgToggle = document.getElementById('bgToggle');
  const bgContainer = document.getElementById('bgContainer');

  const bgVisible = localStorage.getItem('bgVisible') !== 'false';
  updateBackgroundVisibility(bgVisible);

  // 兼容性事件绑定
  function addBgToggleEvent() {
    if (bgToggle.addEventListener) {
      bgToggle.addEventListener('click', toggleBackground);
    } else if (bgToggle.attachEvent) {
      bgToggle.attachEvent('onclick', toggleBackground);
    }
  }

  addBgToggleEvent();

  function toggleBackground() {
    const isVisible = bgContainer.style.opacity !== '0';
    updateBackgroundVisibility(!isVisible);
    localStorage.setItem('bgVisible', !isVisible);

    const icon = bgToggle.querySelector('i');
    if (!isVisible) {
      icon.className = 'fas fa-eye';
      bgToggle.title = '隐藏背景';
    } else {
      icon.className = 'fas fa-eye-slash';
      bgToggle.title = '显示背景';
    }
  }

  function updateBackgroundVisibility(visible) {
    if (visible) {
      bgContainer.style.opacity = '1';
      bgToggle.title = '隐藏背景';
      bgToggle.querySelector('i').className = 'fas fa-eye';
    } else {
      bgContainer.style.opacity = '0';
      bgToggle.title = '显示背景';
      bgToggle.querySelector('i').className = 'fas fa-eye-slash';
    }
  }
}

// 键盘快捷键 - 兼容性处理
function addKeyboardShortcuts() {
  function addKeyEvent(event, handler) {
    if (document.addEventListener) {
      document.addEventListener(event, handler);
    } else if (document.attachEvent) {
      document.attachEvent('on' + event, handler);
    }
  }

  addKeyEvent('keydown', function (e) {
    if (!e) e = window.event;

    // Ctrl/Cmd + F 聚焦搜索框
    if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
      e.preventDefault();
      const searchInput = document.getElementById('searchInput');
      searchInput.focus();
      searchInput.select();
    }

    if (e.altKey && e.key === 't') {
      document.getElementById('themeSwitcher').click();
    }
    if (e.altKey && e.key === 'b') {
      document.getElementById('bgToggle').click();
    }
    if (e.altKey && e.key === 'h') {
      window.location.href = 'index.html';
    }
    if (e.key === 'Escape') {
      const searchInput = document.getElementById('searchInput');
      if (document.activeElement === searchInput && searchInput.value) {
        searchInput.value = '';
        currentSearchQuery = '';
        document.getElementById('searchClear').style.display = 'none';
        performSearch();
      } else {
        const markdownViewer = document.getElementById('markdownViewer');
        if (markdownViewer.style.display === 'flex') {
          document.getElementById('backBtn').click();
        }
      }
    }
    if (e.altKey && e.key === 'r') {
      loadArticles();
    }
  });
}

// HTML转义函数 - 复制自rendermd.js
function escapeHtml(text) {
  if (typeof text !== 'string') {
    text = String(text);
  }
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, function(m) { return map[m]; });
}