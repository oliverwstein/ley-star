<!-- src/lib/components/catalogue/ManuscriptTable.svelte -->
<script lang="ts">
    import { manuscriptService } from '$lib/services/manuscript.service';
    import type { ManuscriptMetadata } from '$lib/types/manuscript';
    
    export let manuscripts: ManuscriptMetadata[] = [];
    export let onTranscriptionStart: (manuscriptId: string) => void;

    type SortField = 'title' | 'total_pages' | 'transcribed_pages' | 'date' | 'search_order';
    let sortField: SortField = 'search_order';  // Initial value
    let sortDirection: 'asc' | 'desc' = 'asc';

    function toggleSort(field: SortField) {
        if (sortField === field) {
            sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
        } else {
            sortField = field;
            sortDirection = 'asc';
        }
    }
    
    function getStatusPriority(status: string): number {
        switch (status) {
            case 'complete': return 4;
            case 'partial': return 3;
            case 'in-progress': return 2;
            case 'not_started': return 1;
            default: return 0;
        }
    }

    function getTranscriptionSortValue(manuscript: ManuscriptMetadata): number {
        const status = manuscript.transcription_status?.status || 'not_started';
        const completionPercentage = manuscript.transcription_status?.transcribed_pages 
            ? (manuscript.transcription_status.transcribed_pages / manuscript.total_pages)
            : 0;
        
        return (getStatusPriority(status) * 100000) + (completionPercentage * 100);
    }

    function getDateMidpoint(dateRange: [number, number]): number {
        return (dateRange[0] + dateRange[1]) / 2;
    }

    function formatDateRange(dateRange: [number, number]): string {
        const [start, end] = dateRange;
        if (start === end) return start.toString();
        return `${start} - ${end}`;
    }

    $: sortedManuscripts = sortField === 'search_order' ? manuscripts : [...manuscripts].sort((a, b) => {
        const modifier = sortDirection === 'asc' ? 1 : -1;
        let aVal, bVal;

        switch (sortField) {
            case 'date':
                aVal = getDateMidpoint(a.date_range);
                bVal = getDateMidpoint(b.date_range);
                break;
            case 'transcribed_pages':
                aVal = getTranscriptionSortValue(a);
                bVal = getTranscriptionSortValue(b);
                break;
            case 'title':
                aVal = a.title;
                bVal = b.title;
                break;
            case 'total_pages':
                aVal = a.total_pages;
                bVal = b.total_pages;
                break;
            default:
                aVal = a.title;  // Fallback to title if somehow we get an unknown sort field
                bVal = b.title;
        }
        
        return ((aVal < bVal ? -1 : aVal > bVal ? 1 : 0) * modifier);
    });

    // Reset sort when manuscripts change
    $: {
        manuscripts;  // track changes to manuscripts
        sortField = 'search_order';  // reset to search order when new results arrive
    }

    async function handleTranscribe(manuscript: ManuscriptMetadata) {
        try {
            const response = await manuscriptService.startTranscription(manuscript.id);
            if (response.status === 'started') {
                onTranscriptionStart(manuscript.id);
            }
        } catch (error) {
            console.error('Failed to start transcription:', error);
        }
    }

    function getTranscribeButtonText(status: string): string {
        switch (status) {
            case 'in_progress':
                return 'In Progress';
            case 'completed':
                return 'Complete';
            case 'error':
                return 'Failed';
            case 'queued':
                return 'Queued';
            default:
                return 'Start Transcription';
        }
    }
</script>

<div class="table-wrapper">
    {#if manuscripts.length === 0}
        <div class="empty">No manuscripts found</div>
    {:else}
        <table>
            <thead>
                <tr>
                    <th on:click={() => toggleSort('title')} class="sortable">
                        Title
                        {#if sortField === 'title'}
                            <span class="sort-indicator">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                        {/if}
                    </th>
                    <th on:click={() => toggleSort('date')} class="sortable">
                        Date
                        {#if sortField === 'date'}
                            <span class="sort-indicator">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                        {/if}
                    </th>
                    <th>Summary</th>
                    <th on:click={() => toggleSort('total_pages')} class="sortable">
                        Pages
                        {#if sortField === 'total_pages'}
                            <span class="sort-indicator">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                        {/if}
                    </th>
                    <th on:click={() => toggleSort('transcribed_pages')} class="sortable">
                        Transcribed
                        {#if sortField === 'transcribed_pages'}
                            <span class="sort-indicator">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                        {/if}
                    </th>
                </tr>
            </thead>
            <tbody>
                {#each sortedManuscripts as manuscript (manuscript.id)}
                    <tr class:active={manuscript.transcription_status?.status === 'in_progress'}>
                        <td>
                            <a href="/manuscripts/{manuscript.id}" class="manuscript-link">
                                {manuscript.title}
                                <div class="record-id">Record ID: {manuscript.id}</div>
                                {#if manuscript.alternative_titles?.length}
                                    <div class="alternative-titles">
                                        <div class="title-header">Other Titles:</div>
                                        <div class="default-titles">
                                            {#each manuscript.alternative_titles.slice(0, 2) as title}
                                                <div class="title-item"> - {title}</div>
                                            {/each}
                                        </div>
                                        <div class="full-titles">
                                            <div class="title-header">Other Titles:</div>
                                            {#each manuscript.alternative_titles as title}
                                                <div class="title-item">{title}</div>
                                            {/each}
                                        </div>
                                    </div>
                                {/if}
                            </a>
                        </td>
                        <td class="date-cell">
                            {formatDateRange(manuscript.date_range)}
                        </td>
                        <td class="summary-cell">
                            <div class="summary-preview">
                                {manuscript.contents_summary}
                            </div>
                            <div class="summary-full">
                                {manuscript.contents_summary}
                            </div>
                        </td>
                        <td>{manuscript.total_pages}</td>
                        <td>
                            <div class="progress-wrapper">
                                <div 
                                    class="progress-bar"
                                    style="width: {((manuscript.transcription_status?.transcribed_pages ?? 0) / manuscript.total_pages * 100)}%"
                                ></div>
                                <span class="progress-text">
                                    {manuscript.transcription_status?.transcribed_pages ?? 0}/{manuscript.total_pages}<br/>
                                    ({Math.round(((manuscript.transcription_status?.transcribed_pages ?? 0) / manuscript.total_pages * 100))}%)
                                </span>
                                {#if manuscript.transcription_status?.status === 'error'}
                                    <div class="error-indicator">⚠️ Error</div>
                                {/if}
                            </div>
                            <button
                                class="transcribe-button"
                                class:in-progress={manuscript.transcription_status?.status === 'in_progress' || manuscript.transcription_status?.status === 'queued'}
                                class:complete={manuscript.transcription_status?.status === 'completed'}
                                class:error={manuscript.transcription_status?.status === 'error'}
                                disabled={manuscript.transcription_status?.status === 'completed' || 
                                        manuscript.transcription_status?.status === 'in_progress' || manuscript.transcription_status?.status === 'queued'}
                                on:click={() => handleTranscribe(manuscript)}
                            >
                                {getTranscribeButtonText(manuscript.transcription_status?.status ?? 'not_started')}
                            </button>
                        </td>
                    </tr>
                {/each}
            </tbody>
        </table>
    {/if}
</div>

<style>
    .table-wrapper {
        background-color: rgba(255, 255, 255, 0.9);
        border-radius: 8px;
        padding: 1rem;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    }

    table {
        width: 100%;
        border-collapse: collapse;
    }

    th {
        text-align: left;
        padding: 1rem;
        font-weight: 600;
        color: #374151;
        border-bottom: 2px solid #e5e7eb;
    }

    th.sortable {
        cursor: pointer;
    }

    th.sortable:hover {
        color: #4a9eff;
    }

    td {
        padding: 1rem;
        border-bottom: 1px solid #e5e7eb;
    }

    .manuscript-link {
        color: #4a9eff;
        text-decoration: none;
    }

    .manuscript-link:hover {
        text-decoration: underline;
    }

    .sort-indicator {
        display: inline-block;
        margin-left: 0.5rem;
    }

    .alternative-titles {
        position: relative;
        color: #666;
        font-size: 0.875rem;
        margin-top: 0.5rem;
    }

    .default-titles {
        display: block;
    }

    .full-titles {
        display: none;
        position: absolute;
        background: white;
        border: 1px solid #e2e8f0;
        padding: 0.5rem;
        z-index: 10;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        min-width: 100%;
    }

    .title-item {
        text-indent: -1rem;
        padding-left: 2rem;
    }

    .alternative-titles:hover .full-titles {
        display: block;
    }

    .summary-cell {
        position: relative;
    }

    .summary-preview {
        display: -webkit-box;
        -webkit-line-clamp: 5;
        -webkit-box-orient: vertical;
        line-clamp: 5;
        display: box;
        box-orient: vertical;
        overflow: hidden;
        text-overflow: ellipsis;
    }

    .summary-full {
        display: none;
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(255, 255, 255, 1.0);
        border: 1px solid #e2e8f0;
        padding: 0.5rem;
        z-index: 10;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        overflow-y: auto;
    }

    .summary-cell:hover .summary-full {
        display: block;
    }

    .date-cell {
        text-align: center;
        color: #4b5563;
    }

    .progress-wrapper {
        position: relative;
        width: 100%;
        height: 1.5rem;
        background: #f3f4f6;
        border-radius: 0.25rem;
    }

    .progress-bar {
        position: absolute;
        height: 100%;
        background: #4a9eff;
        transition: width 0.5s ease-out;
    }

    .progress-text {
        position: relative;
        z-index: 1;
        display: block;
        text-align: center;
        line-height: 1.5rem;
        color: #1f2937;
        mix-blend-mode: difference;
    }

    .error-indicator {
        position: absolute;
        right: 0.5rem;
        top: 50%;
        transform: translateY(-50%);
        color: #ef4444;
        font-weight: 500;
    }

    tr.active {
        background-color: #f0f9ff;
    }

    tr.active:hover {
        background-color: #e0f2fe;
    }

    .record-id {
        color: #666;
        font-size: 0.875rem;
        margin-top: 0.5rem;
    }

    .transcribe-button {
        width: 100%;
        margin-top: 1.5rem;
        padding: 0.25rem 0.5rem;
        border: 1px solid #e5e7eb;
        border-radius: 0.25rem;
        font-size: 0.875rem;
        transition: all 0.2s;
        background-color: #4a9eff;
        color: white;
        cursor: pointer;
    }

    .transcribe-button:disabled {
        cursor: not-allowed;
    }

    .transcribe-button.in-progress {
        background-color: #9ca3af;
        color: white;
    }

    .transcribe-button.complete {
        background-color: #d1d5db;
        color: #6b7280;
    }

    .transcribe-button.error {
        background-color: #ef4444;
        color: white;
    }

    .transcribe-button:hover:not(:disabled) {
        opacity: 0.9;
    }
</style>