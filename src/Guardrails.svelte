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

  const GUARDRAILS_URL = "https://raw.githubusercontent.com/BerriAI/litellm-guardrails/main/guardrails.json";

  let categories: string[] = [];
  let selectedCategory: string = "";
  let selectedInputType: string = "";
  let query = "";
  let index: Fuse<Guardrail>;
  let allItems: Guardrail[] = [];
  let results: Guardrail[] = [];
  let loading = true;
  let loadError = false;
  let expandedId: string | null = null;
  let copiedId = "";
  let sortColumn: string = "";
  let sortDirection: "asc" | "desc" = "asc";

  onMount(() => {
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
    allItems = items;
    results = items;
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

  function copyToClipboard(text: string, id: string) {
    navigator.clipboard.writeText(text);
    copiedId = id;
    setTimeout(() => (copiedId = ""), 2000);
  }

  function toggleExpand(id: string) {
    expandedId = expandedId === id ? null : id;
  }

  function sortBy(column: string) {
    if (sortColumn === column) {
      sortDirection = sortDirection === "asc" ? "desc" : "asc";
    } else {
      sortColumn = column;
      sortDirection = "asc";
    }
    filterResults();
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
      const searchResults = index.search(query);
      const searchIds = new Set(searchResults.map((r) => r.item.id));
      filtered = filtered.filter((item) => searchIds.has(item.id));
    }

    // Sort
    if (sortColumn) {
      filtered = [...filtered].sort((a: any, b: any) => {
        const aVal = a[sortColumn] || "";
        const bVal = b[sortColumn] || "";
        const cmp = aVal.localeCompare(bVal);
        return sortDirection === "asc" ? cmp : -cmp;
      });
    }

    results = filtered;
  }

  $: query, selectedCategory, selectedInputType, filterResults();
</script>

<div class="page-wrapper">
  
  <div class="guardrails-container">
  <!-- Header -->
  <div class="header-section">
    <h1 class="title">Custom Code Guardrails</h1>
    <p class="subtitle">
      {allItems.length} guardrails across {categories.length} categories
    </p>
    <div class="header-links">
      <a
        href="https://docs.litellm.ai/docs/proxy/guardrails/custom_code_guardrail"
        target="_blank"
        rel="noopener noreferrer"
        class="header-link"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M8 14A6 6 0 1 0 8 2a6 6 0 0 0 0 12z"/>
          <path d="M8 5v3M8 10h.01"/>
        </svg>
        Documentation
      </a>
      <a
        href="https://github.com/BerriAI/litellm-guardrails"
        target="_blank"
        rel="noopener noreferrer"
        class="header-link"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
          <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/>
        </svg>
        Contribute
      </a>
    </div>
  </div>

  <!-- Filters -->
  <div class="filters-section">
    <div class="search-wrapper">
      <svg class="search-icon" width="18" height="18" viewBox="0 0 20 20" fill="none">
        <circle cx="8.5" cy="8.5" r="5.75" stroke="currentColor" stroke-width="1.5"/>
        <path d="M12.5 12.5L16.5 16.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
      </svg>
      <input
        bind:value={query}
        type="text"
        placeholder="Search guardrails..."
        class="search-input"
      />
    </div>

    <select bind:value={selectedCategory} class="filter-select">
      <option value="">All Categories</option>
      {#each categories as cat}
        <option value={cat}>{getCategoryIcon(cat)} {formatCategory(cat)}</option>
      {/each}
    </select>

    <select bind:value={selectedInputType} class="filter-select">
      <option value="">All Types</option>
      <option value="request">Pre-call</option>
      <option value="response">Post-call</option>
      <option value="both">Both</option>
    </select>

    <span class="results-count">{results.length}</span>
  </div>

  {#if loading}
    <div class="loading">Loading guardrails...</div>
  {:else if loadError}
    <div class="error">Failed to load guardrails.</div>
  {:else}
    <!-- Table -->
    <div class="table-wrapper">
      <table>
        <thead>
          <tr>
            <th class="sortable" on:click={() => sortBy("category")}>
              Category
              {#if sortColumn === "category"}
                <span class="sort-icon">{sortDirection === "asc" ? "↑" : "↓"}</span>
              {/if}
            </th>
            <th class="sortable" on:click={() => sortBy("name")}>
              Name
              {#if sortColumn === "name"}
                <span class="sort-icon">{sortDirection === "asc" ? "↑" : "↓"}</span>
              {/if}
            </th>
            <th>Description</th>
            <th class="sortable" on:click={() => sortBy("input_type")}>
              Type
              {#if sortColumn === "input_type"}
                <span class="sort-icon">{sortDirection === "asc" ? "↑" : "↓"}</span>
              {/if}
            </th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {#each results as item (item.id)}
            <tr 
              class="data-row" 
              class:expanded={expandedId === item.id}
              on:click={() => toggleExpand(item.id)}
            >
              <td class="category-cell">
                <span class="category-badge">
                  <span class="cat-icon">{getCategoryIcon(item.category)}</span>
                  {formatCategory(item.category)}
                </span>
              </td>
              <td class="name-cell">
                <span class="name">{item.name}</span>
                <span class="version">v{item.version}</span>
              </td>
              <td class="desc-cell">{item.description}</td>
              <td class="type-cell">
                <span 
                  class="type-badge"
                  class:pre={item.input_type === "request"}
                  class:post={item.input_type === "response"}
                  class:both={item.input_type === "both"}
                >
                  {item.input_type === "request" ? "Pre-call" : item.input_type === "response" ? "Post-call" : "Both"}
                </span>
              </td>
              <td class="action-cell">
                <button
                  class="copy-btn"
                  on:click|stopPropagation={() => copyToClipboard(item.code, item.id)}
                  title="Copy code"
                >
                  {#if copiedId === item.id}
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M3 8l3 3 7-7"/>
                    </svg>
                  {:else}
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5">
                      <rect x="5" y="5" width="8" height="8" rx="1"/>
                      <path d="M3 11V3h8"/>
                    </svg>
                  {/if}
                </button>
              </td>
            </tr>
            {#if expandedId === item.id}
              <tr class="expanded-row" transition:fly={{ y: -5, duration: 150 }}>
                <td colspan="5">
                  <div class="expanded-content">
                    <div class="tags-row">
                      {#each item.tags as tag}
                        <span class="tag">{tag}</span>
                      {/each}
                    </div>
                    <div class="code-section">
                      <div class="code-header">
                        <span class="code-label">Code</span>
                        <button
                          class="copy-code-btn"
                          on:click|stopPropagation={() => copyToClipboard(item.code, item.id + "-code")}
                        >
                          {copiedId === item.id + "-code" ? "Copied!" : "Copy"}
                        </button>
                      </div>
                      <pre class="code-block"><code>{item.code}</code></pre>
                    </div>
                    <div class="config-section">
                      <span class="code-label">config.yaml</span>
                      <pre class="config-block"><code>guardrails:
  - guardrail_name: "{item.id}"
    litellm_params:
      guardrail: custom_code
      mode: "{item.input_type === 'response' ? 'post_call' : 'pre_call'}"
      custom_code: |
        def apply_guardrail(inputs, request_data, input_type):
          ... # paste code from above</code></pre>
                    </div>
                    <div class="author-row">By {item.author}</div>
                  </div>
                </td>
              </tr>
            {/if}
          {/each}
        </tbody>
      </table>
    </div>

    {#if results.length === 0}
      <div class="no-results">No guardrails found.</div>
    {/if}
  {/if}
</div>
</div>

<style>
  .page-wrapper {
    position: relative;
    min-height: 100vh;
    background: #09062C;
    overflow: hidden;
  }

  .page-wrapper::before {
    content: '';
    position: absolute;
    inset: 0;
    background-image: 
      linear-gradient(rgba(255, 255, 255, 0.03) 1px, transparent 1px),
      linear-gradient(90deg, rgba(255, 255, 255, 0.03) 1px, transparent 1px);
    background-size: 64px 64px;
    mask-image: linear-gradient(to bottom, black 0%, black 30%, transparent 70%);
    -webkit-mask-image: linear-gradient(to bottom, black 0%, black 30%, transparent 70%);
    pointer-events: none;
  }

  .page-wrapper::after {
    content: '';
    position: absolute;
    top: -200px;
    left: 0;
    right: 0;
    height: 600px;
    background: radial-gradient(ellipse 60% 40% at 50% 0%, rgba(123, 97, 255, 0.15) 0%, transparent 70%);
    pointer-events: none;
  }

  .guardrails-container {
    position: relative;
    z-index: 1;
    max-width: 1400px;
    margin: 0 auto;
    padding: 0 2rem 4rem;
  }

  .header-section {
    text-align: center;
    padding: 2rem 0;
  }

  .title {
    font-size: 2rem;
    font-weight: 700;
    margin: 0 0 0.5rem 0;
    color: var(--text-color);
  }

  .subtitle {
    font-size: 1rem;
    color: var(--muted-color);
    margin: 0 0 1rem 0;
  }

  .header-links {
    display: flex;
    gap: 1.5rem;
    justify-content: center;
  }

  .header-link {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    color: var(--muted-color);
    text-decoration: none;
    font-size: 0.875rem;
    transition: color 0.2s;
  }

  .header-link:hover {
    color: var(--text-color);
  }

  .filters-section {
    display: flex;
    gap: 1rem;
    align-items: center;
    margin-bottom: 1rem;
    flex-wrap: wrap;
  }

  .search-wrapper {
    position: relative;
    flex: 1;
    min-width: 200px;
  }

  .search-icon {
    position: absolute;
    left: 0.875rem;
    top: 50%;
    transform: translateY(-50%);
    color: var(--muted-color);
  }

  .search-input {
    width: 100%;
    padding: 0.625rem 0.875rem 0.625rem 2.5rem;
    font-size: 0.875rem;
    border: 1px solid var(--border-color);
    border-radius: 6px;
    background: var(--bg-color);
    color: var(--text-color);
  }

  .search-input:focus {
    outline: none;
    border-color: var(--litellm-primary, #6366f1);
  }

  .filter-select {
    padding: 0.625rem 0.875rem;
    font-size: 0.875rem;
    border: 1px solid var(--border-color);
    border-radius: 6px;
    background: var(--bg-color);
    color: var(--text-color);
    min-width: 140px;
  }

  .results-count {
    background: var(--bg-tertiary);
    color: var(--muted-color);
    padding: 0.375rem 0.75rem;
    border-radius: 6px;
    font-size: 0.875rem;
    font-weight: 500;
  }

  .table-wrapper {
    overflow-x: auto;
    border: 1px solid var(--border-color);
    border-radius: 8px;
  }

  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.875rem;
  }

  thead {
    background: var(--bg-tertiary);
  }

  th {
    padding: 0.75rem 1rem;
    text-align: left;
    font-weight: 500;
    color: var(--muted-color);
    font-size: 0.75rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    border-bottom: 1px solid var(--border-color);
    white-space: nowrap;
  }

  th.sortable {
    cursor: pointer;
    user-select: none;
  }

  th.sortable:hover {
    color: var(--text-color);
  }

  .sort-icon {
    margin-left: 0.25rem;
  }

  tbody tr.data-row {
    cursor: pointer;
    transition: background 0.15s;
  }

  tbody tr.data-row:hover {
    background: var(--hover-bg, rgba(99, 102, 241, 0.05));
  }

  tbody tr.data-row.expanded {
    background: var(--bg-tertiary);
  }

  td {
    padding: 0.75rem 1rem;
    border-bottom: 1px solid var(--border-color);
    vertical-align: middle;
  }

  .category-cell {
    width: 140px;
  }

  .category-badge {
    display: inline-flex;
    align-items: center;
    gap: 0.375rem;
    font-size: 0.8125rem;
  }

  .cat-icon {
    font-size: 1rem;
  }

  .name-cell {
    min-width: 150px;
  }

  .name {
    font-weight: 500;
    color: var(--text-color);
  }

  .version {
    margin-left: 0.5rem;
    font-size: 0.75rem;
    color: var(--muted-color);
  }

  .desc-cell {
    color: var(--muted-color);
    max-width: 400px;
  }

  .type-cell {
    width: 100px;
  }

  .type-badge {
    display: inline-block;
    padding: 0.25rem 0.5rem;
    border-radius: 4px;
    font-size: 0.75rem;
    font-weight: 500;
  }

  .type-badge.pre {
    background: rgba(59, 130, 246, 0.15);
    color: #3b82f6;
  }

  .type-badge.post {
    background: rgba(34, 197, 94, 0.15);
    color: #22c55e;
  }

  .type-badge.both {
    background: rgba(139, 92, 246, 0.15);
    color: #8b5cf6;
  }

  .action-cell {
    width: 50px;
    text-align: center;
  }

  .copy-btn {
    background: transparent;
    border: none;
    padding: 0.375rem;
    cursor: pointer;
    color: var(--muted-color);
    border-radius: 4px;
    transition: all 0.15s;
  }

  .copy-btn:hover {
    background: var(--bg-tertiary);
    color: var(--text-color);
  }

  .expanded-row td {
    padding: 0;
    background: var(--bg-tertiary);
  }

  .expanded-content {
    padding: 1rem 1.5rem;
  }

  .tags-row {
    display: flex;
    gap: 0.375rem;
    flex-wrap: wrap;
    margin-bottom: 1rem;
  }

  .tag {
    background: var(--bg-color);
    color: var(--muted-color);
    padding: 0.25rem 0.5rem;
    border-radius: 4px;
    font-size: 0.75rem;
  }

  .code-section,
  .config-section {
    margin-bottom: 1rem;
  }

  .code-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.5rem;
  }

  .code-label {
    font-size: 0.75rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--muted-color);
  }

  .copy-code-btn {
    font-size: 0.75rem;
    padding: 0.25rem 0.5rem;
    background: var(--litellm-primary, #6366f1);
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
  }

  .copy-code-btn:hover {
    opacity: 0.9;
  }

  .code-block,
  .config-block {
    background: var(--code-bg, #1a1a2e);
    border-radius: 6px;
    padding: 1rem;
    overflow-x: auto;
    font-family: "Menlo", "Monaco", monospace;
    font-size: 0.8125rem;
    line-height: 1.5;
    margin: 0;
    text-align: left;
    white-space: pre;
  }

  .code-block code,
  .config-block code {
    color: var(--code-text, #e5e7eb);
    text-align: left;
    display: block;
  }

  .author-row {
    font-size: 0.75rem;
    color: var(--muted-color);
  }

  .loading,
  .error,
  .no-results {
    text-align: center;
    padding: 3rem;
    color: var(--muted-color);
  }

  @media (max-width: 768px) {
    .guardrails-container {
      padding: 0 1rem 2rem;
    }

    .filters-section {
      flex-direction: column;
      align-items: stretch;
    }

    .filter-select {
      width: 100%;
    }

    .desc-cell {
      display: none;
    }
  }
</style>
