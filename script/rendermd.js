/**
 * Markdown渲染器
 * 使用marked.js进行Markdown解析，highlight.js进行代码高亮
 * 包含一键复制代码功能
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

    // 自定义代码块渲染 - 添加复制按钮
    renderer.code = function(code, language, escaped) {
        const validLanguage = language && hljs && hljs.getLanguage(language) ? language : '';
        
        let highlighted = code;
        if (validLanguage && hljs) {
            highlighted = hljs.highlight(code, { language: validLanguage }).value;
        }
        
        // 获取语言名称
        const languageName = getLanguageName(validLanguage);
        
        // 生成唯一的ID - 使用安全的字符串
        const codeId = 'code-' + Math.random().toString(36).substr(2, 9);
        
        return `
            <div class="code-block-wrapper" id="${codeId}">
                <div class="code-block-header">
                    <span class="code-language">${languageName}</span>
                    <button class="copy-code-btn" onclick="copyCodeBlock('${escapeHtml(codeId)}', this)">
                        <i class="far fa-copy"></i><span>复制</span>
                    </button>
                </div>
                <pre><code class="hljs ${validLanguage}">${highlighted}</code></pre>
            </div>
        `;
    };

    // 自定义内联代码渲染 - 添加复制按钮
    renderer.codespan = function(code) {
        if (code.length > 10) { // 只有较长的内联代码才添加复制按钮
            const inlineId = 'inline-' + Math.random().toString(36).substr(2, 9);
            const escapedCode = escapeHtml(code);
            return `
                <span class="code-inline-wrapper" id="${inlineId}" data-code="${escapedCode}">
                    <code>${code}</code>
                    <button class="inline-copy-btn" onclick="copyInlineCode('${inlineId}', this)">
                        <i class="far fa-copy"></i>
                    </button>
                </span>
            `;
        }
        return `<code>${code}</code>`;
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

    // 获取语言名称
    function getLanguageName(lang) {
        if (!lang) return '代码';
        
        const languageMap = {
            'js': 'JavaScript',
            'javascript': 'JavaScript',
            'py': 'Python',
            'python': 'Python',
            'lua': 'Lua',
            'html': 'HTML',
            'css': 'CSS',
            'json': 'JSON',
            'xml': 'XML',
            'bash': 'Bash',
            'sh': 'Shell',
            'md': 'Markdown',
            'cpp': 'C++',
            'c': 'C',
            'java': 'Java',
            'php': 'PHP',
            'ruby': 'Ruby',
            'go': 'Go',
            'rust': 'Rust',
            'ts': 'TypeScript',
            'typescript': 'TypeScript',
            'sql': 'SQL',
            'yaml': 'YAML',
            'yml': 'YAML',
            'txt': 'Text',
            'plaintext': 'Text'
        };
        
        return languageMap[lang.toLowerCase()] || lang.charAt(0).toUpperCase() + lang.slice(1);
    }

    // HTML转义函数
    function escapeHtml(text) {
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return text.replace(/[&<>"']/g, function(m) { return map[m]; });
    }

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
                const codeId = 'code-' + Math.random().toString(36).substr(2, 9);
                const languageName = getLanguageName(lang);
                const escapedCode = escapeHtml(code);
                return `
                    <div class="code-block-wrapper" id="${codeId}">
                        <div class="code-block-header">
                            <span class="code-language">${languageName}</span>
                            <button class="copy-code-btn" onclick="copyCodeBlock('${codeId}', this)">
                                <i class="far fa-copy"></i><span>复制</span>
                            </button>
                        </div>
                        <pre><code class="${lang || ''}">${escapedCode}</code></pre>
                    </div>
                `;
            })
            // 转换行内代码
            .replace(/`([^`]+)`/g, function(match, code) {
                if (code.length > 10) {
                    const inlineId = 'inline-' + Math.random().toString(36).substr(2, 9);
                    const escapedCode = escapeHtml(code);
                    return `
                        <span class="code-inline-wrapper" id="${inlineId}" data-code="${escapedCode}">
                            <code>${code}</code>
                            <button class="inline-copy-btn" onclick="copyInlineCode('${inlineId}', this)">
                                <i class="far fa-copy"></i>
                            </button>
                        </span>
                    `;
                }
                return `<code>${code}</code>`;
            })
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

    // 复制代码块到剪贴板 - 修复版本
    window.copyCodeBlock = function(codeBlockId, button) {
        const codeBlock = document.getElementById(codeBlockId);
        if (!codeBlock) {
            console.error('找不到代码块:', codeBlockId);
            
            // 尝试从按钮的父元素获取代码
            const parentBlock = button.closest('.code-block-wrapper');
            if (parentBlock) {
                const codeElement = parentBlock.querySelector('code');
                if (codeElement) {
                    copyTextToClipboard(codeElement.textContent, button);
                }
            }
            return;
        }
        
        const codeElement = codeBlock.querySelector('code');
        if (!codeElement) {
            console.error('找不到代码元素');
            return;
        }
        
        copyTextToClipboard(codeElement.textContent, button);
    };

    // 复制内联代码到剪贴板 - 修复版本
    window.copyInlineCode = function(inlineId, button) {
        const inlineWrapper = document.getElementById(inlineId);
        let codeText = '';
        
        if (inlineWrapper) {
            const codeElement = inlineWrapper.querySelector('code');
            if (codeElement) {
                codeText = codeElement.textContent;
            } else if (inlineWrapper.dataset.code) {
                codeText = inlineWrapper.dataset.code;
            }
        } else {
            // 尝试从按钮的父元素获取代码
            const parentWrapper = button.closest('.code-inline-wrapper');
            if (parentWrapper) {
                const codeElement = parentWrapper.querySelector('code');
                if (codeElement) {
                    codeText = codeElement.textContent;
                } else if (parentWrapper.dataset.code) {
                    codeText = parentWrapper.dataset.code;
                }
            }
        }
        
        if (codeText) {
            copyTextToClipboard(codeText, button, true);
        } else {
            console.error('找不到内联代码');
            showCopyError(button, true);
        }
    };

    // 通用复制文本到剪贴板函数
    function copyTextToClipboard(text, button, isInline = false) {
        navigator.clipboard.writeText(text).then(() => {
            showCopySuccess(button, isInline);
        }).catch(err => {
            console.error('复制失败:', err);
            
            // 如果Clipboard API失败，尝试使用备用方法
            if (fallbackCopyToClipboard(text)) {
                showCopySuccess(button, isInline);
            } else {
                showCopyError(button, isInline);
            }
        });
    }

    // 备用复制方法
    function fallbackCopyToClipboard(text) {
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
            return successful;
        } catch (err) {
            console.error('备用复制方法失败:', err);
            return false;
        }
    }

    // 显示复制成功状态
    function showCopySuccess(button, isInline) {
        if (isInline) {
            const originalHTML = button.innerHTML;
            button.innerHTML = '<i class="fas fa-check"></i>';
            button.style.color = '#00ff00';
            
            setTimeout(() => {
                button.innerHTML = originalHTML;
                button.style.color = '';
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
            button.innerHTML = '<i class="fas fa-times"></i>';
            button.style.color = '#ff0000';
            
            setTimeout(() => {
                button.innerHTML = originalHTML;
                button.style.color = '';
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

    // 导出函数供全局使用
    window.renderMarkdown = renderMarkdown;
    window.renderSimpleMarkdown = renderSimpleMarkdown;

    // 添加必要的CSS样式
    const style = document.createElement('style');
    style.textContent = `
        .code-block-wrapper {
            position: relative;
            margin: 1.5rem 0;
            border-radius: 8px;
            overflow: hidden;
            border: 1px solid var(--border-color);
        }
        
        .code-block-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            background: var(--card-bg);
            padding: 0.5rem 1rem;
            border-bottom: 1px solid var(--border-color);
        }
        
        .code-language {
            color: var(--highlight-color);
            font-size: 0.85rem;
            font-family: 'Consolas', 'Monaco', monospace;
            font-weight: 500;
        }
        
        .copy-code-btn {
            background: transparent;
            border: 1px solid var(--border-color);
            color: var(--text-color);
            padding: 0.3rem 0.8rem;
            border-radius: 4px;
            cursor: pointer;
            font-size: 0.8rem;
            display: flex;
            align-items: center;
            gap: 0.4rem;
            transition: var(--transition);
        }
        
        .copy-code-btn:hover {
            background: var(--highlight-color);
            color: var(--primary-color);
            border-color: var(--highlight-color);
        }
        
        .copy-code-btn.success {
            background: rgba(0, 255, 0, 0.1);
            border-color: rgba(0, 255, 0, 0.3);
            color: #00ff00;
        }
        
        .copy-code-btn.error {
            background: rgba(255, 0, 0, 0.1);
            border-color: rgba(255, 0, 0, 0.3);
            color: #ff0000;
        }
        
        .code-block-wrapper pre {
            margin: 0;
            border-radius: 0;
            border: none;
        }
        
        .code-block-wrapper code {
            display: block;
            padding: 1rem;
            font-size: 0.9rem;
            line-height: 1.5;
            overflow-x: auto;
            background: var(--secondary-color);
        }
        
        .code-inline-wrapper {
            position: relative;
            display: inline-block;
        }
        
        .inline-copy-btn {
            position: absolute;
            top: -8px;
            right: -8px;
            background: var(--card-bg);
            border: 1px solid var(--border-color);
            border-radius: 50%;
            width: 20px;
            height: 20px;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            opacity: 0;
            transition: opacity 0.2s ease;
            font-size: 0.7rem;
            color: var(--text-color);
        }
        
        .code-inline-wrapper:hover .inline-copy-btn {
            opacity: 1;
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
        
        /* 移动端适配 */
        @media (max-width: 768px) {
            .code-block-header {
                padding: 0.4rem 0.8rem;
            }
            
            .copy-code-btn {
                padding: 0.2rem 0.5rem;
                font-size: 0.75rem;
            }
            
            .copy-code-btn span {
                display: none;
            }
            
            .inline-copy-btn {
                display: none;
            }
            
            .code-block-wrapper code {
                padding: 0.8rem;
                font-size: 0.85rem;
            }
        }
    `;

    // 确保不重复添加样式
    if (!document.querySelector('style[data-rendermd]')) {
        style.setAttribute('data-rendermd', 'true');
        document.head.appendChild(style);
    }

    console.log('Markdown渲染器已加载（含一键复制功能）');
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