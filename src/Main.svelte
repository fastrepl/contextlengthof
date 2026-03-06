<script lang="ts">
  import { onMount } from "svelte";
  import { fade } from "svelte/transition";
  import App from "./App.svelte";
  import Providers from "./Providers.svelte";
  import Cookbook from "./Cookbook.svelte";
  import Guardrails from "./Guardrails.svelte";
  import RequestForm from "./RequestForm.svelte";
  import { initAnalytics, trackPageView, trackTabChange } from "./analytics";

  let activeTab: "models" | "providers" | "cookbook" | "guardrails" = "models";
  let mobileMenuOpen = false;
  let requestForm: RequestForm;

  const GITHUB_URL = "https://github.com/BerriAI/litellm";
  const DOCS_URL = "https://docs.litellm.ai";

  function getTabFromPath(path: string): "models" | "providers" | "cookbook" | "guardrails" {
    if (path === "/providers" || path === "/providers/") {
      return "providers";
    } else if (path === "/cookbook" || path === "/cookbook/") {
      return "cookbook";
    } else if (path === "/guardrails" || path === "/guardrails/") {
      return "guardrails";
    }
    return "models";
  }

  function getPathFromTab(tab: "models" | "providers" | "cookbook" | "guardrails"): string {
    if (tab === "providers") return "/providers";
    if (tab === "cookbook") return "/cookbook";
    if (tab === "guardrails") return "/guardrails";
    return "/";
  }

  function toggleMobileMenu() {
    mobileMenuOpen = !mobileMenuOpen;
  }

  function closeMobileMenu() {
    mobileMenuOpen = false;
  }

  function selectTab(tab: "models" | "providers" | "cookbook" | "guardrails", updateUrl = true) {
    activeTab = tab;
    closeMobileMenu();
    if (tab === "models" || tab === "providers") {
      trackTabChange(tab);
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
    
    if (updateUrl) {
      const path = getPathFromTab(tab);
      window.history.pushState({ tab }, "", path);
    }
  }

  function handlePopState(event: PopStateEvent) {
    const tab = event.state?.tab || getTabFromPath(window.location.pathname);
    selectTab(tab, false);
  }
  const PROVIDERS_URL = "https://raw.githubusercontent.com/BerriAI/litellm/main/provider_endpoints_support.json";
  const MODELS_URL = "https://raw.githubusercontent.com/BerriAI/litellm/main/model_prices_and_context_window.json";

  let providerCount = 0;
  let endpointCount = 0;
  let providerEndpointCount = 0;
  let modelCount = 0;
  let statsLoading = true;
  let statsError = "";

  let displayModelCount = 0;
  let displayProviderCount = 0;
  let displayEndpointCount = 0;
  let displayComboCount = 0;

  function animateValue(start: number, end: number, duration: number, setter: (v: number) => void) {
    const startTime = performance.now();
    function step(now: number) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setter(Math.round(start + (end - start) * eased));
      if (progress < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  async function loadStats() {
    statsLoading = true;
    statsError = "";

    try {
      const providersResponse = await fetch(PROVIDERS_URL);
      if (!providersResponse.ok) {
        throw new Error(`Providers request failed (${providersResponse.status})`);
      }

      const providersData = await providersResponse.json();
      
      if (providersData.providers) {
        const providers = Object.entries(providersData.providers).map(([provider, info]: [string, any]) => ({
          provider,
          endpoints: info.endpoints || {}
        }));
        
        providerCount = providers.length;
        
        const allEndpoints = new Set<string>();
        providers.forEach(p => {
          Object.keys(p.endpoints).forEach(e => allEndpoints.add(e));
        });
        endpointCount = allEndpoints.size;
        
        providerEndpointCount = providers.reduce((total, provider) => {
          return total + Object.values(provider.endpoints).filter(supported => supported === true).length;
        }, 0);
      }

      const modelsResponse = await fetch(MODELS_URL);
      if (!modelsResponse.ok) {
        throw new Error(`Models request failed (${modelsResponse.status})`);
      }

      const modelsText = await modelsResponse.text();
      const modelsData = JSON.parse(modelsText);
      modelCount = Object.keys(modelsData).length;
      
      statsLoading = false;

      animateValue(0, modelCount, 800, (v) => displayModelCount = v);
      animateValue(0, providerCount, 600, (v) => displayProviderCount = v);
      animateValue(0, endpointCount, 600, (v) => displayEndpointCount = v);
      animateValue(0, providerEndpointCount, 700, (v) => displayComboCount = v);
    } catch (error) {
      console.error("Failed to load statistics:", error);
      statsError = "Live repository statistics are temporarily unavailable.";
      statsLoading = false;
    }
  }

  onMount(() => {
    initAnalytics();
    trackPageView('Home');

    const initialTab = getTabFromPath(window.location.pathname);
    activeTab = initialTab;
    
    window.history.replaceState({ tab: initialTab }, "", window.location.pathname);
    
    window.addEventListener("popstate", handlePopState);

    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('request') === 'true') {
      requestForm?.openModal();
    }

    void loadStats();

    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  });
</script>

<div class="app-container">
  <!-- Accent gradient bar -->
  <div class="accent-bar"></div>

  <!-- Header -->
  <header class="header">
    <div class="header-content">
      <a href="/" class="logo-section-header" on:click|preventDefault={() => selectTab("models")}>
        <span class="logo-emoji">🚅</span>
        <span class="logo-text-header">LiteLLM</span>
      </a>

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
            Endpoints & Providers
          </button>
          <button
            class="tab"
            class:active={activeTab === "cookbook"}
            on:click={() => selectTab("cookbook")}
          >
            Cookbook
          </button>
          <button
            class="tab"
            class:active={activeTab === "guardrails"}
            on:click={() => selectTab("guardrails")}
          >
            Guardrails
          </button>
        </div>
        <nav class="nav-links">
          <button class="request-button" on:click={() => requestForm.openModal()}>
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <line x1="8" y1="3" x2="8" y2="13"></line>
              <line x1="3" y1="8" x2="13" y2="8"></line>
            </svg>
            Request
          </button>
          <a href={DOCS_URL} target="_blank" rel="noopener noreferrer" class="nav-link">Docs</a>
          <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer" class="nav-link">
            <svg width="18" height="18" viewBox="0 0 16 16" fill="currentColor">
              <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/>
            </svg>
          </a>
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
            Endpoints & Providers
          </button>
          <button
            class="mobile-tab"
            class:active={activeTab === "cookbook"}
            on:click={() => selectTab("cookbook")}
          >
            Cookbook
          </button>
          <button
            class="mobile-tab"
            class:active={activeTab === "guardrails"}
            on:click={() => selectTab("guardrails")}
          >
            Guardrails
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
  {#if statsLoading}
    <div class="stats-section">
      <div class="stats-container">
        {#each [1,2,3,4] as _}
          <div class="stat-card skeleton">
            <div class="skeleton-value"></div>
            <div class="skeleton-label"></div>
          </div>
        {/each}
      </div>
    </div>
  {:else if statsError}
    <div class="stats-section">
      <div class="stats-error">
        <div>
          <p class="stats-error-label">Live status</p>
          <h3>{statsError}</h3>
          <p>Retry to refresh counts from the LiteLLM GitHub source of truth.</p>
        </div>
        <button class="stats-retry" on:click={loadStats}>Retry stats</button>
      </div>
    </div>
  {:else}
    <div class="stats-section">
      <div class="stats-caption">
        <span class="stats-caption-dot"></span>
        Live counts from LiteLLM GitHub resources
      </div>
      <div class="stats-container">
        <button class="stat-card" on:click={() => selectTab("models")}>
          <div class="stat-value">{displayModelCount.toLocaleString()}</div>
          <div class="stat-label">Models Supported</div>
        </button>
        <button class="stat-card" on:click={() => selectTab("providers")}>
          <div class="stat-value">{displayProviderCount.toLocaleString()}</div>
          <div class="stat-label">Providers</div>
        </button>
        <button class="stat-card" on:click={() => selectTab("providers")}>
          <div class="stat-value">{displayEndpointCount.toLocaleString()}</div>
          <div class="stat-label">Unique Endpoints</div>
        </button>
        <button class="stat-card" on:click={() => selectTab("providers")}>
          <div class="stat-value">{displayComboCount.toLocaleString()}</div>
          <div class="stat-label">Provider + Endpoint Combos</div>
        </button>
      </div>
    </div>
  {/if}

  <!-- Content -->
  {#key activeTab}
    <div in:fade={{ duration: 150, delay: 50 }}>
      {#if activeTab === "models"}
        <App />
      {:else if activeTab === "providers"}
        <Providers />
      {:else if activeTab === "cookbook"}
        <Cookbook />
      {:else if activeTab === "guardrails"}
        <Guardrails />
      {/if}
    </div>
  {/key}

  <!-- Request Form Modal -->
  <RequestForm bind:this={requestForm} />
</div>

<style>
  :global(html) {
    color-scheme: light dark;
  }

  :global(body) {
    background-color: var(--bg-color);
    color: var(--text-color);
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  }

  :global(::selection) {
    background: rgba(99, 102, 241, 0.2);
    color: inherit;
  }

  :global(*:focus-visible) {
    outline: 2px solid var(--litellm-primary);
    outline-offset: 2px;
  }

  :global(input:focus-visible),
  :global(textarea:focus-visible),
  :global(select:focus-visible) {
    outline: none;
  }

  :global(*::-webkit-scrollbar) {
    width: 8px;
    height: 8px;
  }

  :global(*::-webkit-scrollbar-track) {
    background: var(--bg-secondary);
  }

  :global(*::-webkit-scrollbar-thumb) {
    background: var(--border-color-strong);
    border-radius: 4px;
  }

  :global(*::-webkit-scrollbar-thumb:hover) {
    background: var(--muted-color);
  }

  :root {
    --litellm-primary: #6366f1;
    --litellm-dark: #4f46e5;
    --litellm-purple: #8b5cf6;
    --litellm-gradient: linear-gradient(135deg, #6366f1, #8b5cf6, #a78bfa);

    --bg-color: #ffffff;
    --bg-secondary: #f8fafc;
    --bg-tertiary: #f1f5f9;
    --text-color: #0f172a;
    --text-secondary: #475569;
    --muted-color: #64748b;
    --border-color: #e2e8f0;
    --border-color-strong: #cbd5e1;
    --card-bg: #ffffff;
    --code-bg: #f8fafc;
    --code-text: #1e293b;
    --hover-bg: #f8fafc;
    --link-color: #6366f1;
    --link-hover: #4f46e5;
    --success-color: #10b981;
    --shadow-sm: 0 1px 2px 0 rgba(0,0,0,0.05);
    --shadow-md: 0 4px 6px -1px rgba(0,0,0,0.07), 0 2px 4px -2px rgba(0,0,0,0.05);
    --shadow-lg: 0 10px 15px -3px rgba(0,0,0,0.08), 0 4px 6px -4px rgba(0,0,0,0.05);
  }

  @media (prefers-color-scheme: dark) {
    :root {
      --bg-color: #0c0f1a;
      --bg-secondary: #131627;
      --bg-tertiary: #1a1e35;
      --text-color: #e2e8f0;
      --text-secondary: #94a3b8;
      --muted-color: #64748b;
      --border-color: #1e293b;
      --border-color-strong: #334155;
      --card-bg: #131627;
      --code-bg: #1a1e35;
      --code-text: #e2e8f0;
      --hover-bg: #1a1e35;
      --link-color: #818cf8;
      --link-hover: #a5b4fc;
      --shadow-sm: 0 1px 2px 0 rgba(0,0,0,0.3);
      --shadow-md: 0 4px 6px -1px rgba(0,0,0,0.4), 0 2px 4px -2px rgba(0,0,0,0.3);
      --shadow-lg: 0 10px 15px -3px rgba(0,0,0,0.5), 0 4px 6px -4px rgba(0,0,0,0.4);
    }
  }

  .app-container {
    min-height: 100vh;
    background-color: var(--bg-color);
  }

  /* Accent gradient bar */
  .accent-bar {
    height: 3px;
    background: var(--litellm-gradient);
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    z-index: 200;
  }

  /* Header */
  .header {
    background: var(--bg-color);
    border-bottom: 1px solid var(--border-color);
    position: sticky;
    top: 3px;
    z-index: 100;
    backdrop-filter: blur(12px);
    background: rgba(255,255,255,0.92);
  }

  @media (prefers-color-scheme: dark) {
    .header {
      background: rgba(12,15,26,0.92);
    }
  }

  .header-content {
    max-width: 1400px;
    margin: 0 auto;
    padding: 0 2rem;
    display: flex;
    align-items: center;
    justify-content: space-between;
    height: 60px;
  }

  .desktop-nav {
    display: flex;
    align-items: center;
    gap: 1.5rem;
  }

  .logo-section-header {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    text-decoration: none;
    color: inherit;
  }

  .logo-emoji {
    font-size: 1.5rem;
  }

  .logo-text-header {
    font-size: 1.25rem;
    font-weight: 700;
    color: var(--text-color);
    letter-spacing: -0.02em;
  }

  .tabs {
    display: flex;
    gap: 0;
    align-items: center;
  }

  .tab {
    padding: 0.5rem 0.875rem;
    border: none;
    background: transparent;
    color: var(--muted-color);
    font-weight: 500;
    font-size: 0.875rem;
    cursor: pointer;
    transition: color 0.15s ease;
    position: relative;
    white-space: nowrap;
  }

  .tab:hover {
    color: var(--text-color);
  }

  .tab.active {
    color: var(--text-color);
    font-weight: 600;
  }

  .tab.active::after {
    content: "";
    position: absolute;
    bottom: -1px;
    left: 0.875rem;
    right: 0.875rem;
    height: 2px;
    background: var(--litellm-primary);
    border-radius: 1px;
  }

  .nav-links {
    display: flex;
    gap: 0.75rem;
    align-items: center;
  }

  .request-button {
    display: inline-flex;
    align-items: center;
    gap: 0.375rem;
    padding: 0.5rem 1rem;
    background: var(--litellm-primary);
    color: white;
    border: none;
    border-radius: 8px;
    font-weight: 600;
    font-size: 0.8125rem;
    cursor: pointer;
    transition: all 0.15s ease;
    white-space: nowrap;
  }

  .request-button:hover {
    background: var(--litellm-dark);
    box-shadow: 0 2px 8px rgba(99, 102, 241, 0.4);
    transform: translateY(-1px);
  }

  .request-button svg {
    width: 14px;
    height: 14px;
  }

  .nav-link {
    color: var(--muted-color);
    text-decoration: none;
    font-weight: 500;
    font-size: 0.875rem;
    transition: color 0.15s ease;
    display: flex;
    align-items: center;
    gap: 0.375rem;
  }

  .nav-link:hover {
    color: var(--text-color);
  }

  /* Mobile Menu Button */
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
    width: 20px;
    height: 2px;
    background-color: var(--text-color);
    position: relative;
    transition: background-color 0.2s ease;
  }

  .hamburger::before,
  .hamburger::after {
    content: "";
    position: absolute;
    width: 20px;
    height: 2px;
    background-color: var(--text-color);
    left: 0;
    transition: transform 0.3s ease;
  }

  .hamburger::before { top: -6px; }
  .hamburger::after { top: 6px; }
  .hamburger.open { background-color: transparent; }
  .hamburger.open::before { transform: rotate(45deg) translate(4px, 4px); }
  .hamburger.open::after { transform: rotate(-45deg) translate(4px, -4px); }

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
    padding: 0.75rem 1rem;
    background: var(--litellm-primary);
    color: white;
    border: none;
    border-radius: 10px;
    font-weight: 600;
    font-size: 0.9375rem;
    cursor: pointer;
    margin-bottom: 1rem;
  }

  .mobile-request-button svg { width: 16px; height: 16px; }

  .mobile-tabs {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    margin-bottom: 1rem;
    padding-bottom: 1rem;
    border-bottom: 1px solid var(--border-color);
  }

  .mobile-tab {
    padding: 0.625rem 1rem;
    border: none;
    background: transparent;
    color: var(--muted-color);
    font-weight: 500;
    font-size: 0.9375rem;
    cursor: pointer;
    text-align: left;
    border-radius: 8px;
    transition: all 0.15s ease;
  }

  .mobile-tab:hover { background-color: var(--bg-tertiary); color: var(--text-color); }
  .mobile-tab.active { background-color: var(--bg-tertiary); color: var(--litellm-primary); font-weight: 600; }

  .mobile-links {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .mobile-link {
    padding: 0.625rem 1rem;
    color: var(--muted-color);
    text-decoration: none;
    font-weight: 500;
    font-size: 0.9375rem;
    border-radius: 8px;
    transition: all 0.15s ease;
  }

  .mobile-link:hover { background-color: var(--bg-tertiary); color: var(--text-color); }

  @media (max-width: 900px) {
    .header-content { padding: 0 1rem; }
    .desktop-nav { display: none; }
    .mobile-menu-btn { display: block; }
    .mobile-menu { display: block; }
  }

  /* Statistics Section */
  .stats-section {
    max-width: 1400px;
    margin: 0 auto;
    padding: 1.25rem 2rem;
  }

  .stats-container {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 0.75rem;
  }

  .stats-caption {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 0.75rem;
    font-size: 0.8125rem;
    color: var(--muted-color);
    font-weight: 500;
  }

  .stats-caption-dot {
    width: 8px;
    height: 8px;
    border-radius: 999px;
    background: #10b981;
    box-shadow: 0 0 0 4px rgba(16, 185, 129, 0.12);
  }

  .stats-error {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 1rem;
    background: var(--bg-secondary);
    border: 1px solid var(--border-color);
    border-radius: 12px;
    padding: 1rem 1.25rem;
  }

  .stats-error-label {
    margin: 0 0 0.4rem;
    font-size: 0.75rem;
    font-weight: 700;
    color: var(--litellm-primary);
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .stats-error h3 {
    margin: 0 0 0.35rem;
    font-size: 1rem;
  }

  .stats-error p {
    margin: 0;
    color: var(--muted-color);
    line-height: 1.5;
  }

  .stats-retry {
    border: 1px solid var(--border-color-strong);
    background: var(--bg-color);
    color: var(--text-color);
    font-family: inherit;
    font-size: 0.875rem;
    font-weight: 600;
    border-radius: 10px;
    padding: 0.625rem 0.875rem;
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .stats-retry:hover {
    border-color: var(--litellm-primary);
    color: var(--litellm-primary);
  }

  .stat-card {
    background: var(--bg-secondary);
    border: 1px solid var(--border-color);
    border-radius: 10px;
    padding: 1rem 0.75rem;
    text-align: center;
    transition: all 0.2s ease;
    cursor: pointer;
    font-family: inherit;
    width: 100%;
  }

  .stat-card:hover {
    border-color: var(--litellm-primary);
    box-shadow: 0 0 0 1px var(--litellm-primary);
    background: var(--bg-color);
  }

  .stat-value {
    font-size: 1.75rem;
    font-weight: 800;
    color: var(--text-color);
    line-height: 1;
    margin-bottom: 0.375rem;
    letter-spacing: -0.03em;
  }

  .stat-label {
    font-size: 0.6875rem;
    font-weight: 600;
    color: var(--muted-color);
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }

  /* Skeleton loading */
  .stat-card.skeleton {
    cursor: default;
  }

  .skeleton-value {
    width: 60%;
    height: 1.75rem;
    background: var(--border-color);
    border-radius: 6px;
    margin: 0 auto 0.375rem;
    animation: shimmer 1.5s ease-in-out infinite;
  }

  .skeleton-label {
    width: 80%;
    height: 0.6875rem;
    background: var(--border-color);
    border-radius: 4px;
    margin: 0 auto;
    animation: shimmer 1.5s ease-in-out infinite;
    animation-delay: 0.15s;
  }

  @keyframes shimmer {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.4; }
  }

  /* Responsive */
  @media (max-width: 1024px) {
    .stats-container {
      grid-template-columns: repeat(2, 1fr);
    }
  }

  @media (max-width: 640px) {
    .stats-section { padding: 1rem; }
    .stats-error {
      flex-direction: column;
    }
    .stats-container {
      grid-template-columns: repeat(2, 1fr);
      gap: 0.5rem;
    }
    .stat-card { padding: 0.75rem 0.5rem; }
    .stat-value { font-size: 1.375rem; }
  }
</style>
