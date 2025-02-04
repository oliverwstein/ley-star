<!-- src/lib/components/SearchPanel.svelte -->
<script lang="ts">
    import { onMount } from 'svelte';
    import { createEventDispatcher } from 'svelte';
    
    export let manuscripts: Array<any> = [];
    
    const dispatch = createEventDispatcher();
    const apiUrl = 'http://127.0.0.1:5000';
    
    let searchQuery = '';
    let showTranscribedOnly = false;
    let isSearching = false;
    let searchError: string | null = null;
    let filteredManuscripts = manuscripts;
  
    // Initialize with all manuscripts
    onMount(() => {
      updateResults(manuscripts);
    });

    function isFullyTranscribed(manuscript: any): boolean {
        return manuscript.transcription_info?.successful_pages === manuscript.total_pages;
    }

    function applyFilters(manuscriptsToFilter: Array<any>) {
      let results = manuscriptsToFilter;
      
      if (showTranscribedOnly) {
        results = results.filter(m => isFullyTranscribed(m));
      }
      
      return results;
    }
  
    async function performSearch() {
      if (!searchQuery.trim()) {
        filteredManuscripts = applyFilters(manuscripts);
        updateResults(filteredManuscripts);
        return;
      }
      
      try {
        isSearching = true;
        const response = await fetch(
          `${apiUrl}/search/manuscripts?q=${encodeURIComponent(searchQuery)}&limit=500000`
        );
        
        if (!response.ok) throw new Error(`Search failed: ${response.statusText}`);
        
        const data = await response.json();
        // console.log(data)
        // Create a map of titles to their search scores
        const searchScores = new Map(
          data.results.map((r: { title: any; score: any; }) => [r.title, r.score])
        );
        
        // Filter and sort manuscripts based on search results
        filteredManuscripts = manuscripts
          .filter(m => searchScores.has(m.title))
          .map(m => ({
            ...m,
            searchScore: searchScores.get(m.title)
          }))
          .sort((a, b) => (b.searchScore ?? 0) - (a.searchScore ?? 0));

        // Apply additional filters
        filteredManuscripts = applyFilters(filteredManuscripts);
        
        // Update the parent component with sorted results
        updateResults(filteredManuscripts, true);
        
      } catch (error) {
        searchError = error instanceof Error ? error.message : 'Search failed';
        console.error('Search error:', error);
      } finally {
        isSearching = false;
      }
    }

    function updateResults(results: Array<any>, isSearchResult: boolean = false) {
      dispatch('update', { 
        manuscripts: results,
        isSearchResult
      });
    }
  
    function clearSearch() {
      searchQuery = '';
      searchError = null;
      filteredManuscripts = applyFilters(manuscripts);
      updateResults(filteredManuscripts, false);
    }
  
    function handleKeydown(event: KeyboardEvent) {
      if (event.key === 'Enter') {
        performSearch();
      } else if (event.key === 'Escape') {
        clearSearch();
      }
    }

    // Watch for changes in the transcribed filter
    $: if (showTranscribedOnly !== undefined) {
      filteredManuscripts = applyFilters(
        searchQuery ? filteredManuscripts : manuscripts
      );
      updateResults(filteredManuscripts, !!searchQuery);
    }
  </script>
  
  <div class="search-panel">
    <div class="search-container">
      <div class="input-wrapper">
        <input
          type="text"
          bind:value={searchQuery}
          placeholder="Search across all manuscript metadata including dates, authors, and descriptions..."
          class="search-input"
          on:keydown={handleKeydown}
        />
        {#if searchQuery}
          <button
            class="clear-button"
            on:click={clearSearch}
            title="Clear search"
          >
            ✕
          </button>
        {/if}
      </div>
      
      <div class="controls">
        <label class="filter-checkbox">
          <input
            type="checkbox"
            bind:checked={showTranscribedOnly}
          />
          <span class="checkbox-text">Show only fully transcribed manuscripts</span>
        </label>

        <button
          class="search-button"
          on:click={performSearch}
          disabled={isSearching}
        >
          {#if isSearching}
            <span class="loading-spinner"></span>
          {:else}
            Search
          {/if}
        </button>
      </div>
    </div>
  
    {#if searchError}
      <div class="error-message">
        {searchError}
      </div>
    {/if}
  
    {#if filteredManuscripts.length < manuscripts.length}
      <div class="results-count">
        Found {filteredManuscripts.length} matching manuscripts
      </div>
    {/if}
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
        flex-direction: column;
        gap: 1rem;
    }

    .input-wrapper {
        display: flex;
        width: 100%;
        gap: 0.5rem;
        position: relative;
    }

    .controls {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 1rem;
    }

    .filter-checkbox {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        color: #4b5563;
        cursor: pointer;
    }

    .checkbox-text {
        font-size: 0.875rem;
    }

    .search-input {
        flex-grow: 1;
        padding: 0.75rem 3rem 0.75rem 1rem;
        border: 1px solid #e5e7eb;
        border-radius: 6px;
        font-size: 1rem;
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

    .search-button {
        flex-shrink: 0;
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
        min-height: 2.75rem;
    }

    .search-button:hover:not(:disabled) {
        background: #3182ce;
    }

    .search-button:disabled {
        background: #9ca3af;
        cursor: not-allowed;
    }

    .loading-spinner {
        display: inline-block;
        width: 16px;
        height: 16px;
        border: 2px solid #ffffff;
        border-radius: 50%;
        border-top-color: transparent;
        animation: spin 1s linear infinite;
    }

    .error-message {
        color: #dc2626;
        font-size: 0.875rem;
        margin-top: 0.5rem;
    }

    .results-count {
        color: #6b7280;
        font-size: 0.875rem;
        margin-top: 0.5rem;
    }
  
    @keyframes spin {
      to {
        transform: rotate(360deg);
      }
    }
  </style>