<script lang="ts">
  import { onMount } from "svelte";

  interface Guide {
    title: string;
    description: string;
    url: string;
    date: string;
    version: string;
    tags: string[];
  }

  let guides: Guide[] = [];
  let loading = true;
  let error: string | null = null;

  const INDEX_URL = "https://raw.githubusercontent.com/BerriAI/litellm/refs/heads/main/cookbook/ai_coding_tool_guides/index.json";

  async function fetchGuides() {
    try {
      loading = true;
      error = null;

      const response = await fetch(INDEX_URL);
      if (!response.ok) {
        throw new Error(`Failed to fetch guides: ${response.statusText}`);
      }

      const data = await response.json();
      
      // Handle both array and single object responses
      if (Array.isArray(data)) {
        guides = data;
      } else {
        guides = [data];
      }

      // Sort by date (newest first)
      guides = guides.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      loading = false;
    } catch (err) {
      console.error("Error fetching guides:", err);
      error = err instanceof Error ? err.message : "Failed to load guides";
      loading = false;
    }
  }

  function openGuide(guide: Guide) {
    // Open the guide URL in a new tab
    window.open(guide.url, '_blank', 'noopener,noreferrer');
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
            <h2 class="guide-title">{guide.title}</h2>
            <p class="guide-description">{guide.description}</p>
            <div class="guide-footer">
              <span class="guide-date">{formatDate(guide.date)}</span>
              <div class="guide-tags-preview">
                {#each guide.tags.slice(0, 2) as tag}
                  <span class="tag-small">{tag}</span>
                {/each}
                {#if guide.tags.length > 2}
                  <span class="tag-small">+{guide.tags.length - 2}</span>
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

    .guide-footer {
      flex-direction: column;
      align-items: flex-start;
    }
  }
</style>

