<!-- src/lib/components/ManuscriptTable.svelte -->
<script lang="ts">
    import { createEventDispatcher } from 'svelte';
    
    interface Manuscript {
        title: string;
        total_pages: number;
    }

    export let manuscripts: Manuscript[] = [];
    
    type SortField = 'title' | 'pages';
    type SortDirection = 'ascending' | 'descending';

    const dispatch = createEventDispatcher();
    const apiUrl = 'http://127.0.0.1:5000';

    let titleFilter = '';
    let sortField: SortField | null = null;
    let sortDirection: SortDirection = 'ascending';
    let similarityLimit = 5;
    let activeSimilarityTitle: string | null = null; // Use a string or null to represent the active manuscript for similarity

    $: filteredManuscripts = titleFilter
        ? manuscripts.filter(m => 
            m.title.toLowerCase().includes(titleFilter.toLowerCase()))
        : manuscripts;

    function sortManuscripts(field: SortField) {
        if (sortField === field) {
            sortDirection = sortDirection === 'ascending' ? 'descending' : 'ascending';
        } else {
            sortField = field;
            sortDirection = 'ascending';
        }

        filteredManuscripts = [...filteredManuscripts].sort((a, b) => {
            const valueA = field === 'pages' ? a.total_pages : a.title;
            const valueB = field === 'pages' ? b.total_pages : b.title;
            const modifier = sortDirection === 'ascending' ? 1 : -1;

            if (typeof valueA === 'string' && typeof valueB === 'string') {
                return valueA.localeCompare(valueB) * modifier;
            } else if (typeof valueA === 'number' && typeof valueB === 'number') {
                return (valueA - valueB) * modifier;
            } else {
                return 0; // Handle edge cases (though they shouldn't happen with this type definition)
            }

        });
    }

    async function findSimilarManuscripts(title: string) {
        try {
            const response = await fetch(
                `${apiUrl}/manuscripts/${encodeURIComponent(title)}/similar?limit=${similarityLimit}`
            );
            if (!response.ok) throw new Error('Failed to find similar manuscripts');
            const data = await response.json();
            
            // Dispatch event to update search with similarity results
            dispatch('similarity', {
                manuscripts: data.similar_manuscripts,
                sourceTitle: title
            });
            
            activeSimilarityTitle = null; // Close the input after finding similar manuscripts
        } catch (error) {
            console.error('Error finding similar manuscripts:', error);
        }
    }
</script>

<div class="table-wrapper">
    <div class="title-filter">
        <input
            type="text"
            bind:value={titleFilter}
            placeholder="Filter by title..."
            class="filter-input"
        />
    </div>

    <table>
        <thead>
            <tr>
                <th 
                    role="columnheader"
                    class="sortable"
                    on:click={() => sortManuscripts('title')}
                >
                    Title {sortField === 'title' ? (sortDirection === 'ascending' ? '↑' : '↓') : ''}
                </th>
                <th 
                    role="columnheader"
                    class="sortable"
                    on:click={() => sortManuscripts('pages')}
                >
                    Pages {sortField === 'pages' ? (sortDirection === 'ascending' ? '↑' : '↓') : ''}
                </th>
                <th role="columnheader">Actions</th>
            </tr>
        </thead>
        <tbody>
            {#each filteredManuscripts as manuscript}
                <tr class="row">
                    <td class="title">
                        <a 
                            href="/manuscripts/{encodeURIComponent(manuscript.title)}" 
                            class="hover:text-blue-600 hover:underline"
                        >
                            {manuscript.title}
                        </a>
                    </td>
                    <td class="pages">
                        {manuscript.total_pages}
                    </td>
                    <td class="actions">
                        {#if activeSimilarityTitle === manuscript.title}
                            <div class="similarity-input">
                                <input
                                    type="number"
                                    bind:value={similarityLimit}
                                    min="1"
                                    max="20"
                                    class="number-input"
                                />
                                <button
                                    class="confirm-button"
                                    on:click={() => findSimilarManuscripts(manuscript.title)}
                                >
                                    Find
                                </button>
                                <button
                                    class="cancel-button"
                                    on:click={() => activeSimilarityTitle = null}
                                >
                                    Cancel
                                </button>
                            </div>
                        {:else}
                            <button
                                class="similar-button"
                                on:click={() => activeSimilarityTitle = manuscript.title}
                            >
                                Find Similar Manuscripts
                            </button>
                        {/if}
                    </td>
                </tr>
            {/each}
        </tbody>
    </table>
</div>


<style>
    .table-wrapper {
        background-color: rgba(255, 255, 255, 0.9);
        backdrop-filter: blur(4px);
        border-radius: 8px;
        padding: 1rem;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    }

    .title-filter {
        margin-bottom: 1rem;
    }

    .filter-input {
        flex-grow: 1;
        padding: 0.5rem;
        border: 1px solid #e2e8f0;
        border-radius: 4px;
        font-size: 0.875rem;
    }

    table {
        width: 100%;
        border-collapse: collapse;
    }

    tr {
        display: grid;
        grid-template-columns: 4fr 1fr 2fr;
        gap: 1em;
        padding: 0.5em 1em;
        align-items: center;
    }

    tr.row {
        border-bottom: 1px solid rgba(238, 238, 238, 0.8);
    }

    tr.row:hover {
        background: rgba(249, 249, 249, 0.8);
    }

    th.sortable {
        cursor: pointer;
        text-align: left;
        font-weight: bold;
        font-size: inherit;
        background: none;
        border: none;
        padding: 0;
    }

    th.sortable:hover {
        color: #4a9eff;
    }

    .similar-button,
    .confirm-button {
        padding: 0.3em 0.8em;
        background: #4a9eff;
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
    }

    .cancel-button {
        padding: 0.3em 0.8em;
        background: #9ca3af;
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        margin-left: 0.5rem;
    }

    .similar-button:hover,
    .confirm-button:hover {
        background: #3182ce;
    }

    .similarity-input {
        display: flex;
        gap: 0.5rem;
        align-items: center;
    }

    .number-input {
        width: 4rem;
        padding: 0.3em;
        border: 1px solid #e2e8f0;
        border-radius: 4px;
    }
</style>