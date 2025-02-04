<!-- src/routes/manuscripts/[id]/+page.svelte -->
<script lang="ts">
    import { page } from '$app/stores';
    import { onMount } from 'svelte';
    import type { ManuscriptDetails } from '$lib/types/manuscript';
    import ManuscriptTabs from '$lib/components/manuscript/ManuscriptTabs.svelte';
    
    let manuscript: ManuscriptDetails | null = null;
    let loading = true;
    let error: string | null = null;
    
    $: manuscriptId = $page.params.id;
    
    onMount(async () => {
      try {
        const response = await fetch(`http://localhost:5000/manuscripts/${manuscriptId}/info`);
        if (!response.ok) throw new Error('Failed to fetch manuscript details');
        manuscript = await response.json();
      } catch (e) {
        error = e instanceof Error ? e.message : 'An error occurred';
      } finally {
        loading = false;
      }
    });
  </script>
  
  <div class="space-y-6">
    {#if loading}
      <div class="text-center py-12">
        <span class="text-gray-600">Loading manuscript details...</span>
      </div>
    {:else if error}
      <div class="bg-red-50 text-red-600 p-4 rounded-md">
        {error}
      </div>
    {:else if manuscript}
      <header class="flex justify-between items-center">
        <h1 class="text-3xl font-serif">{manuscript.title}</h1>
        <a 
          href="/manuscripts/{manuscriptId}/pages?page=1"
          class="px-4 py-2 bg-stone-800 text-white rounded-md hover:bg-stone-700 
                 transition-colors"
        >
          View Pages
        </a>
      </header>
  
      <ManuscriptTabs {manuscript} />
    {:else}
      <div class="text-center py-12">
        <span class="text-gray-600">Manuscript not found</span>
      </div>
    {/if}
  </div>