<!-- src/routes/manuscripts/[id]/pages/+page.svelte -->
<script lang="ts">
    import { page } from '$app/stores';
    import { onMount } from 'svelte';
    import type { PageViewData } from '$lib/types/page';
    import ImageViewer from '$lib/components/page/ImageViewer.svelte';
    import Navigation from '$lib/components/page/Navigation.svelte';
    import TranscriptionPanel from '$lib/components/page/TranscriptionPanel.svelte';
  
    let pageData: PageViewData | null = null;
    let totalPages = 0;
    let loading = true;
    let error: string | null = null;
    
    $: manuscriptId = $page.params.id;
    $: pageNumber = parseInt($page.url.searchParams.get('page') || '1');
    
    async function loadManuscriptInfo() {
      const response = await fetch(`http://localhost:5000/manuscripts/${manuscriptId}/info`);
      if (!response.ok) throw new Error('Failed to fetch manuscript info');
      const data = await response.json();
      totalPages = data.total_pages;
    }
    
    async function loadPageData() {
      loading = true;
      error = null;
      
      try {
        const response = await fetch(
          `http://localhost:5000/manuscripts/${manuscriptId}/pages/${pageNumber}`
        );
        if (!response.ok) throw new Error('Failed to fetch page data');
        pageData = await response.json();
      } catch (e) {
        error = e instanceof Error ? e.message : 'An error occurred';
      } finally {
        loading = false;
      }
    }
    
    onMount(async () => {
      try {
        await loadManuscriptInfo();
        await loadPageData();
      } catch (e) {
        error = e instanceof Error ? e.message : 'An error occurred';
        loading = false;
      }
    });
    
    $: if (pageNumber) loadPageData();
  </script>
  
  <div class="space-y-4">
    <Navigation {manuscriptId} {pageNumber} {totalPages} />
    
    {#if loading}
      <div class="text-center py-12">
        <span class="text-gray-600">Loading page...</span>
      </div>
    {:else if error}
      <div class="bg-red-50 text-red-600 p-4 rounded-md">
        {error}
      </div>
    {:else if pageData}
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ImageViewer 
          src={`http://localhost:5000/manuscripts/${manuscriptId}/pages/${pageNumber}/image`}
          alt={`Page ${pageNumber}`}
        />
        <TranscriptionPanel {pageData} />
      </div>
    {:else}
      <div class="text-center py-12">
        <span class="text-gray-600">Page not found</span>
      </div>
    {/if}
  </div>