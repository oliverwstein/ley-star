<!-- src/routes/manuscripts/+page.svelte -->
<script lang="ts">
    import { onMount, onDestroy } from 'svelte';
    import { writable, type Writable } from 'svelte/store';
    import SearchPanel from '$lib/components/SearchPanel.svelte';
    import ManuscriptTable from '$lib/components/ManuscriptTable.svelte';
	import type { Manuscript } from '$lib/types';

    const manuscriptsStore: Writable<Manuscript[]> = writable([]);
    const displayedStore: Writable<Manuscript[]> = writable([]);
    let loading = true;
    let error: string | null = null;
    
    const apiUrl = 'http://127.0.0.1:5000';

    onMount(async () => {
        try {
            const response = await fetch(`${apiUrl}/manuscripts`);
            if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
            const data = await response.json();
            manuscriptsStore.set(data);
            displayedStore.set(data);
        } catch (e) {
            error = e instanceof Error ? e.message : 'An unknown error occurred';
            console.error("Error fetching manuscripts:", error);
        } finally {
            loading = false;
        }
    });

    function handleSimilarityResults(event: CustomEvent) {
        const { manuscripts, sourceTitle } = event.detail;
        displayedStore.set(manuscripts);
        // TODO: Update search panel to show similarity tag
    }

    $: manuscripts = $manuscriptsStore;
    $: displayedManuscripts = $displayedStore;
</script>

<div class="container">
    {#if loading}
        <p>Loading manuscripts...</p>
    {:else if error}
        <p class="error">Error: {error}</p>
    {:else}
        <SearchPanel
            {manuscripts}
            on:update={(event) => displayedStore.set(event.detail.manuscripts)}
        />
        <ManuscriptTable 
            manuscripts={displayedManuscripts}
            on:similarity={handleSimilarityResults}
        />
    {/if}
</div>

<style>
    .container {
        padding: 0 2rem;
        margin: 0 auto;
        max-width: 1200px;
    }

    .error {
        color: red;
        padding: 1em;
    }
</style>