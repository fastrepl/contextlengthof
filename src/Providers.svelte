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
      
      if (data.endpoints) {
        endpointsMetadata = data.endpoints;
      }
      
      if (data.providers) {
        providers = Object.entries(data.providers).map(([provider, info]: [string, any]) => ({
          provider,
          display_name: info.display_name || provider,
          url: info.url || DOCS_URL,
          endpoints: info.endpoints || {}
        }));
      }
      
      const endpointsSet = new Set<string>();
      providers.forEach(p => {
        Object.keys(p.endpoints).forEach(e => endpointsSet.add(e));
      });
      
      const priorityOrder = ['chat_completions', 'responses', 'messages'];
      const sorted = Array.from(endpointsSet).sort();
      allEndpoints = [
        ...priorityOrder.filter(e => sorted.includes(e)),
        ...sorted.filter(e => !priorityOrder.includes(e))
      ];
      
      filteredEndpoints = allEndpoints;
      
      if (allEndpoints.length > 0) {
        selectedEndpoint = allEndpoints[0];
      }
      
      loading = false;
    } catch (error) {
      console.error("Failed to load providers:", error);
      loading = false;
    }
  });

  const debounce = (callback: Function, wait = 500) => {
    let timeout: ReturnType<typeof setTimeout>;
    return (...args: any[]) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => callback(...args), wait);
    };
  };

  const trackSearchDebounced = debounce((query: string, resultsCount: number) => {
    if (query) {
      trackSearch(query, "endpoint", resultsCount);
    }
  }, 1000);

  function formatEndpointName(endpoint: string): string {
    if (endpointsMetadata[endpoint]?.leftnav_label) {
      return endpointsMetadata[endpoint].leftnav_label;
    }
    const formatted = endpoint.replace(/_/g, "/");
    return `/${formatted}`;
  }

  function formatEndpointTitle(endpoint: string): string {
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

  function handleProviderImageError(event: Event) {
    const target = event.currentTarget as HTMLImageElement | null;
    if (!target) return;
    target.style.display = "none";
    const fallback = target.nextElementSibling as HTMLElement | null;
    if (fallback) fallback.style.display = "flex";
  }

  $: {
    if (searchQuery.trim() === "") {
      filteredEndpoints = allEndpoints;
    } else {
      const query = searchQuery.toLowerCase();
      
      const matchingProviders = providers.filter(p =>
        p.provider.toLowerCase().includes(query) ||
        p.display_name.toLowerCase().includes(query)
      );
      
      const supportedEndpoints = new Set<string>();
      matchingProviders.forEach(p => {
        Object.keys(p.endpoints).forEach(endpoint => {
          if (p.endpoints[endpoint] === true) {
            supportedEndpoints.add(endpoint);
          }
        });
      });
      
      filteredEndpoints = allEndpoints.filter(e => supportedEndpoints.has(e));
    }
  }

  $: {
    if (selectedEndpoint) {
      const bridgesToChatCompletion = endpointsMetadata[selectedEndpoint]?.bridges_to_chat_completion || false;
      
      let providersList = providers.filter(p => {
        const directSupport = p.endpoints[selectedEndpoint] === true;
        const bridgedSupport = bridgesToChatCompletion && p.endpoints['chat_completions'] === true;
        return directSupport || bridgedSupport;
      });
      
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
      <h1 class="hero-title">
        AI Provider Integrations
        <a href={DOCS_URL} target="_blank" rel="noopener noreferrer" class="docs-link" title="View docs">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
            <polyline points="15 3 21 3 21 9"></polyline>
            <line x1="10" y1="14" x2="21" y2="3"></line>
          </svg>
        </a>
      </h1>
      <p class="hero-subtitle">Browse all AI providers and their supported endpoints through LiteLLM AI Gateway</p>
    </div>
  </div>

  <div class="search-section">
    <div class="search-input-wrapper">
      <svg class="search-icon" width="18" height="18" viewBox="0 0 20 20" fill="none">
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
      <div class="loading-spinner"></div>
      <span>Loading providers...</span>
    </div>
  {:else}
    <div class="container">
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

      <section class="content">
        {#if selectedEndpoint}
          <div class="content-header">
            <h2 class="endpoint-title">
              {formatEndpointTitle(selectedEndpoint)}
              <a href={getEndpointUrl(selectedEndpoint)} target="_blank" rel="noopener noreferrer" class="endpoint-docs-link" title="View documentation">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
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
                        on:error={handleProviderImageError}
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
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
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
  main { min-height: 100vh; background: var(--bg-color); }

  .hero { padding: 2.5rem 2rem 1.5rem; max-width: 1400px; margin: 0 auto; }
  .hero-content { text-align: center; }

  .hero-title {
    font-size: 2.25rem;
    font-weight: 800;
    color: var(--text-color);
    margin-bottom: 0.5rem;
    letter-spacing: -0.03em;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.75rem;
  }

  .docs-link {
    display: inline-flex;
    color: var(--litellm-primary);
    opacity: 0.6;
    transition: opacity 0.15s;
  }

  .docs-link:hover { opacity: 1; }

  .hero-subtitle {
    font-size: 1.0625rem;
    color: var(--muted-color);
    line-height: 1.5;
  }

  .search-section { max-width: 700px; margin: 1.5rem auto; padding: 0 2rem; }

  .search-input-wrapper { position: relative; width: 100%; }

  .search-icon {
    position: absolute; left: 1rem; top: 50%; transform: translateY(-50%);
    color: var(--muted-color); pointer-events: none;
  }

  .search-input {
    width: 100%; padding: 0.75rem 1rem 0.75rem 2.75rem; font-size: 0.9375rem;
    border: 1px solid var(--border-color); border-radius: 10px;
    background-color: var(--bg-color); color: var(--text-color);
    transition: all 0.15s ease; height: 44px; box-sizing: border-box;
  }

  .search-input:hover { border-color: var(--border-color-strong); }
  .search-input:focus { outline: none; border-color: var(--litellm-primary); box-shadow: 0 0 0 3px rgba(99,102,241,0.08); }
  .search-input::placeholder { color: var(--muted-color); }

  .loading {
    max-width: 1400px; margin: 4rem auto; padding: 0 2rem;
    text-align: center; color: var(--muted-color);
    display: flex; flex-direction: column; align-items: center; gap: 1rem;
  }

  .loading-spinner {
    width: 32px; height: 32px; border: 3px solid var(--border-color);
    border-top-color: var(--litellm-primary); border-radius: 50%;
    animation: spin 0.7s linear infinite;
  }

  @keyframes spin { to { transform: rotate(360deg); } }

  .container {
    display: flex; max-width: 1400px; margin: 1.5rem auto;
    padding: 0 2rem; gap: 2rem; align-items: flex-start;
  }

  .sidebar {
    width: 300px; flex-shrink: 0; background: var(--card-bg);
    border: 1px solid var(--border-color); border-radius: 12px;
    overflow: hidden; position: sticky; top: 5rem;
    max-height: calc(100vh - 6rem); display: flex; flex-direction: column;
  }

  .sidebar-header {
    padding: 1rem 1.25rem; border-bottom: 1px solid var(--border-color);
  }

  .sidebar-header h2 {
    margin: 0; font-size: 0.6875rem; font-weight: 700;
    text-transform: uppercase; letter-spacing: 0.08em; color: var(--muted-color);
  }

  .endpoints-list { overflow-y: auto; flex: 1; }

  .endpoint-item {
    width: 100%; display: flex; align-items: center; justify-content: space-between;
    padding: 0.75rem 1.25rem; background: none; border: none;
    border-bottom: 1px solid var(--border-color); cursor: pointer;
    transition: all 0.1s ease; text-align: left; color: var(--text-color);
  }

  .endpoint-item:last-child { border-bottom: none; }
  .endpoint-item:hover { background-color: var(--hover-bg); }

  .endpoint-item.active {
    background-color: rgba(99,102,241,0.06); color: var(--litellm-primary);
    font-weight: 600; border-left: 3px solid var(--litellm-primary);
    padding-left: calc(1.25rem - 3px);
  }

  .endpoint-label {
    font-family: 'JetBrains Mono', monospace; font-size: 0.8125rem;
    flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  }

  .provider-count {
    font-size: 0.6875rem; background: var(--bg-tertiary); color: var(--muted-color);
    padding: 0.125rem 0.5rem; border-radius: 10px; font-weight: 600;
    margin-left: 0.5rem; min-width: 28px; text-align: center; flex-shrink: 0;
  }

  .endpoint-item.active .provider-count {
    background: rgba(99,102,241,0.12); color: var(--litellm-primary);
  }

  .content { flex: 1; min-width: 0; }
  .content-header { margin-bottom: 1.5rem; }

  .endpoint-title {
    font-size: 1.75rem; font-weight: 800; color: var(--text-color);
    margin: 0 0 0.375rem 0; display: flex; align-items: center; gap: 0.625rem;
    letter-spacing: -0.02em;
  }

  .endpoint-docs-link {
    display: inline-flex; color: var(--muted-color); opacity: 0.5;
    transition: all 0.15s;
  }

  .endpoint-docs-link:hover { opacity: 1; color: var(--litellm-primary); }

  .endpoint-subtitle { font-size: 0.9375rem; color: var(--muted-color); margin: 0; }

  .empty-state { text-align: center; padding: 4rem 2rem; color: var(--muted-color); }

  .providers-grid {
    display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 1rem;
  }

  .provider-card {
    background: var(--card-bg); border: 1px solid var(--border-color);
    border-radius: 10px; padding: 1.25rem; text-decoration: none;
    color: var(--text-color); transition: all 0.15s ease;
    display: flex; flex-direction: column; gap: 0.75rem;
  }

  .provider-card:hover {
    border-color: var(--litellm-primary);
    box-shadow: 0 4px 12px rgba(99,102,241,0.1);
    transform: translateY(-1px);
  }

  .provider-card-header { display: flex; align-items: center; gap: 0.75rem; }

  .provider-avatar {
    width: 40px; height: 40px; border-radius: 10px;
    background-color: #ffffff; display: flex; align-items: center;
    justify-content: center; flex-shrink: 0; overflow: hidden;
    position: relative; padding: 6px; border: 1px solid var(--border-color);
  }

  .provider-logo-img { width: 100%; height: 100%; object-fit: contain; }

  .provider-initial {
    width: 100%; height: 100%; display: flex; align-items: center;
    justify-content: center; background-color: var(--text-color);
    color: var(--bg-color); font-weight: 700; font-size: 0.875rem;
    border-radius: 6px; margin: -6px;
  }

  .provider-name {
    font-size: 1rem; font-weight: 700; color: var(--text-color);
    margin: 0; line-height: 1.3;
  }

  .provider-description {
    font-size: 0.8125rem; color: var(--muted-color);
    line-height: 1.5; margin: 0; flex: 1;
  }

  .provider-meta {
    display: flex; align-items: center; justify-content: space-between;
    padding-top: 0.625rem; border-top: 1px solid var(--border-color);
  }

  .provider-key {
    font-size: 0.75rem; color: var(--muted-color);
    font-family: 'JetBrains Mono', monospace;
  }

  .provider-meta svg { color: var(--muted-color); opacity: 0.4; }
  .provider-card:hover .provider-meta svg { opacity: 1; color: var(--litellm-primary); }

  @media (max-width: 1024px) {
    .container { flex-direction: column; }
    .sidebar { width: 100%; position: static; max-height: 300px; }
    .providers-grid { grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); }
  }

  @media (max-width: 768px) {
    .hero-title { font-size: 1.75rem; }
    .hero-subtitle { font-size: 0.9375rem; }
    .container { padding: 0 1rem; }
    .providers-grid { grid-template-columns: 1fr; }
    .endpoint-title { font-size: 1.375rem; }
  }
</style>
