<script lang="ts">
  import { onMount } from "svelte";
  import App from "./App.svelte";
  import Providers from "./Providers.svelte";
  import RequestForm from "./RequestForm.svelte";

  let activeTab: "models" | "providers" = "models";
  let mobileMenuOpen = false;
  let requestForm: RequestForm;

  const GITHUB_URL = "https://github.com/BerriAI/litellm";
  const DOCS_URL = "https://docs.litellm.ai";

  function toggleMobileMenu() {
    mobileMenuOpen = !mobileMenuOpen;
  }

  function closeMobileMenu() {
    mobileMenuOpen = false;
  }

  function selectTab(tab: "models" | "providers") {
    activeTab = tab;
    closeMobileMenu();
  }
  const PROVIDERS_URL = "https://raw.githubusercontent.com/BerriAI/litellm/main/provider_endpoints_support.json";
  const MODELS_URL = "https://raw.githubusercontent.com/BerriAI/litellm/main/model_prices_and_context_window.json";

  let providerCount = 0;
  let endpointCount = 0;
  let providerEndpointCount = 0;
  let modelCount = 0;
  let statsLoading = true;

  onMount(async () => {
    // Check if URL has ?request=true to auto-open the form
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('request') === 'true') {
      requestForm?.openModal();
    }

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
      <div class="logo-section-header">
        <span class="logo-emoji">🚅</span>
        <span class="logo-text-header">LiteLLM</span>
      </div>

      <!-- Desktop Navigation -->
      <div class="desktop-nav">
        <div class="tabs">
          <button
            class="tab"
            class:active={activeTab === "models"}
            on:click={() => selectTab("models")}
          >
            Models
          </button>
          <button
            class="tab"
            class:active={activeTab === "providers"}
            on:click={() => selectTab("providers")}
          >
            AI Gateway - Endpoints & Providers
          </button>
        </div>
        <nav class="nav-links">
          <button class="request-button" on:click={() => requestForm.openModal()}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="8" y1="3" x2="8" y2="13"></line>
              <line x1="3" y1="8" x2="13" y2="8"></line>
            </svg>
            Request Model, Provider, Endpoint
          </button>
          <a href={DOCS_URL} target="_blank" rel="noopener noreferrer" class="nav-link">Docs</a>
          <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer" class="nav-link">GitHub</a>
        </nav>
      </div>

      <!-- Mobile Menu Button -->
      <button
        class="mobile-menu-btn"
        on:click={toggleMobileMenu}
        aria-label="Toggle menu"
        aria-expanded={mobileMenuOpen}
      >
        <span class="hamburger" class:open={mobileMenuOpen}></span>
      </button>
    </div>

    <!-- Mobile Menu -->
    {#if mobileMenuOpen}
      <div class="mobile-menu">
        <button class="mobile-request-button" on:click={() => { requestForm.openModal(); closeMobileMenu(); }}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="8" y1="3" x2="8" y2="13"></line>
            <line x1="3" y1="8" x2="13" y2="8"></line>
          </svg>
          Request Model, Provider, Endpoint
        </button>
        <div class="mobile-tabs">
          <button
            class="mobile-tab"
            class:active={activeTab === "models"}
            on:click={() => selectTab("models")}
          >
            Models
          </button>
          <button
            class="mobile-tab"
            class:active={activeTab === "providers"}
            on:click={() => selectTab("providers")}
          >
            AI Gateway - Endpoints & Providers
          </button>
        </div>
        <div class="mobile-links">
          <a href={DOCS_URL} target="_blank" rel="noopener noreferrer" class="mobile-link" on:click={closeMobileMenu}>Docs</a>
          <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer" class="mobile-link" on:click={closeMobileMenu}>GitHub</a>
        </div>
      </div>
    {/if}
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

  <!-- Request Form Modal -->
  <RequestForm bind:this={requestForm} />
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

  .desktop-nav {
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

  .request-button {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.625rem 1rem;
    background-color: #000;
    color: white;
    border: none;
    border-radius: 100px;
    font-weight: 500;
    font-size: 0.9375rem;
    cursor: pointer;
    transition: all 0.2s ease;
    white-space: nowrap;
  }

  .request-button:hover {
    background-color: #333;
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  }

  .request-button svg {
    width: 16px;
    height: 16px;
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

  /* Mobile Menu Button - Hidden on desktop */
  .mobile-menu-btn {
    display: none;
    background: none;
    border: none;
    cursor: pointer;
    padding: 0.5rem;
    z-index: 101;
  }

  .hamburger {
    display: block;
    width: 24px;
    height: 2px;
    background-color: var(--text-color);
    position: relative;
    transition: background-color 0.2s ease;
  }

  .hamburger::before,
  .hamburger::after {
    content: "";
    position: absolute;
    width: 24px;
    height: 2px;
    background-color: var(--text-color);
    left: 0;
    transition: transform 0.3s ease;
  }

  .hamburger::before {
    top: -7px;
  }

  .hamburger::after {
    top: 7px;
  }

  /* Hamburger animation when open */
  .hamburger.open {
    background-color: transparent;
  }

  .hamburger.open::before {
    transform: rotate(45deg) translate(5px, 5px);
  }

  .hamburger.open::after {
    transform: rotate(-45deg) translate(5px, -5px);
  }

  /* Mobile Menu Panel */
  .mobile-menu {
    display: none;
    background: var(--bg-color);
    border-top: 1px solid var(--border-color);
    padding: 1rem;
  }

  .mobile-request-button {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    padding: 0.875rem 1rem;
    background-color: #000;
    color: white;
    border: none;
    border-radius: 100px;
    font-weight: 600;
    font-size: 1rem;
    cursor: pointer;
    transition: all 0.2s ease;
    margin-bottom: 1rem;
  }

  .mobile-request-button:hover {
    background-color: #333;
  }

  .mobile-request-button svg {
    width: 16px;
    height: 16px;
  }

  .mobile-tabs {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    margin-bottom: 1rem;
    padding-bottom: 1rem;
    border-bottom: 1px solid var(--border-color);
  }

  .mobile-tab {
    padding: 0.75rem 1rem;
    border: none;
    background: transparent;
    color: var(--muted-color);
    font-weight: 500;
    font-size: 1rem;
    cursor: pointer;
    text-align: left;
    border-radius: 8px;
    transition: all 0.2s ease;
  }

  .mobile-tab:hover {
    background-color: var(--bg-tertiary);
    color: var(--text-color);
  }

  .mobile-tab.active {
    background-color: var(--bg-tertiary);
    color: var(--text-color);
  }

  .mobile-links {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .mobile-link {
    padding: 0.75rem 1rem;
    color: var(--text-color);
    text-decoration: none;
    font-weight: 500;
    font-size: 1rem;
    border-radius: 8px;
    transition: all 0.2s ease;
  }

  .mobile-link:hover {
    background-color: var(--bg-tertiary);
    color: var(--litellm-primary);
  }

  /* Mobile Responsive */
  @media (max-width: 768px) {
    .header-content {
      padding: 0.75rem 1rem;
    }

    .desktop-nav {
      display: none;
    }

    .mobile-menu-btn {
      display: block;
    }

    .mobile-menu {
      display: block;
    }
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
    background: var(--bg-secondary);
    border: 1px solid var(--border-color);
    border-radius: 6px;
    padding: 0.875rem 0.75rem;
    text-align: center;
    transition: background-color 0.2s ease, border-color 0.2s ease;
  }

  .stat-card:hover {
    background-color: var(--hover-bg);
    border-color: var(--border-color-strong);
  }

  .stat-value {
    font-size: 1.375rem;
    font-weight: 600;
    color: var(--text-color);
    line-height: 1;
    margin-bottom: 0.25rem;
  }

  .stat-label {
    font-size: 0.6875rem;
    font-weight: 500;
    color: var(--muted-color);
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

    .tabs {
      width: 100%;
      flex-wrap: wrap;
    }

    .tab {
      font-size: 0.875rem;
      padding: 0.5rem 0.75rem;
    }

    .nav-links {
      flex-wrap: wrap;
    }

    .request-button {
      font-size: 0.8125rem;
      padding: 0.5rem 0.75rem;
      white-space: nowrap;
    }
  }
</style>

