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
        // Fallback to local file
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
  <!-- Hero Section -->
  <div class="hero">
    <h1 class="hero-title">Custom Code Guardrails</h1>
    <p class="hero-subtitle">
      Community-contributed guardrails for LiteLLM. Copy, customize, and deploy to protect your LLM applications.
    </p>
    <div class="cta-buttons">
      <a
        href="https://docs.litellm.ai/docs/proxy/guardrails/custom_code_guardrail"
        target="_blank"
        rel="noopener noreferrer"
        class="btn btn-primary"
      >
        Documentation
      </a>
      <a
        href="https://github.com/BerriAI/litellm/blob/main/guardrails_registry.json"
        target="_blank"
        rel="noopener noreferrer"
        class="btn btn-secondary"
      >
        Contribute a Guardrail
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
          bind:value={query}
          type="text"
          autocomplete="off"
          placeholder="Search guardrails..."
          class="search-input"
        />
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
    <div class="loading">Loading guardrails...</div>
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
            <span
              class="input-type-badge"
              class:request={item.input_type === "request"}
              class:response={item.input_type === "response"}
              class:both={item.input_type === "both"}
            >
              {getInputTypeLabel(item.input_type)}
            </span>
          </div>

          {#if expandedRows.has(item.id)}
            <div class="card-expanded" transition:fly={{ y: -10, duration: 200 }}>
              <div class="code-header">
                <span class="code-label">Code</span>
                <button
                  class="copy-btn"
                  on:click|stopPropagation={() => copyToClipboard(item.code, item.id)}
                >
                  {copiedId === item.id ? "✓ Copied!" : "Copy Code"}
                </button>
              </div>
              <pre class="code-block"><code>{item.code}</code></pre>

              <div class="usage-section">
                <span class="usage-label">Usage in config.yaml:</span>
                <pre class="usage-code"><code>litellm_settings:
  guardrails:
    - guardrail_name: "{item.id}"
      litellm_params:
        guardrail: custom_code.{item.id}
        mode: "{item.input_type === 'response' ? 'post_call' : 'pre_call'}"</code></pre>
              </div>

              <div class="card-footer">
                <span class="author">By {item.author}</span>
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
  .guardrails-container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 0 2rem 4rem;
  }

  .hero {
    text-align: center;
    padding: 2rem 0 3rem;
  }

  .hero-title {
    font-size: 2.5rem;
    font-weight: 700;
    margin: 0 0 0.75rem 0;
    color: var(--text-color);
  }

  .hero-subtitle {
    font-size: 1.125rem;
    color: var(--muted-color);
    margin: 0 0 1.5rem 0;
    max-width: 600px;
    margin-left: auto;
    margin-right: auto;
  }

  .cta-buttons {
    display: flex;
    gap: 1rem;
    justify-content: center;
    flex-wrap: wrap;
  }

  .btn {
    display: inline-flex;
    align-items: center;
    padding: 0.625rem 1.25rem;
    font-size: 0.875rem;
    font-weight: 500;
    border-radius: 8px;
    text-decoration: none;
    transition: all 0.2s ease;
    border: 1px solid transparent;
  }

  .btn-primary {
    background-color: var(--litellm-primary, #6366f1);
    color: white;
  }

  .btn-primary:hover {
    background-color: #5558e3;
  }

  .btn-secondary {
    background-color: transparent;
    color: var(--text-color);
    border-color: var(--border-color);
  }

  .btn-secondary:hover {
    border-color: var(--litellm-primary, #6366f1);
    color: var(--litellm-primary, #6366f1);
  }

  .search-section {
    margin-bottom: 2rem;
  }

  .search-bar-container {
    display: flex;
    gap: 1rem;
    margin-bottom: 0.75rem;
    flex-wrap: wrap;
  }

  .search-input-wrapper {
    position: relative;
    flex: 1;
    min-width: 200px;
  }

  .search-icon {
    position: absolute;
    left: 1rem;
    top: 50%;
    transform: translateY(-50%);
    color: var(--muted-color);
  }

  .search-input {
    width: 100%;
    padding: 0.75rem 1rem 0.75rem 3rem;
    font-size: 0.9375rem;
    border: 1px solid var(--border-color);
    border-radius: 8px;
    background-color: var(--bg-color);
    color: var(--text-color);
    transition: border-color 0.2s;
  }

  .search-input:focus {
    outline: none;
    border-color: var(--litellm-primary, #6366f1);
  }

  .filter-select {
    padding: 0.75rem 1rem;
    font-size: 0.9375rem;
    border: 1px solid var(--border-color);
    border-radius: 8px;
    background-color: var(--bg-color);
    color: var(--text-color);
    min-width: 150px;
  }

  .results-count {
    font-size: 0.875rem;
    color: var(--muted-color);
  }

  .cards-container {
    display: grid;
    gap: 1rem;
  }

  .guardrail-card {
    background: var(--card-bg);
    border: 1px solid var(--border-color);
    border-radius: 12px;
    padding: 1.25rem;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .guardrail-card:hover {
    border-color: var(--litellm-primary, #6366f1);
  }

  .guardrail-card.expanded {
    border-color: var(--litellm-primary, #6366f1);
  }

  .card-header {
    margin-bottom: 1rem;
  }

  .card-title-row {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 0.5rem;
    flex-wrap: wrap;
  }

  .category-icon {
    font-size: 1.25rem;
  }

  .card-title {
    font-size: 1.125rem;
    font-weight: 600;
    margin: 0;
    color: var(--text-color);
  }

  .version-badge {
    font-size: 0.75rem;
    padding: 0.125rem 0.5rem;
    background: var(--bg-tertiary);
    border-radius: 4px;
    color: var(--muted-color);
  }

  .card-description {
    font-size: 0.9375rem;
    color: var(--muted-color);
    margin: 0;
    line-height: 1.5;
  }

  .card-meta {
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  .tags {
    display: flex;
    gap: 0.375rem;
    flex-wrap: wrap;
  }

  .tag {
    font-size: 0.75rem;
    padding: 0.25rem 0.5rem;
    background: var(--bg-tertiary);
    border-radius: 4px;
    color: var(--muted-color);
  }

  .tag-more {
    background: var(--litellm-primary, #6366f1);
    color: white;
  }

  .input-type-badge {
    font-size: 0.75rem;
    padding: 0.25rem 0.625rem;
    border-radius: 4px;
    font-weight: 500;
  }

  .input-type-badge.request {
    background: #dbeafe;
    color: #1e40af;
  }

  .input-type-badge.response {
    background: #dcfce7;
    color: #166534;
  }

  .input-type-badge.both {
    background: #f3e8ff;
    color: #7c3aed;
  }

  .card-expanded {
    margin-top: 1rem;
    padding-top: 1rem;
    border-top: 1px solid var(--border-color);
  }

  .code-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.5rem;
  }

  .code-label,
  .usage-label {
    font-size: 0.75rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--muted-color);
  }

  .copy-btn {
    font-size: 0.8125rem;
    padding: 0.375rem 0.75rem;
    background: var(--litellm-primary, #6366f1);
    color: white;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    transition: background 0.2s;
  }

  .copy-btn:hover {
    background: #5558e3;
  }

  .code-block,
  .usage-code {
    background: var(--code-bg);
    border-radius: 8px;
    padding: 1rem;
    overflow-x: auto;
    font-family: "Menlo", "Monaco", monospace;
    font-size: 0.8125rem;
    line-height: 1.6;
    margin: 0;
  }

  .code-block code,
  .usage-code code {
    color: var(--code-text);
  }

  .usage-section {
    margin-top: 1rem;
  }

  .usage-label {
    display: block;
    margin-bottom: 0.5rem;
  }

  .card-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: 1rem;
    padding-top: 1rem;
    border-top: 1px solid var(--border-color);
  }

  .author {
    font-size: 0.8125rem;
    color: var(--muted-color);
  }

  .loading,
  .error,
  .no-results {
    text-align: center;
    padding: 4rem 2rem;
    color: var(--muted-color);
  }

  .error a {
    color: var(--litellm-primary, #6366f1);
  }

  @media (max-width: 768px) {
    .guardrails-container {
      padding: 0 1rem 2rem;
    }

    .hero-title {
      font-size: 1.75rem;
    }

    .search-bar-container {
      flex-direction: column;
    }

    .filter-select {
      width: 100%;
    }
  }
</style>
