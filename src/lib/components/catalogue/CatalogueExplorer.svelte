<!-- src/lib/components/catalogue/CatalogueExplorer.svelte -->
<script lang="ts">
    import { createEventDispatcher } from 'svelte';
    import type { ManuscriptListing } from '$lib/types/catalogue';
	import FilteredList from '../shared/FilteredList.svelte';
    
    export let manuscripts: ManuscriptListing[];
    
    const dispatch = createEventDispatcher();
    let searchQuery = '';
    let isSearching = false;
    let searchError: string | null = null;

    const headerTemplate = () => `
        <tr class="header-row">
            <th class="title-col">Title</th>
            <th class="pages-col">Pages</th>
            <th class="status-col">Status</th>
            <th class="lang-col">Languages</th>
        </tr>
    `;

    const rowTemplate = (manuscript: ManuscriptListing) => `
        <tr class="grid-row">
            <td class="title-col">
                <a href="/manuscripts/${manuscript.id}" class="manuscript-link">
                    ${manuscript.title}
                    ${manuscript.summary?.contents_summary ? 
                        `<p class="summary-preview">${manuscript.summary.contents_summary.slice(0, 100)}...</p>` : 
                        ''}
                </a>
            </td>
            <td class="pages-col">${manuscript.total_pages}</td>
            <td class="status-col">
                <span class="status-badge ${manuscript.transcribed ? 'transcribed' : ''}">
                    ${manuscript.transcribed ? 
                        `${manuscript.transcription_info?.successful_pages}/${manuscript.total_pages} pages` : 
                        'Not transcribed'}
                </span>
            </td>
            <td class="lang-col">
                ${manuscript.summary?.languages ? 
                    manuscript.summary.languages.join(', ') : 
                    '-'}
            </td>
        </tr>
    `;

    function handleSearch() {
        if (!searchQuery.trim()) {
            dispatch('update', { manuscripts: manuscripts });
            return;
        }
        
        isSearching = true;
        searchError = null;

        try {
            // Client-side search through summaries and themes
            const results = manuscripts.filter(m => 
                m.summary?.contents_summary?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                m.summary?.themes?.some(theme => 
                    theme.toLowerCase().includes(searchQuery.toLowerCase())
                )
            );
            
            dispatch('update', { 
                manuscripts: results,
                isSearchResult: true
            });
        } catch (error) {
            searchError = error instanceof Error ? error.message : 'Search failed';
        } finally {
            isSearching = false;
        }
    }

    function clearSearch() {
        searchQuery = '';
        searchError = null;
        dispatch('update', { manuscripts, isSearchResult: false });
    }

    function handleKeydown(event: KeyboardEvent) {
        if (event.key === 'Enter') {
            handleSearch();
        } else if (event.key === 'Escape') {
            clearSearch();
        }
    }
</script>

<div class="search-panel">
    <div class="search-container">
        <div class="input-wrapper">
            <input
                type="text"
                bind:value={searchQuery}
                placeholder="Search manuscripts by content and themes..."
                class="search-input"
                on:keydown={handleKeydown}
            />
            {#if searchQuery}
                <button
                    type="button"
                    class="clear-button"
                    on:click={clearSearch}
                    aria-label="Clear search"
                >
                    ×
                </button>
            {/if}
        </div>
        
        <button
            type="button"
            class="search-button"
            on:click={handleSearch}
            disabled={isSearching}
        >
            {#if isSearching}
                <span class="loading-spinner"></span>
            {:else}
                Search
            {/if}
        </button>
    </div>

    {#if searchError}
        <div class="error-message">
            {searchError}
        </div>
    {/if}

    <div class="table-wrapper">
        <FilteredList
            data={manuscripts}
            field="title"
            header={headerTemplate}
            row={rowTemplate}
        />
    </div>
</div>

<style>
    .search-panel {
        background-color: rgba(255, 255, 255, 0.95);
        backdrop-filter: blur(4px);
        border: 1px solid rgba(229, 231, 235, 0.8);
        border-radius: 8px;
        padding: 1.5rem;
        margin-bottom: 1.5rem;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    }

    .search-container {
        display: flex;
        gap: 1rem;
    }

    .input-wrapper {
        display: flex;
        flex-grow: 1;
        position: relative;
    }

    .search-input {
        width: 100%;
        padding: 0.75rem 3rem 0.75rem 1rem;
        border: 1px solid #e5e7eb;
        border-radius: 6px;
        font-size: 1rem;
        line-height: 1.5;
    }

    .search-input:focus {
        outline: none;
        border-color: #4a9eff;
        box-shadow: 0 0 0 2px rgba(74, 158, 255, 0.2);
    }

    .clear-button {
        position: absolute;
        right: 1rem;
        top: 50%;
        transform: translateY(-50%);
        color: #9ca3af;
        background: none;
        border: none;
        padding: 0.5rem;
        cursor: pointer;
    }

    .clear-button:hover {
        color: #6b7280;
    }

    .search-button {
        padding: 0.75rem 1.5rem;
        background: #4a9eff;
        color: white;
        border: none;
        border-radius: 6px;
        font-weight: 500;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        min-width: 5rem;
    }

    .search-button:hover:not(:disabled) {
        background: #3182ce;
    }

    .search-button:disabled {
        background: #9ca3af;
        cursor: not-allowed;
    }

    .loading-spinner {
        width: 1rem;
        height: 1rem;
        border: 2px solid #ffffff;
        border-radius: 50%;
        border-top-color: transparent;
        animation: spin 1s linear infinite;
    }

    .error-message {
        margin-top: 0.75rem;
        color: #dc2626;
        font-size: 0.875rem;
    }

    .table-wrapper {
        background-color: white;
        border-radius: 8px;
        padding: 1rem;
        margin-top: 1rem;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    }

    :global(.header-row),
    :global(.grid-row) {
        display: grid;
        grid-template-columns: 4fr 1fr 2fr 2fr;
        gap: 1em;
        padding: 0.5em 1em;
        align-items: center;
    }

    :global(.manuscript-link) {
        color: #4a9eff;
        text-decoration: none;
    }

    :global(.manuscript-link:hover) {
        text-decoration: underline;
    }

    :global(.summary-preview) {
        color: #6b7280;
        font-size: 0.875rem;
        margin-top: 0.25rem;
    }

    :global(.status-badge) {
        display: inline-flex;
        padding: 0.25rem 0.75rem;
        border-radius: 9999px;
        font-size: 0.75rem;
        font-weight: 500;
        background-color: #f3f4f6;
        color: #374151;
    }

    :global(.status-badge.transcribed) {
        background-color: #dcfce7;
        color: #166534;
    }

    @keyframes spin {
        to {
            transform: rotate(360deg);
        }
    }
</style>