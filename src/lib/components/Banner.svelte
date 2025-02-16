<!-- src/lib/components/Banner.svelte -->
<script lang="ts">
    import { onMount } from 'svelte';
    // import LoginModal from './LoginModal.svelte';
    // import { authService } from '$lib/services/auth.service';
  
    // let isAdmin = false;
    // let showLoginModal = false;
  
    // onMount(() => {
    //   const unsubscribe = authService.subscribe(state => {
    //     isAdmin = state.isAdmin;
    //   });
  
    //   return unsubscribe;
    // });
  
    // async function handleAuthAction() {
    //   if (isAdmin) {
    //     await authService.logout();
    //   } else {
    //     showLoginModal = true;
    //   }
    // }
  </script>
  
  <svelte:head>
    <link href="https://fonts.googleapis.com/css2?family=EB+Garamond:wght@500&display=swap" rel="stylesheet">
  </svelte:head>
  
  <div class="banner-wrapper">
    <header>
      <div class="content">
        <img src="/icon.png" alt="Leyster Logo" />
        <h1>Leystar</h1>
        <slot></slot>
        <!-- <button 
          class="auth-button" 
          on:click={handleAuthAction}
        >
          {isAdmin ? 'Logout' : 'Login'}
        </button> -->
      </div>
    </header>
  </div>
  
  <!-- {#if !isAdmin && showLoginModal}
    <LoginModal 
      on:close={() => showLoginModal = false}
    />
  {/if} -->
  
  <style>
    .banner-wrapper {
      width: 100vw;
      padding: 2vh 2vw 0;
      box-sizing: border-box;
    }
  
    header {
      width: 100%;
      background: #f5f3e8cb;
      border: 1px solid #e5e7eb;
      border-radius: 4px;
      padding: 1rem 2rem;
      box-sizing: border-box;
      position: relative;
    }
  
    .content {
      display: flex;
      align-items: center;
      gap: 1.5rem;
      max-width: 100%;
    }
  
    img {
      height: 6rem;
      width: 6rem;
      flex-shrink: 0;
    }
  
    h1 {
      font-family: 'EB Garamond', serif;
      font-weight: 500;
      font-size: 2rem;
      color: #1a1a1a;
      letter-spacing: 0.01em;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
  
    .auth-button {
      position: absolute;
      top: 1rem;
      right: 1rem;
      background: none;
      border: 1px solid #4a5568;
      color: #4a5568;
      padding: 0.25rem 0.75rem;
      border-radius: 4px;
      cursor: pointer;
      transition: all 0.2s;
      font-size: 0.875rem;
    }
  
    .auth-button:hover {
      background: #f7fafc;
      border-color: #2d3748;
      color: #2d3748;
    }
</style>