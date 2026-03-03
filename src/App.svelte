<script lang="ts">
  import { onMount } from "svelte";
  import { fly } from "svelte/transition";

  import Fuse from "fuse.js";
  import { getProviderInitial, getProviderLogo } from "./providers";
  import ProviderDropdown from "./ProviderDropdown.svelte";
  import { trackSearch } from "./analytics";

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

  // Sorting state
  let sortColumn: string = "";
  let sortDirection: "asc" | "desc" = "asc";

  // Copy toast
  let copiedModel = "";

  // Search input ref and focus tracking
  let searchInput: HTMLInputElement;
  let searchFocused = false;

  function handleKeydown(e: KeyboardEvent) {
    if ((e.metaKey || e.ctrlKey) && e.key === "k") {
      e.preventDefault();
      searchInput?.focus();
    }
    if (e.key === "Escape" && document.activeElement === searchInput) {
      searchInput?.blur();
    }
  }

  // Quick start tab state per model
  let codeTabStates: Record<string, "sdk" | "proxy"> = {};

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

  const trackSearchDebounced = debounce((query: string, provider: string, resultsCount: number) => {
    if (query) {
      trackSearch(query, provider, resultsCount);
    }
  }, 1000);

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
      copiedModel = text;
      setTimeout(() => { copiedModel = ""; }, 1500);
    });
  }

  function getDisplayModelName(name: string, litellm_provider: string): string {
    if (name.includes('/')) {
      return name;
    }
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
    expandedRows = expandedRows;
  }

  function handleSort(column: string) {
    if (sortColumn === column) {
      sortDirection = sortDirection === "asc" ? "desc" : "asc";
    } else {
      sortColumn = column;
      sortDirection = "asc";
    }
    applySorting();
  }

  function getSortValue(item: any, column: string): number {
    switch (column) {
      case "context": return item.max_input_tokens || 0;
      case "input": return item.input_cost_per_token || 0;
      case "output": return item.output_cost_per_token || 0;
      case "cache_read": return item.cache_read_input_token_cost || 0;
      case "cache_write": return item.cache_creation_input_token_cost || 0;
      default: return 0;
    }
  }

  function applySorting() {
    if (!sortColumn) return;
    results = [...results].sort((a, b) => {
      const aVal = getSortValue(a.item, sortColumn);
      const bVal = getSortValue(b.item, sortColumn);
      return sortDirection === "asc" ? aVal - bVal : bVal - aVal;
    });
  }

  function formatCost(costPerToken: number | undefined): string {
    if (!costPerToken) return "—";
    const perMillion = costPerToken * 1000000;
    if (perMillion < 0.01) return "<$0.01";
    return "$" + perMillion.toFixed(2);
  }

  function formatContext(tokens: number | undefined): string {
    if (!tokens || tokens <= 0) return "—";
    if (tokens >= 1000000) return (tokens / 1000000).toFixed(0) + "M";
    if (tokens >= 1000) return (tokens / 1000).toFixed(0) + "K";
    return tokens.toString();
  }

  function getFeatureBadges(item: any): string[] {
    const badges: string[] = [];
    if (item.supports_function_calling) badges.push("Functions");
    if (item.supports_vision) badges.push("Vision");
    if (item.supports_response_schema) badges.push("JSON");
    if (item.supports_tool_choice) badges.push("Tools");
    if (item.supports_parallel_function_calling) badges.push("Parallel");
    if (item.supports_audio_input) badges.push("Audio");
    if (item.supports_prompt_caching) badges.push("Caching");
    return badges;
  }

  function getModeLabel(mode: string | undefined): string {
    if (!mode) return "";
    const labels: Record<string, string> = {
      "chat": "Chat",
      "completion": "Completion",
      "embedding": "Embedding",
      "image_generation": "Image Gen",
      "audio_transcription": "Transcription",
      "audio_speech": "TTS",
      "moderation": "Moderation",
      "rerank": "Rerank",
    };
    return labels[mode] || mode;
  }

  function filterResults(
    query: string,
    selectedProvider: string,
    maxInputTokens: number | null,
    maxOutputTokens: number | null,
  ) {
    if (index) {
      let filteredResults: Item[];

      const allItems = index["_docs"] as Item[];

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

      if (query) {
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

      results = filteredResults.map((item, refIndex) => ({ item, refIndex }));
      loading = false;

      if (sortColumn) applySorting();

      trackSearchDebounced(query, selectedProvider, results.length);
    }
  }
</script>

<svelte:window on:keydown={handleKeydown} />

<main class="container">
  <!-- Hero Section -->
  <div class="hero">
    <div class="hero-badge">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
      Open-source AI Gateway — 27K+ GitHub Stars
    </div>
    <h1 class="hero-title">The Most Comprehensive<br/>AI Model Catalog</h1>
    <p class="hero-subtitle">
      Compare pricing, context windows, and features for <strong>2,600+ models</strong> across <strong>140+ providers</strong>. Powered by LiteLLM's open-source model database.
    </p>
    
    <div class="cta-buttons">
      <a 
        href="https://github.com/BerriAI/litellm" 
        target="_blank"
        rel="noopener noreferrer"
        class="btn btn-primary"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" style="margin-right: 6px;">
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

  <!-- Trust Logos -->
  <div class="trust-section">
    <p class="trust-label">Trusted by leading teams</p>
    <div class="trust-logos">
      <img class="trust-logo-img" src="https://github.com/user-attachments/assets/f7296d4f-9fbd-460d-9d05-e4df31697c4b" alt="Stripe" height="28" />
      <img class="trust-logo-img" src="https://github.com/user-attachments/assets/caf270a2-5aee-45c4-8222-41a2070c4f19" alt="Google ADK" height="28" />
      <img class="trust-logo-img" src="https://github.com/user-attachments/assets/0be4bd8a-7cfa-48d3-9090-f415fe948280" alt="Greptile" height="28" />
      <img class="trust-logo-img" src="https://github.com/user-attachments/assets/a6150c4c-149e-4cae-888b-8b92be6e003f" alt="OpenHands" height="28" />
      <span class="trust-logo-text">Netflix</span>
      <img class="trust-logo-img" src="https://github.com/user-attachments/assets/c02f7be0-8c2e-4d27-aea7-7c024bfaebc0" alt="OpenAI Agents SDK" height="28" />
      <img class="trust-logo-img trust-logo-svg" src="https://cdn.jsdelivr.net/npm/@lobehub/icons-static-svg@latest/icons/adobe-text.svg" alt="Adobe" height="28" />
      <span class="trust-logo-text trust-logo-icon">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.381-.008.008 5.352 0 11.971V12c0 6.64 5.359 12 12 12 6.64 0 12-5.36 12-12 0-6.641-5.36-12-12-12zm0 20.801c-4.846.015-8.786-3.904-8.801-8.75V12c-.014-4.846 3.904-8.786 8.75-8.801H12c4.847-.014 8.786 3.904 8.801 8.75V12c.015 4.847-3.904 8.786-8.75 8.801H12zm5.44-11.76c0 1.359-1.12 2.479-2.481 2.479-1.366-.007-2.472-1.113-2.479-2.479 0-1.361 1.12-2.481 2.479-2.481 1.361 0 2.481 1.12 2.481 2.481zm0 5.919c0 1.36-1.12 2.48-2.481 2.48-1.367-.008-2.473-1.114-2.479-2.48 0-1.359 1.12-2.479 2.479-2.479 1.361-.001 2.481 1.12 2.481 2.479zm-5.919 0c0 1.36-1.12 2.48-2.479 2.48-1.368-.007-2.475-1.113-2.481-2.48 0-1.359 1.12-2.479 2.481-2.479 1.358-.001 2.479 1.12 2.479 2.479zm0-5.919c0 1.359-1.12 2.479-2.479 2.479-1.367-.007-2.475-1.112-2.481-2.479 0-1.361 1.12-2.481 2.481-2.481 1.358 0 2.479 1.12 2.479 2.481z"/></svg>
        Twilio
      </span>
      <span class="trust-logo-text trust-logo-icon">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="12"/><text x="12" y="16.5" text-anchor="middle" fill="white" font-size="13" font-weight="700" font-family="Arial,sans-serif">Z</text></svg>
        Zurich
      </span>
      <img class="trust-logo-img trust-logo-svg" src="https://cdn.jsdelivr.net/npm/@lobehub/icons-static-svg@latest/icons/zapier-text.svg" alt="Zapier" height="28" />
      <span class="trust-logo-text">Rocket Money</span>
      <span class="trust-logo-text" style="font-style: italic;">Lemonade</span>
      <span class="trust-logo-text trust-logo-icon">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M17.47 6.07a6.26 6.26 0 00-3.24-3.47A6.04 6.04 0 0011.32 2c-3.36 0-6.2 2.76-6.2 6.36a7.1 7.1 0 001.65 4.52L12 22l5.24-9.12a7.1 7.1 0 001.64-4.52c0-.77-.14-1.54-.41-2.29zM12 11.13a2.89 2.89 0 110-5.78 2.89 2.89 0 010 5.78z"/></svg>
        The Weather Company
      </span>
      <span class="trust-logo-text" style="font-weight: 300; letter-spacing: 0.15em;">samsara</span>
    </div>
  </div>

  <!-- Search and Filters -->
  <div class="search-section">
    <div class="search-bar-container">
      <div class="search-input-wrapper">
        <svg class="search-icon" width="18" height="18" viewBox="0 0 20 20" fill="none">
          <circle cx="8.5" cy="8.5" r="5.75" stroke="currentColor" stroke-width="1.5"/>
          <path d="M12.5 12.5L16.5 16.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
        </svg>
        <input
          id="query"
          bind:this={searchInput}
          bind:value={query}
          on:focus={() => { searchFocused = true; }}
          on:blur={() => { searchFocused = false; }}
          type="text"
          autocomplete="off"
          name="query"
          aria-label="Search models"
          placeholder="Search models... (e.g., gpt-4o, claude-3.5, gemini)"
          class="search-input"
        />
        {#if query}
          <button class="search-clear" on:click={() => { query = ""; }} type="button">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        {/if}
        {#if !query && !searchFocused}
          <kbd class="search-shortcut">⌘K</kbd>
        {/if}
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

    {#if !loading}
      <div class="results-meta">
        <span class="results-count">{results.length.toLocaleString()} models</span>
        {#if query || selectedProvider || maxInputTokens || maxOutputTokens}
          <button class="clear-filters" on:click={() => { query = ""; selectedProvider = ""; maxInputTokens = null; maxOutputTokens = null; }}>
            Clear all filters
          </button>
        {/if}
      </div>
    {/if}
  </div>

  {#if loading}
    <div class="table-container">
      <div class="skeleton-table">
        {#each [1,2,3,4,5,6,7,8] as _}
          <div class="skeleton-row">
            <div class="skeleton-cell wide"></div>
            <div class="skeleton-cell"></div>
            <div class="skeleton-cell"></div>
            <div class="skeleton-cell"></div>
          </div>
        {/each}
      </div>
    </div>
  {:else}
    {#if query != "" && results.length < 12}
      <div class="add-model-section">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="16"></line><line x1="8" y1="12" x2="16" y2="12"></line></svg>
        <a href={getIssueUrlForAdd(query)}>Can't find your model? Request it on GitHub</a>
      </div>
    {/if}

    <div class="table-container">
      <table>
        <thead>
          <tr>
            <th class="th-model">Model</th>
            <th class="th-sortable" on:click={() => handleSort("context")}>
              Context
              <span class="sort-icon" class:active={sortColumn === "context"} class:desc={sortColumn === "context" && sortDirection === "desc"}>↑</span>
            </th>
            <th class="th-sortable" on:click={() => handleSort("input")}>
              Input $/M
              <span class="sort-icon" class:active={sortColumn === "input"} class:desc={sortColumn === "input" && sortDirection === "desc"}>↑</span>
            </th>
            <th class="th-sortable" on:click={() => handleSort("output")}>
              Output $/M
              <span class="sort-icon" class:active={sortColumn === "output"} class:desc={sortColumn === "output" && sortDirection === "desc"}>↑</span>
            </th>
            <th class="th-sortable th-hide-mobile" on:click={() => handleSort("cache_read")}>
              Cache Read
              <span class="sort-icon" class:active={sortColumn === "cache_read"} class:desc={sortColumn === "cache_read" && sortDirection === "desc"}>↑</span>
            </th>
            <th class="th-sortable th-hide-mobile" on:click={() => handleSort("cache_write")}>
              Cache Write
              <span class="sort-icon" class:active={sortColumn === "cache_write"} class:desc={sortColumn === "cache_write" && sortDirection === "desc"}>↑</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {#each results as { item: { name, mode, litellm_provider, max_input_tokens, max_output_tokens, input_cost_per_token, output_cost_per_token, cache_creation_input_token_cost, cache_read_input_token_cost, supports_function_calling, supports_vision, supports_response_schema, supports_tool_choice, supports_parallel_function_calling, supports_audio_input, supports_prompt_caching, ...data } } (name)}
            <tr class="model-row" class:expanded={expandedRows.has(name)} on:click={() => toggleRow(name)}>
              <td class="model-name">
                <div class="model-info">
                  <svg class="expand-icon" class:expanded={expandedRows.has(name)} width="14" height="14" viewBox="0 0 16 16" fill="none">
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
                  <div class="model-name-group">
                    <span class="model-title" title={getDisplayModelName(name, litellm_provider)}>{getDisplayModelName(name, litellm_provider)}</span>
                    {#if mode}
                      <span class="mode-badge">{getModeLabel(mode)}</span>
                    {/if}
                  </div>
                  <button
                    class="copy-button"
                    on:click|stopPropagation={() => copyToClipboard(getDisplayModelName(name, litellm_provider))}
                    title="Copy model name"
                    type="button"
                  >
                    {#if copiedModel === getDisplayModelName(name, litellm_provider)}
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--success-color)" stroke-width="2.5" stroke-linecap="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                    {:else}
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                        <rect x="4" y="4" width="8" height="8" rx="1.5" stroke="currentColor" stroke-width="1.2"/>
                        <path d="M2 6V2.5C2 1.67157 2.67157 1 3.5 1H7" stroke="currentColor" stroke-width="1.2"/>
                      </svg>
                    {/if}
                  </button>
                </div>
              </td>
              <td class="context-cell">{formatContext(max_input_tokens)}</td>
              <td class="cost-cell">{formatCost(input_cost_per_token)}</td>
              <td class="cost-cell">{formatCost(output_cost_per_token)}</td>
              <td class="cost-cell td-hide-mobile">{formatCost(cache_read_input_token_cost)}</td>
              <td class="cost-cell td-hide-mobile">{formatCost(cache_creation_input_token_cost)}</td>
            </tr>
            {#if expandedRows.has(name)}
              <tr class="expanded-content" transition:fly={{ y: -10, duration: 200 }}>
                <td colspan="6">
                  <div class="detail-panel">
                    <div class="detail-grid">
                      <!-- Pricing Cards -->
                      <div class="detail-section">
                        <h4 class="detail-heading">Pricing <span class="detail-unit">per 1M tokens</span></h4>
                        <div class="pricing-cards">
                          <div class="pricing-card">
                            <span class="pricing-label">Input</span>
                            <span class="pricing-value">{formatCost(input_cost_per_token)}</span>
                          </div>
                          <div class="pricing-card">
                            <span class="pricing-label">Output</span>
                            <span class="pricing-value">{formatCost(output_cost_per_token)}</span>
                          </div>
                          <div class="pricing-card">
                            <span class="pricing-label">Cache Read</span>
                            <span class="pricing-value">{formatCost(cache_read_input_token_cost)}</span>
                          </div>
                          <div class="pricing-card">
                            <span class="pricing-label">Cache Write</span>
                            <span class="pricing-value">{formatCost(cache_creation_input_token_cost)}</span>
                          </div>
                        </div>
                      </div>

                      <!-- Model Info -->
                      <div class="detail-section">
                        <h4 class="detail-heading">Model Info</h4>
                        <div class="info-rows">
                          <div class="info-row">
                            <span class="info-label">Provider</span>
                            <span class="info-value">{litellm_provider || "—"}</span>
                          </div>
                          <div class="info-row">
                            <span class="info-label">Mode</span>
                            <span class="info-value">{mode ? getModeLabel(mode) : "—"}</span>
                          </div>
                          <div class="info-row">
                            <span class="info-label">Max Input</span>
                            <span class="info-value">{max_input_tokens ? max_input_tokens.toLocaleString() + " tokens" : "—"}</span>
                          </div>
                          <div class="info-row">
                            <span class="info-label">Max Output</span>
                            <span class="info-value">{max_output_tokens ? max_output_tokens.toLocaleString() + " tokens" : "—"}</span>
                          </div>
                        </div>
                      </div>

                      <!-- Features -->
                      <div class="detail-section">
                        <h4 class="detail-heading">Features</h4>
                        <div class="feature-list">
                          {#each [
                            { key: supports_function_calling, label: "Function Calling" },
                            { key: supports_vision, label: "Vision" },
                            { key: supports_response_schema, label: "JSON Mode" },
                            { key: supports_tool_choice, label: "Tool Choice" },
                            { key: supports_parallel_function_calling, label: "Parallel Calls" },
                            { key: supports_audio_input, label: "Audio Input" },
                            { key: supports_prompt_caching, label: "Prompt Caching" },
                          ] as feature}
                            <div class="feature-item" class:supported={feature.key}>
                              {#if feature.key}
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--success-color)" stroke-width="2.5" stroke-linecap="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                              {:else}
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--muted-color)" stroke-width="2" stroke-linecap="round" opacity="0.4"><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                              {/if}
                              <span>{feature.label}</span>
                            </div>
                          {/each}
                        </div>
                      </div>
                    </div>

                    <!-- Code snippet with tabs -->
                    <div class="detail-code-section">
                      <div class="code-header-row">
                        <div class="code-tabs">
                          <button
                            class="code-tab"
                            class:active={!codeTabStates[name] || codeTabStates[name] === "sdk"}
                            on:click|stopPropagation={() => { codeTabStates[name] = "sdk"; codeTabStates = codeTabStates; }}
                          >Python SDK</button>
                          <button
                            class="code-tab"
                            class:active={codeTabStates[name] === "proxy"}
                            on:click|stopPropagation={() => { codeTabStates[name] = "proxy"; codeTabStates = codeTabStates; }}
                          >AI Gateway (Proxy)</button>
                        </div>
                        {#if !codeTabStates[name] || codeTabStates[name] === "sdk"}
                          <button class="copy-code-btn" on:click|stopPropagation={() => copyToClipboard(`from litellm import completion\n\nresponse = completion(\n    model="${getDisplayModelName(name, litellm_provider)}",\n    messages=[{"role": "user", "content": "Hello!"}]\n)`)}>
                            {copiedModel.includes("from litellm") ? "Copied!" : "Copy"}
                          </button>
                        {:else}
                          <button class="copy-code-btn" on:click|stopPropagation={() => copyToClipboard(`curl http://0.0.0.0:4000/v1/chat/completions \\\n  -H "Content-Type: application/json" \\\n  -H "Authorization: Bearer sk-1234" \\\n  -d '{\n    "model": "${getDisplayModelName(name, litellm_provider)}",\n    "messages": [{"role": "user", "content": "Hello!"}]\n  }'`)}>
                            {copiedModel.includes("curl") ? "Copied!" : "Copy"}
                          </button>
                        {/if}
                      </div>
                      {#if !codeTabStates[name] || codeTabStates[name] === "sdk"}
                        <pre class="code-snippet"><code><span class="code-kw">from</span> litellm <span class="code-kw">import</span> completion

response = completion(
    model=<span class="code-str">"{getDisplayModelName(name, litellm_provider)}"</span>,
    messages=[{`{`}<span class="code-str">"role"</span>: <span class="code-str">"user"</span>, <span class="code-str">"content"</span>: <span class="code-str">"Hello!"</span>{`}`}]
)</code></pre>
                      {:else}
                        <pre class="code-snippet"><code><span class="code-comment"># Start proxy: litellm --model {getDisplayModelName(name, litellm_provider)}</span>

curl http://0.0.0.0:4000/v1/chat/completions \
  -H <span class="code-str">"Content-Type: application/json"</span> \
  -H <span class="code-str">"Authorization: Bearer sk-1234"</span> \
  -d <span class="code-str">'{`{`}
    "model": "{getDisplayModelName(name, litellm_provider)}",
    "messages": [{`{`}"role": "user", "content": "Hello!"{`}`}]
  {`}`}'</span></code></pre>
                      {/if}
                    </div>

                    <!-- Actions -->
                    <div class="detail-actions">
                      <a href={getIssueUrlForFix(name)} target="_blank" rel="noopener noreferrer" class="detail-action-link" on:click|stopPropagation>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                        Report incorrect data
                      </a>
                    </div>
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
  .container {
    background-color: var(--bg-color);
    color: var(--text-color);
  }

  /* Hero Section */
  .hero {
    text-align: center;
    padding: 4rem 2rem 2.5rem;
    max-width: 800px;
    margin: 0 auto;
  }

  .hero-badge {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.375rem 1rem;
    background: var(--bg-secondary);
    border: 1px solid var(--border-color);
    border-radius: 100px;
    font-size: 0.8125rem;
    font-weight: 500;
    color: var(--muted-color);
    margin-bottom: 1.5rem;
  }

  .hero-badge svg {
    color: #f59e0b;
    fill: #f59e0b;
  }

  .hero-title {
    font-size: 3.25rem;
    font-weight: 800;
    line-height: 1.1;
    margin: 0 0 1.25rem 0;
    color: var(--text-color);
    letter-spacing: -0.04em;
  }

  .hero-subtitle {
    font-size: 1.125rem;
    line-height: 1.6;
    color: var(--text-secondary);
    margin: 0 0 2rem 0;
    max-width: 600px;
    margin-left: auto;
    margin-right: auto;
  }

  .hero-subtitle strong {
    color: var(--text-color);
    font-weight: 600;
  }

  .cta-buttons {
    display: flex;
    gap: 0.75rem;
    justify-content: center;
    align-items: center;
  }

  .btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 0.75rem 1.5rem;
    font-size: 0.9375rem;
    font-weight: 600;
    border-radius: 10px;
    text-decoration: none;
    transition: all 0.15s ease;
    border: 1px solid transparent;
  }

  .btn-primary {
    background-color: var(--text-color);
    color: var(--bg-color);
    border-color: var(--text-color);
  }

  .btn-primary:hover {
    opacity: 0.85;
    transform: translateY(-1px);
    box-shadow: var(--shadow-lg);
  }

  .btn-secondary {
    background-color: var(--bg-color);
    color: var(--text-color);
    border-color: var(--border-color-strong);
  }

  .btn-secondary:hover {
    border-color: var(--text-color);
    background-color: var(--bg-secondary);
  }

  /* Trust Section */
  .trust-section {
    text-align: center;
    padding: 1.5rem 2rem 2.5rem;
    max-width: 800px;
    margin: 0 auto;
  }

  .trust-label {
    font-size: 0.75rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: var(--muted-color);
    margin-bottom: 1rem;
  }

  .trust-logos {
    display: flex;
    gap: 2rem;
    justify-content: center;
    align-items: center;
    flex-wrap: wrap;
  }

  .trust-logo-img {
    height: 28px;
    object-fit: contain;
    opacity: 0.55;
    filter: grayscale(100%);
    transition: all 0.2s ease;
  }

  .trust-logo-img:hover {
    opacity: 0.9;
    filter: grayscale(0%);
  }

  @media (prefers-color-scheme: dark) {
    .trust-logo-img {
      filter: grayscale(100%) brightness(2);
      opacity: 0.5;
    }
    .trust-logo-img:hover {
      filter: grayscale(0%) brightness(1.2);
      opacity: 0.9;
    }
  }

  .trust-logo-text {
    font-size: 1.125rem;
    font-weight: 700;
    color: var(--border-color-strong);
    letter-spacing: 0.04em;
  }

  .trust-logo-icon {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
  }

  .trust-logo-icon svg {
    flex-shrink: 0;
  }

  .trust-logo-svg {
    filter: brightness(0);
    opacity: 0.45;
  }

  .trust-logo-svg:hover {
    filter: brightness(0);
    opacity: 0.8;
  }

  @media (prefers-color-scheme: dark) {
    .trust-logo-svg {
      filter: brightness(0) invert(1);
      opacity: 0.5;
    }
    .trust-logo-svg:hover {
      filter: brightness(0) invert(1);
      opacity: 0.9;
    }
  }

  /* Search Section */
  .search-section {
    max-width: 1400px;
    margin: 0 auto;
    padding: 0 2rem;
  }

  .search-bar-container {
    display: flex;
    gap: 0.75rem;
    margin-bottom: 0.75rem;
    align-items: center;
  }

  .search-input-wrapper {
    position: relative;
    flex: 1;
  }

  .search-icon {
    position: absolute;
    left: 1rem;
    top: 50%;
    transform: translateY(-50%);
    color: var(--muted-color);
    pointer-events: none;
  }

  .search-input {
    width: 100%;
    padding: 0.75rem 2.5rem 0.75rem 2.75rem;
    font-size: 0.9375rem;
    border: 1px solid var(--border-color);
    border-radius: 10px;
    background-color: var(--bg-color);
    color: var(--text-color);
    transition: all 0.15s ease;
    height: 44px;
    box-sizing: border-box;
  }

  .search-input:hover { border-color: var(--border-color-strong); }

  .search-input:focus {
    outline: none;
    border-color: var(--litellm-primary);
    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.08);
  }

  .search-input::placeholder { color: var(--muted-color); }

  .search-clear {
    position: absolute;
    right: 0.75rem;
    top: 50%;
    transform: translateY(-50%);
    background: none;
    border: none;
    color: var(--muted-color);
    cursor: pointer;
    padding: 0.25rem;
    border-radius: 4px;
    display: flex;
    align-items: center;
  }

  .search-clear:hover { color: var(--text-color); background: var(--bg-tertiary); }

  .search-shortcut {
    position: absolute;
    right: 0.75rem;
    top: 50%;
    transform: translateY(-50%);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 0.125rem 0.4375rem;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
    font-size: 0.6875rem;
    font-weight: 500;
    color: var(--muted-color);
    background: var(--bg-secondary);
    border: 1px solid var(--border-color);
    border-radius: 5px;
    pointer-events: none;
    line-height: 1.4;
  }

  /* Filters */
  .filters-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.75rem;
  }

  .filter-group {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .filter-group label {
    font-size: 0.75rem;
    font-weight: 600;
    color: var(--muted-color);
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  .filter-input {
    padding: 0.625rem 0.875rem;
    font-size: 0.9375rem;
    border: 1px solid var(--border-color);
    border-radius: 10px;
    background-color: var(--bg-color);
    color: var(--text-color);
    transition: all 0.15s ease;
    height: 40px;
    box-sizing: border-box;
  }

  .filter-input:hover { border-color: var(--border-color-strong); }

  .filter-input:focus {
    outline: none;
    border-color: var(--litellm-primary);
    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.08);
  }

  .filter-input::placeholder { color: var(--muted-color); }

  /* Results meta */
  .results-meta {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-top: 1rem;
    padding-bottom: 0.5rem;
  }

  .results-count {
    font-size: 0.8125rem;
    font-weight: 500;
    color: var(--muted-color);
  }

  .clear-filters {
    font-size: 0.8125rem;
    color: var(--litellm-primary);
    background: none;
    border: none;
    cursor: pointer;
    font-weight: 500;
  }

  .clear-filters:hover { text-decoration: underline; }

  /* Add Model Section */
  .add-model-section {
    max-width: 1400px;
    margin: 0.75rem auto;
    padding: 0.75rem 1.25rem;
    margin-left: 2rem;
    margin-right: 2rem;
    background: var(--bg-secondary);
    border: 1px solid var(--border-color);
    border-radius: 10px;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .add-model-section svg { color: var(--litellm-primary); flex-shrink: 0; }

  .add-model-section a {
    color: var(--litellm-primary);
    text-decoration: none;
    font-size: 0.875rem;
    font-weight: 500;
  }

  .add-model-section a:hover { text-decoration: underline; }

  /* Table */
  .table-container {
    margin: 1rem auto 4rem;
    max-width: 1400px;
    padding: 0 2rem;
    overflow-x: auto;
  }

  table {
    width: 100%;
    border-collapse: collapse;
    background: var(--card-bg);
    border-radius: 12px;
    border: 1px solid var(--border-color);
    overflow: hidden;
  }

  thead {
    background-color: var(--bg-secondary);
    border-bottom: 1px solid var(--border-color);
  }

  th {
    padding: 0.625rem 1rem;
    text-align: left;
    font-weight: 600;
    font-size: 0.6875rem;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--muted-color);
    background-color: var(--bg-secondary);
    white-space: nowrap;
    user-select: none;
    position: sticky;
    top: 63px;
    z-index: 10;
  }

  .th-model { padding-left: 1rem; }

  .th-sortable {
    cursor: pointer;
    transition: color 0.15s;
  }

  .th-sortable:hover { color: var(--text-color); }

  .sort-icon {
    display: inline-block;
    margin-left: 0.25rem;
    opacity: 0;
    transition: all 0.15s;
    font-size: 0.625rem;
  }

  .th-sortable:hover .sort-icon { opacity: 0.3; }
  .sort-icon.active { opacity: 1; color: var(--litellm-primary); }
  .sort-icon.desc { transform: rotate(180deg); }

  tbody tr.model-row {
    border-bottom: 1px solid var(--border-color);
    transition: background-color 0.1s ease;
    cursor: pointer;
  }

  tbody tr.model-row:hover {
    background-color: var(--hover-bg);
    box-shadow: inset 3px 0 0 var(--litellm-primary);
  }
  tbody tr.model-row.expanded { background-color: var(--bg-secondary); }
  tbody tr.model-row:last-child { border-bottom: none; }

  tbody tr.expanded-content { border-bottom: 1px solid var(--border-color); }
  tbody tr.expanded-content td { padding: 0; }

  td {
    padding: 0.625rem 1rem;
    vertical-align: middle;
    font-size: 0.875rem;
    color: var(--text-color);
  }

  .model-name {
    font-weight: 500;
    min-width: 280px;
  }

  .model-info {
    display: flex;
    align-items: center;
    gap: 0.625rem;
  }

  .expand-icon {
    color: var(--muted-color);
    transition: transform 0.2s ease;
    flex-shrink: 0;
  }

  .expand-icon.expanded { transform: rotate(90deg); }

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
    transition: all 0.1s ease;
    opacity: 0;
    margin-left: 0.25rem;
    flex-shrink: 0;
  }

  .model-row:hover .copy-button { opacity: 1; }
  .copy-button:hover { background-color: var(--bg-tertiary); color: var(--text-secondary); }

  .provider-avatar {
    width: 28px;
    height: 28px;
    border-radius: 6px;
    background-color: #ffffff;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 600;
    font-size: 0.625rem;
    flex-shrink: 0;
    overflow: hidden;
    position: relative;
    padding: 3px;
    border: 1px solid var(--border-color);
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
    font-size: 0.625rem;
    border-radius: 4px;
    margin: -3px;
  }

  .model-name-group {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    min-width: 0;
  }

  .model-title {
    font-family: 'JetBrains Mono', 'Menlo', monospace;
    font-size: 0.8125rem;
    font-weight: 500;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .mode-badge {
    font-size: 0.625rem;
    font-weight: 600;
    padding: 0.125rem 0.375rem;
    background: var(--bg-tertiary);
    color: var(--muted-color);
    border-radius: 4px;
    white-space: nowrap;
    text-transform: uppercase;
    letter-spacing: 0.03em;
    flex-shrink: 0;
  }

  .context-cell {
    font-weight: 600;
    font-variant-numeric: tabular-nums;
    font-size: 0.8125rem;
  }

  .cost-cell {
    color: var(--text-secondary);
    font-variant-numeric: tabular-nums;
    font-size: 0.8125rem;
  }

  /* Detail Panel */
  .detail-panel {
    padding: 1.5rem;
    background: var(--bg-secondary);
    border-top: 1px solid var(--border-color);
  }

  .detail-grid {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    gap: 1.5rem;
    margin-bottom: 1.5rem;
  }

  .detail-section { }

  .detail-heading {
    font-size: 0.6875rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--muted-color);
    margin: 0 0 0.75rem 0;
  }

  .detail-unit {
    font-weight: 500;
    text-transform: none;
    letter-spacing: 0;
  }

  .pricing-cards {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.5rem;
  }

  .pricing-card {
    background: var(--card-bg);
    border: 1px solid var(--border-color);
    border-radius: 8px;
    padding: 0.625rem 0.75rem;
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .pricing-label {
    font-size: 0.6875rem;
    font-weight: 500;
    color: var(--muted-color);
    text-transform: uppercase;
    letter-spacing: 0.03em;
  }

  .pricing-value {
    font-size: 0.9375rem;
    font-weight: 700;
    color: var(--text-color);
    font-variant-numeric: tabular-nums;
  }

  .info-rows {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .info-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.375rem 0;
    border-bottom: 1px solid var(--border-color);
  }

  .info-row:last-child { border-bottom: none; }

  .info-label {
    font-size: 0.8125rem;
    color: var(--muted-color);
  }

  .info-value {
    font-size: 0.8125rem;
    font-weight: 600;
    color: var(--text-color);
    font-family: 'JetBrains Mono', monospace;
  }

  .feature-list {
    display: flex;
    flex-direction: column;
    gap: 0.375rem;
  }

  .feature-item {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.8125rem;
    color: var(--muted-color);
  }

  .feature-item.supported { color: var(--text-color); }

  /* Code snippet */
  .detail-code-section {
    background: var(--code-bg);
    border: 1px solid var(--border-color);
    border-radius: 8px;
    overflow: hidden;
    margin-bottom: 1rem;
  }

  .code-header-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.625rem 1rem;
    border-bottom: 1px solid var(--border-color);
    background: var(--bg-secondary);
  }

  .code-header-row .detail-heading { margin: 0; }

  .code-tabs {
    display: flex;
    gap: 0;
  }

  .code-tab {
    padding: 0.375rem 0.875rem;
    font-size: 0.75rem;
    font-weight: 600;
    border: 1px solid var(--border-color);
    background: var(--bg-secondary);
    color: var(--muted-color);
    cursor: pointer;
    transition: all 0.15s;
  }

  .code-tab:first-child {
    border-radius: 6px 0 0 6px;
  }

  .code-tab:last-child {
    border-radius: 0 6px 6px 0;
    border-left: none;
  }

  .code-tab.active {
    background: var(--litellm-primary);
    border-color: var(--litellm-primary);
    color: white;
  }

  .code-tab:hover:not(.active) {
    background: var(--hover-bg);
    color: var(--text-color);
  }

  .code-comment {
    color: var(--muted-color);
    font-style: italic;
  }

  .copy-code-btn {
    font-size: 0.75rem;
    font-weight: 600;
    padding: 0.25rem 0.625rem;
    background: var(--litellm-primary);
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
  }

  .copy-code-btn:hover { opacity: 0.85; }

  .code-snippet {
    margin: 0;
    padding: 1rem;
    font-family: 'JetBrains Mono', 'Menlo', monospace;
    font-size: 0.8125rem;
    line-height: 1.6;
    overflow-x: auto;
    background: var(--code-bg);
    color: var(--code-text);
  }

  .code-snippet code { display: block; }
  .code-kw { color: #8b5cf6; }
  .code-str { color: #10b981; }

  @media (prefers-color-scheme: dark) {
    .code-kw { color: #a78bfa; }
    .code-str { color: #34d399; }
  }

  .detail-actions {
    display: flex;
    gap: 1rem;
  }

  .detail-action-link {
    display: flex;
    align-items: center;
    gap: 0.375rem;
    font-size: 0.8125rem;
    font-weight: 500;
    color: var(--muted-color);
    text-decoration: none;
    transition: color 0.15s;
  }

  .detail-action-link:hover { color: var(--litellm-primary); }

  /* Skeleton */
  .skeleton-table {
    display: flex;
    flex-direction: column;
    gap: 1px;
    background: var(--border-color);
    border: 1px solid var(--border-color);
    border-radius: 12px;
    overflow: hidden;
  }

  .skeleton-row {
    display: flex;
    gap: 1rem;
    padding: 1rem;
    background: var(--card-bg);
    animation: shimmer 1.5s ease-in-out infinite;
  }

  .skeleton-cell {
    height: 1rem;
    background: var(--bg-tertiary);
    border-radius: 4px;
    flex: 1;
  }

  .skeleton-cell.wide { flex: 3; }

  @keyframes shimmer {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
  }

  /* Responsive */
  .th-hide-mobile, .td-hide-mobile { }

  @media (max-width: 900px) {
    .th-hide-mobile, .td-hide-mobile { display: none; }
  }

  @media (max-width: 768px) {
    .hero { padding: 2.5rem 1rem 1.5rem; }
    .hero-title { font-size: 2rem; }
    .hero-subtitle { font-size: 1rem; }
    .cta-buttons { flex-direction: column; width: 100%; max-width: 320px; margin: 0 auto; }
    .btn { width: 100%; }
    .search-section { padding: 0 1rem; }
    .search-bar-container { flex-direction: column; }
    .filters-row { grid-template-columns: 1fr; }
    .table-container { padding: 0 1rem; }
    th, td { padding: 0.5rem 0.625rem; font-size: 0.8125rem; }
    .model-name { min-width: 180px; }
    .trust-logos { gap: 1.25rem; }
    .trust-logo-img { height: 22px; }
    .detail-grid { grid-template-columns: 1fr; }
  }
</style>
