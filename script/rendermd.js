/**
 * Markdown渲染器 - XSS安全版
 * 使用marked.js进行Markdown解析，highlight.js进行代码高亮
 * 包含一键复制代码和XSS防御
 */

// 等待DOMPurify加载
let DOMPurifyReady = false;

// 检查DOMPurify是否可用
function checkDOMPurify() {
    if (typeof DOMPurify !== 'undefined' && DOMPurify.sanitize) {
        DOMPurifyReady = true;
        return true;
    }
    return false;
}

// 安全HTML清理函数
function safeSanitizeHTML(html, configOverride = {}) {
    if (!DOMPurifyReady && !checkDOMPurify()) {
        console.warn('DOMPurify未就绪，使用基础清理');
        return basicHTMLSanitize(html);
    }
    
    try {
        // 使用DOMPurify清理，但允许代码高亮需要的元素
        const cleanHTML = DOMPurify.sanitize(html, {
            // 允许代码高亮相关的class
            ADD_ATTR: ['data-code-id', 'data-copy-target', 'data-inline-id', 'data-copy-inline', 'data-code'],
            ADD_TAGS: ['pre', 'code', 'span'],
            ALLOW_DATA_ATTR: true,
            ALLOWED_ATTR: [
                'class', 'id', 'style', 'title',
                'href', 'target', 'rel',
                'src', 'alt', 'width', 'height', 'loading',
                'data-code-id', 'data-copy-target', 'data-inline-id', 'data-copy-inline', 'data-code',
                'aria-hidden'
            ],
            FORBID_ATTR: ['onclick', 'onload', 'onerror', 'onmouseover', 'onmouseout']
        });
        
        return cleanHTML;
    } catch (error) {
        console.error('HTML清理错误:', error);
        return basicHTMLSanitize(html);
    }
}

// 基础HTML清理（DOMPurify备选）
function basicHTMLSanitize(html) {
    if (typeof html !== 'string') return '';
    
    // 移除脚本标签
    let clean = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
    
    // 移除事件处理器
    clean = clean.replace(/\s(on\w+)=["'][^"']*["']/gi, '');
    
    // 移除javascript:伪协议
    clean = clean.replace(/\s(href|src)=["']javascript:[^"']*["']/gi, '');
    
    return clean;
}

// 生成安全的唯一ID
function generateUniqueId(prefix = 'id') {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// HTML转义函数 - 用于纯文本
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
        'plaintext': 'Text',
        'dockerfile': 'Dockerfile',
        'makefile': 'Makefile',
        'nginx': 'Nginx'
    };
    
    return languageMap[lang.toLowerCase()] || lang.charAt(0).toUpperCase() + lang.slice(1);
}

// 复制文本到剪贴板 - 修复版
function copyTextToClipboard(text, button, isInline = false) {
    // 确保text是字符串
    const textToCopy = String(text || '');
    
    // 检查navigator.clipboard是否可用
    if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(textToCopy).then(() => {
            showCopySuccess(button, isInline);
        }).catch(err => {
            console.error('Clipboard API失败:', err);
            // 使用备用方法
            if (fallbackCopyToClipboard(textToCopy)) {
                showCopySuccess(button, isInline);
            } else {
                showCopyError(button, isInline);
            }
        });
    } else {
        // 使用备用方法
        if (fallbackCopyToClipboard(textToCopy)) {
            showCopySuccess(button, isInline);
        } else {
            showCopyError(button, isInline);
        }
    }
}

// 备用复制方法 - 修复版
function fallbackCopyToClipboard(text) {
    try {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        
        // 避免滚动到textArea
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        textArea.style.opacity = '0';
        
        document.body.appendChild(textArea);
        
        // 兼容移动端
        if (navigator.userAgent.match(/ipad|ipod|iphone/i)) {
            const range = document.createRange();
            range.selectNodeContents(textArea);
            const selection = window.getSelection();
            selection.removeAllRanges();
            selection.addRange(range);
            textArea.setSelectionRange(0, 999999);
        } else {
            textArea.select();
        }
        
        const successful = document.execCommand('copy');
        
        // 清理DOM
        setTimeout(() => {
            document.body.removeChild(textArea);
        }, 100);
        
        return successful;
    } catch (err) {
        console.error('备用复制方法失败:', err);
        return false;
    }
}

// 显示复制成功状态
function showCopySuccess(button, isInline) {
    const originalHTML = button.innerHTML;
    const originalClass = button.className;
    
    if (isInline) {
        button.innerHTML = '<i class="fas fa-check"></i>';
        button.style.color = '#00ff00';
        
        setTimeout(() => {
            button.innerHTML = originalHTML;
            button.style.color = '';
        }, 2000);
    } else {
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
    const originalHTML = button.innerHTML;
    const originalClass = button.className;
    
    if (isInline) {
        button.innerHTML = '<i class="fas fa-times"></i>';
        button.style.color = '#ff0000';
        
        setTimeout(() => {
            button.innerHTML = originalHTML;
            button.style.color = '';
        }, 2000);
    } else {
        button.innerHTML = '<i class="fas fa-times"></i><span>失败</span>';
        button.className = originalClass + ' error';
        
        setTimeout(() => {
            button.innerHTML = originalHTML;
            button.className = originalClass;
        }, 2000);
    }
}

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
        sanitize: false, // 注意：我们使用DOMPurify，所以这里关闭marked的内置清理
        smartLists: true,
        smartypants: true,
        highlight: function(code, lang) {
            if (typeof hljs === 'undefined') {
                return escapeHtml(code); // 安全转义
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
                return escapeHtml(code); // 安全转义
            }
        }
    });

    // 自定义渲染器
    const renderer = new marked.Renderer();

    // 自定义标题渲染，添加锚点
    renderer.heading = function(text, level) {
        const escapedText = text.toLowerCase()
            .replace(/[^\w\u4e00-\u9fa5]+/g, '-')
            .replace(/^-+|-+$/g, '');
        return `
            <h${level} id="${escapedText}">
                ${escapeHtml(text)}
                <a href="#${escapedText}" class="anchor" aria-hidden="true">#</a>
            </h${level}>
        `;
    };

    // 自定义链接渲染，添加target="_blank"到外部链接
    renderer.link = function(href, title, text) {
        // 清理href，防止javascript:伪协议
        let safeHref = escapeHtml(href);
        if (safeHref.toLowerCase().startsWith('javascript:')) {
            safeHref = '#';
        }
        
        const escapedText = escapeHtml(text);
        const titleAttr = title ? ` title="${escapeHtml(title)}"` : '';
        
        if (safeHref.startsWith('http://') || safeHref.startsWith('https://')) {
            return `<a href="${safeHref}" target="_blank" rel="noopener noreferrer"${titleAttr}>${escapedText}</a>`;
        }
        return `<a href="${safeHref}"${titleAttr}>${escapedText}</a>`;
    };

    // 自定义代码块渲染 - 安全版
    renderer.code = function(code, language, escaped) {
        // 确保code是字符串并转义
        const codeString = String(code || '');
        const validLanguage = language && hljs && hljs.getLanguage(language) ? language : '';
        
        let highlighted = escapeHtml(codeString);
        if (validLanguage && hljs) {
            try {
                highlighted = hljs.highlight(codeString, { language: validLanguage }).value;
                // 高亮后的代码已经是HTML，需要确保安全
                highlighted = safeSanitizeHTML(highlighted);
            } catch (err) {
                console.error('代码高亮错误:', err);
                highlighted = escapeHtml(codeString);
            }
        }
        
        // 获取语言名称
        const languageName = escapeHtml(getLanguageName(validLanguage));
        
        // 生成唯一的ID
        const codeId = generateUniqueId('code');
        
        const codeBlockHTML = `
            <div class="code-block-wrapper" data-code-id="${codeId}">
                <div class="code-block-header">
                    <span class="code-language">${languageName}</span>
                    <button class="copy-code-btn" data-copy-target="${codeId}">
                        <i class="far fa-copy"></i><span>复制</span>
                    </button>
                </div>
                <pre><code class="hljs ${escapeHtml(validLanguage)}">${highlighted}</code></pre>
            </div>
        `;
        
        // 返回清理后的HTML
        return safeSanitizeHTML(codeBlockHTML);
    };

    // 自定义内联代码渲染 - 添加复制按钮
    renderer.codespan = function(code) {
        const codeString = String(code || '');
        if (codeString.length > 10) {
            const inlineId = generateUniqueId('inline');
            const escapedCode = escapeHtml(codeString);
            const inlineCodeHTML = `
                <span class="code-inline-wrapper" data-inline-id="${inlineId}" data-code="${escapedCode}">
                    <code>${escapeHtml(codeString)}</code>
                    <button class="inline-copy-btn" data-copy-inline="${inlineId}">
                        <i class="far fa-copy"></i>
                    </button>
                </span>
            `;
            return safeSanitizeHTML(inlineCodeHTML);
        }
        return `<code>${escapeHtml(codeString)}</code>`;
    };

    // 自定义表格渲染
    renderer.table = function(header, body) {
        const tableHTML = `
            <div class="table-container">
                <table>
                    <thead>${header}</thead>
                    <tbody>${body}</tbody>
                </table>
            </div>
        `;
        return safeSanitizeHTML(tableHTML);
    };

    // 自定义图片渲染
    renderer.image = function(href, title, text) {
        // 清理href
        let safeHref = escapeHtml(href);
        if (safeHref.toLowerCase().startsWith('javascript:')) {
            safeHref = '';
        }
        
        const escapedText = escapeHtml(text);
        const titleAttr = title ? ` title="${escapeHtml(title)}"` : '';
        
        const imageHTML = `
            <div class="image-container">
                <img src="${safeHref}" alt="${escapedText}"${titleAttr} loading="lazy">
                ${text ? `<div class="image-caption">${escapedText}</div>` : ''}
            </div>
        `;
        return safeSanitizeHTML(imageHTML);
    };

    // 自定义块引用渲染
    renderer.blockquote = function(quote) {
        const blockquoteHTML = `
            <blockquote>
                <div class="quote-content">${quote}</div>
            </blockquote>
        `;
        return safeSanitizeHTML(blockquoteHTML);
    };

    // 主渲染函数 - 安全版
    function renderMarkdown(markdown, options = {}) {
        const {
            highlightCode = true,
            sanitize = true // 默认启用清理
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
            // 清理输入
            const cleanMarkdown = markdown ? String(markdown) : '';
            
            // 使用marked解析
            const rawHTML = marked.parse(cleanMarkdown, { renderer });
            
            // 清理HTML（如果启用）
            let html = sanitize ? safeSanitizeHTML(rawHTML) : rawHTML;
            
            marked.setOptions(originalOptions);
            return html;
        } catch (error) {
            console.error('渲染Markdown错误:', error);
            marked.setOptions(originalOptions);
            
            // 出错时使用简单渲染
            return renderSimpleMarkdown(markdown);
        }
    }

    // 简单的markdown渲染函数，作为备选方案
    function renderSimpleMarkdown(markdown) {
        if (!markdown) return '';
        
        // 转换标题
        let html = String(markdown)
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
                const codeId = generateUniqueId('code');
                const languageName = escapeHtml(getLanguageName(lang));
                const escapedCode = escapeHtml(code);
                return `
                    <div class="code-block-wrapper" data-code-id="${codeId}">
                        <div class="code-block-header">
                            <span class="code-language">${languageName}</span>
                            <button class="copy-code-btn" data-copy-target="${codeId}">
                                <i class="far fa-copy"></i><span>复制</span>
                            </button>
                        </div>
                        <pre><code class="${escapeHtml(lang || '')}">${escapedCode}</code></pre>
                    </div>
                `;
            })
            // 转换行内代码
            .replace(/`([^`]+)`/g, function(match, code) {
                if (code.length > 10) {
                    const inlineId = generateUniqueId('inline');
                    const escapedCode = escapeHtml(code);
                    return `
                        <span class="code-inline-wrapper" data-inline-id="${inlineId}" data-code="${escapedCode}">
                            <code>${escapeHtml(code)}</code>
                            <button class="inline-copy-btn" data-copy-inline="${inlineId}">
                                <i class="far fa-copy"></i>
                            </button>
                        </span>
                    `;
                }
                return `<code>${escapeHtml(code)}</code>`;
            })
            // 转换链接
            .replace(/\[([^\]]+)\]\(([^)]+)\)/g, function(match, text, href) {
                const escapedText = escapeHtml(text);
                const escapedHref = escapeHtml(href);
                if (href.startsWith('http://') || href.startsWith('https://')) {
                    return `<a href="${escapedHref}" target="_blank" rel="noopener noreferrer">${escapedText}</a>`;
                }
                return `<a href="${escapedHref}">${escapedText}</a>`;
            })
            // 转换图片
            .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, function(match, alt, src) {
                const escapedAlt = escapeHtml(alt);
                const escapedSrc = escapeHtml(src);
                return `<img src="${escapedSrc}" alt="${escapedAlt}" style="max-width: 100%; height: auto;" loading="lazy">`;
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
        html = html.replace(/<li>.*?<\/li>/g, function(match) {
            if (!match.includes('</ul>') && !match.includes('</ol>')) {
                return '<ul>' + match + '</ul>';
            }
            return match;
        });
        
        // 清理HTML
        return safeSanitizeHTML(html);
    }

    // 全局复制函数 - 修复事件委托问题
    window.copyCodeBlock = function(codeBlockId, button) {
        let codeBlock;
        
        if (typeof codeBlockId === 'string') {
            codeBlock = document.getElementById(codeBlockId);
        }
        
        if (!codeBlock) {
            // 尝试从按钮的父元素获取代码
            const parentBlock = button.closest('.code-block-wrapper');
            if (parentBlock) {
                const codeElement = parentBlock.querySelector('code');
                if (codeElement) {
                    copyTextToClipboard(codeElement.textContent, button);
                    return;
                }
            }
            console.error('找不到代码块:', codeBlockId);
            showCopyError(button, false);
            return;
        }
        
        const codeElement = codeBlock.querySelector('code');
        if (!codeElement) {
            console.error('找不到代码元素');
            showCopyError(button, false);
            return;
        }
        
        copyTextToClipboard(codeElement.textContent, button);
    };

    // 复制内联代码到剪贴板 - 修复版
    window.copyInlineCode = function(inlineId, button) {
        let codeText = '';
        
        if (typeof inlineId === 'string') {
            const inlineWrapper = document.getElementById(inlineId);
            if (inlineWrapper) {
                const codeElement = inlineWrapper.querySelector('code');
                if (codeElement) {
                    codeText = codeElement.textContent;
                } else if (inlineWrapper.dataset.code) {
                    codeText = inlineWrapper.dataset.code;
                }
            }
        }
        
        if (!codeText) {
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

    // 导出函数供全局使用
    window.renderMarkdown = renderMarkdown;
    window.renderSimpleMarkdown = renderSimpleMarkdown;
    window.generateUniqueId = generateUniqueId;
    window.copyTextToClipboard = copyTextToClipboard;
    window.fallbackCopyToClipboard = fallbackCopyToClipboard;
    window.safeSanitizeHTML = safeSanitizeHTML;
    window.basicHTMLSanitize = basicHTMLSanitize;
    window.escapeHtml = escapeHtml;

    console.log('Markdown渲染器已加载（XSS安全版）');
} else {
    // 如果marked不可用，提供简单的渲染函数
    window.renderMarkdown = function(markdown) {
        return renderSimpleMarkdown(markdown);
    };
    
    window.renderSimpleMarkdown = function(markdown) {
        if (!markdown) return '';
        
        // 简单的markdown转换
        let html = String(markdown)
            .replace(/^# (.*$)/gm, '<h1>$1</h1>')
            .replace(/^## (.*$)/gm, '<h2>$1</h2>')
            .replace(/^### (.*$)/gm, '<h3>$1</h3>')
            .replace(/^#### (.*$)/gm, '<h4>$1</h4>')
            .replace(/^##### (.*$)/gm, '<h5>$1</h5>')
            .replace(/^###### (.*$)/gm, '<h6>$1</h6>')
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/`([^`]+)`/g, '<code>$1</code>')
            .replace(/\[([^\]]+)\]\(([^)]+)\)/g, function(match, text, href) {
                // 清理href
                if (href.toLowerCase().startsWith('javascript:')) {
                    return `<span>${text}</span>`;
                }
                if (href.startsWith('http://') || href.startsWith('https://')) {
                    return `<a href="${escapeHtml(href)}" target="_blank">${escapeHtml(text)}</a>`;
                }
                return `<a href="${escapeHtml(href)}">${escapeHtml(text)}</a>`;
            })
            .replace(/\n\n+/g, '</p><p>')
            .replace(/^([^<\n].*)/gm, '<p>$1</p>');
        
        // 清理HTML
        return safeSanitizeHTML ? safeSanitizeHTML(html) : basicHTMLSanitize(html);
    };
    
    console.warn('marked.js未加载，使用简单Markdown渲染器');
}

// 修复事件监听器问题
document.addEventListener('DOMContentLoaded', function() {
    // 等待DOMPurify就绪
    const checkDOMPurifyInterval = setInterval(() => {
        if (checkDOMPurify()) {
            clearInterval(checkDOMPurifyInterval);
            console.log('DOMPurify已就绪，XSS防御完全启用');
        }
    }, 100);
    
    // 添加事件委托
    document.addEventListener('click', function(e) {
        // 处理代码块复制按钮
        if (e.target.closest('.copy-code-btn')) {
            const button = e.target.closest('.copy-code-btn');
            const wrapper = button.closest('.code-block-wrapper');
            
            if (wrapper) {
                const codeElement = wrapper.querySelector('code');
                if (codeElement) {
                    copyTextToClipboard(codeElement.textContent, button);
                }
            }
        }
        
        // 处理内联代码复制按钮
        if (e.target.closest('.inline-copy-btn')) {
            const button = e.target.closest('.inline-copy-btn');
            const wrapper = button.closest('.code-inline-wrapper');
            
            if (wrapper) {
                const codeElement = wrapper.querySelector('code');
                if (codeElement) {
                    copyTextToClipboard(codeElement.textContent, button, true);
                }
            }
        }
    });
});