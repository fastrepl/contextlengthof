<script lang="ts">
  import { onDestroy, tick } from "svelte";
  import { trackRequest, trackRequestFormOpened } from "./analytics";

  let showModal = false;
  let requestType: "provider" | "endpoint" | "model" | "" = "";
  let request = "";
  let docsLink = "";
  let email = "";
  let deadline = "";
  let willingToCall = false;
  let isSubmitting = false;
  let submitSuccess = false;
  let submitError = "";
  let modalContent: HTMLDivElement;
  let closeButton: HTMLButtonElement;
  let restoreFocusTarget: HTMLElement | null = null;

  // Zapier webhook URL
  const ZAPIER_WEBHOOK_URL = "https://hooks.zapier.com/hooks/catch/16331268/uwas519/";

  export async function openModal() {
    restoreFocusTarget =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    showModal = true;
    submitSuccess = false;
    submitError = "";
    // Update URL to include ?request=true for shareable link
    const url = new URL(window.location.href);
    url.searchParams.set('request', 'true');
    window.history.pushState({}, '', url);
    // Track form opened
    trackRequestFormOpened();
    document.body.style.overflow = "hidden";
    await tick();
    closeButton?.focus();
  }

  function closeModal() {
    showModal = false;
    requestType = "";
    request = "";
    docsLink = "";
    email = "";
    deadline = "";
    willingToCall = false;
    submitSuccess = false;
    submitError = "";
    // Remove ?request=true from URL when closing
    const url = new URL(window.location.href);
    url.searchParams.delete('request');
    window.history.pushState({}, '', url);
    document.body.style.overflow = "";
    restoreFocusTarget?.focus();
  }

  async function handleSubmit(e: Event) {
    e.preventDefault();
    
    if (!requestType || !request.trim() || !email.trim()) {
      submitError = "Please fill in all required fields";
      return;
    }

    isSubmitting = true;
    submitError = "";

    const payload = {
      type: requestType,
      request: request,
      docsLink: docsLink,
      email: email,
      deadline: deadline,
      willingToCall: willingToCall,
      timestamp: new Date().toISOString(),
    };

    console.log("Submitting to Zapier:", payload);

    try {
      const response = await fetch(ZAPIER_WEBHOOK_URL, {
        method: "POST",
        mode: "no-cors",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      // With no-cors mode, we can't read the response, so we assume success
      console.log("Zapier webhook response:", response);
      
      // Track successful request submission
      trackRequest(
        requestType as "provider" | "endpoint" | "model", 
        request, 
        email, 
        docsLink,
        deadline,
        willingToCall
      );
      
      submitSuccess = true;
      setTimeout(() => {
        closeModal();
      }, 2500);
    } catch (error) {
      console.error("Submission error:", error);
      submitError = "Failed to submit. Error: " + (error instanceof Error ? error.message : String(error));
    } finally {
      isSubmitting = false;
    }
  }

  function handleBackdropClick(e: MouseEvent) {
    if (e.target === e.currentTarget) {
      closeModal();
    }
  }

  function trapFocus(event: KeyboardEvent) {
    if (!modalContent) return;

    const focusable = Array.from(
      modalContent.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
      ),
    );

    if (!focusable.length) return;

    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  function handleWindowKeydown(event: KeyboardEvent) {
    if (!showModal) return;

    if (event.key === "Escape") {
      event.preventDefault();
      closeModal();
    }

    if (event.key === "Tab") {
      trapFocus(event);
    }
  }

  function getPlaceholder() {
    if (requestType === "provider") {
      return "Describe the provider and endpoint you need...";
    } else if (requestType === "endpoint") {
      return "Describe the new endpoint you want added...";
    } else if (requestType === "model") {
      return "Describe the model you need...";
    }
    return "Describe what you need...";
  }

  function getDocsPlaceholder() {
    if (requestType === "provider") {
      return "https://docs.provider.com/api";
    } else if (requestType === "endpoint") {
      return "https://docs.example.com/endpoint";
    } else if (requestType === "model") {
      return "https://docs.example.com/model";
    }
    return "https://...";
  }

  onDestroy(() => {
    document.body.style.overflow = "";
  });
</script>

<svelte:window on:keydown={handleWindowKeydown} />

{#if showModal}
  <!-- svelte-ignore a11y-click-events-have-key-events -->
  <!-- svelte-ignore a11y-no-static-element-interactions -->
  <div class="modal-backdrop" on:click={handleBackdropClick}>
    <div
      bind:this={modalContent}
      class="modal-content"
      role="dialog"
      aria-modal="true"
      aria-labelledby="request-modal-title"
      aria-describedby="request-modal-description"
    >
      <div class="modal-header">
        <div>
          <h2 id="request-modal-title">Request Support</h2>
          <p id="request-modal-description" class="subtitle">Help us prioritize what to add next. We'll notify you when it's live.</p>
          <div class="modal-badges">
            <span class="modal-badge">Shareable request link</span>
            <span class="modal-badge">Enterprise prioritization signal</span>
          </div>
        </div>
        <button bind:this={closeButton} class="close-button" on:click={closeModal} type="button" aria-label="Close request form">
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
          <h3>Request Submitted!</h3>
          <p>We'll notify you at <strong>{email}</strong> when this is live.</p>
        </div>
      {:else}
        <form on:submit={handleSubmit}>
          <div class="form-group">
            <p class="field-label">What are you requesting? <span class="required">*</span></p>
            <div class="type-selector">
              <button
                type="button"
                class="type-button"
                class:selected={requestType === "provider"}
                on:click={() => requestType = "provider"}
                disabled={isSubmitting}
                aria-pressed={requestType === "provider"}
              >
                <div class="type-label">Provider</div>
                <div class="type-example">e.g., AWS Polly, Azure OpenAI</div>
              </button>
              <button
                type="button"
                class="type-button"
                class:selected={requestType === "endpoint"}
                on:click={() => requestType = "endpoint"}
                disabled={isSubmitting}
                aria-pressed={requestType === "endpoint"}
              >
                <div class="type-label">Endpoint</div>
                <div class="type-example">e.g., /v1/interactions, /v1/realtime</div>
              </button>
              <button
                type="button"
                class="type-button"
                class:selected={requestType === "model"}
                on:click={() => requestType = "model"}
                disabled={isSubmitting}
                aria-pressed={requestType === "model"}
              >
                <div class="type-label">Model</div>
                <div class="type-example">e.g., GPT-4 Turbo, Claude 3.5</div>
              </button>
            </div>
          </div>

          <div class="form-group">
            <label for="request">
              What do you need? <span class="required">*</span>
            </label>
            
            {#if requestType === "provider"}
              <div class="examples-box">
                <div class="example-title">Examples:</div>
                <ul>
                  <li>Add AWS Polly on /audio/transcriptions endpoint (OpenAI Compatible)</li>
                  <li>Support /v1/batch endpoint for Anthropic Claude models</li>
                </ul>
              </div>
            {:else if requestType === "endpoint"}
              <div class="examples-box">
                <div class="example-title">Examples:</div>
                <ul>
                  <li>Add support for /v1/interactions endpoint (new endpoint type)</li>
                  <li>Add Google generateContent and streamGenerateContent endpoints</li>
                  <li>Add /rag/ingest, managed RAG API to allow combining chunking, OCR, embeddings and creating vector stores</li>
                </ul>
              </div>
            {:else if requestType === "model"}
              <div class="examples-box">
                <div class="example-title">Examples:</div>
                <ul>
                  <li>Add GPT-4 Turbo with 128K context window</li>
                  <li>Support for Claude 3.5 Sonnet latest version</li>
                </ul>
              </div>
            {/if}

            <textarea
              id="request"
              bind:value={request}
              placeholder={getPlaceholder()}
              rows="3"
              required
              disabled={isSubmitting}
            ></textarea>
            <span class="hint">Be specific! The more details, the faster we can add it.</span>
          </div>

          <div class="form-group">
            <label for="docsLink">
              Documentation link <span class="optional">(optional but helpful!)</span>
            </label>
            <input
              id="docsLink"
              type="url"
              bind:value={docsLink}
              placeholder={getDocsPlaceholder()}
              disabled={isSubmitting}
            />
          </div>

          <div class="form-group">
            <label for="email">
              Your email <span class="required">*</span>
            </label>
            <input
              id="email"
              type="email"
              bind:value={email}
              placeholder="your.email@example.com"
              required
              disabled={isSubmitting}
            />
            <span class="hint">We'll let you know when it's ready!</span>
          </div>

          <div class="form-group">
            <label for="deadline">
              When do you need this by? <span class="optional">(optional)</span>
            </label>
            <input
              id="deadline"
              type="date"
              bind:value={deadline}
              disabled={isSubmitting}
            />
          </div>

          <div class="form-group">
            <label class="checkbox-label">
              <input
                type="checkbox"
                bind:checked={willingToCall}
                disabled={isSubmitting}
              />
              <span>Would you be willing to get on a call and provide feedback on this implementation? <span class="optional">(optional)</span></span>
            </label>
          </div>

          {#if submitError}
            <div class="error-message">
              {submitError}
            </div>
          {/if}

          <div class="form-actions">
            <button type="button" class="btn btn-secondary" on:click={closeModal} disabled={isSubmitting}>
              Cancel
            </button>
            <button type="submit" class="btn btn-primary" disabled={isSubmitting}>
              {#if isSubmitting}
                <span class="spinner"></span>
                Submitting...
              {:else}
                Submit Request
              {/if}
            </button>
          </div>
        </form>
      {/if}
    </div>
  </div>
{/if}

<style>
  /* Light mode input text */
  .modal-content {
    --input-text: #1a1a1a;
  }

  /* Ensure dark mode variables are available */
  @media (prefers-color-scheme: dark) {
    .modal-content {
      --bg-color: #1a1a2e;
      --bg-secondary: #252542;
      --bg-tertiary: #2d2d44;
      --text-color: #e5e5e5;
      --text-secondary: #a1a1aa;
      --muted-color: #9ca3af;
      --border-color: #2d2d44;
      --border-color-strong: #3d3d5c;
      --card-bg: #252542;
      --input-text: #ffffff;
    }
  }

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
    background: var(--bg-color, #ffffff);
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
    border-bottom: 1px solid var(--border-color, #f3f4f6);
  }

  .modal-header h2 {
    margin: 0 0 0.5rem 0;
    font-size: 1.75rem;
    font-weight: 700;
    color: var(--text-color, #1a1a1a);
    line-height: 1.2;
  }

  .subtitle {
    margin: 0;
    font-size: 0.9375rem;
    color: var(--muted-color, #6b7280);
    line-height: 1.5;
  }

  .modal-badges {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    margin-top: 0.875rem;
  }

  .modal-badge {
    display: inline-flex;
    align-items: center;
    padding: 0.375rem 0.625rem;
    border-radius: 999px;
    background: var(--bg-secondary, #f9fafb);
    border: 1px solid var(--border-color, #e5e7eb);
    color: var(--text-secondary, #4b5563);
    font-size: 0.75rem;
    font-weight: 600;
  }

  .close-button {
    background: none;
    border: none;
    cursor: pointer;
    padding: 0.5rem;
    color: var(--muted-color, #9ca3af);
    transition: color 0.2s ease;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 6px;
  }

  .close-button:hover {
    color: var(--text-color, #1a1a1a);
    background-color: var(--bg-tertiary, #f3f4f6);
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
    color: var(--text-color, #1a1a1a);
  }

  .field-label {
    display: block;
    margin: 0 0 0.625rem 0;
    font-weight: 600;
    font-size: 0.9375rem;
    color: var(--text-color, #1a1a1a);
  }

  .required {
    color: #ef4444;
    font-weight: 600;
  }

  .optional {
    font-weight: 400;
    color: var(--muted-color, #9ca3af);
    font-size: 0.875rem;
  }

  .hint {
    display: block;
    margin-top: 0.5rem;
    font-size: 0.8125rem;
    color: var(--muted-color, #6b7280);
  }

  .examples-box {
    background: var(--bg-secondary, #f9fafb);
    border: 1px solid var(--border-color, #e5e7eb);
    border-radius: 8px;
    padding: 1rem 1.25rem;
    margin-bottom: 0.75rem;
  }

  .example-title {
    font-size: 0.8125rem;
    font-weight: 600;
    color: var(--muted-color, #6b7280);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin-bottom: 0.5rem;
  }

  .examples-box ul {
    margin: 0;
    padding-left: 1.25rem;
    list-style-type: disc;
  }

  .examples-box li {
    font-size: 0.875rem;
    color: var(--text-secondary, #4b5563);
    line-height: 1.6;
    margin-bottom: 0.375rem;
  }

  .examples-box li:last-child {
    margin-bottom: 0;
  }

  .type-selector {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 0.75rem;
  }

  .type-button {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 1rem 0.75rem;
    background: var(--card-bg, #ffffff);
    border: 2px solid var(--border-color-strong, #d1d5db);
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.2s ease;
    font-family: inherit;
    text-align: center;
  }

  .type-button:hover:not(:disabled):not(.selected) {
    border-color: var(--muted-color, #9ca3af);
    background: var(--bg-secondary, #fafafa);
  }

  .type-button:focus {
    outline: none;
  }

  .type-button.selected {
    background: var(--litellm-primary, #6366f1) !important;
    border-color: var(--litellm-primary, #6366f1) !important;
    color: white;
  }

  .type-button:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .type-label {
    font-size: 0.9375rem;
    font-weight: 600;
    color: var(--text-color, #1a1a1a);
    margin-bottom: 0.375rem;
  }

  .type-button.selected .type-label {
    color: white !important;
  }

  .type-example {
    font-size: 0.75rem;
    color: var(--muted-color, #6b7280);
    line-height: 1.4;
  }

  .type-button.selected .type-example {
    color: rgba(255, 255, 255, 0.75) !important;
  }

  .form-group input:not([type="checkbox"]),
  .form-group textarea {
    width: 100%;
    padding: 0.875rem 1rem;
    border: 1px solid var(--border-color-strong, #d1d5db);
    border-radius: 8px;
    font-size: 1rem;
    font-family: inherit;
    transition: all 0.2s ease;
    box-sizing: border-box;
    background: var(--card-bg, #ffffff);
    color: var(--input-text, #1a1a1a) !important;
  }

  .form-group textarea {
    resize: vertical;
    min-height: 90px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Inter', 'Roboto', 'Helvetica Neue', Arial, sans-serif;
    line-height: 1.5;
  }

  .form-group input:not([type="checkbox"]):hover:not(:disabled),
  .form-group textarea:hover:not(:disabled) {
    border-color: var(--muted-color, #9ca3af);
  }

  .form-group input:not([type="checkbox"]):focus,
  .form-group textarea:focus {
    outline: none;
    border-color: var(--litellm-primary, #6366f1);
    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.12);
  }

  .form-group input:not([type="checkbox"])::placeholder,
  .form-group textarea::placeholder {
    color: var(--muted-color, #9ca3af) !important;
    opacity: 0.7;
  }

  .form-group input:not([type="checkbox"]):disabled,
  .form-group textarea:disabled {
    background-color: var(--bg-secondary, #f9fafb);
    cursor: not-allowed;
    opacity: 0.6;
  }

  .checkbox-label {
    display: flex;
    align-items: flex-start;
    gap: 0.75rem;
    cursor: pointer;
    font-weight: 400 !important;
    padding: 0;
    margin-bottom: 0;
  }

  .checkbox-label input[type="checkbox"] {
    width: 18px;
    height: 18px;
    min-width: 18px;
    min-height: 18px;
    margin-top: 0.25rem;
    cursor: pointer;
    flex-shrink: 0;
    padding: 0;
    accent-color: var(--litellm-primary, #6366f1);
  }

  .checkbox-label input[type="checkbox"]:disabled {
    cursor: not-allowed;
  }

  .checkbox-label span {
    flex: 1;
    line-height: 1.5;
    color: var(--text-color, #1a1a1a);
  }

  .form-actions {
    display: flex;
    gap: 0.75rem;
    justify-content: flex-end;
    margin-top: 2rem;
    padding-top: 1.5rem;
    border-top: 1px solid var(--border-color, #f3f4f6);
  }

  .btn {
    padding: 0.875rem 1.75rem;
    font-size: 1rem;
    font-weight: 600;
    border-radius: 12px;
    border: 1px solid transparent;
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
    background-color: var(--litellm-primary, #6366f1);
    color: white;
  }

  .btn-primary:hover:not(:disabled) {
    background-color: var(--litellm-primary-hover, #4f46e5);
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(99, 102, 241, 0.25);
  }

  .btn-secondary {
    background-color: transparent;
    color: var(--muted-color, #6b7280);
    border-color: var(--border-color, #e5e7eb);
  }

  .btn-secondary:hover:not(:disabled) {
    background-color: var(--bg-secondary, #f9fafb);
    border-color: var(--border-color-strong, #d1d5db);
    color: var(--text-color, #1a1a1a);
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
    color: var(--muted-color, #6b7280);
    font-size: 1.0625rem;
    line-height: 1.6;
  }

  .success-message strong {
    color: var(--text-color, #1a1a1a);
    font-weight: 600;
  }

  @media (max-width: 640px) {
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

    .type-selector {
      grid-template-columns: 1fr;
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
