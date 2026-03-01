<script lang="ts">
  import { onMount } from "svelte";
  import { fly } from "svelte/transition";
  import Fuse from "fuse.js";

  type Guardrail = {
    id: string;
    name: string;
    description: string;
    category: string;
    tags: string[];
    author: string;
    version: string;
    input_type: string;
    code: string;
  };

  type ResultItem = {
    refIndex: number;
    item: Guardrail;
  };

  const GUARDRAILS_URL = "https://raw.githubusercontent.com/BerriAI/litellm-guardrails/main/guardrails.json";

  let categories: string[] = [];
  let selectedCategory: string = "";
  let inputTypes = ["request", "response", "both"];
  let selectedInputType: string = "";
  let query = "";
  let index: Fuse<Guardrail>;
  let allItems: Guardrail[] = [];
  let results: ResultItem[] = [];
  let loading = true;
  let loadError = false;
  let expandedRows = new Set<string>();
  let copiedId = "";

  onMount(() => {
    const urlParams = new URLSearchParams(window.location.search);
    query = urlParams.get("q") ?? "";

    fetch(GUARDRAILS_URL)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch");
        return res.json();
      })
      .then((data) => {
        const items: Guardrail[] = Object.entries(data).map(
          ([id, v]: any) => ({ id, ...v })
        );
        initializeData(items);
      })
      .catch(() => {
        fetch("/guardrails.json")
          .then((res) => res.json())
          .then((data) => {
            const items: Guardrail[] = Object.entries(data).map(
              ([id, v]: any) => ({ id, ...v })
            );
            initializeData(items);
          })
          .catch(() => {
            loadError = true;
            loading = false;
          });
      });
  });

  function initializeData(items: Guardrail[]) {
    categories = [...new Set(items.map((i) => i.category))].sort();
    index = new Fuse(items, {
      threshold: 0.3,
      keys: [
        { name: "name", weight: 2 },
        { name: "description", weight: 1.5 },
        { name: "tags", weight: 1 },
        "category",
      ],
    });
    results = items.map((item, refIndex) => ({ item, refIndex }));
    allItems = items;
    loading = false;
  }

  function getCategoryIcon(category: string): string {
    const icons: { [key: string]: string } = {
      security: "🔒",
      validation: "✅",
      moderation: "🛡️",
      "rate-limiting": "⏱️",
      content: "📝",
      formatting: "✨",
    };
    return icons[category] || "📦";
  }

  function formatCategory(category: string): string {
    return category
      .split("-")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  }

  function getInputTypeLabel(type: string): string {
    const labels: { [key: string]: string } = {
      request: "Pre-call",
      response: "Post-call",
      both: "Both",
    };
    return labels[type] || type;
  }

  function copyToClipboard(text: string, id: string) {
    navigator.clipboard.writeText(text);
    copiedId = id;
    setTimeout(() => (copiedId = ""), 2000);
  }

  function toggleRow(id: string) {
    if (expandedRows.has(id)) {
      expandedRows.delete(id);
    } else {
      expandedRows.add(id);
    }
    expandedRows = expandedRows;
  }

  function filterResults() {
    if (!index || !allItems) return;

    let filtered = allItems;

    if (selectedCategory) {
      filtered = filtered.filter((item) => item.category === selectedCategory);
    }

    if (selectedInputType) {
      filtered = filtered.filter(
        (item) =>
          item.input_type === selectedInputType || item.input_type === "both"
      );
    }

    if (query) {
      const searchIndex = new Fuse(filtered, {
        threshold: 0.3,
        keys: [
          { name: "name", weight: 2 },
          { name: "description", weight: 1.5 },
          { name: "tags", weight: 1 },
          "category",
        ],
      });
      filtered = searchIndex.search(query).map((r) => r.item);
    }

    results = filtered.map((item, refIndex) => ({ item, refIndex }));
  }

  $: query, selectedCategory, selectedInputType, filterResults();
</script>

<div class="guardrails-container">
  <div class="hero">
    <div class="hero-badge">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
      Community-contributed
    </div>
    <h1 class="hero-title">Custom Code Guardrails</h1>
    <p class="hero-subtitle">
      Copy, customize, and deploy guardrails to protect your LLM applications.
    </p>
    <div class="cta-buttons">
      <a href="https://docs.litellm.ai/docs/proxy/guardrails/custom_code_guardrail" target="_blank" rel="noopener noreferrer" class="btn btn-primary">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path></svg>
        Documentation
      </a>
      <a href="https://github.com/BerriAI/litellm-guardrails" target="_blank" rel="noopener noreferrer" class="btn btn-secondary">
        <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/></svg>
        Contribute
      </a>
    </div>
  </div>

  <div class="search-section">
    <div class="search-bar-container">
      <div class="search-input-wrapper">
        <svg class="search-icon" width="18" height="18" viewBox="0 0 20 20" fill="none">
          <circle cx="8.5" cy="8.5" r="5.75" stroke="currentColor" stroke-width="1.5"/>
          <path d="M12.5 12.5L16.5 16.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
        </svg>
        <input bind:value={query} type="text" autocomplete="off" placeholder="Search guardrails..." class="search-input" />
      </div>

      <select bind:value={selectedCategory} class="filter-select">
        <option value="">All Categories</option>
        {#each categories as category}
          <option value={category}>{getCategoryIcon(category)} {formatCategory(category)}</option>
        {/each}
      </select>

      <select bind:value={selectedInputType} class="filter-select">
        <option value="">All Types</option>
        {#each inputTypes as type}
          <option value={type}>{getInputTypeLabel(type)}</option>
        {/each}
      </select>
    </div>

    <div class="results-count">
      {results.length} guardrail{results.length !== 1 ? "s" : ""} found
    </div>
  </div>

  {#if loading}
    <div class="loading">
      <div class="loading-spinner"></div>
      <span>Loading guardrails...</span>
    </div>
  {:else if loadError}
    <div class="error">
      <p>Failed to load guardrails registry.</p>
      <p>Check back soon or <a href="https://docs.litellm.ai/docs/proxy/guardrails/custom_code_guardrail">view the docs</a>.</p>
    </div>
  {:else}
    <div class="cards-container">
      {#each results as { item } (item.id)}
        <div
          class="guardrail-card"
          class:expanded={expandedRows.has(item.id)}
          on:click={() => toggleRow(item.id)}
          on:keypress={(e) => e.key === "Enter" && toggleRow(item.id)}
          role="button"
          tabindex="0"
        >
          <div class="card-header">
            <div class="card-title-row">
              <span class="category-icon">{getCategoryIcon(item.category)}</span>
              <h3 class="card-title">{item.name}</h3>
              <span class="version-badge">v{item.version}</span>
            </div>
            <p class="card-description">{item.description}</p>
          </div>

          <div class="card-meta">
            <div class="tags">
              {#each item.tags.slice(0, 4) as tag}
                <span class="tag">{tag}</span>
              {/each}
              {#if item.tags.length > 4}
                <span class="tag tag-more">+{item.tags.length - 4}</span>
              {/if}
            </div>
            <div class="meta-right">
              <span class="input-type-badge" class:request={item.input_type === "request"} class:response={item.input_type === "response"} class:both={item.input_type === "both"}>
                {getInputTypeLabel(item.input_type)}
              </span>
              <svg class="chevron" class:rotated={expandedRows.has(item.id)} width="14" height="14" viewBox="0 0 16 16" fill="none">
                <path d="M6 4L10 8L6 12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </div>
          </div>

          {#if expandedRows.has(item.id)}
            <div class="card-expanded" transition:fly={{ y: -10, duration: 200 }}>
              <div class="code-header">
                <span class="code-label">Implementation</span>
                <button class="copy-btn" on:click|stopPropagation={() => copyToClipboard(item.code, item.id)}>
                  {copiedId === item.id ? "✓ Copied!" : "Copy Code"}
                </button>
              </div>
              <pre class="code-block"><code>{item.code}</code></pre>

              <div class="usage-section">
                <span class="usage-label">Usage in config.yaml</span>
                <pre class="usage-code"><code>guardrails:
  - guardrail_name: "{item.id}"
    litellm_params:
      guardrail: custom_code
      mode: "{item.input_type === 'response' ? 'post_call' : 'pre_call'}"
      custom_code: |
        def apply_guardrail(inputs, request_data, input_type):
          ... # paste code from above</code></pre>
              </div>

              <div class="card-footer">
                <span class="author">By {item.author}</span>
                <span class="category-label">{formatCategory(item.category)}</span>
              </div>
            </div>
          {/if}
        </div>
      {/each}
    </div>

    {#if results.length === 0}
      <div class="no-results">
        <p>No guardrails found matching your search.</p>
      </div>
    {/if}
  {/if}
</div>

<style>
  .guardrails-container { max-width: 1000px; margin: 0 auto; padding: 0 2rem 4rem; }

  .hero { text-align: center; padding: 2rem 0 2.5rem; }

  .hero-badge {
    display: inline-flex; align-items: center; gap: 0.5rem;
    padding: 0.375rem 1rem; background: var(--bg-secondary);
    border: 1px solid var(--border-color); border-radius: 100px;
    font-size: 0.8125rem; font-weight: 500; color: var(--muted-color);
    margin-bottom: 1.25rem;
  }

  .hero-badge svg { color: var(--litellm-primary); }

  .hero-title {
    font-size: 2.25rem; font-weight: 800; margin: 0 0 0.5rem 0;
    color: var(--text-color); letter-spacing: -0.03em;
  }

  .hero-subtitle {
    font-size: 1.0625rem; color: var(--muted-color);
    margin: 0 0 1.5rem 0; max-width: 500px; margin-left: auto; margin-right: auto;
  }

  .cta-buttons { display: flex; gap: 0.75rem; justify-content: center; flex-wrap: wrap; }

  .btn {
    display: inline-flex; align-items: center; gap: 0.375rem;
    padding: 0.625rem 1.25rem; font-size: 0.875rem; font-weight: 600;
    border-radius: 8px; text-decoration: none; transition: all 0.15s;
    border: 1px solid transparent;
  }

  .btn-primary { background: var(--litellm-primary); color: white; }
  .btn-primary:hover { background: var(--litellm-dark); }

  .btn-secondary { background: transparent; color: var(--text-color); border-color: var(--border-color); }
  .btn-secondary:hover { border-color: var(--text-color); }

  .search-section { margin-bottom: 1.5rem; }

  .search-bar-container { display: flex; gap: 0.75rem; margin-bottom: 0.5rem; flex-wrap: wrap; }

  .search-input-wrapper { position: relative; flex: 1; min-width: 200px; }

  .search-icon {
    position: absolute; left: 1rem; top: 50%; transform: translateY(-50%);
    color: var(--muted-color);
  }

  .search-input {
    width: 100%; padding: 0.625rem 1rem 0.625rem 2.75rem; font-size: 0.9375rem;
    border: 1px solid var(--border-color); border-radius: 10px;
    background-color: var(--bg-color); color: var(--text-color);
    transition: border-color 0.15s; height: 40px; box-sizing: border-box;
  }

  .search-input:focus { outline: none; border-color: var(--litellm-primary); box-shadow: 0 0 0 3px rgba(99,102,241,0.08); }

  .filter-select {
    padding: 0.625rem 1rem; font-size: 0.875rem;
    border: 1px solid var(--border-color); border-radius: 10px;
    background-color: var(--bg-color); color: var(--text-color);
    min-width: 140px; height: 40px; cursor: pointer;
  }

  .filter-select:focus { outline: none; border-color: var(--litellm-primary); }

  .results-count { font-size: 0.8125rem; color: var(--muted-color); font-weight: 500; }

  .cards-container { display: grid; gap: 0.75rem; }

  .guardrail-card {
    background: var(--card-bg); border: 1px solid var(--border-color);
    border-radius: 10px; padding: 1.25rem; cursor: pointer;
    transition: all 0.15s ease;
  }

  .guardrail-card:hover { border-color: var(--border-color-strong); }
  .guardrail-card.expanded { border-color: var(--litellm-primary); }

  .card-header { margin-bottom: 0.75rem; }

  .card-title-row { display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.375rem; flex-wrap: wrap; }

  .category-icon { font-size: 1.125rem; }

  .card-title { font-size: 1rem; font-weight: 700; margin: 0; color: var(--text-color); }

  .version-badge {
    font-size: 0.6875rem; padding: 0.125rem 0.5rem; background: var(--bg-tertiary);
    border-radius: 4px; color: var(--muted-color); font-weight: 600;
  }

  .card-description { font-size: 0.8125rem; color: var(--muted-color); margin: 0; line-height: 1.5; }

  .card-meta { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.5rem; }

  .meta-right { display: flex; align-items: center; gap: 0.5rem; }

  .chevron { color: var(--muted-color); transition: transform 0.2s; flex-shrink: 0; }
  .chevron.rotated { transform: rotate(90deg); }

  .tags { display: flex; gap: 0.375rem; flex-wrap: wrap; }

  .tag {
    font-size: 0.6875rem; padding: 0.125rem 0.5rem; background: var(--bg-tertiary);
    border-radius: 4px; color: var(--muted-color); font-weight: 500;
  }

  .tag-more { background: var(--litellm-primary); color: white; }

  .input-type-badge {
    font-size: 0.6875rem; padding: 0.25rem 0.625rem;
    border-radius: 4px; font-weight: 600;
  }

  .input-type-badge.request { background: #dbeafe; color: #1e40af; }
  .input-type-badge.response { background: #dcfce7; color: #166534; }
  .input-type-badge.both { background: #f3e8ff; color: #7c3aed; }

  .card-expanded { margin-top: 1rem; padding-top: 1rem; border-top: 1px solid var(--border-color); }

  .code-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem; }

  .code-label, .usage-label {
    font-size: 0.6875rem; font-weight: 700; text-transform: uppercase;
    letter-spacing: 0.06em; color: var(--muted-color);
  }

  .copy-btn {
    font-size: 0.75rem; padding: 0.25rem 0.625rem; background: var(--litellm-primary);
    color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: 600;
  }

  .copy-btn:hover { opacity: 0.85; }

  .code-block, .usage-code {
    background: var(--code-bg); border: 1px solid var(--border-color);
    border-radius: 8px; padding: 1rem; overflow-x: auto;
    font-family: 'JetBrains Mono', 'Menlo', monospace; font-size: 0.75rem;
    line-height: 1.6; margin: 0; text-align: left; white-space: pre;
  }

  .code-block code, .usage-code code { color: var(--code-text); display: block; }

  .usage-section { margin-top: 1rem; }
  .usage-label { display: block; margin-bottom: 0.5rem; }

  .card-footer {
    display: flex; justify-content: space-between; align-items: center;
    margin-top: 1rem; padding-top: 0.75rem; border-top: 1px solid var(--border-color);
  }

  .author { font-size: 0.75rem; color: var(--muted-color); }
  .category-label { font-size: 0.75rem; color: var(--muted-color); font-weight: 500; }

  .loading, .error, .no-results { text-align: center; padding: 4rem 2rem; color: var(--muted-color); display: flex; flex-direction: column; align-items: center; gap: 1rem; }

  .loading-spinner {
    width: 32px; height: 32px; border: 3px solid var(--border-color);
    border-top-color: var(--litellm-primary); border-radius: 50%;
    animation: spin 0.7s linear infinite;
  }

  @keyframes spin { to { transform: rotate(360deg); } }

  .error a { color: var(--litellm-primary); }

  @media (max-width: 768px) {
    .guardrails-container { padding: 0 1rem 2rem; }
    .hero-title { font-size: 1.75rem; }
    .search-bar-container { flex-direction: column; }
    .filter-select { width: 100%; }
  }
</style>
