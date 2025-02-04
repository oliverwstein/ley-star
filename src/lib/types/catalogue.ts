// src/lib/types/catalogue.ts

export interface ManuscriptListing {
    id: string;
    title: string;
    total_pages: number;
    transcribed: boolean;
    transcription_info?: {
        successful_pages: number;
        failed_pages: string[];
        last_updated: string;
    };
    summary?: {
        title: string;
        date_range: [number, number];
        languages: string[];
        themes: string[];
        contents_summary: string;
        historical_context: string;
        significance: string;
    };
    table_of_contents?: TableOfContentsEntry[];
}

export interface TableOfContentsEntry {
    title: string;
    page_number: number;
    level: number;
    description: string;
    synopsis: string;
}