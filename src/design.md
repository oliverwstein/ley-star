// Component Hierarchy

/**
 * Routes:
 * /manuscripts             -> CatalogueViewer
 * /manuscripts/[id]        -> ManuscriptViewer
 * /manuscripts/[id]/pages  -> PageViewer
 */

// 1. Catalogue View (Main manuscripts list)
CatalogueViewer.svelte
- Responsibility: Overall management of manuscripts catalogue
- State: List of manuscripts, search/filter state
- Imports: manuscriptService, ManuscriptListing[]
├── CatalogueSearch.svelte
│   - Responsibility: Search interface for manuscript metadata
│   - State: Search query, filters
│   - Props: onSearch callback
│
└── ManuscriptTable.svelte
    - Responsibility: Display manuscript listings
    - State: Sort order, pagination
    - Props: manuscripts[], sortInfo

// 2. Single Manuscript View
ManuscriptViewer.svelte
- Responsibility: Display and manage single manuscript
- State: Manuscript data, transcription status
- Imports: manuscriptService, Manuscript, CatalogueEvent
├── ManuscriptMetadata.svelte
│   - Responsibility: Display manuscript metadata
│   - Props: ManuscriptMetadata
│
├── PageSearch.svelte
│   - Responsibility: Search interface for page contents
│   - State: Search query, search options
│   - Props: onSearch callback
│
└── PageTable.svelte
    - Responsibility: Display manuscript pages and transcriptions
    - State: Sort order, visible columns
    - Props: PageData[], searchResults[]

// 3. Page View
PageViewer.svelte
- Responsibility: Page viewing and transcription
- State: Current page, transcription state
- Imports: manuscriptService, PageData
├── ImageViewer.svelte
│   - Responsibility: Display and navigate page images
│   - State: Zoom level, pan position
│   - Props: imageUrl, pageNumber
│
└── TranscriptionPanel.svelte
    - Responsibility: Display/edit page transcription
    - State: Edit mode, transcription progress
    - Props: PageTranscription, onTranscribe

/**
 * File Structure:
 * src/
 * ├── lib/
 * │   ├── components/
 * │   │   ├── catalogue/
 * │   │   │   ├── CatalogueSearch.svelte
 * │   │   │   └── ManuscriptTable.svelte
 * │   │   ├── manuscript/
 * │   │   │   ├── ManuscriptMetadata.svelte
 * │   │   │   ├── PageSearch.svelte
 * │   │   │   └── PageTable.svelte
 * │   │   └── page/
 * │   │       ├── ImageViewer.svelte
 * │   │       └── TranscriptionPanel.svelte
 * │   ├── services/
 * │   │   └── manuscript.service.ts
 * │   └── types/
 * │       └── manuscript.ts
 * └── routes/
 *     └── manuscripts/
 *         ├── +page.svelte              (CatalogueViewer)
 *         ├── [id]/
 *         │   ├── +page.svelte          (ManuscriptViewer)
 *         │   └── pages/
 *         │       └── +page.svelte      (PageViewer)
 *         └── +layout.svelte
 */

// Key naming conventions:
// - "Catalogue" refers to the collection of all manuscripts
// - "Manuscript" refers to a single manuscript and its metadata
// - "Page" refers to individual pages within a manuscript
// - Components are grouped by their primary domain (catalogue/manuscript/page)
// - Search components are prefixed with their domain
// - Table components indicate what they list (ManuscriptTable lists manuscripts, PageTable lists pages)