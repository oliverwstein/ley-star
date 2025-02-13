<!-- src/routes/+layout.svelte -->
<script lang="ts">
    import Banner from '$lib/components/Banner.svelte';
  </script>
  
  <!-- Background Layer -->
  <div class="background-layer">
    <img src="/background.png" alt="" />
  </div>
  
  <!-- Content -->
  <div class="content">
      <Banner />
      <div class="spacing">
         <slot/>
      </div>
  </div>
  
  <style>
      .background-layer {
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          z-index: -1;
          overflow: hidden;
      }
  
      .background-layer img {
          width: 100%;
          height: 100%;
          object-fit: cover;
      }
  
      .content {
          position: relative;
          z-index: 1;
      }
  
      .spacing {
          margin-top: 2rem; /* Adds spacing between Banner and InfoBox */
      }
      :global(body) {
        font-family: 'EB Garamond', serif;
        font-size: 1.125rem;
        line-height: 1.6;
        -webkit-font-smoothing: antialiased;
        -moz-osx-font-smoothing: grayscale;
    }

    :global(h1, h2, h3, h4, h5, h6) {
        font-family: 'EB Garamond', serif;
        font-weight: 500;
        line-height: 1.2;
    }

    :global(button, input, select, textarea) {
        font-family: 'EB Garamond', serif;
    }
  </style>