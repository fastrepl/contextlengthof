<script lang="ts">
  import { onMount } from "svelte";
  import { fly } from "svelte/transition";

  import Fuse from "fuse.js";
  import { getProviderInitial, getProviderLogo } from "./providers";
  import ProviderDropdown from "./ProviderDropdown.svelte";
  import { trackSearch } from "./analytics";

  type ModelItem = {
    name: string;
    litellm_provider?: string;
    mode?: string;
    max_input_tokens?: number;
    max_output_tokens?: number;
    input_cost_per_token?: number;
    output_cost_per_token?: number;
    cache_creation_input_token_cost?: number;
    cache_read_input_token_cost?: number;
    supports_function_calling?: boolean;
    supports_vision?: boolean;
    supports_response_schema?: boolean;
    supports_tool_choice?: boolean;
    supports_parallel_function_calling?: boolean;
    supports_audio_input?: boolean;
    supports_prompt_caching?: boolean;
    [key: string]: any;
  };

  type ResultItem = {
    refIndex: number;
    item: ModelItem;
  };

  type SortColumn =
    | ""
    | "context"
    | "input"
    | "output"
    | "cache_read"
    | "cache_write";

  type FilterChip = {
    key: "query" | "provider" | "minInput" | "minOutput" | "sort";
    label: string;
  };

  type CodeSamples = {
    summary: string;
    sdk: string;
    proxy: string;
  };

  const REPO_FULL_NAME = "BerriAI/litellm";
  const DEFAULT_BRANCH = "main";
  const RESOURCE_NAME = "model_prices_and_context_window.json";
  const RESOURCE_BACKUP_NAME = "model_prices_and_context_window_backup.json";
  const RESOURCE_PATH = `${RESOURCE_NAME}`;
  const RESOURCE_BACKUP_PATH = `litellm/${RESOURCE_BACKUP_NAME}`;
  const SEARCH_KEYS = [
    { name: "name", weight: 1.5 },
    "mode",
    "litellm_provider",
  ];
  const SORTABLE_COLUMNS = new Set<SortColumn>([
    "",
    "context",
    "input",
    "output",
    "cache_read",
    "cache_write",
  ]);

  let providers: string[] = [];
  let selectedProvider = "";
  let maxInputTokens: number | null = null;
  let maxOutputTokens: number | null = null;
  let sortColumn: SortColumn = "";
  let sortDirection: "asc" | "desc" = "asc";
  let copiedModel = "";
  let copiedCodeKey = "";
  let searchInput: HTMLInputElement;
  let searchFocused = false;
  let isMac = false;
  let codeTabStates: Record<string, "sdk" | "proxy"> = {};
  let sha: string | null = null;
  let query = "";
  let lines: string[] = [];
  let index: Fuse<ModelItem> | null = null;
  let results: ResultItem[] = [];
  let loading = true;
  let loadError = "";
  let expandedRows = new Set<string>();
  let initialized = false;
  let totalModels = 0;
  let activeFilters: FilterChip[] = [];
  let nearbyMatches: ModelItem[] = [];
  let platformShortcut = "Ctrl K";

  const debounce = (callback: Function, wait = 500) => {
    let timeout: ReturnType<typeof setTimeout>;

    return (...args: any[]) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => callback(...args), wait);
    };
  };

  const trackSearchDebounced = debounce(
    (nextQuery: string, provider: string, resultsCount: number) => {
      if (nextQuery) {
        trackSearch(nextQuery, provider, resultsCount);
      }
    },
    1000,
  );

  onMount(async () => {
    isMac = /Mac|iPhone|iPad/i.test(navigator.platform);
    hydrateFromUrl();
    initialized = true;
    await loadModels();
  });

  $: if (index) {
    filterResults(query, selectedProvider, maxInputTokens, maxOutputTokens);
  }

  $: if (initialized) {
    syncUrlState();
  }

  $: activeFilters = getActiveFilters();
  $: nearbyMatches = getNearbyMatches();
  $: platformShortcut = isMac ? "⌘K" : "Ctrl K";

  function handleKeydown(event: KeyboardEvent) {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
      event.preventDefault();
      searchInput?.focus();
    }

    if (event.key === "Escape" && document.activeElement === searchInput) {
      searchInput?.blur();
    }
  }

  function hydrateFromUrl() {
    const urlParams = new URLSearchParams(window.location.search);
    query = urlParams.get("q") ?? "";
    selectedProvider = urlParams.get("provider") ?? "";
    maxInputTokens = parsePositiveNumber(urlParams.get("minInput"));
    maxOutputTokens = parsePositiveNumber(urlParams.get("minOutput"));

    const nextSort = (urlParams.get("sort") ?? "") as SortColumn;
    sortColumn = SORTABLE_COLUMNS.has(nextSort) ? nextSort : "";
    sortDirection = urlParams.get("dir") === "desc" ? "desc" : "asc";
  }

  function parsePositiveNumber(value: string | null): number | null {
    if (!value) return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
  }

  function syncUrlState() {
    const url = new URL(window.location.href);

    setSearchParam(url, "q", query);
    setSearchParam(url, "provider", selectedProvider);
    setSearchParam(url, "minInput", maxInputTokens);
    setSearchParam(url, "minOutput", maxOutputTokens);
    setSearchParam(url, "sort", sortColumn);
    setSearchParam(url, "dir", sortColumn ? sortDirection : "");

    const nextUrl = `${url.pathname}${url.search}${url.hash}`;
    const currentUrl = `${window.location.pathname}${window.location.search}${window.location.hash}`;

    if (nextUrl !== currentUrl) {
      window.history.replaceState(window.history.state, "", nextUrl);
    }
  }

  function setSearchParam(url: URL, key: string, value: string | number | null) {
    if (value === null || value === "" || value === undefined) {
      url.searchParams.delete(key);
      return;
    }

    url.searchParams.set(key, String(value));
  }

  async function loadModels() {
    loading = true;
    loadError = "";

    try {
      const shaPromise = fetch(
        `https://api.github.com/repos/${REPO_FULL_NAME}/commits/${DEFAULT_BRANCH}`,
        {
          headers: {
            Accept: "application/vnd.github.VERSION.sha",
          },
        },
      )
        .then((res) => (res.ok ? res.text() : null))
        .catch(() => null);

      const response = await fetch(
        `https://raw.githubusercontent.com/${REPO_FULL_NAME}/${DEFAULT_BRANCH}/${RESOURCE_PATH}`,
      );

      if (!response.ok) {
        throw new Error(
          `The model catalog could not be loaded (${response.status}).`,
        );
      }

      const text = await response.text();
      lines = text.split("\n");

      const items: ModelItem[] = Object.entries(JSON.parse(text)).map(
        ([name, value]: [string, any]) => ({ name, ...value }),
      );

      providers = [
        ...new Set(
          items
            .map((item) => item.litellm_provider)
            .filter((provider): provider is string => Boolean(provider)),
        ),
      ].sort((a, b) => a.localeCompare(b));

      index = new Fuse(items, {
        threshold: 0.3,
        keys: SEARCH_KEYS,
      });

      totalModels = items.length;
      results = items.map((item, refIndex) => ({ item, refIndex }));
      sha = await shaPromise;
      filterResults(query, selectedProvider, maxInputTokens, maxOutputTokens);
    } catch (error) {
      console.error("Failed to load model catalog:", error);
      loadError =
        error instanceof Error
          ? error.message
          : "The model catalog could not be loaded.";
      results = [];
      providers = [];
      index = null;
    } finally {
      loading = false;
    }
  }

  const getIssueUrlForAdd = (requestedQuery: string) => {
    const q = encodeURIComponent(requestedQuery);
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
      lines.findIndex((line, indexValue) => line.includes("}") && indexValue > from - 1) + 1;

    if (from > 0 && to > 0) {
      const body = encodeURIComponent(
        `${repo}/blob/${sha ?? DEFAULT_BRANCH}/${RESOURCE_PATH}#L${from}-L${to}

We also need to update [${RESOURCE_BACKUP_NAME}](https://github.com/${REPO_FULL_NAME}/blob/${sha ?? DEFAULT_BRANCH}/${RESOURCE_BACKUP_PATH}).
`,
      );

      return `${issue}&title=Fix+%22${name}%22+entry+in+%22${RESOURCE_NAME}%22&body=${body}`;
    }

    return `${issue}&title=Fix+%22${name}%22+entry+in+%22${RESOURCE_NAME}%22`;
  };

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text).then(() => {
      copiedModel = text;
      setTimeout(() => {
        copiedModel = "";
      }, 1500);
    });
  }

  function copyCode(code: string, key: string) {
    navigator.clipboard.writeText(code).then(() => {
      copiedCodeKey = key;
      setTimeout(() => {
        copiedCodeKey = "";
      }, 1500);
    });
  }

  function getDisplayModelName(name: string, litellmProvider?: string): string {
    if (name.includes("/")) {
      return name;
    }

    if (litellmProvider && litellmProvider.startsWith("vertex_ai")) {
      return `vertex_ai/${name}`;
    }

    return name;
  }

  function getDetailId(name: string) {
    return `detail-${name.replace(/[^a-zA-Z0-9_-]/g, "-")}`;
  }

  function toggleRow(name: string) {
    if (expandedRows.has(name)) {
      expandedRows.delete(name);
    } else {
      expandedRows.add(name);
    }

    expandedRows = expandedRows;
  }

  function handleSort(column: SortColumn) {
    if (sortColumn === column) {
      sortDirection = sortDirection === "asc" ? "desc" : "asc";
    } else {
      sortColumn = column;
      sortDirection = "asc";
    }

    applySorting();
  }

  function getAriaSort(column: SortColumn) {
    if (sortColumn !== column) return "none";
    return sortDirection === "asc" ? "ascending" : "descending";
  }

  function getSortValue(item: ModelItem, column: SortColumn): number {
    switch (column) {
      case "context":
        return item.max_input_tokens || 0;
      case "input":
        return item.input_cost_per_token || 0;
      case "output":
        return item.output_cost_per_token || 0;
      case "cache_read":
        return item.cache_read_input_token_cost || 0;
      case "cache_write":
        return item.cache_creation_input_token_cost || 0;
      default:
        return 0;
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

  function clearAllFilters() {
    query = "";
    selectedProvider = "";
    maxInputTokens = null;
    maxOutputTokens = null;
    sortColumn = "";
    sortDirection = "asc";
  }

  function clearFilter(key: FilterChip["key"]) {
    if (key === "query") query = "";
    if (key === "provider") selectedProvider = "";
    if (key === "minInput") maxInputTokens = null;
    if (key === "minOutput") maxOutputTokens = null;
    if (key === "sort") {
      sortColumn = "";
      sortDirection = "asc";
    }
  }

  function getActiveFilters(): FilterChip[] {
    const filters: FilterChip[] = [];

    if (query) filters.push({ key: "query", label: `Search: ${query}` });
    if (selectedProvider) {
      filters.push({ key: "provider", label: `Provider: ${selectedProvider}` });
    }
    if (maxInputTokens !== null) {
      filters.push({
        key: "minInput",
        label: `Min input: ${maxInputTokens.toLocaleString()}`,
      });
    }
    if (maxOutputTokens !== null) {
      filters.push({
        key: "minOutput",
        label: `Min output: ${maxOutputTokens.toLocaleString()}`,
      });
    }
    if (sortColumn) {
      filters.push({
        key: "sort",
        label: `Sorted by ${sortColumn.replace("_", " ")} (${sortDirection})`,
      });
    }

    return filters;
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

  function getFeatureBadges(item: ModelItem): string[] {
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
      chat: "Chat",
      completion: "Completion",
      embedding: "Embedding",
      image_generation: "Image Gen",
      audio_transcription: "Transcription",
      audio_speech: "TTS",
      moderation: "Moderation",
      rerank: "Rerank",
    };

    return labels[mode] || mode;
  }

  function getCodeSamples(
    name: string,
    litellmProvider: string | undefined,
    mode: string | undefined,
  ): CodeSamples {
    const model = getDisplayModelName(name, litellmProvider || "");

    switch (mode) {
      case "embedding":
        return {
          summary: "Embedding quickstart",
          sdk: `from litellm import embedding\n\nresponse = embedding(\n    model="${model}",\n    input=["LiteLLM enterprise model catalog"]\n)`,
          proxy: `curl http://0.0.0.0:4000/v1/embeddings \\\n  -H "Content-Type: application/json" \\\n  -H "Authorization: Bearer sk-1234" \\\n  -d '{\n    "model": "${model}",\n    "input": ["LiteLLM enterprise model catalog"]\n  }'`,
        };
      case "image_generation":
        return {
          summary: "Image generation quickstart",
          sdk: `from litellm import image_generation\n\nresponse = image_generation(\n    model="${model}",\n    prompt="A polished enterprise dashboard for AI teams"\n)`,
          proxy: `curl http://0.0.0.0:4000/v1/images/generations \\\n  -H "Content-Type: application/json" \\\n  -H "Authorization: Bearer sk-1234" \\\n  -d '{\n    "model": "${model}",\n    "prompt": "A polished enterprise dashboard for AI teams"\n  }'`,
        };
      case "audio_transcription":
        return {
          summary: "Transcription quickstart",
          sdk: `from litellm import transcription\n\nresponse = transcription(\n    model="${model}",\n    file=open("meeting.wav", "rb")\n)`,
          proxy: `curl http://0.0.0.0:4000/v1/audio/transcriptions \\\n  -H "Authorization: Bearer sk-1234" \\\n  -F "model=${model}" \\\n  -F "file=@meeting.wav"`,
        };
      case "audio_speech":
        return {
          summary: "Speech synthesis quickstart",
          sdk: `from litellm import speech\n\nresponse = speech(\n    model="${model}",\n    input="Welcome to the enterprise-ready LiteLLM catalog."\n)`,
          proxy: `curl http://0.0.0.0:4000/v1/audio/speech \\\n  -H "Content-Type: application/json" \\\n  -H "Authorization: Bearer sk-1234" \\\n  -d '{\n    "model": "${model}",\n    "input": "Welcome to the enterprise-ready LiteLLM catalog."\n  }'`,
        };
      case "moderation":
        return {
          summary: "Moderation quickstart",
          sdk: `from litellm import moderation\n\nresponse = moderation(\n    model="${model}",\n    input="Review this response before sending it to the user."\n)`,
          proxy: `curl http://0.0.0.0:4000/v1/moderations \\\n  -H "Content-Type: application/json" \\\n  -H "Authorization: Bearer sk-1234" \\\n  -d '{\n    "model": "${model}",\n    "input": "Review this response before sending it to the user."\n  }'`,
        };
      case "rerank":
        return {
          summary: "Rerank quickstart",
          sdk: `from litellm import rerank\n\nresponse = rerank(\n    model="${model}",\n    query="enterprise ai gateway",\n    documents=["LiteLLM proxy", "Model catalog", "Observability"]\n)`,
          proxy: `curl http://0.0.0.0:4000/v1/rerank \\\n  -H "Content-Type: application/json" \\\n  -H "Authorization: Bearer sk-1234" \\\n  -d '{\n    "model": "${model}",\n    "query": "enterprise ai gateway",\n    "documents": ["LiteLLM proxy", "Model catalog", "Observability"]\n  }'`,
        };
      default:
        return {
          summary: "Chat completion quickstart",
          sdk: `from litellm import completion\n\nresponse = completion(\n    model="${model}",\n    messages=[{"role": "user", "content": "Hello!"}]\n)`,
          proxy: `curl http://0.0.0.0:4000/v1/chat/completions \\\n  -H "Content-Type: application/json" \\\n  -H "Authorization: Bearer sk-1234" \\\n  -d '{\n    "model": "${model}",\n    "messages": [{"role": "user", "content": "Hello!"}]\n  }'`,
        };
    }
  }

  function setCodeTab(name: string, tab: "sdk" | "proxy") {
    codeTabStates[name] = tab;
    codeTabStates = codeTabStates;
  }

  function getAllItems(): ModelItem[] {
    if (!index) return [];
    return (index as any)["_docs"] as ModelItem[];
  }

  function getNearbyMatches(): ModelItem[] {
    if (!index || loading || loadError || results.length > 0) return [];

    let candidates = getAllItems();

    if (selectedProvider) {
      candidates = candidates.filter(
        (item) => item.litellm_provider === selectedProvider,
      );
    }

    if (query) {
      return new Fuse(candidates, {
        threshold: 0.3,
        keys: SEARCH_KEYS,
      })
        .search(query)
        .slice(0, 3)
        .map((result) => result.item);
    }

    return [...candidates]
      .sort(
        (a, b) => (b.max_input_tokens || 0) - (a.max_input_tokens || 0),
      )
      .slice(0, 3);
  }

  function applySuggestedModel(model: ModelItem) {
    query = getDisplayModelName(model.name, model.litellm_provider || "");
    if (model.litellm_provider) {
      selectedProvider = model.litellm_provider;
    }
    maxInputTokens = null;
    maxOutputTokens = null;
  }

  function filterResults(
    nextQuery: string,
    provider: string,
    minInput: number | null,
    minOutput: number | null,
  ) {
    if (!index) return;

    let filteredResults = getAllItems().filter(
      (item) =>
        (!provider || item.litellm_provider === provider) &&
        (minInput === null ||
          Boolean(item.max_input_tokens && item.max_input_tokens >= minInput)) &&
        (minOutput === null ||
          Boolean(item.max_output_tokens && item.max_output_tokens >= minOutput)),
    );

    if (nextQuery) {
      filteredResults = new Fuse(filteredResults, {
        threshold: 0.3,
        keys: SEARCH_KEYS,
      })
        .search(nextQuery)
        .map((result) => result.item);
    }

    results = filteredResults.map((item, refIndex) => ({ item, refIndex }));

    if (sortColumn) {
      applySorting();
    }

    trackSearchDebounced(nextQuery, provider, results.length);
  }

  function handleProviderImageError(event: Event) {
    const target = event.currentTarget as HTMLImageElement | null;
    if (!target) return;

    target.style.display = "none";

    const fallback = target.nextElementSibling as HTMLElement | null;
    if (fallback) {
      fallback.style.display = "flex";
    }
  }
</script>

<svelte:window on:keydown={handleKeydown} />

<main class="container">
  <div class="hero">
    <div class="hero-badge">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
      Open-source AI Gateway — 27K+ GitHub Stars
    </div>
    <h1 class="hero-title">Search, filter, and compare the AI model landscape</h1>
    <p class="hero-subtitle">
      Compare pricing, context windows, and capabilities for <strong>2,600+ models</strong> across <strong>140+ providers</strong> with a workspace built for repeat research, faster decision-making, and shareable filtered views.
    </p>

    <div class="hero-highlights">
      <div class="hero-highlight">
        <span class="status-dot"></span>
        Live data from LiteLLM GitHub
      </div>
      <div class="hero-highlight">Shareable filters in the URL</div>
      <div class="hero-highlight">{platformShortcut} to jump into search</div>
    </div>

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

  <section class="search-section" aria-labelledby="workspace-title">
    <div class="workspace-shell">
      <div class="search-header">
        <div>
          <p class="section-kicker">Workspace</p>
          <h2 id="workspace-title">Search, filter, and compare models</h2>
        </div>
        <div class="search-status">
          <span class="status-dot"></span>
          Share this exact view with the URL
        </div>
      </div>

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
            on:focus={() => {
              searchFocused = true;
            }}
            on:blur={() => {
              searchFocused = false;
            }}
            type="text"
            autocomplete="off"
            name="query"
            aria-label="Search models"
            placeholder="Search models, providers, and capabilities"
            class="search-input"
          />
          {#if query}
            <button class="search-clear" on:click={() => {
              query = "";
            }} type="button" aria-label="Clear search query">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
          {/if}
          {#if !query && !searchFocused}
            <kbd class="search-shortcut">{platformShortcut}</kbd>
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

      {#if !loading && !loadError}
        <div class="results-meta">
          <div class="results-copy">
            <span class="results-count">
              Showing {results.length.toLocaleString()} of {totalModels.toLocaleString()} models
            </span>
            <span class="results-helper">Live catalog powered by LiteLLM's open-source model database.</span>
          </div>
          {#if activeFilters.length}
            <button class="clear-filters" on:click={clearAllFilters} type="button">
              Clear all filters
            </button>
          {/if}
        </div>

        {#if activeFilters.length}
          <div class="active-filters" aria-label="Active filters">
            {#each activeFilters as filter}
              <button class="filter-chip" type="button" on:click={() => clearFilter(filter.key)}>
                <span>{filter.label}</span>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.25" stroke-linecap="round">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            {/each}
          </div>
        {/if}
      {/if}
    </div>
  </section>

  {#if loadError}
    <div class="table-container">
      <div class="state-panel">
        <div class="state-copy">
          <p class="state-eyebrow">Catalog unavailable</p>
          <h3>We couldn't load the live model catalog</h3>
          <p>
            The data source did not respond successfully. Retry to refresh the catalog and keep the page trustworthy.
          </p>
        </div>
        <div class="state-actions">
          <button class="btn btn-primary" type="button" on:click={loadModels}>Retry loading</button>
          <a class="btn btn-secondary" href="https://github.com/BerriAI/litellm" target="_blank" rel="noopener noreferrer">
            View source repository
          </a>
        </div>
      </div>
    </div>
  {:else if loading}
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
  {:else if results.length === 0}
    <div class="table-container">
      <div class="state-panel empty-state">
        <div class="state-copy">
          <p class="state-eyebrow">No matches</p>
          <h3>No models match this view</h3>
          <p>
            Try loosening one or more filters, or start from a nearby match below and refine from there.
          </p>
        </div>

        <div class="state-actions">
          {#if selectedProvider}
            <button class="btn btn-secondary" type="button" on:click={() => clearFilter("provider")}>
              Clear provider
            </button>
          {/if}
          {#if maxInputTokens !== null || maxOutputTokens !== null}
            <button class="btn btn-secondary" type="button" on:click={() => {
              maxInputTokens = null;
              maxOutputTokens = null;
            }}>
              Clear token filters
            </button>
          {/if}
          {#if activeFilters.length}
            <button class="btn btn-primary" type="button" on:click={clearAllFilters}>
              Reset this workspace
            </button>
          {/if}
          {#if query}
            <a class="btn btn-secondary" href={getIssueUrlForAdd(query)} target="_blank" rel="noopener noreferrer">
              Request this model on GitHub
            </a>
          {/if}
        </div>

        {#if nearbyMatches.length}
          <div class="suggested-models">
            <p class="suggested-title">Nearby matches</p>
            <div class="suggested-grid">
              {#each nearbyMatches as model}
                <button class="suggestion-card" type="button" on:click={() => applySuggestedModel(model)}>
                  <span class="suggestion-name">{getDisplayModelName(model.name, model.litellm_provider || "")}</span>
                  <span class="suggestion-provider">{model.litellm_provider || "Unknown provider"}</span>
                  <span class="suggestion-context">{formatContext(model.max_input_tokens)} context</span>
                </button>
              {/each}
            </div>
          </div>
        {/if}
      </div>
    </div>
  {:else}
    {#if query !== "" && results.length < 12}
      <div class="add-model-section">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="16"></line><line x1="8" y1="12" x2="16" y2="12"></line></svg>
        <a href={getIssueUrlForAdd(query)} target="_blank" rel="noopener noreferrer">Can't find your model? Request it on GitHub</a>
      </div>
    {/if}

    <div class="mobile-results">
      <div class="mobile-card-list">
        {#each results as result (result.item.name)}
          <article class="model-card">
            <div class="model-card-top">
              <div class="model-card-title">
                <div class="provider-avatar">
                  {#if getProviderLogo(result.item.litellm_provider || "")}
                    <img
                      src={getProviderLogo(result.item.litellm_provider || "")}
                      alt={result.item.litellm_provider}
                      class="provider-logo-img"
                      on:error={handleProviderImageError}
                    />
                    <div class="provider-initial" style="display: none;">
                      {getProviderInitial(result.item.litellm_provider || "")}
                    </div>
                  {:else}
                    <div class="provider-initial">
                      {getProviderInitial(result.item.litellm_provider || "")}
                    </div>
                  {/if}
                </div>
                <div>
                  <div class="model-card-name">{getDisplayModelName(result.item.name, result.item.litellm_provider || "")}</div>
                  <div class="model-card-provider">
                    {result.item.litellm_provider || "Unknown provider"}
                    {#if result.item.mode}
                      <span class="mode-badge">{getModeLabel(result.item.mode)}</span>
                    {/if}
                  </div>
                </div>
              </div>
              <div class="model-card-actions">
                <button
                  class="copy-button always-visible"
                  type="button"
                  title="Copy model name"
                  on:click={() => copyToClipboard(getDisplayModelName(result.item.name, result.item.litellm_provider || ""))}
                >
                  {#if copiedModel === getDisplayModelName(result.item.name, result.item.litellm_provider || "")}
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--success-color)" stroke-width="2.5" stroke-linecap="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                  {:else}
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                      <rect x="4" y="4" width="8" height="8" rx="1.5" stroke="currentColor" stroke-width="1.2"/>
                      <path d="M2 6V2.5C2 1.67157 2.67157 1 3.5 1H7" stroke="currentColor" stroke-width="1.2"/>
                    </svg>
                  {/if}
                </button>
                <button
                  class="card-expand-btn"
                  type="button"
                  aria-expanded={expandedRows.has(result.item.name)}
                  aria-controls={getDetailId(result.item.name)}
                  on:click={() => toggleRow(result.item.name)}
                >
                  {expandedRows.has(result.item.name) ? "Hide details" : "View details"}
                </button>
              </div>
            </div>

            <div class="model-card-metrics">
              <div class="metric-card">
                <span>Context</span>
                <strong>{formatContext(result.item.max_input_tokens)}</strong>
              </div>
              <div class="metric-card">
                <span>Input</span>
                <strong>{formatCost(result.item.input_cost_per_token)}</strong>
              </div>
              <div class="metric-card">
                <span>Output</span>
                <strong>{formatCost(result.item.output_cost_per_token)}</strong>
              </div>
            </div>

            {#if getFeatureBadges(result.item).length}
              <div class="feature-chip-list">
                {#each getFeatureBadges(result.item) as badge}
                  <span class="feature-chip">{badge}</span>
                {/each}
              </div>
            {/if}

            {#if expandedRows.has(result.item.name)}
              <div class="model-card-detail" id={getDetailId(result.item.name)} transition:fly={{ y: -10, duration: 200 }}>
                <div class="detail-toolbar">
                  <div>
                    <p class="detail-heading">{getCodeSamples(result.item.name, result.item.litellm_provider || "", result.item.mode).summary}</p>
                    <p class="detail-section-subtle">Mode-specific quickstarts and source-of-truth metadata for this model.</p>
                  </div>
                  <div class="detail-toolbar-actions">
                    <button class="detail-inline-action" type="button" on:click={() => copyToClipboard(getDisplayModelName(result.item.name, result.item.litellm_provider || ""))}>
                      Copy model ID
                    </button>
                    <a href={getIssueUrlForFix(result.item.name)} target="_blank" rel="noopener noreferrer" class="detail-action-link">
                      Report incorrect data
                    </a>
                  </div>
                </div>

                <div class="pricing-cards">
                  <div class="pricing-card">
                    <span class="pricing-label">Input</span>
                    <span class="pricing-value">{formatCost(result.item.input_cost_per_token)}</span>
                  </div>
                  <div class="pricing-card">
                    <span class="pricing-label">Output</span>
                    <span class="pricing-value">{formatCost(result.item.output_cost_per_token)}</span>
                  </div>
                  <div class="pricing-card">
                    <span class="pricing-label">Cache Read</span>
                    <span class="pricing-value">{formatCost(result.item.cache_read_input_token_cost)}</span>
                  </div>
                  <div class="pricing-card">
                    <span class="pricing-label">Cache Write</span>
                    <span class="pricing-value">{formatCost(result.item.cache_creation_input_token_cost)}</span>
                  </div>
                </div>

                <div class="info-rows">
                  <div class="info-row">
                    <span class="info-label">Provider</span>
                    <span class="info-value">{result.item.litellm_provider || "—"}</span>
                  </div>
                  <div class="info-row">
                    <span class="info-label">Mode</span>
                    <span class="info-value">{result.item.mode ? getModeLabel(result.item.mode) : "—"}</span>
                  </div>
                  <div class="info-row">
                    <span class="info-label">Max Input</span>
                    <span class="info-value">{result.item.max_input_tokens ? `${result.item.max_input_tokens.toLocaleString()} tokens` : "—"}</span>
                  </div>
                  <div class="info-row">
                    <span class="info-label">Max Output</span>
                    <span class="info-value">{result.item.max_output_tokens ? `${result.item.max_output_tokens.toLocaleString()} tokens` : "—"}</span>
                  </div>
                </div>

                <div class="detail-code-section">
                  <div class="code-header-row">
                    <div>
                      <p class="detail-heading">{getCodeSamples(result.item.name, result.item.litellm_provider || "", result.item.mode).summary}</p>
                    </div>
                    <div class="code-tabs">
                      <button
                        class="code-tab"
                        class:active={!codeTabStates[result.item.name] || codeTabStates[result.item.name] === "sdk"}
                        on:click={() => setCodeTab(result.item.name, "sdk")}
                        type="button"
                      >Python SDK</button>
                      <button
                        class="code-tab"
                        class:active={codeTabStates[result.item.name] === "proxy"}
                        on:click={() => setCodeTab(result.item.name, "proxy")}
                        type="button"
                      >AI Gateway</button>
                    </div>
                  </div>
                  <pre class="code-snippet"><code>{!codeTabStates[result.item.name] || codeTabStates[result.item.name] === "sdk"
                    ? getCodeSamples(result.item.name, result.item.litellm_provider || "", result.item.mode).sdk
                    : getCodeSamples(result.item.name, result.item.litellm_provider || "", result.item.mode).proxy}</code></pre>
                  <div class="detail-actions">
                    <button
                      class="copy-code-btn"
                      type="button"
                      on:click={() => copyCode(
                        !codeTabStates[result.item.name] || codeTabStates[result.item.name] === "sdk"
                          ? getCodeSamples(result.item.name, result.item.litellm_provider || "", result.item.mode).sdk
                          : getCodeSamples(result.item.name, result.item.litellm_provider || "", result.item.mode).proxy,
                        `${result.item.name}-${codeTabStates[result.item.name] || "sdk"}`,
                      )}
                    >
                      {copiedCodeKey === `${result.item.name}-${codeTabStates[result.item.name] || "sdk"}` ? "Copied!" : "Copy snippet"}
                    </button>
                  </div>
                </div>
              </div>
            {/if}
          </article>
        {/each}
      </div>
    </div>

    <div class="desktop-results table-container">
      <table>
        <thead>
          <tr>
            <th class="th-model">Model</th>
            <th aria-sort={getAriaSort("context")}>
              <button class="sort-button" type="button" on:click={() => handleSort("context")}>
                Context
                <span class="sort-icon" class:active={sortColumn === "context"} class:desc={sortColumn === "context" && sortDirection === "desc"}>↑</span>
              </button>
            </th>
            <th aria-sort={getAriaSort("input")}>
              <button class="sort-button" type="button" on:click={() => handleSort("input")}>
                Input $/M
                <span class="sort-icon" class:active={sortColumn === "input"} class:desc={sortColumn === "input" && sortDirection === "desc"}>↑</span>
              </button>
            </th>
            <th aria-sort={getAriaSort("output")}>
              <button class="sort-button" type="button" on:click={() => handleSort("output")}>
                Output $/M
                <span class="sort-icon" class:active={sortColumn === "output"} class:desc={sortColumn === "output" && sortDirection === "desc"}>↑</span>
              </button>
            </th>
            <th class="th-hide-mobile" aria-sort={getAriaSort("cache_read")}>
              <button class="sort-button" type="button" on:click={() => handleSort("cache_read")}>
                Cache Read
                <span class="sort-icon" class:active={sortColumn === "cache_read"} class:desc={sortColumn === "cache_read" && sortDirection === "desc"}>↑</span>
              </button>
            </th>
            <th class="th-hide-mobile" aria-sort={getAriaSort("cache_write")}>
              <button class="sort-button" type="button" on:click={() => handleSort("cache_write")}>
                Cache Write
                <span class="sort-icon" class:active={sortColumn === "cache_write"} class:desc={sortColumn === "cache_write" && sortDirection === "desc"}>↑</span>
              </button>
            </th>
          </tr>
        </thead>
        <tbody>
          {#each results as { item: { name, mode, litellm_provider, max_input_tokens, max_output_tokens, input_cost_per_token, output_cost_per_token, cache_creation_input_token_cost, cache_read_input_token_cost, supports_function_calling, supports_vision, supports_response_schema, supports_tool_choice, supports_parallel_function_calling, supports_audio_input, supports_prompt_caching } } (name)}
            <tr class="model-row" class:expanded={expandedRows.has(name)}>
              <td class="model-name">
                <div class="model-info">
                  <button
                    class="row-toggle"
                    type="button"
                    aria-expanded={expandedRows.has(name)}
                    aria-controls={getDetailId(name)}
                    on:click={() => toggleRow(name)}
                  >
                    <svg class="expand-icon" class:expanded={expandedRows.has(name)} width="14" height="14" viewBox="0 0 16 16" fill="none">
                      <path d="M6 4L10 8L6 12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                    <div class="provider-avatar">
                      {#if getProviderLogo(litellm_provider || "")}
                        <img
                          src={getProviderLogo(litellm_provider || "")}
                          alt={litellm_provider}
                          class="provider-logo-img"
                          on:error={handleProviderImageError}
                        />
                        <div class="provider-initial" style="display: none;">
                          {getProviderInitial(litellm_provider || "")}
                        </div>
                      {:else}
                        <div class="provider-initial">
                          {getProviderInitial(litellm_provider || "")}
                        </div>
                      {/if}
                    </div>
                    <div class="model-name-group">
                      <span class="model-title" title={getDisplayModelName(name, litellm_provider)}>{getDisplayModelName(name, litellm_provider)}</span>
                      {#if mode}
                        <span class="mode-badge">{getModeLabel(mode)}</span>
                      {/if}
                    </div>
                  </button>

                  <button
                    class="copy-button"
                    on:click={() => copyToClipboard(getDisplayModelName(name, litellm_provider))}
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
              <tr class="expanded-content" id={getDetailId(name)} transition:fly={{ y: -10, duration: 200 }}>
                <td colspan="6">
                  <div class="detail-panel">
                    <div class="detail-toolbar">
                      <div>
                        <p class="detail-heading">{getCodeSamples(name, litellm_provider, mode).summary}</p>
                        <p class="detail-section-subtle">Mode-aware quickstarts, pricing, and support signals for evaluation and rollout planning.</p>
                      </div>
                      <div class="detail-toolbar-actions">
                        <button class="detail-inline-action" type="button" on:click={() => copyToClipboard(getDisplayModelName(name, litellm_provider))}>
                          Copy model ID
                        </button>
                        <a href={getIssueUrlForFix(name)} target="_blank" rel="noopener noreferrer" class="detail-action-link">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                          Report incorrect data
                        </a>
                      </div>
                    </div>

                    <div class="detail-grid">
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
                            <span class="info-value">{max_input_tokens ? `${max_input_tokens.toLocaleString()} tokens` : "—"}</span>
                          </div>
                          <div class="info-row">
                            <span class="info-label">Max Output</span>
                            <span class="info-value">{max_output_tokens ? `${max_output_tokens.toLocaleString()} tokens` : "—"}</span>
                          </div>
                        </div>
                      </div>

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

                    <div class="detail-code-section">
                      <div class="code-header-row">
                        <div>
                          <p class="detail-heading">{getCodeSamples(name, litellm_provider, mode).summary}</p>
                        </div>
                        <div class="code-tabs">
                          <button
                            class="code-tab"
                            class:active={!codeTabStates[name] || codeTabStates[name] === "sdk"}
                            on:click={() => setCodeTab(name, "sdk")}
                            type="button"
                          >Python SDK</button>
                          <button
                            class="code-tab"
                            class:active={codeTabStates[name] === "proxy"}
                            on:click={() => setCodeTab(name, "proxy")}
                            type="button"
                          >AI Gateway</button>
                        </div>
                      </div>
                      <pre class="code-snippet"><code>{!codeTabStates[name] || codeTabStates[name] === "sdk"
                        ? getCodeSamples(name, litellm_provider, mode).sdk
                        : getCodeSamples(name, litellm_provider, mode).proxy}</code></pre>
                      <div class="detail-actions">
                        <button
                          class="copy-code-btn"
                          type="button"
                          on:click={() => copyCode(
                            !codeTabStates[name] || codeTabStates[name] === "sdk"
                              ? getCodeSamples(name, litellm_provider, mode).sdk
                              : getCodeSamples(name, litellm_provider, mode).proxy,
                            `${name}-${codeTabStates[name] || "sdk"}`,
                          )}
                        >
                          {copiedCodeKey === `${name}-${codeTabStates[name] || "sdk"}` ? "Copied!" : "Copy snippet"}
                        </button>
                      </div>
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
    padding: 3.5rem 2rem 2rem;
    max-width: 920px;
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
    font-size: 3rem;
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

  .hero-highlights {
    display: flex;
    flex-wrap: wrap;
    gap: 0.75rem;
    justify-content: center;
    margin: 0 0 2rem 0;
  }

  .hero-highlight {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 0.875rem;
    border-radius: 999px;
    background: var(--bg-secondary);
    border: 1px solid var(--border-color);
    color: var(--text-secondary);
    font-size: 0.8125rem;
    font-weight: 500;
  }

  .status-dot {
    width: 8px;
    height: 8px;
    border-radius: 999px;
    background: #10b981;
    box-shadow: 0 0 0 4px rgba(16, 185, 129, 0.12);
    flex-shrink: 0;
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
    padding: 1rem 2rem 2rem;
    max-width: 1080px;
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

  .workspace-shell {
    background: linear-gradient(180deg, var(--card-bg) 0%, var(--bg-color) 100%);
    border: 1px solid var(--border-color);
    border-radius: 18px;
    padding: 1.25rem;
    box-shadow: var(--shadow-sm);
  }

  .search-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 1rem;
    margin-bottom: 1rem;
  }

  .section-kicker {
    margin: 0 0 0.35rem;
    font-size: 0.75rem;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--litellm-primary);
  }

  .search-header h2 {
    margin: 0;
    font-size: 1.25rem;
    letter-spacing: -0.02em;
  }

  .search-status {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.625rem 0.875rem;
    border-radius: 999px;
    background: var(--bg-secondary);
    border: 1px solid var(--border-color);
    color: var(--text-secondary);
    font-size: 0.8125rem;
    white-space: nowrap;
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
    gap: 1rem;
    flex-wrap: wrap;
  }

  .results-copy {
    display: flex;
    flex-direction: column;
    gap: 0.2rem;
  }

  .results-count {
    font-size: 0.9rem;
    font-weight: 600;
    color: var(--text-color);
  }

  .results-helper {
    font-size: 0.8125rem;
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

  .active-filters {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  .filter-chip {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.45rem 0.75rem;
    border-radius: 999px;
    border: 1px solid var(--border-color);
    background: var(--bg-secondary);
    color: var(--text-secondary);
    font-size: 0.8125rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .filter-chip:hover {
    border-color: var(--litellm-primary);
    color: var(--litellm-primary);
  }

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

  .state-panel {
    background: linear-gradient(180deg, var(--card-bg) 0%, var(--bg-color) 100%);
    border: 1px solid var(--border-color);
    border-radius: 16px;
    padding: 1.5rem;
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .state-copy h3 {
    margin: 0 0 0.5rem;
    font-size: 1.35rem;
    letter-spacing: -0.02em;
  }

  .state-copy p {
    margin: 0;
    color: var(--text-secondary);
    line-height: 1.6;
  }

  .state-eyebrow {
    margin-bottom: 0.6rem !important;
    font-size: 0.75rem;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--litellm-primary);
    font-weight: 700;
  }

  .state-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 0.75rem;
  }

  .suggested-models {
    border-top: 1px solid var(--border-color);
    padding-top: 1rem;
  }

  .suggested-title {
    margin: 0 0 0.75rem;
    font-size: 0.875rem;
    font-weight: 600;
    color: var(--text-color);
  }

  .suggested-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 0.75rem;
  }

  .suggestion-card {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 0.25rem;
    padding: 0.875rem 1rem;
    border-radius: 12px;
    border: 1px solid var(--border-color);
    background: var(--bg-secondary);
    color: var(--text-color);
    cursor: pointer;
    text-align: left;
    transition: all 0.15s ease;
  }

  .suggestion-card:hover {
    border-color: var(--litellm-primary);
    transform: translateY(-1px);
    box-shadow: var(--shadow-sm);
  }

  .suggestion-name {
    font-weight: 600;
    font-size: 0.875rem;
  }

  .suggestion-provider,
  .suggestion-context {
    font-size: 0.8125rem;
    color: var(--muted-color);
  }

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

  .sort-button {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    padding: 0;
    border: none;
    background: transparent;
    color: inherit;
    font: inherit;
    text-transform: inherit;
    letter-spacing: inherit;
    cursor: pointer;
  }

  .sort-button:hover { color: var(--text-color); }

  .sort-icon {
    display: inline-block;
    margin-left: 0.25rem;
    opacity: 0;
    transition: all 0.15s;
    font-size: 0.625rem;
  }

  .sort-icon.active { opacity: 1; color: var(--litellm-primary); }
  .sort-icon.desc { transform: rotate(180deg); }

  tbody tr.model-row {
    border-bottom: 1px solid var(--border-color);
    transition: background-color 0.1s ease;
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

  .row-toggle {
    display: flex;
    align-items: center;
    gap: 0.625rem;
    flex: 1;
    padding: 0;
    border: none;
    background: transparent;
    color: inherit;
    text-align: left;
    cursor: pointer;
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
    opacity: 0.65;
    margin-left: 0.25rem;
    flex-shrink: 0;
  }

  .model-row:hover .copy-button,
  .copy-button:focus-visible,
  .copy-button.always-visible { opacity: 1; }
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

  .detail-toolbar {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 1rem;
    margin-bottom: 1.25rem;
  }

  .detail-toolbar-actions {
    display: flex;
    gap: 0.75rem;
    flex-wrap: wrap;
    justify-content: flex-end;
  }

  .detail-inline-action {
    border: 1px solid var(--border-color);
    background: var(--card-bg);
    color: var(--text-color);
    border-radius: 8px;
    padding: 0.5rem 0.75rem;
    font-size: 0.8125rem;
    font-weight: 600;
    cursor: pointer;
  }

  .detail-inline-action:hover {
    border-color: var(--litellm-primary);
    color: var(--litellm-primary);
  }

  .detail-grid {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    gap: 1.5rem;
    margin-bottom: 1.5rem;
  }

  .detail-heading {
    font-size: 0.6875rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--muted-color);
    margin: 0 0 0.75rem 0;
  }

  .detail-section-subtle {
    margin: 0;
    font-size: 0.875rem;
    line-height: 1.5;
    color: var(--text-secondary);
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
    gap: 1rem;
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

  .detail-actions {
    display: flex;
    gap: 1rem;
    margin-top: 0.875rem;
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

  .desktop-results {
    display: block;
  }

  .mobile-results {
    display: none;
    max-width: 1400px;
    margin: 1rem auto 0;
    padding: 0 1rem;
  }

  .mobile-card-list {
    display: flex;
    flex-direction: column;
    gap: 0.875rem;
  }

  .model-card {
    border: 1px solid var(--border-color);
    background: var(--card-bg);
    border-radius: 16px;
    padding: 1rem;
    box-shadow: var(--shadow-sm);
  }

  .model-card-top {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 0.75rem;
  }

  .model-card-title {
    display: flex;
    gap: 0.75rem;
    align-items: flex-start;
  }

  .model-card-name {
    font-family: 'JetBrains Mono', 'Menlo', monospace;
    font-size: 0.875rem;
    font-weight: 600;
    margin-bottom: 0.35rem;
    word-break: break-word;
  }

  .model-card-provider {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    align-items: center;
    font-size: 0.8125rem;
    color: var(--muted-color);
  }

  .model-card-actions {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    align-items: flex-end;
  }

  .card-expand-btn {
    border: 1px solid var(--border-color);
    background: var(--bg-secondary);
    color: var(--text-color);
    font-size: 0.75rem;
    font-weight: 600;
    padding: 0.45rem 0.7rem;
    border-radius: 999px;
    cursor: pointer;
  }

  .card-expand-btn:hover {
    border-color: var(--litellm-primary);
    color: var(--litellm-primary);
  }

  .model-card-metrics {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 0.625rem;
    margin-top: 1rem;
  }

  .metric-card {
    background: var(--bg-secondary);
    border: 1px solid var(--border-color);
    border-radius: 12px;
    padding: 0.75rem;
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
  }

  .metric-card span {
    font-size: 0.75rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--muted-color);
    font-weight: 700;
  }

  .metric-card strong {
    font-size: 0.9rem;
    font-variant-numeric: tabular-nums;
  }

  .feature-chip-list {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    margin-top: 0.875rem;
  }

  .feature-chip {
    padding: 0.35rem 0.55rem;
    border-radius: 999px;
    background: var(--bg-secondary);
    border: 1px solid var(--border-color);
    color: var(--text-secondary);
    font-size: 0.75rem;
    font-weight: 600;
  }

  .model-card-detail {
    margin-top: 1rem;
    padding-top: 1rem;
    border-top: 1px solid var(--border-color);
  }

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
  @media (max-width: 900px) {
    .th-hide-mobile, .td-hide-mobile { display: none; }
  }

  @media (max-width: 768px) {
    .hero { padding: 2.5rem 1rem 1.25rem; }
    .hero-title { font-size: 2rem; }
    .hero-subtitle { font-size: 1rem; }
    .hero-highlights { justify-content: flex-start; }
    .cta-buttons { flex-direction: column; width: 100%; max-width: 320px; margin: 0 auto; }
    .btn { width: 100%; }
    .search-section { padding: 0 1rem; }
    .workspace-shell { padding: 1rem; border-radius: 16px; }
    .search-header { flex-direction: column; }
    .search-status { white-space: normal; }
    .search-bar-container { flex-direction: column; }
    .filters-row { grid-template-columns: 1fr; }
    .table-container { padding: 0 1rem; }
    .suggested-grid { grid-template-columns: 1fr; }
    th, td { padding: 0.5rem 0.625rem; font-size: 0.8125rem; }
    .model-name { min-width: 180px; }
    .trust-logos { gap: 1.25rem; }
    .trust-logo-img { height: 22px; }
    .detail-grid { grid-template-columns: 1fr; }
    .detail-toolbar {
      flex-direction: column;
      align-items: stretch;
    }
    .detail-toolbar-actions { justify-content: flex-start; }
    .code-header-row {
      flex-direction: column;
      align-items: flex-start;
    }
    .desktop-results { display: none; }
    .mobile-results { display: block; }
    .model-card-metrics { grid-template-columns: 1fr; }
  }
</style>
