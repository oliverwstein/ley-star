// src/lib/services/catalogue.search.service.ts
import type { ManuscriptMetadata } from '$lib/types/manuscript';

export type SearchField = 
    | 'title' 
    | 'languages' 
    | 'contents_summary' 
    | 'themes' 
    | 'scribes' 
    | 'origin_location' 
    | 'date_range'
    | 'physical_description.material'
    | 'physical_description.script_type'
    | 'physical_description.decoration.illuminations'
    | 'physical_description.decoration.artistic_style'
    | 'transcription_status.status';

export interface SearchCondition {
    field: SearchField;
    operator: 'contains' | 'equals' | 'before' | 'after' | 'not' | 'within' | 'between';
    value: string | number | [number, number];
    negate?: boolean;
}

export interface SearchQuery {
    rawQuery: string;
    conditions: SearchCondition[];
    operator: 'and' | 'or';
    freeText?: string;  // For TF-IDF scoring
}

interface TermVector {
    [term: string]: number;  // term -> tf-idf weight
}

interface DocumentVector {
    terms: TermVector;
    length: number;  // Normalized length
}

export class CatalogueSearchService {
    private cache = {
        vectors: new Map<string, DocumentVector>(),
        idf: new Map<string, number>(),
        initialized: false
    };
    
    private readonly fieldAliases = new Map<string, SearchField>([
        ['language', 'languages'],
        ['summary', 'contents_summary'],
        ['theme', 'themes'],
        ['scribe', 'scribes'],
        ['location', 'origin_location'],
        ['date', 'date_range'],
        // Aliases for nested fields
        ['material', 'physical_description.material'],
        ['script', 'physical_description.script_type'],
        ['illuminations', 'physical_description.decoration.illuminations'],
        ['style', 'physical_description.decoration.artistic_style'],
        ['status', 'transcription_status.status']
    ]);

    private readonly operatorAliases = new Map<string, string>([
        // Logical AND aliases
        ['and', 'and'],
        ['&', 'and'],
        ['+', 'and'],
        ['with', 'and'],
        ['plus', 'and'],
        ['&&', 'and'],

        // Logical OR aliases
        ['or', 'or'],
        ['|', 'or'],
        ['||', 'or'],
        ['either', 'or'],

        // Logical NOT aliases
        ['not', 'not'],
        ['without', 'not'],
        ['except', 'not'],
        ['-', 'not'],
        ['!', 'not'],

        // Value comparison aliases
        ['in', 'contains'],
        ['has', 'contains'],
        ['contains', 'contains'],
        ['including', 'contains'],
        ['mentions', 'contains'],
        
        ['is', 'equals'],
        ['=', 'equals'],
        ['equals', 'equals'],
        ['exactly', 'equals'],
        
        ['!=', 'not'],
        ['isnt', 'not'],
        ['excluding', 'not'],
        
        // Date-specific aliases
        ['before', 'before'],
        ['until', 'before'],
        ['pre', 'before'],
        ['earlier', 'before'],
        ['<', 'before'],
        
        ['after', 'after'],
        ['since', 'after'],
        ['post', 'after'],
        ['later', 'after'],
        ['>', 'after'],
        
        ['between', 'between'],
        ['during', 'between'],
        ['from', 'between'],
        ['range', 'between']
    ]);

    private readonly fieldWeights = new Map<SearchField | string, number>([
        ['title', 1.0],
        ['contents_summary', 0.8],
        ['themes', 0.7],
        ['languages', 0.6],
        ['scribes', 0.5],
        ['provenance', 0.5],
        // weights for nested fields
        ['physical_description.material', 0.8],
        ['physical_description.script_type', 0.9],
        ['physical_description.decoration.illuminations', 0.9],
        ['physical_description.decoration.artistic_style', 0.7],
        // Default weight for any unspecified field
        ['default', 0.5]
    ]);

    parseQuery(queryString: string): SearchQuery {
        queryString = this.normalizeQueryString(queryString);
        
        const conditions: SearchCondition[] = [];
        let operator: 'and' | 'or' = 'and';
        let freeText = '';

        // Split into field conditions and free text
        const parts = this.tokenizeQuery(queryString);
        const fieldParts: string[] = [];
        const textParts: string[] = [];

        for (const part of parts) {
            if (this.isFieldQuery(part)) {
                fieldParts.push(part);
            } else {
                textParts.push(part);
            }
        }

        // Process field conditions
        if (fieldParts.length > 0) {
            // First split by OR operators
            const orOperators = ['OR', '\\|\\|', '\\|', 'EITHER'];
            const orPattern = new RegExp(` (${orOperators.join('|')}) `, 'g');
            const orParts = fieldParts.join(' ').split(orPattern).map(p => p.trim());
            
            if (orParts.length > 1) {
                operator = 'or';
            }

            // Process each OR part
            for (const orPart of orParts) {
                // Split by AND operators
                const andOperators = ['AND', '&&', '\\+', 'WITH', 'PLUS'];
                const andPattern = new RegExp(` (${andOperators.join('|')}) `, 'g');
                const andParts = orPart.split(andPattern).map(p => p.trim());
                
                for (const andPart of andParts) {
                    // Split by NOT operators
                    const notOperators = ['NOT', 'WITHOUT', 'EXCEPT', '-(?!\\d)', '!'];
                    const notPattern = new RegExp(` (${notOperators.join('|')}) `, 'g');
                    const notParts = andPart.split(notPattern).map(p => p.trim());
                    
                    // Process first part (positive)
                    if (notParts[0]) {
                        const condition = this.parseCondition(notParts[0]);
                        if (condition) {
                            conditions.push(condition);
                        }
                    }

                    // Process remaining parts (negated)
                    for (let i = 1; i < notParts.length; i++) {
                        const condition = this.parseCondition(notParts[i]);
                        if (condition) {
                            condition.negate = true;
                            conditions.push(condition);
                        }
                    }
                }
            }
        }

        // Collect free text for TF-IDF scoring
        freeText = textParts.join(' ').trim();
        return {
            rawQuery: queryString,
            conditions,
            operator,
            freeText
        };
    }

    private normalizeQueryString(query: string): string {
        // Convert query to uppercase for consistent operator handling
        let normalized = query.toUpperCase();
        
        // Add spaces around symbolic operators to ensure proper parsing
        normalized = normalized.replace(/([&|!+]){1,2}/g, ' $1 ');
        
        // Handle special case for minus sign (don't add spaces if it's part of a number)
        normalized = normalized.replace(/(?<![\d\s])-(?!\d)/g, ' - ');
        
        // Remove extra whitespace
        normalized = normalized.replace(/\s+/g, ' ').trim();
        
        return normalized;
    }

    private parseCondition(text: string): SearchCondition | null {
        // Match patterns like "field:operator:value" or "field:value"
        const complexMatch = text.match(/^(\w+):(\w+):(.+)$/);
        const simpleMatch = text.match(/^(\w+):(.+)$/);

        if (complexMatch) {
            const [, field, operator, value] = complexMatch;
            return {
                field: this.resolveField(field),
                operator: this.resolveOperator(operator),
                value: this.normalizeValue(value)
            };
        } else if (simpleMatch) {
            const [, field, value] = simpleMatch;
            return {
                field: this.resolveField(field),
                operator: 'contains',
                value: this.normalizeValue(value)
            };
        }

        return null;
    }

    private resolveField(field: string): SearchField {
        const normalized = field.toLowerCase();
        return this.fieldAliases.get(normalized) || normalized as SearchField;
    }

    private resolveOperator(op: string): SearchCondition['operator'] {
        const normalized = op.toLowerCase();
        return (this.operatorAliases.get(normalized) || normalized) as SearchCondition['operator'];
    }

    private normalizeValue(value: string): string | number | [number, number] {
        value = value.replace(/^["']|["']$/g, '');

        if (value.includes('..')) {
            const [start, end] = value.split('..');
            if (/^\d{3,4}$/.test(start) && /^\d{3,4}$/.test(end)) {
                return [parseInt(start, 10), parseInt(end, 10)];
            }
        }

        if (/^\d{3,4}$/.test(value)) {
            return parseInt(value, 10);
        }

        return value.toLowerCase();
    }

    search(manuscripts: ManuscriptMetadata[], query: SearchQuery): ManuscriptMetadata[] {
        // First, apply boolean filters if any
        let filtered = manuscripts;
        if (query.conditions.length > 0) {
            filtered = this.applyFilters(manuscripts, query);
        }
    
        // If there's no free text, return filtered results
        if (!query.freeText) {
            return filtered;
        }
    
        // Initialize TF-IDF if needed
        this.initializeTFIDF(manuscripts);
    
        // Create query vector
        const queryVector = this.createQueryVector(query.freeText);
        
        // Score and sort results, filtering out zero scores
        const scored = filtered
            .map(manuscript => ({
                manuscript,
                score: this.calculateSimilarity(
                    queryVector,
                    this.cache.vectors.get(manuscript.id)!
                )
            }))
            .filter(item => item.score > 0)  // Only keep non-zero scores
            .sort((a, b) => b.score - a.score);
    
        return scored.map(result => result.manuscript);
    }

    private applyFilters(manuscripts: ManuscriptMetadata[], query: SearchQuery): ManuscriptMetadata[] {
        return manuscripts.filter(manuscript => {
            const results = query.conditions.map(condition => {
                const result = this.evaluateCondition(manuscript, condition);
                return condition.negate ? !result : result;
            });

            return query.operator === 'and'
                ? results.every(r => r)
                : results.some(r => r);
        });
    }

    private evaluateCondition(manuscript: ManuscriptMetadata, condition: SearchCondition): boolean {
        const { field, operator, value } = condition;

        // Handle date range conditions
        if (field === 'date_range') {
            return this.evaluateDateCondition(manuscript, operator, value);
        }

        // Get the actual value from the manuscript, handling nested fields
        const fieldValue = this.getNestedValue(manuscript, field);
        if (fieldValue === undefined) return false;

        // Handle array fields
        if (Array.isArray(fieldValue)) {
            return this.evaluateArrayCondition(fieldValue, operator, value);
        }

        // Handle string fields
        const actualValue = fieldValue.toString().toLowerCase();
        const searchValue = (value as string).toLowerCase();

        return this.evaluateStringCondition(actualValue, operator, searchValue);
    }

    private evaluateDateCondition(
        manuscript: ManuscriptMetadata, 
        operator: SearchCondition['operator'], 
        value: string | number | [number, number]
    ): boolean {
        const [msStart, msEnd] = manuscript.date_range;
        
        switch (operator) {
            case 'before':
                return msStart <= (value as number);
            case 'after':
                return msEnd >= (value as number);
            case 'between':
                const [searchStart, searchEnd] = value as [number, number];
                return msStart <= searchEnd && msEnd >= searchStart;
            case 'equals':
                const targetYear = value as number;
                return msStart <= targetYear && msEnd >= targetYear;
            default:
                return false;
        }
    }

    private evaluateArrayCondition(
        values: any[], 
        operator: SearchCondition['operator'], 
        searchValue: string | number | [number, number]
    ): boolean {
        const searchStr = (searchValue as string).toLowerCase();
        
        switch (operator) {
            case 'contains':
                return values.some(v => this.matchValue(v.toString().toLowerCase(), searchStr));
            case 'equals':
                return values.some(v => v.toString().toLowerCase() === searchStr);
            case 'not':
                return values.every(v => !this.matchValue(v.toString().toLowerCase(), searchStr));
            default:
                return false;
        }
    }

    private evaluateStringCondition(
        fieldValue: string, 
        operator: SearchCondition['operator'], 
        searchValue: string
    ): boolean {
        switch (operator) {
            case 'contains':
                return this.matchValue(fieldValue, searchValue);
            case 'equals':
                return fieldValue === searchValue;
            case 'not':
                return !this.matchValue(fieldValue, searchValue);
            default:
                return false;
        }
    }

    private matchValue(text: string, pattern: string): boolean {
        if (pattern.includes('*')) {
            const regex = new RegExp(
                '^' + pattern.replace(/\*/g, '.*') + '$'
            );
            return regex.test(text);
        }
        return text.includes(pattern);
    }

    private initializeTFIDF(manuscripts: ManuscriptMetadata[]) {
        if (this.cache.initialized) return;

        const documentFrequencies = new Map<string, number>();
        const documentVectors = new Map<string, DocumentVector>();

        // Calculate document frequencies
        for (const manuscript of manuscripts) {
            const terms = this.extractTerms(manuscript);
            const uniqueTerms = new Set(terms);
            
            for (const term of uniqueTerms) {
                documentFrequencies.set(
                    term,
                    (documentFrequencies.get(term) || 0) + 1
                );
            }
        }

        // Calculate IDF values
        const totalDocs = manuscripts.length;
        for (const [term, freq] of documentFrequencies) {
            this.cache.idf.set(term, Math.log(totalDocs / freq));
        }

        // Create document vectors
        for (const manuscript of manuscripts) {
            documentVectors.set(
                manuscript.id,
                this.createDocumentVector(manuscript)
            );
        }

        this.cache.vectors = documentVectors;
        this.cache.initialized = true;
    }

    // Helper function to get nested value from an object using dot notation
    private getNestedValue(obj: any, path: string): any {
        return path.split('.').reduce((current, key) => 
            current && typeof current === 'object' ? current[key] : undefined, 
            obj
        );
    }

    private extractTerms(manuscript: ManuscriptMetadata): string[] {
        const terms: string[] = [];
        
        // Function to recursively extract terms from an object
        const extractFromObject = (obj: any, prefix: string = '') => {
            for (const [key, value] of Object.entries(obj)) {
                const fullPath = prefix ? `${prefix}.${key}` : key;
                
                if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
                    // Recurse into nested objects
                    extractFromObject(value, fullPath);
                } else {
                    // Get the weight for this field
                    const weight = this.fieldWeights.get(fullPath as SearchField) || 
                                 this.fieldWeights.get('default') || 
                                 0.3;
                    
                    if (Array.isArray(value)) {
                        // Handle array values
                        value.forEach(item => {
                            const fieldTerms = this.tokenizeText(String(item));
                            terms.push(...fieldTerms.map(term => `${fullPath}:${term}`));
                        });
                    } else if (value !== null && value !== undefined) {
                        // Handle scalar values
                        const fieldTerms = this.tokenizeText(String(value));
                        terms.push(...fieldTerms.map(term => `${fullPath}:${term}`));
                    }
                }
            }
        };

        // Start extraction from the root object
        extractFromObject(manuscript);
        return terms;
    }

    private createDocumentVector(manuscript: ManuscriptMetadata): DocumentVector {
        const terms = this.extractTerms(manuscript);
        const vector: TermVector = {};
        
        // Calculate term frequencies
        for (const term of terms) {
            vector[term] = (vector[term] || 0) + 1;
        }

        // Apply TF-IDF weights
        let sumSquares = 0;
        for (const term in vector) {
            const tf = vector[term];
            const idf = this.cache.idf.get(term) || 0;
            const [field] = term.split(':');
            const weight = this.fieldWeights.get(field as SearchField) || 0.1;
            
            vector[term] = tf * idf * weight;
            sumSquares += vector[term] * vector[term];
        }

        return {
            terms: vector,
            length: Math.sqrt(sumSquares)
        };
    }

    private createQueryVector(query: string): DocumentVector {
        const terms = this.tokenizeText(query);
        const vector: TermVector = {};

        // Create weighted query vector
        for (const term of terms) {
            for (const field of this.fieldWeights.keys()) {
                const fieldTerm = `${field}:${term}`;
                if (this.cache.idf.has(fieldTerm)) {
                    vector[fieldTerm] = (vector[fieldTerm] || 0) + 1;
                }
            }
        }

        // Normalize query vector
        let sumSquares = 0;
        for (const term in vector) {
            const tf = vector[term];
            const idf = this.cache.idf.get(term) || 0;
            const [field] = term.split(':');
            const weight = this.fieldWeights.get(field as SearchField) || 0.1;
            
            vector[term] = tf * idf * weight;
            sumSquares += vector[term] * vector[term];
        }

        return {
            terms: vector,
            length: Math.sqrt(sumSquares)
        };
    }

    private calculateSimilarity(vec1: DocumentVector, vec2: DocumentVector): number {
        let dotProduct = 0;
        // Calculate dot product with fuzzy matching
        for (const term1 in vec1.terms) {
            const [field1, value1] = term1.split(':');
            
            for (const term2 in vec2.terms) {
                const [field2, value2] = term2.split(':');
                
                if (field1 === field2) {
                    const similarity = this.calculateFuzzySimilarity(value1, value2);
                    if (similarity > 0.8) {  // Threshold for fuzzy matches
                        dotProduct += vec1.terms[term1] * vec2.terms[term2] * similarity;
                    }
                }
            }
        }

        // Normalize by vector lengths
        return dotProduct / (vec1.length * vec2.length || 1);
    }

    private calculateFuzzySimilarity(str1: string, str2: string): number {
        if (str1 === str2) return 1;
        if (str1.length < 2 || str2.length < 2) return 0;

        const len1 = str1.length;
        const len2 = str2.length;
        const maxDist = Math.floor(Math.max(len1, len2) / 3);
        
        // Simple Levenshtein distance implementation
        const matrix: number[][] = Array(len1 + 1).fill(null).map(() => 
            Array(len2 + 1).fill(0)
        );

        for (let i = 0; i <= len1; i++) matrix[i][0] = i;
        for (let j = 0; j <= len2; j++) matrix[0][j] = j;

        for (let i = 1; i <= len1; i++) {
            for (let j = 1; j <= len2; j++) {
                const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
                matrix[i][j] = Math.min(
                    matrix[i - 1][j] + 1,
                    matrix[i][j - 1] + 1,
                    matrix[i - 1][j - 1] + cost
                );
            }
        }

        const distance = matrix[len1][len2];
        if (distance > maxDist) return 0;
        
        return 1 - (distance / Math.max(len1, len2));
    }

    private tokenizeQuery(query: string): string[] {
        // Handle quoted strings and field queries
        const parts: string[] = [];
        let current = '';
        let inQuotes = false;
        let inField = false;

        for (let i = 0; i < query.length; i++) {
            const char = query[i];
            
            if (char === '"') {
                inQuotes = !inQuotes;
                current += char;
            } else if (char === ':' && !inQuotes) {
                inField = true;
                current += char;
            } else if (/\s/.test(char) && !inQuotes && !inField) {
                if (current) {
                    parts.push(current);
                    current = '';
                }
            } else {
                current += char;
                if (char === ' ' && inField && this.hasCompletedFieldQuery(current)) {
                    inField = false;
                }
            }
        }

        if (current) {
            parts.push(current);
        }

        return parts;
    }

    private hasCompletedFieldQuery(text: string): boolean {
        // Check if we've completed a field:value or field:operator:value pattern
        const parts = text.split(':');
        return parts.length >= 2 && !text.endsWith(':');
    }

    private tokenizeText(text: string): string[] {
        return text
            .toLowerCase()
            .replace(/[^\w\s]/g, ' ')
            .split(/\s+/)
            .filter(term => term.length > 2);
    }

    private isFieldQuery(text: string): boolean {
        return /^[a-zA-Z_]+:/.test(text);
    }
}

export const catalogueSearchService = new CatalogueSearchService();