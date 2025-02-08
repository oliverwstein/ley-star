<!-- src/routes/manuscripts/[title]/+page.svelte -->
<script lang="ts">
    import { page } from '$app/stores';
    import ManuscriptViewer from '$lib/components/ManuscriptViewer.svelte';
    
    const id = $page.params.id;
</script>

<ManuscriptViewer {id} />