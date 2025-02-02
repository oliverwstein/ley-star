<!-- src/lib/components/PageInfo.svelte -->
<script lang="ts">
    import { fade, fly } from 'svelte/transition';
    import { onDestroy } from 'svelte';
    
    interface PageData {
        transcription?: string;
        revised_transcription?: string;
        summary?: string;
        keywords?: string[];
        marginalia?: string[];
        confidence?: number;
        page_number?: number;
    }

    export let pageData: PageData;
    export let onClose: () => void;
    export let title: string;

    let showRevised = false;
    let isRetranscribing = false;
    let retranscribeError: string | null = null;
    let eventSource: EventSource | null = null;

    const apiUrl = 'http://127.0.0.1:5000';

    function toggleTranscription() {
        showRevised = !showRevised;
    }

    function handleKeydown(event: KeyboardEvent) {
        if (event.key === 'Escape') {
            onClose();
        }
    }

    function formatTranscription(text: string | undefined) {
        if (!text) return '';
        
        return text
            .replace(/\r\n/g, '\n')
            .replace(/\\n/g, '\n')
            .replace(/\|\n|\n\|/g, '\n')
            .replace(/\|/g, '\n')
            .replace(/\n+/g, '\n')
            .split('\n')
            .map(line => line.trim())
            .join('\n')
            .trim();
    }

    async function fetchUpdatedPageData(): Promise<PageData | null> {
        try {
            const response = await fetch(
                `${apiUrl}/manuscripts/${encodeURIComponent(title)}/pages/${pageData.page_number}`
            );
            if (!response.ok) throw new Error('Failed to fetch updated page data');
            return await response.json();
        } catch (error) {
            console.error('Error fetching updated page data:', error);
            return null;
        }
    }

    function initializeStatusStream() {
        if (!pageData.page_number) return;

        eventSource?.close();
        eventSource = new EventSource(
            `${apiUrl}/manuscripts/${encodeURIComponent(title)}/pages/${pageData.page_number}/status`
        );

        eventSource.onmessage = async (event) => {
            try {
                const status = JSON.parse(event.data);
                if (!status.error) {
                    // Update the page data with the latest transcription
                    const updatedData = await fetchUpdatedPageData();
                    if (updatedData) {
                        pageData = updatedData;
                        isRetranscribing = false;
                    }
                }
            } catch (error) {
                console.error('Error processing status update:', error);
            }
        };

        eventSource.onerror = () => {
            console.error('Status stream error');
            eventSource?.close();
            eventSource = null;
        };
    }

    async function retranscribePage() {
        if (!pageData.page_number) {
            retranscribeError = 'Page number not available';
            return;
        }

        isRetranscribing = true;
        retranscribeError = null;

        try {
            const response = await fetch(
                `${apiUrl}/manuscripts/${encodeURIComponent(title)}/pages/${pageData.page_number}/transcribe`, 
                { method: 'POST' }
            );
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to retranscribe page');
            }

            // Initialize status stream to get updates
            initializeStatusStream();

        } catch (error) {
            retranscribeError = error instanceof Error ? error.message : 'An unknown error occurred';
            isRetranscribing = false;
        }
    }

    // Cleanup on component destruction
    onDestroy(() => {
        if (eventSource) {
            eventSource.close();
            eventSource = null;
        }
    });
</script>

<svelte:window on:keydown={handleKeydown}/>
<div 
    class="overlay"
    role="dialog"
    aria-modal="true"
    tabindex="-1"
    transition:fade={{duration: 200}}
>
    <div 
        class="info-panel"
        role="document"
        transition:fly={{y: 20, duration: 200}}
    >
        <button 
            class="close-button" 
            on:click={onClose}
            aria-label="Close page information"
        >
            ×
        </button>
        
        {#if pageData.transcription || pageData.revised_transcription}
            <section class="info-section">
                <div class="section-header">
                    <h3>Transcription</h3>
                    {#if pageData.revised_transcription}
                        <button 
                            class="toggle-button" 
                            on:click={toggleTranscription}
                        >
                            {showRevised ? 'Show Original' : 'Show Revised'}
                        </button>
                    {/if}
                </div>
                <pre class="transcription">
                    {formatTranscription(showRevised && pageData.revised_transcription 
                        ? pageData.revised_transcription 
                        : pageData.transcription)}
                </pre>
            </section>
        {/if}

        {#if pageData.summary}
            <section class="info-section">
                <h3>Summary</h3>
                <p>{pageData.summary}</p>
            </section>
        {/if}

        {#if pageData.marginalia?.length}
            <section class="info-section">
                <h3>Marginalia</h3>
                <ul class="marginalia-list">
                    {#each pageData.marginalia as note}
                        <li>{note}</li>
                    {/each}
                </ul>
            </section>
        {/if}

        {#if pageData.keywords?.length}
            <section class="info-section">
                <h3>Keywords</h3>
                <div class="keywords">
                    {#each pageData.keywords as keyword}
                        <span class="keyword">{keyword}</span>
                    {/each}
                </div>
            </section>
        {/if}

        {#if pageData.confidence}
            <div class="confidence">
                Confidence: {pageData.confidence}%
            </div>
        {/if}

        <div class="retranscribe-section">
            <button 
                class="retranscribe-button"
                on:click={retranscribePage}
                disabled={isRetranscribing}
            >
                {isRetranscribing ? 'Retranscribing...' : 'Retranscribe Page'}
            </button>
            {#if retranscribeError}
                <p class="error-message">{retranscribeError}</p>
            {/if}
        </div>
    </div>
</div>

<style>
    .overlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 1000;
        overflow: hidden;
    }

    .info-panel {
        background: white;
        border-radius: 8px;
        padding: 2rem;
        width: 90%;
        max-width: 800px;
        max-height: 90vh;
        overflow-y: auto;
        position: relative;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    }

    .close-button {
        position: absolute;
        top: 1rem;
        right: 1rem;
        border: none;
        background: none;
        font-size: 1.5rem;
        cursor: pointer;
        padding: 0.5rem;
        line-height: 1;
        color: #666;
        transition: color 0.2s;
    }

    .close-button:hover {
        color: #000;
    }

    .info-section {
        margin-bottom: 2rem;
    }

    .section-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 1rem;
    }

    h3 {
        font-size: 1.25rem;
        font-weight: bold;
        margin: 0;
    }

    .transcription {
        font-family: monospace;
        white-space: pre-wrap;
        background: #f5f5f5;
        padding: 1rem;
        border-radius: 4px;
        margin: 0;
        line-height: 1.5;
        overflow-x: auto;  /* Allow horizontal scrolling if needed */
    }

    .toggle-button {
        padding: 0.25rem 0.75rem;
        background: #4a9eff;
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-size: 0.875rem;
        transition: background-color 0.2s;
    }

    .toggle-button:hover {
        background: #3182ce;
    }

    .marginalia-list {
        list-style-type: none;
        padding: 0;
        margin: 0;
    }

    .marginalia-list li {
        margin-bottom: 0.5rem;
        padding: 0.5rem;
        background: #f5f5f5;
        border-radius: 4px;
    }

    .keywords {
        display: flex;
        flex-wrap: wrap;
        gap: 0.5rem;
    }

    .keyword {
        background: #e5e7eb;
        padding: 0.25rem 0.75rem;
        border-radius: 999px;
        font-size: 0.875rem;
    }

    .confidence {
        margin-top: 1rem;
        padding-top: 1rem;
        border-top: 1px solid #e5e7eb;
        color: #666;
        font-size: 0.875rem;
    }
    .retranscribe-section {
        margin-top: 1rem;
        display: flex;
        flex-direction: column;
        align-items: center;
    }

    .retranscribe-button {
        padding: 0.5rem 1rem;
        background: #4a9eff;
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        transition: background-color 0.2s;
        margin-bottom: 0.5rem;
    }

    .retranscribe-button:hover:not(:disabled) {
        background: #3182ce;
    }

    .retranscribe-button:disabled {
        background: #9ca3af;
        cursor: not-allowed;
    }

    .error-message {
        color: #e53e3e;
        font-size: 0.875rem;
        margin: 0;
    }
</style>