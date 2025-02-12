<!-- src/lib/components/catalogue/CatalogueSearch.svelte -->
<script lang="ts">
    import { createEventDispatcher } from 'svelte';
    import { catalogueSearchService } from '$lib/services/catalogue.search.service';
    import type { SearchQuery } from '$lib/services/catalogue.search.service';
    
    const dispatch = createEventDispatcher<{
        search: SearchQuery;
    }>();

    export let totalManuscripts: number;
    export let matchingManuscripts: number;
    
    let searchQuery = '';
    let showAdvanced = false;
    let searching = false;

    // Example search tips
    const searchTips = [
        'language:latin',
        'date:before:1450',
        'date:between:1200..1300',
        'date:after:1400',
        'theme:religious AND language:french',
        'scribe:Hubertus',
        'title:*psalter*',
        'status:in_progress',
        'style:gothic',
        'location:italy',
        'book of hours language:latin', 
    ];

    function handleSearch() {
        const query = catalogueSearchService.parseQuery(searchQuery);
        dispatch('search', query);
    }

    function insertSearchTip(tip: string) {
        searchQuery = tip;
        handleSearch();
    }

    function clearSearch() {
        searchQuery = '';
        dispatch('search', catalogueSearchService.parseQuery(''));
    }
</script>

<div class="search-panel">
    <div class="search-container">
        <div class="search-stats">
            {#if searchQuery}
                <span>Found {matchingManuscripts} matching {matchingManuscripts === 1 ? 'manuscript' : 'manuscripts'} out of {totalManuscripts} total</span>
            {:else}
                <span>Showing all {totalManuscripts} manuscripts</span>
            {/if}
        </div>
        <div class="input-wrapper">
            <input
                type="text"
                bind:value={searchQuery}
                on:input={handleSearch}
                placeholder="Search manuscripts (e.g., 'language:latin AND date:before:1450')"
                class="search-input"
            />
            {#if searchQuery}
                <button
                    class="clear-button"
                    on:click={clearSearch}
                    title="Clear search"
                >
                    ×
                </button>
            {/if}
        </div>

        <button 
            class="toggle-advanced" 
            on:click={() => showAdvanced = !showAdvanced}
        >
            {showAdvanced ? 'Hide' : 'Show'} Search Tips
        </button>

        {#if showAdvanced}
            <div class="search-help">
                <div class="search-tips">
                    <h3>Quick Search Examples:</h3>
                    <div class="tips-grid">
                        {#each searchTips as tip}
                            <button 
                                class="tip-button"
                                on:click={() => insertSearchTip(tip)}
                            >
                                {tip}
                            </button>
                        {/each}
                    </div>
                </div>

                <div class="search-syntax">
                    <h3>Search Syntax:</h3>
                    <ul>
                        <li><strong>Field Search:</strong> field:value (e.g., language:latin)</li>
                        <li><strong>Date Range:</strong> date:before:1450, date:after:1200, or date:between:1200..1300</li>
                        <li><strong>Multiple Conditions:</strong> Use AND/OR (e.g., language:latin AND theme:religious)</li>
                        <li><strong>Wildcards:</strong> Use * (e.g., title:*psalter*)</li>
                        <li><strong>Exclusion:</strong> field:not:value</li>
                    </ul>
                    <h4>Available Fields:</h4>
                    <ul>
                        <li>title, language, theme, scribe, date, summary, location, material, script, illuminations, style</li>
                    </ul>
                </div>
            </div>
        {/if}
    </div>
</div>

<style>
    .search-panel {
        background-color: rgba(255, 255, 255, 0.75);
        backdrop-filter: blur(4px);
        border: 1px solid rgba(229, 231, 235, 0.6);
        border-radius: 8px;
        padding: 1.5rem;
        margin-bottom: 1.5rem;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.5);
    }

    .search-container {
        display: flex;
        flex-direction: column;
        gap: 1rem;
        
    }

    .search-stats {
        font-size: 0.875rem;
        color: #4b5563;
        margin-bottom: 0.5rem;
        
    }

    .input-wrapper {
        display: flex;
        width: 100%;
        position: relative;
    }

    .search-input {
        width: 100%;
        padding: 0.75rem 3rem 0.75rem 1rem;
        border: 1px solid #e5e7eb;
        border-radius: 6px;
        background-color: rgba(255, 255, 255, 0.5);
        font-size: 1.2rem;
        line-height: 1.5;
        transition: border-color 0.15s ease-in-out;
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

    .toggle-advanced {
        background: none;
        border: none;
        color: #4a9eff;
        cursor: pointer;
        font-size: 0.875rem;
        padding: 0;
    }

    .toggle-advanced:hover {
        text-decoration: underline;
    }

    .search-help {
        background: rgba(249, 250, 251, 0.1);

        padding: 1rem;
        margin-top: 0.5rem;
    }

    .search-tips h3,
    .search-syntax h3 {
        font-size: 1rem;
        margin: 0 0 0.75rem;
        color: #374151;
    }

    .tips-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
        gap: 0.5rem;
    }

    .tip-button {
        background: rgba(255, 255, 255, 0.5);
        border: 1px solid #e5e7eb;
        border-radius: 4px;
        padding: 0.5rem;
        font-size: 0.875rem;
        cursor: pointer;
        transition: all 0.2s;
        text-align: left;
    }

    .tip-button:hover {
        background: #f3f4f6;
        border-color: #d1d5db;
    }

    .search-syntax {
        margin-top: 1rem;
        padding-top: 1rem;
        border-top: 1px solid #e5e7eb;
    }

    .search-syntax h4 {
        font-size: 0.875rem;
        margin: 1rem 0 0.5rem;
        color: #374151;
    }

    .search-syntax ul {
        margin: 0;
        padding-left: 1.5rem;
        font-size: 0.875rem;
        color: #4b5563;
    }

    .search-syntax li {
        margin-bottom: 0.25rem;
    }

    .search-syntax strong {
        color: #374151;
    }
</style>