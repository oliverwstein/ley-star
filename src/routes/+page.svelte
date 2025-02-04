<!-- src/routes/+page.svelte -->
<script lang="ts">
    import { onMount } from 'svelte';
    import InfoBox from '$lib/old_components/InfoBox.svelte';
  
    const apiUrl = 'http://127.0.0.1:5000';
  
    let serverConnected: boolean = false;
    let loading: boolean = true;
  
    onMount(async () => {
      try {
        if (!apiUrl) {
          throw new Error('API_URL environment variable not found');
        }
        const response = await fetch(`${apiUrl}/`);
        if (response.ok) {
          serverConnected = true;
        }
      } catch (e: any) {
        console.error("Error connecting to server:", e.message);
      }
      loading = false;
    });
</script>
  
<main class="container">
  <InfoBox {serverConnected} />
</main>

<style>
  .container {
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
  }
</style>