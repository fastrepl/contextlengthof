<script lang="ts">
  import App from "./App.svelte";
  import Providers from "./Providers.svelte";

  let activeTab: "models" | "providers" = "models";
  let mobileMenuOpen = false;

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
    background-color: #1a1a1a;
    position: relative;
    transition: background-color 0.2s ease;
  }

  .hamburger::before,
  .hamburger::after {
    content: "";
    position: absolute;
    width: 24px;
    height: 2px;
    background-color: #1a1a1a;
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
    background: #ffffff;
    border-top: 1px solid #e5e7eb;
    padding: 1rem;
  }

  .mobile-tabs {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    margin-bottom: 1rem;
    padding-bottom: 1rem;
    border-bottom: 1px solid #e5e7eb;
  }

  .mobile-tab {
    padding: 0.75rem 1rem;
    border: none;
    background: transparent;
    color: #6b7280;
    font-weight: 500;
    font-size: 1rem;
    cursor: pointer;
    text-align: left;
    border-radius: 8px;
    transition: all 0.2s ease;
  }

  .mobile-tab:hover {
    background-color: #f3f4f6;
    color: #1a1a1a;
  }

  .mobile-tab.active {
    background-color: #f3f4f6;
    color: #1a1a1a;
  }

  .mobile-links {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .mobile-link {
    padding: 0.75rem 1rem;
    color: #1a1a1a;
    text-decoration: none;
    font-weight: 500;
    font-size: 1rem;
    border-radius: 8px;
    transition: all 0.2s ease;
  }

  .mobile-link:hover {
    background-color: #f3f4f6;
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
</style>

