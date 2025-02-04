# Leystar Frontend Design Document

## Application Structure

### Routes
- `/`: Home/splash page
- `/manuscripts`: Manuscript catalogue and search interface
- `/manuscripts/[id]`: Individual manuscript details with tabbed interface
- `/manuscripts/[id]/pages?page=[number]`: Page viewer with URL-based navigation

### Core Components

## 1. Catalogue Interface (CatalogueExplorer.svelte)

The catalogue interface combines browsing and searching capabilities in a unified view.

Key Features:
- Title filter: Quick filtering by manuscript title, always visible and separate from main search
- Advanced search: Searches across summaries, tables of contents, and page keywords
- Result display: Table showing manuscript information including transcription status

API Integration:
```typescript
interface ManuscriptListing {
    id: string;
    title: string;
    totalPages: number;
    transcriptionStatus: {
        successfulPages: number;
        lastUpdated: string;
    };
    summary?: {
        dateRange?: [number, number];
        languages: string[];
        themes: string[];
        contents_summary: string;
    };
    table_of_contents?: TableOfContentsEntry[];
    pageKeywords?: string[]; // Aggregated from all pages
}

// Client-side search functionality
class CatalogueSearch {
    constructor(manuscripts: ManuscriptListing[]) {
        this.manuscripts = manuscripts;
        this.searchableContent = this.prepareSearchableContent();
    }

    prepareSearchableContent() {
        // Combines summary, ToC, and keywords into searchable text
        // Weights different content types appropriately
    }

    search(query: string): ManuscriptListing[] {
        // Performs fuzzy search across prepared content
    }

    filterByTitle(title: string): ManuscriptListing[] {
        // Simple case-insensitive title filtering
    }
}
```

## 2. Manuscript Details Interface (ManuscriptDetails.svelte)

### Information Tab
- Metadata section (always present)
- Summary and Table of Contents section
  - Generate/Regenerate button
  - Summary display including:
    - Historical context
    - Significance
    - Physical description
    - Content overview
  - Table of Contents with hierarchical display
- API Integration:
```typescript
interface ManuscriptSummary {
    title: string;
    metadata: Record<string, string>;
    summary?: {
        contents_summary: string;
        historical_context: string;
        significance: string;
        physical_description: {
            material: string;
            dimensions: string;
            condition: string;
            layout: string;
            script_type: string;
            decoration: string;
        };
    };
    table_of_contents?: TableOfContentsEntry[];
}

async function generateSummary(manuscriptId: string): Promise<ManuscriptSummary> {
    // Posts to /manuscripts/[id]/summarize
    // Returns updated manuscript information
}
```

### Search Tab (PageSearch.svelte)
- Client-side search across page content
- Results table with hover previews
- Keyword filtering capabilities
- API Integration:
```typescript
interface PageData {
    pageNumber: number;
    transcription?: string;
    revisedTranscription?: string;
    summary?: string;
    keywords?: string[];
    marginalia?: string[];
}

interface PagePreview {
    pageNumber: number;
    imageUrl: string;
}

class PageSearch {
    constructor(pages: PageData[]) {
        this.pages = pages;
        this.searchableContent = this.prepareSearchableContent();
    }

    search(query: string): PageSearchResult[] {
        // Returns matching pages with relevance scores
    }

    getPagePreview(pageNumber: number): PagePreview {
        // Generates preview URL and metadata
    }
}
```

## 3. Page Viewer Interface (PageViewer.svelte)

- URL-based navigation (?page=[number])
- Image display with pan/zoom capabilities
- Transcription display
- Navigation controls
- API Integration:
```typescript
interface PageViewData {
    pageNumber: number;
    imageUrl: string;
    transcription?: string;
    revisedTranscription?: string;
    summary?: string;
    keywords?: string[];
    marginalia?: string[];
}

async function fetchPageData(manuscriptId: string, pageNumber: number): Promise<PageViewData> {
    // Gets page data and constructs image URL
}
```

## Implementation Notes

1. Data Loading:
- Load manuscript listings on catalogue page mount
- Preload next/previous page data in page viewer
- Cache search indices for active manuscript

2. Search Optimization:
- Build search indices when data is loaded
- Use debouncing for search input
- Cache search results when possible

3. Image Handling:
- Lazy load images in tables and previews
- Use appropriate image sizing for previews
- Implement progressive loading for main page viewer

4. State Management:
- Use Svelte stores for manuscript and page data
- Maintain navigation history for back/forward functionality
- Persist search parameters in URL

This design focuses on core functionality while maintaining a professional and intuitive user interface. The integration of summaries and table of contents into the search functionality will provide more meaningful search results, while the addition of page previews will improve the user experience when searching through manuscript content.

src/
├── lib/
│   ├── api/
│   │   ├── catalogue.ts        # Catalogue API functions
│   │   ├── manuscripts.ts      # Individual manuscript API functions
│   │   └── pages.ts           # Page-related API functions
│   │
│   ├── components/
│   │   ├── catalogue/
│   │   │   ├── CatalogueExplorer.svelte    # Main catalogue interface
│   │   │   ├── ManuscriptList.svelte       # List display of manuscripts
│   │   │   └── SearchBar.svelte            # Title filter and search interface
│   │   │
│   │   ├── manuscript/
│   │   │   ├── InfoTab.svelte              # Information tab content
│   │   │   ├── ManuscriptTabs.svelte       # Tab container
│   │   │   ├── MetadataSection.svelte      # Metadata display
│   │   │   ├── PageSearch.svelte           # Page search interface
│   │   │   ├── SearchTab.svelte            # Search tab content
│   │   │   └── SummarySection.svelte       # Summary and ToC display
│   │   │
│   │   ├── page/
│   │   │   ├── ImageViewer.svelte          # Page image display
│   │   │   ├── Navigation.svelte           # Page navigation controls
│   │   │   ├── PagePreview.svelte          # Hover preview component
│   │   │   └── TranscriptionPanel.svelte   # Transcription display
│   │   │
│   │   └── shared/
│   │       ├── Button.svelte               # Reusable button component
│   │       ├── LoadingSpinner.svelte       # Loading indicator
│   │       └── Modal.svelte                # Modal dialog component
│   │
│   ├── search/
│   │   ├── CatalogueSearch.ts              # Catalogue search implementation
│   │   └── PageSearch.ts                   # Page search implementation
│   │
│   ├── stores/
│   │   ├── catalogue.ts                    # Catalogue state management
│   │   ├── manuscript.ts                   # Current manuscript state
│   │   └── page.ts                         # Page viewer state
│   │
│   ├── types/
│   │   ├── catalogue.ts                    # Catalogue-related types
│   │   ├── manuscript.ts                   # Manuscript-related types
│   │   └── page.ts                         # Page-related types
│   │
│   └── utils/
│       ├── imageUtils.ts                   # Image handling utilities
│       └── searchUtils.ts                  # Search helper functions
│
├── routes/
│   ├── +layout.svelte                      # Root layout
│   ├── +HomePage.svelte                        # Home page
│   │
│   ├── manuscripts/
│   │   ├── CatalogueViewer.svelte           # Catalogue page
│   │   │
│   │   ├── [id]/
│   │   │   ├── ManuscriptViewer.svelte      # Manuscript details page
│   │   │   │
│   │   │   └── pages/
│   │   │       └── PageViewer.svelte  # Page viewer page
│   │   │
│   │   └── +page.server.ts                # Server-side manuscript loading
│   │
│   └── +error.svelte                       # Error page
│
└── app.html                                # Root HTML template