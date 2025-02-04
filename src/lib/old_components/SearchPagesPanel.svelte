<!-- src/lib/components/SearchPagesPanel.svelte -->
<script lang="ts">
    import { fade, slide } from 'svelte/transition';
    import PageTable from './PageTable.svelte';
    import { onMount } from 'svelte';
    import { writable } from 'svelte/store';
    import { ManuscriptSearchEngine } from '$lib/utils/ManuscriptSearch';

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

    export let pages: PageData[] = [];
    export let title: string;

    let searchQuery = '';
    let showHelp = false;
    let displayedPages = pages;
    let statusMessage = '';
    let searchHistory: string[] = [];
    let isSearching = false;

    const searchOptions = writable({
        caseSensitive: false,
        fuzzyMatch: true,
        weightedFields: true
    });

    const helpText = ManuscriptSearchEngine.getSearchHelp();

    function performSearch() {
        if (!searchQuery.trim()) {
            displayedPages = pages;
            statusMessage = '';
            return;
        }

        try {
            isSearching = true;
            const results = ManuscriptSearchEngine.search(pages, searchQuery, $searchOptions);
            displayedPages = results;
            
            statusMessage = `Found ${results.length} matching ${results.length === 1 ? 'page' : 'pages'}`;
            
            if (!searchHistory.includes(searchQuery)) {
                searchHistory = [searchQuery, ...searchHistory].slice(0, 5);
            }
        } catch (error) {
            statusMessage = error instanceof Error ? error.message : 'Search failed';
            console.error('Search error:', error);
        } finally {
            isSearching = false;
        }
    }

    function clearSearch() {
        searchQuery = '';
        displayedPages = pages;
        statusMessage = '';
        showHelp = false;
    }

    function handleKeywordClick(event: CustomEvent<string>) {
        const keyword = event.detail;
        searchQuery = `key:"${keyword}"`;
        performSearch();
    }

    function handleSearchKeydown(event: KeyboardEvent) {
        if (event.key === 'Enter') {
            performSearch();
        } else if (event.key === 'Escape') {
            clearSearch();
        }
    }

    function applyHistorySearch(query: string) {
        searchQuery = query;
        performSearch();
    }

    function toggleOption(option: keyof typeof $searchOptions) {
        searchOptions.update(current => ({
            ...current,
            [option]: !current[option]
        }));
        if (searchQuery) {
            performSearch();
        }
    }

    onMount(() => {
        displayedPages = pages;
    });

    $: if (searchQuery && $searchOptions) {
        performSearch();
    }
</script>

<div class="search-panel" transition:fade>
    <div class="search-header">
        <div class="search-container">
            <div class="search-bar">
                <input
                    type="text"
                    bind:value={searchQuery}
                    placeholder="Search pages (try 'text:prayer AND margin:note')"
                    class="search-input"
                    on:keydown={handleSearchKeydown}
                    aria-label="Search pages"
                />
                
                <button
                    class="help-button"
                    on:click={() => showHelp = !showHelp}
                    title="Show search help"
                    aria-label="Toggle search help"
                >
                    ?
                </button>

                {#if searchQuery}
                    <button
                        class="clear-button"
                        on:click={clearSearch}
                        title="Clear search"
                        aria-label="Clear search"
                    >
                        ×
                    </button>
                {/if}

                <button
                    class="search-button"
                    on:click={performSearch}
                    disabled={isSearching}
                    aria-label="Perform search"
                >
                    {#if isSearching}
                        <span class="loading-spinner"></span>
                    {:else}
                        Search
                    {/if}
                </button>
            </div>

            {#if showHelp}
                <div class="help-panel" transition:slide>
                    <div class="help-content">
                        <pre>{helpText}</pre>
                    </div>
                </div>
            {/if}

            <div class="search-options">
                <label class="option">
                    <input
                        type="checkbox"
                        checked={$searchOptions.fuzzyMatch}
                        on:change={() => toggleOption('fuzzyMatch')}
                    />
                    <span class="option-text">Fuzzy matching</span>
                </label>
                
                <label class="option">
                    <input
                        type="checkbox"
                        checked={$searchOptions.caseSensitive}
                        on:change={() => toggleOption('caseSensitive')}
                    />
                    <span class="option-text">Case sensitive</span>
                </label>
                
                <label class="option">
                    <input
                        type="checkbox"
                        checked={$searchOptions.weightedFields}
                        on:change={() => toggleOption('weightedFields')}
                    />
                    <span class="option-text">Weight by field importance</span>
                </label>
            </div>
        </div>

        {#if searchHistory.length > 0}
            <div class="search-history" transition:slide>
                <span class="history-label">Recent searches:</span>
                <div class="history-items">
                    {#each searchHistory as query}
                        <button
                            class="history-item"
                            on:click={() => applyHistorySearch(query)}
                            title="Click to repeat this search"
                        >
                            {query}
                        </button>
                    {/each}
                </div>
            </div>
        {/if}
    </div>

    {#if statusMessage}
        <div 
            class="status-message" 
            class:is-error={statusMessage.includes('failed')}
            transition:fade
        >
            {statusMessage}
        </div>
    {/if}

    <div class="results-container" class:has-results={displayedPages.length > 0}>
        <PageTable 
            {title}
            pages={displayedPages}
            on:keywordClick={handleKeywordClick}
        />

        {#if displayedPages.length === 0}
            <div class="no-results" transition:fade>
                <p>No pages match your search criteria.</p>
                <button class="reset-button" on:click={clearSearch}>
                    Show all pages
                </button>
            </div>
        {/if}
    </div>
</div>

<style>
    .search-panel {
        background: white;
        border-radius: 8px;
        padding: 1.5rem;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    }

    .search-header {
        margin-bottom: 1.5rem;
    }

    .search-container {
        display: flex;
        flex-direction: column;
        gap: 1rem;
    }

    .search-bar {
        display: flex;
        gap: 0.5rem;
        position: relative;
    }

    .search-input {
        flex-grow: 1;
        padding: 0.75rem 3rem 0.75rem 1rem;
        border: 1px solid #e5e7eb;
        border-radius: 6px;
        font-size: 1rem;
        transition: all 0.2s ease;
    }

    .search-input:focus {
        outline: none;
        border-color: #4a9eff;
        box-shadow: 0 0 0 2px rgba(74, 158, 255, 0.2);
    }

    .help-button,
    .clear-button {
        position: absolute;
        padding: 0.5rem;
        background: none;
        border: none;
        cursor: pointer;
        color: #6b7280;
        transition: color 0.2s ease;
    }

    .help-button {
        right: 7rem;
        top: 50%;
        transform: translateY(-50%);
        font-size: 1rem;
        font-weight: bold;
    }

    .clear-button {
        right: 5rem;
        top: 50%;
        transform: translateY(-50%);
        font-size: 1.25rem;
    }

    .help-button:hover,
    .clear-button:hover {
        color: #374151;
    }

    .search-button {
        padding: 0 1.5rem;
        background: #4a9eff;
        color: white;
        border: none;
        border-radius: 6px;
        font-weight: 500;
        cursor: pointer;
        transition: background-color 0.2s;
        min-width: 5rem;
        display: flex;
        align-items: center;
        justify-content: center;
    }

    .search-button:hover:not(:disabled) {
        background: #3182ce;
    }

    .search-button:disabled {
        background: #9ca3af;
        cursor: not-allowed;
    }

    .help-panel {
        background: #f9fafb;
        border: 1px solid #e5e7eb;
        border-radius: 6px;
        overflow: hidden;
    }

    .help-content {
        padding: 1rem;
        font-size: 0.875rem;
        color: #4b5563;
        max-height: 300px;
        overflow-y: auto;
    }

    .help-content pre {
        margin: 0;
        white-space: pre-wrap;
        font-family: inherit;
    }

    .search-options {
        display: flex;
        flex-wrap: wrap;
        gap: 1rem;
        padding: 0.5rem 0;
    }

    .option {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        cursor: pointer;
    }

    .option-text {
        font-size: 0.875rem;
        color: #4b5563;
    }

    .search-history {
        margin-top: 1rem;
        padding-top: 1rem;
        border-top: 1px solid #e5e7eb;
    }

    .history-label {
        font-size: 0.875rem;
        color: #6b7280;
        margin-right: 0.5rem;
    }

    .history-items {
        display: flex;
        flex-wrap: wrap;
        gap: 0.5rem;
        margin-top: 0.5rem;
    }

    .history-item {
        padding: 0.25rem 0.75rem;
        background: #f3f4f6;
        border: 1px solid #e5e7eb;
        border-radius: 999px;
        font-size: 0.875rem;
        color: #4b5563;
        cursor: pointer;
        transition: all 0.2s ease;
    }

    .history-item:hover {
        background: #e5e7eb;
        color: #1f2937;
    }

    .status-message {
        margin-bottom: 1rem;
        padding: 0.75rem;
        border-radius: 6px;
        background: #f0fdf4;
        color: #166534;
        font-size: 0.875rem;
    }

    .status-message.is-error {
        background: #fef2f2;
        color: #dc2626;
    }

    .results-container {
        position: relative;
        min-height: 200px;
    }

    .no-results {
        text-align: center;
        padding: 2rem;
        color: #6b7280;
    }

    .reset-button {
        margin-top: 1rem;
        padding: 0.5rem 1rem;
        background: #4a9eff;
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        transition: background-color 0.2s;
    }

    .reset-button:hover {
        background: #3182ce;
    }

    .loading-spinner {
        width: 1rem;
        height: 1rem;
        border: 2px solid #ffffff;
        border-radius: 50%;
        border-top-color: transparent;
        animation: spin 1s linear infinite;
    }

    @keyframes spin {
        to {
            transform: rotate(360deg);
        }
    }
</style>