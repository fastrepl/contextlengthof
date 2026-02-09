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

  interface Category {
    name: string;
    guides: Guide[];
  }

  const CATEGORY_RULES: { name: string; matchTitle?: RegExp; matchTags?: string[] }[] = [
    {
      name: "Usage & Cost Management",
      matchTitle: /usage|track|cost|billing/i,
    },
    {
      name: "AI Coding Assistants",
      matchTags: ["Claude Code", "Cursor", "Github Copilot", "Gemini CLI", "OpenAI Codex CLI", "OpenAI Codex"],
    },
    {
      name: "UIs & Interfaces",
      matchTags: ["OpenWebUI"],
    },
  ];

  function categorizeGuides(guides: Guide[]): Category[] {
    const categoryMap = new Map<string, Guide[]>();

    for (const guide of guides) {
      let matched = false;
      for (const rule of CATEGORY_RULES) {
        if (rule.matchTitle && rule.matchTitle.test(guide.title)) {
          const list = categoryMap.get(rule.name) || [];
          list.push(guide);
          categoryMap.set(rule.name, list);
          matched = true;
          break;
        }
        if (rule.matchTags && guide.tags.some(tag => rule.matchTags!.includes(tag))) {
          const list = categoryMap.get(rule.name) || [];
          list.push(guide);
          categoryMap.set(rule.name, list);
          matched = true;
          break;
        }
      }
      if (!matched) {
        const list = categoryMap.get("Other Guides") || [];
        list.push(guide);
        categoryMap.set("Other Guides", list);
      }
    }

    // Return in the order defined by CATEGORY_RULES, then "Other Guides" at the end
    const result: Category[] = [];
    for (const rule of CATEGORY_RULES) {
      const guides = categoryMap.get(rule.name);
      if (guides && guides.length > 0) {
        result.push({ name: rule.name, guides });
      }
    }
    const other = categoryMap.get("Other Guides");
    if (other && other.length > 0) {
      result.push({ name: "Other Guides", guides: other });
    }
    return result;
  }

  let guides: Guide[] = [];
  let categories: Category[] = [];
  let activeCategory: string = "All";
  let loading = true;
  let error: string | null = null;

  $: categoryNames = ["All", ...categories.map(c => c.name)];
  $: filteredGuides = activeCategory === "All"
    ? guides
    : categories.find(c => c.name === activeCategory)?.guides || [];
  let showSubmitModal = false;
  let submitLoading = false;
  let submitSuccess = false;
  let submitError: string | null = null;

  const INDEX_URL = "https://raw.githubusercontent.com/BerriAI/litellm/refs/heads/main/cookbook/ai_coding_tool_guides/index.json";
  const WEBHOOK_URL = "https://hooks.zapier.com/hooks/catch/22699356/ugq2dbo/"; // Replace with actual webhook URL

  // Form state
  let formData = {
    title: "",
    description: "",
    url: "",
    date: new Date().toISOString().split('T')[0],
    version: "1.0.0",
    tags: ""
  };

  async function fetchGuides() {
    try {
      loading = true;
      error = null;

      const response = await fetch(INDEX_URL);
      if (!response.ok) {
        throw new Error(`Failed to fetch guides: ${response.statusText}`);
      }

      const data = await response.json();
      
      // The API returns an array of guide objects
      if (Array.isArray(data)) {
        guides = data;
      } else {
        // Fallback: wrap single object in array for backwards compatibility
        guides = [data];
      }

      // Sort by date (newest first)
      guides = guides.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      categories = categorizeGuides(guides);

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

  function openSubmitModal() {
    showSubmitModal = true;
    submitSuccess = false;
    submitError = null;
  }

  function closeSubmitModal() {
    showSubmitModal = false;
    resetForm();
  }

  function resetForm() {
    formData = {
      title: "",
      description: "",
      url: "",
      date: new Date().toISOString().split('T')[0],
      version: "1.0.0",
      tags: ""
    };
    submitLoading = false;
    submitSuccess = false;
    submitError = null;
  }

  async function submitGuide() {
    try {
      submitLoading = true;
      submitError = null;

      // Validate form
      if (!formData.title || !formData.description || !formData.url) {
        submitError = "Please fill in all required fields";
        submitLoading = false;
        return;
      }

      // Parse tags (comma-separated)
      const tagsArray = formData.tags.split(",").map(tag => tag.trim()).filter(tag => tag);

      // Create guide object with timestamp
      const guide = {
        title: formData.title,
        description: formData.description,
        url: formData.url,
        date: formData.date,
        version: formData.version,
        tags: tagsArray,
        timestamp: new Date().toISOString()
      };

      console.log("Submitting guide to webhook:", guide);

      // Submit to webhook
      const response = await fetch(WEBHOOK_URL, {
        method: "POST",
        mode: "no-cors",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(guide),
      });

      // With no-cors mode, we can't read the response, so we assume success
      console.log("Webhook response:", response);

      submitSuccess = true;
      submitLoading = false;

      // Close modal after 2 seconds
      setTimeout(() => {
        closeSubmitModal();
      }, 2000);
    } catch (err) {
      console.error("Error submitting guide:", err);
      submitError = err instanceof Error ? err.message : "Failed to submit guide";
      submitLoading = false;
    }
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
      <h1>AI Tool Guides</h1>
      <p class="guides-subtitle">
        Learn how to integrate LiteLLM with popular AI tools
      </p>
      <button class="submit-guide-button" on:click={openSubmitModal}>
        Submit Your Guide
      </button>
    </div>

    {#if guides.length === 0}
      <div class="empty-state">
        <p>No guides available at the moment.</p>
      </div>
    {:else}
      <div class="category-pills">
        {#each categoryNames as name}
          <button
            class="pill"
            class:active={activeCategory === name}
            on:click={() => activeCategory = name}
          >
            {name}
          </button>
        {/each}
      </div>

      <div class="guides-grid">
        {#each filteredGuides as guide}
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

  <!-- Submit Guide Modal -->
  {#if showSubmitModal}
    <!-- svelte-ignore a11y-click-events-have-key-events -->
    <!-- svelte-ignore a11y-no-static-element-interactions -->
    <div class="modal-backdrop" on:click={(e) => e.target === e.currentTarget && closeSubmitModal()}>
      <div class="modal-content">
        <div class="modal-header">
          <div>
            <h2>Submit Your Guide</h2>
            <p class="subtitle">Share your LiteLLM guide with the community!</p>
          </div>
          <button class="close-button" on:click={closeSubmitModal} type="button">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        {#if submitSuccess}
          <div class="success-message">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
            <h3>Guide Submitted!</h3>
            <p>Thank you for your contribution. We'll review it shortly.</p>
          </div>
        {:else}
          <form on:submit|preventDefault={submitGuide}>
            <div class="form-group">
              <label for="title">
                Title <span class="required">*</span>
              </label>
              <input
                id="title"
                type="text"
                bind:value={formData.title}
                placeholder="e.g., Claude Code Quickstart"
                required
                disabled={submitLoading}
              />
            </div>

            <div class="form-group">
              <label for="description">
                Description <span class="required">*</span>
              </label>
              <textarea
                id="description"
                bind:value={formData.description}
                placeholder="Brief description of your guide..."
                rows="3"
                required
                disabled={submitLoading}
              ></textarea>
              <span class="hint">Keep it concise and informative</span>
            </div>

            <div class="form-group">
              <label for="url">
                Guide URL <span class="required">*</span>
              </label>
              <input
                id="url"
                type="url"
                bind:value={formData.url}
                placeholder="https://docs.litellm.ai/docs/tutorials/..."
                required
                disabled={submitLoading}
              />
            </div>

            <div class="form-group">
              <label for="tags">
                Tags <span class="required">*</span>
              </label>
              <input
                id="tags"
                type="text"
                bind:value={formData.tags}
                placeholder="Claude Code, LiteLLM, MCP (comma-separated)"
                required
                disabled={submitLoading}
              />
              <span class="hint">Separate multiple tags with commas</span>
            </div>

            <div class="form-group">
              <label for="date">
                Publication Date <span class="required">*</span>
              </label>
              <input
                id="date"
                type="date"
                bind:value={formData.date}
                required
                disabled={submitLoading}
              />
            </div>

            <div class="form-group">
              <label for="version">
                Version <span class="optional">(optional)</span>
              </label>
              <input
                id="version"
                type="text"
                bind:value={formData.version}
                placeholder="1.0.0"
                disabled={submitLoading}
              />
            </div>

            {#if submitError}
              <div class="error-message">
                {submitError}
              </div>
            {/if}

            <div class="form-actions">
              <button type="button" class="btn btn-secondary" on:click={closeSubmitModal} disabled={submitLoading}>
                Cancel
              </button>
              <button type="submit" class="btn btn-primary" disabled={submitLoading}>
                {#if submitLoading}
                  <span class="spinner"></span>
                  Submitting...
                {:else}
                  Submit Guide
                {/if}
              </button>
            </div>
          </form>
        {/if}
      </div>
    </div>
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
    margin-bottom: 1rem;
  }

  .submit-guide-button {
    margin-top: 1.5rem;
    padding: 0.875rem 1.75rem;
    background-color: #000;
    color: white;
    border: none;
    border-radius: 100px;
    font-weight: 600;
    font-size: 1rem;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .submit-guide-button:hover {
    background-color: #333;
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  }

  /* Empty State */
  .empty-state {
    text-align: center;
    padding: 4rem 2rem;
    color: var(--text-secondary);
  }

  /* Category Pills */
  .category-pills {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
    margin-bottom: 2rem;
    justify-content: center;
  }

  .pill {
    padding: 0.5rem 1rem;
    border-radius: 100px;
    border: 1px solid var(--border-color);
    background: transparent;
    color: var(--text-secondary);
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
    font-family: inherit;
  }

  .pill:hover {
    border-color: var(--text-secondary);
    color: var(--text-color);
  }

  .pill.active {
    background: var(--text-color);
    color: var(--bg-color);
    border-color: var(--text-color);
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

  /* Modal Styles */
  .modal-backdrop {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    padding: 1rem;
    backdrop-filter: blur(4px);
    animation: fadeIn 0.2s ease;
  }

  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }

  .modal-content {
    background: var(--bg-color);
    border-radius: 16px;
    max-width: 900px;
    width: 100%;
    max-height: 90vh;
    overflow-y: auto;
    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
    animation: slideUp 0.3s ease;
  }

  @keyframes slideUp {
    from {
      transform: translateY(20px);
      opacity: 0;
    }
    to {
      transform: translateY(0);
      opacity: 1;
    }
  }

  .modal-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    padding: 2rem 2rem 1rem;
    border-bottom: 1px solid var(--border-color);
  }

  .modal-header h2 {
    margin: 0 0 0.5rem 0;
    font-size: 1.75rem;
    font-weight: 700;
    color: var(--text-color);
    line-height: 1.2;
  }

  .subtitle {
    margin: 0;
    font-size: 0.9375rem;
    color: var(--muted-color);
    line-height: 1.5;
  }

  .close-button {
    background: none;
    border: none;
    cursor: pointer;
    padding: 0.5rem;
    color: var(--muted-color);
    transition: color 0.2s ease;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 6px;
  }

  .close-button:hover {
    color: var(--text-color);
    background-color: var(--bg-tertiary);
  }

  form {
    padding: 2rem;
  }

  .form-group {
    margin-bottom: 1.5rem;
  }

  .form-group label {
    display: block;
    margin-bottom: 0.625rem;
    font-weight: 600;
    font-size: 0.9375rem;
    color: var(--text-color);
  }

  .required {
    color: #ef4444;
    font-weight: 600;
  }

  .optional {
    font-weight: 400;
    color: var(--muted-color);
    font-size: 0.875rem;
  }

  .hint {
    display: block;
    margin-top: 0.5rem;
    font-size: 0.8125rem;
    color: var(--muted-color);
  }

  .form-group input:not([type="checkbox"]),
  .form-group textarea {
    width: 100%;
    padding: 0.875rem 1rem;
    border: 1px solid var(--border-color-strong);
    border-radius: 8px;
    font-size: 1rem;
    font-family: inherit;
    transition: all 0.2s ease;
    box-sizing: border-box;
    background: var(--card-bg);
    color: var(--text-color);
  }

  .form-group textarea {
    resize: vertical;
    min-height: 90px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Inter', 'Roboto', 'Helvetica Neue', Arial, sans-serif;
    line-height: 1.5;
  }

  .form-group input:not([type="checkbox"]):hover:not(:disabled),
  .form-group textarea:hover:not(:disabled) {
    border-color: var(--muted-color);
  }

  .form-group input:not([type="checkbox"]):focus,
  .form-group textarea:focus {
    outline: none;
    border-color: #000;
    box-shadow: 0 0 0 3px rgba(0, 0, 0, 0.05);
  }

  .form-group input:not([type="checkbox"])::placeholder,
  .form-group textarea::placeholder {
    color: var(--muted-color);
    opacity: 0.7;
  }

  .form-group input:not([type="checkbox"]):disabled,
  .form-group textarea:disabled {
    background-color: var(--bg-secondary);
    cursor: not-allowed;
    opacity: 0.6;
  }

  .form-actions {
    display: flex;
    gap: 0.75rem;
    justify-content: flex-end;
    margin-top: 2rem;
    padding-top: 1.5rem;
    border-top: 1px solid var(--border-color);
  }

  .btn {
    padding: 0.875rem 1.75rem;
    font-size: 1rem;
    font-weight: 600;
    border-radius: 100px;
    border: none;
    cursor: pointer;
    transition: all 0.2s ease;
    font-family: inherit;
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
  }

  .btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .btn-primary {
    background-color: #000;
    color: white;
  }

  .btn-primary:hover:not(:disabled) {
    background-color: #333;
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  }

  .btn-secondary {
    background-color: transparent;
    color: var(--muted-color);
    border: 2px solid var(--border-color);
  }

  .btn-secondary:hover:not(:disabled) {
    background-color: var(--bg-secondary);
    border-color: var(--border-color-strong);
    color: var(--text-color);
  }

  .spinner {
    width: 14px;
    height: 14px;
    border: 2px solid rgba(255, 255, 255, 0.3);
    border-top-color: white;
    border-radius: 50%;
    animation: spin 0.6s linear infinite;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  .error-message {
    padding: 1rem 1.25rem;
    background-color: #fef2f2;
    border: 2px solid #fecaca;
    border-radius: 10px;
    color: #dc2626;
    font-size: 0.9375rem;
    margin-bottom: 1rem;
    font-weight: 500;
  }

  .success-message {
    padding: 3rem 2rem;
    text-align: center;
    animation: slideUp 0.3s ease;
  }

  .success-message svg {
    margin: 0 auto 1.5rem;
    display: block;
  }

  .success-message h3 {
    margin: 0 0 0.75rem 0;
    font-size: 1.75rem;
    font-weight: 700;
    color: #10b981;
  }

  .success-message p {
    margin: 0;
    color: var(--muted-color);
    font-size: 1.0625rem;
    line-height: 1.6;
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

    .modal-content {
      max-height: 95vh;
      border-radius: 12px;
    }

    .modal-header {
      padding: 1.5rem 1.5rem 1rem;
    }

    .modal-header h2 {
      font-size: 1.5rem;
    }

    .subtitle {
      font-size: 0.875rem;
    }

    form {
      padding: 1.5rem;
    }

    .form-actions {
      flex-direction: column-reverse;
    }

    .btn {
      width: 100%;
      justify-content: center;
    }
  }
</style>

