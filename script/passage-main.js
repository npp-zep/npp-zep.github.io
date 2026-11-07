/**
 * passage-main.js（S3.16 兼容垫片）
 *
 * 全部逻辑已迁移：
 *   - 通用工具        → script/core/utils.js
 *   - HTML 清理       → script/core/sanitize.js
 *   - Markdown 渲染   → script/render/markdown.js / simple-markdown.js
 *   - 文章数据        → script/articles/data.js
 *   - 搜索            → script/articles/search.js
 *   - 筛选            → script/articles/filter.js
 *   - 卡片渲染        → script/articles/card.js
 *   - 统计            → script/articles/stats.js
 *   - 分享            → script/articles/share.js
 *   - TOC             → script/reader/toc.js
 *   - 代码复制        → script/reader/code-copy.js
 *   - 阅读器          → script/reader/reader.js
 *   - 主题/背景/快捷键 → script/core/theme.js
 *   - 页面入口        → script/app-passage.js
 *
 * 本文件仅用于兼容旧缓存引用，不包含任何业务逻辑。
 */
console.log('passage-main.js 已迁移至 app-passage.js（S3.16 垫片）');