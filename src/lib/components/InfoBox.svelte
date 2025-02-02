<!-- src/lib/components/InfoBox.svelte -->
<script lang="ts">
    export let serverConnected: boolean;
  </script>
  
  <div class="info-wrapper">
      <div class="content">
        <div class="text-content">
          <p class="mb-6">
            Leystar is your portal to centuries of medieval and renaissance manuscripts, transforming static digital images into a living, searchable archive that reveals hidden connections across time. Unlike traditional manuscript databases, Leystar lets you search not just titles and metadata, but the actual content of pages—from main text to marginal notes—making it possible to trace ideas, phrases, and annotations across manuscripts spanning different centuries and collections. With multilingual search capabilities, you can search in modern English to find relevant passages even in Church Latin, Old French, or Middle English manuscripts.
          </p>
        </div>
        <div class="button-container">
          <a
            href="/manuscripts"
            class="explore-button"
            class:disabled={!serverConnected}
            aria-disabled={!serverConnected}
          >
            Explore Manuscripts
          </a>
        </div>
      </div>
    </div>
  
    <style>
      .info-wrapper {
        width: 100vw;
        padding: 0 5vw;
        box-sizing: border-box;
      }
  
      .content {
        width: 100%;
        background: rgba(245, 243, 232, 0.75);
        border: 1px solid #e5e7eb;
        border-radius: 4px;
        padding: 2rem;
        box-sizing: border-box;
      }
  
      .text-content {
        font-size: 1.125rem;
        line-height: 1.6;
        color: #1a1a1a;
      }
  
      p {
        margin: 0;
      }
  
      .button-container {
          text-align: center;
      }
  
      .explore-button {
        display: inline-block;
        background: #1a1a1a;
        color: #f5f3e8;
        padding: 0.75rem 1.5rem;
        border-radius: 4px;
        text-decoration: none;
        font-weight: 500;
        transition: background-color 0.2s ease;
        cursor: pointer;
      }
  
      .explore-button:hover {
        background: #333;
      }
  
      .explore-button.disabled {
        background: #999;
        color: #ccc;
        cursor: not-allowed;
        pointer-events: none; /* Ensure no click events fire */
      }
    </style>