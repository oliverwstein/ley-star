// src/lib/search/catalogueSearch.ts

import type { ManuscriptListing } from '$lib/types/catalogue';

class CatalogueSearchEngine {
    private manuscripts: ManuscriptListing[];
    private searchableContent: Map<string, string>;

    constructor(manuscripts: ManuscriptListing[]) {
        this.manuscripts = manuscripts;
        this.searchableContent = new Map();
        this.prepareSearchableContent();
    }

    private prepareSearchableContent() {
        for (const manuscript of this.manuscripts) {
            const contentParts = [
                manuscript.summary?.contents_summary,
                manuscript.summary?.historical_context,
                manuscript.summary?.significance,
                manuscript.summary?.themes?.join(' '),
                manuscript.table_of_contents?.map(entry => 
                    `${entry.title} ${entry.description} ${entry.synopsis}`
                ).join(' ')
            ].filter(Boolean);

            this.searchableContent.set(
                manuscript.id,
                contentParts.join(' ').toLowerCase()
            );
        }
    }

    search(query: string): ManuscriptListing[] {
        const normalizedQuery = query.toLowerCase();
        const terms = normalizedQuery.split(/\s+/);
        
        return this.manuscripts
            .map(manuscript => {
                const content = this.searchableContent.get(manuscript.id) || '';
                let score = 0;
                
                for (const term of terms) {
                    const regex = new RegExp(term, 'g');
                    const matches = content.match(regex);
                    if (matches) {
                        score += matches.length;
                    }
                }
                
                return { manuscript, score };
            })
            .filter(({ score }) => score > 0)
            .sort((a, b) => b.score - a.score)
            .map(({ manuscript }) => manuscript);
    }
}

export type { CatalogueSearchEngine };

export function createCatalogueSearch(manuscripts: ManuscriptListing[]): CatalogueSearchEngine {
    return new CatalogueSearchEngine(manuscripts);
}