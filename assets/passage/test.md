# Web开发入门指南

> 学习Web开发的基础知识，开启你的编程之旅。

## 什么是Web开发？

Web开发是指创建和维护网站的过程。它涵盖了从简单的静态页面到复杂的Web应用程序的一切。

### 核心技术栈

Web开发主要涉及三个核心技术：

1. **HTML** (超文本标记语言) - 定义网页的结构
2. **CSS** (层叠样式表) - 控制网页的样式和布局
3. **JavaScript** - 实现网页的交互功能

## HTML基础

HTML是网页的骨架。下面是一个基本的HTML结构：

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>我的第一个网页</title>
    <link rel="stylesheet" href="style.css">
</head>
<body>
    <header>
        <h1>欢迎来到我的网站</h1>
        <nav>
            <ul>
                <li><a href="/">首页</a></li>
                <li><a href="/about">关于</a></li>
                <li><a href="/contact">联系</a></li>
            </ul>
        </nav>
    </header>
    
    <main>
        <article>
            <h2>文章标题</h2>
            <p>这是一段示例文本。</p>
        </article>
    </main>
    
    <footer>
        <p>&copy; 2024 我的网站</p>
    </footer>
    
    <script src="script.js"></script>
</body>
</html>
```