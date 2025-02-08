<!-- src/lib/components/PageViewer.svelte -->
<script lang="ts">
    import { fade } from 'svelte/transition';
    import { onMount } from 'svelte';
    import { page } from '$app/stores';
    import { goto } from '$app/navigation'; 
    import PageInfo from './PageInfo.svelte';
	import type { PageData } from '$lib/types';

 
    export let title: string;
    export let id: string;
 
    const apiUrl = 'http://127.0.0.1:5000';
    let totalPages = 0;
    let loading = true;
    let error: string | null = null;
    let pageData: PageData | null = null;
    let showInfo = false;
 
    $: currentPage = parseInt($page.url.searchParams.get('page') || '1');
    $: inputPage = currentPage.toString();
    $: imageUrl = `${apiUrl}/manuscripts/${id}/pages/${currentPage}/image`;
 
    onMount(async () => {
        try {
            const response = await fetch(`${apiUrl}/manuscripts/${id}/info`);
            if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
            const data = await response.json();
            totalPages = data.total_pages;
            title = data.title;
 
            const urlPage = parseInt($page.url.searchParams.get('page') || '1');
            if (urlPage >= 1 && urlPage <= totalPages) {
                await updatePage(urlPage);
            }
        } catch (e) {
            error = e instanceof Error ? e.message : 'An unknown error occurred';
        } finally {
            loading = false;
        }
    });
 
    async function updatePage(newPage: number) {
        if (newPage < 1 || newPage > totalPages) return;
        
        goto(`/manuscripts/${id}/pages?page=${newPage}`, {
            keepFocus: true,
            replaceState: true
        });

        try {
            const response = await fetch(
                `${apiUrl}/manuscripts/${id}/pages/${newPage}`
            );
            if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
            pageData = await response.json();
            
            if (showInfo) {
                showInfo = false;
                setTimeout(() => showInfo = true, 50);
            }
        } catch (e) {
            console.error("Error loading page data:", e);
            pageData = null;
        }
    }
 
    $: if (currentPage) updatePage(currentPage);
 
    const prevPage = () => updatePage(currentPage - 1);
    const nextPage = () => updatePage(currentPage + 1);
    
    function handlePageInput() {
        const newPage = parseInt(inputPage);
        if (!isNaN(newPage) && newPage >= 1 && newPage <= totalPages) {
            updatePage(newPage);
        } else {
            inputPage = currentPage.toString();
        }
    }
 </script>
 
 <div class="page-viewer">
    <nav class="navigation">
        <a href="/manuscripts/{id}" class="back-button">
            ← Back to Manuscript
        </a>
        <div class="page-controls">
            <button class="nav-button" on:click={prevPage} disabled={currentPage === 1}>
                Previous
            </button>
            <div class="page-input">
                <input
                    type="text"
                    bind:value={inputPage}
                    on:blur={handlePageInput}
                    on:keydown={e => e.key === 'Enter' && handlePageInput()}
                /> / {totalPages}
            </div>
            <button class="nav-button" on:click={nextPage} disabled={currentPage === totalPages}>
                Next
            </button>
        </div>
        <button class="info-button" on:click={() => showInfo = !showInfo}>
            {showInfo ? 'Hide' : 'Show'} Page Info
        </button>
    </nav>
 
    <div class="content">
        <div class="main-image">
            {#if loading}
                <div class="loading">Loading...</div>
            {:else if error}
                <div class="error">{error}</div>
            {:else}
                <img 
                    src={imageUrl} 
                    alt={`Page ${currentPage}`}
                    transition:fade
                />
            {/if}
        </div>
    </div>
 
    {#if showInfo}
        <PageInfo 
            pageData={pageData || { page_number: currentPage }}
            {id}
            onClose={() => showInfo = false} 
        />
    {/if}
 </div>
<style>
    .page-viewer {
        height: 100%;
        display: flex;
        flex-direction: column;
        gap: 1rem;
        padding: 1rem;
    }

    .navigation {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 0.5rem;
        background: white;
        border-radius: 0.5rem;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    }

    .page-controls {
        display: flex;
        align-items: center;
        gap: 1rem;
    }

    .nav-button {
        padding: 0.5rem 1rem;
        background: #4a9eff;
        color: white;
        border: none;
        border-radius: 0.25rem;
        cursor: pointer;
        transition: background-color 0.2s;
    }

    .nav-button:hover:not(:disabled) {
        background: #3182ce;
    }

    .nav-button:disabled {
        background: #ccc;
        cursor: not-allowed;
    }

    .page-input {
        display: flex;
        align-items: center;
        gap: 0.5rem;
    }

    .page-input input {
        width: 4rem;
        padding: 0.25rem;
        border: 1px solid #ccc;
        border-radius: 0.25rem;
        text-align: center;
    }

    .content {
        flex: 1;
        display: grid;
        gap: 1rem;
        overflow: hidden;
    }

    .main-image {
        position: relative;
        background: #f9fafb;
        border-radius: 0.5rem;
        overflow: hidden;
        display: flex;
        align-items: center;
        justify-content: center;
        height: 100%;
    }

    .main-image img {
        max-width: 100%;
        max-height: 100%;
        object-fit: contain;
    }

    .back-button {
        color: #4a9eff;
        text-decoration: none;
    }

    .back-button:hover {
        text-decoration: underline;
    }

    .info-button {
        padding: 0.5rem 1rem;
        background: #718096;
        color: white;
        border: none;
        border-radius: 0.25rem;
        cursor: pointer;
        transition: background-color 0.2s;
    }

    .info-button:hover {
        background: #4a5568;
    }

    .loading {
        color: #718096;
    }

    .error {
        color: #e53e3e;
        padding: 1rem;
    }
</style>