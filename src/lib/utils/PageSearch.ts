// src/lib/utils/PageSearch.ts

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
    field?: SearchableField | SearchableField[];
}

interface FieldAliases {
    text?: string[];
    notes?: string[];
    margin?: string[];
    key?: string[];
    sum?: string[];
    [key: string]: string[] | undefined; // Add index signature
}

export class PageSearch {
    private static readonly defaultWeights = {
        summary: 2.0,
        keywords: 1.8,
        revised_transcription: 1.2,
        transcription: 1.0,
        marginalia: 0.8,
        content_notes: 0.7,
        transcription_notes: 0.6
    };

    private static readonly fieldAliases: FieldAliases = {
        'text': ['transcription', 'revised_transcription'],
        'notes': ['transcription_notes', 'content_notes'],
        'margin': ['marginalia'],
        'key': ['keywords'],
        'sum': ['summary']
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
                const resolvedField = this.resolveFieldAlias(field.toLowerCase());
                if (resolvedField) {
                    tokens.push({
                        type: 'FIELD',
                        value: value.replace(/^"|"$/g, ''),
                        field: resolvedField,
                    });
                } else {
                    tokens.push({
                        type: 'TERM',
                        value: word.replace(/^"|"$/g, '')
                    });
                }
                continue;
            }

            if (/^(AND|OR|NOT)$/i.test(word)) {
                tokens.push({ type: 'OPERATOR', value: word.toUpperCase() });
                continue;
            }
            if (word === '(' || word === ')') {
                tokens.push({
                    type: word === '(' ? 'GROUP_START' : 'GROUP_END',
                    value: word,
                });
                continue;
            }
            tokens.push({
                type: 'TERM',
                value: word.replace(/^"|"$/g, ''),
            });
        }

        return this.insertImplicitOperators(tokens);
    }

    // Type guard to check if a string is a SearchableField
    private static isSearchableField(field: string): field is SearchableField {
        const pageDataKeys = ['transcription', 'revised_transcription', 'summary', 'keywords', 'marginalia', 'transcription_notes', 'content_notes'];
        return pageDataKeys.includes(field);
    }

    private static resolveFieldAlias(field: string): SearchableField | SearchableField[] | undefined {
        const aliasFields = this.fieldAliases[field]; // Now safe
        if (aliasFields) {
            // Ensure all alias fields are valid SearchableFields
            const validAliasFields = aliasFields.filter(this.isSearchableField);
             if (validAliasFields.length > 0) {
                return validAliasFields.length === 1 ? validAliasFields[0] : validAliasFields;
            }
        }

        // Check if the original field is a searchable field.
        if (this.isSearchableField(field)) {
            return field;
        }
        return undefined;
    }
    private static insertImplicitOperators(tokens: SearchToken[]): SearchToken[] {
        const result: SearchToken[] = [];

        for (let i = 0; i < tokens.length; i++) {
            const current = tokens[i];
            const next = tokens[i + 1];
            result.push(current);
            if (
                next &&
                current.type !== 'OPERATOR' &&
                current.type !== 'GROUP_START' &&
                next.type !== 'OPERATOR' &&
                next.type !== 'GROUP_END'
            ) {
                result.push({ type: 'OPERATOR', value: 'AND' });
            }
        }
        return result;
    }

    private static evaluateField(page: PageData, fields: SearchableField | SearchableField[], term: string, fuzzyMatch: boolean): boolean {
        const fieldsToSearch = Array.isArray(fields) ? fields : [fields];

        return fieldsToSearch.some(field => {
            const content = (field === 'keywords' || field === 'marginalia')
                ? (page[field] || []).join(' ')
                : page[field] || '';

            const normalizedContent = this.normalizeText(content);
            const normalizedTerm = this.normalizeText(term);

            if (!fuzzyMatch || normalizedTerm.length <= 3) {
                return normalizedContent.includes(normalizedTerm);
            }

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
        });
    }

    private static evaluateTokens(page: PageData, tokens: SearchToken[], options: SearchOptions): boolean {
       const evaluateGroup = (startIndex: number): { result: boolean; endIndex: number } => {
           const stack: boolean[] = [];
           let i = startIndex;

           while (i < tokens.length) {
               const token = tokens[i];
               switch (token.type) {
                   case 'TERM':
                       stack.push(this.evaluateField(page, options.defaultField || 'summary', token.value, options.fuzzyMatch || false));
                       break;
                   case 'FIELD':
                       if (token.field) {
                           stack.push(this.evaluateField(page, token.field, token.value, options.fuzzyMatch || false));
                       }
                       break;

                   case 'OPERATOR':
                       if (token.value === 'NOT') {
                           // Handle NOT separately as it's unary
                           const nextToken = tokens[i + 1];
                           if (!nextToken) { // Handle invalid NOT usage
                              stack.push(false);
                              break;
                           }

                           let operand = false;
                           if (nextToken.type === 'TERM') {
                               operand = this.evaluateField(page, options.defaultField || 'summary', nextToken.value, options.fuzzyMatch || false);
                           } else if (nextToken.type === 'FIELD' && nextToken.field) {
                               operand = this.evaluateField(page, nextToken.field, nextToken.value, options.fuzzyMatch || false);
                           } else if (nextToken.type === 'GROUP_START') {
                             const groupResult = evaluateGroup(i+1);
                             operand = groupResult.result;
                             i = groupResult.endIndex; // Important: skip the evaluated subexpression
                           }
                           stack.push(!operand); //Apply Not to Operand
                           i++; //consume nextToken
                       } else {
                           const b = stack.pop() || false;
                           const a = stack.pop() || false;

                           switch (token.value) {
                               case 'AND': stack.push(a && b); break;
                               case 'OR': stack.push(a || b); break;
                           }
                       }
                       break;
                   case 'GROUP_START':
                       const groupResult = evaluateGroup(i + 1);
                       stack.push(groupResult.result);
                       i = groupResult.endIndex;
                       break;

                   case 'GROUP_END':
                       return { result: stack.pop() || false, endIndex: i };
               }
               i++;
           }
           return { result: stack.pop() || false, endIndex: i };
       };
       return evaluateGroup(0).result;
   }

    static search(pages: PageData[], query: string, options: SearchOptions = {}): PageData[] {
        if (!query.trim()) return pages;
        const tokens = this.tokenizeQuery(query);
        const matchedPages = pages.filter(page => this.evaluateTokens(page, tokens, options));
        if (!options.weightedFields) return matchedPages;
        return matchedPages
            .map(page => {
                let score = 0;
                for (const token of tokens) {
                    if (token.type === 'TERM' || token.type === 'FIELD') {
                        const fields = token.field || options.defaultField || 'summary';
                        const fieldsToScore = Array.isArray(fields) ? fields: [fields];
                        fieldsToScore.forEach(field => {
                            if (this.evaluateField(page, field, token.value, options.fuzzyMatch || false)) {
                                score += this.defaultWeights[field] || 0;
                            }
                        })
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