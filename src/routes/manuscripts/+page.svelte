<!-- src/routes/manuscripts/+page.svelte -->
<script lang="ts">
    import { onMount, onDestroy } from 'svelte';
    import type { ManuscriptMetadata, TranscriptionStatus } from '$lib/types/manuscript';
    import type { SearchQuery } from '$lib/services/catalogue.search.service';
    import { manuscriptService } from '$lib/services/manuscript.service';
    import { catalogueSearchService } from '$lib/services/catalogue.search.service';
    import CatalogueSearch from '$lib/components/catalogue/CatalogueSearch.svelte';
    import ManuscriptTable from '$lib/components/catalogue/ManuscriptTable.svelte';

    let manuscripts: ManuscriptMetadata[] = [];
    let displayedManuscripts: ManuscriptMetadata[] = [];
    let loading = true;
    let error: string | null = null;
    let statusSubscriptions = new Map<string, () => void>();
    let currentSearchQuery: SearchQuery | null = null;

    async function loadManuscripts() {
        try {
            const manuscriptData = await manuscriptService.getManuscripts();
            manuscripts = Object.values(manuscriptData);
            
            // Apply existing search if there is one
            if (currentSearchQuery) {
                displayedManuscripts = catalogueSearchService.search(manuscripts, currentSearchQuery);
            } else {
                displayedManuscripts = [...manuscripts];
            }

            // Set up subscriptions for manuscripts being transcribed
            manuscripts.forEach(manuscript => {
                if (manuscript.transcription_status?.status === 'in_progress') {
                    subscribeToManuscript(manuscript.id);
                }
            });
        } catch (e) {
            error = e instanceof Error ? e.message : 'Failed to load manuscripts';
            console.error('Error loading manuscripts:', e);
        }
    }

    function handleSearch(event: CustomEvent<SearchQuery>) {
        const searchQuery = event.detail;
        currentSearchQuery = searchQuery;
        
        // Always process the search, even with no conditions (might have free text)
        displayedManuscripts = catalogueSearchService.search(manuscripts, searchQuery);
    }

    function subscribeToManuscript(manuscriptId: string) {
        // Clean up existing subscription if any
        statusSubscriptions.get(manuscriptId)?.();
        
        const cleanup = manuscriptService.subscribeToStatus(
            manuscriptId,
            (status: TranscriptionStatus) => {
                updateManuscriptStatus(manuscriptId, status);
            }
        );
        
        statusSubscriptions.set(manuscriptId, cleanup);
    }

    function updateManuscriptStatus(manuscriptId: string, status: TranscriptionStatus) {
        manuscripts = manuscripts.map(m => 
            m.id === manuscriptId
                ? {
                    ...m,
                    transcribed_pages: status.transcribed_pages,
                    transcription_status: { ...m.transcription_status, ...status }
                  }
                : m
        );
        
        // Update displayed manuscripts to match
        displayedManuscripts = displayedManuscripts.map(m =>
            m.id === manuscriptId ? manuscripts.find(orig => orig.id === manuscriptId)! : m
        );

        // If transcription is complete or failed, clean up the subscription
        if (status.status === 'completed' || status.status === 'error') {
            statusSubscriptions.get(manuscriptId)?.();
            statusSubscriptions.delete(manuscriptId);
        }
    }

    onMount(async () => {
        try {
            await loadManuscripts();
        } finally {
            loading = false;
        }
    });

    onDestroy(() => {
        // Clean up all subscriptions
        statusSubscriptions.forEach(cleanup => cleanup());
        statusSubscriptions.clear();
    });
</script>

<div class="container">
    {#if loading}
        <div class="loading">Loading manuscripts...</div>
    {:else if error}
        <div class="error">Error: {error}</div>
    {:else}
        <CatalogueSearch 
            on:search={handleSearch}
            totalManuscripts={manuscripts.length}
            matchingManuscripts={displayedManuscripts.length}
        />
        {#if displayedManuscripts.length === 0}
            <div class="no-results">
                <p>No manuscripts found matching your search criteria.</p>
                {#if currentSearchQuery}
                    <button 
                        class="clear-search"
                        on:click={() => handleSearch(new CustomEvent('search', { 
                            detail: catalogueSearchService.parseQuery('')
                        }))}
                    >
                        Clear Search
                    </button>
                {/if}
            </div>
        {:else}
            <ManuscriptTable 
                manuscripts={displayedManuscripts} 
                onTranscriptionStart={subscribeToManuscript}
            />
        {/if}
    {/if}
</div>

<style>

    .container {
        max-width: 1200px;
        margin: 0 auto;
        padding: 2rem;
    }

    .loading {
        text-align: center;
        padding: 2rem;
        color: #666;
    }

    .error {
        color: #dc2626;
        padding: 1rem;
        background: #fee2e2;
        border-radius: 0.5rem;
        margin: 1rem 0;
    }

    .no-results {
        text-align: center;
        padding: 2rem;
        background: #f9fafb;
        border-radius: 0.5rem;
        margin: 1rem 0;
    }

    .clear-search {
        margin-top: 1rem;
        padding: 0.5rem 1rem;
        background: #4a9eff;
        color: white;
        border: none;
        border-radius: 0.25rem;
        cursor: pointer;
        transition: background-color 0.2s;
    }

    .clear-search:hover {
        background: #2563eb;
    }
</style>