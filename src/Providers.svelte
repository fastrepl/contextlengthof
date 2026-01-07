<script lang="ts">
  import { onMount } from "svelte";
  import { getProviderInitial, getProviderLogo } from "./providers";
  import { trackSearch } from "./analytics";

  type ProviderEndpoint = {
    provider: string;
    display_name: string;
    url: string;
    endpoints: {
      [key: string]: boolean;
    };
  };

  type EndpointMetadata = {
    display_name: string;
    leftnav_label: string;
    url: string;
    docs_label: string;
    bridges_to_chat_completion?: boolean;
  };

  let loading = true;
  let providers: ProviderEndpoint[] = [];
  let endpointsMetadata: { [key: string]: EndpointMetadata } = {};
  let searchQuery = "";
  let selectedEndpoint = "";
  let allEndpoints: string[] = [];
  let filteredEndpoints: string[] = [];
  let filteredProviders: ProviderEndpoint[] = [];

  const PROVIDERS_URL = "https://raw.githubusercontent.com/BerriAI/litellm/main/provider_endpoints_support.json";
  const DOCS_URL = "https://docs.litellm.ai/docs/providers";

  onMount(async () => {
    try {
      const response = await fetch(PROVIDERS_URL);
      const data = await response.json();
      
      // Extract endpoints metadata
      if (data.endpoints) {
        endpointsMetadata = data.endpoints;
      }
      
      // Transform the data into our format
      if (data.providers) {
        providers = Object.entries(data.providers).map(([provider, info]: [string, any]) => ({
          provider,
          display_name: info.display_name || provider,
          url: info.url || DOCS_URL,
          endpoints: info.endpoints || {}
        }));
      }
      
      // Extract all unique endpoints
      const endpointsSet = new Set<string>();
      providers.forEach(p => {
        Object.keys(p.endpoints).forEach(e => endpointsSet.add(e));
      });
      
      // Sort endpoints with priority
      const priorityOrder = ['chat_completions', 'responses', 'messages'];
      const sorted = Array.from(endpointsSet).sort();
      allEndpoints = [
        ...priorityOrder.filter(e => sorted.includes(e)),
        ...sorted.filter(e => !priorityOrder.includes(e))
      ];
      
      filteredEndpoints = allEndpoints;
      
      // Select first endpoint by default
      if (allEndpoints.length > 0) {
        selectedEndpoint = allEndpoints[0];
      }
      
      loading = false;
    } catch (error) {
      console.error("Failed to load providers:", error);
      loading = false;
    }
  });

  // Debounce function
  const debounce = (callback: Function, wait = 500) => {
    let timeout: ReturnType<typeof setTimeout>;
    return (...args: any[]) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => callback(...args), wait);
    };
  };

  // Debounced search tracking
  const trackSearchDebounced = debounce((query: string, resultsCount: number) => {
    if (query) {
      trackSearch(query, "endpoint", resultsCount);
    }
  }, 1000);

  function formatEndpointName(endpoint: string): string {
    // Use leftnav_label from metadata if available, otherwise convert snake_case to /path format
    if (endpointsMetadata[endpoint]?.leftnav_label) {
      return endpointsMetadata[endpoint].leftnav_label;
    }
    const formatted = endpoint.replace(/_/g, "/");
    return `/${formatted}`;
  }

  function formatEndpointTitle(endpoint: string): string {
    // Use display_name from metadata if available, otherwise convert snake_case to Title Case
    if (endpointsMetadata[endpoint]?.display_name) {
      return endpointsMetadata[endpoint].display_name;
    }
    return endpoint
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  function getEndpointUrl(endpoint: string): string {
    return endpointsMetadata[endpoint]?.url || DOCS_URL;
  }

  // Filter endpoints based on search query - show only endpoints supported by matching providers
  $: {
    if (searchQuery.trim() === "") {
      filteredEndpoints = allEndpoints;
    } else {
      const query = searchQuery.toLowerCase();
      
      // Find providers that match the search query
      const matchingProviders = providers.filter(p =>
        p.provider.toLowerCase().includes(query) ||
        p.display_name.toLowerCase().includes(query)
      );
      
      // Collect all endpoints supported by matching providers
      const supportedEndpoints = new Set<string>();
      matchingProviders.forEach(p => {
        Object.keys(p.endpoints).forEach(endpoint => {
          if (p.endpoints[endpoint] === true) {
            supportedEndpoints.add(endpoint);
          }
        });
      });
      
      // Filter to only show endpoints that are supported by matching providers
      filteredEndpoints = allEndpoints.filter(e => supportedEndpoints.has(e));
    }
  }

  // Filter providers that support the selected endpoint AND match search query
  $: {
    if (selectedEndpoint) {
      // Check if this endpoint bridges to chat_completions
      const bridgesToChatCompletion = endpointsMetadata[selectedEndpoint]?.bridges_to_chat_completion || false;
      
      let providersList = providers.filter(p => {
        // Include if provider directly supports this endpoint
        const directSupport = p.endpoints[selectedEndpoint] === true;
        
        // If endpoint bridges to chat_completions, also include providers that support chat_completions
        const bridgedSupport = bridgesToChatCompletion && p.endpoints['chat_completions'] === true;
        
        return directSupport || bridgedSupport;
      });
      
      // Filter by search query - only providers
      if (searchQuery.trim() !== "") {
        const query = searchQuery.toLowerCase();
        providersList = providersList.filter(p =>
          p.provider.toLowerCase().includes(query) ||
          p.display_name.toLowerCase().includes(query)
        );
      }
      
      filteredProviders = providersList;
      trackSearchDebounced(searchQuery, filteredProviders.length);
    } else {
      filteredProviders = [];
    }
  }

  // Count how many providers support each endpoint
  function getProviderCount(endpoint: string): number {
    const bridgesToChatCompletion = endpointsMetadata[endpoint]?.bridges_to_chat_completion || false;
    
    return providers.filter(p => {
      const directSupport = p.endpoints[endpoint] === true;
      const bridgedSupport = bridgesToChatCompletion && p.endpoints['chat_completions'] === true;
      return directSupport || bridgedSupport;
    }).length;
  }

</script>

<main>
  <div class="hero">
    <div class="hero-content">
      <h1 class="hero-title">AI Provider Integrations <a href={DOCS_URL} target="_blank" rel="noopener noreferrer" class="docs-link">(Docs)</a></h1>
      <p class="hero-subtitle">Browse all AI providers and their supported endpoints through LiteLLM AI Gateway</p>
    </div>
  </div>

  <!-- Search Bar -->
  <div class="search-section">
    <div class="search-input-wrapper">
      <svg class="search-icon" width="20" height="20" viewBox="0 0 20 20" fill="none">
        <circle cx="8.5" cy="8.5" r="5.75" stroke="currentColor" stroke-width="1.5"/>
        <path d="M12.5 12.5L16.5 16.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
      </svg>
      <input
        bind:value={searchQuery}
        type="text"
        autocomplete="off"
        placeholder="Search providers..."
        class="search-input"
      />
    </div>
  </div>

  {#if loading}
    <div class="loading">
      <span aria-busy="true">Loading providers...</span>
    </div>
  {:else}
    <div class="container">
      <!-- Left Sidebar with Endpoints -->
      <aside class="sidebar">
        <div class="sidebar-header">
          <h2>Endpoints</h2>
        </div>
        <nav class="endpoints-list">
          {#each filteredEndpoints as endpoint (endpoint)}
            <button
              class="endpoint-item"
              class:active={selectedEndpoint === endpoint}
              on:click={() => selectedEndpoint = endpoint}
              type="button"
            >
              <span class="endpoint-label">{formatEndpointName(endpoint)}</span>
              <span class="provider-count">{getProviderCount(endpoint)}</span>
            </button>
          {/each}
        </nav>
      </aside>

      <!-- Main Content Area with Provider Cards -->
      <section class="content">
        {#if selectedEndpoint}
          <div class="content-header">
            <h2 class="endpoint-title">
              {formatEndpointTitle(selectedEndpoint)}
              <a href={getEndpointUrl(selectedEndpoint)} target="_blank" rel="noopener noreferrer" class="endpoint-docs-link" title="View documentation">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                  <polyline points="15 3 21 3 21 9"></polyline>
                  <line x1="10" y1="14" x2="21" y2="3"></line>
                </svg>
              </a>
            </h2>
            <p class="endpoint-subtitle">
              {filteredProviders.length} {filteredProviders.length === 1 ? 'provider' : 'providers'} support {formatEndpointName(selectedEndpoint)}
            </p>
          </div>

          <div class="providers-grid">
            {#each filteredProviders as { provider, display_name, url } (provider)}
              <a href={url} target="_blank" rel="noopener noreferrer" class="provider-card">
                <div class="provider-card-header">
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
                  <h3 class="provider-name">{display_name.replace(/\s*\(.*?\)\s*$/, '')}</h3>
                </div>
                <p class="provider-description">
                  {display_name.replace(/\s*\(.*?\)\s*$/, '')} supports {formatEndpointName(selectedEndpoint)} endpoint through LiteLLM AI Gateway.
                </p>
                <div class="provider-meta">
                  <span class="provider-key">{provider}</span>
                </div>
              </a>
            {/each}
          </div>
        {:else}
          <div class="empty-state">
            <p>Select an endpoint to view available providers</p>
          </div>
        {/if}
      </section>
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
    background: var(--bg-color);
  }

  /* Hero Section */
  .hero {
    padding: 3rem 2rem 2rem;
    max-width: 1400px;
    margin: 0 auto;
    background-color: var(--bg-color);
    color: var(--text-color);
  }

  .hero-content {
    text-align: center;
  }

  .hero-title {
    font-size: 2.5rem;
    font-weight: 700;
    color: var(--text-color);
    margin-bottom: 0.75rem;
    letter-spacing: -0.02em;
    line-height: 1.1;
  }

  .docs-link {
    color: var(--link-color);
    text-decoration: none;
    font-size: 1.75rem;
  }

  .docs-link:hover {
    text-decoration: underline;
    color: var(--link-hover);
  }

  .hero-subtitle {
    font-size: 1.125rem;
    color: var(--muted-color);
    line-height: 1.6;
  }

  /* Search Section */
  .search-section {
    max-width: 900px;
    margin: 2rem auto;
    padding: 0 2rem;
  }

  .search-input-wrapper {
    position: relative;
    width: 100%;
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
    border: 1px solid var(--border-color-strong);
    border-radius: 8px;
    background-color: var(--bg-color);
    color: var(--text-color);
    transition: all 0.2s ease;
    height: 48px;
    box-sizing: border-box;
  }

  .search-input:hover {
    border-color: var(--muted-color);
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

  /* Main Container with Sidebar */
  .container {
    display: flex;
    max-width: 1400px;
    margin: 2rem auto;
    padding: 0 2rem;
    gap: 2rem;
    align-items: flex-start;
  }

  /* Left Sidebar */
  .sidebar {
    width: 340px;
    flex-shrink: 0;
    background: var(--card-bg);
    border: 1px solid var(--border-color);
    border-radius: 12px;
    overflow: hidden;
    position: sticky;
    top: 2rem;
    max-height: calc(100vh - 4rem);
    display: flex;
    flex-direction: column;
  }

  .sidebar-header {
    padding: 1.25rem 1.5rem;
    border-bottom: 1px solid var(--border-color);
    background: var(--card-bg);
  }

  .sidebar-header h2 {
    margin: 0;
    font-size: 0.875rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--muted-color);
  }

  .endpoints-list {
    overflow-y: auto;
    flex: 1;
  }

  .endpoint-item {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.875rem 1.5rem;
    background: none;
    border: none;
    border-bottom: 1px solid var(--border-color);
    cursor: pointer;
    transition: all 0.15s ease;
    text-align: left;
    color: var(--text-color);
  }

  .endpoint-item:last-child {
    border-bottom: none;
  }

  .endpoint-item:hover {
    background-color: var(--hover-bg);
  }

  .endpoint-item.active {
    background-color: var(--bg-tertiary);
    color: var(--litellm-primary);
    font-weight: 500;
    border-left: 3px solid var(--litellm-primary);
    padding-left: calc(1.5rem - 3px);
  }

  .endpoint-label {
    font-family: monospace;
    font-size: 0.875rem;
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .provider-count {
    font-size: 0.75rem;
    background: var(--bg-color);
    color: var(--muted-color);
    padding: 0.25rem 0.5rem;
    border-radius: 12px;
    font-weight: 500;
    margin-left: 0.5rem;
    min-width: 32px;
    text-align: center;
    flex-shrink: 0;
  }

  .endpoint-item.active .provider-count {
    background: rgba(99, 102, 241, 0.1);
    color: var(--litellm-primary);
  }

  /* Main Content Area */
  .content {
    flex: 1;
    min-width: 0;
  }

  .content-header {
    margin-bottom: 2rem;
  }

  .endpoint-title {
    font-size: 2rem;
    font-weight: 700;
    color: var(--text-color);
    margin: 0 0 0.5rem 0;
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .endpoint-docs-link {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    color: var(--link-color);
    text-decoration: none;
    transition: all 0.2s ease;
    opacity: 0.7;
  }

  .endpoint-docs-link:hover {
    opacity: 1;
    color: var(--link-hover);
    transform: translateY(-1px);
  }

  .endpoint-docs-link svg {
    width: 24px;
    height: 24px;
  }

  .endpoint-subtitle {
    font-size: 1rem;
    color: var(--muted-color);
    margin: 0;
  }

  .empty-state {
    text-align: center;
    padding: 4rem 2rem;
    color: var(--muted-color);
  }

  /* Provider Cards Grid */
  .providers-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: 1.5rem;
  }

  .provider-card {
    background: var(--card-bg);
    border: 1px solid var(--border-color);
    border-radius: 12px;
    padding: 1.5rem;
    text-decoration: none;
    color: var(--text-color);
    transition: all 0.2s ease;
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .provider-card:hover {
    border-color: var(--litellm-primary);
    box-shadow: 0 4px 12px rgba(99, 102, 241, 0.15);
    transform: translateY(-2px);
  }

  .provider-card-header {
    display: flex;
    align-items: center;
    gap: 1rem;
  }

  .provider-avatar {
    width: 48px;
    height: 48px;
    border-radius: 12px;
    background-color: var(--bg-color);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    overflow: hidden;
    position: relative;
    padding: 8px;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
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
    background-color: var(--text-color);
    color: var(--bg-color);
    font-weight: 600;
    font-size: 1rem;
    border-radius: 8px;
    margin: -8px;
  }

  .provider-name {
    font-size: 1.125rem;
    font-weight: 600;
    color: var(--text-color);
    margin: 0;
    line-height: 1.3;
  }

  .provider-description {
    font-size: 0.9375rem;
    color: var(--muted-color);
    line-height: 1.5;
    margin: 0;
    flex: 1;
  }

  .provider-meta {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding-top: 0.75rem;
    border-top: 1px solid var(--border-color);
  }

  .provider-key {
    font-size: 0.8125rem;
    color: var(--muted-color);
    font-family: monospace;
  }

  /* Responsive Design */
  @media (max-width: 1024px) {
    .container {
      flex-direction: column;
    }

    .sidebar {
      width: 100%;
      position: static;
      max-height: 400px;
    }

    .providers-grid {
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    }
  }

  @media (max-width: 768px) {
    .hero-title {
      font-size: 2rem;
    }

    .hero-subtitle {
      font-size: 1rem;
    }

    .docs-link {
      font-size: 1.5rem;
    }

    .container {
      padding: 0 1rem;
    }

    .providers-grid {
      grid-template-columns: 1fr;
    }

    .endpoint-title {
      font-size: 1.5rem;
    }
  }
</style>

