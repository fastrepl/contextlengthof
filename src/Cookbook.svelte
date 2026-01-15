<script lang="ts">
  import { onMount } from "svelte";
  import { marked } from "marked";

  interface GuideMetadata {
    title: string;
    description: string;
    date: string;
    version: string;
    tags: string[];
  }

  interface Guide {
    folder: string;
    metadata: GuideMetadata;
    markdownContent?: string;
  }

  let guides: Guide[] = [];
  let loading = true;
  let error: string | null = null;
  let selectedGuide: Guide | null = null;
  let renderedMarkdown = "";

  const GITHUB_API_BASE = "https://api.github.com/repos/BerriAI/litellm/contents/cookbook/ai_coding_tool_guides";
  const GITHUB_RAW_BASE = "https://raw.githubusercontent.com/BerriAI/litellm/main/cookbook/ai_coding_tool_guides";

  async function fetchGuides() {
    try {
      loading = true;
      error = null;

      // Fetch the list of folders in the cookbook directory
      const response = await fetch(GITHUB_API_BASE);
      if (!response.ok) {
        throw new Error(`Failed to fetch guides: ${response.statusText}`);
      }

      const items = await response.json();
      
      // Filter only directories
      const folders = items.filter((item: any) => item.type === "dir");

      // Fetch metadata for each folder
      const guidesData = await Promise.all(
        folders.map(async (folder: any) => {
          try {
            const indexUrl = `${GITHUB_RAW_BASE}/${folder.name}/index.json`;
            const indexResponse = await fetch(indexUrl);
            
            if (!indexResponse.ok) {
              console.warn(`No index.json found for ${folder.name}`);
              return null;
            }

            const metadata = await indexResponse.json();
            return {
              folder: folder.name,
              metadata,
            };
          } catch (err) {
            console.error(`Error fetching metadata for ${folder.name}:`, err);
            return null;
          }
        })
      );

      // Filter out nulls and sort by date (newest first)
      guides = guidesData
        .filter((g): g is Guide => g !== null)
        .sort((a, b) => new Date(b.metadata.date).getTime() - new Date(a.metadata.date).getTime());

      loading = false;
    } catch (err) {
      console.error("Error fetching guides:", err);
      error = err instanceof Error ? err.message : "Failed to load guides";
      loading = false;
    }
  }

  async function openGuide(guide: Guide) {
    try {
      selectedGuide = guide;
      renderedMarkdown = "";

      // Fetch the markdown content
      const markdownUrl = `${GITHUB_RAW_BASE}/${guide.folder}/guide.md`;
      const response = await fetch(markdownUrl);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch guide content: ${response.statusText}`);
      }

      const markdownText = await response.text();
      guide.markdownContent = markdownText;
      
      // Render markdown to HTML
      renderedMarkdown = marked(markdownText) as string;
    } catch (err) {
      console.error("Error loading guide:", err);
      renderedMarkdown = `<p style="color: var(--text-color);">Failed to load guide content.</p>`;
    }
  }

  function closeGuide() {
    selectedGuide = null;
    renderedMarkdown = "";
  }

  function formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }

  onMount(() => {
    fetchGuides();
  });
</script>

<div class="cookbook-container">
  {#if loading}
    <div class="loading-state">
      <div class="spinner"></div>
      <p>Loading cookbook guides...</p>
    </div>
  {:else if error}
    <div class="error-state">
      <h2>Error Loading Guides</h2>
      <p>{error}</p>
      <button class="retry-button" on:click={fetchGuides}>Retry</button>
    </div>
  {:else if selectedGuide}
    <!-- Guide Detail View -->
    <div class="guide-detail">
      <button class="back-button" on:click={closeGuide}>
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="15 18 9 12 15 6"></polyline>
        </svg>
        Back to Guides
      </button>

      <article class="guide-content">
        <header class="guide-header">
          <h1>{selectedGuide.metadata.title}</h1>
          <p class="guide-description">{selectedGuide.metadata.description}</p>
          <div class="guide-meta">
            <span class="guide-date">{formatDate(selectedGuide.metadata.date)}</span>
            <span class="guide-version">v{selectedGuide.metadata.version}</span>
          </div>
          <div class="guide-tags">
            {#each selectedGuide.metadata.tags as tag}
              <span class="tag">{tag}</span>
            {/each}
          </div>
        </header>

        <div class="markdown-content">
          {@html renderedMarkdown}
        </div>
      </article>
    </div>
  {:else}
    <!-- Guides List View -->
    <div class="guides-header">
      <h1>AI Coding Tool Guides</h1>
      <p class="guides-subtitle">
        Learn how to integrate LiteLLM with popular AI coding tools
      </p>
    </div>

    {#if guides.length === 0}
      <div class="empty-state">
        <p>No guides available at the moment.</p>
      </div>
    {:else}
      <div class="guides-grid">
        {#each guides as guide}
          <div class="guide-card" on:click={() => openGuide(guide)} on:keydown={(e) => e.key === 'Enter' && openGuide(guide)} role="button" tabindex="0">
            <h2 class="guide-title">{guide.metadata.title}</h2>
            <p class="guide-description">{guide.metadata.description}</p>
            <div class="guide-footer">
              <span class="guide-date">{formatDate(guide.metadata.date)}</span>
              <div class="guide-tags-preview">
                {#each guide.metadata.tags.slice(0, 2) as tag}
                  <span class="tag-small">{tag}</span>
                {/each}
                {#if guide.metadata.tags.length > 2}
                  <span class="tag-small">+{guide.metadata.tags.length - 2}</span>
                {/if}
              </div>
            </div>
          </div>
        {/each}
      </div>
    {/if}
  {/if}
</div>

<style>
  .cookbook-container {
    max-width: 1400px;
    margin: 0 auto;
    padding: 2rem;
    min-height: calc(100vh - 200px);
  }

  /* Loading State */
  .loading-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 4rem 2rem;
    gap: 1rem;
  }

  .spinner {
    width: 40px;
    height: 40px;
    border: 3px solid var(--border-color);
    border-top-color: var(--litellm-primary);
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  .loading-state p {
    color: var(--text-secondary);
    font-size: 1rem;
  }

  /* Error State */
  .error-state {
    text-align: center;
    padding: 4rem 2rem;
  }

  .error-state h2 {
    color: var(--text-color);
    margin-bottom: 1rem;
  }

  .error-state p {
    color: var(--text-secondary);
    margin-bottom: 2rem;
  }

  .retry-button {
    padding: 0.75rem 1.5rem;
    background-color: var(--litellm-primary);
    color: white;
    border: none;
    border-radius: 8px;
    font-weight: 500;
    cursor: pointer;
    transition: background-color 0.2s ease;
  }

  .retry-button:hover {
    background-color: var(--litellm-dark);
  }

  /* Guides Header */
  .guides-header {
    text-align: center;
    margin-bottom: 3rem;
  }

  .guides-header h1 {
    font-size: 2.5rem;
    font-weight: 700;
    color: var(--text-color);
    margin-bottom: 0.75rem;
  }

  .guides-subtitle {
    font-size: 1.125rem;
    color: var(--text-secondary);
  }

  /* Empty State */
  .empty-state {
    text-align: center;
    padding: 4rem 2rem;
    color: var(--text-secondary);
  }

  /* Guides Grid */
  .guides-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
    gap: 1.5rem;
  }

  .guide-card {
    background: var(--card-bg);
    border: 1px solid var(--border-color);
    border-radius: 12px;
    padding: 1.5rem;
    cursor: pointer;
    transition: all 0.2s ease;
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .guide-card:hover {
    border-color: var(--litellm-primary);
    transform: translateY(-2px);
    box-shadow: 0 8px 16px rgba(0, 0, 0, 0.1);
  }

  .guide-card:focus {
    outline: 2px solid var(--litellm-primary);
    outline-offset: 2px;
  }

  .guide-title {
    font-size: 1.25rem;
    font-weight: 600;
    color: var(--text-color);
    margin: 0;
  }

  .guide-description {
    font-size: 0.9375rem;
    color: var(--text-secondary);
    line-height: 1.5;
    margin: 0;
    flex-grow: 1;
  }

  .guide-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 1rem;
    padding-top: 1rem;
    border-top: 1px solid var(--border-color);
  }

  .guide-date {
    font-size: 0.875rem;
    color: var(--muted-color);
  }

  .guide-tags-preview {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
  }

  .tag-small {
    padding: 0.25rem 0.5rem;
    background: var(--bg-tertiary);
    color: var(--text-secondary);
    border-radius: 4px;
    font-size: 0.75rem;
    font-weight: 500;
  }

  /* Guide Detail View */
  .guide-detail {
    max-width: 900px;
    margin: 0 auto;
  }

  .back-button {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 1rem;
    background: transparent;
    border: 1px solid var(--border-color);
    border-radius: 8px;
    color: var(--text-color);
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
    margin-bottom: 2rem;
  }

  .back-button:hover {
    background: var(--bg-tertiary);
    border-color: var(--border-color-strong);
  }

  .guide-content {
    background: var(--card-bg);
    border: 1px solid var(--border-color);
    border-radius: 12px;
    padding: 3rem;
  }

  .guide-header {
    margin-bottom: 2rem;
    padding-bottom: 2rem;
    border-bottom: 1px solid var(--border-color);
  }

  .guide-header h1 {
    font-size: 2.5rem;
    font-weight: 700;
    color: var(--text-color);
    margin-bottom: 1rem;
  }

  .guide-header .guide-description {
    font-size: 1.125rem;
    color: var(--text-secondary);
    margin-bottom: 1rem;
  }

  .guide-meta {
    display: flex;
    gap: 1rem;
    margin-bottom: 1rem;
  }

  .guide-version {
    padding: 0.25rem 0.75rem;
    background: var(--bg-tertiary);
    color: var(--text-secondary);
    border-radius: 4px;
    font-size: 0.875rem;
    font-weight: 500;
  }

  .guide-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  .tag {
    padding: 0.375rem 0.75rem;
    background: var(--bg-tertiary);
    color: var(--text-secondary);
    border-radius: 6px;
    font-size: 0.875rem;
    font-weight: 500;
  }

  /* Markdown Content Styling */
  .markdown-content {
    color: var(--text-color);
    line-height: 1.7;
  }

  .markdown-content :global(h1),
  .markdown-content :global(h2),
  .markdown-content :global(h3),
  .markdown-content :global(h4),
  .markdown-content :global(h5),
  .markdown-content :global(h6) {
    color: var(--text-color);
    font-weight: 600;
    margin-top: 2rem;
    margin-bottom: 1rem;
    line-height: 1.3;
  }

  .markdown-content :global(h1) {
    font-size: 2rem;
  }

  .markdown-content :global(h2) {
    font-size: 1.5rem;
  }

  .markdown-content :global(h3) {
    font-size: 1.25rem;
  }

  .markdown-content :global(p) {
    margin-bottom: 1rem;
  }

  .markdown-content :global(a) {
    color: var(--litellm-primary);
    text-decoration: none;
    transition: color 0.2s ease;
  }

  .markdown-content :global(a:hover) {
    color: var(--litellm-dark);
    text-decoration: underline;
  }

  .markdown-content :global(code) {
    background: var(--code-bg);
    color: var(--code-text);
    padding: 0.2rem 0.4rem;
    border-radius: 4px;
    font-size: 0.875em;
    font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
  }

  .markdown-content :global(pre) {
    background: var(--code-bg);
    border: 1px solid var(--border-color);
    border-radius: 8px;
    padding: 1rem;
    overflow-x: auto;
    margin: 1.5rem 0;
  }

  .markdown-content :global(pre code) {
    background: none;
    padding: 0;
    font-size: 0.875rem;
  }

  .markdown-content :global(ul),
  .markdown-content :global(ol) {
    margin-bottom: 1rem;
    padding-left: 2rem;
  }

  .markdown-content :global(li) {
    margin-bottom: 0.5rem;
  }

  .markdown-content :global(blockquote) {
    border-left: 4px solid var(--litellm-primary);
    padding-left: 1rem;
    margin: 1.5rem 0;
    color: var(--text-secondary);
    font-style: italic;
  }

  .markdown-content :global(img) {
    max-width: 100%;
    height: auto;
    border-radius: 8px;
    margin: 1.5rem 0;
  }

  .markdown-content :global(table) {
    width: 100%;
    border-collapse: collapse;
    margin: 1.5rem 0;
  }

  .markdown-content :global(th),
  .markdown-content :global(td) {
    border: 1px solid var(--border-color);
    padding: 0.75rem;
    text-align: left;
  }

  .markdown-content :global(th) {
    background: var(--bg-tertiary);
    font-weight: 600;
  }

  .markdown-content :global(hr) {
    border: none;
    border-top: 1px solid var(--border-color);
    margin: 2rem 0;
  }

  /* Responsive Design */
  @media (max-width: 768px) {
    .cookbook-container {
      padding: 1rem;
    }

    .guides-header h1 {
      font-size: 2rem;
    }

    .guides-subtitle {
      font-size: 1rem;
    }

    .guides-grid {
      grid-template-columns: 1fr;
      gap: 1rem;
    }

    .guide-content {
      padding: 1.5rem;
    }

    .guide-header h1 {
      font-size: 1.75rem;
    }

    .guide-footer {
      flex-direction: column;
      align-items: flex-start;
    }
  }
</style>

