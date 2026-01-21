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
  let expandedRows = new Set<string>();

  $: {
    if (index) {
      filterResults(query, selectedProvider, maxInputTokens, maxOutputTokens);
    }
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text).then(() => {
      // You could add a toast notification here if desired
    });
  }

  /**
   * Get the display name for a model, adding provider prefix when needed.
   * This helps users understand which auth method is required.
   * e.g., "gemini-2.0-flash" with provider "vertex_ai-language-models" -> "vertex_ai/gemini-2.0-flash"
   */
  function getDisplayModelName(name: string, litellm_provider: string): string {
    // If the model name already has a provider prefix, return as-is
    if (name.includes('/')) {
      return name;
    }

    // Add prefix for vertex_ai models so users know they need GCP credentials
    // Provider can be "vertex_ai", "vertex_ai-language-models", etc.
    if (litellm_provider && litellm_provider.startsWith('vertex_ai')) {
      return `vertex_ai/${name}`;
    }

    return name;
  }

  function toggleRow(name: string) {
    if (expandedRows.has(name)) {
      expandedRows.delete(name);
    } else {
      expandedRows.add(name);
    }
    expandedRows = expandedRows; // Trigger reactivity
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
      <div class="search-input-wrapper">
        <svg class="search-icon" width="20" height="20" viewBox="0 0 20 20" fill="none">
          <circle cx="8.5" cy="8.5" r="5.75" stroke="currentColor" stroke-width="1.5"/>
          <path d="M12.5 12.5L16.5 16.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
        </svg>
        <input
          id="query"
          bind:value={query}
          type="text"
          autocomplete="off"
          name="query"
          aria-label="Search models"
          placeholder="Search model..."
          class="search-input"
        />
      </div>
      
      <ProviderDropdown bind:selectedProvider {providers} />
    </div>

    <div class="filters-row">
      <div class="filter-group">
        <label for="maxInputTokens">Min Input Tokens</label>
        <input
          id="maxInputTokens"
          bind:value={maxInputTokens}
          type="number"
          min="0"
          placeholder="e.g., 100000"
          class="filter-input"
        />
      </div>
      <div class="filter-group">
        <label for="maxOutputTokens">Min Output Tokens</label>
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
      <div class="add-model-section">
        <a href={getIssueUrlForAdd(query)}>Add new model?</a>
      </div>
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
            <tr class="model-row" class:expanded={expandedRows.has(name)} on:click={() => toggleRow(name)}>
              <td class="model-name">
                <div class="model-info">
                  <svg class="expand-icon" class:expanded={expandedRows.has(name)} width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M6 4L10 8L6 12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                  </svg>
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
                  <span class="model-title">{getDisplayModelName(name, litellm_provider)}</span>
                  <button
                    class="copy-button"
                    on:click|stopPropagation={() => copyToClipboard(getDisplayModelName(name, litellm_provider))}
                    title="Copy model name"
                    type="button"
                  >
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                      <rect x="4" y="4" width="8" height="8" rx="1.5" stroke="currentColor" stroke-width="1.2"/>
                      <path d="M2 6V2.5C2 1.67157 2.67157 1 3.5 1H7" stroke="currentColor" stroke-width="1.2"/>
                    </svg>
                  </button>
                </div>
              </td>
              <td class="context-cell">{max_input_tokens && max_input_tokens > 0 && (max_input_tokens / 1000).toFixed(0) !== '0' ? (max_input_tokens >= 1000000 ? (max_input_tokens / 1000000).toFixed(0) + 'M' : (max_input_tokens / 1000).toFixed(0) + 'K') : '—'}</td>
              <td class="cost-cell">{input_cost_per_token ? '$' + (input_cost_per_token * 1000000).toFixed(2) + '/M' : '—'}</td>
              <td class="cost-cell">{output_cost_per_token ? '$' + (output_cost_per_token * 1000000).toFixed(2) + '/M' : '—'}</td>
              <td class="cost-cell">{cache_read_input_token_cost ? '$' + (cache_read_input_token_cost * 1000000).toFixed(2) + '/M' : '—'}</td>
              <td class="cost-cell">{cache_creation_input_token_cost ? '$' + (cache_creation_input_token_cost * 1000000).toFixed(2) + '/M' : '—'}</td>
            </tr>
            {#if expandedRows.has(name)}
              <tr class="expanded-content" transition:fly={{ y: -10, duration: 200 }}>
                <td colspan="6">
                  <div class="code-block">
                    <pre><code>{JSON.stringify({ name, mode, litellm_provider, max_input_tokens, max_output_tokens, input_cost_per_token, output_cost_per_token, cache_creation_input_token_cost, cache_read_input_token_cost, ...data }, null, 2)}</code></pre>
                  </div>
                </td>
              </tr>
            {/if}
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

  .container {
    background-color: var(--bg-color);
    color: var(--text-color);
  }

  /* Hero Section */
  .hero {
    text-align: center;
    padding: 5rem 2rem 4rem;
    max-width: 900px;
    margin: 0 auto;
    background-color: var(--bg-color);
    color: var(--text-color);
  }

  .hero-title {
    font-size: 4rem;
    font-weight: 700;
    line-height: 1.1;
    margin: 0 0 1.25rem 0;
    color: var(--text-color);
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
    background-color: var(--text-color);
    color: var(--bg-color);
    border-color: var(--text-color);
  }

  .btn-primary:hover {
    background-color: var(--text-secondary);
    border-color: var(--text-secondary);
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  }

  .btn-secondary {
    background-color: var(--bg-color);
    color: var(--text-color);
    border-color: var(--border-color);
  }

  .btn-secondary:hover {
    border-color: var(--border-color-strong);
    background-color: var(--hover-bg);
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

  /* Filters */
  .filters-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem;
    margin-top: 1rem;
  }

  .filter-group {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .filter-group label {
    font-size: 0.875rem;
    font-weight: 500;
    color: var(--contrast);
  }

  .filter-input {
    padding: 0.875rem 1rem;
    font-size: 1rem;
    border: 1px solid var(--border-color-strong);
    border-radius: 8px;
    background-color: var(--bg-color);
    color: var(--text-color);
    transition: all 0.2s ease;
    height: 48px;
    box-sizing: border-box;
  }

  .filter-input:hover {
    border-color: var(--muted-color);
  }

  .filter-input:focus {
    outline: none;
    border-color: var(--litellm-primary);
    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
  }

  .filter-input::placeholder {
    color: var(--muted-color);
  }

  /* Add Model Section */
  .add-model-section {
    max-width: 1400px;
    margin: 0 auto 1rem;
    padding: 0 2rem;
  }

  .add-model-section a {
    color: var(--link-color);
    text-decoration: none;
    font-size: 0.95rem;
  }

  .add-model-section a:hover {
    text-decoration: underline;
    color: var(--link-hover);
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
    background: var(--card-bg);
    border-radius: 12px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    border: 1px solid var(--border-color);
  }

  thead {
    background-color: var(--card-bg);
    border-bottom: 1px solid var(--border-color);
  }

  th {
    padding: 0.75rem 1.5rem;
    text-align: left;
    font-weight: 500;
    font-size: 0.75rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--muted-color);
    background-color: var(--card-bg);
  }

  tbody {
    background-color: var(--card-bg);
  }

  tbody tr.model-row {
    border-bottom: 1px solid var(--border-color);
    transition: background-color 0.15s ease;
    cursor: pointer;
    background-color: var(--card-bg);
  }

  tbody tr.model-row:hover {
    background-color: var(--hover-bg);
  }

  tbody tr.model-row.expanded {
    background-color: var(--bg-tertiary);
  }

  tbody tr.model-row:last-child {
    border-bottom: none;
  }

  tbody tr.expanded-content {
    border-bottom: 1px solid var(--border-color);
  }

  tbody tr.expanded-content td {
    padding: 0;
  }

  td {
    padding: 0.875rem 1.5rem;
    vertical-align: middle;
    font-size: 0.9375rem;
    background-color: var(--card-bg);
    color: var(--text-color);
  }

  .model-name {
    font-weight: 500;
    min-width: 300px;
    color: var(--text-color);
  }

  .model-info {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    position: relative;
  }

  .expand-icon {
    color: var(--muted-color);
    transition: transform 0.2s ease;
    flex-shrink: 0;
  }

  .expand-icon.expanded {
    transform: rotate(90deg);
  }

  .copy-button {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0.25rem;
    background: transparent;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    color: var(--muted-color);
    transition: all 0.15s ease;
    margin-left: 0.5rem;
  }

  .copy-button:hover {
    background-color: var(--hover-bg);
    color: var(--text-secondary);
  }

  .copy-button:active {
    transform: scale(0.95);
    background-color: var(--bg-tertiary);
  }

  .provider-avatar {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    background-color: var(--bg-color);
    color: var(--text-color);
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 600;
    font-size: 0.75rem;
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
    background-color: var(--text-color);
    color: var(--bg-color);
    font-weight: 600;
    font-size: 0.75rem;
    border-radius: 50%;
    margin: -4px;
  }

  .model-title {
    font-family: monospace;
    font-size: 0.875rem;
    font-weight: 500;
  }

  .context-cell {
    color: var(--contrast);
    font-weight: 500;
  }

  .cost-cell {
    color: var(--muted-color);
  }

  .code-block {
    background-color: var(--code-bg);
    border-top: 1px solid var(--border-color);
    margin: 0;
    padding: 1.5rem;
    overflow-x: auto;
  }

  .code-block pre {
    margin: 0;
    font-family: 'Menlo', 'Monaco', 'Courier New', monospace;
    font-size: 0.875rem;
    line-height: 1.6;
    background-color: var(--code-bg) !important;
  }

  .code-block code {
    color: var(--code-text) !important;
    background-color: var(--code-bg) !important;
    display: block;
  }

  /* Responsive Design */
  @media (max-width: 768px) {
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
