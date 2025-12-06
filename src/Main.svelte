<script lang="ts">
  import { onMount } from "svelte";
  import App from "./App.svelte";
  import Providers from "./Providers.svelte";

  let activeTab: "models" | "providers" = "models";

  const GITHUB_URL = "https://github.com/BerriAI/litellm";
  const DOCS_URL = "https://docs.litellm.ai";
  const PROVIDERS_URL = "https://raw.githubusercontent.com/BerriAI/litellm/main/provider_endpoints_support.json";
  const MODELS_URL = "https://raw.githubusercontent.com/BerriAI/litellm/main/model_prices_and_context_window.json";

  let providerCount = 0;
  let endpointCount = 0;
  let providerEndpointCount = 0;
  let modelCount = 0;
  let statsLoading = true;

  onMount(async () => {
    try {
      // Fetch provider data
      const providersResponse = await fetch(PROVIDERS_URL);
      const providersData = await providersResponse.json();
      
      if (providersData.providers) {
        const providers = Object.entries(providersData.providers).map(([provider, info]: [string, any]) => ({
          provider,
          endpoints: info.endpoints || {}
        }));
        
        providerCount = providers.length;
        
        // Count unique endpoints
        const allEndpoints = new Set<string>();
        providers.forEach(p => {
          Object.keys(p.endpoints).forEach(e => allEndpoints.add(e));
        });
        endpointCount = allEndpoints.size;
        
        // Count provider + endpoint combinations
        providerEndpointCount = providers.reduce((total, provider) => {
          return total + Object.values(provider.endpoints).filter(supported => supported === true).length;
        }, 0);
      }

      // Fetch model data
      const modelsResponse = await fetch(MODELS_URL);
      const modelsText = await modelsResponse.text();
      const modelsData = JSON.parse(modelsText);
      modelCount = Object.keys(modelsData).length;
      
      statsLoading = false;
    } catch (error) {
      console.error("Failed to load statistics:", error);
      statsLoading = false;
    }
  });
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

  <!-- Statistics Section -->
  {#if !statsLoading}
    <div class="stats-section">
      <div class="stats-container">
        <div class="stat-card">
          <div class="stat-value">{modelCount}</div>
          <div class="stat-label">Models Supported</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">{providerCount}</div>
          <div class="stat-label">Providers</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">{endpointCount}</div>
          <div class="stat-label">Unique Endpoints</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">{providerEndpointCount}</div>
          <div class="stat-label">Provider + Endpoint Combinations</div>
        </div>
      </div>
    </div>
  {/if}

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
    color: #1a1a1a;
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
    color: #6b7280;
    font-weight: 500;
    font-size: 0.9375rem;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .tab:hover {
    color: #1a1a1a;
  }

  .tab.active {
    color: #1a1a1a;
  }

  .nav-links {
    display: flex;
    gap: 1.5rem;
    align-items: center;
  }

  .nav-link {
    color: #1a1a1a;
    text-decoration: none;
    font-weight: 500;
    font-size: 0.9375rem;
    transition: color 0.2s ease;
  }

  .nav-link:hover {
    color: var(--litellm-primary);
  }

  /* Statistics Section */
  .stats-section {
    max-width: 1400px;
    margin: 1.5rem auto;
    padding: 0 2rem;
  }

  .stats-container {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 0.75rem;
  }

  .stat-card {
    background: #fcfcfc;
    border: 1px solid #f5f5f5;
    border-radius: 6px;
    padding: 0.875rem 0.75rem;
    text-align: center;
    transition: background-color 0.2s ease, border-color 0.2s ease;
  }

  .stat-card:hover {
    background-color: #fafafa;
    border-color: #f0f0f0;
  }

  .stat-value {
    font-size: 1.375rem;
    font-weight: 600;
    color: #1a1a1a;
    line-height: 1;
    margin-bottom: 0.25rem;
  }

  .stat-label {
    font-size: 0.6875rem;
    font-weight: 500;
    color: #9ca3af;
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  /* Responsive Design */
  @media (max-width: 1024px) {
    .stats-container {
      grid-template-columns: repeat(2, 1fr);
    }
  }

  @media (max-width: 640px) {
    .stats-container {
      grid-template-columns: 1fr;
      gap: 0.75rem;
    }

    .stat-card {
      padding: 1rem;
    }

    .stat-value {
      font-size: 1.5rem;
    }

    .stat-label {
      font-size: 0.6875rem;
    }

    .left-section {
      flex-direction: column;
      align-items: flex-start;
      gap: 1rem;
    }

    .tabs {
      width: 100%;
      flex-wrap: wrap;
    }

    .tab {
      font-size: 0.875rem;
      padding: 0.5rem 0.75rem;
    }
  }
</style>

