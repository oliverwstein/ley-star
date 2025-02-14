<!-- src/routes/+page.svelte -->
<script lang="ts">
    import { onMount } from 'svelte';
    import InfoBox from '$lib/components/SplashBox.svelte';
    import { manuscriptService } from '$lib/services/manuscript.service';
  
    let serverConnected: boolean = false;
    let loading: boolean = true;
  
    onMount(async () => {
        try {
            serverConnected = await manuscriptService.testConnection();
            console.log('API URL:', import.meta.env.VITE_API_URL);
        } catch (e) {
            console.error("Error connecting to server:", 
                e instanceof Error ? e.message : String(e));
            serverConnected = false;
        } finally {
            loading = false;
        }
    });
</script>
  
<main class="container">
    <InfoBox {serverConnected} {loading} />
</main>

<style>
    .container {
        min-height: 100vh;
        display: flex;
        align-items: center;
        justify-content: center;
    }
</style>