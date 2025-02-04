<!-- src/lib/components/PageTable.svelte -->
<script lang="ts">
    import { createEventDispatcher } from 'svelte';

    interface PageData {
        page_number: number;
        transcription?: string;
        revised_transcription?: string;
        summary?: string;
        keywords?: string[];
        marginalia?: string[];
    }

    export let title: string;
    export let pages: PageData[] = [];

    const dispatch = createEventDispatcher();
    const summaryLength = 100;
    const transcriptPreviewLength = 50;

    function truncateText(text: string | undefined, length: number): string {
        if (!text) return '';
        const words = text.split(' ');
        let result = '';
        for (let word of words) {
            if ((result + ' ' + word).length > length) break;
            result += (result ? ' ' : '') + word;
        }
        return result + (result.length < text.length ? '...' : '');
    }

    function handleKeywordClick(keyword: string) {
        dispatch('keywordClick', keyword);
    }
</script>

<div class="table-container">
    <table>
        <thead>
            <tr>
                <th class="page-col">Page</th>
                <th class="transcript-col">Transcript</th>
                <th class="summary-col">Summary</th>
                <th class="keywords-col">Keywords</th>
            </tr>
        </thead>
        <tbody>
            {#each pages as page}
                <tr>
                    <td>
                        <a 
                            href="/manuscripts/{encodeURIComponent(title)}/pages?page={page.page_number}"
                            class="page-link"
                        >
                            {page.page_number}
                        </a>
                    </td>
                    <td>
                        {truncateText(page.revised_transcription || page.transcription, transcriptPreviewLength)}
                    </td>
                    <td>{truncateText(page.summary, summaryLength)}</td>
                    <td>
                        <div class="keywords">
                            {#each (page.keywords || []).slice(0, 3) as keyword}
                                <button 
                                    class="keyword"
                                    on:click={() => handleKeywordClick(keyword)}
                                >
                                    {keyword}
                                </button>
                            {/each}
                            {#if (page.keywords?.length ?? 0) > 3}
                                <span class="more">+{page.keywords!.length - 3}</span>
                            {/if}
                        </div>
                        {#if page.marginalia?.length}
                            <div class="marginalia-indicator">
                                Has marginalia
                            </div>
                        {/if}
                    </td>
                </tr>
            {/each}
        </tbody>
    </table>
</div>

<style>
    .table-container {
        max-height: 400px;
        overflow-y: auto;
    }

    table {
        width: 100%;
        border-collapse: collapse;
    }

    th {
        position: sticky;
        top: 0;
        background: #f8fafc;
        padding: 0.75rem;
        text-align: left;
        font-weight: 600;
        color: #475569;
        border-bottom: 2px solid #e2e8f0;
        z-index: 1;
    }

    td {
        padding: 0.75rem;
        border-bottom: 1px solid #e2e8f0;
        vertical-align: top;
    }

    .page-col {
        width: 80px;
    }

    .transcript-col {
        width: 25%;
    }

    .summary-col {
        width: 40%;
    }

    .keywords-col {
        width: 200px;
    }

    .page-link {
        color: #4a9eff;
        text-decoration: none;
        font-weight: 500;
    }

    .page-link:hover {
        text-decoration: underline;
    }

    .keywords {
        display: flex;
        flex-wrap: wrap;
        gap: 0.25rem;
        margin-bottom: 0.5rem;
    }

    .keyword {
        background: #e2e8f0;
        padding: 0.25rem 0.5rem;
        border-radius: 4px;
        font-size: 0.75rem;
        color: #475569;
        border: none;
        cursor: pointer;
        transition: all 0.2s ease;
    }

    .keyword:hover {
        background: #cbd5e1;
    }

    .more {
        font-size: 0.75rem;
        color: #64748b;
    }

    .marginalia-indicator {
        font-size: 0.75rem;
        color: #64748b;
        font-style: italic;
    }
</style>