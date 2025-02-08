// src/lib/utils/markdown.ts

/**
 * Convert markdown text to HTML with commonly used formatting rules
 */
export function markdownToHtml(text: string | undefined | null): string {
    if (!text) return '';

    return text
        // Headers (h3 and h4 only since h1/h2 are typically components)
        .replace(/^### (.*$)/gm, '<h3>$1</h3>')
        .replace(/^#### (.*$)/gm, '<h4>$1</h4>')
        
        // Bold
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        
        // Italic
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        
        // Code
        .replace(/`([^`]+)`/g, '<code>$1</code>')
        
        // Lists
        .replace(/^\s*\-\s(.+)/gm, '<li>$1</li>')
        .replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>')
        
        // Line breaks
        .replace(/\n/g, '<br>')
        
        // Links
        .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-blue-600 hover:underline">$1</a>')
        
        // Quotes
        .replace(/^\> (.+)/gm, '<blockquote class="pl-4 border-l-4 border-gray-300 italic">$1</blockquote>');
}

/**
 * Safely apply markdown formatting to text content
 * Use this in Svelte components with {@html} directive
 */
export function safeMarkdown(text: string | undefined | null): string {
    if (!text) return '';
    
    // First escape any HTML to prevent XSS
    const escaped = text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
        
    return markdownToHtml(escaped);
}