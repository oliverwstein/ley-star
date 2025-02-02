<!-- src/lib/components/SearchPagesPanel.svelte -->
<script lang="ts">
    import PageTable from './PageTable.svelte';

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

    let searchTerm = '';
    
    function addKeywordToSearch(keyword: string) {
        const terms = searchTerm.toLowerCase().split(' ');
        if (terms.includes(keyword.toLowerCase())) {
            // Remove keyword if it's already in search
            searchTerm = terms
                .filter(term => term !== keyword.toLowerCase())
                .join(' ')
                .trim();
        } else {
            // Add keyword to search
            searchTerm = (searchTerm + ' ' + keyword).trim();
        }
    }

    $: filteredPages = searchTerm
        ? pages.filter(page => {
            // Split search into individual terms
            const searchTerms = searchTerm.toLowerCase().split(' ').filter(term => term);
            
            // Every search term must match something in the page
            return searchTerms.every(term => 
                page.summary?.toLowerCase().includes(term) ||
                page.revised_transcription?.toLowerCase().includes(term) ||
                page.transcription?.toLowerCase().includes(term) ||
                page.keywords?.some(k => k.toLowerCase().includes(term)) ||
                page.marginalia?.some(m => m.toLowerCase().includes(term)) ||
                page.transcription_notes?.toLowerCase().includes(term) ||
                page.content_notes?.toLowerCase().includes(term)
            );
        })
        : pages;
</script>

<div class="pages-section">
    <div class="pages-header">
        <h2>Pages</h2>
        <input
            type="text"
            bind:value={searchTerm}
            placeholder="Search transcripts, summaries, keywords, marginalia, and notes..."
            class="page-search"
        />
    </div>
    <PageTable 
        {title} 
        pages={filteredPages} 
        on:keywordClick={e => addKeywordToSearch(e.detail)}
    />
</div>

<style>
    .pages-section {
        margin-bottom: 2rem;
        background: #f8fafc;
        border-radius: 0.5rem;
        border: 1px solid #e2e8f0;
    }

    .pages-header {
        padding: 1rem;
        display: flex;
        justify-content: space-between;
        align-items: center;
        border-bottom: 1px solid #e2e8f0;
    }

    .page-search {
        width: 400px;
        padding: 0.5rem;
        border: 1px solid #e2e8f0;
        border-radius: 0.25rem;
        font-size: 0.875rem;
    }
</style>