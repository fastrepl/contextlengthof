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
  let showSubmitModal = false;
  let submitLoading = false;
  let submitSuccess = false;
  let submitError: string | null = null;

  const INDEX_URL = "https://raw.githubusercontent.com/BerriAI/litellm/refs/heads/main/cookbook/ai_coding_tool_guides/index.json";
  const WEBHOOK_URL = "https://hooks.zapier.com/hooks/catch/22699356/ugq2dbo/";

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
      
      if (Array.isArray(data)) {
        guides = data;
      } else {
        guides = [data];
      }

      guides = guides.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      loading = false;
    } catch (err) {
      console.error("Error fetching guides:", err);
      error = err instanceof Error ? err.message : "Failed to load guides";
      loading = false;
    }
  }

  function openGuide(guide: Guide) {
    window.open(guide.url, '_blank', 'noopener,noreferrer');
  }

  function formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }

  function getRelativeDate(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    if (days === 0) return "Today";
    if (days === 1) return "Yesterday";
    if (days < 7) return `${days}d ago`;
    if (days < 30) return `${Math.floor(days / 7)}w ago`;
    if (days < 365) return `${Math.floor(days / 30)}mo ago`;
    return `${Math.floor(days / 365)}y ago`;
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

      if (!formData.title || !formData.description || !formData.url) {
        submitError = "Please fill in all required fields";
        submitLoading = false;
        return;
      }

      const tagsArray = formData.tags.split(",").map(tag => tag.trim()).filter(tag => tag);

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

      const response = await fetch(WEBHOOK_URL, {
        method: "POST",
        mode: "no-cors",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(guide),
      });

      console.log("Webhook response:", response);

      submitSuccess = true;
      submitLoading = false;

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
      <p>Loading guides...</p>
    </div>
  {:else if error}
    <div class="error-state">
      <h2>Error Loading Guides</h2>
      <p>{error}</p>
      <button class="retry-button" on:click={fetchGuides}>Retry</button>
    </div>
  {:else}
    <div class="guides-header">
      <div class="header-badge">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path></svg>
        {guides.length} guides available
      </div>
      <h1>AI Tool Guides</h1>
      <p class="guides-subtitle">
        Learn how to integrate LiteLLM with popular AI tools and coding assistants
      </p>
      <button class="submit-guide-button" on:click={openSubmitModal}>
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="8" y1="3" x2="8" y2="13"></line><line x1="3" y1="8" x2="13" y2="8"></line></svg>
        Submit Your Guide
      </button>
    </div>

    {#if guides.length === 0}
      <div class="empty-state">
        <p>No guides available at the moment.</p>
      </div>
    {:else}
      <div class="guides-grid">
        {#each guides as guide, i}
          <div class="guide-card" on:click={() => openGuide(guide)} on:keydown={(e) => e.key === 'Enter' && openGuide(guide)} role="button" tabindex="0">
            <div class="guide-card-content">
              <h2 class="guide-title">{guide.title}</h2>
              <p class="guide-description">{guide.description}</p>
            </div>
            <div class="guide-footer">
              <span class="guide-date" title={formatDate(guide.date)}>{getRelativeDate(guide.date)}</span>
              <div class="guide-tags-preview">
                {#each guide.tags.slice(0, 2) as tag}
                  <span class="tag-small">{tag}</span>
                {/each}
                {#if guide.tags.length > 2}
                  <span class="tag-small tag-more">+{guide.tags.length - 2}</span>
                {/if}
              </div>
            </div>
          </div>
        {/each}
      </div>
    {/if}
  {/if}

  {#if showSubmitModal}
    <!-- svelte-ignore a11y-click-events-have-key-events -->
    <!-- svelte-ignore a11y-no-static-element-interactions -->
    <div class="modal-backdrop" on:click={(e) => e.target === e.currentTarget && closeSubmitModal()}>
      <div class="modal-content">
        <div class="modal-header">
          <div>
            <h2>Submit Your Guide</h2>
            <p class="subtitle">Share your LiteLLM integration guide with the community</p>
          </div>
          <button class="close-button" on:click={closeSubmitModal} type="button">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>

        {#if submitSuccess}
          <div class="success-message">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2.5" stroke-linecap="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
            <h3>Guide Submitted!</h3>
            <p>Thank you for your contribution. We'll review it shortly.</p>
          </div>
        {:else}
          <form on:submit|preventDefault={submitGuide}>
            <div class="form-group">
              <label for="title">Title <span class="required">*</span></label>
              <input id="title" type="text" bind:value={formData.title} placeholder="e.g., Claude Code Quickstart" required disabled={submitLoading} />
            </div>
            <div class="form-group">
              <label for="description">Description <span class="required">*</span></label>
              <textarea id="description" bind:value={formData.description} placeholder="Brief description of your guide..." rows="3" required disabled={submitLoading}></textarea>
            </div>
            <div class="form-group">
              <label for="url">Guide URL <span class="required">*</span></label>
              <input id="url" type="url" bind:value={formData.url} placeholder="https://docs.litellm.ai/docs/tutorials/..." required disabled={submitLoading} />
            </div>
            <div class="form-group">
              <label for="tags">Tags <span class="required">*</span></label>
              <input id="tags" type="text" bind:value={formData.tags} placeholder="Claude Code, LiteLLM (comma-separated)" required disabled={submitLoading} />
            </div>
            <div class="form-row">
              <div class="form-group">
                <label for="date">Date <span class="required">*</span></label>
                <input id="date" type="date" bind:value={formData.date} required disabled={submitLoading} />
              </div>
              <div class="form-group">
                <label for="version">Version <span class="optional">(optional)</span></label>
                <input id="version" type="text" bind:value={formData.version} placeholder="1.0.0" disabled={submitLoading} />
              </div>
            </div>

            {#if submitError}
              <div class="error-message">{submitError}</div>
            {/if}

            <div class="form-actions">
              <button type="button" class="btn btn-secondary" on:click={closeSubmitModal} disabled={submitLoading}>Cancel</button>
              <button type="submit" class="btn btn-primary" disabled={submitLoading}>
                {#if submitLoading}Submitting...{:else}Submit Guide{/if}
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
    max-width: 1400px; margin: 0 auto; padding: 2rem;
    min-height: calc(100vh - 200px);
  }

  .loading-state {
    display: flex; flex-direction: column; align-items: center;
    justify-content: center; padding: 4rem 2rem; gap: 1rem;
  }

  .spinner {
    width: 32px; height: 32px; border: 3px solid var(--border-color);
    border-top-color: var(--litellm-primary); border-radius: 50%;
    animation: spin 0.7s linear infinite;
  }

  @keyframes spin { to { transform: rotate(360deg); } }

  .loading-state p { color: var(--muted-color); }

  .error-state { text-align: center; padding: 4rem 2rem; }
  .error-state h2 { color: var(--text-color); margin-bottom: 1rem; }
  .error-state p { color: var(--muted-color); margin-bottom: 2rem; }

  .retry-button {
    padding: 0.625rem 1.25rem; background: var(--litellm-primary);
    color: white; border: none; border-radius: 8px; font-weight: 600;
    cursor: pointer;
  }

  .guides-header { text-align: center; margin-bottom: 2.5rem; }

  .header-badge {
    display: inline-flex; align-items: center; gap: 0.5rem;
    padding: 0.375rem 1rem; background: var(--bg-secondary);
    border: 1px solid var(--border-color); border-radius: 100px;
    font-size: 0.8125rem; font-weight: 500; color: var(--muted-color);
    margin-bottom: 1.25rem;
  }

  .header-badge svg { color: var(--litellm-primary); }

  .guides-header h1 {
    font-size: 2.25rem; font-weight: 800; color: var(--text-color);
    margin-bottom: 0.5rem; letter-spacing: -0.03em;
  }

  .guides-subtitle {
    font-size: 1.0625rem; color: var(--muted-color); margin-bottom: 1.5rem;
  }

  .submit-guide-button {
    display: inline-flex; align-items: center; gap: 0.375rem;
    padding: 0.625rem 1.25rem; background: var(--litellm-primary);
    color: white; border: none; border-radius: 8px; font-weight: 600;
    font-size: 0.875rem; cursor: pointer; transition: all 0.15s;
  }

  .submit-guide-button:hover {
    background: var(--litellm-dark); transform: translateY(-1px);
    box-shadow: 0 2px 8px rgba(99,102,241,0.3);
  }

  .guides-grid {
    display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 1rem;
  }

  .guide-card {
    background: var(--card-bg); border: 1px solid var(--border-color);
    border-radius: 10px; padding: 1.25rem; cursor: pointer;
    transition: all 0.15s ease; display: flex; flex-direction: column;
  }

  .guide-card:hover {
    border-color: var(--litellm-primary); transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba(0,0,0,0.06);
  }

  .guide-card:focus { outline: 2px solid var(--litellm-primary); outline-offset: 2px; }

  .guide-card-content { flex: 1; margin-bottom: 1rem; }

  .guide-title {
    font-size: 1.0625rem; font-weight: 700; color: var(--text-color);
    margin: 0 0 0.5rem 0; line-height: 1.3;
  }

  .guide-description {
    font-size: 0.8125rem; color: var(--muted-color); line-height: 1.5; margin: 0;
  }

  .guide-footer {
    display: flex; justify-content: space-between; align-items: center;
    gap: 0.75rem; padding-top: 0.75rem; border-top: 1px solid var(--border-color);
  }

  .guide-date { font-size: 0.75rem; color: var(--muted-color); font-weight: 500; }

  .guide-tags-preview { display: flex; gap: 0.375rem; flex-wrap: wrap; }

  .tag-small {
    padding: 0.125rem 0.5rem; background: var(--bg-tertiary);
    color: var(--text-secondary); border-radius: 4px; font-size: 0.6875rem;
    font-weight: 600;
  }

  .tag-more { background: var(--litellm-primary); color: white; }

  /* Modal */
  .modal-backdrop {
    position: fixed; top: 0; left: 0; right: 0; bottom: 0;
    background-color: rgba(0,0,0,0.5); display: flex; align-items: center;
    justify-content: center; z-index: 1000; padding: 1rem;
    backdrop-filter: blur(4px); animation: fadeIn 0.2s ease;
  }

  @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }

  .modal-content {
    background: var(--bg-color); border-radius: 14px; max-width: 600px;
    width: 100%; max-height: 90vh; overflow-y: auto;
    box-shadow: 0 20px 40px rgba(0,0,0,0.15); animation: slideUp 0.3s ease;
  }

  @keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }

  .modal-header {
    display: flex; align-items: flex-start; justify-content: space-between;
    padding: 1.5rem 1.5rem 1rem; border-bottom: 1px solid var(--border-color);
  }

  .modal-header h2 {
    margin: 0 0 0.25rem 0; font-size: 1.25rem; font-weight: 700;
    color: var(--text-color);
  }

  .subtitle { margin: 0; font-size: 0.8125rem; color: var(--muted-color); }

  .close-button {
    background: none; border: none; cursor: pointer; padding: 0.375rem;
    color: var(--muted-color); border-radius: 6px; display: flex;
  }

  .close-button:hover { color: var(--text-color); background: var(--bg-tertiary); }

  form { padding: 1.5rem; }

  .form-group { margin-bottom: 1.25rem; }

  .form-group label {
    display: block; margin-bottom: 0.375rem; font-weight: 600;
    font-size: 0.8125rem; color: var(--text-color);
  }

  .required { color: #ef4444; }
  .optional { font-weight: 400; color: var(--muted-color); font-size: 0.75rem; }

  .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }

  .form-group input:not([type="checkbox"]),
  .form-group textarea {
    width: 100%; padding: 0.625rem 0.875rem; border: 1px solid var(--border-color);
    border-radius: 8px; font-size: 0.9375rem; transition: all 0.15s;
    box-sizing: border-box; background: var(--card-bg); color: var(--text-color);
  }

  .form-group textarea { resize: vertical; min-height: 80px; line-height: 1.5; }

  .form-group input:focus, .form-group textarea:focus {
    outline: none; border-color: var(--litellm-primary);
    box-shadow: 0 0 0 3px rgba(99,102,241,0.08);
  }

  .form-group input::placeholder, .form-group textarea::placeholder { color: var(--muted-color); }

  .error-message {
    padding: 0.75rem 1rem; background: #fef2f2; border: 1px solid #fecaca;
    border-radius: 8px; color: #dc2626; font-size: 0.875rem; margin-bottom: 1rem;
  }

  .success-message { padding: 3rem 2rem; text-align: center; }
  .success-message svg { margin: 0 auto 1rem; display: block; }
  .success-message h3 { margin: 0 0 0.5rem 0; font-size: 1.25rem; font-weight: 700; color: #10b981; }
  .success-message p { margin: 0; color: var(--muted-color); }

  .form-actions {
    display: flex; gap: 0.75rem; justify-content: flex-end;
    margin-top: 1.5rem; padding-top: 1.25rem; border-top: 1px solid var(--border-color);
  }

  .btn {
    padding: 0.625rem 1.25rem; font-size: 0.875rem; font-weight: 600;
    border-radius: 8px; border: none; cursor: pointer; transition: all 0.15s;
  }

  .btn:disabled { opacity: 0.6; cursor: not-allowed; }

  .btn-primary { background: var(--litellm-primary); color: white; }
  .btn-primary:hover:not(:disabled) { background: var(--litellm-dark); }

  .btn-secondary {
    background: transparent; color: var(--muted-color);
    border: 1px solid var(--border-color);
  }
  .btn-secondary:hover:not(:disabled) { background: var(--bg-secondary); color: var(--text-color); }

  .empty-state { text-align: center; padding: 4rem 2rem; color: var(--muted-color); }

  @media (max-width: 768px) {
    .cookbook-container { padding: 1rem; }
    .guides-header h1 { font-size: 1.75rem; }
    .guides-grid { grid-template-columns: 1fr; }
    .form-row { grid-template-columns: 1fr; }
    .form-actions { flex-direction: column-reverse; }
    .btn { width: 100%; text-align: center; }
  }
</style>
