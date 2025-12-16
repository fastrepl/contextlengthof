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
      <div class="left-section">
        <div class="logo-section-header">
          <span class="logo-emoji">🚅</span>
          <span class="logo-text-header">LiteLLM</span>
        </div>
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
            AI Gateway - Endpoints & Providers
          </button>
        </div>
      </div>
      <nav class="nav-links">
        <a href={DOCS_URL} target="_blank" rel="noopener noreferrer" class="nav-link">Docs</a>
        <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer" class="nav-link">GitHub</a>
      </nav>
    </div>
  </header>

  <!-- Content -->
  {#if activeTab === "models"}
    <App />
  {:else}
    <Providers />
  {/if}
</div>

<style>
  /* Theme support - respects system preference */
  :global(html) {
    color-scheme: light dark;
  }

  :global(body) {
    background-color: var(--bg-color);
    color: var(--text-color);
  }

  /* Scrollbar styling for dark/light mode */
  :global(*::-webkit-scrollbar) {
    width: 10px;
    height: 10px;
  }

  :global(*::-webkit-scrollbar-track) {
    background: var(--bg-secondary);
  }

  :global(*::-webkit-scrollbar-thumb) {
    background: var(--border-color-strong);
    border-radius: 5px;
  }

  :global(*::-webkit-scrollbar-thumb:hover) {
    background: var(--muted-color);
  }

  :root {
    --litellm-primary: #6366f1;
    --litellm-dark: #4f46e5;
    --litellm-purple: #8b5cf6;

    /* Light mode colors (default) */
    --bg-color: #ffffff;
    --bg-secondary: #f9fafb;
    --bg-tertiary: #f3f4f6;
    --text-color: #1a1a1a;
    --text-secondary: #4b5563;
    --muted-color: #6b7280;
    --border-color: #e5e7eb;
    --border-color-strong: #d1d5db;
    --card-bg: #ffffff;
    --code-bg: #f8f9fa;
    --code-text: #24292f;
    --hover-bg: #f9fafb;
    --link-color: #2563eb;
    --link-hover: #1d4ed8;
  }

  @media (prefers-color-scheme: dark) {
    :root {
      --bg-color: #0f0f23;
      --bg-secondary: #1a1a2e;
      --bg-tertiary: #252542;
      --text-color: #e5e5e5;
      --text-secondary: #a1a1aa;
      --muted-color: #9ca3af;
      --border-color: #2d2d44;
      --border-color-strong: #3d3d5c;
      --card-bg: #1a1a2e;
      --code-bg: #1e1e32;
      --code-text: #e5e5e5;
      --hover-bg: #252542;
      --link-color: #60a5fa;
      --link-hover: #93c5fd;
    }
  }

  .app-container {
    min-height: 100vh;
    background-color: var(--bg-color);
  }

  /* Header */
  .header {
    background: var(--bg-color);
    border-bottom: 1px solid var(--border-color);
    position: sticky;
    top: 0;
    z-index: 100;
  }

  .header-content {
    max-width: 1400px;
    margin: 0 auto;
    padding: 1rem 2rem;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .left-section {
    display: flex;
    align-items: center;
    gap: 2rem;
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
    color: var(--text-color);
  }

  .tabs {
    display: flex;
    gap: 0.25rem;
    align-items: center;
  }

  .tab {
    padding: 0.625rem 1rem;
    border: none;
    background: transparent;
    color: var(--muted-color);
    font-weight: 500;
    font-size: 0.9375rem;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .tab:hover {
    color: var(--text-color);
  }

  .tab.active {
    color: var(--text-color);
  }

  .nav-links {
    display: flex;
    gap: 1.5rem;
    align-items: center;
  }

  .nav-link {
    color: var(--text-color);
    text-decoration: none;
    font-weight: 500;
    font-size: 0.9375rem;
    transition: color 0.2s ease;
  }

  .nav-link:hover {
    color: var(--litellm-primary);
  }
</style>

