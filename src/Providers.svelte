<script lang="ts">
  import { onMount } from "svelte";
  import { getProviderInitial, getProviderLogo } from "./providers";

  type ProviderEndpoint = {
    provider: string;
    display_name: string;
    url: string;
    endpoints: {
      [key: string]: boolean;
    };
  };

  let loading = true;
  let providers: ProviderEndpoint[] = [];
  let filteredProviders: ProviderEndpoint[] = [];
  let filteredEndpoints: string[] = [];
  let searchQuery = "";
  let viewMode: "provider" | "endpoint" = "provider";
  let endpointColumns: string[] = [];

  const PROVIDERS_URL = "https://raw.githubusercontent.com/BerriAI/litellm/main/provider_endpoints_support.json";
  const DOCS_URL = "https://docs.litellm.ai/docs/providers";

  onMount(async () => {
    try {
      const response = await fetch(PROVIDERS_URL);
      const data = await response.json();
      
      // Transform the data into our format - data.providers is the actual providers object
      if (data.providers) {
        providers = Object.entries(data.providers).map(([provider, info]: [string, any]) => ({
          provider,
          display_name: info.display_name || provider,
          url: info.url || DOCS_URL,
          endpoints: info.endpoints || {}
        }));
      }
      
      filteredProviders = providers;
      loading = false;
    } catch (error) {
      console.error("Failed to load providers:", error);
      loading = false;
    }
  });

  $: {
    // Reset filters when view mode changes
    if (searchQuery.trim() === "") {
      filteredProviders = providers;
      filteredEndpoints = endpointColumns;
    } else {
      const query = searchQuery.toLowerCase();
      if (viewMode === "provider") {
        filteredProviders = providers.filter((p) =>
          p.provider.toLowerCase().includes(query) ||
          p.display_name.toLowerCase().includes(query)
        );
        filteredEndpoints = endpointColumns;
      } else {
        // In endpoint view, filter endpoints
        filteredProviders = providers;
        filteredEndpoints = endpointColumns.filter((endpoint) =>
          endpoint.toLowerCase().includes(query) ||
          formatEndpointName(endpoint).toLowerCase().includes(query)
        );
      }
    }
  }

  // Initialize filtered endpoints when endpoint columns are ready
  $: if (endpointColumns.length > 0 && filteredEndpoints.length === 0) {
    filteredEndpoints = endpointColumns;
  }

  function formatEndpointName(endpoint: string): string {
    // Convert snake_case to /path format
    const formatted = endpoint.replace(/_/g, "/");
    return `/${formatted}`;
  }

  $: {
    // Recalculate endpoint columns whenever providers change
    const allEndpoints = new Set<string>();
    
    if (providers.length > 0) {
      providers.forEach(p => {
        Object.keys(p.endpoints).forEach(e => allEndpoints.add(e));
      });
    }
    
    // Custom sort order: chat_completions, responses, messages first, then alphabetical
    const priorityOrder = ['chat_completions', 'responses', 'messages'];
    const sorted = Array.from(allEndpoints).sort();
    
    endpointColumns = [
      ...priorityOrder.filter(e => sorted.includes(e)),
      ...sorted.filter(e => !priorityOrder.includes(e))
    ];
  }
</script>

<main>
  <div class="hero">
    <div class="hero-content">
      <h1 class="hero-title">Supported Providers <a href={DOCS_URL} target="_blank" rel="noopener noreferrer" class="docs-link">(Docs)</a></h1>
      <p class="hero-subtitle">Browse all AI providers and their supported endpoints through LiteLLM Gateway</p>
    </div>
  </div>

  <!-- Search and View Mode -->
  <div class="search-section">
    <div class="search-bar-container">
      <div class="view-toggles">
        <button 
          class="view-toggle" 
          class:active={viewMode === "provider"}
          on:click={() => viewMode = "provider"}
        >
          View by Provider
        </button>
        <button 
          class="view-toggle" 
          class:active={viewMode === "endpoint"}
          on:click={() => viewMode = "endpoint"}
        >
          View by Endpoint
        </button>
      </div>

      <div class="search-input-wrapper">
        <svg class="search-icon" width="20" height="20" viewBox="0 0 20 20" fill="none">
          <circle cx="8.5" cy="8.5" r="5.75" stroke="currentColor" stroke-width="1.5"/>
          <path d="M12.5 12.5L16.5 16.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
        </svg>
        <input
          bind:value={searchQuery}
          type="text"
          autocomplete="off"
          placeholder={viewMode === "provider" ? "Search providers..." : "Search endpoints..."}
          class="search-input"
        />
      </div>
    </div>
  </div>

  {#if loading}
    <div class="loading">
      <span aria-busy="true">Loading providers...</span>
    </div>
  {:else}
    <div class="table-container">
      <table>
        {#if viewMode === "provider"}
          <!-- View by Provider -->
          <thead>
            <tr>
              <th>Provider</th>
              {#each endpointColumns as endpoint}
                <th>{formatEndpointName(endpoint)}</th>
              {/each}
            </tr>
          </thead>
          <tbody>
            {#each filteredProviders as { provider, display_name, url, endpoints } (provider)}
              <tr>
                <td class="provider-cell">
                  <div class="provider-info">
                    <div class="provider-avatar">
                      {#if getProviderLogo(provider)}
                        <img 
                          src={getProviderLogo(provider)} 
                          alt={provider}
                          class="provider-logo-img"
                          on:error={(e) => {
                            e.currentTarget.style.display = 'none';
                            e.currentTarget.nextElementSibling.style.display = 'flex';
                          }}
                        />
                        <div class="provider-initial" style="display: none;">
                          {getProviderInitial(provider)}
                        </div>
                      {:else}
                        <div class="provider-initial">
                          {getProviderInitial(provider)}
                        </div>
                      {/if}
                    </div>
                    <div class="provider-details">
                      <a href={url} target="_blank" rel="noopener noreferrer" class="provider-link">
                        {display_name.replace(/\s*\(.*?\)\s*$/, '')}
                      </a>
                      <span class="provider-key">({provider})</span>
                    </div>
                  </div>
                </td>
                {#each endpointColumns as endpoint}
                  <td class="endpoint-cell">
                    {#if endpoints[endpoint] === true}
                      <div class="status-icon supported">✓</div>
                    {:else}
                      <div class="status-icon unsupported">○</div>
                    {/if}
                  </td>
                {/each}
              </tr>
            {/each}
          </tbody>
        {:else}
          <!-- View by Endpoint -->
          <thead>
            <tr>
              <th>Endpoint</th>
              {#each filteredProviders as { provider, display_name } (provider)}
                <th>
                  <div class="provider-header">
                    <div class="provider-avatar-small">
                      {#if getProviderLogo(provider)}
                        <img 
                          src={getProviderLogo(provider)} 
                          alt={provider}
                          class="provider-logo-img-small"
                          on:error={(e) => {
                            e.currentTarget.style.display = 'none';
                            e.currentTarget.nextElementSibling.style.display = 'flex';
                          }}
                        />
                        <div class="provider-initial-small" style="display: none;">
                          {getProviderInitial(provider)}
                        </div>
                      {:else}
                        <div class="provider-initial-small">
                          {getProviderInitial(provider)}
                        </div>
                      {/if}
                    </div>
                    <div class="provider-name-small">
                      {display_name.replace(/\s*\(.*?\)\s*$/, '')}
                    </div>
                    <div class="provider-key-small">({provider})</div>
                  </div>
                </th>
              {/each}
            </tr>
          </thead>
          <tbody>
            {#each filteredEndpoints as endpoint}
              <tr>
                <td class="endpoint-name-cell">
                  <span class="endpoint-name">{formatEndpointName(endpoint)}</span>
                </td>
                {#each filteredProviders as { endpoints } }
                  <td class="endpoint-cell">
                    {#if endpoints[endpoint] === true}
                      <div class="status-icon supported">✓</div>
                    {:else}
                      <div class="status-icon unsupported">○</div>
                    {/if}
                  </td>
                {/each}
              </tr>
            {/each}
          </tbody>
        {/if}
      </table>
    </div>
  {/if}
</main>

<style>
  :root {
    --litellm-primary: #6366f1;
    --litellm-dark: #4f46e5;
    --litellm-purple: #8b5cf6;
  }

  main {
    min-height: 100vh;
    background: #ffffff;
  }

  /* Hero Section */
  .hero {
    padding: 4rem 2rem 3rem;
    max-width: 1400px;
    margin: 0 auto;
  }

  .hero-content {
    text-align: left;
  }

  .hero-title {
    font-size: 3rem;
    font-weight: 700;
    color: var(--contrast);
    margin-bottom: 1rem;
    letter-spacing: -0.02em;
    line-height: 1.1;
  }

  .docs-link {
    color: #2563eb;
    text-decoration: none;
    font-size: 2rem;
  }

  .docs-link:hover {
    text-decoration: underline;
  }

  .hero-subtitle {
    font-size: 1.25rem;
    color: var(--muted-color);
    line-height: 1.6;
  }

  /* Search Section */
  .search-section {
    max-width: 1400px;
    margin: 4rem auto 2rem;
    padding: 0 2rem;
  }

  .search-bar-container {
    display: flex;
    gap: 1rem;
    margin-bottom: 1rem;
    align-items: center;
  }

  .view-toggles {
    display: flex;
    gap: 0.5rem;
    background: #f3f4f6;
    padding: 0.25rem;
    border-radius: 8px;
  }

  .view-toggle {
    padding: 0.625rem 1.25rem;
    border: none;
    background: transparent;
    color: var(--muted-color);
    font-weight: 500;
    font-size: 0.9375rem;
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.2s ease;
    white-space: nowrap;
  }

  .view-toggle:hover {
    color: var(--contrast);
  }

  .view-toggle.active {
    background: #ffffff;
    color: var(--contrast);
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  }

  .search-input-wrapper {
    position: relative;
    flex: 1;
  }

  .search-icon {
    position: absolute;
    left: 1rem;
    top: 14px;
    color: var(--muted-color);
    pointer-events: none;
    z-index: 1;
  }

  .search-input {
    width: 100%;
    padding: 0.875rem 1rem 0.875rem 3rem;
    font-size: 1rem;
    border: 1px solid #d1d5db;
    border-radius: 8px;
    background-color: #ffffff;
    transition: all 0.2s ease;
    height: 48px;
    box-sizing: border-box;
  }

  .search-input:hover {
    border-color: #9ca3af;
  }

  .search-input:focus {
    outline: none;
    border-color: var(--litellm-primary);
    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
  }

  .search-input::placeholder {
    color: var(--muted-color);
  }

  /* Loading */
  .loading {
    max-width: 1400px;
    margin: 4rem auto;
    padding: 0 2rem;
    text-align: center;
    color: var(--muted-color);
  }

  /* Table */
  .table-container {
    margin: 2rem auto 4rem;
    max-width: 1400px;
    padding: 0 2rem;
    overflow-x: auto;
  }

  table {
    width: 100%;
    border-collapse: collapse;
    background: var(--card-background-color);
    border-radius: 12px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    border: 1px solid var(--muted-border-color);
  }

  thead {
    position: sticky;
    top: 0;
    z-index: 5;
    background-color: #ffffff;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
  }

  thead::before {
    content: '';
    position: absolute;
    top: -1px;
    left: 0;
    right: 0;
    height: 1px;
    background-color: var(--muted-border-color);
  }

  th {
    padding: 1rem 1.5rem;
    text-align: left;
    font-weight: 600;
    font-size: 0.75rem;
    letter-spacing: 0.05em;
    color: var(--muted-color);
    background-color: #ffffff;
    border-bottom: 1px solid var(--muted-border-color);
  }

  th:first-child {
    text-transform: uppercase;
  }

  th:not(:first-child) {
    font-family: monospace;
    font-size: 0.8125rem;
    font-weight: 400;
    text-align: center;
  }

  tbody tr {
    border-bottom: 1px solid var(--muted-border-color);
    transition: background-color 0.15s ease;
  }

  tbody tr:hover {
    background-color: var(--table-row-stripped-background-color);
  }

  tbody tr:last-child {
    border-bottom: none;
  }

  td {
    padding: 0.875rem 1.5rem;
    vertical-align: middle;
    font-size: 0.9375rem;
  }

  .provider-cell {
    font-weight: 500;
    min-width: 250px;
  }

  .provider-info {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .provider-avatar {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    background-color: white;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    overflow: hidden;
    position: relative;
    padding: 4px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  }

  .provider-logo-img {
    width: 100%;
    height: 100%;
    object-fit: contain;
  }

  .provider-initial {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    background-color: #1a1a1a;
    color: white;
    font-weight: 600;
    font-size: 0.75rem;
    border-radius: 50%;
    margin: -4px;
  }

  .provider-details {
    display: flex;
    flex-direction: column;
    gap: 0.125rem;
  }

  .provider-link {
    font-weight: 500;
    color: var(--contrast);
    text-decoration: none;
    transition: color 0.2s ease;
  }

  .provider-link:hover {
    color: #2563eb;
  }

  .provider-key {
    font-size: 0.8125rem;
    color: var(--muted-color);
    font-family: monospace;
  }

  .endpoint-cell {
    text-align: center;
    vertical-align: middle;
    padding: 0.875rem 0.5rem;
  }

  .status-icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    border-radius: 50%;
    font-size: 16px;
    font-weight: bold;
  }

  .status-icon.supported {
    background-color: #22c55e;
    color: white;
  }

  .status-icon.unsupported {
    background-color: transparent;
    color: #d1d5db;
    border: 2px solid #d1d5db;
    font-size: 20px;
  }

  /* Endpoint View Styles */
  .provider-header {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.375rem;
    min-width: 120px;
  }

  .provider-avatar-small {
    width: 24px;
    height: 24px;
    border-radius: 50%;
    background-color: white;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    overflow: hidden;
    position: relative;
    padding: 3px;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
  }

  .provider-logo-img-small {
    width: 100%;
    height: 100%;
    object-fit: contain;
  }

  .provider-initial-small {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    background-color: #1a1a1a;
    color: white;
    font-weight: 600;
    font-size: 0.625rem;
    border-radius: 50%;
    margin: -3px;
  }

  .provider-name-small {
    font-size: 0.75rem;
    font-weight: 500;
    color: var(--contrast);
    text-align: center;
    line-height: 1.2;
  }

  .provider-key-small {
    font-size: 0.625rem;
    color: var(--muted-color);
    font-family: monospace;
  }

  .endpoint-name-cell {
    font-weight: 500;
    min-width: 200px;
  }

  .endpoint-name {
    font-family: monospace;
    font-size: 0.875rem;
  }

  /* Responsive Design */
  @media (max-width: 768px) {
    .hero-title {
      font-size: 2rem;
    }

    .hero-subtitle {
      font-size: 1rem;
    }

    .view-section {
      flex-direction: column;
      align-items: stretch;
    }

    .search-input-wrapper {
      max-width: 100%;
    }

    .table-container {
      padding: 0 1rem;
    }
  }
</style>

