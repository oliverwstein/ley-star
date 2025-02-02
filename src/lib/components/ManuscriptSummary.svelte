<!-- src/lib/components/ManuscriptSummary.svelte -->
<script lang="ts">
    interface PhysicalDescription {
        material: string;
        dimensions: string;
        condition: string;
        layout: string;
        script_type: string;
        decoration: string;
    }

    interface Summary {
        title: string;
        alternative_titles: string[];
        shelfmark: string;
        repository: string;
        date_range: [number, number];
        languages: string[];
        scribes: string[];
        physical_description: PhysicalDescription;
        contents_summary: string;
        historical_context: string;
        significance: string;
        themes: string[];
        provenance: string[];
    }

    interface TableEntry {
        title: string;
        description: string;
        page_number: number;
        level: number;
    }

    export let summary: Summary | null = null;
    export let tableOfContents: TableEntry[] = [];
    export let title: string;
    export let generating: boolean = false;
    export let onGenerate: () => void;

    const apiUrl = 'http://127.0.0.1:5000';

    function formatDateRange(range: [number, number]): string {
        if (!range[0] && !range[1]) return 'Date unknown';
        if (range[0] === range[1]) return `${range[0]}`;
        return `${range[0]}-${range[1]}`;
    }
</script>

<div class="summary-wrapper">
    {#if summary && tableOfContents.length > 0}
        <div class="manuscript-summary">
            <section class="overview">
                <h2>Manuscript Overview</h2>
                <div class="overview-content">
                    <div class="main-metadata">
                        {#if summary.alternative_titles.length > 0}
                            <div class="alt-titles">
                                Also known as: {summary.alternative_titles.join(', ')}
                            </div>
                        {/if}
                        <div class="identifier">
                            <span class="shelfmark">{summary.shelfmark}</span>
                            <span class="separator">•</span>
                            <span class="repository">{summary.repository}</span>
                        </div>
                        <p class="contents-summary">
                            {@html summary.contents_summary.replace(/\*(.*?)\*/g, '<em>$1</em>')}
                        </p>
                    </div>

                    <div class="details-grid">
                        <div class="page-preview">
                            <img 
                                src={`${apiUrl}/manuscripts/${encodeURIComponent(title)}/pages/1/image`}
                                alt="First page"
                                loading="lazy"
                            />
                        </div>

                        <div class="physical-details">
                            <h3>Physical Description</h3>
                            {#if summary.physical_description.material}
                                <div class="detail-item">
                                    <span class="label">Material:</span>
                                    <span>{summary.physical_description.material}</span>
                                </div>
                            {/if}
                            {#if summary.physical_description.dimensions}
                                <div class="detail-item">
                                    <span class="label">Dimensions:</span>
                                    <span>{summary.physical_description.dimensions}</span>
                                </div>
                            {/if}
                            {#if summary.physical_description.layout}
                                <div class="detail-item">
                                    <span class="label">Layout:</span>
                                    <span>{summary.physical_description.layout}</span>
                                </div>
                            {/if}
                            {#if summary.physical_description.script_type}
                                <div class="detail-item">
                                    <span class="label">Script:</span>
                                    <span>{summary.physical_description.script_type}</span>
                                </div>
                            {/if}
                            {#if summary.physical_description.decoration}
                                <div class="detail-item">
                                    <span class="label">Decoration:</span>
                                    <span>{summary.physical_description.decoration}</span>
                                </div>
                            {/if}
                            {#if summary.physical_description.condition}
                                <div class="detail-item">
                                    <span class="label">Condition:</span>
                                    <span>{summary.physical_description.condition}</span>
                                </div>
                            {/if}
                        </div>
                    </div>

                    <div class="additional-info">
                        <div class="info-row">
                            <div class="info-item">
                                <span class="label">Date:</span>
                                <span>{formatDateRange(summary.date_range)}</span>
                            </div>
                            {#if summary.languages.length}
                                <div class="info-item">
                                    <span class="label">Languages:</span>
                                    <span>{summary.languages.join(', ')}</span>
                                </div>
                            {/if}
                            {#if summary.scribes.length}
                                <div class="info-item">
                                    <span class="label">Scribes:</span>
                                    <span>{summary.scribes.join(', ')}</span>
                                </div>
                            {/if}
                        </div>

                        {#if summary.historical_context}
                            <div class="context">
                                <h3>Historical Context</h3>
                                <p>{summary.historical_context}</p>
                            </div>
                        {/if}

                        {#if summary.significance}
                            <div class="context">
                                <h3>Significance</h3>
                                <p>{summary.significance}</p>
                            </div>
                        {/if}

                        {#if summary.themes.length || summary.provenance.length}
                            <div class="tags-section">
                                {#if summary.themes.length}
                                    <div class="themes">
                                        <h3>Themes</h3>
                                        <div class="theme-tags">
                                            {#each summary.themes as theme}
                                                <span class="theme-tag">{theme}</span>
                                            {/each}
                                        </div>
                                    </div>
                                {/if}

                                {#if summary.provenance.length}
                                    <div class="provenance">
                                        <h3>Provenance</h3>
                                        <div class="provenance-list">
                                            {#each summary.provenance as entry}
                                                <span class="provenance-entry">{entry}</span>
                                            {/each}
                                        </div>
                                    </div>
                                {/if}
                            </div>
                        {/if}
                    </div>
                </div>
            </section>

            <section class="table-of-contents">
                <h2>Table of Contents</h2>
                <div class="toc-list">
                    {#each tableOfContents as entry}
                        <div class="toc-entry" class:indent-1={entry.level === 1} class:indent-2={entry.level === 2} class:indent-3={entry.level === 3}>
                            <a 
                                href="/manuscripts/{encodeURIComponent(title)}/pages?page={entry.page_number}"
                                class="page-link"
                            >
                                <div class="thumbnail">
                                    <img 
                                        src={`${apiUrl}/manuscripts/${encodeURIComponent(title)}/pages/${entry.page_number}/image`}
                                        alt={`Page ${entry.page_number}`}
                                        loading="lazy"
                                    />
                                </div>
                                <span class="page-number">{entry.page_number}</span>
                            </a>
                            <div class="entry-content">
                                <a 
                                    href="/manuscripts/{encodeURIComponent(title)}/pages?page={entry.page_number}"
                                    class="entry-title"
                                >
                                    {entry.title}
                                </a>
                                {#if entry.description}
                                    <p class="description">{entry.description}</p>
                                {/if}
                            </div>
                        </div>
                    {/each}
                </div>
            </section>
        </div>
    {:else}
        <button 
            class="generate-button"
            on:click={onGenerate}
            disabled={generating}
        >
            {generating ? 'Generating Summary...' : 'Generate Summary'}
        </button>
    {/if}
</div>

<style>
    .summary-wrapper {
        background: white;
        border-radius: 8px;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        margin-bottom: 2rem;
        padding: 1.5rem;
    }

    .manuscript-summary {
        display: flex;
        flex-direction: column;
        gap: 2rem;
    }

    section {
        border-bottom: 1px solid #e5e7eb;
        padding-bottom: 2rem;
    }

    h2 {
        font-size: 1.25rem;
        font-weight: bold;
        margin-bottom: 1.5rem;
        color: #1a1a1a;
    }

    h3 {
        font-size: 1rem;
        font-weight: 600;
        color: #1a1a1a;
        margin-bottom: 0.75rem;
    }

    .main-metadata {
        margin-bottom: 1.5rem;
    }

    .alt-titles {
        color: #4b5563;
        font-size: 0.875rem;
        margin-bottom: 0.5rem;
    }

    .identifier {
        color: #1a1a1a;
        font-size: 1rem;
        margin-bottom: 1rem;
    }

    .separator {
        margin: 0 0.5rem;
        color: #9ca3af;
    }

    .contents-summary {
        font-size: 1.125rem;
        line-height: 1.6;
        color: #1a1a1a;
    }

    .details-grid {
        display: grid;
        grid-template-columns: minmax(200px, 300px) 1fr;
        gap: 2rem;
        margin-bottom: 2rem;
        background: #f8fafc;
        padding: 1.5rem;
        border-radius: 8px;
    }

    .page-preview {
        width: 100%;
        aspect-ratio: 3/4;
        border: 1px solid #e5e7eb;
        border-radius: 4px;
        overflow: hidden;
    }

    .page-preview img {
        width: 100%;
        height: 100%;
        object-fit: cover;
    }

    .physical-details {
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
    }

    .detail-item {
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
    }

    .label {
        font-size: 0.875rem;
        color: #4b5563;
    }

    .info-row {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 1rem;
        margin-bottom: 1.5rem;
    }

    .context {
        margin-bottom: 1.5rem;
    }

    .context p {
        font-size: 1rem;
        line-height: 1.6;
        color: #374151;
    }

    .tags-section {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 1.5rem;
    }

    .theme-tags, .provenance-list {
        display: flex;
        flex-wrap: wrap;
        gap: 0.5rem;
    }

    .theme-tag, .provenance-entry {
        background: #e5e7eb;
        color: #1a1a1a;
        padding: 0.25rem 0.75rem;
        border-radius: 999px;
        font-size: 0.875rem;
    }

    .toc-list {
        display: flex;
        flex-direction: column;
        gap: 1.5rem;
    }

    .toc-entry {
        display: flex;
        align-items: flex-start;
        gap: 1rem;
        padding-left: 0;
        border-left: none;
    }

    .indent-1 { padding-left: 2rem; }
    .indent-2 { padding-left: 4rem; }
    .indent-3 { padding-left: 6rem; }

    .page-link {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 0.25rem;
        color: #4b5563;
        text-decoration: none;
        font-size: 0.875rem;
    }

    .thumbnail {
        width: 40px;
        height: 56px;
        border: 1px solid #e5e7eb;
        border-radius: 4px;
        overflow: hidden;
    }

    .thumbnail img {
        width: 100%;
        height: 100%;
        object-fit: cover;
    }

    .page-number {
        font-size: 0.75rem;
    }

    .entry-content {
        flex: 1;
    }

    .entry-title {
        color: #4a9eff;
        text-decoration: none;
        font-weight: 500;
        font-size: 1rem;
        margin-bottom: 0.25rem;
        display: block;
    }

    .entry-title:hover {
        text-decoration: underline;
    }

    .description {
        font-size: 0.875rem;
        color: #4b5563;
        margin: 0;
        line-height: 1.5;
    }

    .generate-button {
        width: 100%;
        padding: 0.75rem;
        background: #4a9eff;
        color: white;
        border: none;
        border-radius: 4px;
        font-size: 1rem;
        font-weight: 500;
        cursor: pointer;
        transition: background-color 0.2s;
    }

    .generate-button:hover:not(:disabled) {
        background: #3182ce;
    }

    .generate-button:disabled {
        background: #9ca3af;
        cursor: not-allowed;
    }
</style>