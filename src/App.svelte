<script lang="ts">
  import { onMount } from "svelte";
  import { fly } from "svelte/transition";

  import Fuse from "fuse.js";
  import { getProviderInitial, getProviderLogo } from "./providers";
  import ProviderDropdown from "./ProviderDropdown.svelte";

  type Item = {
    name: string;
    [key: string]: any;
  };

  type ResultItem = {
    refIndex: number;
    item: any;
  };

  const REPO_FULL_NAME = "BerriAI/litellm";
  const DEFAULT_BRANCH = "main";
  const RESOURCE_NAME = "model_prices_and_context_window.json";
  const RESOURCE_BACKUP_NAME = "model_prices_and_context_window_backup.json";
  const RESOURCE_PATH = `${RESOURCE_NAME}`;
  const RESOURCE_BACKUP_PATH = `litellm/${RESOURCE_BACKUP_NAME}`;
  let providers: string[] = [];
  let selectedProvider: string = "";
  let maxInputTokens: number | null = null;
  let maxOutputTokens: number | null = null;

  onMount(() => {
    const urlParams = new URLSearchParams(window.location.search);
    query = urlParams.get("q") ?? "";

    fetch(
      `https://api.github.com/repos/${REPO_FULL_NAME}/commits/${DEFAULT_BRANCH}`,
      {
        headers: {
          Accept: "application/vnd.github.VERSION.sha",
        },
      },
    )
      .then((res) => res.text())
      .then((text) => {
        sha = text;
      });

    fetch(
      `https://raw.githubusercontent.com/${REPO_FULL_NAME}/main/${RESOURCE_PATH}`,
    )
      .then((res) => res.text())
      .then((text) => {
        lines = text.split("\n");
        const items: Item[] = Object.entries(JSON.parse(text)).map(
          ([k, v]: any) => ({ name: k, ...v }),
        );

        providers = [...new Set(items.map((i) => i.litellm_provider))];

        // sort providers alphabetically
        providers.sort();

        index = new Fuse(items, {
          threshold: 0.3,
          keys: [
            {
              name: "name",
              weight: 1.5,
            },
            "mode",
            "litellm_provider",
          ],
        });

        // Initialize results with all items
        results = items.map((item, refIndex) => ({ item, refIndex }));
        loading = false;
      });
  });

  const debounce = (callback: Function, wait = 500) => {
    let timeout: ReturnType<typeof setTimeout>;

    return (...args: any[]) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => callback(...args), wait);
    };
  };

  const getIssueUrlForAdd = (query: string) => {
    const q = encodeURIComponent(query);
    const body = encodeURIComponent(
      `Source: <SOURCE_URL>

We need to update both [${RESOURCE_NAME}](https://github.com/${REPO_FULL_NAME}/blob/${sha ?? DEFAULT_BRANCH}/${RESOURCE_PATH}) and [${RESOURCE_BACKUP_NAME}](https://github.com/${REPO_FULL_NAME}/blob/${sha ?? DEFAULT_BRANCH}/${RESOURCE_BACKUP_PATH}) to reflect the new model.
`,
    );

    return `https://github.com/${REPO_FULL_NAME}/issues/new?labels=enhancement,fastrepl&title=Add+%22${q}%22+in+%22${RESOURCE_NAME}%22&body=${body}`;
  };

  const getIssueUrlForFix = (name: string) => {
    const repo = `https://github.com/${REPO_FULL_NAME}`;
    const issue = `${repo}/issues/new?labels=bug,fastrepl`;

    const from = lines.findIndex((line) => line.includes(`"${name}":`)) + 1;

    const to =
      lines.findIndex((line, i) => line.includes("}") && i > from - 1) + 1;

    if (from > 0 && to > 0) {
      const body = encodeURIComponent(
        `${repo}/blob/${sha ?? DEFAULT_BRANCH}/${RESOURCE_PATH}#L${from}-L${to}

We also need to update [${RESOURCE_BACKUP_NAME}](https://github.com/${REPO_FULL_NAME}/blob/${sha ?? DEFAULT_BRANCH}/${RESOURCE_BACKUP_PATH}).
`,
      );

      return `${issue}&title=Fix+%22${name}%22+entry+in+%22${RESOURCE_NAME}%22&body=${body}`;
    } else {
      return `${issue}&title=Fix+%22${name}%22+entry+in+%22${RESOURCE_NAME}%22`;
    }
  };

  let sha: string | null = null;
  let query = "";
  let lines: string[] = [];
  let index: Fuse<Item>;
  let results: ResultItem[] = [];
  let loading = true;

  $: {
    if (index) {
      filterResults(query, selectedProvider, maxInputTokens, maxOutputTokens);
    }
  }

  function filterResults(
    query: string,
    selectedProvider: string,
    maxInputTokens: number | null,
    maxOutputTokens: number | null,
  ) {
    if (index) {
      let filteredResults: Item[];

      // Get all items from the index
      const allItems = index["_docs"] as Item[];

      // Filter by provider and max_input_tokens and max_output_tokens
      filteredResults = allItems.filter(
        (item) =>
          (!selectedProvider || item.litellm_provider === selectedProvider) &&
          (maxInputTokens === null ||
            (item.max_input_tokens &&
              item.max_input_tokens >= maxInputTokens)) &&
          (maxOutputTokens === null ||
            (item.max_output_tokens &&
              item.max_output_tokens >= maxOutputTokens)),
      );

      // Then, apply search query if it's not empty
      if (query) {
        // Create a new Fuse instance with the filtered results
        const filteredIndex = new Fuse(filteredResults, {
          threshold: 0.3,
          keys: [
            {
              name: "name",
              weight: 1.5,
            },
            "mode",
            "litellm_provider",
          ],
        });

        const searchResults = filteredIndex.search(query);
        filteredResults = searchResults.map((result) => result.item);
      }

      // Map the filtered results to the ResultItem format
      results = filteredResults.map((item, refIndex) => ({ item, refIndex }));
      loading = false;
    }
  }
</script>

<header class="header">
  <div class="header-content">
    <div class="logo-section-header">
      <span class="logo-emoji">🚅</span>
      <span class="logo-text-header">LiteLLM</span>
    </div>
    <nav class="nav-links">
      <a href="https://docs.litellm.ai/docs/" target="_blank" rel="noopener noreferrer" class="nav-link">Docs</a>
      <a href="https://github.com/BerriAI/litellm" target="_blank" rel="noopener noreferrer" class="nav-link">GitHub</a>
    </nav>
  </div>
</header>

<main class="container">
  <!-- Hero Section -->
  <div class="hero">
    <h1 class="hero-title">Browse LiteLLM Models</h1>
    <p class="hero-subtitle">
      A catalog of AI models with pricing and context window information, powered by LiteLLM's comprehensive model database.
    </p>
    
    <div class="cta-buttons">
      <a 
        href="https://github.com/BerriAI/litellm" 
        target="_blank"
        rel="noopener noreferrer"
        class="btn btn-primary"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" style="margin-right: 8px;">
          <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/>
        </svg>
        View on GitHub
      </a>
      <a 
        href="https://docs.litellm.ai/docs/" 
        target="_blank"
        rel="noopener noreferrer"
        class="btn btn-secondary"
      >
        Read the Docs
      </a>
    </div>
  </div>

  <!-- Search and Filters -->
  <div class="search-section">
    <div class="search-bar-container">
      <input
        id="query"
        bind:value={query}
        type="search"
        autocomplete="off"
        name="query"
        aria-label="Search models"
        placeholder="Search model..."
        class="search-input"
      />
      
      <ProviderDropdown bind:selectedProvider {providers} />
    </div>

    <div class="advanced-filters">
      <div class="filter-item-inline">
        <label for="maxInputTokens">Min Input Tokens:</label>
        <input
          id="maxInputTokens"
          bind:value={maxInputTokens}
          type="number"
          min="0"
          placeholder="e.g., 100000"
          class="filter-input"
        />
      </div>
      <div class="filter-item-inline">
        <label for="maxOutputTokens">Min Output Tokens:</label>
        <input
          id="maxOutputTokens"
          bind:value={maxOutputTokens}
          type="number"
          min="0"
          placeholder="e.g., 4096"
          class="filter-input"
        />
      </div>
    </div>
  </div>

  {#if loading}
    <span aria-busy="true" />
  {:else}
    {#if query != "" && results.length < 12}
      <section>
        <a href={getIssueUrlForAdd(query)}>Add new model?</a>
      </section>
    {/if}

    <div class="table-container">
      <table>
        <thead>
          <tr>
            <th>Model</th>
            <th>Context</th>
            <th>Input Tokens</th>
            <th>Output Tokens</th>
            <th>Cache Read Tokens</th>
            <th>Cache Write Tokens</th>
          </tr>
        </thead>
        <tbody>
          {#each results as { item: { name, mode, litellm_provider, max_input_tokens, max_output_tokens, input_cost_per_token, output_cost_per_token, cache_creation_input_token_cost, cache_read_input_token_cost, ...data } } (name)}
            <tr>
              <td class="model-name">
                <div class="model-info">
                  <div class="provider-avatar">
                    {#if getProviderLogo(litellm_provider)}
                      <img 
                        src={getProviderLogo(litellm_provider)} 
                        alt={litellm_provider}
                        class="provider-logo-img"
                        on:error={(e) => {
                          e.currentTarget.style.display = 'none';
                          e.currentTarget.nextElementSibling.style.display = 'flex';
                        }}
                      />
                      <div class="provider-initial" style="display: none;">
                        {getProviderInitial(litellm_provider)}
                      </div>
                    {:else}
                      <div class="provider-initial">
                        {getProviderInitial(litellm_provider)}
                      </div>
                    {/if}
                  </div>
                  <span class="model-title">{name}</span>
                </div>
              </td>
              <td class="context-cell">{max_input_tokens && max_input_tokens > 0 ? (max_input_tokens >= 1000000 ? (max_input_tokens / 1000000).toFixed(0) + 'M' : (max_input_tokens / 1000).toFixed(0) + 'K') : '—'}</td>
              <td class="cost-cell">{input_cost_per_token ? '$' + (input_cost_per_token * 1000000).toFixed(2) + '/M' : '—'}</td>
              <td class="cost-cell">{output_cost_per_token ? '$' + (output_cost_per_token * 1000000).toFixed(2) + '/M' : '—'}</td>
              <td class="cost-cell">{cache_read_input_token_cost ? '$' + (cache_read_input_token_cost * 1000000).toFixed(2) + '/M' : '—'}</td>
              <td class="cost-cell">{cache_creation_input_token_cost ? '$' + (cache_creation_input_token_cost * 1000000).toFixed(2) + '/M' : '—'}</td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {/if}
</main>

<style>
  :root {
    --litellm-primary: #6366f1;
    --litellm-dark: #0f0f23;
    --litellm-purple: #8b5cf6;
  }

  /* Header */
  .header {
    position: sticky;
    top: 0;
    z-index: 100;
    background-color: rgba(255, 255, 255, 0.95);
    backdrop-filter: blur(10px);
    border-bottom: 1px solid var(--muted-border-color);
  }

  .header-content {
    max-width: 1400px;
    margin: 0 auto;
    padding: 1rem 2rem;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .logo-section-header {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    cursor: pointer;
  }

  .logo-emoji {
    font-size: 1.5rem;
    line-height: 1;
  }

  .logo-text-header {
    font-size: 1.25rem;
    font-weight: 700;
    color: var(--contrast);
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Inter', 'Roboto', 'Helvetica Neue', Arial, sans-serif;
  }

  .nav-links {
    display: flex;
    align-items: center;
    gap: 2rem;
  }

  .nav-link {
    color: var(--contrast);
    text-decoration: none;
    font-size: 0.9375rem;
    font-weight: 500;
    transition: color 0.2s ease;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Inter', 'Roboto', 'Helvetica Neue', Arial, sans-serif;
  }

  .nav-link:hover {
    color: var(--litellm-primary);
  }

  /* Hero Section */
  .hero {
    text-align: center;
    padding: 5rem 2rem 4rem;
    max-width: 900px;
    margin: 0 auto;
  }

  .hero-title {
    font-size: 4rem;
    font-weight: 700;
    line-height: 1.1;
    margin: 0 0 1.25rem 0;
    color: var(--contrast);
    letter-spacing: -0.03em;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Inter', 'Roboto', 'Helvetica Neue', Arial, sans-serif;
  }

  .hero-subtitle {
    font-size: 1.25rem;
    line-height: 1.5;
    color: var(--muted-color);
    margin: 0 0 2rem 0;
    max-width: 700px;
    margin-left: auto;
    margin-right: auto;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Inter', 'Roboto', 'Helvetica Neue', Arial, sans-serif;
  }

  .cta-buttons {
    display: flex;
    gap: 1rem;
    justify-content: center;
    align-items: center;
  }

  .btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 0.875rem 2rem;
    font-size: 1rem;
    font-weight: 500;
    border-radius: 100px;
    text-decoration: none;
    transition: all 0.2s ease;
    border: 1px solid transparent;
    cursor: pointer;
  }

  .btn-primary {
    background-color: #000;
    color: #fff;
    border-color: #000;
  }

  .btn-primary:hover {
    background-color: #333;
    border-color: #333;
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  }

  .btn-secondary {
    background-color: #fff;
    color: var(--contrast);
    border-color: #e5e5e5;
  }

  .btn-secondary:hover {
    border-color: #d4d4d4;
    background-color: #fafafa;
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
  }

  .search-input {
    flex: 1;
    padding: 0.875rem 1rem;
    font-size: 1rem;
    border: 1px solid var(--muted-border-color);
    border-radius: 8px;
    background-color: var(--card-background-color);
    transition: all 0.2s ease;
  }

  .search-input:focus {
    outline: none;
    border-color: var(--litellm-primary);
    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
  }

  .search-input::placeholder {
    color: var(--muted-color);
  }

  /* Advanced Filters */
  .advanced-filters {
    display: flex;
    gap: 1rem;
    flex-wrap: wrap;
  }

  .filter-item-inline {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .filter-item-inline label {
    font-size: 0.875rem;
    color: var(--muted-color);
    white-space: nowrap;
  }

  .filter-input {
    padding: 0.5rem 0.75rem;
    font-size: 0.875rem;
    border: 1px solid var(--muted-border-color);
    border-radius: 6px;
    background-color: var(--card-background-color);
    transition: all 0.2s ease;
    width: 150px;
  }

  .filter-input:focus {
    outline: none;
    border-color: var(--litellm-primary);
    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
  }

  .filter-input::placeholder {
    color: var(--muted-color);
  }

  /* Table styles */
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
    background-color: var(--card-background-color);
    border-bottom: 1px solid var(--muted-border-color);
  }

  th {
    padding: 1rem 1.5rem;
    text-align: left;
    font-weight: 500;
    font-size: 0.75rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--muted-color);
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
    padding: 1.25rem 1.5rem;
    vertical-align: middle;
    font-size: 0.95rem;
  }

  .model-name {
    font-weight: 500;
    min-width: 300px;
  }

  .model-info {
    display: flex;
    align-items: center;
    gap: 1rem;
  }

  .provider-avatar {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    background-color: white;
    color: white;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 600;
    font-size: 0.9rem;
    flex-shrink: 0;
    overflow: hidden;
    position: relative;
    padding: 6px;
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
    font-size: 0.9rem;
    border-radius: 50%;
    margin: -6px;
  }

  .model-title {
    font-family: monospace;
    font-size: 0.95rem;
    font-weight: 500;
  }

  .context-cell {
    color: var(--contrast);
    font-weight: 500;
  }

  .cost-cell {
    color: var(--muted-color);
  }

  /* Responsive Design */
  @media (max-width: 768px) {
    .header-content {
      padding: 1rem;
    }

    .logo-text-header {
      font-size: 1.125rem;
    }

    .nav-links {
      gap: 1rem;
    }

    .nav-link {
      font-size: 0.875rem;
    }

    .hero {
      padding: 2rem 1rem;
    }

    .hero-title {
      font-size: 2.5rem;
    }

    .hero-subtitle {
      font-size: 1rem;
    }

    .cta-buttons {
      flex-direction: column;
      width: 100%;
    }

    .btn {
      width: 100%;
    }

    .search-bar-container {
      flex-direction: column;
    }

    .advanced-filters {
      flex-direction: column;
      width: 100%;
    }

    .filter-item-inline {
      width: 100%;
    }

    .filter-input {
      flex: 1;
      width: auto;
    }

    th, td {
      padding: 0.75rem 1rem;
      font-size: 0.875rem;
    }

    .model-name {
      min-width: 200px;
    }

    .provider-avatar {
      width: 32px;
      height: 32px;
      padding: 4px;
    }

    .model-title {
      font-size: 0.875rem;
    }
  }
</style>
