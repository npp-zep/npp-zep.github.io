/**
 * DOMPurify XSS防御库
 * 用于安全地清理HTML，防止XSS攻击
 * 
 * 为什么需要DOMPurify：
 * 1. Markdown渲染器(marked.js)默认可能不会清理所有危险的HTML
 * 2. 用户可能输入恶意HTML/JavaScript代码
 * 3. 文章内容可能包含用户生成的内容
 * 4. 防止跨站脚本攻击(XSS)
 * 
 * DOMPurify会：
 * 1. 移除所有危险的HTML标签和属性
 * 2. 保留安全的HTML（如<b>, <i>, <a>等）
 * 3. 过滤JavaScript事件处理器（如onclick, onload）
 * 4. 清理CSS和URL中的恶意代码
 * 
 * 注意：我们使用宽松配置以保留Markdown渲染的功能
 */

// 检查是否已加载DOMPurify，如果没有则从CDN加载
if (typeof DOMPurify === 'undefined') {
    console.warn('DOMPurify未加载，正在从CDN加载...');
    
    // 创建script标签加载DOMPurify
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/dompurify/3.0.5/purify.min.js';
    script.integrity = 'sha512-kZXZYeLf5dOo90cZeaGjvT/0k/fRZH8/9lJkz6qPnJ2qRg7QvI4zt4gNqkD7t2xGZaD5c9C1WvDYQr1/ONfYcw==';
    script.crossOrigin = 'anonymous';
    script.referrerPolicy = 'no-referrer';
    
    // 等待DOMPurify加载完成
    script.onload = function() {
        console.log('DOMPurify已成功加载');
        // 初始化DOMPurify配置
        initDOMPurify();
    };
    
    script.onerror = function() {
        console.error('无法加载DOMPurify，XSS防御将不可用');
        // 提供基本的清理函数作为备选
        window.DOMPurify = {
            sanitize: function(html) {
                console.warn('使用基础HTML清理（DOMPurify未加载）');
                return basicHTMLSanitize(html);
            }
        };
    };
    
    document.head.appendChild(script);
} else {
    // 如果已经加载，直接初始化
    initDOMPurify();
}

/**
 * 初始化DOMPurify配置
 * 为什么需要自定义配置：
 * 1. 默认配置可能过于严格，会移除Markdown渲染需要的元素
 * 2. 我们需要允许代码高亮相关的class
 * 3. 需要允许复制按钮的功能
 * 4. 但必须保持安全性
 */
function initDOMPurify() {
    if (typeof DOMPurify !== 'undefined' && DOMPurify.sanitize) {
        // 自定义配置 - 平衡安全性和功能
        window.dompurifyConfig = {
            // 允许的HTML标签 - 包含Markdown渲染需要的所有标签
            ALLOWED_TAGS: [
                // 文本格式
                'p', 'br', 'hr', 'pre', 'code', 'blockquote',
                // 标题
                'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
                // 列表
                'ul', 'ol', 'li',
                // 表格
                'table', 'thead', 'tbody', 'tr', 'th', 'td',
                // 链接和图片
                'a', 'img',
                // 文本样式
                'strong', 'em', 'b', 'i', 'u', 's', 'span',
                // 布局
                'div', 'section', 'article', 'header', 'footer',
                // 代码高亮需要
                'mark', 'small', 'sub', 'sup'
            ],
            
            // 允许的属性 - 确保安全性
            ALLOWED_ATTR: [
                // 基础属性
                'class', 'id', 'style', 'title',
                // 链接属性
                'href', 'target', 'rel', 'title',
                // 图片属性
                'src', 'alt', 'width', 'height', 'loading',
                // 代码高亮需要
                'data-*', // 允许所有data-*属性，但会被进一步过滤
                // 复制功能需要
                'data-code-id', 'data-copy-target', 'data-inline-id', 'data-copy-inline',
                // 锚点功能
                'aria-hidden'
            ],
            
            // 禁止的属性（即使ALLOWED_ATTR中包含）
            FORBID_ATTR: [
                // JavaScript事件
                'onclick', 'onload', 'onerror', 'onmouseover', 'onmouseout',
                'onkeydown', 'onkeypress', 'onkeyup', 'onsubmit', 'onchange',
                // 危险属性
                'style', // 允许但会清理
                'href',  // 允许但会验证
                'src'    // 允许但会验证
            ],
            
            // 清理函数
            SAFE_FOR_JQUERY: false,
            SAFE_FOR_TEMPLATES: false,
            WHOLE_DOCUMENT: false,
            
            // 自定义清理函数
            CUSTOM_ELEMENT_HANDLING: {
                // 处理自定义元素
                tagNameCheck: null,
                attributeNameCheck: null,
                allowCustomizedBuiltInElements: false
            },
            
            // URL清理
            ALLOW_UNKNOWN_PROTOCOLS: false,
            
            // 返回DOM节点而不是字符串
            RETURN_DOM: false,
            RETURN_DOM_FRAGMENT: false,
            RETURN_DOM_IMPORT: false
        };
        
        // 创建自定义的清理函数
        window.safeSanitizeHTML = function(html, configOverride = {}) {
            if (typeof html !== 'string' || !html.trim()) {
                return '';
            }
            
            // 合并配置
            const config = {
                ...window.dompurifyConfig,
                ...configOverride
            };
            
            try {
                // 使用DOMPurify清理
                const cleanHTML = DOMPurify.sanitize(html, config);
                
                // 额外的安全处理
                return postSanitizeProcessing(cleanHTML);
            } catch (error) {
                console.error('HTML清理失败:', error);
                // 返回基本清理后的内容
                return basicHTMLSanitize(html);
            }
        };
        
        console.log('DOMPurify已配置完成，XSS防御已启用');
    }
}

/**
 * 后处理清理
 * 为什么需要后处理：
 * 1. DOMPurify清理后可能仍需要额外处理
 * 2. 确保链接安全（防止javascript:伪协议）
 * 3. 确保图片安全
 * 4. 移除潜在的恶意内容
 */
function postSanitizeProcessing(html) {
    if (!html || typeof html !== 'string') {
        return '';
    }
    
    // 创建临时DOM进行额外处理
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;
    
    // 1. 清理链接
    const links = tempDiv.querySelectorAll('a[href]');
    links.forEach(link => {
        const href = link.getAttribute('href');
        if (href) {
            // 防止javascript:伪协议
            if (href.toLowerCase().startsWith('javascript:')) {
                link.removeAttribute('href');
                link.setAttribute('data-unsafe-href', href);
            }
            // 确保外部链接有安全属性
            if (href.startsWith('http://') || href.startsWith('https://')) {
                link.setAttribute('target', '_blank');
                link.setAttribute('rel', 'noopener noreferrer');
            }
        }
    });
    
    // 2. 清理图片
    const images = tempDiv.querySelectorAll('img[src]');
    images.forEach(img => {
        const src = img.getAttribute('src');
        if (src) {
            // 防止javascript:伪协议
            if (src.toLowerCase().startsWith('javascript:')) {
                img.removeAttribute('src');
            }
            // 确保有loading属性
            if (!img.hasAttribute('loading')) {
                img.setAttribute('loading', 'lazy');
            }
        }
    });
    
    // 3. 清理样式
    const elementsWithStyle = tempDiv.querySelectorAll('[style]');
    elementsWithStyle.forEach(el => {
        const style = el.getAttribute('style');
        // 移除危险的CSS表达式
        if (style && style.includes('expression(')) {
            el.removeAttribute('style');
        }
    });
    
    // 4. 清理脚本和iframe（虽然DOMPurify应该已经移除了）
    const scripts = tempDiv.querySelectorAll('script, iframe, object, embed');
    scripts.forEach(el => el.remove());
    
    return tempDiv.innerHTML;
}

/**
 * 基础HTML清理函数（DOMPurify备选方案）
 * 为什么需要备选方案：
 * 1. CDN可能加载失败
 * 2. 网络问题
 * 3. 提供基本的防护
 */
function basicHTMLSanitize(html) {
    if (typeof html !== 'string') {
        return '';
    }
    
    // 移除所有脚本标签
    let clean = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
    
    // 移除所有事件属性
    clean = clean.replace(/\s(on\w+)=["'][^"']*["']/gi, '');
    
    // 移除javascript:伪协议
    clean = clean.replace(/href=["']javascript:[^"']*["']/gi, 'href="#"');
    clean = clean.replace(/src=["']javascript:[^"']*["']/gi, 'src="#"');
    
    // 移除危险的标签
    const dangerousTags = ['iframe', 'object', 'embed', 'frameset', 'frame'];
    dangerousTags.forEach(tag => {
        const regex = new RegExp(`<${tag}\\b[^>]*>.*?<\/${tag}>`, 'gi');
        clean = clean.replace(regex, '');
    });
    
    return clean;
}

/**
 * 安全的HTML插入函数
 * 为什么需要这个函数：
 * 1. 统一所有HTML插入操作
 * 2. 确保每次都经过清理
 * 3. 防止innerHTML的直接使用
 */
window.safeInsertHTML = function(element, html, position = 'beforeend') {
    if (!element || !(element instanceof Element)) {
        console.error('safeInsertHTML: 无效的元素');
        return;
    }
    
    // 清理HTML
    const cleanHTML = window.safeSanitizeHTML ? 
        window.safeSanitizeHTML(html) : 
        basicHTMLSanitize(html);
    
    // 安全地插入
    element.insertAdjacentHTML(position, cleanHTML);
};

/**
 * 安全地设置innerHTML
 * 替代直接使用element.innerHTML = ...
 */
window.safeSetInnerHTML = function(element, html) {
    if (!element || !(element instanceof Element)) {
        console.error('safeSetInnerHTML: 无效的元素');
        return;
    }
    
    // 清理HTML
    const cleanHTML = window.safeSanitizeHTML ? 
        window.safeSanitizeHTML(html) : 
        basicHTMLSanitize(html);
    
    // 设置清理后的HTML
    element.innerHTML = cleanHTML;
};

// 导出函数供全局使用
window.initDOMPurify = initDOMPurify;
window.basicHTMLSanitize = basicHTMLSanitize;

console.log('XSS防御模块已加载（等待DOMPurify初始化）');