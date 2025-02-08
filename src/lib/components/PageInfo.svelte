<!-- src/lib/components/PageInfo.svelte -->
<script lang="ts">
    import { fade, fly } from 'svelte/transition';
    import { onDestroy } from 'svelte';
    import { safeMarkdown } from '$lib/utils/markdown';
    import type { PageData } from '$lib/types';

    export let pageData: PageData;
    export let onClose: () => void;
    export let id: string;

    let showRevised = false;
    let isTranscribing = false;
    let transcribeError: string | null = null;
    let eventSource: EventSource | null = null;
    let transcriptionNotes = '';

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
                `${apiUrl}/manuscripts/${id}/pages/${pageData.page_number}`
            );
            if (!response.ok) throw new Error('Failed to fetch updated page data');
            return await response.json();
        } catch (error) {
            console.error('Error fetching updated page data:', error);
            return null;
        }
    }

    async function transcribePage() {
        if (!pageData.page_number) {
            transcribeError = 'Page number not available';
            return;
        }

        isTranscribing = true;
        transcribeError = null;

        try {
            const response = await fetch(
                `${apiUrl}/manuscripts/${id}/pages/${pageData.page_number}/transcribe`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ notes: transcriptionNotes })
                }
            );
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to transcribe page');
            }

            const result = await response.json();
            if (result.data) {
                pageData = result.data;
            }

        } catch (error) {
            transcribeError = error instanceof Error ? error.message : 'An unknown error occurred';
        } finally {
            isTranscribing = false;
        }
    }

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
                    <div class="header-content">
                        <h3>Transcription</h3>
                        {#if pageData.transcription_notes}
                            <span 
                                class="notes-indicator" 
                                title={safeMarkdown(pageData.transcription_notes)}
                            >
                                i
                            </span>
                        {/if}
                    </div>
                    {#if pageData.revised_transcription}
                        <button 
                            class="toggle-button" 
                            on:click={toggleTranscription}
                        >
                            {showRevised ? 'Show Original' : 'Show Revised'}
                        </button>
                    {/if}
                </div>
                <div class="transcription">
                    {@html safeMarkdown(formatTranscription(
                        showRevised && pageData.revised_transcription 
                            ? pageData.revised_transcription 
                            : pageData.transcription
                    ))}
                </div>
            </section>
        {/if}

        {#if pageData.summary}
            <section class="info-section">
                <h3>Summary</h3>
                <div class="content-block">
                    {@html safeMarkdown(pageData.summary)}
                </div>
            </section>
        {/if}

        {#if pageData.content_notes}
            <section class="info-section">
                <h3>Content Notes</h3>
                <div class="content-block">
                    {@html safeMarkdown(pageData.content_notes)}
                </div>
            </section>
        {/if}

        {#if pageData.marginalia?.length}
            <section class="info-section">
                <h3>Marginalia</h3>
                <ul class="marginalia-list">
                    {#each pageData.marginalia as note}
                        <li>{@html safeMarkdown(note)}</li>
                    {/each}
                </ul>
            </section>
        {/if}

        {#if pageData.keywords?.length}
            <section class="info-section">
                <h3>Keywords</h3>
                <div class="keywords">
                    {#each pageData.keywords as keyword}
                        <span class="keyword">{@html safeMarkdown(keyword)}</span>
                    {/each}
                </div>
            </section>
        {/if}

        {#if pageData.confidence}
            <div class="confidence">
                Confidence: {pageData.confidence}%
            </div>
        {/if}

        <div class="transcribe-section">
            <div class="notes-input">
                <label for="transcription-notes">Notes for transcription (optional):</label>
                <textarea
                    id="transcription-notes"
                    bind:value={transcriptionNotes}
                    placeholder="Enter any notes or instructions for transcription..."
                    rows="3"
                ></textarea>
            </div>

            <button 
                class="transcribe-button"
                on:click={transcribePage}
                disabled={isTranscribing}
            >
                {isTranscribing ? 'Transcribing...' : pageData.transcription ? 'Retranscribe Page' : 'Transcribe Page'}
            </button>

            {#if transcribeError}
                <p class="error-message">{transcribeError}</p>
            {/if}
        </div>
    </div>
</div>

<style>
    .header-content {
        display: flex;
        align-items: center;
        gap: 0.5rem;
    }

    .notes-indicator {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 16px;
        height: 16px;
        border-radius: 50%;
        background: #6b7280;
        color: white;
        font-size: 12px;
        font-style: italic;
        cursor: help;
    }

    .notes-indicator:hover {
        background: #4b5563;
    }
    
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

    .transcription, .content-block {
        font-family: ui-sans-serif, system-ui, -apple-system, sans-serif;
        background: #f5f5f5;
        padding: 1rem;
        border-radius: 4px;
        line-height: 1.6;
        overflow-x: auto;
    }

    .transcription :global(p), .content-block :global(p) {
        margin-bottom: 1rem;
    }

    .transcription :global(p:last-child), .content-block :global(p:last-child) {
        margin-bottom: 0;
    }

    .transcription :global(em), .content-block :global(em) {
        font-style: italic;
    }

    .transcription :global(strong), .content-block :global(strong) {
        font-weight: 600;
    }

    .transcription :global(code), .content-block :global(code) {
        background: #e5e7eb;
        padding: 0.2em 0.4em;
        border-radius: 3px;
        font-family: ui-monospace, monospace;
        font-size: 0.875em;
    }

    .transcription :global(ul), .content-block :global(ul) {
        list-style-type: disc;
        margin: 1rem 0;
        padding-left: 1.5rem;
    }

    .transcription :global(blockquote), .content-block :global(blockquote) {
        border-left: 4px solid #e5e7eb;
        padding-left: 1rem;
        margin: 1rem 0;
        color: #4b5563;
        font-style: italic;
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

    .keyword :global(em) {
        font-style: italic;
    }

    .keyword :global(code) {
        background: rgba(0, 0, 0, 0.1);
        padding: 0.1em 0.2em;
        border-radius: 2px;
    }

    .confidence {
        margin-top: 1rem;
        padding-top: 1rem;
        border-top: 1px solid #e5e7eb;
        color: #666;
        font-size: 0.875rem;
    }

    .transcribe-section {
        margin-top: 1rem;
        display: flex;
        flex-direction: column;
        gap: 1rem;
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

    .error-message {
        color: #e53e3e;
        font-size: 0.875rem;
        margin: 0;
    }
</style>