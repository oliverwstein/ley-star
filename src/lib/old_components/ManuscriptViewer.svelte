<!-- src/lib/components/ManuscriptViewer.svelte -->

<script lang="ts">
    import { fade } from 'svelte/transition';
    import { onMount, onDestroy } from 'svelte';
    import SearchPagesPanel from './SearchPagesPanel.svelte';
    import ManuscriptSummary from './ManuscriptSummary.svelte';

    interface PhysicalDescription {
        material: string;
        dimensions: string;
        condition: string;
        layout: string;
        script_type: string;
        decoration: string;
    }

    interface Summary {
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

    interface TableOfContentsEntry {
        title: string;
        description: string;
        page_number: number;
        level: number;
    }

    interface TranscriptionInfo {
        successful_pages: number;
        failed_pages: string[];
        last_updated: string;
    }

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

    interface Manuscript {
        title: string;
        record_id: string;
        metadata: Record<string, string | string[]>;
        total_pages: number;
        transcribed: boolean;
        transcription_info?: TranscriptionInfo;
        pages?: PageData[];
        summary?: Summary;
        table_of_contents?: TableOfContentsEntry[];
    }

    export let title: string;
    const apiUrl = 'http://127.0.0.1:5000';
    
    let manuscript: Manuscript | null = null;
    let manuscriptLoading = true;
    let manuscriptError: string | null = null;
    let pages: PageData[] = [];
    let eventSource: EventSource | null = null;
    let generatingSummary = false;

    async function generateSummary() {
        if (!manuscript || generatingSummary) return;
        
        generatingSummary = true;
        try {
            const response = await fetch(
                `${apiUrl}/manuscripts/${encodeURIComponent(manuscript.title)}/generate-summary`,
                { method: 'POST' }
            );
            
            if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
            
            const data = await response.json();
            manuscript = {
                ...manuscript,
                summary: data.summary,
                table_of_contents: data.table_of_contents
            };
        } catch (e) {
            manuscriptError = e instanceof Error ? e.message : 'Failed to generate summary';
            console.error("Summary generation error:", e);
        } finally {
            generatingSummary = false;
        }
    }

    async function loadTranscriptionData() {
        try {
            const response = await fetch(
                `${apiUrl}/manuscripts/${encodeURIComponent(title)}/transcription`
            );
            if (!response.ok) throw new Error(`Failed to fetch transcription: ${response.status}`);
            
            const transcriptionData = await response.json();
            
            if (typeof transcriptionData.pages !== 'object' || transcriptionData.pages === null) {
                throw new Error('Invalid transcription data: pages is not an object.');
            }
            
            pages = Object.values(transcriptionData.pages) as PageData[];
            pages.sort((a, b) => {
                const pageA = a.page_number ? parseInt(a.page_number.toString()) : 0;
                const pageB = b.page_number ? parseInt(b.page_number.toString()) : 0;
                return pageA - pageB;
            });

        } catch (e) {
            manuscriptError = e instanceof Error ? e.message : 'Failed to load transcription data';
            console.error('Transcription loading error:', e);
            pages = [];
        }
    }

    async function loadManuscript() {
        manuscriptLoading = true;
        manuscriptError = null;
        
        try {
            const response = await fetch(`${apiUrl}/manuscripts/${encodeURIComponent(title)}`);
            if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
            
            const manuscriptData = await response.json() as Manuscript;
            manuscript = manuscriptData;

            if ((manuscriptData.transcription_info?.successful_pages ?? 0) > 0) {
                await loadTranscriptionData();
            }

            initializeStatusStream();
        } catch (e) {
            manuscriptError = e instanceof Error ? e.message : 'An unknown error occurred';
            console.error("Error loading manuscript:", e);
            manuscript = null;
        } finally {
            manuscriptLoading = false;
        }
    }

    function initializeStatusStream() {
        eventSource?.close();
        
        eventSource = new EventSource(
            `${apiUrl}/manuscripts/${encodeURIComponent(title)}/status`
        );

        eventSource.onmessage = async (event) => {
            try {
                const status = JSON.parse(event.data);
                if (manuscript) {
                    let shouldUpdate = false;

                    if (status.successful_pages > 0 && 
                        (status.successful_pages !== (manuscript.transcription_info?.successful_pages ?? 0))) {
                        shouldUpdate = true;
                    }
                    if (status.failed_pages && 
                        status.failed_pages.length !== (manuscript.transcription_info?.failed_pages?.length ?? 0)) {
                        shouldUpdate = true;
                    }
                    
                    if (shouldUpdate) {
                        manuscript = {
                            ...manuscript,
                            transcribed: status.successful_pages > 0,
                            transcription_info: {
                                successful_pages: status.successful_pages,
                                failed_pages: status.failed_pages || [],
                                last_updated: new Date().toISOString()
                            }
                        };

                        if (status.successful_pages > 0) {
                            await loadTranscriptionData();
                        }
                    }

                    if (status.successful_pages >= manuscript.total_pages) {
                        eventSource?.close();
                        eventSource = null;
                    }
                }
            } catch (e) {
                console.error("Error processing status update:", e);
            }
        };

        eventSource.onerror = (error) => {
            console.error("SSE connection error:", error);
            eventSource?.close();
            eventSource = null;
            setTimeout(initializeStatusStream, 5000);
        };
    }

    async function startTranscription() {
        if (!manuscript) return;
        
        try {
            const response = await fetch(
                `${apiUrl}/manuscripts/${encodeURIComponent(manuscript.title)}/transcribe`,
                { method: 'POST' }
            );
            
            if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
            
            initializeStatusStream();
        } catch (e) {
            manuscriptError = e instanceof Error ? e.message : 'Transcription failed';
            console.error("Transcription error:", e);
        }
    }

    function formatMetadataValue(value: string | string[]): string {
        if (Array.isArray(value)) {
            return value.join(', ');
        }
        return value;
    }

    onMount(() => {
        if (title) {
            loadManuscript();
        }
    });

    onDestroy(() => {
        if (eventSource) {
            eventSource.close();
            eventSource = null;
        }
    });
</script>

<div class="container" transition:fade>
    <nav class="breadcrumbs">
        <a href="/manuscripts">← Back to Manuscripts</a>
    </nav>

    {#if manuscriptLoading}
        <div class="loading">Loading manuscript details...</div>
    {:else if manuscriptError}
        <div class="error">Error: {manuscriptError}</div>
    {:else if manuscript}
        <div class="manuscript-viewer">
            <header>
                <div class="header-content">
                    <div class="title-section">
                        <h1>{manuscript.title}</h1>
                        <div class="record-id">Record ID: {manuscript.record_id}</div>
                    </div>
                    <a 
                        href="/manuscripts/{encodeURIComponent(manuscript.title)}/pages" 
                        class="view-pages-button"
                    >
                        View Pages
                    </a>
                </div>
            </header>

            <div class="content">
                {#if (manuscript.transcription_info?.successful_pages ?? 0) > 0}
                    <ManuscriptSummary
                        summary={manuscript.summary}
                        tableOfContents={manuscript.table_of_contents}
                        {title}
                        generating={generatingSummary}
                        onGenerate={generateSummary}
                    />
                    {#if pages.length > 0}
                        <SearchPagesPanel {pages} {title} />
                    {/if}
                {/if}

                <section class="metadata">
                    <h2>Manuscript Details</h2>
                    <div class="metadata-grid">
                        {#each Object.entries(manuscript.metadata) as [key, value]}
                            {#if !['Title', 'Record ID'].includes(key)}
                                <div class="metadata-item">
                                    <dt>{key}</dt>
                                    <dd>{formatMetadataValue(value)}</dd>
                                </div>
                            {/if}
                        {/each}
                    </div>
                </section>

                <section class="transcription-status">
                    <h2>Transcription Status</h2>
                    <div class="status-card">
                        <div class="status-item">
                            <span class="label">Total Pages</span>
                            <span class="value">{manuscript.total_pages}</span>
                        </div>

                        {#if manuscript.transcribed}
                            <div class="status-item">
                                <span class="label">Pages Transcribed</span>
                                <span class="value">
                                    {manuscript.transcription_info?.successful_pages ?? 0}/{manuscript.total_pages}
                                </span>
                            </div>

                            {#if manuscript.transcription_info?.failed_pages?.length}
                                <div class="status-item error">
                                    <span class="label">Failed Pages</span>
                                    <span class="value">
                                        {manuscript.transcription_info.failed_pages.join(', ')}
                                    </span>
                                </div>
                            {/if}

                            {#if manuscript.transcription_info?.last_updated}
                                <div class="status-item">
                                    <span class="label">Last Updated</span>
                                    <span class="value">
                                        {new Date(manuscript.transcription_info.last_updated).toLocaleString()}
                                    </span>
                                </div>
                            {/if}
                        {:else}
                            <div class="status-item">
                                <span class="status-text">Not yet transcribed</span>
                            </div>
                        {/if}

                        {#if !manuscript.transcribed || 
                            (manuscript.transcription_info?.successful_pages ?? 0) < manuscript.total_pages}
                            <button 
                                class="transcribe-button"
                                on:click={startTranscription}
                            >
                                {manuscript.transcribed ? 'Continue transcription' : 'Start transcription'}
                            </button>
                        {/if}
                    </div>
                </section>
            </div>
        </div>
    {:else}
        <div class="error">Manuscript not found</div>
    {/if}
</div>
<style>
    .container {
        max-width: 1200px;
        margin: 0 auto;
        padding: 2rem;
    }

    .breadcrumbs {
        margin-bottom: 2rem;
        background-color: rgba(255, 255, 255, 0.9);
        backdrop-filter: blur(4px);
        padding: 0.75rem 1rem;
        border-radius: 0.5rem;
    border: 1px solid rgba(229, 231, 235, 0.8);
    }

    .breadcrumbs a {
        color: #4a9eff;
        text-decoration: none;
        font-weight: 500;
    }

    .breadcrumbs a:hover {
        text-decoration: underline;
    }

    .loading {
        text-align: center;
        padding: 2rem;
        color: #666;
    }

    .error {
        color: #e53e3e;
        padding: 1rem;
        background: #fff5f5;
        border-radius: 0.5rem;
        margin: 1rem 0;
    }

    .manuscript-viewer {
        background: white;
        border-radius: 8px;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        overflow: hidden;
    }

    header {
        padding: 1.5rem;
        border-bottom: 1px solid #eee;
    }

    .header-content {
        display: flex;
        justify-content: space-between;
        align-items: center;
    }

    .title-section {
        flex: 1;
    }

    h1 {
        font-size: 1.5rem;
        font-weight: bold;
        margin: 0;
    }

    .record-id {
        color: #666;
        font-size: 0.875rem;
        margin-top: 0.5rem;
    }

    .view-pages-button {
        padding: 0.5rem 1rem;
        background: #4a9eff;
        color: white;
        text-decoration: none;
        border-radius: 0.25rem;
        font-weight: 500;
        transition: background-color 0.2s;
        white-space: nowrap;
        margin-left: 1rem;
    }

    .view-pages-button:hover {
        background: #3182ce;
    }

    .content {
        padding: 1.5rem;
    }

    h2 {
        font-size: 1.25rem;
        font-weight: bold;
        margin-bottom: 1rem;
    }

    .metadata-grid {
        display: grid;
        gap: 1rem;
    }

    .metadata-item {
        display: grid;
        gap: 0.25rem;
    }

    .metadata-item dt {
        color: #666;
        font-size: 0.875rem;
    }

    .metadata-item dd {
        font-size: 1rem;
    }

    .transcription-status {
        margin-top: 2rem;
    }

    .status-card {
        background: #f9fafb;
        padding: 1.5rem;
        border-radius: 0.5rem;
        display: grid;
        gap: 1rem;
    }

    .status-item {
        display: grid;
        gap: 0.25rem;
    }

    .status-item .label {
        color: #666;
        font-size: 0.875rem;
    }

    .status-item .value {
        font-size: 1.25rem;
        font-weight: 500;
    }

    .status-item.error {
        color: #e53e3e;
    }

    .transcribe-button {
        margin-top: 1rem;
        padding: 0.5rem 1rem;
        background: #4a9eff;
        color: white;
        border: none;
        border-radius: 0.25rem;
        cursor: pointer;
        font-size: 0.875rem;
        transition: background-color 0.2s;
    }

    .transcribe-button:hover {
        background: #3182ce;
    }
</style>