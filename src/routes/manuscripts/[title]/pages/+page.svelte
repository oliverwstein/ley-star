<!-- src/routes/manuscripts/[title]/pages/+page.svelte -->
<script lang="ts">
    import { page } from '$app/stores';
    import PageViewer from '$lib/components/PageViewer.svelte';
    
    const title = $page.params.title;
</script>

<PageViewer {title} />