<!-- src/lib/components/manuscript/ManuscriptInfo.svelte -->
<script lang="ts">
    import type { Manuscript } from '$lib/types/manuscript';
    import { formatDateRange } from '$lib/utils/dates';
    
    export let manuscript: Manuscript;
    let metadata = manuscript.metadata;
    // Computed properties
    $: dateRange = metadata.date_range ? 
        formatDateRange(metadata.date_range[0], metadata.date_range[1]) : 
        'Date unknown';
</script>

<div class="manuscript-container">
    <div class="manuscript-info">
        <!-- Title Section -->
        <div class="title-section">
            <h1>{metadata.title}</h1>
            {#if metadata.alternative_titles?.length}
                <div class="alternative-titles">
                    <div class="title-preview">+ {metadata.alternative_titles.length} alternative {metadata.alternative_titles.length === 1 ? 'title' : 'titles'}</div>
                    <div class="title-popup">
                        <h4>Alternative Titles</h4>
                        <ul>
                            {#each metadata.alternative_titles as title}
                                <li>{title}</li>
                            {/each}
                        </ul>
                    </div>
                </div>
            {/if}
        </div>

        <!-- Info Section -->
        <div class="info-section">
            <div class="info-grid">
                <div>
                    <span class="label">Date:</span>
                    <span>{dateRange}</span>
                </div>
                <div>
                    <span class="label">Origin:</span>
                    <span>{metadata.origin_location}</span>
                </div>
                <div>
                    <span class="label">Languages:</span>
                    <span>{metadata.languages.join(', ')}</span>
                </div>
                {#if metadata.authors?.length}
                    <div>
                        <span class="label">Authors:</span>
                        <span>{metadata.authors.join('; ')}</span>
                    </div>
                {/if}
            </div>

            <!-- Index Info (Popover) -->
            <button class="index-button" aria-label="Show manuscript details">
                <i class="fas fa-info-circle"></i>
                <div class="index-popup">
                    <h4>Manuscript Details</h4>
                    <div class="index-content">
                        <div>
                            <span class="label">Shelfmark:</span>
                            <span>{metadata.shelfmark}</span>
                        </div>
                        <div>
                            <span class="label">Repository:</span>
                            <span>{metadata.repository}</span>
                        </div>
                        {#if metadata.provenance?.length}
                            <div>
                                <span class="label">Provenance:</span>
                                <ul>
                                    {#each metadata.provenance as entry}
                                        <li>{entry}</li>
                                    {/each}
                                </ul>
                            </div>
                        {/if}
                    </div>
                </div>
            </button>
        </div>

        <!-- Content Section -->
        <div class="content-section">
            <div class="content-card">
                <h3>Contents</h3>
                <p>{metadata.contents_summary}</p>
                
                <h3>Historical Context</h3>
                <p>{metadata.historical_context}</p>

                {#if metadata.themes?.length}
                    <div class="themes">
                        {#each metadata.themes as theme}
                            <span class="theme-tag">{theme}</span>
                        {/each}
                    </div>
                {/if}
            </div>
        </div>

        <!-- Status and Physical Description Cards -->
        <div class="cards-section">
            <!-- Transcription Status Card -->
            <div class="info-card status-card">
                <h3>Transcription Status</h3>
                <div class="status-content">
                    <div class="status-badge {metadata.transcription_status.status}">
                        {metadata.transcription_status.status.replace('_', ' ')}
                    </div>
                    <div class="progress-bar">
                        <div 
                            class="progress-fill"
                            style="width: {((metadata.transcription_status?.transcribed_pages || 0) / metadata.total_pages * 100)}%"
                        ></div>
                    </div>
                    <div class="status-details">
                        <span>{metadata.transcription_status?.transcribed_pages || 0} of {metadata.total_pages} pages</span>
                        {#if metadata.transcription_status?.error}
                            <span class="error">{metadata.transcription_status?.error}</span>
                        {/if}
                    </div>
                </div>
            </div>

            <!-- Physical Description Card -->
            <div class="info-card physical-card">
                <h3>Physical Description</h3>
                <div class="physical-content">
                    <div class="physical-grid">
                        <div>
                            <span class="label">Material:</span>
                            <span>{metadata.physical_description.material}</span>
                        </div>
                        <div>
                            <span class="label">Dimensions:</span>
                            <span>{metadata.physical_description.dimensions}</span>
                        </div>
                        <div>
                            <span class="label">Script:</span>
                            <span>{metadata.physical_description.script_type}</span>
                        </div>
                        {#if metadata.physical_description.layout.columns_per_page}
                            <div>
                                <span class="label">Layout:</span>
                                <span>{metadata.physical_description.layout.columns_per_page} column(s), {metadata.physical_description.layout.lines_per_page} lines</span>
                            </div>
                        {/if}
                    </div>
                    <div class="collapsible">
                        <details>
                            <summary>More Details</summary>
                            <div class="details-content">
                                <p><strong>Condition:</strong> {metadata.physical_description.condition}</p>
                                {#if metadata.physical_description.decoration}
                                    <p><strong>Decoration:</strong> {metadata.physical_description.decoration.illuminations}</p>
                                    {#if metadata.physical_description.decoration.artistic_style}
                                        <p><strong>Style:</strong> {metadata.physical_description.decoration.artistic_style}</p>
                                    {/if}
                                {/if}
                                {#if metadata.physical_description.layout.ruling_pattern}
                                    <p><strong>Ruling:</strong> {metadata.physical_description.layout.ruling_pattern}</p>
                                {/if}
                            </div>
                        </details>
                    </div>
                </div>
            </div>
        </div>
    </div>
</div>

<style>
    .manuscript-container {
        background: rgba(245, 243, 232, 0.85);
        border-radius: 8px;
        padding: 2rem;
        margin: 0 auto;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    }

    .manuscript-info {
        max-width: 1200px;
        margin: 0 auto;
    }

    .title-section {
        position: relative;
        margin-bottom: 2rem;
    }

    h1 {
        font-size: 2rem;
        color: #1a1a1a;
        margin: 0;
    }

    .alternative-titles {
        position: relative;
        display: inline-block;
        margin-left: 1rem;
    }

    .title-preview {
        color: #4a5568;
        cursor: pointer;
    }

    .title-popup {
        display: none;
        position: absolute;
        top: 100%;
        left: 0;
        background: white;
        padding: 1rem;
        border-radius: 0.5rem;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        z-index: 10;
        min-width: 200px;
    }

    .alternative-titles:hover .title-popup {
        display: block;
    }

    .info-section {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        margin: 1.5rem 0 2.5rem;
    }

    .info-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(100px, auto));
        gap: 2rem;
        width: 100%;
    }

    .label {
        font-weight: 500;
        color: #4a5568;
        margin-right: 0.5rem;
    }

    .index-button {
        background: none;
        border: none;
        cursor: pointer;
        position: relative;
        padding: 0.5rem;
    }

    .index-popup {
        display: none;
        position: absolute;
        right: 100%;
        top: 0;
        background: white;
        padding: 1rem;
        border-radius: 0.5rem;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        z-index: 10;
        min-width: 300px;
    }

    .index-button:hover .index-popup {
        display: block;
    }

    .content-section {
        margin-bottom: 2rem;
    }

    .content-card {
        background: white;
        padding: 2rem;
        border-radius: 0.5rem;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    }

    .themes {
        display: flex;
        flex-wrap: wrap;
        gap: 0.5rem;
        margin-top: 1rem;
    }

    .theme-tag {
        background: #e2e8f0;
        padding: 0.25rem 0.75rem;
        border-radius: 1rem;
        font-size: 0.875rem;
        color: #4a5568;
    }

    .cards-section {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
        gap: 2rem;
    }

    .info-card {
        background: white;
        padding: 1.5rem;
        border-radius: 0.5rem;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    }

    .status-card .status-badge {
        display: inline-block;
        padding: 0.25rem 0.75rem;
        border-radius: 1rem;
        font-size: 0.875rem;
        margin-bottom: 1rem;
    }

    .status-badge.not_started { background: #e2e8f0; }
    .status-badge.in_progress { background: #90cdf4; }
    .status-badge.completed { background: #9ae6b4; }
    .status-badge.error { background: #feb2b2; }
    .status-badge.queued { background: #fbd38d; }

    .progress-bar {
        width: 100%;
        height: 0.5rem;
        background: #e2e8f0;
        border-radius: 0.25rem;
        overflow: hidden;
    }

    .progress-fill {
        height: 100%;
        background: #4a9eff;
        transition: width 0.3s ease;
    }

    .status-details {
        margin-top: 0.5rem;
        font-size: 0.875rem;
        color: #4a5568;
    }

    .physical-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
        gap: 1rem;
        margin-bottom: 1rem;
    }

    .collapsible details {
        margin-top: 1rem;
    }

    .collapsible summary {
        cursor: pointer;
        color: #4a5568;
    }

    .details-content {
        margin-top: 1rem;
        padding: 1rem;
        background: #f8fafc;
        border-radius: 0.25rem;
    }

    .error {
        color: #e53e3e;
    }
</style>