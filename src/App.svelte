<script lang="ts">
  import { onMount } from "svelte";
  import { fly } from "svelte/transition";

  import Fuse from "fuse.js";
  import Typewriter from "svelte-typewriter";

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

  function getProviderInitial(provider: string): string {
    if (!provider) return "?";
    
    // Map common providers to their initials/abbreviations
    const providerMap: { [key: string]: string } = {
      "anthropic": "A",
      "openai": "O",
      "azure": "Az",
      "bedrock": "B",
      "vertex_ai": "V",
      "cohere": "C",
      "huggingface": "H",
      "replicate": "R",
      "groq": "G",
      "together_ai": "T",
      "mistral": "M",
      "deepinfra": "D",
    };

    const lowerProvider = provider.toLowerCase();
    if (providerMap[lowerProvider]) {
      return providerMap[lowerProvider];
    }
    
    // Default to first letter uppercase
    return provider.charAt(0).toUpperCase();
  }
</script>

<main class="container">
  <!-- svelte-ignore a11y-click-events-have-key-events -->
  <!-- svelte-ignore a11y-no-static-element-interactions -->
  <div
    style="height: 4.5em;"
    class="truncate"
    on:click={() => window.location.reload()}
  >
    <Typewriter mode="loopOnce" interval={70} cursor={true}>
      <h2>Search for "gpt-4o"</h2>
      <h2>Search for "vertex_ai/claude-3-sonnet@20240229"</h2>
      <h2>Search for "groq/llama3-8b-8192"</h2>
    </Typewriter>
  </div>

  {#if !loading}
    <section in:fly={{ y: 20, duration: 800 }}>
      Brought to you by
      <a href="https://github.com/fastrepl/canary">🐤 Canary</a>, powered by
      <a
        href="https://github.com/BerriAI/litellm/blob/main/model_prices_and_context_window.json"
      >
        🚅 Litellm
      </a>.
    </section>
  {:else}
    <section style="height: 1.5em;" />
  {/if}

  <input
    id="query"
    bind:value={query}
    type="search"
    autocomplete="off"
    name="query"
    aria-label="query"
    placeholder="Search for models..."
  />

  <div class="filter-container">
    <div class="filter-row">
      <div class="filter-item">
        <label for="provider">Select provider:</label>
        <select id="provider" bind:value={selectedProvider}>
          <option value="">All Providers</option>
          {#each providers as provider}
            <option value={provider}>{provider}</option>
          {/each}
        </select>
      </div>

      <div class="filter-item">
        <label for="maxInputTokens">max_input_tokens >=</label>
        <input
          id="maxInputTokens"
          bind:value={maxInputTokens}
          type="number"
          min="0"
          placeholder="Enter minimum max_input_tokens"
        />
      </div>
      <div class="filter-item">
        <label for="maxOutputTokens">max_output_tokens >=</label>
        <input
          id="maxOutputTokens"
          bind:value={maxOutputTokens}
          type="number"
          min="0"
          placeholder="Enter minimum max_output_tokens"
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
                    {getProviderInitial(litellm_provider)}
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
  h2 {
    margin-top: 2rem;
  }
  input {
    margin-top: 1rem;
  }

  .truncate {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  /* Improved select/dropdown styles */
  select {
    width: 100%;
    padding: 0.75rem 1rem;
    font-size: 1rem;
    border: 1px solid var(--form-element-border-color);
    border-radius: 8px;
    background-color: var(--form-element-background-color);
    cursor: pointer;
    transition: all 0.2s ease;
  }

  select:hover {
    border-color: var(--primary);
  }

  select:focus {
    border-color: var(--primary);
    box-shadow: 0 0 0 2px rgba(var(--primary-rgb), 0.1);
  }

  input,
  select {
    margin-top: 0.5rem;
  }

  .filter-container {
    margin-top: 1rem;
  }

  .filter-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 1rem;
  }

  .filter-item {
    display: flex;
    flex-direction: column;
    flex: 1;
  }

  .filter-item label {
    font-size: 1rem;
    font-weight: 600;
    color: var(--contrast);
    margin-bottom: 0.5rem;
  }

  input[type="number"] {
    width: 100%;
    padding: 0.75rem 1rem;
    font-size: 1rem;
    border: 1px solid var(--form-element-border-color);
    border-radius: 8px;
    transition: all 0.2s ease;
  }

  input[type="number"]:focus {
    border-color: var(--primary);
    box-shadow: 0 0 0 2px rgba(var(--primary-rgb), 0.1);
  }

  /* Table styles */
  .table-container {
    margin-top: 2rem;
    overflow-x: auto;
    border-radius: 12px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  }

  table {
    width: 100%;
    border-collapse: collapse;
    background: var(--card-background-color);
  }

  thead {
    background-color: var(--muted-border-color);
  }

  th {
    padding: 1.25rem 1.5rem;
    text-align: left;
    font-weight: 500;
    font-size: 0.8rem;
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
    background-color: #1a1a1a;
    color: white;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 600;
    font-size: 0.9rem;
    flex-shrink: 0;
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
</style>
