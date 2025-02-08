<!-- src/lib/components/ManuscriptViewer.svelte -->
<script lang="ts">
    import { fade } from 'svelte/transition';
    import { onMount, onDestroy } from 'svelte';
    import SearchPagesPanel from './SearchPagesPanel.svelte';
    import ManuscriptSummary from './ManuscriptSummary.svelte';
    import type { Manuscript, PageData, Summary, TableOfContentsEntry } from '$lib/types';

    export let id: string;
    
    const apiUrl = 'http://127.0.0.1:5000';
    
    let manuscript: Manuscript | null = null;
    let manuscriptLoading = true;
    let manuscriptError: string | null = null;
    let pages: PageData[] = [];
    let eventSource: EventSource | null = null;
    let generatingSummary = false;
    let transcriptionNotes = '';

    async function generateSummary() {
        if (!manuscript || generatingSummary) return;
        
        generatingSummary = true;
        try {
            const response = await fetch(
                `${apiUrl}/manuscripts/${manuscript.id}/summarize`,
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
            console.log(`Loading page data for manuscript ${id}`);
            const response = await fetch(`${apiUrl}/manuscripts/${id}/pages`);
            
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Failed to fetch pages: ${response.status}, ${errorText}`);
            }
            
            const pageData = await response.json();
            
            if (pageData) {
                pages = Object.values(pageData);
                pages.sort((a, b) => a.page_number - b.page_number);
                console.log(`Loaded ${pages.length} pages`);
                
            }
        } catch (e) {
            manuscriptError = e instanceof Error ? e.message : 'Failed to load page data';
            console.error('Page loading error:', e);
            pages = [];
        }
    }

    async function loadManuscript() {
        manuscriptLoading = true;
        manuscriptError = null;
        
        try {
            // Get manuscript info
            const response = await fetch(`${apiUrl}/manuscripts/${id}/info`);
            if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
            
            const manuscriptData = await response.json();
            manuscript = manuscriptData;

            // Get and set pages data
            const pagesResponse = await fetch(`${apiUrl}/manuscripts/${id}/pages`);
            if (pagesResponse.ok) {
                const pageData = await pagesResponse.json();
                
                if (pageData && Object.keys(pageData).length > 0) {
                    manuscript!.pages = pageData;
                    // Transform the page data to include page numbers
                    pages = Object.entries(pageData).map(([pageNum, data]) => ({
                        ...data as PageData,
                        page_number: parseInt(pageNum)
                    }));
                    pages.sort((a, b) => a.page_number - b.page_number);
                    
                    // Update transcription info based on actual pages
                    if (!manuscript!.transcription_info) {
                        manuscript!.transcription_info = {
                            successful_pages: pages.length,
                            failed_pages: [],
                            last_updated: new Date().toISOString()
                        };
                    }
                    manuscript!.transcribed = pages.length > 0;
                } else {
                    console.log('No page data received');
                }
            } else {
                console.log('Pages request failed:', pagesResponse.status);
            }

        } catch (e) {
            manuscriptError = e instanceof Error ? e.message : 'An unknown error occurred';
            console.error("Error loading manuscript:", e);
            manuscript = null;
        } finally {
            manuscriptLoading = false;
        }
    }

    function initializeStatusStream() {
        // Close any existing connection
        if (eventSource) {
            console.log('Closing existing status stream');
            eventSource.close();
            eventSource = null;
        }
        
        console.log(`Initializing status stream for manuscript ${id}`);
        eventSource = new EventSource(`${apiUrl}/manuscripts/${id}/status`);

        eventSource.onopen = () => {
            console.log('Status stream connected');
        };

        eventSource.onmessage = async (event) => {
            try {
                const status = JSON.parse(event.data);
                console.log('Received status update:', status);
                
                if (manuscript && status.successful_pages !== manuscript.transcription_info?.successful_pages) {
                    console.log('Updating manuscript with new status');
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
            } catch (e) {
                console.error("Error processing status update:", e);
            }
        };

        eventSource.onerror = (error) => {
            console.error('Status stream error:', error);
            eventSource?.close();
            eventSource = null;
            
            // Only retry if we still have a manuscript and it's still loading
            if (manuscript && manuscriptLoading) {
                console.log('Retrying status stream connection in 5 seconds');
                setTimeout(initializeStatusStream, 5000);
            }
        };
    }

    async function startTranscription() {
        if (!manuscript) return;
        
        try {
            const response = await fetch(
                `${apiUrl}/manuscripts/${manuscript.id}/transcribe`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ notes: transcriptionNotes || "" })
                }
            );
            
            console.log('Transcription Response:', response);
            if (!response.ok) {
                const errorText = await response.text();
                console.error('Transcription Error Response:', errorText);
                throw new Error(errorText || 'Failed to start transcription');
            }
            
            initializeStatusStream();
        } catch (e) {
            console.error('Full Transcription Error:', e);
            manuscriptError = e instanceof Error ? e.message : 'Transcription failed';
        }
    }

    function formatMetadataValue(value: string | string[]): string {
        if (Array.isArray(value)) {
            return value.join(', ');
        }
        return value;
    }

    onMount(() => {
        if (id) {
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
                        href="/manuscripts/{manuscript.id}/pages" 
                        class="view-pages-button"
                    >
                        View Pages
                    </a>
                </div>
            </header>

            <div class="content">
                {#if manuscript}
                    <ManuscriptSummary
                        summary={manuscript.summary}
                        tableOfContents={manuscript.table_of_contents}
                        {id}
                        generating={generatingSummary}
                        onGenerate={generateSummary}
                    />
                    {#if pages.length > 0}
                        <SearchPagesPanel 
                        {pages} 
                        id = {manuscript.id} />
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
                                    {pages.length}/{manuscript.total_pages}
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

                        <div class="notes-input">
                            <label for="transcription-notes">Notes for transcription (optional):</label>
                            <textarea
                                id="transcription-notes"
                                bind:value={transcriptionNotes}
                                placeholder="Enter any notes or instructions for transcription..."
                                rows="3"
                            ></textarea>
                        </div>

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

    .notes-input {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
    }

    .notes-input label {
        font-size: 0.875rem;
        color: #4b5563;
    }

    .notes-input textarea {
        width: 100%;
        padding: 0.5rem;
        border: 1px solid #e5e7eb;
        border-radius: 4px;
        resize: vertical;
        font-family: inherit;
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

    .transcribe-button {
        padding: 0.75rem 1rem;
        background: #4a9eff;
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        transition: background-color 0.2s;
        font-weight: 500;
    }

    .transcribe-button:hover:not(:disabled) {
        background: #3182ce;
    }

    .transcribe-button:disabled {
        background: #9ca3af;
        cursor: not-allowed;
    }
</style>