/**
 * Markdown渲染器
 * 使用marked.js进行Markdown解析，highlight.js进行代码高亮
 */

// 确保marked可用
if (typeof marked === 'undefined') {
    console.error('marked.js未加载，请检查CDN链接');
}

// 配置marked.js
if (typeof marked !== 'undefined') {
    marked.setOptions({
        gfm: true,
        breaks: true,
        pedantic: false,
        sanitize: false,
        smartLists: true,
        smartypants: true,
        highlight: function(code, lang) {
            if (typeof hljs === 'undefined') {
                return code;
            }
            
            if (lang && hljs.getLanguage(lang)) {
                try {
                    return hljs.highlight(code, { language: lang }).value;
                } catch (err) {
                    console.error('Error highlighting code:', err);
                }
            }
            
            try {
                return hljs.highlightAuto(code).value;
            } catch (err) {
                console.error('Error auto-highlighting code:', err);
                return code;
            }
        }
    });

    // 自定义渲染器
    const renderer = new marked.Renderer();

    // 自定义标题渲染，添加锚点
    renderer.heading = function(text, level) {
        const escapedText = text.toLowerCase().replace(/[^\w\u4e00-\u9fa5]+/g, '-');
        return `
            <h${level} id="${escapedText}">
                ${text}
                <a href="#${escapedText}" class="anchor" aria-hidden="true">#</a>
            </h${level}>
        `;
    };

    // 自定义链接渲染，添加target="_blank"到外部链接
    renderer.link = function(href, title, text) {
        if (href.startsWith('http://') || href.startsWith('https://')) {
            return `<a href="${href}" target="_blank" rel="noopener noreferrer"${title ? ` title="${title}"` : ''}>${text}</a>`;
        }
        return `<a href="${href}"${title ? ` title="${title}"` : ''}>${text}</a>`;
    };

    // 自定义代码块渲染
    renderer.code = function(code, language, escaped) {
        const validLanguage = language && hljs && hljs.getLanguage(language) ? language : '';
        
        let highlighted = code;
        if (validLanguage && hljs) {
            highlighted = hljs.highlight(code, { language: validLanguage }).value;
        }
        
        const langLabel = validLanguage ? `<div class="code-language">${validLanguage}</div>` : '';
        const copyButton = `
            <button class="copy-code-btn" onclick="copyCodeToClipboard(this)">
                <i class="far fa-copy"></i>
            </button>
        `;
        
        return `
            <div class="code-block">
                ${langLabel}
                <pre><code class="hljs ${validLanguage}">${highlighted}</code></pre>
                ${copyButton}
            </div>
        `;
    };

    // 自定义表格渲染
    renderer.table = function(header, body) {
        return `
            <div class="table-container">
                <table>
                    <thead>${header}</thead>
                    <tbody>${body}</tbody>
                </table>
            </div>
        `;
    };

    // 自定义图片渲染
    renderer.image = function(href, title, text) {
        return `
            <div class="image-container">
                <img src="${href}" alt="${text}"${title ? ` title="${title}"` : ''}>
                ${text ? `<div class="image-caption">${text}</div>` : ''}
            </div>
        `;
    };

    // 自定义块引用渲染
    renderer.blockquote = function(quote) {
        return `
            <blockquote>
                <div class="quote-content">${quote}</div>
            </blockquote>
        `;
    };

    // 主渲染函数
    function renderMarkdown(markdown, options = {}) {
        const {
            highlightCode = true,
            sanitize = false
        } = options;
        
        // 如果marked不可用，使用简单渲染
        if (typeof marked === 'undefined') {
            return renderSimpleMarkdown(markdown);
        }
        
        const originalOptions = { ...marked.defaults };
        
        if (!highlightCode) {
            marked.setOptions({ highlight: null });
        }
        
        try {
            const html = marked.parse(markdown, { renderer });
            marked.setOptions(originalOptions);
            return html;
        } catch (error) {
            console.error('Error rendering markdown:', error);
            marked.setOptions(originalOptions);
            
            // 出错时使用简单渲染
            return renderSimpleMarkdown(markdown);
        }
    }

    // 简单的markdown渲染函数，作为备选方案
    function renderSimpleMarkdown(markdown) {
        if (!markdown) return '';
        
        // 转换标题
        let html = markdown
            .replace(/^# (.*$)/gm, '<h1>$1</h1>')
            .replace(/^## (.*$)/gm, '<h2>$1</h2>')
            .replace(/^### (.*$)/gm, '<h3>$1</h3>')
            .replace(/^#### (.*$)/gm, '<h4>$1</h4>')
            .replace(/^##### (.*$)/gm, '<h5>$1</h5>')
            .replace(/^###### (.*$)/gm, '<h6>$1</h6>')
            // 转换加粗
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/__(.*?)__/g, '<strong>$1</strong>')
            // 转换斜体
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/_(.*?)_/g, '<em>$1</em>')
            // 转换代码块
            .replace(/```(\w+)?\n([\s\S]*?)```/g, function(match, lang, code) {
                return `<pre><code class="${lang || ''}">${escapeHtml(code)}</code></pre>`;
            })
            // 转换行内代码
            .replace(/`([^`]+)`/g, '<code>$1</code>')
            // 转换链接
            .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>')
            // 转换图片
            .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1">')
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
        html = html.replace(/<li>.*?<\/li>/g, function(match) {
            if (!match.includes('</ul>') && !match.includes('</ol>')) {
                return '<ul>' + match + '</ul>';
            }
            return match;
        });
        
        return html;
    }

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // 辅助函数：复制代码到剪贴板
    window.copyCodeToClipboard = function(button) {
        const codeBlock = button.closest('.code-block');
        if (!codeBlock) return;
        
        const codeElement = codeBlock.querySelector('code');
        if (!codeElement) return;
        
        const codeText = codeElement.textContent;
        
        navigator.clipboard.writeText(codeText).then(() => {
            const originalIcon = button.innerHTML;
            button.innerHTML = '<i class="fas fa-check"></i>';
            button.style.color = '#00ff00';
            
            setTimeout(() => {
                button.innerHTML = originalIcon;
                button.style.color = '';
            }, 2000);
        }).catch(err => {
            console.error('Failed to copy code:', err);
            button.innerHTML = '<i class="fas fa-times"></i>';
            button.style.color = '#ff0000';
            
            setTimeout(() => {
                button.innerHTML = '<i class="far fa-copy"></i>';
                button.style.color = '';
            }, 2000);
        });
    };

    // 导出函数供全局使用
    window.renderMarkdown = renderMarkdown;
    window.renderSimpleMarkdown = renderSimpleMarkdown;

    // 添加必要的CSS样式
    const style = document.createElement('style');
    style.textContent = `
        .code-block {
            position: relative;
            margin: 1.5rem 0;
            border-radius: 8px;
            overflow: hidden;
            border: 1px solid var(--border-color);
        }
        
        .code-language {
            position: absolute;
            top: 0;
            right: 0;
            background: var(--secondary-color);
            color: var(--text-secondary);
            font-size: 0.8rem;
            padding: 0.2rem 0.8rem;
            border-bottom-left-radius: 8px;
            border-top-right-radius: 8px;
            font-family: 'Consolas', 'Monaco', monospace;
        }
        
        .copy-code-btn {
            position: absolute;
            bottom: 0.5rem;
            right: 0.5rem;
            background: var(--card-bg);
            color: var(--text-color);
            border: 1px solid var(--border-color);
            border-radius: 4px;
            padding: 0.3rem 0.6rem;
            cursor: pointer;
            font-size: 0.8rem;
            transition: var(--transition);
            opacity: 0.7;
        }
        
        .copy-code-btn:hover {
            opacity: 1;
            background: var(--highlight-color);
            color: var(--primary-color);
        }
        
        .code-block pre {
            margin: 0;
            border-radius: 0;
            border: none;
        }
        
        .code-block code {
            display: block;
            padding: 1.5rem 1rem 2.5rem 1rem;
            font-size: 0.9rem;
            line-height: 1.5;
            overflow-x: auto;
        }
        
        .anchor {
            visibility: hidden;
            margin-left: 0.5rem;
            color: var(--highlight-color);
            text-decoration: none;
            font-size: 0.8em;
        }
        
        h1:hover .anchor,
        h2:hover .anchor,
        h3:hover .anchor,
        h4:hover .anchor {
            visibility: visible;
        }
        
        .table-container {
            overflow-x: auto;
            margin: 1.5rem 0;
        }
        
        .image-container {
            text-align: center;
            margin: 1.5rem 0;
        }
        
        .image-caption {
            font-size: 0.9rem;
            color: var(--text-secondary);
            margin-top: 0.5rem;
            font-style: italic;
        }
        
        blockquote .quote-content {
            position: relative;
        }
        
        blockquote .quote-content::before {
            content: '"';
            position: absolute;
            top: -1rem;
            left: -1.5rem;
            font-size: 3rem;
            color: var(--highlight-color);
            opacity: 0.3;
            font-family: serif;
        }
        
        .error-message {
            background: rgba(255, 0, 0, 0.1);
            border: 1px solid #ff0000;
            border-radius: 8px;
            padding: 1rem;
            margin: 1rem 0;
        }
        
        .error-message pre {
            background: rgba(0, 0, 0, 0.2);
            padding: 1rem;
            border-radius: 4px;
            overflow-x: auto;
        }
    `;

    // 确保不重复添加样式
    if (!document.querySelector('style[data-rendermd]')) {
        style.setAttribute('data-rendermd', 'true');
        document.head.appendChild(style);
    }

    console.log('Markdown渲染器已加载');
} else {
    // 如果marked不可用，提供简单的渲染函数
    window.renderMarkdown = function(markdown) {
        return renderSimpleMarkdown(markdown);
    };
    
    window.renderSimpleMarkdown = function(markdown) {
        if (!markdown) return '';
        
        // 简单的markdown转换
        let html = markdown
            .replace(/^# (.*$)/gm, '<h1>$1</h1>')
            .replace(/^## (.*$)/gm, '<h2>$1</h2>')
            .replace(/^### (.*$)/gm, '<h3>$1</h3>')
            .replace(/^#### (.*$)/gm, '<h4>$1</h4>')
            .replace(/^##### (.*$)/gm, '<h5>$1</h5>')
            .replace(/^###### (.*$)/gm, '<h6>$1</h6>')
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/`([^`]+)`/g, '<code>$1</code>')
            .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>')
            .replace(/\n\n+/g, '</p><p>')
            .replace(/^([^<\n].*)/gm, '<p>$1</p>');
        
        return html;
    };
    
    console.warn('marked.js未加载，使用简单Markdown渲染器');
}