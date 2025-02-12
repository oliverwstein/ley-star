<!-- src/routes/manuscripts/[id]/+page.svelte -->
<script lang="ts">
    import { onMount } from 'svelte';
    import { page } from '$app/stores';
    import { manuscriptService } from '$lib/services/manuscript.service';
    import type { Manuscript } from '$lib/types/manuscript';
    import ManuscriptInfo from '$lib/components/manuscript/ManuscriptInfo.svelte';
    import PageNavigation from '$lib/components/manuscript/PageNavigation.svelte';

    let manuscript: Manuscript | null = null;
    let loading = true;
    let error: string | null = null;

    onMount(async () => {
        try {
            const manuscriptData = await manuscriptService.getManuscript($page.params.id);
            if (!manuscriptData) {
                throw new Error('No manuscript data received');
            }
            manuscript = manuscriptData;
        } catch (e) {
            console.error('Full error:', e);
            error = e instanceof Error ? e.message : 'Failed to load manuscript';
        } finally {
            loading = false;
        }
    });
</script>

<div class="manuscript-page">
    {#if loading}
        <div class="loading">Loading manuscript details...</div>
    {:else if error}
        <div class="error">
            <p>Error: {error}</p>
            <a href="/manuscripts" class="back-link">← Return to manuscripts</a>
        </div>
    {:else if manuscript}
        <div class="nav-header">
            <a href="/manuscripts" class="back-link">← All Manuscripts</a>
        </div>
        <div class="content-wrapper">
            <ManuscriptInfo {manuscript} />
            <PageNavigation {manuscript} />
        </div>
    {:else}
        <div class="error">
            <p>Manuscript not found</p>
            <a href="/manuscripts" class="back-link">← Return to manuscripts</a>
        </div>
    {/if}
</div>

<style>
    .manuscript-page {
        max-width: 1200px;
        margin: 0 auto;
        padding: 1rem;
    }

    .content-wrapper {
        display: flex;
        flex-direction: column;
        gap: 2rem;
    }

    .nav-header {
        margin-bottom: 2rem;
    }

    .back-link {
        background: rgba(245, 243, 232, 0.85);
        border-radius: 8px;
        color: #4a5568;
        text-decoration: none;
        display: inline-flex;
        align-items: center;
        padding: 0.5rem 1rem;
        border-radius: 0.375rem;
        transition: all 0.2s;
    }

    .back-link:hover {
        background: #f7fafc;
        color: #2d3748;
    }

    .loading {
        text-align: center;
        padding: 2rem;
        color: #4a5568;
        background: rgba(245, 243, 232, 0.85);
        border-radius: 8px;
    }

    .error {
        text-align: center;
        padding: 2rem;
        color: #e53e3e;
        background: #fff5f5;
        border-radius: 0.5rem;
        margin: 2rem 0;
    }

    .error .back-link {
        margin-top: 1rem;
        color: #e53e3e;
    }

    .error .back-link:hover {
        background: #fed7d7;
    }
</style>