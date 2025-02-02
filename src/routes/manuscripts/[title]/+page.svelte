<!-- src/routes/manuscripts/[title]/+page.svelte -->
<script lang="ts">
    import { page } from '$app/stores';
    import ManuscriptViewer from '$lib/components/ManuscriptViewer.svelte';
    
    const title = $page.params.title;
</script>

<ManuscriptViewer {title} />