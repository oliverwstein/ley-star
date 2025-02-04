<!-- src/lib/components/Banner.svelte -->
<svelte:head>
  <link href="https://fonts.googleapis.com/css2?family=EB+Garamond:wght@500&display=swap" rel="stylesheet">
</svelte:head>

<div class="banner-wrapper">
  <header>
    <div class="content">
      <img src="/icon.png" alt="Leyster Logo" />
      <h1>Leystar</h1>
      <slot></slot>
    </div>
  </header>
</div>

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
  }

  .content {
    display: flex;
    align-items: center;
    gap: 1.5rem;
    max-width: 100%;
  }

  img {
    height: 3rem;
    width: 3rem;
    flex-shrink: 0;
    filter: brightness(1.2) drop-shadow(0 0 4px rgba(255, 255, 255, 0.8));
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
</style>