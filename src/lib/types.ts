// src/lib/types.ts
export interface PhysicalDescription {
    material: string;
    dimensions: string;
    condition: string;
    layout: string;
    script_type: string;
    decoration: string;
}

export interface Summary {
    title: string;
    alternative_titles: string[];
    shelfmark: string;
    repository: string;
    date_range: [number, number];
    languages: string[];
    scribes: string[];
    physical_description: PhysicalDescription;
    contents_summary: string;
    historical_context: string;
    significance: string;
    themes: string[];
    provenance: string[];
}

export interface TranscriptionInfo {
    successful_pages: number;
    failed_pages: string[];
    last_updated: string;
}

export interface Manuscript {
    title: string;
    record_id: string;
    metadata: Record<string, string | string[]>;
    total_pages: number;
    transcribed: boolean;
    transcription_info?: TranscriptionInfo;
    pages?: Record<string, PageData>;
    summary?: Summary;
    table_of_contents?: TableOfContentsEntry[];
}

export interface PageData {
    page_number?: number;
    transcription?: string;
    revised_transcription?: string;
    summary?: string;
    keywords?: string[];
    marginalia?: string[];
    transcription_notes?: string;
    content_notes?: string;
}

export interface TableOfContentsEntry {
    title: string;
    description: string;
    page_number: number;
    level: number;
}