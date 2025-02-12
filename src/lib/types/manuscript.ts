// src/lib/types/manuscript.ts



export interface ManuscriptMetadata {
    id: string;
    title: string;
    shelfmark: string;
    repository: string;
    alternative_titles: string[];
    date_range: [number, number];
    languages: string[];
    scribes: string[];
    authors: string[];
    contents_summary: string;
    historical_context: string;
    physical_description: PhysicalDescription;
    themes: string[];
    provenance: string[];
    total_pages: number;
    origin_location: string;
    coordinates: [number, number];
    transcribed_pages: any;
    transcription_status: TranscriptionStatus;
    technical_metadata?: {
        image_quality?: string;
        special_features?: string;
        restoration_history?: string;
    };
}

export interface PhysicalDescription {
    material: string;
    dimensions: string;
    condition: string;
    layout: {
        columns_per_page?: number;
        lines_per_page?: string;
        ruling_pattern?: string;
    };
    script_type: string;
    decoration: {
        illuminations?: string;
        artistic_style?: string;
    };
}

export interface TranscriptionStatus {
    status: 'not_started' | 'in_progress' | 'partial' | 'completed' | 'error' | 'queued';
    transcribed_pages: number;
    total_pages: number;
    successful_pages?: number;
    failed_pages?: number[];
    last_updated?: string;
    error?: string;
}

export interface TextSection {
    name: string;
    text: string;
}

export interface Illustration {
    location: string;
    description: string;
    dimensions?: string;
}

export interface MarginalNote {
    location: string;
    text: string;
    hand?: string;
}

export interface Note {
    type: string;
    text: string;
    location?: string;
}

export interface PageTranscription {
    body: TextSection[];
    illustrations?: Illustration[];
    marginalia?: MarginalNote[];
    notes?: Note[];
    language: string;
    transcription_notes: string;
}

export interface PageData {
    page_number: number;
    transcription?: PageTranscription;
    confidence?: number;
}

export interface TableOfContentsEntry {
    title: string;
    description: string;
    page_number: number;
    level: number;
}

export interface Manuscript {
    metadata: ManuscriptMetadata;
    transcription_status: TranscriptionStatus;
    pages?: Record<string, PageData>;
    table_of_contents?: TableOfContentsEntry[];
}

// API Response Types
export interface TranscriptionResponse {
    status: 'success' | 'error';
    data?: PageTranscription;
    error?: string;
}

export interface ManuscriptSearchResult {
    manuscript_id: string;
    title: string;
    score: number;
    metadata: Partial<ManuscriptMetadata>;
}

export interface SearchResponse {
    results: ManuscriptSearchResult[];
    total: number;
}

// Event Types from Server
export type CatalogueEventType = 
    | 'transcription_started'
    | 'transcription_page_complete'
    | 'transcription_complete'
    | 'transcription_error'
    | 'processing_started'
    | 'processing_complete'
    | 'processing_error'
    | 'metadata_updated'
    | 'error_occurred';

export interface CatalogueEvent {
    type: CatalogueEventType;
    manuscript_id: string;
    timestamp: string;
    data: Record<string, any>;
    error?: string;
}