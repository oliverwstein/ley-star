<!-- src/routes/manuscripts/+page.svelte -->
<script lang="ts">
    import { onMount } from 'svelte';
    import type { ManuscriptListing } from '$lib/types/catalogue';
	import CatalogueExplorer from '$lib/components/catalogue/CatalogueExplorer.svelte';
    
    let manuscripts: ManuscriptListing[] = [];
    let loading = true;
    let error: string | null = null;
  
    onMount(async () => {
      try {
        const response = await fetch('http://127.0.0.1:5000/manuscripts');
        if (!response.ok) throw new Error('Failed to fetch manuscripts');
        manuscripts = await response.json();
      } catch (e) {
        error = e instanceof Error ? e.message : 'An error occurred';
      } finally {
        loading = false;
      }
    });
  </script>
  
  <div class="space-y-6">
    <h1 class="text-3xl font-serif">Manuscript Catalogue</h1>
  
    {#if loading}
      <div class="text-center py-12">
        <span class="text-gray-600">Loading manuscripts...</span>
      </div>
    {:else if error}
      <div class="bg-red-50 text-red-600 p-4 rounded-md">
        {error}
      </div>
    {:else}
      <CatalogueExplorer {manuscripts} />
    {/if}
  </div>