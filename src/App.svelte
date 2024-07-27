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
  const DEFAULT_QUERY = "gpt-4";

  onMount(() => {
    const urlParams = new URLSearchParams(window.location.search);
    query = urlParams.get("q") || DEFAULT_QUERY;

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

  $: if (index) {
    debounce(() => {
      results = index.search(query) as ResultItem[];
      loading = false;
    })();
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
    bind:value={query}
    type="search"
    autocomplete="off"
    name="query"
    aria-label="query"
  />

  {#if loading}
    <span aria-busy="true" />
  {:else}
    {#if query != "" && results.length < 12}
      <section>
        <a href={getIssueUrlForAdd(query)}>Add new model?</a>
      </section>
    {/if}

    {#each results as { item: { name, mode, litellm_provider, ...data } } (name)}
      <details>
        <summary>{name}</summary>
        <div class="relative">
          <pre>{JSON.stringify(data, null, 2)}</pre>
          <a href={getIssueUrlForFix(name)}> Incorrect or missing? </a>
        </div>
      </details>
    {/each}
  {/if}
</main>

<style>
  summary:hover {
    font-weight: bold;
  }

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
</style>
