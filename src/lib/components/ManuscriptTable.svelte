<!-- src/lib/components/ManuscriptTable.svelte -->
<script lang="ts">
	import type { ManuscriptListing } from "$lib/types";

    
    type SortField = 'title' | 'pages';
    type SortDirection = 'ascending' | 'descending';

    export let manuscripts: ManuscriptListing[] = [];

    let titleFilter = '';
    let sortField: SortField | null = null;
    let sortDirection: SortDirection = 'ascending';

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
                return 0;
            }
        });
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
            </tr>
        </thead>
        <tbody>
            {#each filteredManuscripts as manuscript}
                <tr class="row">
                    <td class="title">
                        <a 
                            href="/manuscripts/{manuscript.id}" 
                            class="hover:text-blue-600 hover:underline"
                        >
                            {manuscript.title}
                        </a>
                    </td>
                    <td class="pages">
                        {manuscript.transcribed_pages}/{manuscript.total_pages}
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
</style>