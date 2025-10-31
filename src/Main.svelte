<script lang="ts">
  import App from "./App.svelte";
  import Providers from "./Providers.svelte";

  let activeTab: "models" | "providers" = "models";

  const GITHUB_URL = "https://github.com/BerriAI/litellm";
  const DOCS_URL = "https://docs.litellm.ai";
</script>

<div class="app-container">
  <!-- Header -->
  <header class="header">
    <div class="header-content">
      <div class="logo-section-header">
        <span class="logo-emoji">🚅</span>
        <span class="logo-text-header">LiteLLM</span>
      </div>
      <nav class="nav-links">
        <a href={DOCS_URL} target="_blank" rel="noopener noreferrer" class="nav-link">Docs</a>
        <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer" class="nav-link">GitHub</a>
      </nav>
    </div>
  </header>

  <!-- Tabs -->
  <div class="tabs-container">
    <div class="tabs">
      <button 
        class="tab" 
        class:active={activeTab === "models"}
        on:click={() => activeTab = "models"}
      >
        Models
      </button>
      <button 
        class="tab" 
        class:active={activeTab === "providers"}
        on:click={() => activeTab = "providers"}
      >
        Providers & Endpoints
      </button>
    </div>
  </div>

  <!-- Content -->
  {#if activeTab === "models"}
    <App />
  {:else}
    <Providers />
  {/if}
</div>

<style>
  /* Force light mode globally */
  :global(html) {
    color-scheme: light only;
    background-color: #ffffff;
  }

  :global(body) {
    background-color: #ffffff;
    color: #1a1a1a;
  }

  :root {
    --litellm-primary: #6366f1;
    --litellm-dark: #4f46e5;
    --litellm-purple: #8b5cf6;
    
    /* Force light mode colors */
    --background-color: #ffffff;
    --contrast: #1a1a1a;
    --muted-color: #6b7280;
    --card-background-color: #ffffff;
    --muted-border-color: #e5e7eb;
    --table-row-stripped-background-color: #f9fafb;
  }

  .app-container {
    min-height: 100vh;
    background-color: #ffffff;
  }

  /* Header */
  .header {
    background: #ffffff;
    border-bottom: 1px solid #e5e7eb;
    position: sticky;
    top: 0;
    z-index: 100;
  }

  .header-content {
    max-width: 1400px;
    margin: 0 auto;
    padding: 1.25rem 2rem;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .logo-section-header {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .logo-emoji {
    font-size: 1.5rem;
  }

  .logo-text-header {
    font-size: 1.25rem;
    font-weight: 700;
    background: linear-gradient(135deg, var(--litellm-primary) 0%, var(--litellm-purple) 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }

  .nav-links {
    display: flex;
    gap: 1.5rem;
    align-items: center;
  }

  .nav-link {
    color: var(--contrast);
    text-decoration: none;
    font-weight: 500;
    font-size: 0.9375rem;
    transition: color 0.2s ease;
  }

  .nav-link:hover {
    color: var(--litellm-primary);
  }

  /* Tabs */
  .tabs-container {
    background: #ffffff;
    border-bottom: 1px solid #e5e7eb;
    position: sticky;
    top: 64px;
    z-index: 99;
  }

  .tabs {
    max-width: 1400px;
    margin: 0 auto;
    padding: 0 2rem;
    display: flex;
    gap: 0.5rem;
  }

  .tab {
    padding: 1rem 1.5rem;
    border: none;
    background: transparent;
    color: var(--muted-color);
    font-weight: 500;
    font-size: 0.9375rem;
    cursor: pointer;
    border-bottom: 2px solid transparent;
    transition: all 0.2s ease;
  }

  .tab:hover {
    color: var(--contrast);
  }

  .tab.active {
    color: #2563eb;
    border-bottom-color: #2563eb;
  }
</style>

