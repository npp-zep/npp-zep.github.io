
# 前端搞个文章系统：配置驱动，不用改HTML

有时候就想偷个懒，但又想搞点功能。比如最近在弄这个文章导航页，我想：要是每写一篇新文章都得改HTML，那也太不程序员了吧？咱们写代码不就是为了少干活么！

## 核心思路：数据驱动

前端加载文件系统，其实本质上就是个"数据驱动UI"的问题。我想实现的是：

1. 有个配置文件（比如`articles.json`），里面写好所有文章信息
2. 前端JavaScript读取这个配置
3. 动态生成页面内容
4. 点哪篇文章就加载哪个Markdown文件

这样以后要加新文章，只需要：

- 在assets/passage/文件夹里放个.md文件
- 在articles.json里加条记录
- 完事！不用碰HTML

## 配置文件设计

我用的配置文件长这样：

```json
{
  "articles": [
    {
      "id": 1,
      "title": "Vue3响应式原理",
      "date": "2024-03-15",
      "readTime": "8分钟",
      "description": "从源码角度分析Vue3响应式系统的实现",
      "file": "vue3-reactive.md",
      "tags": ["web", "tutorial"]
    },
    {
      "id": 2,
      "title": "Python异步编程入门",
      "date": "2024-03-14",
      "readTime": "12分钟",
      "description": "从asyncio到async/await的完整指南",
      "file": "python-async.md",
      "tags": ["python", "tutorial"]
    }
  ],
  "lastUpdated": "2024-03-15",
  "totalArticles": 2
}
```

每个字段都有用：

· title：文章标题
· date：发布日期，纯粹为了好看
· readTime：预估阅读时间，让用户有点心理准备
· description：简短描述，吸引点击
· file：对应的Markdown文件名
· tags：标签，用来分类筛选

动态加载的三板斧

1. 先加载配置

```javascript
async function loadArticles() {
  try {
    const response = await fetch('assets/passage/articles.json', {
      cache: 'no-cache'
    });
    const data = await response.json();
    allArticles = data.articles || [];
    
    // 清空现有内容
    articlesList.innerHTML = '';
    
    // 为每篇文章创建卡片
    allArticles.forEach(article => {
      const card = createArticleCard(article);
      articlesList.appendChild(card);
    });
  } catch (error) {
    console.error('加载文章失败:', error);
    showError('加载失败', '可能是配置文件路径不对');
  }
}
```

这里有个小技巧：fetch的cache选项设为'no-cache'，这样开发时修改配置后刷新页面能立即生效。

1. 动态生成UI

创建文章卡片的函数大概长这样：

```javascript
function createArticleCard(article) {
  const card = document.createElement('div');
  card.className = 'article-card';
  
  // 用dataset存标签，方便后面筛选
  card.dataset.tags = article.tags.join(' ');
  
  // 转义特殊字符防止XSS
  const safeTitle = escapeHtml(article.title);
  const safeDescription = escapeHtml(article.description);
  const safeFile = escapeHtml(article.file);
  
  // 生成标签HTML
  const tagsHtml = article.tags.map(tag => 
    `<span class="tag tag-${tag}">${tag}</span>`
  ).join('');
  
  card.innerHTML = `
    <div class="article-header">
      <h4 class="article-title">${safeTitle}</h4>
      <div class="article-meta">
        <span class="article-date">${article.date}</span>
        <span class="article-read-time">${article.readTime}</span>
      </div>
    </div>
    <p class="article-description">${safeDescription}</p>
    <div class="article-footer">
      <div class="article-tags">
        ${tagsHtml}
      </div>
      <button class="article-btn read-btn" onclick="openArticle('${safeFile}')">
        阅读
      </button>
    </div>
  `;
  
  return card;
}
```

1. 按需加载内容

用户点击文章时才去加载对应的Markdown：

```javascript
async function openArticle(filename) {
  try {
    // 显示加载状态
    showLoading();
    
    const response = await fetch(`assets/passage/${filename}`);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    const markdown = await response.text();
    
    // 渲染Markdown到页面
    renderMarkdown(markdown);
    
  } catch (error) {
    console.error('加载文章失败:', error);
    showError('加载失败', `无法加载文章: ${error.message}`);
  }
}
```

几个实用的小功能

标签筛选

既然有了标签数据，不加个筛选功能说不过去：

```javascript
function initFilter() {
  const filterButtons = document.querySelectorAll('.filter-btn');
  
  filterButtons.forEach(button => {
    button.addEventListener('click', function() {
      // 移除其他按钮的active状态
      filterButtons.forEach(btn => btn.classList.remove('active'));
      // 添加当前按钮的active状态
      this.classList.add('active');
      
      const filter = this.dataset.filter;
      const cards = document.querySelectorAll('.article-card');
      
      cards.forEach(card => {
        // 显示所有 或 显示匹配标签的
        if (filter === 'all' || card.dataset.tags.includes(filter)) {
          card.style.display = 'block';
        } else {
          card.style.display = 'none';
        }
      });
    });
  });
}
```

数据统计

顺便还能给用户看看数据：

```javascript
function updateStats() {
  const total = allArticles.length;
  const webCount = allArticles.filter(a => a.tags.includes('web')).length;
  const pythonCount = allArticles.filter(a => a.tags.includes('python')).length;
  const tutorialCount = allArticles.filter(a => a.tags.includes('tutorial')).length;
  
  return `
    <div class="stats">
      <div class="stat-item">
        <span class="stat-number">${total}</span>
        <span class="stat-label">总文章数</span>
      </div>
      <div class="stat-item">
        <span class="stat-number">${webCount}</span>
        <span class="stat-label">Web开发</span>
      </div>
      <div class="stat-item">
        <span class="stat-number">${pythonCount}</span>
        <span class="stat-label">Python</span>
      </div>
      <div class="stat-item">
        <span class="stat-number">${tutorialCount}</span>
        <span class="stat-label">教程</span>
      </div>
    </div>
  `;
}
```

遇到的坑和解决

1. 跨域问题

本地开发时，如果直接打开HTML文件（file://协议），fetch可能会报跨域错误。解决办法是用个本地服务器，比如：

· VS Code的Live Server扩展
· npx serve .
· Python的python -m http.server

1. 路径问题

配置文件路径要写对，我用了相对路径assets/passage/articles.json。如果页面URL有变化（比如在子目录里），路径也得相应调整。

1. 加载顺序

页面一打开就先加载文章列表，但有时候用户可能根本不会往下翻。可以考虑懒加载——等用户滚动到文章区域再加载。

1. 错误处理

网络请求总会出问题的：文件不存在、JSON格式错误、服务器响应慢……每个fetch后面都得跟.catch，还得给用户看得懂的提示。

一些改进想法

现在这个实现还算能用，但有几个地方可以优化：

1. 分页加载：文章多了以后，一次加载所有可能会慢。可以每次只加载10篇，滚到底再加载下一批。
2. 搜索功能：现在只能按标签筛选，加个全文搜索会更实用。
3. 缓存策略：配置文件和文章内容其实不常变，可以合理利用localStorage缓存。
4. 预加载：用户鼠标悬停在文章标题上时，可以悄悄开始加载对应的Markdown，这样点开时就能秒开。
5. 增量更新：如果只是加了篇新文章，没必要重新加载整个配置，可以只请求更新的部分。

最后聊聊

这种配置驱动的前端加载方式，其实在很多地方都能用。不只是文章系统，比如：

· 产品展示页面
· 团队成员介绍
· 项目作品集
· 甚至是个简单的博客系统

好处很明显：内容与展示分离。写内容的人只需要关心Markdown和JSON配置文件，不用懂HTML/CSS/JS。前端开发者也不用每次更新内容都去改代码。

而且这种架构迁移起来也方便。哪天想换前端框架了（比如从原生JS换成Vue/React），只需要重写UI部分，数据结构和加载逻辑基本不用动。

当然，如果内容特别多、更新特别频繁，可能还是需要后端配合。但对于个人项目、小型文档站来说，这种纯前端方案完全够用，还省了服务器钱。

写代码嘛，有时候不用追求"最完美"的方案，能解决实际问题、让自己少干重复活，就是好方案。你说是不是？


