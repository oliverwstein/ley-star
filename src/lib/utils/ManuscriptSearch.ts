// src/lib/utils/manuscriptSearch.ts

interface PageData {
    page_number: number;
    transcription?: string;
    revised_transcription?: string;
    summary?: string;
    keywords?: string[];
    marginalia?: string[];
    transcription_notes?: string;
    content_notes?: string;
}

type SearchableField = keyof Omit<PageData, 'page_number'>;

interface SearchOptions {
    caseSensitive?: boolean;
    fuzzyMatch?: boolean;
    weightedFields?: boolean;
    defaultField?: SearchableField;
}

type BooleanOperator = 'AND' | 'OR' | 'NOT';

interface SearchToken {
    type: 'TERM' | 'OPERATOR' | 'FIELD' | 'GROUP_START' | 'GROUP_END';
    value: string;
    field?: SearchableField;
}

export class ManuscriptSearchEngine {
    private static readonly defaultWeights = {
        summary: 2.0,               // Summary gets highest weight
        keywords: 1.8,             // Keywords are important for relevance
        revised_transcription: 1.2,
        transcription: 1.0,
        marginalia: 0.8,
        content_notes: 0.7,
        transcription_notes: 0.6
    };

    private static readonly fieldAliases = {
        'text': ['transcription', 'revised_transcription'],
        'notes': ['transcription_notes', 'content_notes'],
        'margin': ['marginalia'],
        'key': ['keywords'],
        'sum': ['summary']          // Add summary alias
    };

    private static normalizeText(text: string): string {
        return text
            .toLowerCase()
            .replace(/[\n\r]+/g, ' ')
            .replace(/[.,;:!?()[\]{}'"]/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
    }

    private static tokenizeQuery(query: string): SearchToken[] {
        const tokens: SearchToken[] = [];
        const words = query.match(/(?:[^\s"]+|"[^"]*")+/g) || [];
        
        for (let i = 0; i < words.length; i++) {
            let word = words[i];
            
            if (word.includes(':')) {
                const [field, ...rest] = word.split(':');
                const value = rest.join(':');
                tokens.push({
                    type: 'FIELD',
                    value: value.replace(/^"|"$/g, ''),
                    field: this.resolveFieldAlias(field.toLowerCase() as SearchableField)
                });
                continue;
            }

            if (/^(AND|OR|NOT)$/i.test(word)) {
                tokens.push({ type: 'OPERATOR', value: word.toUpperCase() });
                continue;
            }

            if (word === '(' || word === ')') {
                tokens.push({
                    type: word === '(' ? 'GROUP_START' : 'GROUP_END',
                    value: word
                });
                continue;
            }

            tokens.push({
                type: 'TERM',
                value: word.replace(/^"|"$/g, '')
            });
        }

        return this.insertImplicitOperators(tokens);
    }

    private static resolveFieldAlias(field: string): SearchableField {
        for (const [alias, fields] of Object.entries(this.fieldAliases)) {
            if (field === alias.toLowerCase()) {
                return fields[0] as SearchableField;
            }
        }
        return field as SearchableField;
    }

    private static insertImplicitOperators(tokens: SearchToken[]): SearchToken[] {
        const result: SearchToken[] = [];
        
        for (let i = 0; i < tokens.length; i++) {
            const current = tokens[i];
            const next = tokens[i + 1];
            
            result.push(current);
            
            if (next && 
                current.type !== 'OPERATOR' && 
                current.type !== 'GROUP_START' &&
                next.type !== 'OPERATOR' && 
                next.type !== 'GROUP_END') {
                result.push({ type: 'OPERATOR', value: 'AND' });
            }
        }
        
        return result;
    }

    private static evaluateField(page: PageData, field: SearchableField, term: string, fuzzyMatch: boolean): boolean {
        const content = field === 'keywords' || field === 'marginalia'
            ? (page[field] || []).join(' ')
            : page[field] || '';

        const normalizedContent = this.normalizeText(content);
        const normalizedTerm = this.normalizeText(term);

        if (!fuzzyMatch || normalizedTerm.length <= 3) {
            return normalizedContent.includes(normalizedTerm);
        }

        // Improved fuzzy matching for longer terms
        const maxDistance = Math.floor(normalizedTerm.length / 4);
        const words = normalizedContent.split(' ');

        return words.some(word => {
            if (word.length < normalizedTerm.length - maxDistance || 
                word.length > normalizedTerm.length + maxDistance) {
                return false;
            }

            let differences = 0;
            for (let i = 0; i < Math.max(word.length, normalizedTerm.length); i++) {
                if (word[i] !== normalizedTerm[i]) differences++;
                if (differences > maxDistance) return false;
            }
            return true;
        });
    }

    private static evaluateTokens(page: PageData, tokens: SearchToken[], options: SearchOptions): boolean {
        const stack: boolean[] = [];
        const defaultField = options.defaultField || 'summary';  // Make summary the default
        
        for (let i = 0; i < tokens.length; i++) {
            const token = tokens[i];
            
            switch (token.type) {
                case 'TERM':
                    stack.push(this.evaluateField(page, defaultField, token.value, options.fuzzyMatch || false));
                    break;
                    
                case 'FIELD':
                    if (token.field) {
                        stack.push(this.evaluateField(page, token.field, token.value, options.fuzzyMatch || false));
                    }
                    break;
                    
                case 'OPERATOR':
                    const b = stack.pop() || false;
                    const a = stack.pop() || false;
                    
                    switch (token.value) {
                        case 'AND': stack.push(a && b); break;
                        case 'OR':  stack.push(a || b); break;
                        case 'NOT': stack.push(!b); break;
                    }
                    break;
            }
        }
        
        return stack[0] || false;
    }

    static search(pages: PageData[], query: string, options: SearchOptions = {}): PageData[] {
        if (!query.trim()) return pages;

        const tokens = this.tokenizeQuery(query);
        const matchedPages = pages.filter(page => this.evaluateTokens(page, tokens, options));

        if (!options.weightedFields) return matchedPages;

        // Apply relevance scoring
        return matchedPages
            .map(page => {
                let score = 0;
                for (const token of tokens) {
                    if (token.type === 'TERM' || token.type === 'FIELD') {
                        const field = token.field || options.defaultField || 'summary';
                        if (this.evaluateField(page, field, token.value, options.fuzzyMatch || false)) {
                            score += this.defaultWeights[field];
                        }
                    }
                }
                return { page, score };
            })
            .sort((a, b) => b.score - a.score)
            .map(({ page }) => page);
    }

    static highlight(text: string | undefined, query: string): string {
        if (!text) return '';
        
        const tokens = this.tokenizeQuery(query);
        let highlightedText = text;
        
        tokens
            .filter(token => token.type === 'TERM' || token.type === 'FIELD')
            .forEach(token => {
                const normalizedTerm = this.normalizeText(token.value);
                const regex = new RegExp(`(${normalizedTerm})`, 'gi');
                highlightedText = highlightedText.replace(regex, '<mark>$1</mark>');
            });
        
        return highlightedText;
    }

    static getSearchHelp(): string {
        return `
Search Syntax:
- Use field:term to search specific fields
- Use AND, OR, NOT for boolean operations
- Use quotes for exact phrases
- Use parentheses for grouping

Available Fields:
- sum: Search summaries (default)
- text: Search transcription text
- notes: Search transcription and content notes
- margin: Search marginal notes
- key: Search keywords

Examples:
- prayer                    (searches summaries by default)
- text:prayer AND psalm     (search in transcription text)
- sum:liturgical NOT mass   (search in summaries)
- "lord's prayer"          (exact phrase)
`;
    }
}