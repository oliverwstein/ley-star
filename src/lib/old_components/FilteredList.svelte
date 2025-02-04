<!-- src/lib/components/FilteredList.svelte -->
<script lang="ts">
    export let data: any[];
    export let field: string;
    export let header: any;
    export let row: any;
    
    let search = '';
    
    $: filtered = search === '' 
      ? data 
      : data.filter(d => d[field].toLowerCase().includes(search.toLowerCase()));
  </script>
  
  <div class="list">
    <label class="filter-label">
      Filter: <input bind:value={search} class="filter-input" />
    </label>
    <div class="header">
      {@render header()}
    </div>
    <div class="content">
      {#each filtered as d}
        {@render row(d)}
      {/each}
    </div>
  </div>
  
  <style>
    .list {
      display: flex;
      flex-direction: column;
      height: 100%;
      min-height: 400px;
    }
    
    .filter-label {
      margin-bottom: 1rem;
    }
    
    .filter-input {
      padding: 0.5rem;
      margin-left: 0.5rem;
      border: 1px solid #ccc;
      border-radius: 4px;
    }
    
    .header {
      border-top: 1px solid #eee;
      padding: 0.2em 0;
    }
    
    .content {
      flex: 1;
      overflow: auto;
      padding-top: 0.5em;
      border-top: 1px solid #eee;
    }
  </style>