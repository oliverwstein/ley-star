<!-- src/lib/components/manuscript/PageNavigation.svelte -->
<script lang="ts">
    import { onMount, onDestroy } from 'svelte';
    import { manuscriptService } from '$lib/services/manuscript.service';
    import type { Manuscript } from '$lib/types/manuscript';
    export let manuscript: Manuscript;
    
    let currentPage = 1;
    let pageInput = '1';
    let scrollContainer: HTMLElement;
    let loadedImages = new Map<number, string>();
    let loading = false;
    let isDragging = false;
    let startX: number;
    let scrollLeft: number;
    let visibleRangeStart = 1;
    let visibleRangeEnd = 1;
    let loadBuffer = 10; // Number of pages to load on each side of visible range
    // Get current page transcription
    

    // Load image URLs for a range of pages
    async function loadPageRange(start: number, end: number) {
        const range = Array.from(
            { length: end - start + 1 }, 
            (_, i) => start + i
        ).filter(page => 
            page > 0 && 
            page <= manuscript.metadata.total_pages && 
            !loadedImages.has(page)
        );

        if (range.length === 0) return;

        try {
            const loadPromises = range.map(async (page) => {
                const imageUrl = manuscriptService.getPageImage(manuscript.metadata.id, page);
                loadedImages.set(page, imageUrl);
            });
            
            await Promise.all(loadPromises);
            loadedImages = loadedImages; // Trigger reactivity
        } catch (error) {
            console.error('Error loading images:', error);
        }
    }

    // Update which pages are visible and load nearby pages
    function updateVisibleRange() {
        if (!scrollContainer) return;

        const containerWidth = scrollContainer.offsetWidth;
        const scrollPosition = scrollContainer.scrollLeft;
        const thumbnailWidth = 116; // 100px width + 16px gap

        visibleRangeStart = Math.max(1, Math.floor(scrollPosition / thumbnailWidth));
        visibleRangeEnd = Math.min(
            manuscript.metadata.total_pages,
            Math.ceil((scrollPosition + containerWidth) / thumbnailWidth)
        );

        // Load buffer pages on either side
        const loadStart = Math.max(1, visibleRangeStart - loadBuffer);
        const loadEnd = Math.min(manuscript.metadata.total_pages, visibleRangeEnd + loadBuffer);
        
        loadPageRange(loadStart, loadEnd);
    }

    // Handle scroll events with debouncing
    let scrollTimeout: ReturnType<typeof setTimeout>;
    function handleScroll() {
        clearTimeout(scrollTimeout);
        scrollTimeout = setTimeout(updateVisibleRange, 100);
    }

    // Mouse drag handling
    function handleMouseDown(e: MouseEvent) {
        isDragging = true;
        startX = e.pageX - scrollContainer.offsetLeft;
        scrollLeft = scrollContainer.scrollLeft;
        scrollContainer.style.scrollBehavior = 'auto';
        scrollContainer.style.cursor = 'grabbing';
    }

    function handleMouseMove(e: MouseEvent) {
        if (!isDragging) return;
        e.preventDefault();
        const x = e.pageX - scrollContainer.offsetLeft;
        const walk = (x - startX) * 2;
        scrollContainer.scrollLeft = scrollLeft - walk;
        handleScroll();
    }

    function handleDragEnd() {
        isDragging = false;
        scrollContainer.style.cursor = 'grab';
        scrollContainer.style.scrollBehavior = 'smooth';
    }

    // Handle manual page input
    function handlePageInput() {
        const newPage = parseInt(pageInput);
        if (
            !isNaN(newPage) && 
            newPage >= 1 && 
            newPage <= manuscript.metadata.total_pages
        ) {
            navigateToPage(newPage);
        } else {
            pageInput = currentPage.toString();
        }
    }

    // Navigate to a specific page
    function navigateToPage(page: number) {
        if (page < 1 || page > manuscript.metadata.total_pages) return;
        
        currentPage = page;
        pageInput = page.toString();
        
        // Find the thumbnail element and scroll it into view
        const thumbnail = document.querySelector(`[data-page="${page}"]`);
        thumbnail?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
        
        // Load the target page and surrounding pages
        const loadStart = Math.max(1, page - loadBuffer);
        const loadEnd = Math.min(manuscript.metadata.total_pages, page + loadBuffer);
        loadPageRange(loadStart, loadEnd);
    }

    onMount(() => {
        // Initial load of visible pages plus buffer
        updateVisibleRange();
        
        // Add scroll listener to container
        scrollContainer?.addEventListener('scroll', handleScroll);
        
        // Add global mouse event listeners for drag
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleDragEnd);
    });

    onDestroy(() => {
        scrollContainer?.removeEventListener('scroll', handleScroll);
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleDragEnd);
        clearTimeout(scrollTimeout);
    });

    // Get transcription status for current page
    $: currentTranscription = manuscript.pages?.[currentPage]?.transcription;
    $: currentPageTranscribed = !!currentTranscription;
    console.log(manuscript.pages?.[currentPage]);
</script>

<div class="page-navigation">
    <div class="page-controls">
        <button 
            class="nav-button"
            disabled={currentPage === 1}
            on:click={() => navigateToPage(currentPage - 1)}
        >
            ←
        </button>
        
        <div class="page-input">
            <input
                type="text"
                bind:value={pageInput}
                on:blur={handlePageInput}
                on:keydown={(e) => e.key === 'Enter' && handlePageInput()}
            />
            <span class="page-total">/ {manuscript.metadata.total_pages}</span>
        </div>

        <button 
            class="nav-button"
            disabled={currentPage === manuscript.metadata.total_pages}
            on:click={() => navigateToPage(currentPage + 1)}
        >
            →
        </button>
    </div>

    <div 
        class="thumbnail-scroll" 
        bind:this={scrollContainer}
        role="toolbar"
        aria-label="Page thumbnails"
        tabindex="0"
        on:mousedown={handleMouseDown}
        on:keydown={(e) => {
            if (e.key === 'ArrowLeft') {
                e.preventDefault();
                navigateToPage(currentPage - 1);
            } else if (e.key === 'ArrowRight') {
                e.preventDefault();
                navigateToPage(currentPage + 1);
            }
        }}
    >
        <div class="thumbnail-track">
            {#each Array(manuscript.metadata.total_pages) as _, i}
                {@const page = i + 1}
                <button 
                    type="button"
                    class="thumbnail-container"
                    class:active={page === currentPage}
                    on:click={() => navigateToPage(page)}
                    on:keydown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            navigateToPage(page);
                        }
                    }}
                    data-page={page}
                >
                    {#if loadedImages.has(page)}
                        <img
                            src={loadedImages.get(page)}
                            alt={`Page ${page}`}
                            class="thumbnail"
                            loading="lazy"
                            draggable="false"
                        />
                    {:else}
                        <div 
                            class="thumbnail-placeholder"
                            data-page={page}
                        >
                            {page}
                        </div>
                    {/if}
                </button>
            {/each}
        </div>
    </div>

    <!-- Page Content -->
    <div class="page-content">
        <div class="page-status">
            <span>Page {currentPage}</span>
            {#if currentPageTranscribed}
                <span class="transcribed-badge">Transcribed</span>
            {/if}
        </div>

        <div class="content-container">
            <!-- Image Section -->
            <div class="image-section">
                {#if loadedImages.has(currentPage)}
                    <img
                        src={loadedImages.get(currentPage)}
                        alt={`Large view of page ${currentPage}`}
                        class="large-page-image"
                    />
                {:else}
                    <div class="loading-placeholder">
                        Loading page {currentPage}...
                    </div>
                {/if}
            </div>

            <!-- Transcription Section -->
            {#if currentTranscription}
                <div class="transcription-section">
                    {#if currentTranscription.body?.length}
                        <h2>Transcription</h2>
                        <!-- Main Text Blocks -->
                        <div class="text-blocks">
                            {#each currentTranscription.body as section}
                                <div class="text-block">
                                    <div class="text-content" title={currentTranscription.transcription_notes}>
                                        {section.text.replace(/\|/g, "\n")}
                                    </div>
                                </div>
                            {/each}
                        </div>
                    {/if}

                    <!-- Additional Content -->
                    {#if currentTranscription.marginalia?.length || currentTranscription.notes?.length || currentTranscription.illustrations?.length}
                        <div class="additional-content">
                            {#if currentTranscription.marginalia?.length}
                                <div class="content-section">
                                    <h3>Marginalia</h3>
                                    <ul>
                                        {#each currentTranscription.marginalia as note}
                                            <li>
                                                <strong>{note.location}:</strong> {note.text.replace(/\|/g, "\n")}
                                                {#if note.hand}
                                                    <em>(Hand: {note.hand})</em>
                                                {/if}
                                            </li>
                                        {/each}
                                    </ul>
                                </div>
                            {/if}

                            {#if currentTranscription.notes?.length}
                                <div class="content-section">
                                    <h3>Notes</h3>
                                    <ul>
                                        {#each currentTranscription.notes as note}
                                            <li>
                                                <strong>{note.type}:</strong> {note.text.replace(/\|/g, "\n")}
                                                {#if note.location}
                                                    <em>({note.location})</em>
                                                {/if}
                                            </li>
                                        {/each}
                                    </ul>
                                </div>
                            {/if}

                            {#if currentTranscription.illustrations?.length}
                                <div class="content-section">
                                    <h3>Illustrations</h3>
                                    <ul>
                                        {#each currentTranscription.illustrations as illustration}
                                            <li>
                                                <strong>{illustration.location}:</strong> {illustration.description}
                                                {#if illustration.dimensions}
                                                    <em>({illustration.dimensions})</em>
                                                {/if}
                                            </li>
                                        {/each}
                                    </ul>
                                </div>
                            {/if}
                        </div>
                    {/if}
                </div>
            {/if}
        </div>
    </div>
</div>

<style>
    .page-navigation {
        background: rgba(255, 255, 255, 0.9);
        border: 1px solid #e5e7eb;
        border-radius: 8px;
        padding: 1rem;
        margin: 2rem 0;
    }

    .page-controls {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 1rem;
        margin-bottom: 1rem;
    }

    .nav-button {
        padding: 0.5rem 1rem;
        border: 1px solid #e5e7eb;
        border-radius: 4px;
        background: white;
        cursor: pointer;
        transition: all 0.2s;
    }

    .nav-button:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }

    .nav-button:not(:disabled):hover {
        background: #f3f4f6;
    }

    .page-input {
        display: flex;
        align-items: center;
        gap: 0.5rem;
    }

    .page-input input {
        width: 4rem;
        padding: 0.5rem;
        border: 1px solid #e5e7eb;
        border-radius: 4px;
        text-align: center;
    }

    .page-total {
        color: #6b7280;
    }

    .thumbnail-scroll {
        position: relative;
        overflow: hidden;
        padding: 1rem 0;
        cursor: grab;
        margin: 0 -1rem;
    }

    .thumbnail-track {
        display: flex;
        gap: 1rem;
        padding: 0 1rem;
        min-width: 100%;
        overflow-x: scroll;
        scroll-behavior: smooth;
        -webkit-overflow-scrolling: touch;
        scrollbar-width: none;
        -ms-overflow-style: none;
    }

    .thumbnail-track::-webkit-scrollbar {
        display: none;
    }

    .thumbnail-container {
        flex: 0 0 100px;
        height: 140px;
        border: 2px solid transparent;
        border-radius: 4px;
        cursor: pointer;
        transition: all 0.2s;
        padding: 0;
        background: none;
        scroll-snap-align: center;
    }

    .thumbnail-container:hover {
        border-color: #4a9eff;
    }

    .thumbnail-container.active {
        border-color: #2563eb;
    }

    .thumbnail {
        width: 100%;
        height: 100%;
        object-fit: cover;
        border-radius: 2px;
        pointer-events: none;
    }

    .thumbnail-placeholder {
        width: 100%;
        height: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
        background: #f3f4f6;
        color: #6b7280;
        border-radius: 2px;
    }

    .page-status {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 1rem;
        color: #4b5563;
    }

    .transcribed-badge {
        background: #10b981;
        color: white;
        padding: 0.25rem 0.75rem;
        border-radius: 9999px;
        font-size: 0.875rem;
    }

    .large-page-image {
        max-width: 100%;
        max-height: 800px;
        object-fit: contain;
        border-radius: 2px;
    }

    .loading-placeholder {
        display: flex;
        justify-content: center;
        align-items: center;
        height: 400px;
        background: #f3f4f6;
        color: #6b7280;
        border-radius: 4px;
    }
    .page-content {
        margin-top: 2rem;
        border-top: 1px solid #e5e7eb;
        padding-top: 1rem;
    }

    .content-container {
        display: grid;
        grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
        gap: 2rem;
        align-items: start;
    }

    .image-section {
        display: flex;
        justify-content: center;
        align-items: flex-start;
        background: #f3f4f6;
        border-radius: 4px;
        padding: 1rem;
        min-height: 400px;
    }

    .transcription-section {
        padding: 1rem;
        background: rgba(255, 255, 255, 0.5);
        border-radius: 4px;
        border: 1px solid #e5e7eb;
        max-height: 800px;
        overflow-y: auto;
    }

    .text-blocks {
        margin-bottom: 2rem;
    }

    .text-block {
        margin-bottom: 1.5rem;
    }

    .text-content {
        white-space: pre-wrap;
        font-family: 'EB Garamond', serif;
        line-height: 1.6;
        cursor: help;
    }

    .additional-content {
        border-top: 1px solid #e5e7eb;
        padding-top: 1rem;
    }

    .content-section {
        margin-bottom: 1.5rem;
    }

    .content-section ul {
        list-style-type: none;
        padding: 0;
        margin: 0;
    }

    .content-section li {
        margin-bottom: 0.5rem;
        font-size: 0.875rem;
        line-height: 1.5;
    }

    .content-section strong {
        color: #4b5563;
    }

    .content-section em {
        color: #6b7280;
        font-style: italic;
        margin-left: 0.5rem;
    }

    /* Scrollbar styling for transcription section */
    .transcription-section::-webkit-scrollbar {
        width: 8px;
    }

    .transcription-section::-webkit-scrollbar-track {
        background: #f3f4f6;
        border-radius: 4px;
    }

    .transcription-section::-webkit-scrollbar-thumb {
        background: #cbd5e1;
        border-radius: 4px;
    }

    .transcription-section::-webkit-scrollbar-thumb:hover {
        background: #94a3b8;
    }

</style>